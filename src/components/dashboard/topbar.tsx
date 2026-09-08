"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, LogOut, Moon, Search, Settings, Sun, User as UserIcon } from "lucide-react";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { LanguageSwitcher } from "@/components/dashboard/language-switcher";
import { useT } from "@/lib/i18n/use-t";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";
import { useAuthStore } from "@/store/use-auth-store";
import { signOutAction } from "@/lib/actions/auth";
import { getInitials } from "@/lib/utils";

const ROUTE_TITLE_KEYS: Record<string, string> = {
  "/dashboard": "dashboard.title",
  "/profile": "nav.profile",
  "/settings": "settings.title",
  "/contacts": "contacts.title",
  "/alerts": "nav.alerts",
  "/community": "community.title",
  "/guardian": "nav.guardian",
};

export function Topbar({ title }: { title?: string }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const { t } = useT();
  const routeKey = ROUTE_TITLE_KEYS[pathname];
  const resolvedTitle = title ?? (routeKey ? t(routeKey) : "Suraksha360");

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Traveller";

  async function handleSignOut() {
    await signOutAction();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="glass sticky top-0 z-30 flex items-center gap-3 border-b border-foreground/10 px-4 py-3 sm:px-6">
      <MobileNav />

      <h1 className="hidden text-lg font-semibold tracking-tight sm:block">{resolvedTitle}</h1>

      <div className="relative ml-auto hidden max-w-sm flex-1 items-center sm:flex">
        <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
        <Input placeholder="Search journeys, contacts…" className="pl-9" />
      </div>

      <LanguageSwitcher />

      <Button
        variant="ghost"
        size="icon"
        className="ml-0"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        aria-label="Toggle theme"
      >
        {theme === "dark" ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
      </Button>

      <Button variant="ghost" size="icon" className="relative">
        <Bell className="size-4.5" />
        <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-full pr-1 transition-colors hover:bg-foreground/[0.06]">
            <Avatar>
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-foreground">{displayName}</span>
            <span className="truncate text-xs font-normal text-muted-foreground">{user?.email}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/profile">
              <UserIcon /> {t("nav.profile")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <Settings /> {t("nav.settings")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={handleSignOut}>
            <LogOut /> {t("nav.signOut")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Badge variant="success" className="hidden lg:inline-flex">
        Guardian online
      </Badge>
    </header>
  );
}
