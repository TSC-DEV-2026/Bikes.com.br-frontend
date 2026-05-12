# Frontend — Índice

Ponto de entrada para a documentação do frontend **React + Vite + TypeScript** (SPA migrada do Next.js). Detalhes técnicos, tabelas e contratos estão nos ficheiros abaixo — evita duplicar conteúdo entre documentos.

## Documentação

| Documento | Conteúdo |
|-----------|----------|
| [frontend-overview.md](./frontend-overview.md) | Stack, migração Next → Vite, auth em resumo, validação e warnings de lint conhecidos |
| [file-map.md](./file-map.md) | Árvore resumida de `src/`, pastas críticas, configs na raiz |
| [routes.md](./routes.md) | Rotas em `app-routes.tsx`, público vs autenticação (`NavigationEffects`) |
| [components.md](./components.md) | Organização de `src/components` e `ui/` |
| [api-contracts.md](./api-contracts.md) | `axiosInstance`, `authFetch`, `src/api/endpoints` |
| [design-system.md](./design-system.md) | Tailwind, tokens, UI base, responsividade |

## Regras críticas (resumo)

- **Não recriar** `src/app`.
- **Não usar** imports `@/app`.
- **Páginas** em `src/pages` (pasta por área, ficheiros `*-page.tsx`).
- **Rotas visuais** do React Router apenas em **`src/routes/app-routes.tsx`**.
- **Chamadas HTTP** em **`src/api`** (cliente + `authFetch`) e **`src/api/endpoints`** (funções por domínio e `paths` da SPA).
- Após alterações relevantes em estrutura ou imports: **`npm run build`** e **`npm run lint`**.

Para explicações completas e contexto, siga os links da tabela acima.
