# Design system (estado real do repo)

## Ferramentas

- **Tailwind CSS 3.4** + **tailwindcss-animate**.
- **Variáveis CSS** em `src/styles/globals.css` (`:root` e `.dark`) — cores semânticas consumidas pelo `tailwind.config.cjs` via `hsl(var(--primary))`, etc.
- **shadcn** schema em `components.json` (estilo **new-york**, CSS variables).
- **Radix UI** (@radix-ui/react-*) nas primitivas em `src/components/ui/`.

## Modo escuro

- Tailwind: `darkMode: ["class"]` — tema escuro depende da classe `dark` no ancestral (tipicamente `<html>`).
- **`ThemeProvider` do `next-themes` não aparece em `src/`**; persistência/toggle global de tema **não identificado** na árvore principal. O pacote `next-themes` existe e **Sonner** usa `useTheme` — wiring completo **não identificado** sem auditar montagem de toasts.

## Cores e marca

- Tokens neutros: variáveis `--background`, `--foreground`, `--primary`, etc.
- Marca em telas (classes arbitrárias): verde **`#09bc8a`**, **`#0c1b33`**, gradientes `from-[#09bc8a] to-[#0c1b33]` em botões e hero.

## Tipografia

- **Base (texto/UI)**: `Inter` (`font-sans`)
- **Títulos / display**: `Space Grotesk` (`font-display`)
- **Mono (opcional)**: `Geist Mono` (`font-mono`)

### Onde fica configurado

- `index.html`: carrega as fontes via Google Fonts (com `display=swap`).
- `src/styles/globals.css`: define `--font-sans`, `--font-display`, `--font-mono` e aplica `--font-sans` no `body`.
- `tailwind.config.cjs`: mapeia `font-sans`, `font-display`, `font-mono` para as variáveis CSS.

### Como usar

- Texto padrão: `font-sans` (default)
- Títulos: `font-display`
- Números/preços (se necessário): `font-mono` (uso pontual; evitar aplicar globalmente)

## Componentes base

- Botões, inputs, cards, tabs, sheet, select, dropdown: **`src/components/ui/`**.
- Feedback: **Sonner** (`ui/sonner.tsx`).

## Responsividade

- Breakpoints Tailwind padrão (`sm`, `md`, `lg`, …) em uso nas páginas.
- Layout split (ex. login com coluna imagem) usa `lg:grid-cols-2` e padrões semelhantes.

## Acessibilidade

- Componentes Radix/shadcn preservam foco e semântica; manter padrões ao estender.
