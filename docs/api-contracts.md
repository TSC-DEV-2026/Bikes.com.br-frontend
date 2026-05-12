# Contratos de API (frontend)

## Visão

| Caminho | Responsabilidade |
|---------|------------------|
| `src/api/axiosInstance.ts` | Cliente Axios: `baseURL`, cookies (`withCredentials`), JSON. |
| `src/api/authFetch.ts` | Wrapper sobre Axios + retry após refresh em 401. |
| `src/api/endpoints/*.routes.ts` | Funções por domínio + constantes de path REST. |
| `src/api/endpoints/paths.ts` | Funções que retornam **paths da SPA** (React Router), não URLs da API. |
| `src/api/endpoints/index.ts` | Reexports: `authRoutes`, `userRoutes`, `localidadesRoutes`, `authFetchRoutes`, `paths`. |

## axiosInstance

- `baseURL`: `getApiBaseUrl()` — variável **`VITE_API_URL`** ou fallback `http://localhost:8000` (`src/lib/env.ts`).
- Alterar base URL ou credenciais afeta **toda** a API.

## authFetch

- Usa a mesma instância Axios.
- Em **401**, tenta `POST /auth/refresh-token` (exceto se já retried ou URL é refresh).
- Usado pelo **`AuthProvider`** e pelos módulos em `endpoints/`.

## Endpoints (arquivos)

- `auth.routes.ts` — login, me, logout, refresh, reset de senha, etc.
- `users.routes.ts` — perfil, endereços, cadastro (`register` usa `api.post` direto onde aplicável).
- `localidades.routes.ts` — países/estados/cidades.
- `authFetch.routes.ts` — refresh token encapsulado para outros fluxos.

## O que não alterar sem alinhamento

- Paths REST (`/users/me`, `/auth/login`, …), formatos de body e tipos exportados (`RegisterPayload`, etc.).
- Comportamento de refresh em `authFetch.ts`.
- Headers padrão em `axiosInstance`.

## Componentes

Preferir importar funções de `@/api/endpoints` nas páginas em vez de novos `axios.get` soltos — reduz regressões e duplicação.
