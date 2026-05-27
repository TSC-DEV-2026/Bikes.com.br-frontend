export type CategoriaPai = {
  id: number;
  nome: string;
  slug: string;
  ativo: boolean;
  categoria_pai_id: null;
};

export type Subcategoria = {
  id: number;
  nome: string;
  slug: string;
  pai_id: number;
  categoria_pai_id: number;
  vendedor_id: number;
  ativo: boolean;
  categoria_pai?: {
    id: number;
    nome: string;
    slug: string;
  };
};

export type SubcategoriaCreate = {
  categoria_pai_id: number;
  nome: string;
  slug?: string;
  ativo?: boolean;
};

export type SubcategoriaUpdate = {
  categoria_pai_id: number;
  nome: string;
  slug?: string;
  ativo?: boolean;
};
