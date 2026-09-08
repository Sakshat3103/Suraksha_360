import {
  LayoutDashboard,
  User,
  Settings,
  Users,
  ShieldAlert,
  MessageSquareWarning,
  ShieldHalf,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const primaryNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Emergency Contacts", href: "/contacts", icon: Users },
  { label: "Community", href: "/community", icon: MessageSquareWarning },
  { label: "Guardian", href: "/guardian", icon: ShieldHalf },
  { label: "Alerts", href: "/alerts", icon: ShieldAlert },
];

export const secondaryNav: NavItem[] = [
  { label: "Profile", href: "/profile", icon: User },
  { label: "Settings", href: "/settings", icon: Settings },
];
