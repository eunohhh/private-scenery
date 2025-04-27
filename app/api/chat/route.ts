// import { createDocument } from "@/lib/ai/tools/create-document";
import { isProductionEnvironment } from "@/constants/common.constants";
import { systemPrompt } from "@/lib/ai/prompts";
import { myProvider } from "@/lib/ai/providers";
import { getWeather } from "@/lib/ai/tools/get-weather";
import {
  deleteChatById,
  getChatById,
  saveChat,
  saveMessages,
  saveScenery,
} from "@/lib/db/queries";
import { createClient } from "@/lib/supabase/server";
import {
  generateUUID,
  getMostRecentUserMessage,
  sanitizeResponseMessages,
} from "@/lib/utils";
import { openai } from "@ai-sdk/openai";
import { generateTitleFromUserMessage } from "@app/(chat)/actions";
import {
  type Message,
  createDataStreamResponse,
  experimental_generateImage as generateImage,
  generateText,
  smoothStream,
  streamText,
} from "ai";
import { NextResponse } from "next/server";
import Replicate from "replicate";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const {
      id,
      messages,
      selectedChatModel,
    }: {
      id: string;
      messages: Array<Message>;
      selectedChatModel: string;
    } = await request.json();

    const supabase = await createClient();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const userMessage = getMostRecentUserMessage(messages);

    if (!userMessage) {
      return new Response("No user message found", { status: 400 });
    }

    if (selectedChatModel === "private-scenery") {
      const userMood =
        typeof userMessage.content === "string"
          ? userMessage.content
          : JSON.stringify(userMessage.content);

      console.log(`[private-scenery] Received mood: ${userMood}`);

      try {
        // gpt-4o-mini 모델 가져오기 (텍스트 생성용)
        const textModel = myProvider.languageModel("chat-model-small");
        // DALL-E 3 모델 가져오기 (이미지 생성용)
        const imageModel = openai.image("dall-e-3");

        // 1. 이미지 생성 프롬프트 정의 (기존 Midjourney 프롬프트 활용)
        const imagePrompt = `Create a visually evocative image representing the following mood or feeling. Focus on visual elements, atmosphere, and style. Response image should not be contain any text. Mood: "${userMood}"`;
        console.log(`[private-scenery] Image Prompt: ${imagePrompt}`);

        // 1. 이미지 생성 Promise
        const imagePromise = generateImage({
          model: imageModel,
          prompt: imagePrompt,
          size: "1024x1024", // 이미지 크기 설정 (필요시 조절)
        });

        // 2. Replicate meta/musicgen 키워드 생성 Promise (기존과 동일)
        const musicgenPromise = generateText({
          model: textModel, // 텍스트 모델 사용
          prompt: `Generate 5-7 comma-separated keywords suitable for Suno music generation based on the following mood or feeling description. Focus on genre, tempo, instruments, and overall vibe. Mood: "${userMood}"`,
        });

        // 3. 감성 이디엄/인용구 생성 Promise (기존과 동일)
        const idiomsPromise = generateText({
          model: textModel, // 텍스트 모델 사용
          prompt: `Generate exactly 3 short, emotional idioms or famous quotes (like "still waters run deep") that resonate with the following mood or feeling. Each idiom/quote should be on a new line. Mood: "${userMood}"`,
        });

        // 병렬 처리 (Midjourney 대신 Image 생성)
        const [imageResult, musicgenResult, idiomsResult] = await Promise.all([
          imagePromise,
          musicgenPromise,
          idiomsPromise,
        ]);

        const idioms = idiomsResult.text
          .trim()
          .split("\n")
          .filter((line) => line.trim() !== "");

        // 결과 파싱
        // 이미지 결과: base64 데이터 확인
        const imageData = imageResult.image.base64;
        if (!imageData) {
          throw new Error("Image generation failed, no base64 data returned.");
        }

        // 1. Base64 문자열을 Buffer로 디코딩
        const imageBuffer = Buffer.from(imageData, "base64");

        // 2. 고유 파일 경로 생성
        const filePath = `public/${id}-${generateUUID()}.png`; // chatId 대신 id 사용, generateUUID import 확인

        // 3. Buffer를 사용하여 업로드
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("imageFile")
          .upload(filePath, imageBuffer, {
            // imageData 대신 imageBuffer 전달
            contentType: "image/png", // 이미지 타입 지정
            upsert: true, // 같은 이름 파일 덮어쓰기 (선택 사항)
          });

        if (uploadError) {
          console.error(
            "[private-scenery] Supabase upload error:",
            uploadError
          );
          throw new Error("Failed to upload generated image to storage.");
        }

        // 4. 공개 URL 가져오기
        const { data: publicUrlData } = supabase.storage
          .from("imageFile")
          .getPublicUrl(filePath);

        if (!publicUrlData || !publicUrlData.publicUrl) {
          throw new Error("Failed to get public URL for the uploaded image.");
        }

        const imageUrl = publicUrlData.publicUrl;

        const replicate = new Replicate();

        const musicgenKeywords = musicgenResult.text.trim();

        const musicgenInput = {
          prompt: musicgenKeywords,
          model_version: "stereo-large",
          output_format: "mp3",
          normalization_strategy: "peak",
          duration: 30,
        };

        const musicgenOutput = (await replicate.run(
          "meta/musicgen:671ac645ce5e552cc63a54a2bbff63fcf798043055d2dac5fc9e36a837eedcfb",
          { input: musicgenInput }
        )) as unknown as ReadableStream;

        console.log(
          "[private-scenery] Received Musicgen Output Stream:",
          musicgenOutput
        );

        // --- 스트림 처리 및 Supabase 업로드 시작 ---
        let musicgenSupabaseUrl = "";
        try {
          // 1. ReadableStream을 Buffer로 변환
          const reader = musicgenOutput.getReader();
          const chunks = [];
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              break;
            }
            chunks.push(value instanceof Buffer ? value : Buffer.from(value));
          }
          const audioBuffer = Buffer.concat(chunks);
          console.log(
            `[private-scenery] Musicgen stream converted to Buffer, size: ${audioBuffer.length} bytes`
          );

          // 2. Supabase에 업로드할 파일 경로 생성
          const musicgenFilePath = `public/${id}-${generateUUID()}.mp3`;

          // 3. Supabase에 Buffer 업로드
          const { data: musicgenUploadData, error: musicgenUploadError } =
            await supabase.storage
              .from("musicgen") // 대상 버킷 이름: musicgen
              .upload(musicgenFilePath, audioBuffer, {
                // audioBuffer 전달
                contentType: "audio/mp3",
                upsert: true,
              });

          if (musicgenUploadError) {
            console.error(
              "[private-scenery] Supabase musicgen upload error:",
              musicgenUploadError
            );
            throw new Error("Failed to upload generated musicgen to storage.");
          }

          // 4. Supabase 공개 URL 가져오기
          const { data: musicgenPublicUrlData } = supabase.storage
            .from("musicgen")
            .getPublicUrl(musicgenFilePath);

          if (!musicgenPublicUrlData || !musicgenPublicUrlData.publicUrl) {
            throw new Error(
              "Failed to get public URL for the uploaded musicgen."
            );
          }
          musicgenSupabaseUrl = musicgenPublicUrlData.publicUrl;
          console.log(
            "[private-scenery] Musicgen uploaded to Supabase URL:",
            musicgenSupabaseUrl
          );
        } catch (streamError) {
          console.error(
            "[private-scenery] Error processing/uploading musicgen stream:",
            streamError
          );
          // 에러 처리 전략 결정 필요
        }
        // --- 스트림 처리 및 Supabase 업로드 끝 ---

        // 최종 결과 객체 구성
        const generatedContent = {
          gptImage: {
            imageUrl: imageUrl,
            prompt: imagePrompt,
          },
          musicgen: {
            audioUrl: musicgenSupabaseUrl, // Supabase에 저장된 URL 사용
            prompt: musicgenKeywords,
          },
          idioms: idioms,
        };

        console.log(
          "[private-scenery] Generated Content (with Image & Supabase Audio URL):"
        );
        console.log(`  gptImage Prompt: ${generatedContent.gptImage.prompt}`);
        console.log(`  Musicgen Keywords: ${generatedContent.musicgen.prompt}`);
        console.log(
          `  Musicgen Supabase Audio URL: ${generatedContent.musicgen.audioUrl}`
        ); // URL 로그
        console.log(`  Idioms: ${generatedContent.idioms}`);

        const scenery = {
          createdAt: new Date().toISOString(),
          id: id,
          idioms: idioms,
          imgPrompt: imagePrompt,
          imgUrl: imageUrl,
          musicPrompt: musicgenKeywords,
          musicUrl: musicgenSupabaseUrl,
          updatedAt: new Date().toISOString(),
          userEmail: user.email ?? "",
          userId: user.id,
        };

        const { data: sceneryData, error: sceneryError } = await saveScenery({
          scenery,
        });

        if (sceneryError) {
          console.error(
            "[private-scenery] Error inserting scenery:",
            sceneryError
          );
          throw new Error("Failed to insert scenery data into Supabase.");
        }

        // AI 생성 성공 응답 반환
        return NextResponse.json({ success: true, sceneryData });
      } catch (aiError) {
        console.error("[private-scenery] AI generation failed:", aiError);
        return NextResponse.json(
          {
            success: false,
            error: "Failed to generate AI content",
            aiError,
          },
          { status: 500 }
        );
      }
    }

    const chat = await getChatById({ id });

    if (!chat) {
      const title = await generateTitleFromUserMessage({
        message: userMessage,
      });

      await saveChat({ id, userId: user.id, title });
    } else {
      if (chat.userId !== user.id) {
        return new Response("Unauthorized", { status: 401 });
      }
    }

    await saveMessages({
      messages: [
        {
          id: userMessage.id,
          chatId: id,
          role: userMessage.role,
          content: JSON.stringify(userMessage.content),
          created_at: new Date().toISOString(),
        },
      ],
    });

    return createDataStreamResponse({
      execute: (dataStream) => {
        const result = streamText({
          model: myProvider.languageModel(selectedChatModel),
          system: systemPrompt({ selectedChatModel }),
          messages,
          maxSteps: 5,
          experimental_activeTools:
            selectedChatModel === "chat-model-reasoning"
              ? []
              : [
                  "getWeather",
                  // "createDocument",
                  // "updateDocument",
                  // "requestSuggestions",
                ],
          experimental_transform: smoothStream({ chunking: "word" }),
          experimental_generateMessageId: generateUUID,
          tools: {
            getWeather,
            // createDocument: createDocument({ session, dataStream }),
            // updateDocument: updateDocument({ session, dataStream }),
            // requestSuggestions: requestSuggestions({
            //   session,
            //   dataStream,
            // }),
          },
          onFinish: async ({ response, reasoning }) => {
            if (user.id) {
              try {
                const sanitizedResponseMessages = sanitizeResponseMessages({
                  messages: response.messages,
                  reasoning,
                });

                await saveMessages({
                  messages: sanitizedResponseMessages.map((message) => ({
                    id: message.id,
                    chatId: id,
                    role: message.role,
                    content: JSON.stringify(message.content),
                    created_at: new Date().toISOString(),
                  })),
                });
              } catch (error) {
                console.error("Failed to save chat");
              }
            }
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: "stream-text",
          },
        });

        result.consumeStream();

        result.mergeIntoDataStream(dataStream, {
          sendReasoning: true,
        });
      },
      onError: () => {
        return "Oops, an error occured!";
      },
    });
  } catch (error) {
    console.error("API Route Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response("Not Found", { status: 404 });
  }

  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat?.userId !== user.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    await deleteChatById({ id });

    return new Response("Chat deleted", { status: 200 });
  } catch (error) {
    return new Response("An error occurred while processing your request", {
      status: 500,
    });
  }
}
