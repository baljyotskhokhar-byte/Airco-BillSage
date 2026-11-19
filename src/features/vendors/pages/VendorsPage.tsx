import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Archive,
  ArrowUpDown,
  Building2,
  Edit3,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { DataTablePagination } from "@/components/common/DataTablePagination";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { VendorStatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { ElevatedCard } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/separator";
import { JEWEL_CHART_PALETTE, VENDOR_AVATAR_PALETTE } from "@/lib/constants";
import { formatINR } from "@/lib/formatters";
import { billService } from "@/mocks/services/billService";
import { vendorService } from "@/mocks/services/vendorService";
import type { Vendor } from "@/types";
import { VendorFormDialog, type VendorFormValues } from "../components/VendorFormDialog";

function getVendorInitials(name: string): string {
  const words = name.replace(/[^a-zA-Z0-9\s]/g, "").trim().split(/\s+/);
  if (words.length === 0 || !words[0]) return "V";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

export function VendorsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "name", desc: false }]);
  const [dialogOpen, setDialogOpen] = React.useState(searchParams.get("action") === "new");
  const [editingVendor, setEditingVendor] = React.useState<Vendor | null>(null);

  React.useEffect(() => {
    if (searchParams.get("action") === "new") {
      setEditingVendor(null);
      setDialogOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("action");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ["vendors"],
    queryFn: () => vendorService.list(),
  });

  const { data: bills = [] } = useQuery({
    queryKey: ["bills"],
    queryFn: () => billService.list(),
  });

  const vendorDashboard = React.useMemo(() => {
    const activeCount = vendors.filter((v) => v.status === "Active").length;
    const archivedCount = vendors.filter((v) => v.status === "Archived").length;

    const spendByVendor = new Map<
      string,
      { vendorId: string; name: string; total: number; outstanding: number; billsCount: number }
    >();
    vendors.forEach((v) => {
      spendByVendor.set(v.id, {
        vendorId: v.id,
        name: v.name,
        total: 0,
        outstanding: 0,
        billsCount: 0,
      });
    });

    bills.forEach((b) => {
      const curr = spendByVendor.get(b.vendorId) ?? {
        vendorId: b.vendorId,
        name: b.vendorName,
        total: 0,
        outstanding: 0,
        billsCount: 0,
      };
      curr.total += b.totalAmount;
      curr.outstanding += Math.max(0, b.totalAmount - b.amountPaid);
      curr.billsCount += 1;
      spendByVendor.set(b.vendorId, curr);
    });

    const ranked = Array.from(spendByVendor.values())
      .filter((r) => r.total > 0)
      .sort((a, b) => b.total - a.total);

    const totalSpend = ranked.reduce((s, r) => s + r.total, 0);
    const totalOutstanding = ranked.reduce((s, r) => s + r.outstanding, 0);
    const topVendor = ranked[0];

    const categoryMap = new Map<string, number>();
    bills.forEach((b) => {
      categoryMap.set(b.category, (categoryMap.get(b.category) ?? 0) + b.totalAmount);
    });
    const categoryMix = Array.from(categoryMap.entries())
      .map(([category, amount]) => ({ category, amount: Number(amount.toFixed(2)) }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return {
      activeCount,
      archivedCount,
      totalSpend,
      totalOutstanding,
      topVendor,
      topChart: ranked.slice(0, 5).map((r) => ({
        ...r,
        shortName: r.name.length > 20 ? `${r.name.slice(0, 18)}…` : r.name,
      })),
      categoryMix,
    };
  }, [vendors, bills]);

  const archiveMutation = useMutation({
    mutationFn: (id: string) => vendorService.toggleArchive(id),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success(
        updated.status === "Archived"
          ? `${updated.name} archived`
          : `${updated.name} restored to active`
      );
    },
  });

  const handleSaveVendor = async (values: VendorFormValues) => {
    if (editingVendor) {
      await vendorService.update(editingVendor.id, values);
      toast.success("Vendor details updated");
    } else {
      await vendorService.create(values);
      toast.success("Vendor added to directory");
    }
    queryClient.invalidateQueries({ queryKey: ["vendors"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    queryClient.invalidateQueries({ queryKey: ["activity-feed"] });
  };

  const filteredVendors = React.useMemo(() => {
    return vendors.filter((v) => {
      if (statusFilter !== "all" && v.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          v.name.toLowerCase().includes(q) ||
          v.gstin.toLowerCase().includes(q) ||
          v.address.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [vendors, statusFilter, searchQuery]);

  // Exactly four primary columns as specified
  const columns = React.useMemo<ColumnDef<Vendor>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <button
            type="button"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="inline-flex items-center gap-1 hover:text-[var(--text-primary)] cursor-pointer"
          >
            Vendor Name
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => {
          const palette = VENDOR_AVATAR_PALETTE[row.index % VENDOR_AVATAR_PALETTE.length];
          return (
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-[11px] font-semibold tracking-tight ${palette.bg} ${palette.text} ${palette.border}`}
              >
                {getVendorInitials(row.original.name)}
              </span>
              <span className="truncate font-medium text-[var(--text-primary)]">
                {row.original.name}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "gstin",
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
          <span className="font-mono-data text-[12px] text-[var(--text-charcoal)]">
            {row.original.gstin}
          </span>
        ),
      },
      {
        accessorKey: "address",
        header: "Address",
        cell: ({ row }) => (
          <div className="max-w-[360px] truncate text-[var(--text-secondary)]">
            {row.original.address}, {row.original.pinCode}
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <button
            type="button"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="inline-flex items-center gap-1 hover:text-[var(--text-primary)] cursor-pointer"
          >
            Status
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => {
          const vendor = row.original;
          return (
            <div className="flex items-center justify-between gap-2">
              <VendorStatusBadge status={vendor.status} />
              <div onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label={`Actions for ${vendor.name}`}
                      className="rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] cursor-pointer"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onSelect={() => {
                        setEditingVendor(vendor);
                        setDialogOpen(true);
                      }}
                    >
                      <Edit3 className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                      Edit vendor
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => archiveMutation.mutate(vendor.id)}>
                      {vendor.status === "Active" ? (
                        <>
                          <Archive className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                          Archive vendor
                        </>
                      ) : (
                        <>
                          <RotateCcw className="h-3.5 w-3.5 text-[var(--brand-teal)]" />
                          Restore active
                        </>
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        },
      },
    ],
    [archiveMutation]
  );

  const table = useReactTable({
    data: filteredVendors,
    columns,
    state: { sorting },
    initialState: { pagination: { pageSize: 8 } },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendors"
        subtitle="Manage supplier information and understand your purchasing relationships."
        actions={
          <Button
            size="sm"
            onClick={() => {
              setEditingVendor(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Vendor
          </Button>
        }
      />

      {/* Vendor Dashboard Overview */}
      <div className="space-y-4">
        <ElevatedCard className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-[var(--border-subtle)] overflow-hidden">
          <div className="px-5 py-4 bg-[var(--brand-navy-tint)]">
            <p className="text-[11px] font-medium text-[var(--text-secondary)]">Active vendors</p>
            <p className="mt-1 font-mono-data text-[20px] font-semibold text-[var(--brand-navy)] tabular-nums">
              {vendorDashboard.activeCount}
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--text-muted)] tabular-nums">
              {vendorDashboard.archivedCount} archived
            </p>
          </div>
          <div className="px-5 py-4 bg-[var(--brand-plum-tint)]">
            <p className="text-[11px] font-medium text-[var(--text-secondary)]">Total vendor purchases</p>
            <p className="mt-1 font-mono-data text-[20px] font-semibold text-[var(--brand-plum)] tabular-nums">
              {formatINR(vendorDashboard.totalSpend, { decimals: 0 })}
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">Across all recorded bills</p>
          </div>
          <div className="px-5 py-4 bg-[var(--brand-burgundy-tint)]">
            <p className="text-[11px] font-medium text-[var(--text-secondary)]">Vendor payable balance</p>
            <p className="mt-1 font-mono-data text-[20px] font-semibold text-[var(--brand-burgundy)] tabular-nums">
              {formatINR(vendorDashboard.totalOutstanding, { decimals: 0 })}
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">Unsettled supplier dues</p>
          </div>
          <div className="px-5 py-4 bg-[var(--brand-gold-tint)]">
            <p className="text-[11px] font-medium text-[var(--text-secondary)]">Top supplier</p>
            <p className="mt-1 text-[15px] font-semibold text-[var(--brand-gold-text)] truncate">
              {vendorDashboard.topVendor?.name ?? "—"}
            </p>
            <p className="mt-0.5 font-mono-data text-[11px] text-[var(--text-muted)] tabular-nums">
              {vendorDashboard.topVendor
                ? `${formatINR(vendorDashboard.topVendor.total, { compact: true })} (${vendorDashboard.topVendor.billsCount} bills)`
                : "No bills"}
            </p>
          </div>
        </ElevatedCard>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <ElevatedCard className="lg:col-span-6 p-5">
            <h2 className="text-[15px] font-semibold text-[var(--brand-navy)]">
              Vendor spend distribution
            </h2>
            <p className="text-[12px] text-[var(--text-secondary)]">
              Top 5 suppliers by total purchase volume
            </p>
            <div className="mt-3 h-[210px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={vendorDashboard.topChart}
                    dataKey="total"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={80}
                    paddingAngle={2}
                    onClick={(_, idx) => {
                      const item = vendorDashboard.topChart[idx];
                      if (item?.vendorId) navigate(`/vendors/${item.vendorId}`);
                    }}
                    className="cursor-pointer outline-none"
                  >
                    {vendorDashboard.topChart.map((v, idx) => (
                      <Cell
                        key={v.vendorId}
                        fill={JEWEL_CHART_PALETTE[idx % JEWEL_CHART_PALETTE.length]}
                        stroke="var(--bg-elevated)"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val) => [formatINR(Number(val)), "Total Purchases"]}
                    contentStyle={{
                      backgroundColor: "var(--bg-elevated)",
                      borderColor: "var(--border-default)",
                      fontSize: "12px",
                      borderRadius: "6px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
              {vendorDashboard.topChart.map((v, idx) => (
                <button
                  key={v.vendorId}
                  type="button"
                  onClick={() => navigate(`/vendors/${v.vendorId}`)}
                  className="flex items-center justify-between gap-2 text-left hover:text-[var(--brand-burgundy)] cursor-pointer transition-colors"
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <span
                      className="h-2.5 w-2.5 rounded-[2px] shrink-0"
                      style={{
                        backgroundColor: JEWEL_CHART_PALETTE[idx % JEWEL_CHART_PALETTE.length],
                      }}
                    />
                    <span className="truncate text-[var(--text-charcoal)]">{v.shortName}</span>
                  </span>
                  <span className="font-mono-data font-medium text-[var(--brand-navy)] tabular-nums shrink-0">
                    {formatINR(v.total, { compact: true })}
                  </span>
                </button>
              ))}
            </div>
          </ElevatedCard>

          <ElevatedCard className="lg:col-span-6 p-5">
            <h2 className="text-[15px] font-semibold text-[var(--brand-navy)]">
              Purchases by supplier category
            </h2>
            <p className="text-[12px] text-[var(--text-secondary)]">
              Procurement allocation across expense categories
            </p>
            <div className="mt-3 h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={vendorDashboard.categoryMix}
                  layout="vertical"
                  margin={{ top: 4, right: 18, left: 4, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-subtle)" />
                  <XAxis
                    type="number"
                    tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => formatINR(Number(v), { compact: true, decimals: 0 })}
                  />
                  <YAxis
                    type="category"
                    dataKey="category"
                    width={148}
                    tick={{ fill: "var(--text-charcoal)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(val) => [formatINR(Number(val)), "Spend"]}
                    contentStyle={{
                      backgroundColor: "var(--bg-elevated)",
                      borderColor: "var(--border-default)",
                      fontSize: "12px",
                      borderRadius: "6px",
                    }}
                  />
                  <Bar dataKey="amount" radius={[0, 4, 4, 0]} barSize={16}>
                    {vendorDashboard.categoryMix.map((entry, idx) => (
                      <Cell
                        key={entry.category}
                        fill={JEWEL_CHART_PALETTE[(idx + 2) % JEWEL_CHART_PALETTE.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ElevatedCard>
        </div>
      </div>

      {/* 4-Column Vendor Directory Table */}
      <ElevatedCard className="overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[var(--border-subtle)] p-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vendor name, GSTIN, or address..."
              className="pl-8"
            />
          </div>

          <div className="w-full sm:w-[170px]">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : filteredVendors.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<Building2 className="h-5 w-5" />}
              title="No vendors found"
              description="Adjust your search or add a new supplier to your directory."
              action={
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingVendor(null);
                    setDialogOpen(true);
                  }}
                >
                  Add Vendor
                </Button>
              }
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
                    <tr
                      key={row.id}
                      onClick={() => navigate(`/vendors/${row.original.id}`)}
                      className="hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="py-3 px-4">
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
              totalItems={filteredVendors.length}
              pageSize={table.getState().pagination.pageSize}
              onPageChange={(idx) => table.setPageIndex(idx)}
            />
          </>
        )}
      </ElevatedCard>

      <VendorFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        vendor={editingVendor}
        onSubmitVendor={handleSaveVendor}
      />
    </div>
  );
}
