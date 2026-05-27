export type Marca = {
  id: number;
  nome: string;
  slug: string;
  descricao: string;
  ativo: boolean;
  logo_url: string | null;
};

export type MarcaCreateMeta = {
  nome: string;
  slug: string;
  descricao: string;
  ativo: boolean;
};
