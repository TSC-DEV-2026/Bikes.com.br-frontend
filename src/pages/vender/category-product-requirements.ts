import type { CategoriaPai } from "@/types/categoria";

/** Slugs canônicos das categorias principais exibidas na tela de escolha. */
export const MAIN_CATEGORY_SLUGS = [
  "bicicletas",
  "acessorios",
  "vestuario",
  "pecas",
] as const;

export type MainCategorySlug = (typeof MAIN_CATEGORY_SLUGS)[number];

/** Slugs/nomes alternativos retornados pelo GET /categorias. */
const MAIN_CATEGORY_SLUG_ALIASES: Record<MainCategorySlug, readonly string[]> = {
  bicicletas: ["bicicletas", "bicicleta"],
  acessorios: ["acessorios", "acessorio"],
  vestuario: ["vestuario", "vestuarios", "vestuário", "vestuários"],
  pecas: ["pecas", "peca", "peças", "peça"],
};

export const CATEGORY_CARD_COPY: Record<
  MainCategorySlug,
  { title: string; description: string }
> = {
  bicicletas: {
    title: "Bicicletas",
    description: "MTB, speed, urbana, infantil ou elétrica.",
  },
  acessorios: {
    title: "Acessórios",
    description: "Capacetes, bolsas, luzes, suportes e itens extras.",
  },
  vestuario: {
    title: "Vestuário",
    description: "Camisas, bermudas, luvas e roupas para pedalar.",
  },
  pecas: {
    title: "Peças",
    description: "Componentes, freios, transmissões, pneus e reposição.",
  },
};

/** Campos obrigatórios por slug — enviados como indexadores no meta. */
export const CATEGORY_PRODUCT_REQUIREMENTS: Record<MainCategorySlug, readonly string[]> = {
  bicicletas: [
    "Aro",
    "Tipo de bicicleta",
    "Material do quadro",
    "Freio",
    "Marchas",
    "Cor",
  ],
  acessorios: ["Tipo de acessório", "Compatibilidade", "Material", "Cor"],
  vestuario: ["Tipo de vestuário", "Tamanho", "Cor", "Material", "Indicação de uso"],
  pecas: ["Tipo de peça", "Compatibilidade", "Modelo", "Material", "Cor"],
};

function normalizeCategoryKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function singularizeCategoryKey(key: string): string {
  if (key.length > 3 && key.endsWith("s")) return key.slice(0, -1);
  return key;
}

/** Mapeia slug ou nome da API para o slug canônico do fluxo de anúncio. */
export function toMainCategorySlug(value: string | null | undefined): MainCategorySlug | null {
  if (!value?.trim()) return null;
  const key = normalizeCategoryKey(value);
  const singular = singularizeCategoryKey(key);

  for (const main of MAIN_CATEGORY_SLUGS) {
    const aliases = MAIN_CATEGORY_SLUG_ALIASES[main].map(normalizeCategoryKey);
    if (aliases.includes(key) || aliases.includes(singular)) return main;

    const titleKey = normalizeCategoryKey(CATEGORY_CARD_COPY[main].title);
    const titleSingular = singularizeCategoryKey(titleKey);
    if (key === titleKey || key === titleSingular || singular === titleSingular) {
      return main;
    }
  }

  return null;
}

export function isMainCategorySlug(slug: string): slug is MainCategorySlug {
  return (MAIN_CATEGORY_SLUGS as readonly string[]).includes(slug);
}

/** Localiza a categoria pai da API para um slug canônico (ex.: vestuarios → vestuario). */
export function findCategoriaPaiByMainSlug(
  categorias: readonly CategoriaPai[],
  mainSlug: MainCategorySlug,
): CategoriaPai | undefined {
  const keys = new Set(
    MAIN_CATEGORY_SLUG_ALIASES[mainSlug].map((alias) => normalizeCategoryKey(alias)),
  );
  keys.add(normalizeCategoryKey(mainSlug));
  keys.add(normalizeCategoryKey(CATEGORY_CARD_COPY[mainSlug].title));
  keys.add(singularizeCategoryKey(normalizeCategoryKey(CATEGORY_CARD_COPY[mainSlug].title)));

  return categorias.find((c) => {
    const slugKey = normalizeCategoryKey(c.slug);
    const nomeKey = normalizeCategoryKey(c.nome);
    if (keys.has(slugKey) || keys.has(nomeKey)) return true;
    if (keys.has(singularizeCategoryKey(slugKey)) || keys.has(singularizeCategoryKey(nomeKey))) {
      return true;
    }
    return false;
  });
}

export function getCategoryRequirements(
  slug: string | null | undefined,
): readonly string[] {
  const main = toMainCategorySlug(slug);
  if (!main) return [];
  return CATEGORY_PRODUCT_REQUIREMENTS[main];
}

export function emptyRequiredFieldValues(slug: MainCategorySlug): Record<string, string> {
  const out: Record<string, string> = {};
  for (const campo of CATEGORY_PRODUCT_REQUIREMENTS[slug]) {
    out[campo] = "";
  }
  return out;
}

export function validateCategoryRequiredFields(
  slug: string | null | undefined,
  values: Record<string, string>,
): string | null {
  const required = getCategoryRequirements(slug);
  if (!required.length) return null;
  const missing = required.filter((campo) => !(values[campo] ?? "").trim());
  if (missing.length) {
    return "Preencha os detalhes obrigatórios para continuar.";
  }
  return null;
}
