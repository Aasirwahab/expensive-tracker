import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Zap,
  ReceiptText,
  Package,
  Wallet,
  BarChart3,
  Users,
  Settings,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  ownerOnly?: boolean;
};

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, ownerOnly: true },
  { label: "Quick Sale", href: "/quick-sale", icon: Zap },
  { label: "Sales", href: "/sales", icon: ReceiptText },
  { label: "Products", href: "/products", icon: Package },
  { label: "Expenses", href: "/expenses", icon: Wallet, ownerOnly: true },
  { label: "Reports", href: "/reports", icon: BarChart3, ownerOnly: true },
  { label: "Team", href: "/team", icon: Users, ownerOnly: true },
  { label: "Settings", href: "/settings", icon: Settings, ownerOnly: true },
];
