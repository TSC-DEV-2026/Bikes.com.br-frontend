import { updateProduto } from "@/api/endpoints/produtos.routes";

/** Define capa por ID da imagem já publicada (sem baixar/reenviar ficheiros). */
export function setProdutoImagemPrincipal(
  produtoId: number | string,
  imagemId: number,
) {
  return updateProduto(produtoId, {
    substituir_imagens: false,
    imagem_principal_id: imagemId,
  });
}
