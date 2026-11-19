import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;

export function TabsList({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] p-1",
        className
      )}
      {...props}
    />
  );
}

export function TabsTrigger({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded px-3.5 py-1.5 text-[12px] font-medium text-[var(--text-secondary)] transition-colors cursor-pointer hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]/50 data-[state=active]:bg-[var(--brand-plum)] data-[state=active]:text-white data-[state=active]:shadow-xs",
        className
      )}
      {...props}
    />
  );
}

export const TabsContent = TabsPrimitive.Content;
