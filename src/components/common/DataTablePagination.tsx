import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DataTablePaginationProps {
  pageIndex: number;
  pageCount: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (nextPage: number) => void;
}

export function DataTablePagination({
  pageIndex,
  pageCount,
  totalItems,
  pageSize,
  onPageChange,
}: DataTablePaginationProps) {
  const start = totalItems === 0 ? 0 : pageIndex * pageSize + 1;
  const end = Math.min(totalItems, (pageIndex + 1) * pageSize);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-[var(--border-subtle)] px-4 py-3 text-[12px] text-[var(--text-secondary)]">
      <div className="tabular-nums">
        Showing <span className="font-medium text-[var(--text-primary)]">{start}</span> to{" "}
        <span className="font-medium text-[var(--text-primary)]">{end}</span> of{" "}
        <span className="font-medium text-[var(--text-primary)]">{totalItems}</span> entries
      </div>
      <div className="flex items-center gap-2">
        <span className="tabular-nums">
          Page {pageCount === 0 ? 0 : pageIndex + 1} of {pageCount}
        </span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pageIndex - 1)}
            disabled={pageIndex <= 0}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pageIndex + 1)}
            disabled={pageIndex >= pageCount - 1}
            aria-label="Next page"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
