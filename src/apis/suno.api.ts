import {
  SunoCustomGenerateAudioPayload,
  SunoExtendAudioPayload,
  SunoGenerateAudioPayload,
  SunoGenerateAudioResponse,
} from "@/types/suno.type";
import axios, { AxiosError, AxiosResponse } from "axios";

// replace your vercel domain
// const baseUrl = "https://suno-api-flame-phi.vercel.app";
const baseUrl = "http://localhost:3000";
const api = axios.create({
  baseURL: baseUrl,
});

api.interceptors.response.use(
  <T>(response: AxiosResponse<T>): T => response.data,
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

export async function customGenerateAudio(
  payload: SunoCustomGenerateAudioPayload
) {
  const url = `${baseUrl}/api/custom_generate`;
  const response = await api.post(url, payload, {
    headers: { "Content-Type": "application/json" },
  });
  return response.data;
}

export async function generateAudioByPrompt(payload: SunoGenerateAudioPayload) {
  const url = `${baseUrl}/api/generate`;
  return api.post<SunoGenerateAudioResponse[], SunoGenerateAudioResponse[]>(
    url,
    payload,
    {
      timeout: 999999,
      headers: { "Content-Type": "application/json" },
    }
  );
}

export async function extendAudio(payload: SunoExtendAudioPayload) {
  const url = `${baseUrl}/api/extend_audio`;
  const response = await api.post(url, payload, {
    headers: { "Content-Type": "application/json" },
  });
  return response.data;
}

export async function getAudioInformation(audioIds: string[]) {
  const url = `${baseUrl}/api/get?ids=${audioIds}`;
  return api.get<SunoGenerateAudioResponse[], SunoGenerateAudioResponse[]>(url);
}

export async function getQuotaInformation() {
  const url = `${baseUrl}/api/get_limit`;
  const response = await api.get(url);
  return response.data;
}

export async function getClipInformation(clipId: string) {
  const url = `${baseUrl}/api/clip?id=${clipId}`;
  const response = await api.get(url);
  return response.data;
}
