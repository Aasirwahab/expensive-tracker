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
  label: string;
  href: string;
  icon: LucideIcon;
  ownerOnly?: boolean;
  superAdminOnly?: boolean;
};

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, ownerOnly: true },
  { label: "Quick Sale", href: "/quick-sale", icon: Zap },
  { label: "Sales", href: "/sales", icon: ReceiptText },
  { label: "Customers", href: "/customers", icon: UserCircle, ownerOnly: true },
  { label: "Suppliers", href: "/suppliers", icon: Truck, ownerOnly: true },
  { label: "Products", href: "/products", icon: Package },
  { label: "Expenses", href: "/expenses", icon: Wallet, ownerOnly: true },
  { label: "Reports", href: "/reports", icon: BarChart3, ownerOnly: true },
  { label: "Day close", href: "/cash-close", icon: Banknote, ownerOnly: true },
  { label: "Team", href: "/team", icon: Users, ownerOnly: true },
  { label: "Settings", href: "/settings", icon: Settings, ownerOnly: true },
  { label: "Admin", href: "/admin", icon: ShieldCheck, superAdminOnly: true },
];
