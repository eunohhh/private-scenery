"use client";

import { ChatHeader } from "@/components/chat-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
// // import { Artifact } from "./artifact";
import { QUERY_KEY_CHAT_HISTORY } from "@/constants/chat.constants";
import { generateUUID } from "@/lib/utils";
import { useChat } from "@ai-sdk/react";
import { useQueryClient } from "@tanstack/react-query";
import type { Attachment, Message } from "ai";
import { useState } from "react";
import { toast } from "sonner";
import { Messages } from "./messages";
import { MultimodalInput } from "./multimodal-input";
import { VisibilityType } from "./visibility-selector";

export function Chat({
  id,
  initialMessages,
  selectedChatModel,
  selectedVisibilityType,
  isReadonly,
}: {
  id: string;
  initialMessages: Array<Message>;
  selectedChatModel: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
}) {
  const queryClient = useQueryClient();

  const {
    messages,
    setMessages,
    handleSubmit,
    input,
    setInput,
    append,
    isLoading,
    stop,
    reload,
  } = useChat({
    id,
    body: { id, selectedChatModel: selectedChatModel },
    initialMessages,
    experimental_throttle: 100,
    sendExtraMessageFields: true,
    generateId: generateUUID,
    onFinish: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_CHAT_HISTORY] });
    },
    onError: () => {
      toast.error("An error occured, please try again!");
    },
  });

  // const { data: votes } = useSWR<Array<Vote>>(
  //   `/api/vote?chatId=${id}`,
  //   fetcher
  // );

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  // const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  // 'private-scenery' 모델인지 확인
  const isPrivateScenery = selectedChatModel === "private-scenery";

  // 'private-scenery' 모드 전용 상태
  const [moodInput, setMoodInput] = useState("");
  const [isSceneryLoading, setIsSceneryLoading] = useState(false);

  // 'private-scenery' 모드 전용 제출 핸들러
  const handleScenerySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!moodInput.trim()) return;

    setIsSceneryLoading(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id, // 현재 채팅 ID 사용
          // useChat의 messages 대신 현재 moodInput을 단일 메시지로 전송
          messages: [{ role: "user", content: moodInput }],
          selectedChatModel: "private-scenery",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process the request");
      }

      const result = await response.json();
      console.log("[private-scenery] Client received:", result); // 성공 시 결과 로그 (추후 활용)
      toast.success("감성 분석 및 생성이 시작되었습니다!"); // 성공 토스트
      setMoodInput(""); // 입력 필드 초기화
    } catch (error) {
      console.error("[private-scenery] Submit failed:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "요청 처리 중 오류가 발생했습니다.",
      );
    } finally {
      setIsSceneryLoading(false);
    }
  };

  return (
    <>
      <div className="flex h-dvh min-w-0 flex-col bg-background">
        <ChatHeader
          chatId={id}
          selectedModelId={selectedChatModel}
          selectedVisibilityType={selectedVisibilityType}
          isReadonly={isReadonly}
        />

        {/* private-scenery 모델일 경우 다른 UI 렌더링 */}
        {isPrivateScenery ? (
          <form
            onSubmit={handleScenerySubmit}
            className="flex flex-1 flex-col items-center justify-center gap-4 p-4"
          >
            <p className="font-medium text-lg">당신의 기분을 알려주세요</p>
            <Textarea
              value={moodInput}
              onChange={(e) => setMoodInput(e.target.value)}
              placeholder="오늘 당신의 감정은 어떠셨나요?"
              className="w-full max-w-md resize-none"
              rows={5}
              required
            />
            <Button
              type="submit"
              disabled={isSceneryLoading || !moodInput.trim()}
            >
              {isSceneryLoading ? "생성 중..." : "전송"}
            </Button>
          </form>
        ) : (
          <>
            {/* 기존 채팅 UI */}
            <Messages
              chatId={id}
              isLoading={isLoading}
              // votes={votes}
              messages={messages}
              setMessages={setMessages}
              reload={reload}
              isReadonly={isReadonly}
              // isArtifactVisible={isArtifactVisible}
            />

            <form className="mx-auto flex w-full gap-2 bg-background px-4 pb-4 md:max-w-3xl md:pb-6">
              {!isReadonly && (
                <MultimodalInput
                  chatId={id}
                  input={input}
                  setInput={setInput}
                  handleSubmit={handleSubmit}
                  isLoading={isLoading}
                  stop={stop}
                  attachments={attachments}
                  setAttachments={setAttachments}
                  messages={messages}
                  setMessages={setMessages}
                  append={append}
                />
              )}
            </form>
          </>
        )}
      </div>

      {/* Artifact 컴포넌트는 private-scenery 모드에서도 일단 숨김 */}
      {/* <Artifact
        chatId={id}
        input={input}
        setInput={setInput}
        handleSubmit={handleSubmit}
        isLoading={isLoading}
        stop={stop}
        attachments={attachments}
        setAttachments={setAttachments}
        append={append}
        messages={messages}
        setMessages={setMessages}
        reload={reload}
        votes={votes}
        isReadonly={isReadonly}
      /> */}
    </>
  );
}
