import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ArrowUpRight, Download, FilePlus2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { ElevatedCard } from "@/components/ui/card";
import { Separator, Skeleton } from "@/components/ui/separator";
import { JEWEL_CHART_PALETTE } from "@/lib/constants";
import { exportToCSV, formatDateDisplay, formatINR, formatRelativeDate } from "@/lib/formatters";
import { analyticsService } from "@/mocks/services/analyticsService";
import { notificationService } from "@/mocks/services/notificationService";

export function DashboardPage() {
  const navigate = useNavigate();

  const { data: snapshot, isLoading } = useQuery({
    queryKey: ["dashboard-snapshot"],
    queryFn: () => analyticsService.getDashboardSnapshot(),
  });

  const { data: activity = [] } = useQuery({
    queryKey: ["activity-feed"],
    queryFn: () => notificationService.listActivity(),
  });

  const handleExport = () => {
    if (!snapshot) return;
    exportToCSV(
      "airco-billsage-vendor-spending.csv",
      ["Vendor", "Bills Count", "Total Spend (INR)", "Share (%)"],
      snapshot.vendorPie.map((v) => [v.name, v.count, v.amount, v.sharePct])
    );
    toast.success("Vendor spending summary exported to CSV");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Your financial activity, at a glance."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
            <Button size="sm" onClick={() => navigate("/bills?action=upload")}>
              <FilePlus2 className="h-3.5 w-3.5" />
              Upload Bill
            </Button>
          </>
        }
      />

      {/* Financial & Operational KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <ElevatedCard className="lg:col-span-7 p-5 sm:p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[16px] font-semibold text-[var(--brand-navy)]">
                Financial overview
              </h2>
            </div>
            <Link
              to="/analytics"
              className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--brand-burgundy)] hover:underline"
            >
              Analytics
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {isLoading ? (
            <Skeleton className="mt-5 h-20 w-full" />
          ) : (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3.5 py-3">
                <p className="text-[11px] font-medium text-[var(--text-secondary)]">Total billed</p>
                <p className="mt-1 font-mono-data text-[18px] font-semibold text-[var(--text-primary)] tabular-nums">
                  {formatINR(snapshot?.kpis.totalBilled ?? 0, { decimals: 0 })}
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--text-muted)] tabular-nums">
                  {snapshot?.kpis.totalBillsCount ?? 0} invoices
                </p>
              </div>
              <div className="rounded-md border border-[var(--brand-teal)]/20 bg-[var(--brand-teal-tint)] px-3.5 py-3">
                <p className="text-[11px] font-medium text-[var(--text-secondary)]">Amount settled</p>
                <p className="mt-1 font-mono-data text-[18px] font-semibold text-[var(--brand-teal)] tabular-nums">
                  {formatINR(snapshot?.kpis.totalPaid ?? 0, { decimals: 0 })}
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--brand-teal)]/80 tabular-nums">
                  {snapshot?.kpis.paidRatioPct ?? 0}% of total
                </p>
              </div>
              <div className="rounded-md border border-[var(--brand-navy)]/15 bg-[var(--brand-navy-tint)] px-3.5 py-3">
                <p className="text-[11px] font-medium text-[var(--text-secondary)]">Avg invoice value</p>
                <p className="mt-1 font-mono-data text-[18px] font-semibold text-[var(--brand-navy)] tabular-nums">
                  {formatINR(snapshot?.kpis.avgInvoiceValue ?? 0, { decimals: 0 })}
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                  Across active suppliers
                </p>
              </div>
              <div className="rounded-md border border-[var(--brand-gold)]/30 bg-[var(--brand-gold-tint)] px-3.5 py-3">
                <p className="text-[11px] font-medium text-[var(--text-secondary)]">Needs review</p>
                <p className="mt-1 font-mono-data text-[18px] font-semibold text-[var(--brand-gold-text)] tabular-nums">
                  {snapshot?.kpis.needsReviewCount ?? 0}
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--text-muted)] tabular-nums">
                  {snapshot?.kpis.activeVendorsCount ?? 0} active vendors
                </p>
              </div>
            </div>
          )}

          <Separator className="my-4" />

          <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-[var(--text-secondary)]">
            <span>Track vendor invoice settlement velocity and pending review items.</span>
            <Link to="/bills" className="font-medium text-[var(--brand-plum)] hover:text-[var(--brand-burgundy)] hover:underline">
              Open bills ledger
            </Link>
          </div>
        </ElevatedCard>

        {/* Outstanding Payments */}
        <ElevatedCard className="lg:col-span-5 p-5 sm:p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-[var(--brand-navy)]">
              Outstanding payments
            </h2>
            <Link
              to="/bank-account"
              className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--brand-burgundy)] hover:underline"
            >
              Bank account
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-md border border-[var(--brand-navy)]/15 bg-[var(--brand-navy-tint)] px-3.5 py-3">
              <p className="text-[11px] font-medium text-[var(--text-secondary)]">Total balance due</p>
              <p className="mt-1 font-mono-data text-[19px] font-semibold text-[var(--brand-navy)] tabular-nums">
                {formatINR(snapshot?.outstanding.totalOutstanding ?? 0, { decimals: 0 })}
              </p>
            </div>
            <div className="rounded-md border border-[var(--brand-plum)]/15 bg-[var(--brand-plum-tint)] px-3.5 py-3">
              <p className="text-[11px] font-medium text-[var(--text-secondary)]">Open bills</p>
              <p className="mt-1 font-mono-data text-[19px] font-semibold text-[var(--brand-plum)] tabular-nums">
                {snapshot?.outstanding.unpaidCount ?? 0}
              </p>
            </div>
            <div className="rounded-md border border-[var(--brand-burgundy)]/20 bg-[var(--brand-burgundy-tint)] px-3.5 py-3">
              <p className="text-[11px] font-medium text-[var(--text-secondary)]">Overdue amount</p>
              <p className="mt-1 font-mono-data text-[19px] font-semibold text-[var(--brand-burgundy)] tabular-nums">
                {formatINR(snapshot?.outstanding.overdueAmount ?? 0, { decimals: 0 })}
              </p>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="flex items-center justify-between text-[12px] text-[var(--text-secondary)]">
            <span>
              <span className="font-semibold text-[var(--brand-burgundy)]">
                {snapshot?.outstanding.overdueCount ?? 0}
              </span>{" "}
              overdue{" "}
              {snapshot?.outstanding.overdueCount === 1 ? "invoice requires" : "invoices require"} attention
            </span>
            <Link
              to="/bank-account?action=record"
              className="font-medium text-[var(--brand-burgundy)] hover:underline"
            >
              Record payment
            </Link>
          </div>
        </ElevatedCard>
      </div>

      {/* Vendor Spending Pie Chart + Recent Bills */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <ElevatedCard className="lg:col-span-5 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[16px] font-semibold text-[var(--brand-navy)]">
                Vendor spending
              </h2>
              <p className="mt-0.5 text-[12px] text-[var(--text-secondary)]">
                Share of total billed spend by supplier
              </p>
            </div>
            <Link
              to="/vendors"
              className="text-[12px] font-medium text-[var(--brand-burgundy)] hover:underline"
            >
              All vendors
            </Link>
          </div>

          <div className="mt-4 h-[220px] w-full">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={snapshot?.vendorPie ?? []}
                    dataKey="amount"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={56}
                    outerRadius={88}
                    paddingAngle={2}
                    onClick={(_, idx) => {
                      const item = (snapshot?.vendorPie ?? [])[idx];
                      if (item?.vendorId && item.vendorId !== "others") {
                        navigate(`/vendors/${item.vendorId}`);
                      }
                    }}
                    className="cursor-pointer outline-none"
                  >
                    {(snapshot?.vendorPie ?? []).map((entry, idx) => (
                      <Cell
                        key={entry.vendorId}
                        fill={JEWEL_CHART_PALETTE[idx % JEWEL_CHART_PALETTE.length]}
                        stroke="var(--bg-elevated)"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const row = payload[0].payload as {
                        name: string;
                        amount: number;
                        sharePct: number;
                        count: number;
                      };
                      const swatch = payload[0].color || "#930031";
                      return (
                        <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2.5 shadow-[var(--shadow-sm)]">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="h-2.5 w-2.5 rounded-[2px] shrink-0"
                              style={{ backgroundColor: swatch }}
                            />
                            <p className="text-[12px] font-semibold text-[var(--text-primary)]">
                              {row.name}
                            </p>
                          </div>
                          <p className="mt-1 font-mono-data text-[12px] font-semibold text-[var(--brand-burgundy)] tabular-nums">
                            {formatINR(row.amount)} ({row.sharePct}%)
                          </p>
                          <p className="text-[11px] text-[var(--text-muted)]">
                            {row.count} {row.count === 1 ? "bill" : "bills"}
                          </p>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Jewel Legend */}
          <div className="mt-3 space-y-2 border-t border-[var(--border-subtle)] pt-3">
            {(snapshot?.vendorPie ?? []).map((v, idx) => (
              <div
                key={v.vendorId}
                onClick={() => {
                  if (v.vendorId !== "others") navigate(`/vendors/${v.vendorId}`);
                }}
                className="flex items-center justify-between gap-2 text-[12px] cursor-pointer group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-2.5 w-2.5 rounded-[2px] shrink-0"
                    style={{ backgroundColor: JEWEL_CHART_PALETTE[idx % JEWEL_CHART_PALETTE.length] }}
                  />
                  <span className="truncate text-[var(--text-charcoal)] group-hover:text-[var(--brand-burgundy)] transition-colors">
                    {v.name}
                  </span>
                </div>
                <span className="font-mono-data text-[11px] font-medium text-[var(--brand-navy)] whitespace-nowrap tabular-nums">
                  {v.sharePct}% · {formatINR(v.amount, { compact: true })}
                </span>
              </div>
            ))}
          </div>
        </ElevatedCard>

        {/* Recent Bills (with Amount Paid & Balance) */}
        <ElevatedCard className="lg:col-span-7 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div>
              <h2 className="text-[16px] font-semibold text-[var(--brand-navy)]">Recent bills</h2>
              <p className="text-[12px] text-[var(--text-secondary)]">
                Latest supplier invoices with paid and remaining balances
              </p>
            </div>
            <Link
              to="/bills"
              className="text-[12px] font-medium text-[var(--brand-burgundy)] hover:underline"
            >
              View all
            </Link>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-y border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[11px] font-medium text-[var(--text-secondary)]">
                  <th className="py-2.5 pl-5 pr-3">Bill number</th>
                  <th className="py-2.5 px-3">Vendor</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                  <th className="py-2.5 px-3 text-right">Amount paid</th>
                  <th className="py-2.5 pl-3 pr-5 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-[13px]">
                {(snapshot?.recentBills ?? []).map((bill) => {
                  const balance = Math.max(0, bill.totalAmount - bill.amountPaid);
                  return (
                    <tr
                      key={bill.id}
                      onClick={() => navigate(`/bills/${bill.id}`)}
                      className="hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
                    >
                      <td className="py-2.5 pl-5 pr-3 font-mono-data text-[12px] font-medium text-[var(--brand-navy)] whitespace-nowrap">
                        {bill.invoiceNumber}
                      </td>
                      <td className="py-2.5 px-3 text-[var(--text-charcoal)] max-w-[170px] truncate">
                        {bill.vendorName}
                      </td>
                      <td className="py-2.5 px-3 text-[12px] text-[var(--text-secondary)] whitespace-nowrap tabular-nums">
                        {formatDateDisplay(bill.invoiceDate)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-data text-[12px] text-[var(--text-primary)] whitespace-nowrap tabular-nums">
                        {formatINR(bill.totalAmount)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-data text-[12px] text-[var(--brand-teal)] whitespace-nowrap tabular-nums">
                        {formatINR(bill.amountPaid)}
                      </td>
                      <td
                        className={`py-2.5 pl-3 pr-5 text-right font-mono-data text-[12px] font-medium whitespace-nowrap tabular-nums ${
                          balance > 0 ? "text-[var(--brand-burgundy)]" : "text-[var(--text-muted)]"
                        }`}
                      >
                        {formatINR(balance)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </ElevatedCard>
      </div>

      {/* Recent Activity Feed */}
      <ElevatedCard className="p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-semibold text-[var(--brand-navy)]">Recent activity</h2>
          <span className="text-[12px] font-medium text-[var(--brand-gold-text)]">
            Workspace audit log
          </span>
        </div>
        <div className="divide-y divide-[var(--border-subtle)]">
          {activity.slice(0, 5).map((event) => (
            <div
              key={event.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 py-2.5 first:pt-0 last:pb-0"
            >
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[13px]">
                <span className="font-medium text-[var(--text-primary)]">{event.title}</span>
                <span className="text-[var(--text-muted)]" aria-hidden="true">
                  ·
                </span>
                {event.linkTo ? (
                  <Link
                    to={event.linkTo}
                    className="text-[var(--text-charcoal)] hover:text-[var(--brand-burgundy)] hover:underline"
                  >
                    {event.detail}
                  </Link>
                ) : (
                  <span className="text-[var(--text-charcoal)]">{event.detail}</span>
                )}
              </div>
              <span className="text-[11px] text-[var(--text-muted)] whitespace-nowrap tabular-nums">
                {formatRelativeDate(event.timestamp)}
              </span>
            </div>
          ))}
        </div>
      </ElevatedCard>
    </div>
  );
}
