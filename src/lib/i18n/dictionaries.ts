import type { Locale } from "./config";

export type Dict = Record<string, string>;

// English is the base/source of truth. Other locales override keys; anything
// missing falls back to English (and then to the key itself), so the app never
// shows a blank — untranslated screens simply stay in English until translated.
//
// NOTE: the si / ta / ar strings are a best-effort first pass and should be
// proofread by a native speaker before going live.
const en: Dict = {
  "nav.dashboard": "Dashboard",
  "nav.quickSale": "Quick Sale",
  "nav.sales": "Sales",
  "nav.customers": "Customers",
  "nav.suppliers": "Suppliers",
  "nav.products": "Products",
  "nav.expenses": "Expenses",
  "nav.reports": "Reports",
  "nav.dayClose": "Day close",
  "nav.team": "Team",
  "nav.settings": "Settings",
  "nav.admin": "Admin",

  "topbar.newSale": "New sale",
  "topbar.subtitle": "Here's how your shop is doing.",

  "common.language": "Language",
};

const si: Dict = {
  "nav.dashboard": "ප්‍රධාන පුවරුව",
  "nav.quickSale": "ඉක්මන් විකුණුම",
  "nav.sales": "විකුණුම්",
  "nav.customers": "පාරිභෝගිකයින්",
  "nav.suppliers": "සැපයුම්කරුවන්",
  "nav.products": "භාණ්ඩ",
  "nav.expenses": "වියදම්",
  "nav.reports": "වාර්තා",
  "nav.dayClose": "දින අවසානය",
  "nav.team": "කණ්ඩායම",
  "nav.settings": "සැකසුම්",
  "nav.admin": "පරිපාලක",

  "topbar.newSale": "නව විකුණුම",
  "topbar.subtitle": "ඔබේ සාප්පුවේ තත්ත්වය මෙන්න.",

  "common.language": "භාෂාව",
};

const ta: Dict = {
  "nav.dashboard": "டாஷ்போர்டு",
  "nav.quickSale": "விரைவு விற்பனை",
  "nav.sales": "விற்பனைகள்",
  "nav.customers": "வாடிக்கையாளர்கள்",
  "nav.suppliers": "சப்ளையர்கள்",
  "nav.products": "பொருட்கள்",
  "nav.expenses": "செலவுகள்",
  "nav.reports": "அறிக்கைகள்",
  "nav.dayClose": "நாள் முடிப்பு",
  "nav.team": "குழு",
  "nav.settings": "அமைப்புகள்",
  "nav.admin": "நிர்வாகி",

  "topbar.newSale": "புதிய விற்பனை",
  "topbar.subtitle": "உங்கள் கடையின் நிலை இதோ.",

  "common.language": "மொழி",
};

const ar: Dict = {
  "nav.dashboard": "لوحة التحكم",
  "nav.quickSale": "بيع سريع",
  "nav.sales": "المبيعات",
  "nav.customers": "العملاء",
  "nav.suppliers": "الموردون",
  "nav.products": "المنتجات",
  "nav.expenses": "المصروفات",
  "nav.reports": "التقارير",
  "nav.dayClose": "إغلاق اليوم",
  "nav.team": "الفريق",
  "nav.settings": "الإعدادات",
  "nav.admin": "المشرف",

  "topbar.newSale": "بيع جديد",
  "topbar.subtitle": "إليك حالة متجرك.",

  "common.language": "اللغة",
};

const OVERRIDES: Record<Locale, Dict> = { en, si, ta, ar };

/** Resolved dictionary for a locale: English base with the locale's overrides. */
export function getDictionary(locale: Locale): Dict {
  return { ...en, ...OVERRIDES[locale] };
}
