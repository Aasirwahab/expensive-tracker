import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Zap,
  ReceiptText,
  Package,
  Wallet,
  BarChart3,
  Users,
  UserCircle,
  Truck,
  Banknote,
  Settings,
  ShieldCheck,
} from "lucide-react";

export type NavItem = {
  label: string; // English fallback
  tKey: string; // translation key (see lib/i18n/dictionaries)
  href: string;
  icon: LucideIcon;
  ownerOnly?: boolean;
  superAdminOnly?: boolean;
};

export const navItems: NavItem[] = [
  { label: "Dashboard", tKey: "nav.dashboard", href: "/dashboard", icon: LayoutDashboard, ownerOnly: true },
  { label: "Quick Sale", tKey: "nav.quickSale", href: "/quick-sale", icon: Zap },
  { label: "Sales", tKey: "nav.sales", href: "/sales", icon: ReceiptText },
  { label: "Customers", tKey: "nav.customers", href: "/customers", icon: UserCircle, ownerOnly: true },
  { label: "Suppliers", tKey: "nav.suppliers", href: "/suppliers", icon: Truck, ownerOnly: true },
  { label: "Products", tKey: "nav.products", href: "/products", icon: Package },
  { label: "Expenses", tKey: "nav.expenses", href: "/expenses", icon: Wallet, ownerOnly: true },
  { label: "Reports", tKey: "nav.reports", href: "/reports", icon: BarChart3, ownerOnly: true },
  { label: "Day close", tKey: "nav.dayClose", href: "/cash-close", icon: Banknote, ownerOnly: true },
  { label: "Team", tKey: "nav.team", href: "/team", icon: Users, ownerOnly: true },
  { label: "Settings", tKey: "nav.settings", href: "/settings", icon: Settings, ownerOnly: true },
  { label: "Admin", tKey: "nav.admin", href: "/admin", icon: ShieldCheck, superAdminOnly: true },
];
