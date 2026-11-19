import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-[13px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-burgundy)] focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 cursor-pointer shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--brand-burgundy)] text-white hover:bg-[var(--brand-burgundy-hover)] active:bg-[var(--brand-burgundy-active)] shadow-xs",
        plum:
          "bg-[var(--brand-plum)] text-white hover:bg-[var(--brand-plum-hover)] shadow-xs",
        navy:
          "bg-[var(--brand-navy)] text-white hover:bg-[var(--brand-navy-hover)] shadow-xs",
        charcoal:
          "bg-[var(--text-primary)] text-[var(--bg-elevated)] hover:opacity-90 shadow-xs",
        destructive:
          "bg-[var(--status-danger)] text-white hover:opacity-90 shadow-xs",
        outline:
          "border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-surface)] hover:border-[var(--brand-plum)]/40",
        secondary:
          "bg-[var(--brand-plum-bg)] text-[var(--brand-plum)] hover:bg-[var(--brand-plum)]/15",
        ghost:
          "text-[var(--text-charcoal)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]",
        link: "text-[var(--brand-burgundy)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-5 text-sm",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { buttonVariants };
