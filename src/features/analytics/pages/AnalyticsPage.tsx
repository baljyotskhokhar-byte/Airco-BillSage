import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { PaymentStatusBadge } from "@/components/common/StatusBadge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JEWEL_CHART_PALETTE } from "@/lib/constants";
import { exportToCSV, formatDateDisplay, formatINR } from "@/lib/formatters";
import { analyticsService } from "@/mocks/services/analyticsService";
import { billService } from "@/mocks/services/billService";

const VENDOR_BAR_COLORS = ["#601D49", "#813653", "#930031", "#133458", "#176B70"] as const;

export function AnalyticsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "spending";
  const [activeTab, setActiveTab] = React.useState(initialTab);
  const [monthsBack, setMonthsBack] = React.useState("6");

  const { data: analytics, isLoading } = useQuery({
    queryKey: ["full-analytics", monthsBack],
    queryFn: () => analyticsService.getFullAnalytics(Number(monthsBack)),
  });

  const { data: bills = [] } = useQuery({
    queryKey: ["bills"],
    queryFn: () => billService.list(),
  });

  const overdueBills = React.useMemo(
    () => bills.filter((b) => b.paymentStatus === "Overdue"),
    [bills]
  );

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    setSearchParams({ tab: val }, { replace: true });
  };

  const handleExport = () => {
    if (!analytics) return;
    exportToCSV(
      `airco-billsage-analytics-${monthsBack}m.csv`,
      ["Month", "Total Spend", "CGST", "SGST", "IGST", "Payments Settled", "Outstanding"],
      analytics.monthlyTrend.map((m) => [
        m.month,
        m.spend,
        m.cgst,
        m.sgst,
        m.igst,
        m.paid,
        m.outstanding,
      ])
    );
    toast.success("Analytics report exported to CSV");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        subtitle="Spending intelligence, GST reconciliation, payment velocity, and supplier concentration."
        actions={
          <>
            <div className="w-[155px]">
              <Select value={monthsBack} onValueChange={setMonthsBack}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">Last 3 months</SelectItem>
                  <SelectItem value="6">Last 6 months</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
          </>
        }
      />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-5">
        <TabsList className="flex-wrap">
          <TabsTrigger value="spending">Spending</TabsTrigger>
          <TabsTrigger value="tax">Tax &amp; GST</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
        </TabsList>

        {isLoading || !analytics ? (
          <div className="space-y-4">
            <Skeleton className="h-[320px] w-full" />
            <Skeleton className="h-[260px] w-full" />
          </div>
        ) : (
          <>
            {/* SPENDING ANALYTICS */}
            <TabsContent value="spending" className="space-y-5">
              <ElevatedCard className="p-5 sm:p-6">
                <h2 className="text-[16px] font-semibold text-[var(--brand-navy)]">
                  Monthly spending trend
                </h2>
                <p className="text-[12px] text-[var(--text-secondary)]">
                  Total billed expenditure across the last {monthsBack} months
                </p>
                <div className="mt-4 h-[290px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics.monthlyTrend} margin={{ top: 8, right: 16, left: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                      <XAxis dataKey="month" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis
                        tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        width={70}
                        tickFormatter={(v) => formatINR(Number(v), { compact: true, decimals: 0 })}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const row = payload[0].payload as { month: string; spend: number };
                          return (
                            <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2 shadow-sm">
                              <p className="text-[11px] text-[var(--text-secondary)]">{row.month}</p>
                              <p className="font-mono-data text-[13px] font-semibold text-[var(--brand-burgundy)]">
                                {formatINR(row.spend)}
                              </p>
                            </div>
                          );
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="spend"
                        stroke="#930031"
                        strokeWidth={2.25}
                        fill="#930031"
                        fillOpacity={0.14}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </ElevatedCard>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <ElevatedCard className="lg:col-span-6 p-5 sm:p-6">
                  <h2 className="text-[15px] font-semibold text-[var(--brand-navy)]">
                    Spending by category
                  </h2>
                  <p className="text-[12px] text-[var(--text-secondary)]">
                    Distribution across expense categories
                  </p>
                  <div className="mt-4 h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={analytics.byCategory}
                        layout="vertical"
                        margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
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
                          width={150}
                          tick={{ fill: "var(--text-charcoal)", fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          formatter={(value) => [formatINR(Number(value)), "Spend"]}
                          contentStyle={{
                            backgroundColor: "var(--bg-elevated)",
                            borderColor: "var(--border-default)",
                            fontSize: "12px",
                            borderRadius: "6px",
                          }}
                        />
                        <Bar dataKey="amount" radius={[0, 4, 4, 0]} barSize={16}>
                          {analytics.byCategory.map((entry, idx) => (
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

                <ElevatedCard className="lg:col-span-6 p-5 sm:p-6">
                  <h2 className="text-[15px] font-semibold text-[var(--brand-navy)]">
                    Spending by vendor
                  </h2>
                  <p className="text-[12px] text-[var(--text-secondary)]">
                    Top suppliers by total billed spend
                  </p>
                  <div className="mt-4 h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={analytics.byVendor.slice(0, 5)}
                        layout="vertical"
                        margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
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
                          dataKey="name"
                          width={150}
                          tick={{ fill: "var(--text-charcoal)", fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v: string) => (v.length > 22 ? `${v.slice(0, 20)}…` : v)}
                        />
                        <Tooltip
                          formatter={(value) => [formatINR(Number(value)), "Billed"]}
                          contentStyle={{
                            backgroundColor: "var(--bg-elevated)",
                            borderColor: "var(--border-default)",
                            fontSize: "12px",
                            borderRadius: "6px",
                          }}
                        />
                        <Bar dataKey="amount" radius={[0, 4, 4, 0]} barSize={16}>
                          {analytics.byVendor.slice(0, 5).map((entry, idx) => (
                            <Cell
                              key={entry.vendorId}
                              fill={VENDOR_BAR_COLORS[idx % VENDOR_BAR_COLORS.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ElevatedCard>
              </div>

              <ElevatedCard className="overflow-hidden">
                <div className="px-5 py-4 border-b border-[var(--border-subtle)]">
                  <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
                    Spending by item
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[11px] font-medium text-[var(--text-secondary)]">
                        <th className="py-2.5 pl-5 pr-3">Item description</th>
                        <th className="py-2.5 px-3">Primary supplier</th>
                        <th className="py-2.5 px-3 text-right">Total quantity</th>
                        <th className="py-2.5 pl-3 pr-5 text-right">Total spend</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)] text-[13px]">
                      {analytics.topItems.slice(0, 7).map((item) => (
                        <tr key={item.description}>
                          <td className="py-3 pl-5 pr-3 font-medium text-[var(--text-primary)]">
                            {item.description}
                          </td>
                          <td className="py-3 px-3 text-[var(--text-secondary)]">
                            {item.vendorName}
                          </td>
                          <td className="py-3 px-3 text-right tabular-nums">
                            {item.totalQty} {item.unit}
                          </td>
                          <td className="py-3 pl-3 pr-5 text-right font-mono-data text-[12px] font-semibold tabular-nums">
                            {formatINR(item.totalSpend)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ElevatedCard>
            </TabsContent>

            {/* TAX ANALYTICS */}
            <TabsContent value="tax" className="space-y-5">
              <ElevatedCard className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-[var(--border-subtle)] overflow-hidden">
                <div className="px-5 py-4 bg-[var(--brand-teal-tint)]">
                  <p className="text-[11px] font-medium text-[var(--text-secondary)]">CGST total</p>
                  <p className="mt-1 font-mono-data text-[20px] font-semibold text-[var(--brand-teal)] tabular-nums">
                    {formatINR(analytics.taxSummary.cgst, { decimals: 0 })}
                  </p>
                </div>
                <div className="px-5 py-4 bg-[var(--brand-navy-tint)]">
                  <p className="text-[11px] font-medium text-[var(--text-secondary)]">SGST total</p>
                  <p className="mt-1 font-mono-data text-[20px] font-semibold text-[var(--brand-slate)] tabular-nums">
                    {formatINR(analytics.taxSummary.sgst, { decimals: 0 })}
                  </p>
                </div>
                <div className="px-5 py-4 bg-[var(--brand-gold-tint)]">
                  <p className="text-[11px] font-medium text-[var(--text-secondary)]">IGST total</p>
                  <p className="mt-1 font-mono-data text-[20px] font-semibold text-[var(--brand-gold-text)] tabular-nums">
                    {formatINR(analytics.taxSummary.igst, { decimals: 0 })}
                  </p>
                </div>
                <div className="px-5 py-4 bg-[var(--brand-plum-tint)]">
                  <p className="text-[11px] font-medium text-[var(--text-secondary)]">Total GST credit</p>
                  <p className="mt-1 font-mono-data text-[20px] font-semibold text-[var(--brand-plum)] tabular-nums">
                    {formatINR(analytics.taxSummary.total, { decimals: 0 })}
                  </p>
                </div>
              </ElevatedCard>

              <ElevatedCard className="p-5 sm:p-6">
                <h2 className="text-[16px] font-semibold text-[var(--brand-navy)]">
                  GST trend over time
                </h2>
                <p className="text-[12px] text-[var(--text-secondary)]">
                  Monthly breakdown of CGST, SGST, and IGST input tax
                </p>
                <div className="mt-4 h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.monthlyTrend} margin={{ top: 8, right: 16, left: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                      <XAxis dataKey="month" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis
                        tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        width={68}
                        tickFormatter={(v) => formatINR(Number(v), { compact: true, decimals: 0 })}
                      />
                      <Tooltip
                        formatter={(value, name) => [formatINR(Number(value)), String(name).toUpperCase()]}
                        contentStyle={{
                          backgroundColor: "var(--bg-elevated)",
                          borderColor: "var(--border-default)",
                          fontSize: "12px",
                          borderRadius: "6px",
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                      <Bar dataKey="cgst" name="CGST" stackId="gst" fill="#176B70" />
                      <Bar dataKey="sgst" name="SGST" stackId="gst" fill="#526E91" />
                      <Bar dataKey="igst" name="IGST" stackId="gst" fill="#C39742" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ElevatedCard>
            </TabsContent>

            {/* PAYMENT ANALYTICS */}
            <TabsContent value="payments" className="space-y-5">
              <ElevatedCard className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-[var(--border-subtle)] overflow-hidden">
                <div className="px-5 py-4 bg-[var(--brand-teal-tint)]">
                  <p className="text-[11px] font-medium text-[var(--text-secondary)]">Total paid</p>
                  <p className="mt-1 font-mono-data text-[20px] font-semibold text-[var(--brand-teal)] tabular-nums">
                    {formatINR(analytics.paymentSummary.totalPaid, { decimals: 0 })}
                  </p>
                </div>
                <div className="px-5 py-4 bg-[var(--brand-plum-tint)]">
                  <p className="text-[11px] font-medium text-[var(--text-secondary)]">Total unpaid</p>
                  <p className="mt-1 font-mono-data text-[20px] font-semibold text-[var(--brand-plum)] tabular-nums">
                    {formatINR(analytics.paymentSummary.totalUnpaid, { decimals: 0 })}
                  </p>
                </div>
                <div className="px-5 py-4 bg-[var(--brand-burgundy-tint)]">
                  <p className="text-[11px] font-medium text-[var(--text-secondary)]">Overdue balance</p>
                  <p className="mt-1 font-mono-data text-[20px] font-semibold text-[var(--brand-burgundy)] tabular-nums">
                    {formatINR(analytics.paymentSummary.overdueTotal, { decimals: 0 })}
                  </p>
                </div>
                <div className="px-5 py-4 bg-[var(--brand-navy-tint)]">
                  <p className="text-[11px] font-medium text-[var(--text-secondary)]">Avg settlement time</p>
                  <p className="mt-1 font-mono-data text-[20px] font-semibold text-[var(--brand-navy)] tabular-nums">
                    {analytics.paymentSummary.avgPaymentDays} days
                  </p>
                </div>
              </ElevatedCard>

              <ElevatedCard className="p-5 sm:p-6">
                <h2 className="text-[16px] font-semibold text-[var(--brand-navy)]">
                  Paid vs. outstanding balance trend
                </h2>
                <p className="text-[12px] text-[var(--text-secondary)]">
                  Monthly settled payments compared with open invoice balances
                </p>
                <div className="mt-4 h-[290px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.monthlyTrend} margin={{ top: 8, right: 16, left: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                      <XAxis dataKey="month" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis
                        tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        width={70}
                        tickFormatter={(v) => formatINR(Number(v), { compact: true, decimals: 0 })}
                      />
                      <Tooltip
                        formatter={(value, name) => [formatINR(Number(value)), String(name)]}
                        contentStyle={{
                          backgroundColor: "var(--bg-elevated)",
                          borderColor: "var(--border-default)",
                          fontSize: "12px",
                          borderRadius: "6px",
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                      <Bar dataKey="paid" name="Paid" fill="#176B70" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="outstanding" name="Outstanding" fill="#930031" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ElevatedCard>

              <ElevatedCard className="overflow-hidden">
                <div className="px-5 py-4 border-b border-[var(--border-subtle)]">
                  <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
                    Overdue bill analysis
                  </h2>
                </div>
                {overdueBills.length === 0 ? (
                  <div className="p-6 text-[13px] text-[var(--text-secondary)]">
                    No overdue invoices right now.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[11px] font-medium text-[var(--text-secondary)]">
                          <th className="py-2.5 pl-5 pr-3">Invoice #</th>
                          <th className="py-2.5 px-3">Vendor</th>
                          <th className="py-2.5 px-3">Due date</th>
                          <th className="py-2.5 px-3 text-right">Overdue amount</th>
                          <th className="py-2.5 pl-3 pr-5 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-subtle)] text-[13px]">
                        {overdueBills.map((b) => (
                          <tr
                            key={b.id}
                            onClick={() => navigate(`/bills/${b.id}`)}
                            className="hover:bg-[var(--bg-surface)] cursor-pointer"
                          >
                            <td className="py-3 pl-5 pr-3 font-mono-data text-[12px] font-medium">
                              {b.invoiceNumber}
                            </td>
                            <td className="py-3 px-3">{b.vendorName}</td>
                            <td className="py-3 px-3 text-[12px] text-[var(--text-secondary)] tabular-nums">
                              {formatDateDisplay(b.dueDate)}
                            </td>
                            <td className="py-3 px-3 text-right font-mono-data text-[12px] font-semibold text-[var(--status-danger)] tabular-nums">
                              {formatINR(b.totalAmount - b.amountPaid)}
                            </td>
                            <td className="py-3 pl-3 pr-5 text-right">
                              <PaymentStatusBadge status={b.paymentStatus} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </ElevatedCard>
            </TabsContent>

            {/* VENDOR ANALYTICS */}
            <TabsContent value="vendors" className="space-y-5">
              <ElevatedCard className="overflow-hidden">
                <div className="px-5 py-4 border-b border-[var(--border-subtle)]">
                  <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
                    Vendor concentration &amp; purchase frequency
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[11px] font-medium text-[var(--text-secondary)]">
                        <th className="py-2.5 pl-5 pr-3">Vendor</th>
                        <th className="py-2.5 px-3 text-right">Bills count</th>
                        <th className="py-2.5 px-3 text-right">Total spend</th>
                        <th className="py-2.5 pl-3 pr-5 text-right">Spend share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)] text-[13px]">
                      {analytics.byVendor.map((v) => (
                        <tr
                          key={v.vendorId}
                          onClick={() => navigate(`/vendors/${v.vendorId}`)}
                          className="hover:bg-[var(--bg-surface)] cursor-pointer"
                        >
                          <td className="py-3 pl-5 pr-3 font-medium text-[var(--text-primary)]">
                            {v.name}
                          </td>
                          <td className="py-3 px-3 text-right tabular-nums">{v.count}</td>
                          <td className="py-3 px-3 text-right font-mono-data text-[12px] tabular-nums">
                            {formatINR(v.amount)}
                          </td>
                          <td className="py-3 pl-3 pr-5 text-right font-mono-data text-[12px] font-semibold text-[var(--brand-plum)] tabular-nums">
                            {v.sharePercent}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ElevatedCard>

              <ElevatedCard className="overflow-hidden">
                <div className="px-5 py-4 border-b border-[var(--border-subtle)]">
                  <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
                    Price changes for frequently purchased items
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[11px] font-medium text-[var(--text-secondary)]">
                        <th className="py-2.5 pl-5 pr-3">Item</th>
                        <th className="py-2.5 px-3">Supplier</th>
                        <th className="py-2.5 px-3 text-right">Avg price</th>
                        <th className="py-2.5 px-3 text-right">Latest price</th>
                        <th className="py-2.5 pl-3 pr-5 text-right">Change</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)] text-[13px]">
                      {analytics.topItems.slice(0, 6).map((item) => (
                        <tr key={item.description}>
                          <td className="py-3 pl-5 pr-3 font-medium text-[var(--text-primary)]">
                            {item.description}
                          </td>
                          <td className="py-3 px-3 text-[var(--text-secondary)]">
                            {item.vendorName}
                          </td>
                          <td className="py-3 px-3 text-right font-mono-data text-[12px] tabular-nums">
                            {formatINR(item.avgPrice)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono-data text-[12px] tabular-nums">
                            {formatINR(item.latestPrice)}
                          </td>
                          <td className="py-3 pl-3 pr-5 text-right font-mono-data text-[12px] tabular-nums">
                            <span
                              className={
                                item.changePct > 0
                                  ? "text-[var(--status-danger)]"
                                  : item.changePct < 0
                                    ? "text-[var(--status-success)]"
                                    : "text-[var(--text-secondary)]"
                              }
                            >
                              {item.changePct > 0 ? `+${item.changePct}%` : `${item.changePct}%`}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ElevatedCard>
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
