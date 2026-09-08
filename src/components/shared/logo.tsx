import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({ className, iconOnly = false }: { className?: string; iconOnly?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}>
      <span className="relative flex size-8 shrink-0 items-center justify-center">
        <Image src="/logo.png" alt="Suraksha360" width={32} height={32} className="size-8 object-contain" priority />
      </span>
      {!iconOnly && (
        <span className="text-lg">
          Suraksha<span className="text-gradient">360</span>
        </span>
      )}
    </div>
  );
}
