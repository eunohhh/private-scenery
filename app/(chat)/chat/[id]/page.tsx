import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { Chat } from "@/components/chat";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { getChatById, getMessagesByChatId } from "@/lib/db/queries";
import { createClient } from "@/lib/supabase/server";
import { convertToUIMessages } from "@/lib/utils";

export default async function Page(props: { params: Promise<{ id: string }> }) {
	const params = await props.params;
	const { id } = params;
	const chat = await getChatById({ id });

	if (!chat) {
		notFound();
	}

	const supabase = await createClient();

	const {
		data: { user },
		error,
	} = await supabase.auth.getUser();

	if (chat.visibility === "private") {
		if (!user || !user.id) {
			return notFound();
		}

		if (user.id !== chat.userId) {
			return notFound();
		}
	}

	const messagesFromDb = await getMessagesByChatId({
		id,
	});

	const cookieStore = await cookies();
	const chatModelFromCookie = cookieStore.get("chat-model");

	if (!chatModelFromCookie) {
		return (
			<>
				<Chat
					id={chat.id}
					initialMessages={convertToUIMessages(messagesFromDb.data || [])}
					selectedChatModel={DEFAULT_CHAT_MODEL}
					selectedVisibilityType={chat.visibility}
					isReadonly={user?.id !== chat.userId}
				/>
				{/* <DataStreamHandler id={id} /> */}
			</>
		);
	}

	return (
		<>
			<Chat
				id={chat.id}
				initialMessages={convertToUIMessages(messagesFromDb.data || [])}
				selectedChatModel={chatModelFromCookie.value}
				selectedVisibilityType={chat.visibility}
				isReadonly={user?.id !== chat.userId}
			/>
			{/* <DataStreamHandler id={id} /> */}
		</>
	);
}
