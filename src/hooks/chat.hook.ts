import { getChatHistory } from "@/apis/chat.api";
import { QUERY_KEY_CHAT_HISTORY } from "@/constants/chat.constants";
import { useQuery } from "@tanstack/react-query";

export const useChatHistoryQuery = () => {
  return useQuery({
    queryKey: [QUERY_KEY_CHAT_HISTORY],
    queryFn: () => getChatHistory(),
  });
};
