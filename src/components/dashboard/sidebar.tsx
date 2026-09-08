"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, LogOut, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { primaryNav, secondaryNav } from "@/lib/nav-config";
import { useUIStore } from "@/store/use-ui-store";
import { useSosStore } from "@/store/use-sos-store";
import { signOutAction } from "@/lib/actions/auth";
import { useRouter } from "next/navigation";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function NavLink({
  href,
  icon: Icon,
  label,
  collapsed,
  active,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  collapsed: boolean;
  active: boolean;
}) {
  const content = (
    <Link
      href={href}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-gradient-brand text-white shadow-md shadow-[oklch(0.55_0.2_280_/_0.3)]"
          : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground",
        collapsed && "justify-center px-2.5"
      )}
    >
      <Icon className="size-4.5 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );

  if (!collapsed) return content;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const fireSos = useSosStore((s) => s.fire);
  const router = useRouter();

  async function handleSignOut() {
    await signOutAction();
    router.push("/login");
    router.refresh();
  }

  return (
    <motion.aside
      animate={{ width: collapsed ? 84 : 268 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="glass sticky top-0 hidden h-screen shrink-0 flex-col border-r border-white/10 p-4 lg:flex"
    >
      <div className={cn("flex items-center gap-2 px-1", collapsed && "justify-center")}>
        {collapsed ? <Logo iconOnly /> : <Logo />}
      </div>

      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-9 flex size-6 items-center justify-center rounded-full border border-white/10 bg-[var(--popover)] text-muted-foreground shadow-md transition-transform hover:text-foreground"
      >
        <ChevronsLeft className={cn("size-3.5 transition-transform", collapsed && "rotate-180")} />
      </button>

      <div className="mt-8 flex flex-1 flex-col gap-1">
        {!collapsed && (
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Safety
          </p>
        )}
        {primaryNav.map((item) => (
          <NavLink
            key={item.label}
            {...item}
            collapsed={collapsed}
            active={pathname === item.href}
          />
        ))}

        <div className="my-3 h-px bg-white/10" />

        {!collapsed && (
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Account
          </p>
        )}
        {secondaryNav.map((item) => (
          <NavLink
            key={item.label}
            {...item}
            collapsed={collapsed}
            active={pathname === item.href}
          />
        ))}
      </div>

      <button
        onClick={() => fireSos("manual")}
        className={cn(
          "glass flex items-center gap-2 rounded-xl p-3 text-left transition-colors hover:bg-destructive/10",
          collapsed && "flex-col"
        )}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-destructive/15 text-destructive">
          <ShieldAlert className="size-4" />
        </span>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">Emergency SOS</p>
            <p className="truncate text-[11px] text-muted-foreground">Tap, or double-tap anywhere</p>
          </div>
        )}
      </button>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleSignOut}
        className={cn("mt-2 justify-start text-muted-foreground", collapsed && "justify-center px-2")}
      >
        <LogOut className="size-4" />
        {!collapsed && "Sign out"}
      </Button>
    </motion.aside>
  );
}
