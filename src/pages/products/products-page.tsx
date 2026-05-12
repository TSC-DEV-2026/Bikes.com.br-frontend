import { Navigate, useLocation } from "react-router-dom";

/** Redireciona para `/home` preservando filtros; migra `search` legado para `q`. */
export default function ProductsPage() {
  const location = useLocation();
  const sp = new URLSearchParams(location.search ?? "");

  if (sp.has("search") && !sp.has("q")) {
    const s = sp.get("search");
    if (s != null && s !== "") sp.set("q", s);
    sp.delete("search");
  }

  const qs = sp.toString();
  return <Navigate to={qs ? `/home?${qs}` : "/home"} replace />;
}
