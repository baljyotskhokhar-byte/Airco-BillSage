import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-[4px] border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap shrink-0",
  {
    variants: {
      variant: {
        neutral: "border-[var(--border-default)] bg-[var(--bg-subtle)] text-[var(--text-charcoal)]",
        burgundy: "border-[var(--brand-burgundy)]/25 bg-[var(--brand-burgundy-bg)] text-[var(--brand-burgundy)]",
        plum: "border-[var(--brand-plum)]/25 bg-[var(--brand-plum-bg)] text-[var(--brand-plum)]",
        navy: "border-[var(--brand-navy)]/25 bg-[var(--brand-navy-bg)] text-[var(--brand-navy)]",
        teal: "border-[var(--brand-teal)]/25 bg-[var(--brand-teal-bg)] text-[var(--brand-teal)]",
        gold: "border-[var(--brand-gold)]/35 bg-[var(--brand-gold-bg)] text-[var(--brand-gold-text)]",
        slate: "border-[var(--brand-slate)]/25 bg-[var(--brand-slate-bg)] text-[var(--brand-slate)]",
        success: "border-[var(--brand-teal)]/25 bg-[var(--brand-teal-bg)] text-[var(--brand-teal)]",
        warning: "border-[var(--brand-gold)]/35 bg-[var(--brand-gold-bg)] text-[var(--brand-gold-text)]",
        danger: "border-[var(--status-danger)]/25 bg-[var(--status-danger-bg)] text-[var(--status-danger)]",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
