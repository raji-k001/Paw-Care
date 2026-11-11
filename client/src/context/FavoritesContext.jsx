import { createContext, useCallback, useContext, useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "./AuthContext";

const FavoritesContext = createContext({ ids: new Set(), toggle: async () => "" });

export function FavoritesProvider({ children }) {
  const { user } = useAuth();
  const userId = user?._id;
  const [ids, setIds] = useState(() => new Set());

  useEffect(() => {
    if (!userId) return;
    let ignore = false;
    api
      .get("/favorites/ids")
      .then((res) => !ignore && setIds(new Set(res.data)))
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [userId]);

  // Returns an error message, or "" when it worked
  const toggle = useCallback(
    async (petId) => {
      const had = ids.has(petId);
      const flip = (adding) =>
        setIds((cur) => {
          const next = new Set(cur);
          if (adding) next.add(petId);
          else next.delete(petId);
          return next;
        });

      flip(!had); // update the heart at once, undo if the server says no
      try {
        if (had) await api.delete(`/favorites/${petId}`);
        else await api.post(`/favorites/${petId}`);
        return "";
      } catch (err) {
        flip(had);
        return err.response?.data?.message || "Could not update favorites";
      }
    },
    [ids]
  );

  return (
    <FavoritesContext.Provider value={{ ids: userId ? ids : new Set(), toggle }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export const useFavorites = () => useContext(FavoritesContext);