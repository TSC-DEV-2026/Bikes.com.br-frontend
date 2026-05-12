# Rotas da SPA

Fonte única: **`src/routes/app-routes.tsx`** (componente `AppRoutes`).

## Tabela de rotas

| Path | Componente importado | Arquivo da página |
|------|----------------------|-------------------|
| `/` | `LandingPage` | `src/pages/landing/landing-page.tsx` |
| `/home` | `HomePage` | `src/pages/home/home-page.tsx` |
| `/about` | `AboutPage` | `src/pages/about/about-page.tsx` |
| `/enterprise` | `EnterprisePage` | `src/pages/enterprise/enterprise-page.tsx` |
| `/user` | `UserPage` | `src/pages/user/user-page.tsx` |
| `/login` | `LoginPage` | `src/pages/login/login-page.tsx` |
| `/register` | `RegisterPage` | `src/pages/register/register-page.tsx` |
| `/password` | `PasswordPage` | `src/pages/password/password-page.tsx` |
| `/resetPassword` | `ResetPasswordPage` | `src/pages/reset-password/reset-password-page.tsx` |
| `/editAddress/:id` | `EditAddressPage` | `src/pages/edit-address/edit-address-page.tsx` |

Não há rota `*` / NotFound neste arquivo.

## Público vs exige autenticação (NavigationEffects)

Implementação: **`src/components/navigation-effects.tsx`** (renderiza `null`; só efeitos).

- **`PUBLIC_PATHS`** explícitos: `/`, `/home`, `/about`, `/login`, `/register`, `/password`.
- URLs que **começam com** `/resetPassword` são tratadas como públicas (inclui query `token`).
- **Demais paths** (ex.: `/enterprise`, `/user`, `/editAddress/...`): se **não autenticado**, redirect para `/login?next=...`.
- Se **autenticado** e rota for “só auth” (`/login`, `/register`, `/password` ou prefixo `/resetPassword`), redirect para **`/home`**.

**Observação:** `/enterprise` **não** está em `PUBLIC_PATHS`; para utilizador não logado o efeito redireciona ao login. Se isso for intenção de negócio ou lapso, **não identificado** aqui — validar com produto.

## Outros

- **Helpers de URL da SPA** (strings de navegação) estão em **`src/api/endpoints/paths.ts`** exportados como `paths` — não confundir com definição de `<Route>`.
