"use client";

import { VisibilityType } from "@/components/visibility-selector";
import { QUERY_KEY_CHAT_HISTORY } from "@/constants/chat.constants";
import { Chat } from "@/types/db.type";
import { updateChatVisibility } from "@app/(chat)/actions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useChatHistoryQuery } from "./chat.hook";

export function useChatVisibility({
	chatId,
	initialVisibility,
}: {
	chatId: string;
	initialVisibility: VisibilityType;
}) {
	const { data: response } = useChatHistoryQuery();
	const queryClient = useQueryClient();

	const { data: localVisibility } = useQuery({
		queryKey: [`${chatId}-visibility`],
		queryFn: () => initialVisibility,
		initialData: initialVisibility,
	});

	const visibilityType = useMemo(() => {
		if (!response) return localVisibility;
		const chat = response?.data?.find((chat) => chat.id === chatId);
		if (!chat) return "private";
		return chat.visibility;
	}, [response, chatId, localVisibility]);

	const setVisibilityType = (updatedVisibilityType: VisibilityType) => {
		queryClient.setQueryData([`${chatId}-visibility`], updatedVisibilityType);

		queryClient.setQueryData<Array<Chat>>(
			[QUERY_KEY_CHAT_HISTORY],
			(oldHistory) => {
				return oldHistory
					? oldHistory.map((chat) => {
							if (chat.id === chatId) {
								return {
									...chat,
									visibility: updatedVisibilityType,
								};
							}
							return chat;
						})
					: [];
			},
		);

		updateChatVisibility({
			chatId: chatId,
			visibility: updatedVisibilityType,
		});
	};

	return { visibilityType, setVisibilityType };
}
