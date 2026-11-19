import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";
import { Building2, Download, Edit3, Eye, Mail, MapPin, Phone } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { PaymentStatusBadge, VendorStatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { ElevatedCard } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/separator";
import { downloadBillDocument } from "@/lib/billDownload";
import { formatDateDisplay, formatINR } from "@/lib/formatters";
import { billService } from "@/mocks/services/billService";
import { vendorService } from "@/mocks/services/vendorService";
import { VendorFormDialog, type VendorFormValues } from "../components/VendorFormDialog";

function getVendorInitials(name: string): string {
  const words = name.replace(/[^a-zA-Z0-9\s]/g, "").trim().split(/\s+/);
  if (words.length === 0 || !words[0]) return "V";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

export function VendorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<string>("");

  const { data: vendor, isLoading } = useQuery({
    queryKey: ["vendor", id],
    queryFn: () => vendorService.getById(id!),
    enabled: Boolean(id),
  });

  const { data: vendorBills = [] } = useQuery({
    queryKey: ["vendor-bills", id],
    queryFn: () => billService.listByVendor(id!),
    enabled: Boolean(id),
  });

  const metrics = React.useMemo(() => {
    const totalPurchases = vendorBills.reduce((s, b) => s + b.totalAmount, 0);
    const totalBills = vendorBills.length;
    const outstanding = vendorBills.reduce(
      (s, b) => s + Math.max(0, b.totalAmount - b.amountPaid),
      0
    );
    const avgInvoice = totalBills > 0 ? totalPurchases / totalBills : 0;

    // Monthly purchases series
    const monthMap = new Map<string, number>();
    vendorBills.forEach((b) => {
      const mKey = b.invoiceDate.slice(0, 7);
      monthMap.set(mKey, (monthMap.get(mKey) ?? 0) + b.totalAmount);
    });
    const monthlyTrend = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mKey, amount]) => ({
        month: format(parseISO(`${mKey}-01`), "MMM yyyy"),
        amount: Number(amount.toFixed(2)),
      }));

    // Item purchase & price history analysis
    const itemMap = new Map<
      string,
      {
        description: string;
        hsnSac: string;
        unit: string;
        totalQty: number;
        totalSpend: number;
        history: { date: string; label: string; unitPrice: number }[];
      }
    >();
    vendorBills.forEach((b) => {
      b.lineItems.forEach((li) => {
        const key = li.description.trim();
        const curr = itemMap.get(key) ?? {
          description: key,
          hsnSac: li.hsnSac,
          unit: li.unit,
          totalQty: 0,
          totalSpend: 0,
          history: [],
        };
        curr.totalQty += li.quantity;
        curr.totalSpend += li.total;
        curr.history.push({
          date: b.invoiceDate,
          label: formatDateDisplay(b.invoiceDate, "dd MMM"),
          unitPrice: li.unitPrice,
        });
        itemMap.set(key, curr);
      });
    });

    const items = Array.from(itemMap.values())
      .map((item) => {
        const sortedHistory = [...item.history].sort((a, b) => a.date.localeCompare(b.date));
        const avgPrice =
          sortedHistory.reduce((s, h) => s + h.unitPrice, 0) / Math.max(1, sortedHistory.length);
        const latestPrice = sortedHistory[sortedHistory.length - 1]?.unitPrice ?? 0;
        const firstPrice = sortedHistory[0]?.unitPrice ?? latestPrice;
        const deltaPct = firstPrice > 0 ? ((latestPrice - firstPrice) / firstPrice) * 100 : 0;
        return {
          ...item,
          avgPrice,
          latestPrice,
          deltaPct,
          history: sortedHistory,
        };
      })
      .sort((a, b) => b.totalSpend - a.totalSpend);

    return { totalPurchases, totalBills, outstanding, avgInvoice, monthlyTrend, items };
  }, [vendorBills]);

  React.useEffect(() => {
    if (metrics.items.length > 0 && !selectedItem) {
      setSelectedItem(metrics.items[0].description);
    }
  }, [metrics.items, selectedItem]);

  const activePriceItem =
    metrics.items.find((i) => i.description === selectedItem) ?? metrics.items[0];

  const handleEditSubmit = async (values: VendorFormValues) => {
    if (!vendor) return;
    await vendorService.update(vendor.id, values);
    queryClient.invalidateQueries({ queryKey: ["vendor", id] });
    queryClient.invalidateQueries({ queryKey: ["vendors"] });
    toast.success("Vendor details updated");
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <EmptyState
        icon={<Building2 className="h-5 w-5" />}
        title="Vendor not found"
        description="This supplier record may have been removed."
        action={
          <Button variant="outline" onClick={() => navigate("/vendors")}>
            Back to vendors
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Vendors", to: "/vendors" },
          { label: vendor.name },
        ]}
        title={vendor.name}
        subtitle={`GSTIN ${vendor.gstin} · ${vendor.state}`}
        actions={
          <>
            <VendorStatusBadge status={vendor.status} />
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Edit3 className="h-3.5 w-3.5" />
              Edit vendor
            </Button>
          </>
        }
      />

      {/* Contact Strip + Financial Overview */}
      <ElevatedCard className="p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2.5 text-[13px] text-[var(--text-charcoal)] border-b border-[var(--border-subtle)] pb-4">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--brand-plum)]/20 bg-[var(--brand-plum-bg)] text-[12px] font-semibold text-[var(--brand-plum)]">
            {getVendorInitials(vendor.name)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-[var(--brand-navy)]" />
            {vendor.address}, {vendor.pinCode}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 text-[var(--brand-plum)]" />
            {vendor.email}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 text-[var(--brand-teal)]" />
            {vendor.phone}
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="rounded-md border border-[var(--brand-navy)]/15 bg-[var(--brand-navy-tint)] px-4 py-3">
            <p className="text-[11px] font-medium text-[var(--text-secondary)]">Total purchases</p>
            <p className="mt-1 font-mono-data text-[21px] font-semibold text-[var(--brand-navy)] tabular-nums">
              {formatINR(metrics.totalPurchases, { decimals: 0 })}
            </p>
          </div>
          <div className="rounded-md border border-[var(--brand-plum)]/15 bg-[var(--brand-plum-tint)] px-4 py-3">
            <p className="text-[11px] font-medium text-[var(--text-secondary)]">Total bills</p>
            <p className="mt-1 font-mono-data text-[21px] font-semibold text-[var(--brand-plum)] tabular-nums">
              {metrics.totalBills}
            </p>
          </div>
          <div className="rounded-md border border-[var(--brand-burgundy)]/20 bg-[var(--brand-burgundy-tint)] px-4 py-3">
            <p className="text-[11px] font-medium text-[var(--text-secondary)]">Outstanding amount</p>
            <p className="mt-1 font-mono-data text-[21px] font-semibold text-[var(--brand-burgundy)] tabular-nums">
              {formatINR(metrics.outstanding, { decimals: 0 })}
            </p>
          </div>
          <div className="rounded-md border border-[var(--brand-teal)]/20 bg-[var(--brand-teal-tint)] px-4 py-3">
            <p className="text-[11px] font-medium text-[var(--text-secondary)]">Average invoice value</p>
            <p className="mt-1 font-mono-data text-[21px] font-semibold text-[var(--brand-teal)] tabular-nums">
              {formatINR(metrics.avgInvoice, { decimals: 0 })}
            </p>
          </div>
        </div>
      </ElevatedCard>

      {/* Spending Trend + Item Price Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <ElevatedCard className="lg:col-span-6 p-5 sm:p-6">
          <h2 className="text-[15px] font-semibold text-[var(--brand-navy)]">
            Vendor spending trend
          </h2>
          <p className="text-[12px] text-[var(--text-secondary)]">Monthly billed volume (INR)</p>
          <div className="mt-4 h-[230px] w-full">
            {metrics.monthlyTrend.length === 0 ? (
              <div className="flex h-full items-center justify-center text-[13px] text-[var(--text-secondary)]">
                No monthly purchase history yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.monthlyTrend} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                  <XAxis dataKey="month" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis
                    tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={64}
                    tickFormatter={(v) => formatINR(Number(v), { compact: true, decimals: 0 })}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const pt = payload[0].payload as { month: string; amount: number };
                      return (
                        <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2 shadow-sm">
                          <p className="text-[11px] text-[var(--text-secondary)]">{pt.month}</p>
                          <p className="font-mono-data text-[12px] font-semibold text-[var(--brand-burgundy)]">
                            {formatINR(pt.amount)}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#930031"
                    strokeWidth={2.25}
                    fill="#930031"
                    fillOpacity={0.14}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </ElevatedCard>

        <ElevatedCard className="lg:col-span-6 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-[15px] font-semibold text-[var(--brand-navy)]">
                Historical item price trend
              </h2>
              <p className="text-[12px] text-[var(--text-secondary)]">
                Compare unit rate shifts across invoices
              </p>
            </div>
            {metrics.items.length > 0 && (
              <div className="w-full sm:w-[220px]">
                <Select value={selectedItem} onValueChange={setSelectedItem}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select item" />
                  </SelectTrigger>
                  <SelectContent>
                    {metrics.items.map((it) => (
                      <SelectItem key={it.description} value={it.description}>
                        {it.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="mt-4 h-[230px] w-full">
            {!activePriceItem || activePriceItem.history.length === 0 ? (
              <div className="flex h-full items-center justify-center text-[13px] text-[var(--text-secondary)]">
                No item pricing data recorded.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activePriceItem.history} margin={{ top: 8, right: 16, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                  <XAxis dataKey="label" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis
                    tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={64}
                    domain={["auto", "auto"]}
                    tickFormatter={(v) => formatINR(Number(v), { decimals: 0 })}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const pt = payload[0].payload as { date: string; unitPrice: number };
                      return (
                        <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2 shadow-sm">
                          <p className="text-[11px] text-[var(--text-secondary)]">
                            {formatDateDisplay(pt.date)}
                          </p>
                          <p className="font-mono-data text-[12px] font-semibold text-[var(--brand-navy)]">
                            {formatINR(pt.unitPrice)} / {activePriceItem.unit}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="unitPrice"
                    stroke="#133458"
                    strokeWidth={2.25}
                    dot={{ r: 4.5, fill: "#C39742", stroke: "#FFFFFF", strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: "#930031", stroke: "#FFFFFF", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </ElevatedCard>
      </div>

      {/* Item Purchase Analysis Table */}
      <ElevatedCard className="overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border-subtle)]">
          <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
            Item purchase analysis
          </h2>
          <p className="text-[12px] text-[var(--text-secondary)]">
            Frequently purchased items, quantities, and unit price variance
          </p>
        </div>
        {metrics.items.length === 0 ? (
          <div className="p-6 text-[13px] text-[var(--text-secondary)]">
            No line items recorded for this vendor yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[11px] font-medium text-[var(--text-secondary)]">
                  <th className="py-2.5 pl-5 pr-3">Item description</th>
                  <th className="py-2.5 px-3 text-right">Total qty</th>
                  <th className="py-2.5 px-3 text-right">Total spend</th>
                  <th className="py-2.5 px-3 text-right">Avg unit price</th>
                  <th className="py-2.5 px-3 text-right">Latest price</th>
                  <th className="py-2.5 pl-3 pr-5 text-right">Price change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-[13px]">
                {metrics.items.map((item) => (
                  <tr
                    key={item.description}
                    onClick={() => setSelectedItem(item.description)}
                    className="hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
                  >
                    <td className="py-3 pl-5 pr-3 font-medium text-[var(--text-primary)]">
                      {item.description}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums">
                      {item.totalQty} {item.unit}
                    </td>
                    <td className="py-3 px-3 text-right font-mono-data text-[12px] tabular-nums">
                      {formatINR(item.totalSpend)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono-data text-[12px] tabular-nums">
                      {formatINR(item.avgPrice)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono-data text-[12px] font-medium tabular-nums">
                      {formatINR(item.latestPrice)}
                    </td>
                    <td className="py-3 pl-3 pr-5 text-right font-mono-data text-[12px] tabular-nums">
                      <span
                        className={
                          item.deltaPct > 0
                            ? "text-[var(--status-danger)]"
                            : item.deltaPct < 0
                              ? "text-[var(--status-success)]"
                              : "text-[var(--text-secondary)]"
                        }
                      >
                        {item.deltaPct > 0 ? `+${item.deltaPct.toFixed(1)}%` : `${item.deltaPct.toFixed(1)}%`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ElevatedCard>

      {/* Bill History Table */}
      <ElevatedCard className="overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)]">
          <div>
            <h2 className="text-[15px] font-semibold text-[var(--brand-navy)]">Bill history</h2>
            <p className="text-[12px] text-[var(--text-secondary)]">
              View invoice details or download scanned invoice documents
            </p>
          </div>
        </div>
        {vendorBills.length === 0 ? (
          <div className="p-6 text-[13px] text-[var(--text-secondary)]">
            No bills recorded for this vendor yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[11px] font-medium text-[var(--text-secondary)]">
                  <th className="py-2.5 pl-5 pr-3">Bill number</th>
                  <th className="py-2.5 px-3">Invoice date</th>
                  <th className="py-2.5 px-3">Due date</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                  <th className="py-2.5 pl-3 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-[13px]">
                {vendorBills.map((bill) => (
                  <tr
                    key={bill.id}
                    onClick={() => navigate(`/bills/${bill.id}`)}
                    className="hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
                  >
                    <td className="py-3 pl-5 pr-3 font-mono-data text-[12px] font-medium text-[var(--brand-navy)]">
                      {bill.invoiceNumber}
                    </td>
                    <td className="py-3 px-3 text-[12px] text-[var(--text-secondary)] tabular-nums">
                      {formatDateDisplay(bill.invoiceDate)}
                    </td>
                    <td className="py-3 px-3 text-[12px] text-[var(--text-secondary)] tabular-nums">
                      {formatDateDisplay(bill.dueDate)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono-data text-[12px] font-medium tabular-nums">
                      {formatINR(bill.totalAmount)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <PaymentStatusBadge status={bill.paymentStatus} />
                    </td>
                    <td
                      className="py-3 pl-3 pr-5 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/bills/${bill.id}`)}
                          aria-label={`View ${bill.invoiceNumber}`}
                          className="h-7 px-2.5 text-[11px]"
                        >
                          <Eye className="h-3 w-3 text-[var(--brand-navy)]" />
                          View
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            downloadBillDocument(bill);
                            toast.success(`Downloaded ${bill.invoiceNumber}`);
                          }}
                          aria-label={`Download ${bill.invoiceNumber}`}
                          className="h-7 px-2.5 text-[11px]"
                        >
                          <Download className="h-3 w-3 text-[var(--brand-burgundy)]" />
                          Download
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ElevatedCard>

      <VendorFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        vendor={vendor}
        onSubmitVendor={handleEditSubmit}
      />
    </div>
  );
}
