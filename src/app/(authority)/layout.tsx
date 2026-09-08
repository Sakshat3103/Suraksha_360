import type { Metadata } from "next";

export const metadata: Metadata = { title: "Authority Portal — Suraksha360" };

export default function AuthorityLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background text-foreground">{children}</div>;
}
