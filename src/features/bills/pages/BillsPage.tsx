import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  Columns3,
  Download,
  Eye,
  FilePlus2,
  FileText,
  MoreHorizontal,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { DataTablePagination } from "@/components/common/DataTablePagination";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { ElevatedCard } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/controls";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/separator";
import { downloadBillDocument } from "@/lib/billDownload";
import { exportToCSV, formatDateDisplay, formatINR } from "@/lib/formatters";
import { billService, type CreateManualBillInput } from "@/mocks/services/billService";
import { vendorService } from "@/mocks/services/vendorService";
import type { Bill } from "@/types";
import { AddBillManuallyDialog } from "../components/AddBillManuallyDialog";
import { UploadBillDialog } from "../components/UploadBillDialog";

export function BillsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [uploadOpen, setUploadOpen] = React.useState(searchParams.get("action") === "upload");
  const [manualOpen, setManualOpen] = React.useState(searchParams.get("action") === "manual");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [vendorFilter, setVendorFilter] = React.useState("all");
  const [balanceFilter, setBalanceFilter] = React.useState(
    searchParams.get("payment") === "Overdue" ? "overdue" : "all"
  );
  const [dateFilter, setDateFilter] = React.useState("all");
  const [showFilters, setShowFilters] = React.useState(false);

  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "invoiceDate", desc: true },
  ]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    const action = searchParams.get("action");
    if (action === "upload") {
      setUploadOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("action");
      setSearchParams(next, { replace: true });
    } else if (action === "manual") {
      setManualOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("action");
      setSearchParams(next, { replace: true });
    }
    if (searchParams.get("payment") === "Overdue") {
      setBalanceFilter("overdue");
      setShowFilters(true);
    }
  }, [searchParams, setSearchParams]);

  const { data: bills = [], isLoading } = useQuery({
    queryKey: ["bills"],
    queryFn: () => billService.list(),
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors"],
    queryFn: () => vendorService.list(),
  });

  const handleCreateManualBill = async (input: CreateManualBillInput) => {
    const created = await billService.createManual(input);
    queryClient.invalidateQueries({ queryKey: ["bills"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-snapshot"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    queryClient.invalidateQueries({ queryKey: ["activity-feed"] });
    toast.success(`Manual bill ${created.invoiceNumber} saved`);
  };

  const filteredBills = React.useMemo(() => {
    return bills.filter((bill) => {
      const balance = Math.max(0, bill.totalAmount - bill.amountPaid);
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          bill.invoiceNumber.toLowerCase().includes(q) ||
          bill.vendorName.toLowerCase().includes(q) ||
          bill.vendorGstin.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (vendorFilter !== "all" && bill.vendorId !== vendorFilter) return false;
      if (balanceFilter === "has_balance" && balance <= 0.01) return false;
      if (balanceFilter === "settled" && balance > 0.01) return false;
      if (balanceFilter === "overdue" && bill.paymentStatus !== "Overdue") return false;
      if (dateFilter === "nov_2026" && !bill.invoiceDate.startsWith("2026-11")) return false;
      if (dateFilter === "oct_2026" && !bill.invoiceDate.startsWith("2026-10")) return false;
      if (dateFilter === "q3_2026" && bill.invoiceDate < "2026-07-01") return false;
      return true;
    });
  }, [bills, searchQuery, vendorFilter, balanceFilter, dateFilter]);

  const columns = React.useMemo<ColumnDef<Bill>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            aria-label="Select all bills on page"
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(val) => table.toggleAllPageRowsSelected(Boolean(val))}
          />
        ),
        cell: ({ row }) => (
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox
              aria-label={`Select ${row.original.invoiceNumber}`}
              checked={row.getIsSelected()}
              onCheckedChange={(val) => row.toggleSelected(Boolean(val))}
            />
          </div>
        ),
        enableHiding: false,
      },
      {
        accessorKey: "invoiceNumber",
        header: ({ column }) => (
          <button
            type="button"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="inline-flex items-center gap-1 hover:text-[var(--text-primary)] cursor-pointer"
          >
            Bill / Invoice #
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => (
          <span className="font-mono-data text-[12px] font-medium text-[var(--text-primary)]">
            {row.original.invoiceNumber}
          </span>
        ),
      },
      {
        accessorKey: "vendorName",
        header: ({ column }) => (
          <button
            type="button"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="inline-flex items-center gap-1 hover:text-[var(--text-primary)] cursor-pointer"
          >
            Vendor
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => (
          <div className="max-w-[210px] truncate text-[var(--text-charcoal)]">
            {row.original.vendorName}
          </div>
        ),
      },
      {
        accessorKey: "vendorGstin",
        header: ({ column }) => (
          <button
            type="button"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="inline-flex items-center gap-1 hover:text-[var(--text-primary)] cursor-pointer"
          >
            GST Number
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => (
          <span className="font-mono-data text-[12px] text-[var(--text-secondary)] whitespace-nowrap">
            {row.original.vendorGstin || "—"}
          </span>
        ),
      },
      {
        accessorKey: "invoiceDate",
        header: ({ column }) => (
          <button
            type="button"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="inline-flex items-center gap-1 hover:text-[var(--text-primary)] cursor-pointer"
          >
            Invoice Date
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-[12px] text-[var(--text-secondary)] tabular-nums whitespace-nowrap">
            {formatDateDisplay(row.original.invoiceDate)}
          </span>
        ),
      },
      {
        accessorKey: "dueDate",
        header: "Due Date",
        cell: ({ row }) => (
          <span className="text-[12px] text-[var(--text-secondary)] tabular-nums whitespace-nowrap">
            {formatDateDisplay(row.original.dueDate)}
          </span>
        ),
      },
      {
        accessorKey: "totalAmount",
        header: ({ column }) => (
          <button
            type="button"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="inline-flex items-center justify-end gap-1 w-full hover:text-[var(--text-primary)] cursor-pointer"
          >
            Total Amount
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => (
          <div className="text-right font-mono-data text-[12px] font-medium text-[var(--text-primary)] tabular-nums whitespace-nowrap">
            {formatINR(row.original.totalAmount)}
          </div>
        ),
      },
      {
        accessorKey: "amountPaid",
        header: ({ column }) => (
          <button
            type="button"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="inline-flex items-center justify-end gap-1 w-full hover:text-[var(--text-primary)] cursor-pointer"
          >
            Amount Paid
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => (
          <div className="text-right font-mono-data text-[12px] text-[var(--brand-teal)] tabular-nums whitespace-nowrap">
            {formatINR(row.original.amountPaid)}
          </div>
        ),
      },
      {
        id: "balance",
        accessorFn: (row) => Math.max(0, row.totalAmount - row.amountPaid),
        header: ({ column }) => (
          <button
            type="button"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="inline-flex items-center justify-end gap-1 w-full hover:text-[var(--text-primary)] cursor-pointer"
          >
            Balance
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => {
          const balance = Math.max(0, row.original.totalAmount - row.original.amountPaid);
          return (
            <div
              className={`text-right font-mono-data text-[12px] font-medium tabular-nums whitespace-nowrap ${
                balance > 0 ? "text-[var(--brand-burgundy)]" : "text-[var(--text-muted)]"
              }`}
            >
              {formatINR(balance)}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        enableHiding: false,
        cell: ({ row }) => {
          const bill = row.original;
          const balance = Math.max(0, bill.totalAmount - bill.amountPaid);
          return (
            <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={`Actions for ${bill.invoiceNumber}`}
                    className="rounded p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => navigate(`/bills/${bill.id}`)}>
                    <Eye className="h-3.5 w-3.5 text-[var(--brand-navy)]" />
                    View details
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => navigate(`/bills/${bill.id}/review`)}>
                    <FileText className="h-3.5 w-3.5 text-[var(--brand-plum)]" />
                    Review &amp; edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => {
                      downloadBillDocument(bill);
                      toast.success(`Downloaded ${bill.invoiceNumber}`);
                    }}
                  >
                    <Download className="h-3.5 w-3.5 text-[var(--brand-teal)]" />
                    Download invoice
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => navigate(`/bank-account?billId=${bill.id}&action=record`)}
                    disabled={balance <= 0.01}
                  >
                    Record bank payment
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [navigate]
  );

  const table = useReactTable({
    data: filteredBills,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
    },
    initialState: {
      pagination: { pageSize: 8 },
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const selectedBills = table.getSelectedRowModel().rows.map((r) => r.original);

  const handleExportBills = (list: Bill[]) => {
    exportToCSV(
      "airco-billsage-bills.csv",
      ["Invoice Number", "Vendor", "GST Number", "Invoice Date", "Due Date", "Total (INR)", "Amount Paid (INR)", "Balance (INR)"],
      list.map((b) => [
        b.invoiceNumber,
        b.vendorName,
        b.vendorGstin,
        b.invoiceDate,
        b.dueDate,
        b.totalAmount,
        b.amountPaid,
        Math.max(0, b.totalAmount - b.amountPaid),
      ])
    );
    toast.success(`Exported ${list.length} bills to CSV`);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Bills"
        subtitle="Manage, review and track all your business invoices."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters((s) => !s)}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportBills(filteredBills)}
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={() => setManualOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              Add Bill Manually
            </Button>
            <Button size="sm" onClick={() => setUploadOpen(true)}>
              <FilePlus2 className="h-3.5 w-3.5" />
              Upload Bill
            </Button>
          </>
        }
      />

      <ElevatedCard className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[var(--border-subtle)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search invoice #, vendor, or GSTIN..."
              className="pl-8"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {selectedBills.length > 0 && (
              <div className="flex items-center gap-2 rounded-md border border-[var(--brand-plum)]/30 bg-[var(--brand-plum-bg)] px-2.5 py-1 text-[12px]">
                <span className="font-medium text-[var(--brand-plum)] tabular-nums">
                  {selectedBills.length} selected
                </span>
                <button
                  type="button"
                  onClick={() => handleExportBills(selectedBills)}
                  className="font-medium text-[var(--text-primary)] hover:text-[var(--brand-burgundy)] hover:underline cursor-pointer"
                >
                  Export
                </button>
              </div>
            )}

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Columns3 className="h-3.5 w-3.5" />
                  Columns
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-48 space-y-2">
                <p className="text-[11px] font-semibold text-[var(--text-secondary)]">
                  Visible columns
                </p>
                {table
                  .getAllColumns()
                  .filter((col) => col.getCanHide())
                  .map((col) => (
                    <label
                      key={col.id}
                      className="flex items-center gap-2 text-[12px] text-[var(--text-primary)] cursor-pointer"
                    >
                      <Checkbox
                        checked={col.getIsVisible()}
                        onCheckedChange={(v) => col.toggleVisibility(Boolean(v))}
                      />
                      <span className="capitalize">
                        {col.id === "vendorGstin" ? "GST Number" : col.id.replace(/([A-Z])/g, " $1")}
                      </span>
                    </label>
                  ))}
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3">
            <Select value={vendorFilter} onValueChange={setVendorFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All vendors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All vendors</SelectItem>
                {vendors.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={balanceFilter} onValueChange={setBalanceFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Balance filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All balances</SelectItem>
                <SelectItem value="has_balance">Outstanding balance (&gt; ₹0)</SelectItem>
                <SelectItem value="settled">Fully paid (₹0 balance)</SelectItem>
                <SelectItem value="overdue">Overdue balance</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Invoice period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All dates</SelectItem>
                <SelectItem value="nov_2026">November 2026</SelectItem>
                <SelectItem value="oct_2026">October 2026</SelectItem>
                <SelectItem value="q3_2026">Since July 2026</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : filteredBills.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<FileText className="h-5 w-5" />}
              title="No bills match your filters"
              description="Clear active filters, upload an invoice, or add a bill manually."
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setVendorFilter("all");
                    setBalanceFilter("all");
                    setDateFilter("all");
                  }}
                >
                  Reset filters
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr
                      key={headerGroup.id}
                      className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[11px] font-medium text-[var(--text-secondary)]"
                    >
                      {headerGroup.headers.map((header) => (
                        <th key={header.id} className="py-2.5 px-3.5 first:pl-4 last:pr-4 whitespace-nowrap">
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
                    <tr
                      key={row.id}
                      onClick={() => navigate(`/bills/${row.original.id}`)}
                      className="hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="py-3 px-3.5 first:pl-4 last:pr-4">
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
              totalItems={filteredBills.length}
              pageSize={table.getState().pagination.pageSize}
              onPageChange={(idx) => table.setPageIndex(idx)}
            />
          </>
        )}
      </ElevatedCard>

      <UploadBillDialog open={uploadOpen} onOpenChange={setUploadOpen} />
      <AddBillManuallyDialog
        open={manualOpen}
        onOpenChange={setManualOpen}
        vendors={vendors}
        onCreateBill={handleCreateManualBill}
      />
    </div>
  );
}
