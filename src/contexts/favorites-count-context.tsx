import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { listFavoritos } from "@/api/endpoints/favoritos.routes";
import { useAuth } from "@/contexts/auth-context";
import { favoriteIdsFromListPayload } from "@/types/favorito";

const SEEN_PREFIX = "favorites.seen.ids.v1::";

function seenStorageKey(email: string | undefined): string {
  const safe = email?.trim() || "__pending__";
  return `${SEEN_PREFIX}${safe}`;
}

function loadSeenFromStorage(email: string | undefined): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(seenStorageKey(email));
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(
      arr.filter((x): x is string => typeof x === "string" && x.length > 0)
    );
  } catch {
    return new Set();
  }
}

function persistSeenToStorage(email: string | undefined, set: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(seenStorageKey(email), JSON.stringify([...set]));
  } catch {
    // ignore
  }
}

type FavoritesCountContextValue = {
  favoriteCount: number;
  /** Favoritos que ainda não foram “vistos” na página /favorites. */
  unseenFavoriteCount: number;
  favoritesBadgeVisible: boolean;
  refreshFavoriteCount: () => Promise<void>;
  /** Marca estes produtos como visualizados (normalmente todos os ids do GET em /favorites). */
  acknowledgeFavoritesBadge: (produtoIds: string[]) => void;
};

const FavoritesCountContext = createContext<FavoritesCountContextValue | null>(null);

export function FavoritesCountProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, bootstrapped, user } = useAuth();
  const email = user?.email;

  const [favoriteIdSet, setFavoriteIdSet] = useState<Set<string>>(() => new Set());
  const [seenFavoriteIds, setSeenFavoriteIds] = useState<Set<string>>(() => new Set());

  const acknowledgeFavoritesBadge = useCallback(
    (produtoIds: string[]) => {
      setSeenFavoriteIds((prev) => {
        const next = new Set(prev);
        for (const id of produtoIds) next.add(String(id));
        persistSeenToStorage(email, next);
        return next;
      });
    },
    [email]
  );

  const refreshFavoriteCount = useCallback(async () => {
    if (!isAuthenticated) {
      setFavoriteIdSet(new Set());
      return;
    }
    try {
      const res = await listFavoritos();
      const ids = res.ok ? favoriteIdsFromListPayload(res.data) : new Set<string>();
      setFavoriteIdSet(ids);
      setSeenFavoriteIds((prev) => {
        const pruned = new Set([...prev].filter((id) => ids.has(id)));
        if (pruned.size !== prev.size) persistSeenToStorage(email, pruned);
        return pruned;
      });
    } catch {
      // mantém estado em falha transitória
    }
  }, [isAuthenticated, email]);

  useEffect(() => {
    if (!bootstrapped) return;
    if (!isAuthenticated) {
      setFavoriteIdSet(new Set());
      setSeenFavoriteIds(new Set());
      return;
    }
    setSeenFavoriteIds(loadSeenFromStorage(email));
    void refreshFavoriteCount();
  }, [bootstrapped, isAuthenticated, email, refreshFavoriteCount]);

  const favoriteCount = favoriteIdSet.size;
  const unseenFavoriteCount = useMemo(() => {
    let n = 0;
    for (const id of favoriteIdSet) {
      if (!seenFavoriteIds.has(id)) n++;
    }
    return n;
  }, [favoriteIdSet, seenFavoriteIds]);

  const favoritesBadgeVisible = isAuthenticated && unseenFavoriteCount > 0;

  const value = useMemo(
    () => ({
      favoriteCount,
      unseenFavoriteCount,
      favoritesBadgeVisible,
      refreshFavoriteCount,
      acknowledgeFavoritesBadge,
    }),
    [
      favoriteCount,
      unseenFavoriteCount,
      favoritesBadgeVisible,
      refreshFavoriteCount,
      acknowledgeFavoritesBadge,
    ]
  );

  return (
    <FavoritesCountContext.Provider value={value}>{children}</FavoritesCountContext.Provider>
  );
}

export function useFavoritesCount() {
  const ctx = useContext(FavoritesCountContext);
  if (!ctx) throw new Error("useFavoritesCount deve ser usado dentro de FavoritesCountProvider");
  return ctx;
}
