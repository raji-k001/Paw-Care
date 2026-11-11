import { createContext, useContext, useEffect, useState } from "react";

const KEY = "pawcareCompare";
const MAX = 3;
const CompareContext = createContext({ ids: [], toggle: () => {}, remove: () => {}, clear: () => {} });

const load = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(saved) ? saved.slice(0, MAX) : [];
  } catch {
    return [];
  }
};

export function CompareProvider({ children }) {
  const [ids, setIds] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(ids));
    } catch {
      // storage can be blocked, the list then lasts until you close the tab
    }
  }, [ids]);

  const toggle = (id) =>
    setIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= MAX ? cur : [...cur, id]));
  const remove = (id) => setIds((cur) => cur.filter((x) => x !== id));
  const clear = () => setIds([]);

  return <CompareContext.Provider value={{ ids, toggle, remove, clear }}>{children}</CompareContext.Provider>;
}

export const useCompare = () => useContext(CompareContext);