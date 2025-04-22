import type { Json } from "./supabase";
import { Tables } from "./supabase";

export type Message = Tables<"message">;
export type Chat = Tables<"chat">;

export type ChatHistoryResponse = {
	data: Chat[];
	error: string | null;
	status: number;
	statusText: string;
};

export type DBMessage = {
	id: string;
	role: string;
	content: Json;
	created_at: string;
	chatId: string;
};
