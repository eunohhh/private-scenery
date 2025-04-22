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
} from "@/lib/db/queries";
import { createClient } from "@/lib/supabase/server";
import {
  generateUUID,
  getMostRecentUserMessage,
  sanitizeResponseMessages,
} from "@/lib/utils";
import { generateTitleFromUserMessage } from "@app/(chat)/actions";
import {
  type Message,
  createDataStreamResponse,
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
        // gpt-4o-mini 모델 가져오기
        const model = myProvider.languageModel("chat-model-small");

        // 1. Midjourney 키워드 생성
        const midjourneyPromise = generateText({
          model,
          prompt: `Generate 5-7 comma-separated, evocative keywords suitable for Midjourney image generation based on the following mood or feeling description. Focus on visual elements, atmosphere, and style. Mood: "${userMood}"`,
        });

        // 2. Suno 키워드 생성
        const sunoPromise = generateText({
          model,
          prompt: `Generate 5-7 comma-separated keywords suitable for Suno music generation based on the following mood or feeling description. Focus on genre, tempo, instruments, and overall vibe. Mood: "${userMood}"`,
        });

        // 3. 감성 이디엄/인용구 생성
        const idiomsPromise = generateText({
          model,
          prompt: `Generate exactly 3 short, emotional idioms or famous quotes (like "still waters run deep") that resonate with the following mood or feeling. Each idiom/quote should be on a new line. Mood: "${userMood}"`,
        });

        // 병렬 처리
        const [midjourneyResult, sunoResult, idiomsResult] = await Promise.all([
          midjourneyPromise,
          sunoPromise,
          idiomsPromise,
        ]);

        // 결과 파싱 (Idioms는 줄바꿈 기준으로 배열 생성)
        const midjourneyKeywords = midjourneyResult.text.trim();
        const sunoKeywords = sunoResult.text.trim();
        const idioms = idiomsResult.text
          .trim()
          .split("\n")
          .filter((line) => line.trim() !== ""); // 빈 줄 제거

        const generatedContent = {
          midjourney: midjourneyKeywords,
          suno: sunoKeywords,
          idioms: idioms,
        };

        console.log("[private-scenery] Generated Content:", generatedContent);

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
