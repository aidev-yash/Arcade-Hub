import { createContext, useContext, useState, type ReactNode } from "react";
import type { Lang } from "./translations";

interface LangCtx {
  lang: Lang;
  toggleLang: () => void;
}

const LangContext = createContext<LangCtx>({ lang: "EN", toggleLang: () => {} });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem("dgh_lang");
    return saved === "HI" ? "HI" : "EN";
  });

  const toggleLang = () => {
    setLang(prev => {
      const next: Lang = prev === "EN" ? "HI" : "EN";
      localStorage.setItem("dgh_lang", next);
      return next;
    });
  };

  return (
    <LangContext.Provider value={{ lang, toggleLang }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
