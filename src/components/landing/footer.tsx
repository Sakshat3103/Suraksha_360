import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { Globe, MessageCircle, Link2 } from "lucide-react";
import { useT } from "@/lib/i18n/use-t";

export function Footer() {
  const { t } = useT();
  const columns = [
    {
      title: t("landing.footerProduct"),
      links: [
        { label: t("landing.footerSafeRoutes"), href: "#product" },
        { label: t("landing.navAiSafety"), href: "#features" },
        { label: t("landing.footerPublicTransport"), href: "#features" },
        { label: t("landing.footerControlRoom"), href: "#product" },
      ],
    },
    {
      title: t("landing.footerCompany"),
      links: [
        { label: t("landing.footerAbout"), href: "#" },
        { label: t("landing.footerCareers"), href: "#" },
        { label: t("landing.footerPress"), href: "#" },
      ],
    },
    {
      title: t("landing.footerResources"),
      links: [
        { label: t("landing.footerSafetyCenter"), href: "#" },
        { label: t("landing.footerForPolice"), href: "#" },
        { label: t("landing.footerApiDocs"), href: "#" },
      ],
    },
    {
      title: t("landing.footerLegal"),
      links: [
        { label: t("landing.footerPrivacy"), href: "#" },
        { label: t("landing.footerTerms"), href: "#" },
        { label: t("landing.footerDataPolicy"), href: "#" },
      ],
    },
  ];
  return (
    <footer className="relative mx-auto max-w-6xl px-4 pt-20 pb-10">
      <div className="grid gap-10 border-b border-foreground/10 pb-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div className="flex flex-col gap-4">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">
            {t("landing.footerTagline")}
          </p>
          <div className="flex gap-2">
            {[Globe, MessageCircle, Link2].map((Icon, i) => (
              <a
                key={i}
                href="#"
                className="flex size-9 items-center justify-center rounded-lg border border-foreground/10 bg-foreground/[0.03] text-muted-foreground transition-colors hover:bg-foreground/[0.08] hover:text-foreground"
              >
                <Icon className="size-4" />
              </a>
            ))}
          </div>
        </div>

        {columns.map((col) => (
          <div key={col.title} className="flex flex-col gap-3">
            <p className="text-sm font-medium">{col.title}</p>
            {col.links.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center justify-between gap-4 pt-8 text-xs text-muted-foreground sm:flex-row">
        <p>© {new Date().getFullYear()} Suraksha360. {t("landing.footerRights")}</p>
        <p>{t("landing.footerChallenge")}</p>
      </div>
    </footer>
  );
}
