// src/api/authFetch.ts
import api from "@/api/axiosInstance";
import type { AxiosError, AxiosRequestConfig, Method } from "axios";

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

function isAxiosError(error: unknown): error is AxiosError {
  return typeof error === "object" && error !== null && (error as AxiosError).isAxiosError === true;
}

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

let refreshInFlight: Promise<boolean> | null = null;

async function refreshSessionViaCookie(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const res = await api.request({
        url: "/auth/refresh-token",
        method: "POST",
      });
      return res.status >= 200 && res.status < 300;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export async function authFetch<T = unknown>(
  url: string,
  config: AuthFetchConfig = {}
): Promise<AuthFetchResponse<T>> {
  const alreadyRetried = (config as AuthFetchConfig & { __authfetch_retried?: boolean })
    .__authfetch_retried === true;

  const requestOnce = async (cfg: AuthFetchConfig) => {
    const { __authfetch_retried: _r, ...safeCfg } = (cfg as AuthFetchConfig & {
      __authfetch_retried?: boolean;
    }) || {};
    const res = await api.request<T>({ url, ...safeCfg });
    return toResponseLike<T>({ status: res.status, data: res.data, headers: res.headers });
  };

  try {
    return await requestOnce(config);
  } catch (err: unknown) {
    if (!isAxiosError(err)) throw err;

    const status = err.response?.status;

    if (status !== 401) throw err;
    if (alreadyRetried) throw err;

    const path = String(url);
    if (path.includes("/auth/refresh-token")) throw err;
    if (path.includes("/auth/login")) throw err;
    if (path.includes("/auth/register")) throw err;
    if (path.includes("/auth/me")) throw err;

    const refreshed = await refreshSessionViaCookie();
    if (!refreshed) throw err;

    const retryConfig: AuthFetchConfig & { __authfetch_retried?: boolean } = {
      ...config,
      __authfetch_retried: true,
    };
    return await requestOnce(retryConfig);
  }
}
