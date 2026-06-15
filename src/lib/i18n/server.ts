import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./config";
import { getDictionary, type Dict } from "./dictionaries";

/** The active locale from the cookie (server-side). Defaults to English. */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** Locale + resolved dictionary + a `t(key)` helper for server components. */
export async function getT(): Promise<{
  locale: Locale;
  dict: Dict;
  t: (key: string) => string;
}> {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  return { locale, dict, t: (key: string) => dict[key] ?? key };
}
