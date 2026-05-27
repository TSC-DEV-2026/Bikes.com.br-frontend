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

## Produtos — edição e imagens (`produtos.routes.ts`)

- **PUT** `/v1/produtos/{produto_id}` é a **única** rota de edição do produto e de gestão de imagens (multipart: campo `meta` JSON + `imagens` opcional + `file` legado opcional).
- **GET** `/v1/produtos/{id}` retorna apenas imagens **ativas** na galeria.
- **DELETE** `/v1/produtos/{produto_id}/imagens/{imagem_id}` remove uma imagem publicada.

### `meta` — imagens

| Campo | Uso |
|-------|-----|
| `substituir_imagens: false` | **Padrão para anexar.** Mantém imagens ativas e adiciona as novas (sempre `ativo=true` no backend). |
| `substituir_imagens: true` | Substitui a galeria ativa pelas imagens enviadas no request (fluxo explícito de troca total). |
| `imagem_principal_index` | Capa entre os **arquivos novos** deste PUT (0-based). Pode ser usado ao anexar (`substituir_imagens=false`). |
| `imagem_principal_id` | Capa entre imagens **já ativas** (sem reenviar arquivos). **Não** enviar junto com `substituir_imagens=true`. |

O frontend **não** envia `status`/`ativo` por imagem; o backend define novas imagens como ativas.

Limite: **10 imagens ativas** por produto (validar no cliente antes do upload).

### Rotas removidas (não consumir)

- **POST** `/v1/produtos/{produto_id}/imagens` — use PUT com `substituir_imagens=false` e `imagens`.
- **PATCH** públicas de produto (ex.: `/produtos/{id}/status`) — removidas; não usar `api.patch` para esses fluxos.

Helpers: `updateProduto`, `addProdutoImagens` (anexa com `substituir_imagens=false` por padrão), `setProdutoImagemPrincipal` em `product-gallery-upload.ts`.
