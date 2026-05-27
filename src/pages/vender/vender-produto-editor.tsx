import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import * as produtosRoutes from "@/api/endpoints/produtos.routes";
import { getAxiosErrorMessage } from "@/lib/api-error";
import { notifySuccess } from "@/lib/toast";
import type { ProdutoDetalheView } from "@/types/produto";
import { VenderProdutoEditorPanel } from "@/pages/vender/vender-produto-editor-panel";
import { VenderProdutoEditorTopbar } from "@/pages/vender/vender-produto-editor-topbar";
import {
  applyEditorDraftToDetalheView,
  buildEditorDraft,
  buildUpdatePayloadFromDraft,
  draftsEqual,
  type ProdutoSellerEditorDraft,
} from "@/pages/vender/vender-produto-editor-utils";

type Props = {
  active: boolean;
  productId: string;
  produto: ProdutoDetalheView;
  rawPayload: unknown;
  disabled: boolean;
  children: ReactNode;
  onPreviewProdutoChange: (next: ProdutoDetalheView) => void;
  onPreviewAtivoChange: (ativo: boolean) => void;
  onLabelsChange: (labels: {
    categoriaLabel: string | null;
    marcaLabel: string | null;
  }) => void;
  onSaved: () => Promise<void>;
  onExitEditor: () => void;
};

export function VenderProdutoEditor({
  active,
  productId,
  produto,
  rawPayload,
  disabled,
  children,
  onPreviewProdutoChange,
  onPreviewAtivoChange,
  onLabelsChange,
  onSaved,
  onExitEditor,
}: Props) {
  const baseProdutoRef = useRef(produto);
  baseProdutoRef.current = produto;

  const [snapshot, setSnapshot] = useState<ProdutoSellerEditorDraft>(() =>
    buildEditorDraft(produto, rawPayload),
  );
  const [draft, setDraft] = useState<ProdutoSellerEditorDraft>(() =>
    buildEditorDraft(produto, rawPayload),
  );
  const [previewOnly, setPreviewOnly] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const dirty = !draftsEqual(draft, snapshot);

  useEffect(() => {
    if (!active) return;
    const nextSnapshot = buildEditorDraft(produto, rawPayload);
    setSnapshot(nextSnapshot);
    setDraft(nextSnapshot);
    setSaveError(null);
  }, [active, produto.id, rawPayload]);

  const applyDraftToPreview = useCallback(
    (nextDraft: ProdutoSellerEditorDraft) => {
      const view = applyEditorDraftToDetalheView(baseProdutoRef.current, nextDraft);
      onPreviewProdutoChange(view);
      onPreviewAtivoChange(nextDraft.ativo);
    },
    [onPreviewProdutoChange, onPreviewAtivoChange],
  );

  useEffect(() => {
    if (!active) return;
    applyDraftToPreview(draft);
  }, [active, draft, applyDraftToPreview]);

  const handleDraftChange = (next: ProdutoSellerEditorDraft) => {
    setDraft(next);
    setSaveError(null);
  };

  const handleCancel = () => {
    setDraft(snapshot);
    setSaveError(null);
    applyDraftToPreview(snapshot);
    onExitEditor();
  };

  const handleSave = async () => {
    const payload = buildUpdatePayloadFromDraft(draft);
    if (!payload) {
      setSaveError("Revise os campos obrigatórios antes de salvar.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await produtosRoutes.updateProduto(productId, payload);
      notifySuccess("Produto atualizado", "As alterações foram salvas no servidor.");
      await onSaved();
    } catch (err) {
      setSaveError(getAxiosErrorMessage(err, "Não foi possível atualizar o produto."));
    } finally {
      setSaving(false);
    }
  };

  if (!active) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <VenderProdutoEditorTopbar
        dirty={dirty}
        saving={saving}
        previewOnly={previewOnly}
        saveError={saveError}
        onVisualizar={() => setPreviewOnly((v) => !v)}
        onCancel={handleCancel}
        onSave={() => void handleSave()}
      />

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0">{children}</div>
        {!previewOnly ? (
          <VenderProdutoEditorPanel
            draft={draft}
            rawPayload={rawPayload}
            disabled={disabled || saving}
            onDraftChange={handleDraftChange}
            onLabelsChange={onLabelsChange}
          />
        ) : null}
      </div>
    </div>
  );
}
