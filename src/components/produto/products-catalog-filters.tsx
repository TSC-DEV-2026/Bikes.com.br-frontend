import { useEffect, useMemo, useState } from "react";
import { FaFilter } from "react-icons/fa6";
import { useSearchParams } from "react-router-dom";

import {
  listCategorias,
  listMarcas,
  type CatalogoOption,
} from "@/api/endpoints/catalogo.routes";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { MarketplaceFilterSelect } from "@/components/produto/marketplace-filter-select";
import type { Marca } from "@/types/marca";
import {
  countActiveProductsListFilters,
  PRODUTOS_LIST_ORDENACAO_OPTIONS,
  readProductsListFilters,
  writeProductsListFilters,
  type ProductsListFilters,
} from "@/lib/products-list-params";
import { normalizeProdutosListOrdenacao } from "@/api/endpoints/produtos.routes";
import { cn } from "@/lib/utils";

const CONDICAO_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "novo", label: "Novo" },
  { value: "semi-novo", label: "Semi-novo" },
  { value: "usado", label: "Usado" },
] as const;

type FilterFormState = {
  ordenacao: string;
  categoria_id: string;
  marca_id: string;
  condicao: string;
  preco_min: string;
  preco_max: string;
};

function filtersToForm(filters: ProductsListFilters): FilterFormState {
  return {
    ordenacao: filters.ordenacao ?? "recentes",
    categoria_id: filters.categoria_id != null ? String(filters.categoria_id) : "",
    marca_id: filters.marca_id != null ? String(filters.marca_id) : "",
    condicao: filters.condicao ?? "",
    preco_min: filters.preco_min != null ? String(filters.preco_min) : "",
    preco_max: filters.preco_max != null ? String(filters.preco_max) : "",
  };
}

function formToFilters(form: FilterFormState, q?: string): ProductsListFilters {
  const out: ProductsListFilters = {};
  const term = q?.trim();
  if (term) out.q = term;
  const ordenacao = normalizeProdutosListOrdenacao(form.ordenacao);
  if (ordenacao && ordenacao !== "recentes") {
    out.ordenacao = ordenacao;
  }
  const cat = Number.parseInt(form.categoria_id, 10);
  if (Number.isFinite(cat) && cat > 0) out.categoria_id = cat;
  const marca = Number.parseInt(form.marca_id, 10);
  if (Number.isFinite(marca) && marca > 0) out.marca_id = marca;
  if (form.condicao.trim()) out.condicao = form.condicao.trim();
  const pmin = Number.parseFloat(form.preco_min.replace(",", "."));
  if (Number.isFinite(pmin) && pmin >= 0) out.preco_min = pmin;
  const pmax = Number.parseFloat(form.preco_max.replace(",", "."));
  if (Number.isFinite(pmax) && pmax >= 0) out.preco_max = pmax;
  if (
    out.preco_min != null &&
    out.preco_max != null &&
    out.preco_min > out.preco_max
  ) {
    const min = out.preco_min;
    out.preco_min = out.preco_max;
    out.preco_max = min;
  }
  return out;
}

const FILTER_SELECT_MENU_LAYER_DRAWER = "z-[2200]";

function isMarketplaceFilterSelectPortalTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest('[data-slot="select-content"]'));
}

type ProductsCatalogFiltersPanelProps = {
  form: FilterFormState;
  onChange: (next: FilterFormState) => void;
  categorias: CatalogoOption[];
  marcas: Marca[];
  catalogLoading: boolean;
  onApply: () => void;
  onClear: () => void;
  className?: string;
  /** Oculta botões (ex.: rodapé sticky do drawer mobile). */
  showActions?: boolean;
  /** z-index do menu dos selects (drawer mobile). */
  selectMenuLayerClass?: string;
};

function ProductsCatalogFiltersPanel({
  form,
  onChange,
  categorias,
  marcas,
  catalogLoading,
  onApply,
  onClear,
  className,
  showActions = true,
  selectMenuLayerClass,
}: ProductsCatalogFiltersPanelProps) {
  const fieldClass =
    "h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-[#0c1b33] focus:outline-none focus:ring-2 focus:ring-slate-300/80";

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <label htmlFor="filter-ordenacao" className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">
          Ordenar por
        </label>
        <MarketplaceFilterSelect
          id="filter-ordenacao"
          value={form.ordenacao}
          onValueChange={(ordenacao) => onChange({ ...form, ordenacao })}
          options={PRODUTOS_LIST_ORDENACAO_OPTIONS}
          menuLayerClass={selectMenuLayerClass}
        />
      </div>

      <div>
        <label htmlFor="filter-categoria" className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">
          Categoria
        </label>
        <MarketplaceFilterSelect
          id="filter-categoria"
          value={form.categoria_id}
          disabled={catalogLoading}
          onValueChange={(categoria_id) => onChange({ ...form, categoria_id })}
          menuLayerClass={selectMenuLayerClass}
          options={[
            { value: "", label: "Todas" },
            ...categorias.map((c) => ({
              value: String(c.id),
              label: c.nome,
            })),
          ]}
        />
      </div>

      <div>
        <label htmlFor="filter-marca" className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">
          Marca
        </label>
        <MarketplaceFilterSelect
          id="filter-marca"
          value={form.marca_id}
          disabled={catalogLoading}
          onValueChange={(marca_id) => onChange({ ...form, marca_id })}
          menuLayerClass={selectMenuLayerClass}
          options={[
            { value: "", label: "Todas" },
            ...marcas.map((m) => ({
              value: String(m.id),
              label: m.nome,
            })),
          ]}
        />
      </div>

      <div>
        <label htmlFor="filter-condicao" className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">
          Condição
        </label>
        <MarketplaceFilterSelect
          id="filter-condicao"
          value={form.condicao}
          onValueChange={(condicao) => onChange({ ...form, condicao })}
          options={CONDICAO_OPTIONS}
          menuLayerClass={selectMenuLayerClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="filter-preco-min" className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">
            Preço mín.
          </label>
          <input
            id="filter-preco-min"
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={form.preco_min}
            onChange={(e) => onChange({ ...form, preco_min: e.target.value })}
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="filter-preco-max" className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">
            Preço máx.
          </label>
          <input
            id="filter-preco-max"
            type="text"
            inputMode="decimal"
            placeholder="99999"
            value={form.preco_max}
            onChange={(e) => onChange({ ...form, preco_max: e.target.value })}
            className={fieldClass}
          />
        </div>
      </div>

      {showActions ? (
        <ProductsCatalogFiltersActions onApply={onApply} onClear={onClear} />
      ) : null}
    </div>
  );
}

