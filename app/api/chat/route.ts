// import { createDocument } from "@/lib/ai/tools/create-document";
import { generateAudioByPrompt, getAudioInformation } from "@/apis/suno.api";
import { isProductionEnvironment } from "@/constants/common.constants";
import { systemPrompt } from "@/lib/ai/prompts";
import { myProvider } from "@/lib/ai/providers";
import { getWeather } from "@/lib/ai/tools/get-weather";
import {
  deleteChatById,
  getChatById,
  saveChat,
  saveMessages,
} from "@/lib/db/queries";
import { createClient } from "@/lib/supabase/server";
import {
  generateUUID,
  getMostRecentUserMessage,
  sanitizeResponseMessages,
} from "@/lib/utils";
import { SunoGenerateAudioPayload } from "@/types/suno.type";
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
        const imagePrompt = `Create a visually evocative image representing the following mood or feeling. Focus on visual elements, atmosphere, and style. Mood: "${userMood}"`;
        console.log(`[private-scenery] Image Prompt: ${imagePrompt}`);

        // 1. 이미지 생성 Promise
        const imagePromise = generateImage({
          model: imageModel,
          prompt: imagePrompt,
          size: "1024x1024", // 이미지 크기 설정 (필요시 조절)
        });

        // 2. Suno 키워드 생성 Promise (기존과 동일)
        const sunoPromise = generateText({
          model: textModel, // 텍스트 모델 사용
          prompt: `Generate 5-7 comma-separated keywords suitable for Suno music generation based on the following mood or feeling description. Focus on genre, tempo, instruments, and overall vibe. Mood: "${userMood}"`,
        });

        // 3. 감성 이디엄/인용구 생성 Promise (기존과 동일)
        const idiomsPromise = generateText({
          model: textModel, // 텍스트 모델 사용
          prompt: `Generate exactly 3 short, emotional idioms or famous quotes (like "still waters run deep") that resonate with the following mood or feeling. Each idiom/quote should be on a new line. Mood: "${userMood}"`,
        });

        // 병렬 처리 (Midjourney 대신 Image 생성)
        const [imageResult, sunoResult, idiomsResult] = await Promise.all([
          imagePromise,
          sunoPromise,
          idiomsPromise,
        ]);

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

        const sunoKeywords = sunoResult.text.trim();
        const idioms = idiomsResult.text
          .trim()
          .split("\n")
          .filter((line) => line.trim() !== ""); // 빈 줄 제거

        const sunoPayload: SunoGenerateAudioPayload = {
          make_instrumental: true,
          model: "chirp-v3-5",
          wait_audio: false,
          prompt: sunoKeywords,
        };

        let audioUrl = "";
        try {
          const sunoGenResponse = await generateAudioByPrompt(sunoPayload);
          console.log(
            "[private-scenery] Suno Generation Initiated:",
            sunoGenResponse
          );

          if (!sunoGenResponse || sunoGenResponse.length === 0) {
            throw new Error("Failed to initiate audio generation.");
          }

          const audioId = sunoGenResponse[0].id;
          if (!audioId) {
            throw new Error("Failed to get audio generation ID.");
          }

          // --- 폴링 시작 ---
          let attempts = 0;
          const maxAttempts = 12; // 최대 12번 시도 (약 1분)
          const pollInterval = 5000; // 5초 간격

          while (attempts < maxAttempts) {
            console.log(
              `[private-scenery] Polling Suno status for ID: ${audioId} (Attempt ${
                attempts + 1
              })`
            );
            const statusResponse = await getAudioInformation([audioId]);

            if (
              statusResponse &&
              statusResponse.length > 0 &&
              statusResponse[0]
            ) {
              const currentStatus = statusResponse[0].status;
              console.log(`[private-scenery] Current Status: ${currentStatus}`);

              if (currentStatus === "streaming") {
                audioUrl = statusResponse[0].audio_url;
                console.log(
                  `[private-scenery] Audio generation complete. URL: ${audioUrl}`
                );
                break; // 루프 종료
              } else if (
                currentStatus === "error" ||
                currentStatus === "failed"
              ) {
                throw new Error(
                  `Audio generation failed with status: ${currentStatus}`
                );
              }
              // 아직 완료되지 않았으면 잠시 대기
              await new Promise((resolve) => setTimeout(resolve, pollInterval));
            } else {
              // 정보를 가져오지 못하면 잠시 후 재시도
              console.warn(
                "[private-scenery] Failed to get audio information, retrying..."
              );
              await new Promise((resolve) => setTimeout(resolve, pollInterval));
            }
            attempts++;
          } // while 루프 끝

          if (!audioUrl) {
            throw new Error(
              `Audio generation timed out after ${maxAttempts} attempts.`
            );
          }
          // --- 폴링 끝 ---
        } catch (error) {
          console.error("[private-scenery] Suno processing error:", error);
          // 실패 시에도 다음 단계 진행을 원치 않으면 여기서 throw 유지
          // throw new Error("Failed to generate or retrieve audio", { cause: error });
          // 또는 audioUrl을 빈 값으로 두고 진행할 수 있음 (에러 로깅만 하고)
          audioUrl = ""; // 에러 발생 시 URL 비우기 (선택적)
        }

        // 최종 결과 객체 구성 (midjourney -> gptImage)
        const generatedContent = {
          gptImage: {
            imageUrl: imageUrl,
            prompt: imagePrompt,
          },
          suno: {
            audioUrl: audioUrl,
            prompt: sunoKeywords,
          },
          idioms: idioms,
        };

        console.log("[private-scenery] Generated Content (with Image):");
        // 이미지 데이터가 너무 길 수 있으므로 프롬프트와 다른 내용만 로그 출력
        console.log(`  gptImage Prompt: ${generatedContent.gptImage.prompt}`);
        console.log(`  Suno Keywords: ${generatedContent.suno}`);
        console.log(`  Idioms: ${generatedContent.idioms}`);

        // AI 생성 성공 응답 반환
        return NextResponse.json({ success: true, generatedContent });
      } catch (aiError) {
        console.error("[private-scenery] AI generation failed:", aiError);
        return NextResponse.json(
          { success: false, error: "Failed to generate AI content" },
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
