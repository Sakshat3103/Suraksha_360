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
  labelKey: string;
  href: string;
  icon: LucideIcon;
}

export const primaryNav: NavItem[] = [
  { labelKey: "nav.dashboard", href: "/dashboard", icon: LayoutDashboard },
  { labelKey: "nav.contacts", href: "/contacts", icon: Users },
  { labelKey: "nav.community", href: "/community", icon: MessageSquareWarning },
  { labelKey: "nav.guardian", href: "/guardian", icon: ShieldHalf },
  { labelKey: "nav.alerts", href: "/alerts", icon: ShieldAlert },
];

export const secondaryNav: NavItem[] = [
  { labelKey: "nav.profile", href: "/profile", icon: User },
  { labelKey: "nav.settings", href: "/settings", icon: Settings },
];
