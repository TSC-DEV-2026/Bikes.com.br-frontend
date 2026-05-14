/// <reference types="vite/client" />

import "axios";

declare module "axios" {
  interface InternalAxiosRequestConfig {
    /** Evita loop: no máximo um refresh + uma repetição da requisição original. */
    _authRefreshRetried?: boolean;
  }
}

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
