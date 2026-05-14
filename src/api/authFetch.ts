// src/api/authFetch.ts
import api from "@/api/axiosInstance";
import type { AxiosRequestConfig, Method } from "axios";

type AuthFetchConfig = AxiosRequestConfig & {
  method?: Method;
};

export type AuthFetchResponse<T = unknown> = {
  text(): unknown;
  ok: boolean;
  status: number;
  data: T;
  headers: unknown;
  json: () => Promise<T>;
};

function toResponseLike<T>(res: {
  status: number;
  data: T;
  headers: unknown;
}): AuthFetchResponse<T> {
  return {
    ok: res.status >= 200 && res.status < 300,
    status: res.status,
    data: res.data,
    headers: res.headers,
    text: () => JSON.stringify(res.data),
    json: async () => res.data,
  };
}

/** 401 → refresh → retry é tratado no interceptor de `axiosInstance`. */
export async function authFetch<T = unknown>(
  url: string,
  config: AuthFetchConfig = {}
): Promise<AuthFetchResponse<T>> {
  const res = await api.request<T>({ url, ...config });
  return toResponseLike<T>({ status: res.status, data: res.data, headers: res.headers });
}
