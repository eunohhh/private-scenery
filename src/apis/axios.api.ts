import type { AxiosError, AxiosResponse } from "axios";
import axios from "axios";

const api = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_BASE_URL ?? process.env.NEXT_PUBLIC_VERCEL_URL,
});

// const isBrowser = () => typeof window !== 'undefined';

// // 토큰 가져오기 함수
// const getAccessToken = () => {
//   const cookieToken = getCookie('access_token');
//   if (cookieToken) return cookieToken;

//   // 브라우저 환경에서만 localStorage 확인
//   if (isBrowser()) {
//     const localToken = localStorage.getItem('access_token');
//     if (localToken) return localToken;
//   }
//   return null;
// };

// api.interceptors.request.use(async (config) => {
//   const token = getAccessToken();
//   if (token) {
//     config.headers.set('Authorization', `Bearer ${token}`);
//   }
//   return config;
// });

api.interceptors.response.use(
  <T>(response: AxiosResponse<T>) => response.data as T,
  (error: AxiosError) => {
    return Promise.reject(error.response?.data);
  },
);

export default api;
