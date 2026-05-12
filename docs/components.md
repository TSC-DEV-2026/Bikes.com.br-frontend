# Componentes (`src/components`)

## Organização

| Área | Conteúdo típico |
|------|------------------|
| Raiz de `components/` | `header.tsx`, `footer.tsx`, `navigation-effects.tsx`, formulários de domínio (`forgotPasswordForm.tsx`, `pessoaFisicaForm.tsx`, `pessoaJuridicaForm.tsx`). |
| `components/ui/` | Primitivas estilo shadcn: `button`, `input`, `label`, `card`, `select`, `tabs`, `checkbox`, `dropdown-menu`, `sheet`, `sonner`, `login-form`, `transition-wrapper`, … |

## Padrões

- **Composição**: páginas importam `Header`/`Footer` e blocos de `ui/` conforme necessário.
- **Formulários**: telas grandes (ex. cadastro) podem ficar longas — evitar crescer sem critério; extrair subcomponentes só quando o escopo pedir refactor.
- **NavigationEffects**: único lugar centralizado para redirects baseados em auth + path (ver `docs/routes.md`).
- **Ícones**: `react-icons`, `lucide-react` (alinhado ao `components.json` para novos ícones shadcn).

## Cuidados

- Não duplicar lógica de API que já está em `src/api/endpoints`.
- Componentes `ui/` seguem variantes CVA/shadcn — manter consistência de classes e props.
