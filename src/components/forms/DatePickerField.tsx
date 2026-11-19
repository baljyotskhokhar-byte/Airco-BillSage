import * as React from "react";
import { format, parseISO, isValid } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerFieldProps {
  value?: string; // YYYY-MM-DD
  onChange: (nextDate: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

export function DatePickerField({
  value,
  onChange,
  placeholder = "Select date",
  className,
  id,
}: DatePickerFieldProps) {
  const [open, setOpen] = React.useState(false);

  const selectedDate = React.useMemo(() => {
    if (!value) return undefined;
    const d = parseISO(value);
    return isValid(d) ? d : undefined;
  }, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-1.5 text-left text-[13px] transition-colors hover:bg-[var(--bg-surface)] focus-visible:outline-none focus-visible:border-[var(--brand-navy)] cursor-pointer",
            !selectedDate && "text-[var(--text-muted)]",
            className
          )}
        >
          <span className="truncate tabular-nums">
            {selectedDate ? format(selectedDate, "dd MMM yyyy") : placeholder}
          </span>
          <CalendarIcon className="h-3.5 w-3.5 text-[var(--text-secondary)] shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-3">
        <DayPicker
          mode="single"
          selected={selectedDate}
          defaultMonth={selectedDate ?? new Date("2026-11-19")}
          onSelect={(date) => {
            if (date) {
              onChange(format(date, "yyyy-MM-dd"));
              setOpen(false);
            }
          }}
          classNames={{
            months: "flex flex-col",
            month: "space-y-3",
            month_caption: "flex items-center justify-between px-1 text-[13px] font-semibold text-[var(--brand-navy)]",
            nav: "flex items-center gap-1",
            button_previous: "h-7 w-7 inline-flex items-center justify-center rounded border border-[var(--border-default)] hover:bg-[var(--bg-surface)] cursor-pointer",
            button_next: "h-7 w-7 inline-flex items-center justify-center rounded border border-[var(--border-default)] hover:bg-[var(--bg-surface)] cursor-pointer",
            month_grid: "w-full border-collapse",
            weekdays: "flex",
            weekday: "w-8 text-center text-[11px] font-medium text-[var(--text-secondary)] py-1",
            week: "flex mt-0.5",
            day: "w-8 h-8 text-center text-[12px] p-0",
            day_button: "w-8 h-8 rounded flex items-center justify-center hover:bg-[var(--bg-subtle)] cursor-pointer tabular-nums",
            selected: "bg-[var(--brand-burgundy)] text-white rounded hover:bg-[var(--brand-burgundy-hover)]",
            today: "font-semibold underline decoration-[var(--brand-gold)]",
            outside: "text-[var(--text-muted)] opacity-50",
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
