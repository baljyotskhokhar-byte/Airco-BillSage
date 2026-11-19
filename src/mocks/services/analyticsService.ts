import {
  eachMonthOfInterval,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns";
import { STORAGE_KEYS } from "@/lib/constants";
import { SEED_BILLS, SEED_PAYMENTS, SEED_VENDORS } from "@/mocks/data/seed";
import type { Bill, Payment, Vendor } from "@/types";
import { readStorage, simulateLatency } from "./storage";

export type DateRangePreset = "7d" | "30d" | "90d" | "this_month" | "prev_month" | "custom";

export interface DateRangeSelection {
  preset: DateRangePreset;
  from: string;
  to: string;
}

const REFERENCE_TODAY = parseISO("2026-11-19");

export function resolveDateRange(
  preset: DateRangePreset,
  customFrom?: string,
  customTo?: string
): { from: Date; to: Date } {
  switch (preset) {
    case "7d":
      return { from: subDays(REFERENCE_TODAY, 6), to: REFERENCE_TODAY };
    case "30d":
      return { from: subDays(REFERENCE_TODAY, 29), to: REFERENCE_TODAY };
    case "90d":
      return { from: subDays(REFERENCE_TODAY, 89), to: REFERENCE_TODAY };
    case "this_month":
      return { from: startOfMonth(REFERENCE_TODAY), to: REFERENCE_TODAY };
    case "prev_month": {
      const prev = subMonths(REFERENCE_TODAY, 1);
      return { from: startOfMonth(prev), to: endOfMonth(prev) };
    }
    case "custom": {
      const f = customFrom ? parseISO(customFrom) : subDays(REFERENCE_TODAY, 29);
      const t = customTo ? parseISO(customTo) : REFERENCE_TODAY;
      return f <= t ? { from: f, to: t } : { from: t, to: f };
    }
  }
}

export const analyticsService = {
  async getDashboardSnapshot() {
    await simulateLatency(110);
    const bills = readStorage<Bill[]>(STORAGE_KEYS.BILLS, SEED_BILLS);
    const vendors = readStorage<Vendor[]>(STORAGE_KEYS.VENDORS, SEED_VENDORS);

    const totalBilled = bills.reduce((s, b) => s + b.totalAmount, 0);
    const totalPaid = bills.reduce((s, b) => s + b.amountPaid, 0);
    const paidRatioPct = totalBilled > 0 ? Number(((totalPaid / totalBilled) * 100).toFixed(1)) : 0;
    const avgInvoiceValue = bills.length > 0 ? totalBilled / bills.length : 0;
    const needsReviewCount = bills.filter((b) => b.reviewStatus === "Needs Review").length;
    const activeVendorsCount = vendors.filter((v) => v.status === "Active").length;

    const unpaidBills = bills.filter(
      (b) => b.paymentStatus !== "Paid" && b.reviewStatus !== "Failed"
    );
    const totalOutstanding = unpaidBills.reduce(
      (sum, b) => sum + Math.max(0, b.totalAmount - b.amountPaid),
      0
    );
    const overdueBills = unpaidBills.filter((b) => b.paymentStatus === "Overdue");
    const overdueAmount = overdueBills.reduce(
      (sum, b) => sum + Math.max(0, b.totalAmount - b.amountPaid),
      0
    );

    const vendorMap = new Map<string, { vendorId: string; name: string; amount: number; count: number }>();
    bills.forEach((b) => {
      const prev = vendorMap.get(b.vendorId) ?? {
        vendorId: b.vendorId,
        name: b.vendorName,
        amount: 0,
        count: 0,
      };
      prev.amount += b.totalAmount;
      prev.count += 1;
      vendorMap.set(b.vendorId, prev);
    });

    const sortedVendors = Array.from(vendorMap.values()).sort((a, b) => b.amount - a.amount);
    const topFive = sortedVendors.slice(0, 5);
    const othersTotal = sortedVendors.slice(5).reduce((s, v) => s + v.amount, 0);

    const pieSource =
      othersTotal > 0
        ? [
            ...topFive,
            {
              vendorId: "others",
              name: "Other Vendors",
              amount: Number(othersTotal.toFixed(2)),
              count: sortedVendors.slice(5).reduce((s, v) => s + v.count, 0),
            },
          ]
        : topFive;

    const vendorPie = pieSource.map((v) => ({
      ...v,
      shortName: v.name.length > 22 ? `${v.name.slice(0, 20)}…` : v.name,
      sharePct: totalBilled > 0 ? Number(((v.amount / totalBilled) * 100).toFixed(1)) : 0,
    }));

    return {
      kpis: {
        totalBilled: Number(totalBilled.toFixed(2)),
        totalPaid: Number(totalPaid.toFixed(2)),
        paidRatioPct,
        avgInvoiceValue: Number(avgInvoiceValue.toFixed(2)),
        totalBillsCount: bills.length,
        needsReviewCount,
        activeVendorsCount,
      },
      outstanding: {
        totalOutstanding: Number(totalOutstanding.toFixed(2)),
        unpaidCount: unpaidBills.length,
        overdueAmount: Number(overdueAmount.toFixed(2)),
        overdueCount: overdueBills.length,
      },
      vendorPie,
      recentBills: [...bills]
        .sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime())
        .slice(0, 6),
    };
  },

  async getFullAnalytics(monthsBack = 6) {
    await simulateLatency(140);
    const bills = readStorage<Bill[]>(STORAGE_KEYS.BILLS, SEED_BILLS);
    const vendors = readStorage<Vendor[]>(STORAGE_KEYS.VENDORS, SEED_VENDORS);
    const payments = readStorage<Payment[]>(STORAGE_KEYS.PAYMENTS, SEED_PAYMENTS);

    const startMonth = startOfMonth(subMonths(REFERENCE_TODAY, monthsBack - 1));
    const months = eachMonthOfInterval({ start: startMonth, end: REFERENCE_TODAY });

    const monthlyTrend = months.map((m) => {
      const mKey = format(m, "yyyy-MM");
      const mLabel = format(m, "MMM yyyy");
      const monthBills = bills.filter((b) => b.invoiceDate.startsWith(mKey));
      const spend = monthBills.reduce((s, b) => s + b.totalAmount, 0);
      const cgst = monthBills.reduce((s, b) => s + b.cgst, 0);
      const sgst = monthBills.reduce((s, b) => s + b.sgst, 0);
      const igst = monthBills.reduce((s, b) => s + b.igst, 0);
      const paid = payments
        .filter((p) => p.paymentDate.startsWith(mKey))
        .reduce((s, p) => s + p.amount, 0);
      const outstanding = monthBills.reduce(
        (s, b) => s + Math.max(0, b.totalAmount - b.amountPaid),
        0
      );
      return {
        month: mLabel,
        spend: Number(spend.toFixed(2)),
        cgst: Number(cgst.toFixed(2)),
        sgst: Number(sgst.toFixed(2)),
        igst: Number(igst.toFixed(2)),
        totalGst: Number((cgst + sgst + igst).toFixed(2)),
        paid: Number(paid.toFixed(2)),
        outstanding: Number(outstanding.toFixed(2)),
      };
    });

    const catMap = new Map<string, number>();
    bills.forEach((b) => {
      catMap.set(b.category, (catMap.get(b.category) ?? 0) + b.totalAmount);
    });
    const byCategory = Array.from(catMap.entries())
      .map(([category, amount]) => ({ category, amount: Number(amount.toFixed(2)) }))
      .sort((a, b) => b.amount - a.amount);

    const vMap = new Map<
      string,
      { vendorId: string; name: string; amount: number; count: number; outstanding: number }
    >();
    bills.forEach((b) => {
      const existing = vMap.get(b.vendorId) ?? {
        vendorId: b.vendorId,
        name: b.vendorName,
        amount: 0,
        count: 0,
        outstanding: 0,
      };
      existing.amount += b.totalAmount;
      existing.count += 1;
      existing.outstanding += Math.max(0, b.totalAmount - b.amountPaid);
      vMap.set(b.vendorId, existing);
    });
    const totalAllVendorSpend = bills.reduce((s, b) => s + b.totalAmount, 0) || 1;
    const byVendor = Array.from(vMap.values())
      .sort((a, b) => b.amount - a.amount)
      .map((v) => ({
        ...v,
        sharePercent: Number(((v.amount / totalAllVendorSpend) * 100).toFixed(1)),
      }));

    const itemMap = new Map<
      string,
      {
        description: string;
        vendorName: string;
        totalSpend: number;
        totalQty: number;
        unit: string;
        prices: { date: string; price: number }[];
      }
    >();
    bills.forEach((b) => {
      b.lineItems.forEach((li) => {
        const key = li.description.trim();
        const curr = itemMap.get(key) ?? {
          description: key,
          vendorName: b.vendorName,
          totalSpend: 0,
          totalQty: 0,
          unit: li.unit,
          prices: [],
        };
        curr.totalSpend += li.total;
        curr.totalQty += li.quantity;
        curr.prices.push({ date: b.invoiceDate, price: li.unitPrice });
        itemMap.set(key, curr);
      });
    });

    const topItems = Array.from(itemMap.values())
      .map((item) => {
        const sortedPrices = [...item.prices].sort((a, b) => a.date.localeCompare(b.date));
        const firstPrice = sortedPrices[0]?.price ?? 0;
        const latestPrice = sortedPrices[sortedPrices.length - 1]?.price ?? 0;
        const avgPrice =
          sortedPrices.reduce((s, p) => s + p.price, 0) / Math.max(1, sortedPrices.length);
        const changePct = firstPrice > 0 ? ((latestPrice - firstPrice) / firstPrice) * 100 : 0;
        return {
          description: item.description,
          vendorName: item.vendorName,
          totalSpend: Number(item.totalSpend.toFixed(2)),
          totalQty: item.totalQty,
          unit: item.unit,
          avgPrice: Number(avgPrice.toFixed(2)),
          latestPrice: Number(latestPrice.toFixed(2)),
          changePct: Number(changePct.toFixed(1)),
          occurrences: sortedPrices.length,
        };
      })
      .sort((a, b) => b.totalSpend - a.totalSpend);

    const cgstTotal = bills.reduce((s, b) => s + b.cgst, 0);
    const sgstTotal = bills.reduce((s, b) => s + b.sgst, 0);
    const igstTotal = bills.reduce((s, b) => s + b.igst, 0);

    const totalBilled = bills.reduce((s, b) => s + b.totalAmount, 0);
    const totalPaid = bills.reduce((s, b) => s + b.amountPaid, 0);
    const totalUnpaid = Math.max(0, totalBilled - totalPaid);
    const overdueBills = bills.filter((b) => b.paymentStatus === "Overdue");
    const overdueTotal = overdueBills.reduce(
      (s, b) => s + Math.max(0, b.totalAmount - b.amountPaid),
      0
    );

    const delays: number[] = [];
    payments.forEach((p) => {
      const b = bills.find((bill) => bill.id === p.billId);
      if (b) {
        const inv = parseISO(b.invoiceDate).getTime();
        const pay = parseISO(p.paymentDate).getTime();
        const diffDays = Math.max(0, Math.round((pay - inv) / 86400000));
        delays.push(diffDays);
      }
    });
    const avgPaymentDays =
      delays.length > 0 ? Math.round(delays.reduce((a, b) => a + b, 0) / delays.length) : 14;

    return {
      monthlyTrend,
      byCategory,
      byVendor,
      topItems,
      taxSummary: {
        cgst: Number(cgstTotal.toFixed(2)),
        sgst: Number(sgstTotal.toFixed(2)),
        igst: Number(igstTotal.toFixed(2)),
        total: Number((cgstTotal + sgstTotal + igstTotal).toFixed(2)),
      },
      paymentSummary: {
        totalBilled: Number(totalBilled.toFixed(2)),
        totalPaid: Number(totalPaid.toFixed(2)),
        totalUnpaid: Number(totalUnpaid.toFixed(2)),
        overdueTotal: Number(overdueTotal.toFixed(2)),
        overdueCount: overdueBills.length,
        avgPaymentDays,
      },
      activeVendorsCount: vendors.filter((v) => v.status === "Active").length,
    };
  },
};
