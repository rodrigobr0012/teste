import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const FavoritesContext = createContext(null);
const KEY = "bm_favorites";

export function FavoritesProvider({ children }) {
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(favorites));
  }, [favorites]);

  function toggleFavorite(vehicle) {
    setFavorites((prev) => {
      const exists = prev.find((v) => v.id === vehicle.id);
      if (exists) return prev.filter((v) => v.id !== vehicle.id);
      return [...prev, vehicle];
    });
  }

  function removeFavorite(id) {
    setFavorites((prev) => prev.filter((v) => v.id !== id));
  }

  function updateFavorite(id, patch) {
    setFavorites((prev) => prev.map((v) => v.id === id ? { ...v, ...patch } : v));
  }

  const value = useMemo(() => ({ favorites, toggleFavorite, removeFavorite, updateFavorite }), [favorites]);

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export const useFavorites = () => useContext(FavoritesContext);
