import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Zap,
  ReceiptText,
  Wallet,
  Package,
  BarChart3,
  Settings,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Quick Sale", href: "/quick-sale", icon: Zap },
  { label: "Sales", href: "/sales", icon: ReceiptText },
  { label: "Expenses", href: "/expenses", icon: Wallet },
  { label: "Products", href: "/products", icon: Package },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
];
