import { addDays, format, parseISO } from "date-fns";
import { STORAGE_KEYS } from "@/lib/constants";
import { formatINR } from "@/lib/formatters";
import { SEED_BILLS, SEED_PAYMENTS } from "@/mocks/data/seed";
import type { BankTransaction, Bill, Payment, PaymentMethod, PaymentStatus } from "@/types";
import { notificationService } from "./notificationService";
import { readStorage, simulateLatency, writeStorage } from "./storage";

function getPayments(): Payment[] {
  return readStorage<Payment[]>(STORAGE_KEYS.PAYMENTS, SEED_PAYMENTS);
}

function getBills(): Bill[] {
  return readStorage<Bill[]>(STORAGE_KEYS.BILLS, SEED_BILLS);
}

interface StoredCreditEntry {
  id: string;
  valueDate: string;
  postDate: string;
  description: string;
  chequeNo: string;
  credit: number;
  debit?: number;
  category: BankTransaction["category"];
}

const SEED_BANK_ENTRIES: StoredCreditEntry[] = [
  {
    id: "bnk-open-01",
    valueDate: "2026-08-18",
    postDate: "2026-08-18",
    description: "NEFT INWARD — Mahindra Aero Assemblies Pvt. Ltd. (AR Settlement)",
    chequeNo: "NEFT-ICIC-20194412",
    credit: 1450000,
    category: "Customer Receipt",
  },
  {
    id: "bnk-ops-01",
    valueDate: "2026-09-01",
    postDate: "2026-09-01",
    description: "ACH DEBIT — August Payroll & Statutory PF Remittance",
    chequeNo: "ACH-PAY-092601",
    credit: 0,
    debit: 320000,
    category: "Payroll / Ops",
  },
  {
    id: "bnk-open-02",
    valueDate: "2026-09-18",
    postDate: "2026-09-19",
    description: "RTGS INWARD — Larsen Precision Automation (Invoice AR-26/408)",
    chequeNo: "RTGS-SBIN-55190024",
    credit: 980000,
    category: "Customer Receipt",
  },
  {
    id: "bnk-fee-01",
    valueDate: "2026-09-30",
    postDate: "2026-09-30",
    description: "HDFC Corporate Banking Quarterly Account & RTGS Charges",
    chequeNo: "CHG-Q3-2026",
    credit: 0,
    debit: 1416,
    category: "Bank Fee",
  },
  {
    id: "bnk-open-03",
    valueDate: "2026-10-16",
    postDate: "2026-10-16",
    description: "NEFT INWARD — Kirloskar Pneumatic Systems Ltd. (Batch 14)",
    chequeNo: "NEFT-AXIS-88120941",
    credit: 1120000,
    category: "Customer Receipt",
  },
  {
    id: "bnk-open-04",
    valueDate: "2026-11-05",
    postDate: "2026-11-06",
    description: "RTGS INWARD — Bharat Forge Components Div. (Order #BF-719)",
    chequeNo: "RTGS-HDFC-99012844",
    credit: 840000,
    category: "Customer Receipt",
  },
];

const OPENING_BALANCE = 850000;

export interface RecordPaymentInput {
  billId: string;
  paymentDate: string;
  amount: number;
  method: PaymentMethod;
  referenceNumber: string;
  notes?: string;
}

export interface AddDepositInput {
  valueDate: string;
  description: string;
  chequeNo: string;
  amount: number;
}

