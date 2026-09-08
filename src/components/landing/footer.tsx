import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { Globe, MessageCircle, Link2 } from "lucide-react";

const columns = [
  {
    title: "Product",
    links: [
      { label: "Safe Routes", href: "#product" },
      { label: "AI Safety", href: "#features" },
      { label: "Public Transport", href: "#features" },
      { label: "Control Room", href: "#product" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Press", href: "#" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Safety Center", href: "#" },
      { label: "For Police & Cities", href: "#" },
      { label: "API Docs", href: "#" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "#" },
      { label: "Terms", href: "#" },
      { label: "Data Policy", href: "#" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative mx-auto max-w-6xl px-4 pt-20 pb-10">
      <div className="grid gap-10 border-b border-foreground/10 pb-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div className="flex flex-col gap-4">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">
            The AI-powered urban safety platform for real-time women safety, safe routing, and
            public transport protection.
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
        <p>© {new Date().getFullYear()} Suraksha360. All rights reserved.</p>
        <p>Built for the International Innovation Challenge — Round 2.</p>
      </div>
    </footer>
  );
}
