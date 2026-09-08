import { cn } from "@/lib/utils";
import { ShieldHalf } from "lucide-react";

export function Logo({ className, iconOnly = false }: { className?: string; iconOnly?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}>
      <span className="relative flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-brand shadow-lg shadow-[oklch(0.55_0.2_280_/_0.4)]">
        <ShieldHalf className="size-4.5 text-white" strokeWidth={2.4} />
      </span>
      {!iconOnly && (
        <span className="text-lg">
          Suraksha<span className="text-gradient">360</span>
        </span>
      )}
    </div>
  );
}
