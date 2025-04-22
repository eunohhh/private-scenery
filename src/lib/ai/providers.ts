import { isTestEnvironment } from "@/constants/common.constants";
import { openai } from "@ai-sdk/openai";
import { xai } from "@ai-sdk/xai";
import { customProvider } from "ai";
import {
	artifactModel,
	chatModel,
	reasoningModel,
	titleModel,
} from "./models.test";

export const myProvider = isTestEnvironment
	? customProvider({
			languageModels: {
				"chat-model-small": chatModel,
				"chat-model-large": chatModel,
				"chat-model-reasoning": reasoningModel,
				"title-model": titleModel,
				"artifact-model": artifactModel,
			},
		})
	: customProvider({
			languageModels: {
				"chat-model-small": openai("gpt-4o-mini"),
				"chat-model-large": openai("gpt-4o"),
				"chat-model-reasoning": openai("o1-mini"),
				// "chat-model-reasoning": wrapLanguageModel({
				//   model: fireworks("accounts/fireworks/models/deepseek-r1"),
				//   middleware: extractReasoningMiddleware({ tagName: "think" }),
				// }),
				"title-model": openai("gpt-4-turbo"),
				"artifact-model": openai("gpt-4o-mini"),
				"grok-model": xai("grok-2-latest"),
			},
			imageModels: {
				"small-model": openai.image("dall-e-2"),
				"large-model": openai.image("dall-e-3"),
			},
		});
