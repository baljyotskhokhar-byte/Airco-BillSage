import * as React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowDownLeft,
  ArrowUpDown,
  Download,
  Landmark,
  Plus,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { DataTablePagination } from "@/components/common/DataTablePagination";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { ElevatedCard } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/separator";
import { formatDateDisplay, formatINR } from "@/lib/formatters";
import { billService } from "@/mocks/services/billService";
import { paymentService } from "@/mocks/services/paymentService";
import type { BankTransaction, PaymentMethod } from "@/types";
import { RecordDepositDialog } from "../components/RecordDepositDialog";
import { RecordPaymentDialog } from "../components/RecordPaymentDialog";

export function BankAccountPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [recordOpen, setRecordOpen] = React.useState(searchParams.get("action") === "record");
  const [depositOpen, setDepositOpen] = React.useState(false);
  const [initialBillId, setInitialBillId] = React.useState<string | undefined>(
    searchParams.get("billId") ?? undefined
  );

  const [searchQuery, setSearchQuery] = React.useState("");
  const [entryTypeFilter, setEntryTypeFilter] = React.useState<"all" | "debit" | "credit">("all");
  const [monthFilter, setMonthFilter] = React.useState("all");
  const [sorting, setSorting] = React.useState<SortingState>([]);

  React.useEffect(() => {
    if (searchParams.get("action") === "record") {
      setInitialBillId(searchParams.get("billId") ?? undefined);
      setRecordOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("action");
      next.delete("billId");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data: statement, isLoading } = useQuery({
    queryKey: ["bank-statement"],
    queryFn: () => paymentService.getBankStatement(),
  });

  const { data: bills = [] } = useQuery({
    queryKey: ["bills"],
    queryFn: () => billService.list(),
  });

  const payableBills = React.useMemo(
    () =>
      bills.filter(
        (b) => b.reviewStatus !== "Failed" && b.totalAmount - b.amountPaid > 0.01
      ),
    [bills]
  );

  const transactions = statement?.transactions ?? [];

  const filteredTransactions = React.useMemo(() => {
    return transactions.filter((tx) => {
      if (entryTypeFilter === "debit" && tx.debit <= 0) return false;
      if (entryTypeFilter === "credit" && tx.credit <= 0) return false;
      if (monthFilter === "nov_2026" && !tx.postDate.startsWith("2026-11")) return false;
      if (monthFilter === "oct_2026" && !tx.postDate.startsWith("2026-10")) return false;
      if (monthFilter === "sep_2026" && !tx.postDate.startsWith("2026-09")) return false;
      if (monthFilter === "aug_2026" && !tx.postDate.startsWith("2026-08")) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          tx.description.toLowerCase().includes(q) ||
          tx.chequeNo.toLowerCase().includes(q) ||
          (tx.invoiceNumber?.toLowerCase().includes(q) ?? false) ||
          (tx.vendorName?.toLowerCase().includes(q) ?? false) ||
          tx.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [transactions, entryTypeFilter, monthFilter, searchQuery]);

  const handleRecordPayment = async (values: {
    billId: string;
    paymentDate: string;
    amount: number;
    method: PaymentMethod;
    referenceNumber: string;
    notes?: string;
  }) => {
    const res = await paymentService.record(values);
    queryClient.invalidateQueries({ queryKey: ["bank-statement"] });
    queryClient.invalidateQueries({ queryKey: ["payments"] });
    queryClient.invalidateQueries({ queryKey: ["bills"] });
    queryClient.invalidateQueries({ queryKey: ["bill", res.bill.id] });
    queryClient.invalidateQueries({ queryKey: ["bill-payments", res.bill.id] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-snapshot"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    queryClient.invalidateQueries({ queryKey: ["activity-feed"] });
    toast.success(
      `Bank debit ${formatINR(res.payment.amount)} posted for ${res.bill.invoiceNumber}`
    );
  };

  const handleRecordDeposit = async (values: {
    valueDate: string;
    description: string;
    chequeNo: string;
    amount: number;
  }) => {
    await paymentService.recordDeposit(values);
    queryClient.invalidateQueries({ queryKey: ["bank-statement"] });
    toast.success(`Bank credit of ${formatINR(values.amount)} recorded`);
  };

  const handleExportCsv = () => {
    if (filteredTransactions.length === 0) {
      toast.error("No statement rows to export.");
      return;
    }
    const headers = [
      "Value Date",
      "Post Date",
      "Description",
      "Cheque / Ref No.",
      "Debit (INR)",
      "Credit (INR)",
      "Balance (INR)",
    ];
    const escapeCell = (val: string) => `"${val.replace(/"/g, '""')}"`;
    const rows = filteredTransactions.map((tx) =>
      [
        tx.valueDate,
        tx.postDate,
        tx.description,
        tx.chequeNo,
        tx.debit > 0 ? tx.debit.toFixed(2) : "",
        tx.credit > 0 ? tx.credit.toFixed(2) : "",
        tx.balance.toFixed(2),
      ]
        .map(escapeCell)
        .join(",")
    );
    const csv = [headers.map(escapeCell).join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hdfc-statement-${statement?.accountNumber.slice(-4) ?? "0429"}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredTransactions.length} bank statement rows`);
  };

  const columns = React.useMemo<ColumnDef<BankTransaction>[]>(
    () => [
      {
        accessorKey: "valueDate",
        header: ({ column }) => (
          <button
            type="button"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="inline-flex items-center gap-1 hover:text-[var(--text-primary)] cursor-pointer"
          >
            Value Date
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => (
          <span className="font-mono-data text-[12px] text-[var(--text-secondary)] tabular-nums whitespace-nowrap">
            {formatDateDisplay(row.original.valueDate)}
          </span>
        ),
      },
      {
        accessorKey: "postDate",
        header: ({ column }) => (
          <button
            type="button"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="inline-flex items-center gap-1 hover:text-[var(--text-primary)] cursor-pointer"
          >
            Post Date
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => (
          <span className="font-mono-data text-[12px] text-[var(--text-secondary)] tabular-nums whitespace-nowrap">
            {formatDateDisplay(row.original.postDate)}
          </span>
        ),
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => {
          const tx = row.original;
          return (
            <div className="min-w-[260px] max-w-[440px]">
              {tx.billId ? (
                <Link
                  to={`/bills/${tx.billId}`}
                  className="font-medium text-[var(--brand-navy)] hover:text-[var(--brand-burgundy)] hover:underline line-clamp-2"
                >
                  {tx.description}
                </Link>
              ) : (
                <p className="font-medium text-[var(--text-primary)] line-clamp-2">
                  {tx.description}
                </p>
              )}
              <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                {tx.category}
                {tx.method ? ` · ${tx.method}` : ""}
              </p>
            </div>
          );
        },
      },
      {
        accessorKey: "chequeNo",
        header: "Cheque / Ref No.",
        cell: ({ row }) => (
          <span className="font-mono-data text-[12px] text-[var(--text-secondary)] whitespace-nowrap">
            {row.original.chequeNo}
          </span>
        ),
      },
      {
        accessorKey: "debit",
        header: ({ column }) => (
          <button
            type="button"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="inline-flex items-center justify-end gap-1 w-full hover:text-[var(--text-primary)] cursor-pointer"
          >
            Debit
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) =>
          row.original.debit > 0 ? (
            <div className="text-right font-mono-data text-[12px] font-medium text-[var(--brand-burgundy)] tabular-nums whitespace-nowrap">
              {formatINR(row.original.debit)}
            </div>
          ) : (
            <div className="text-right font-mono-data text-[12px] text-[var(--text-muted)] tabular-nums">
              —
            </div>
          ),
      },
      {
        accessorKey: "credit",
        header: ({ column }) => (
          <button
            type="button"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="inline-flex items-center justify-end gap-1 w-full hover:text-[var(--text-primary)] cursor-pointer"
          >
            Credit
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) =>
          row.original.credit > 0 ? (
            <div className="text-right font-mono-data text-[12px] font-medium text-[var(--brand-teal)] tabular-nums whitespace-nowrap">
              {formatINR(row.original.credit)}
            </div>
          ) : (
            <div className="text-right font-mono-data text-[12px] text-[var(--text-muted)] tabular-nums">
              —
            </div>
          ),
      },
      {
        accessorKey: "balance",
        header: () => <div className="text-right">Balance</div>,
        cell: ({ row }) => (
          <div className="text-right font-mono-data text-[12px] font-semibold text-[var(--text-primary)] tabular-nums whitespace-nowrap">
            {formatINR(row.original.balance)}
          </div>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: filteredTransactions,
    columns,
    state: { sorting },
    initialState: { pagination: { pageSize: 10 } },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Bank Account"
        subtitle={
          statement
            ? `${statement.accountName} · A/c ${statement.accountNumber} · IFSC ${statement.ifsc}`
            : "Corporate current account statement and vendor payment debits."
        }
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleExportCsv}>
              <Download className="h-3.5 w-3.5" />
              Export Statement
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDepositOpen(true)}>
              <ArrowDownLeft className="h-3.5 w-3.5" />
              Record Deposit
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setInitialBillId(undefined);
                setRecordOpen(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Record Payment
            </Button>
          </>
        }
      />

      {/* Bank Statement Ledger Table */}
      <ElevatedCard className="overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 border-b border-[var(--border-subtle)] p-4">
          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search description, cheque / ref #, vendor, invoice..."
              className="pl-8"
            />
          </div>

          <Select
            value={entryTypeFilter}
            onValueChange={(v) => setEntryTypeFilter(v as "all" | "debit" | "credit")}
          >
            <SelectTrigger>
              <SelectValue placeholder="All transactions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All entries (Debit &amp; Credit)</SelectItem>
              <SelectItem value="debit">Debits only (Outward)</SelectItem>
              <SelectItem value="credit">Credits only (Inward)</SelectItem>
            </SelectContent>
          </Select>

          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All dates" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statement dates</SelectItem>
              <SelectItem value="nov_2026">November 2026</SelectItem>
              <SelectItem value="oct_2026">October 2026</SelectItem>
              <SelectItem value="sep_2026">September 2026</SelectItem>
              <SelectItem value="aug_2026">August 2026</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<Landmark className="h-5 w-5" />}
              title="No statement entries found"
              description="Adjust your search or date filters, or record a new transaction."
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  {table.getHeaderGroups().map((hg) => (
                    <tr
                      key={hg.id}
                      className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[11px] font-medium text-[var(--text-secondary)]"
                    >
                      {hg.headers.map((header) => (
                        <th key={header.id} className="py-2.5 px-4 whitespace-nowrap">
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] text-[13px]">
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="hover:bg-[var(--bg-surface)] transition-colors">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="py-3 px-4 align-top">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <DataTablePagination
              pageIndex={table.getState().pagination.pageIndex}
              pageCount={table.getPageCount()}
              totalItems={filteredTransactions.length}
              pageSize={table.getState().pagination.pageSize}
              onPageChange={(idx) => table.setPageIndex(idx)}
            />
          </>
        )}
      </ElevatedCard>

      <RecordPaymentDialog
        open={recordOpen}
        onOpenChange={setRecordOpen}
        payableBills={payableBills}
        initialBillId={initialBillId}
        onRecord={handleRecordPayment}
      />

      <RecordDepositDialog
        open={depositOpen}
        onOpenChange={setDepositOpen}
        onSave={handleRecordDeposit}
      />
    </div>
  );
}
