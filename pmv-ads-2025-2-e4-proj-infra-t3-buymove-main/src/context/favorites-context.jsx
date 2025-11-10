import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/context/auth-context";
import { createFavorite, deleteFavorite, listFavorites } from "@/services/favorites";
import { normalizeVehicle } from "@/services/vehicles";

const FavoritesContext = createContext(null);
const STORAGE_KEY = "bm_favorites";

function readStoredFavorites() {
  if (typeof window === "undefined") return [];

  try {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);
    if (!storedValue) return [];
    const parsed = JSON.parse(storedValue);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => normalizeVehicle(item)).filter(Boolean);
  } catch (error) {
    console.warn("Não foi possível carregar favoritos do armazenamento local.", error);
    return [];
  }
}

function persistStoredFavorites(items) {
  if (typeof window === "undefined") return;

  try {
    const normalized = items.map((item) => normalizeVehicle(item)).filter(Boolean);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch (error) {
    console.warn("Não foi possível salvar favoritos no armazenamento local.", error);
  }
}

export function FavoritesProvider({ children }) {
  const { user, initializing } = useAuth();
  const [favorites, setFavorites] = useState(() => readStoredFavorites());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const hydrateFavorites = useCallback(async () => {
    if (initializing) return;

    if (!user) {
      const stored = readStoredFavorites();
      setFavorites(stored);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const storedGuests = readStoredFavorites();
      if (storedGuests.length) {
        for (const vehicle of storedGuests) {
          if (!vehicle?.id) continue;
          try {
            await createFavorite(vehicle.id);
          } catch (syncError) {
            console.warn("Não foi possível sincronizar favorito local.", syncError);
          }
        }
      }

      const remoteFavorites = await listFavorites();
      setFavorites(remoteFavorites);
      setError(null);

      if (storedGuests.length) {
        persistStoredFavorites([]);
      }
    } catch (err) {
      console.error("Falha ao carregar favoritos remotos", err);
      const message =
        err instanceof Error ? err.message : "Não foi possível carregar favoritos.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [initializing, user]);

  useEffect(() => {
    if (initializing) return;
    hydrateFavorites();
  }, [hydrateFavorites, initializing]);

  const toggleFavorite = useCallback(
    async (vehicle) => {
      const normalized = normalizeVehicle(vehicle);
      if (!normalized?.id) return;

      if (!user) {
        setFavorites((prev) => {
          const exists = prev.some((item) => item.id === normalized.id);
          const next = exists
            ? prev.filter((item) => item.id !== normalized.id)
            : [normalized, ...prev];
          persistStoredFavorites(next);
          return next;
        });
        setError(null);
        return;
      }

      const exists = favorites.some((item) => item.id === normalized.id);
      try {
        if (exists) {
          await deleteFavorite(normalized.id);
          setFavorites((prev) => prev.filter((item) => item.id !== normalized.id));
        } else {
          const created = await createFavorite(normalized.id);
          const entry = created ?? normalized;
          setFavorites((prev) => [entry, ...prev.filter((item) => item.id !== entry.id)]);
        }
        setError(null);
      } catch (err) {
        console.error("Não foi possível atualizar favoritos", err);
        const message =
          err instanceof Error ? err.message : "Não foi possível atualizar favoritos.";
        setError(message);
        throw err;
      }
    },
    [favorites, user]
  );

  const removeFavorite = useCallback(
    async (id) => {
      if (!id) return;

      if (!user) {
        setFavorites((prev) => {
          const next = prev.filter((item) => item.id !== id);
          persistStoredFavorites(next);
          return next;
        });
        setError(null);
        return;
      }

      try {
        await deleteFavorite(id);
        setFavorites((prev) => prev.filter((item) => item.id !== id));
        setError(null);
      } catch (err) {
        console.error("Não foi possível remover favorito", err);
        const message =
          err instanceof Error ? err.message : "Não foi possível remover favorito.";
        setError(message);
        throw err;
      }
    },
    [user]
  );

  const updateFavorite = useCallback(
    (id, patch) => {
      setFavorites((prev) => {
        const next = prev.map((item) => {
          if (item.id !== id) return item;
          return normalizeVehicle({ ...item, ...patch }) ?? { ...item, ...patch };
        });
        if (!user) {
          persistStoredFavorites(next);
        }
        return next;
      });
    },
    [user]
  );

  const value = useMemo(
    () => ({
      favorites,
      toggleFavorite,
      removeFavorite,
      updateFavorite,
      loading,
      error,
      refresh: hydrateFavorites,
    }),
    [favorites, toggleFavorite, removeFavorite, updateFavorite, loading, error, hydrateFavorites]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const context = useContext(FavoritesContext);

  if (!context) {
    throw new Error("useFavorites deve ser utilizado dentro de FavoritesProvider");
  }

  return context;
}
