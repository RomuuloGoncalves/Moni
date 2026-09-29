"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

const STORAGE_KEY = "moni_hide_values";

interface HideValuesContextType {
  hidden: boolean;
  toggle: () => void;
}

export const HideValuesContext = createContext<HideValuesContextType>({
  hidden: true,
  toggle: () => {},
});

export function HideValuesProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) setHidden(stored === "true");
    } catch {}
  }, []);

  function toggle() {
    setHidden((prev) => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, String(next)); } catch {}
      return next;
    });
  }

  return (
    <HideValuesContext.Provider value={{ hidden, toggle }}>
      {children}
    </HideValuesContext.Provider>
  );
}

export function useHideValues() {
  return useContext(HideValuesContext);
}
