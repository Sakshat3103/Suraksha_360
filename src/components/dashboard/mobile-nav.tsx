"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { primaryNav, secondaryNav } from "@/lib/nav-config";
import { useT } from "@/lib/i18n/use-t";
import { useUIStore } from "@/store/use-ui-store";
import { signOutAction } from "@/lib/actions/auth";

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const open = useUIStore((s) => s.mobileNavOpen);
  const setOpen = useUIStore((s) => s.setMobileNavOpen);
  const { t } = useT();

  async function handleSignOut() {
    await signOutAction();
    router.push("/login");
    router.refresh();
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetHeader>
          <SheetTitle>
            <Logo />
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-1 px-4">
          <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {t("nav.safety")}
          </p>
          {primaryNav.map((item) => (
            <Link
              key={item.labelKey}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                pathname === item.href
                  ? "bg-gradient-brand text-white"
                  : "text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
              )}
            >
              <item.icon className="size-4.5" />
              {t(item.labelKey)}
            </Link>
          ))}

          <div className="my-2 h-px bg-white/10" />

          <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {t("nav.account")}
          </p>
          {secondaryNav.map((item) => (
            <Link
              key={item.labelKey}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                pathname === item.href
                  ? "bg-gradient-brand text-white"
                  : "text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
              )}
            >
              <item.icon className="size-4.5" />
              {t(item.labelKey)}
            </Link>
          ))}
        </div>

        <div className="p-4">
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="w-full justify-start text-muted-foreground">
            <LogOut className="size-4" />
            {t("nav.signOut")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
