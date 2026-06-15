"use client";

import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import {
  LOCALES,
  LOCALE_META,
  LOCALE_COOKIE,
  type Locale,
} from "@/lib/i18n/config";
import { useT } from "@/lib/i18n/client";

/**
 * Switch the app language. Saves the choice in a cookie, flips the document
 * direction immediately (for instant Arabic RTL), then refreshes so server
 * components re-render in the new language.
 */
export function LanguageSwitcher() {
  const router = useRouter();
  const { locale } = useT();

  function change(next: Locale) {
    if (next === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = next;
    document.documentElement.dir = LOCALE_META[next].dir;
    router.refresh();
  }

  return (
    <label className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-2.5 py-1.5 text-xs font-medium text-text">
      <Languages className="h-3.5 w-3.5 text-muted" />
      <select
        value={locale}
        onChange={(e) => change(e.target.value as Locale)}
        aria-label="Language"
        className="bg-transparent text-text outline-none"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {LOCALE_META[l].native}
          </option>
        ))}
      </select>
    </label>
  );
}
