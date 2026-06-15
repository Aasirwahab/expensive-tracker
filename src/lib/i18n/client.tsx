"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_LOCALE, type Locale } from "./config";
import type { Dict } from "./dictionaries";

const LanguageContext = createContext<{ locale: Locale; dict: Dict }>({
  locale: DEFAULT_LOCALE,
  dict: {},
});

export function LanguageProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dict;
  children: ReactNode;
}) {
  return (
    <LanguageContext.Provider value={{ locale, dict }}>
      {children}
    </LanguageContext.Provider>
  );
}

/** Translate in client components: `const { t } = useT()`. */
export function useT() {
  const { dict, locale } = useContext(LanguageContext);
  return { t: (key: string) => dict[key] ?? key, locale };
}
