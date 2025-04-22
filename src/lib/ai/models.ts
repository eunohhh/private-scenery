export const AVAILABLE_CHAT_MODELS = [
	"chat-model-small",
	"chat-model-large",
	"chat-model-reasoning",
	"grok-model",
] as const;

export type AvailableChatModel = (typeof AVAILABLE_CHAT_MODELS)[number];

export const DEFAULT_CHAT_MODEL: AvailableChatModel = "chat-model-small";

interface ChatModel {
	id: string;
	name: string;
	description: string;
}

export const chatModels: Array<ChatModel> = [
	{
		id: "chat-model-small",
		name: "Small model",
		description: "gpt-4o-mini",
	},
	{
		id: "chat-model-large",
		name: "Large model",
		description: "gpt-4o",
	},
	{
		id: "chat-model-reasoning",
		name: "Reasoning model",
		description: "o1-mini",
	},
	{
		id: "grok-model",
		name: "Grok model",
		description: "grok-2-latest",
	},
];
