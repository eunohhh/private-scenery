import { Chat } from "@/components/chat";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { generateUUID } from "@/lib/utils";
import { cookies } from "next/headers";

async function ChatPage() {
	const id = generateUUID();

	const cookieStore = await cookies();
	const modelIdFromCookie = cookieStore.get("chat-model");

	if (!modelIdFromCookie) {
		return (
			<>
				<Chat
					key={id}
					id={id}
					initialMessages={[]}
					selectedChatModel={DEFAULT_CHAT_MODEL}
					selectedVisibilityType="private"
					isReadonly={false}
				/>
				{/* <DataStreamHandler id={id} /> */}
			</>
		);
	}

	return (
		<>
			<Chat
				key={id}
				id={id}
				initialMessages={[]}
				selectedChatModel={modelIdFromCookie.value}
				selectedVisibilityType="private"
				isReadonly={false}
			/>
			{/* <DataStreamHandler id={id} /> */}
		</>
	);
}

export default ChatPage;
