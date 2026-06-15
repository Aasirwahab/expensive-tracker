export const LOCALES = ["en", "si", "ta", "ar"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "locale";

export const LOCALE_META: Record<
  Locale,
  { label: string; native: string; dir: "ltr" | "rtl" }
> = {
  en: { label: "English", native: "English", dir: "ltr" },
  si: { label: "Sinhala", native: "සිංහල", dir: "ltr" },
  ta: { label: "Tamil", native: "தமிழ்", dir: "ltr" },
  ar: { label: "Arabic", native: "العربية", dir: "rtl" },
};

export function isLocale(v: string | undefined | null): v is Locale {
  return !!v && (LOCALES as readonly string[]).includes(v);
}

export function dirFor(locale: Locale): "ltr" | "rtl" {
  return LOCALE_META[locale].dir;
}
