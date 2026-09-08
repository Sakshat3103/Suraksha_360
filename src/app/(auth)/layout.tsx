import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { ShieldCheck, MapPinned, Radio } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen">
      <div className="pointer-events-none absolute -top-32 left-1/3 h-[32rem] w-[32rem] rounded-full bg-brand-violet/20 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-brand-blue/15 blur-[100px]" />

      {/* Brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden border-r border-white/10 p-12 lg:flex">
        <Link href="/">
          <Logo />
        </Link>

        <div className="max-w-md">
          <h1 className="text-balance text-4xl font-semibold tracking-tight">
            Every journey, watched with intelligence — never intrusion.
          </h1>
          <p className="mt-4 text-muted-foreground">
            Join a network of travellers, guardians, and control rooms working from one verified
            safety loop.
          </p>

          <div className="mt-10 flex flex-col gap-4">
            {[
              { icon: MapPinned, text: "AI-scored safe routes for every journey" },
              { icon: ShieldCheck, text: "Silent SOS with instant escalation" },
              { icon: Radio, text: "24/7 control room monitoring" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-gradient-brand text-white">
                  <item.icon className="size-4" />
                </span>
                <span className="text-sm text-foreground/90">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Suraksha360. All rights reserved.
        </p>
      </div>

      {/* Form panel */}
      <div className="relative flex w-full flex-col items-center justify-center px-6 py-16 lg:w-1/2">
        <div className="mb-8 lg:hidden">
          <Link href="/">
            <Logo />
          </Link>
        </div>
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
