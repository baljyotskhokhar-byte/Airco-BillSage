import * as React from "react";
import { cn } from "@/lib/utils";

export function Surface({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)]",
        className
      )}
      {...props}
    />
  );
}

export function ElevatedCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)]",
        className
      )}
      {...props}
    />
  );
}
