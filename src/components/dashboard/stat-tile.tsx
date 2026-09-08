import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatTile({
  icon: Icon,
  label,
  value,
  trend,
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  trend?: string;
  tone?: "default" | "success" | "warning";
}) {
  return (
    <div className="glass flex flex-col gap-3 rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "flex size-10 items-center justify-center rounded-xl",
            tone === "success" && "bg-brand-emerald/15 text-brand-emerald",
            tone === "warning" && "bg-amber-400/15 text-amber-300",
            tone === "default" && "bg-gradient-brand text-white"
          )}
        >
          <Icon className="size-4.5" />
        </span>
        {trend && <span className="text-xs font-medium text-brand-emerald">{trend}</span>}
      </div>
      <div>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