export const paymentService = {
  async list(): Promise<Payment[]> {
    await simulateLatency(110);
    return getPayments().sort(
      (a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
    );
  },

  async listByBill(billId: string): Promise<Payment[]> {
    await simulateLatency(80);
    return getPayments()
      .filter((p) => p.billId === billId)
      .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
  },

  async getBankStatement(): Promise<{
    accountName: string;
    accountNumber: string;
    ifsc: string;
    openingBalance: number;
    closingBalance: number;
    totalDebits: number;
    totalCredits: number;
    transactions: BankTransaction[];
  }> {
    await simulateLatency(120);
    const payments = getPayments();
    const extraCredits = readStorage<StoredCreditEntry[]>(
      STORAGE_KEYS.BANK_CREDITS,
      SEED_BANK_ENTRIES
    );

    const paymentRows: Omit<BankTransaction, "balance">[] = payments.map((p) => {
      const valueDate = p.paymentDate;
      const postDate =
        p.method === "Cheque"
          ? format(addDays(parseISO(p.paymentDate), 2), "yyyy-MM-dd")
          : p.paymentDate;
      const prefix =
        p.method === "UPI"
          ? "UPI OUTWARD"
          : p.method === "Cheque"
            ? "CHEQUE CLEARING"
            : p.method === "Cash"
              ? "CASH WITHDRAWAL"
              : "NEFT/RTGS OUTWARD";
      return {
        id: `stmt-${p.id}`,
        valueDate,
        postDate,
        description: `${prefix} — ${p.vendorName} (${p.invoiceNumber})${p.notes ? ` · ${p.notes}` : ""}`,
        chequeNo: p.referenceNumber || "—",
        debit: p.amount,
        credit: 0,
        method: p.method,
        billId: p.billId,
        invoiceNumber: p.invoiceNumber,
        vendorId: p.vendorId,
        vendorName: p.vendorName,
        category: "Vendor Payment",
      };
    });

    const otherRows: Omit<BankTransaction, "balance">[] = extraCredits.map((e) => ({
      id: e.id,
      valueDate: e.valueDate,
      postDate: e.postDate,
      description: e.description,
      chequeNo: e.chequeNo || "—",
      debit: e.debit ?? 0,
      credit: e.credit ?? 0,
      category: e.category,
    }));

    const chronological = [...otherRows, ...paymentRows].sort((a, b) => {
      const cmp = a.postDate.localeCompare(b.postDate);
      if (cmp !== 0) return cmp;
      return a.valueDate.localeCompare(b.valueDate);
    });

    let running = OPENING_BALANCE;
    const withBalance: BankTransaction[] = chronological.map((row) => {
      running = Number((running + row.credit - row.debit).toFixed(2));
      return { ...row, balance: running };
    });

    const totalDebits = withBalance.reduce((s, r) => s + r.debit, 0);
    const totalCredits = withBalance.reduce((s, r) => s + r.credit, 0);

    return {
      accountName: "HDFC Corporate Current Account",
      accountNumber: "50200084910429",
      ifsc: "HDFC0000240",
      openingBalance: OPENING_BALANCE,
      closingBalance: running,
      totalDebits: Number(totalDebits.toFixed(2)),
      totalCredits: Number(totalCredits.toFixed(2)),
      transactions: withBalance.reverse(), // Most recent first for ledger display
    };
  },

  async recordDeposit(input: AddDepositInput): Promise<void> {
    await simulateLatency(220);
    const existing = readStorage<StoredCreditEntry[]>(
      STORAGE_KEYS.BANK_CREDITS,
      SEED_BANK_ENTRIES
    );
    const entry: StoredCreditEntry = {
      id: `bnk-cr-${Date.now().toString(36)}`,
      valueDate: input.valueDate,
      postDate: input.valueDate,
      description: input.description.trim(),
      chequeNo: input.chequeNo.trim() || "NEFT-INWARD",
      credit: Number(input.amount.toFixed(2)),
      category: "Customer Receipt",
    };
    writeStorage(STORAGE_KEYS.BANK_CREDITS, [...existing, entry]);
  },

  async record(input: RecordPaymentInput): Promise<{ payment: Payment; bill: Bill }> {
    await simulateLatency(280);
    const bills = getBills();
    const targetBill = bills.find((b) => b.id === input.billId);
    if (!targetBill) {
      throw new Error("Selected bill could not be found.");
    }

    const outstanding = Number((targetBill.totalAmount - targetBill.amountPaid).toFixed(2));
    if (input.amount <= 0) {
      throw new Error("Payment amount must be greater than zero.");
    }
    if (input.amount > outstanding + 0.01) {
      throw new Error(
        `Payment amount cannot exceed the remaining balance of ${formatINR(outstanding)}.`
      );
    }

    const payment: Payment = {
      id: `pay-${Date.now().toString(36)}`,
      billId: targetBill.id,
      invoiceNumber: targetBill.invoiceNumber,
      vendorId: targetBill.vendorId,
      vendorName: targetBill.vendorName,
      paymentDate: input.paymentDate,
      amount: Number(input.amount.toFixed(2)),
      method: input.method,
      referenceNumber: input.referenceNumber.trim(),
      status: "Completed",
      notes: input.notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    const nextAmountPaid = Number((targetBill.amountPaid + payment.amount).toFixed(2));
    const remaining = Number((targetBill.totalAmount - nextAmountPaid).toFixed(2));
    const nextStatus: PaymentStatus =
      remaining <= 0.01
        ? "Paid"
        : nextAmountPaid > 0
          ? "Partially Paid"
          : targetBill.dueDate < "2026-11-19"
            ? "Overdue"
            : "Unpaid";

    const updatedBill: Bill = {
      ...targetBill,
      amountPaid: Math.min(targetBill.totalAmount, nextAmountPaid),
      paymentStatus: nextStatus,
      updatedAt: new Date().toISOString(),
    };

    const nextBills = bills.map((b) => (b.id === updatedBill.id ? updatedBill : b));
    const nextPayments = [payment, ...getPayments()];

    writeStorage(STORAGE_KEYS.BILLS, nextBills);
    writeStorage(STORAGE_KEYS.PAYMENTS, nextPayments);

    notificationService.push({
      type: "payment_recorded",
      title: "Bank debit recorded",
      description: `${formatINR(payment.amount)} via ${payment.method} for ${targetBill.invoiceNumber}.`,
      linkTo: "/bank-account",
    });
    notificationService.pushActivity({
      type: "payment_recorded",
      title: "Payment recorded",
      detail: `${formatINR(payment.amount)} via ${payment.method} to ${targetBill.vendorName}`,
      actor: "Arjun Deshmukh",
      linkTo: `/bills/${targetBill.id}`,
    });

    return { payment, bill: updatedBill };
  },
};
