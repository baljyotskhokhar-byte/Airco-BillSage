import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  compact?: boolean;
  onDark?: boolean;
}

export function BrandLogo({ className, compact = false, onDark = false }: BrandLogoProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center shrink-0 select-none",
        onDark
          ? "rounded-lg bg-[#FAF8F4] px-3.5 py-2 shadow-xs border border-white/15"
          : "dark:rounded-md dark:bg-[#FAF8F4] dark:px-2.5 dark:py-1",
        className
      )}
    >
      <img
        src="/assets/aistudio/image_b861d72b.png"
        alt="Airco BillSage"
        className={cn(
          "w-auto object-contain",
          compact
            ? "h-9"
            : onDark
              ? "h-12 sm:h-14"
              : "h-11 sm:h-12",
          !onDark && "mix-blend-multiply dark:mix-blend-normal"
        )}
      />
    </div>
  );
}