function ProductsCatalogFiltersActions({
  onApply,
  onClear,
  className,
}: {
  onApply: () => void;
  onClear: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2 pt-1", className)}>
      <Button
        type="button"
        className="h-10 w-full bg-[#0c1b33] font-semibold text-white hover:bg-[#0c1b33]/90"
        onClick={onApply}
      >
        Aplicar filtros
      </Button>
      <Button type="button" variant="outline" className="h-10 w-full" onClick={onClear}>
        Limpar filtros
      </Button>
    </div>
  );
}

export type ProductsCatalogFiltersProps = {
  searchQuery: string;
  className?: string;
};

export function ProductsCatalogFilters({
  searchQuery,
  className,
}: ProductsCatalogFiltersProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [categorias, setCategorias] = useState<CatalogoOption[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  const urlFilters = useMemo(
    () => readProductsListFilters(searchParams),
    [searchParams],
  );

  const [form, setForm] = useState<FilterFormState>(() =>
    filtersToForm(urlFilters),
  );

  useEffect(() => {
    setForm(filtersToForm(urlFilters));
  }, [urlFilters]);

  useEffect(() => {
    let cancelled = false;
    setCatalogLoading(true);
    void (async () => {
      try {
        const [cats, mks] = await Promise.all([listCategorias(), listMarcas()]);
        if (cancelled) return;
        setCategorias(cats);
        setMarcas(mks.filter((m) => m.ativo !== false));
      } catch {
        if (!cancelled) {
          setCategorias([]);
          setMarcas([]);
        }
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeCount = countActiveProductsListFilters(urlFilters);

  const applyFilters = () => {
    const next = formToFilters(form, searchQuery);
    setSearchParams(writeProductsListFilters(next));
    setMobileOpen(false);
  };

  const clearFilters = () => {
    const cleared = filtersToForm({});
    setForm(cleared);
    const next = formToFilters(cleared, searchQuery);
    setSearchParams(writeProductsListFilters(next));
    setMobileOpen(false);
  };

  const panel = (
    <ProductsCatalogFiltersPanel
      form={form}
      onChange={setForm}
      categorias={categorias}
      marcas={marcas}
      catalogLoading={catalogLoading}
      onApply={applyFilters}
      onClear={clearFilters}
    />
  );

  return (
    <div className={cn("w-full shrink-0 lg:w-64", className)}>
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="sticky top-[4.25rem] rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <h2 className="mb-1 text-sm font-bold text-[#0c1b33]">Filtros</h2>
          <p className="mb-4 text-xs text-slate-500">
            Refine por categoria, marca, preço e condição.
          </p>
          {panel}
        </div>
      </aside>

      <div className="lg:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="h-10 gap-2 border-gray-200 font-semibold"
            >
              <FaFilter className="size-4" aria-hidden />
              Filtros
              {activeCount > 0 ? (
                <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-[#0c1b33] px-1.5 text-[10px] font-bold text-white">
                  {activeCount}
                </span>
              ) : null}
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            overlayClassName="z-[2100]"
            onInteractOutside={(event) => {
              if (isMarketplaceFilterSelectPortalTarget(event.target)) {
                event.preventDefault();
              }
            }}
            onPointerDownOutside={(event) => {
              if (isMarketplaceFilterSelectPortalTarget(event.target)) {
                event.preventDefault();
              }
            }}
            onFocusOutside={(event) => {
              if (isMarketplaceFilterSelectPortalTarget(event.target)) {
                event.preventDefault();
              }
            }}
            className={cn(
              "z-[2100] flex h-[100dvh] max-h-[100dvh] w-[min(calc(100vw-1rem),360px)] max-w-[360px] flex-col gap-0 overflow-hidden border-r border-slate-200/80 bg-white p-0",
              "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0",
            )}
          >
            <SheetHeader className="shrink-0 space-y-1 border-b border-slate-200/80 px-4 py-3 pr-12 text-left">
              <SheetTitle className="text-base font-bold text-[#0c1b33]">
                Filtros
              </SheetTitle>
              <p className="text-xs font-normal text-slate-500">
                Refine por categoria, marca, preço e condição.
              </p>
            </SheetHeader>

            <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-4">
              <ProductsCatalogFiltersPanel
                form={form}
                onChange={setForm}
                categorias={categorias}
                marcas={marcas}
                catalogLoading={catalogLoading}
                onApply={applyFilters}
                onClear={clearFilters}
                showActions={false}
                selectMenuLayerClass={FILTER_SELECT_MENU_LAYER_DRAWER}
              />
            </div>

            <SheetFooter className="shrink-0 border-t border-slate-200/80 bg-white px-4 py-3">
              <ProductsCatalogFiltersActions
                onApply={applyFilters}
                onClear={clearFilters}
                className="w-full pt-0"
              />
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
