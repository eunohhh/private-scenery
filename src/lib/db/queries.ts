import "server-only";

import { Message } from "@/types/db.type";
import { createClient } from "../supabase/server";

export async function saveChat({
	id,
	userId,
	title,
}: {
	id: string;
	userId: string;
	title: string;
}) {
	const supabase = await createClient();
	try {
		return await supabase.from("chat").insert({
			id,
			created_at: new Date().toISOString(),
			userId,
			title,
		});
	} catch (error) {
		console.error("Failed to save chat in database");
		throw error;
	}
}

export async function deleteChatById({ id }: { id: string }) {
	const supabase = await createClient();
	try {
		// await supabase.from("vote").delete().eq("chatId", id);
		await supabase.from("message").delete().eq("chatId", id);

		return await supabase.from("chat").delete().eq("id", id);
	} catch (error) {
		console.error("Failed to delete chat by id from database");
		throw error;
	}
}

export async function getChatsByUserId({ id }: { id: string }) {
	const supabase = await createClient();
	try {
		return await supabase
			.from("chat")
			.select()
			.eq("userId", id)
			.order("created_at", { ascending: false });
	} catch (error) {
		console.error("Failed to get chats by user from database");
		throw error;
	}
}

export async function getChatById({ id }: { id: string }) {
	const supabase = await createClient();
	try {
		const { data: selectedChat } = await supabase
			.from("chat")
			.select()
			.eq("id", id)
			.single();
		return selectedChat;
	} catch (error) {
		console.error("Failed to get chat by id from database");
		throw error;
	}
}

export async function saveMessages({ messages }: { messages: Array<Message> }) {
	const supabase = await createClient();
	try {
		return await supabase.from("message").insert(messages);
	} catch (error) {
		console.error("Failed to save messages in database", error);
		throw error;
	}
}

export async function getMessagesByChatId({ id }: { id: string }) {
	const supabase = await createClient();
	try {
		return await supabase
			.from("message")
			.select()
			.eq("chatId", id)
			.order("created_at", { ascending: true });
	} catch (error) {
		console.error("Failed to get messages by chat id from database", error);
		throw error;
	}
}

// export async function voteMessage({
//   chatId,
//   messageId,
//   type,
// }: {
//   chatId: string;
//   messageId: string;
//   type: "up" | "down";
// }) {
//   const supabase = createClient();
//   try {
//     const { data: existingVote } = await supabase
//       .from("vote")
//       .select()
//       .eq("messageId", messageId);

//     if (existingVote) {
//       return await supabase
//         .from("vote")
//         .update({ isUpvoted: type === "up" })
//         .eq("messageId", messageId)
//         .eq("chatId", chatId);
//     }
//     return await supabase.from("vote").insert({
//       chatId,
//       messageId,
//       isUpvoted: type === "up",
//     });
//   } catch (error) {
//     console.error("Failed to upvote message in database", error);
//     throw error;
//   }
// }

// export async function getVotesByChatId({ id }: { id: string }) {
//   const supabase = createClient();
//   try {
//     return await supabase.from("vote").select().eq("chatId", id);
//   } catch (error) {
//     console.error("Failed to get votes by chat id from database", error);
//     throw error;
//   }
// }

// export async function saveDocument({
//   id,
//   title,
//   kind,
//   content,
//   userId,
// }: {
//   id: string;
//   title: string;
//   kind: ArtifactKind;
//   content: string;
//   userId: string;
// }) {
//   const supabase = createClient();
//   try {
//     return await supabase.from("document").insert({
//       id,
//       title,
//       kind,
//       content,
//       userId,
//       createdAt: new Date(),
//     });
//   } catch (error) {
//     console.error("Failed to save document in database");
//     throw error;
//   }
// }

// export async function getDocumentsById({ id }: { id: string }) {
//   const supabase = createClient();
//   try {
//     const { data: documents } = await supabase
//       .from("document")
//       .select()
//       .eq("id", id)
//       .order("createdAt", { ascending: true });

//     return documents;
//   } catch (error) {
//     console.error("Failed to get document by id from database");
//     throw error;
//   }
// }

// export async function getDocumentById({ id }: { id: string }) {
//   const supabase = createClient();
//   try {
//     const { data: selectedDocument } = await supabase
//       .from("document")
//       .select()
//       .eq("id", id)
//       .order("createdAt", { ascending: false });

//     return selectedDocument;
//   } catch (error) {
//     console.error("Failed to get document by id from database");
//     throw error;
//   }
// }

// export async function deleteDocumentsByIdAfterTimestamp({
//   id,
//   timestamp,
// }: {
//   id: string;
//   timestamp: Date;
// }) {
//   const supabase = createClient();
//   try {
//     await supabase
//       .from("suggestion")
//       .delete()
//       .match({ documentId: id })
//       .gt("documentCreatedAt", timestamp);

//     return await supabase
//       .from("document")
//       .delete()
//       .match({ id })
//       .gt("createdAt", timestamp);
//   } catch (error) {
//     console.error(
//       "Failed to delete documents by id after timestamp from database"
//     );
//     throw error;
//   }
// }

// export async function saveSuggestions({
//   suggestions,
// }: {
//   suggestions: Array<Suggestion>;
// }) {
//   const supabase = createClient();
//   try {
//     return await supabase.from("suggestion").insert(suggestions);
//   } catch (error) {
//     console.error("Failed to save suggestions in database");
//     throw error;
//   }
// }

// export async function getSuggestionsByDocumentId({
//   documentId,
// }: {
//   documentId: string;
// }) {
//   try {
//     return await supabase
//       .from("suggestion")
//       .select()
//       .eq("documentId", documentId);
//   } catch (error) {
//     console.error(
//       "Failed to get suggestions by document version from database"
//     );
//     throw error;
//   }
// }

export async function getMessageById({ id }: { id: string }) {
	const supabase = await createClient();
	try {
		return await supabase.from("message").select().eq("id", id);
	} catch (error) {
		console.error("Failed to get message by id from database");
		throw error;
	}
}

export async function deleteMessagesByChatIdAfterTimestamp({
	chatId,
	timestamp,
}: {
	chatId: string;
	timestamp: Date;
}) {
	const supabase = await createClient();
	try {
		const { data: messagesToDelete } = await supabase
			.from("message")
			.select("id")
			.eq("chatId", chatId)
			.gte("createdAt", timestamp);

		const messageIds = messagesToDelete?.map((message) => message.id);

		if (messageIds && messageIds.length > 0) {
			// await supabase
			//   .from("vote")
			//   .delete()
			//   .eq("chatId", chatId)
			//   .in("messageId", messageIds);

			return await supabase
				.from("message")
				.delete()
				.eq("chatId", chatId)
				.in("id", messageIds);
		}
	} catch (error) {
		console.error(
			"Failed to delete messages by id after timestamp from database",
		);
		throw error;
	}
}

export async function updateChatVisiblityById({
	chatId,
	visibility,
}: {
	chatId: string;
	visibility: "private" | "public";
}) {
	const supabase = await createClient();
	try {
		return await supabase.from("chat").update({ visibility }).eq("id", chatId);
	} catch (error) {
		console.error("Failed to update chat visibility in database");
		throw error;
	}
}
