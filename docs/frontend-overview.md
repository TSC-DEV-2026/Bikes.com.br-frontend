# Visão geral do frontend

SPA **React 19** + **Vite 6** + **TypeScript** (strict) + **React Router 7**.

## Stack confirmada

| Peça | Uso |
|------|-----|
| Vite | Dev server (porta 3000), build, alias `@` → `src`. |
| React Router | `BrowserRouter` no `main.tsx`; rotas em `src/routes/app-routes.tsx`. |
| Axios | Instância única em `src/api/axiosInstance.ts`. |
| Tailwind + PostCSS | `tailwind.config.cjs`, `src/styles/globals.css`. |
| Radix + shadcn-style | `components/ui/*`, `components.json`. |
| Framer Motion | Transições em algumas telas (login, cadastro, etc.). |
| Sonner | Toasts (`components/ui/sonner.tsx`). |

## Decisões pós-migração Next → Vite

- **`src/app` removida** — não usar padrão App Router; páginas em **`src/pages`**.
- **Rotas visuais** centralizadas em **`src/routes/app-routes.tsx`** (não há file-based routing).
- **API** fora de “routes” de Router: **`src/api`** + **`src/api/endpoints`** (nomes `*.routes.ts` = legado semântico; são **clientes HTTP**).
- **CSS global** em **`src/styles/globals.css`** (import no `main.tsx`).
- **Providers** na raiz: `src/providers.tsx` → `AuthProvider` (`src/contexts/auth-context.tsx`).

## Auth (resumo)

- `AuthProvider` chama `authFetch("/users/me")` no mount e expõe `user`, `isAuthenticated`, `bootstrapped`, `refreshMe`, `logout`.
- Cache em **sessionStorage** (`auth.user.cache.v1`).
- **Guards de navegação** não estão no `<Route>`; estão em **`NavigationEffects`** (`src/components/navigation-effects.tsx`) — ver `docs/routes.md`.

## Validação

```bash
npm run build   # tsc --noEmit && vite build
npm run lint
```

## Lint — warnings conhecidos (não bloqueiam)

- `src/pages/register/register-page.tsx` — `react-hooks/exhaustive-deps`.
- `src/components/ui/button.tsx` — `react-refresh/only-export-components`.
- `src/contexts/auth-context.tsx` — idem react-refresh.

## Documentação relacionada

- Rotas detalhadas: `docs/routes.md`
- Mapa de pastas: `docs/file-map.md`
- Contratos API: `docs/api-contracts.md`
