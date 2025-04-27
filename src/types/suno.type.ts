export type ModelType = "chirp-v3-5" | "chirp-v3-0";

export type SunoGenerateAudioPayload = {
	prompt: string;
	make_instrumental: boolean;
	model: ModelType;
	wait_audio: boolean;
};

export type SunoCustomGenerateAudioPayload = {
	prompt: string;
	tags: string;
	negative_tags: string;
	title: string;
	make_instrumental: boolean;
	model: ModelType;
	wait_audio: boolean;
};

export type SunoExtendAudioPayload = {
	audio_id: string;
	prompt: string;
	continue_at: string;
	title: string;
	tags: string;
	negative_tags: string;
	model: ModelType;
};

export type SunoGenerateStemPayload = {
	audio_id: string;
};

export type SunoGenerateLyricsPayload = {
	prompt: string;
};

export type SunoGenerateAudioResponse = {
	id: string;
	title: string;
	lyric: string;
	audio_url: string;
	video_url: string;
	created_at: string;
	model_name: string;
	status: string;
	gpt_description_prompt: string;
	prompt: string;
	type: string;
};
