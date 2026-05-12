# Mapa de arquivos do frontend (`src/`)

Resumo para navegação rápida. **Não recriar `src/app`.**

## Árvore resumida

```
src/
├── main.tsx                 # Entry: StrictMode, BrowserRouter, Providers, CSS global
├── App.tsx                  # NavigationEffects + AppRoutes
├── providers.tsx          # AuthProvider (via contexts)
├── vite-env.d.ts
├── api/
│   ├── axiosInstance.ts
│   ├── authFetch.ts
│   └── endpoints/
│       ├── index.ts
│       ├── paths.ts
│       ├── auth.routes.ts
│       ├── users.routes.ts
│       ├── localidades.routes.ts
│       └── authFetch.routes.ts
├── routes/
│   └── app-routes.tsx       # Todas as <Route> da SPA
├── pages/                   # Telas (*-page.tsx por pasta)
├── components/
│   ├── ui/                  # Primitivas (shadcn/Radix)
│   ├── header.tsx, footer.tsx, navigation-effects.tsx, …
├── contexts/
│   └── auth-context.tsx
├── lib/
│   ├── utils.ts             # cn(), etc.
│   └── env.ts               # VITE_API_URL / fallback API
└── styles/
    └── globals.css
```

## Responsabilidades por pasta

| Pasta | Função |
|-------|--------|
| `pages/` | Componentes de rota por tela. |
| `routes/` | Definição React Router apenas. |
| `api/` | Transporte HTTP + authFetch. |
| `api/endpoints/` | Chamadas e `paths` da SPA. |
| `components/` | UI compartilhada e efeitos globais de navegação. |
| `contexts/` | Estado global (auth). |
| `lib/` | Utils e env. |
| `styles/` | Globais Tailwind. |

## Arquivos críticos (alto impacto se mudados sem cuidado)

- `src/main.tsx`, `src/providers.tsx`, `src/contexts/auth-context.tsx`
- `src/api/axiosInstance.ts`, `src/api/authFetch.ts`
- `src/routes/app-routes.tsx`
- `src/components/navigation-effects.tsx`
- `src/lib/env.ts`

## Arquivos de configuração relevantes (raiz)

- `vite.config.ts`, `tsconfig.json`, `tailwind.config.cjs`, `components.json`, `index.html`

## Documentação extra

- `docs/frontend.md` — **índice** da documentação do frontend (links para overview, rotas, API, componentes, design system, este mapa).
