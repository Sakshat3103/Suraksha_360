"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Menu } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { LanguageSwitcher } from "@/components/dashboard/language-switcher";
import { useT } from "@/lib/i18n/use-t";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const { t } = useT();
  const links = [
    { href: "#product", label: t("landing.navProduct") },
    { href: "#features", label: t("landing.navAiSafety") },
    { href: "#stats", label: t("landing.navImpact") },
    { href: "#testimonials", label: t("landing.navStories") },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4"
    >
      <div
        className={
          "flex w-full max-w-6xl items-center justify-between rounded-2xl px-4 py-2.5 transition-all duration-300 " +
          (scrolled ? "glass-strong shadow-xl shadow-black/30" : "bg-transparent")
        }
      >
        <Link href="/">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <LanguageSwitcher />
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">{t("landing.signIn")}</Link>
          </Button>
          <Button variant="glow" size="sm" asChild>
            <Link href="/signup">{t("landing.getStarted")}</Link>
          </Button>
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>
                <Logo />
              </SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-1 px-4">
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
                >
                  {link.label}
                </a>
              ))}
            </div>
            <div className="mt-auto flex flex-col gap-2 p-4">
              <div className="flex justify-center pb-1"><LanguageSwitcher /></div>
              <Button variant="outline" asChild>
                <Link href="/login">{t("landing.signIn")}</Link>
              </Button>
              <Button variant="glow" asChild>
                <Link href="/signup">{t("landing.getStarted")}</Link>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </motion.header>
  );
}
