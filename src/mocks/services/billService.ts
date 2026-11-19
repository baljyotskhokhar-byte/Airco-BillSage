import { STORAGE_KEYS } from "@/lib/constants";
import { SEED_BILLS, SEED_VENDORS } from "@/mocks/data/seed";
import type { Bill, BillLineItem, PaymentStatus, ReviewStatus } from "@/types";
import { notificationService } from "./notificationService";
import { readStorage, simulateLatency, writeStorage } from "./storage";

function getBills(): Bill[] {
  return readStorage<Bill[]>(STORAGE_KEYS.BILLS, SEED_BILLS);
}

export function recalculateBillTotals(bill: Bill): Bill {
  const lineItems: BillLineItem[] = bill.lineItems.map((item) => {
    const gross = item.quantity * item.unitPrice;
    const taxableValue = Math.max(0, gross - (item.discount || 0));
    const taxAmount = Number(((taxableValue * item.gstRate) / 100).toFixed(2));
    const total = Number((taxableValue + taxAmount).toFixed(2));
    return {
      ...item,
      taxableValue,
      taxAmount,
      total,
    };
  });

  const subtotal = Number(lineItems.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0).toFixed(2));
  const discountTotal = Number(lineItems.reduce((sum, i) => sum + (i.discount || 0), 0).toFixed(2));
  const taxableAmount = Number(lineItems.reduce((sum, i) => sum + i.taxableValue, 0).toFixed(2));
  const totalTax = Number(lineItems.reduce((sum, i) => sum + i.taxAmount, 0).toFixed(2));

  const isInterState = bill.igst > 0 && bill.cgst === 0 && bill.sgst === 0;
  const cgst = isInterState ? 0 : Number((totalTax / 2).toFixed(2));
  const sgst = isInterState ? 0 : Number((totalTax / 2).toFixed(2));
  const igst = isInterState ? totalTax : 0;

  const rawTotal = taxableAmount + cgst + sgst + igst + (bill.otherCharges || 0) + (bill.roundOff || 0);
  const totalAmount = Number(rawTotal.toFixed(2));

  let paymentStatus: PaymentStatus = bill.paymentStatus;
  if (bill.amountPaid >= totalAmount && totalAmount > 0) {
    paymentStatus = "Paid";
  } else if (bill.amountPaid > 0 && bill.amountPaid < totalAmount) {
    paymentStatus = "Partially Paid";
  } else if (bill.dueDate && bill.dueDate < "2026-11-19") {
    paymentStatus = "Overdue";
  } else {
    paymentStatus = "Unpaid";
  }

  return {
    ...bill,
    lineItems,
    subtotal,
    discountTotal,
    taxableAmount,
    cgst,
    sgst,
    igst,
    totalAmount,
    paymentStatus,
    updatedAt: new Date().toISOString(),
  };
}

export interface UploadedFilePayload {
  file: File;
  previewDataUrl?: string;
}

export interface CreateManualBillInput {
  vendorId: string;
  vendorGstin?: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  poNumber?: string;
  placeOfSupply: string;
  gstRegime: "CGST_SGST" | "IGST";
  lineItems: {
    description: string;
    hsnSac: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    discount: number;
    gstRate: number;
  }[];
  otherCharges?: number;
  roundOff?: number;
  reviewStatus?: ReviewStatus;
  notes?: string;
}

export const billService = {
  async list(): Promise<Bill[]> {
    await simulateLatency(130);
    return getBills().sort(
      (a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime()
    );
  },

  async getById(id: string): Promise<Bill | undefined> {
    await simulateLatency(100);
    return getBills().find((b) => b.id === id);
  },

  async listByVendor(vendorId: string): Promise<Bill[]> {
    await simulateLatency(100);
    return getBills()
      .filter((b) => b.vendorId === vendorId)
      .sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());
  },

  async createManual(input: CreateManualBillInput): Promise<Bill> {
    await simulateLatency(260);
    const vendors = readStorage(STORAGE_KEYS.VENDORS, SEED_VENDORS);
    const vendor = vendors.find((v) => v.id === input.vendorId) ?? vendors[0];
    const current = getBills();

    const rawItems: BillLineItem[] = input.lineItems.map((item, idx) => ({
      id: `li-man-${Date.now()}-${idx}`,
      description: item.description.trim(),
      hsnSac: item.hsnSac.trim() || "998315",
      quantity: item.quantity,
      unit: item.unit.trim() || "Units",
      unitPrice: item.unitPrice,
      discount: item.discount || 0,
      taxableValue: 0,
      gstRate: item.gstRate,
      taxAmount: 0,
      total: 0,
      confidence: "high",
    }));

    const baseBill: Bill = {
      id: `bill-${Date.now().toString(36)}`,
      invoiceNumber: input.invoiceNumber.trim(),
      vendorId: vendor.id,
      vendorName: vendor.name,
      vendorGstin: input.vendorGstin?.trim().toUpperCase() || vendor.gstin,
      category: vendor.category,
      invoiceDate: input.invoiceDate,
      dueDate: input.dueDate,
      poNumber: input.poNumber?.trim() || "",
      billingAddress: "Plot C-14, MIDC Industrial Area, Chakan, Pune, Maharashtra 410501",
      shippingAddress: "Plot C-14, MIDC Industrial Area, Chakan, Pune, Maharashtra 410501",
      placeOfSupply: input.placeOfSupply.trim() || "Maharashtra (27)",
      lineItems: rawItems,
      subtotal: 0,
      discountTotal: 0,
      taxableAmount: 0,
      cgst: input.gstRegime === "CGST_SGST" ? 1 : 0,
      sgst: input.gstRegime === "CGST_SGST" ? 1 : 0,
      igst: input.gstRegime === "IGST" ? 1 : 0,
      otherCharges: input.otherCharges || 0,
      roundOff: input.roundOff || 0,
      totalAmount: 0,
      amountPaid: 0,
      paymentStatus: "Unpaid",
      reviewStatus: input.reviewStatus ?? "Confirmed",
      fileName: `${input.invoiceNumber.replace(/[/\\]/g, "-")}-manual.pdf`,
      fileType: "PDF",
      fileSizeBytes: 184200,
      confidence: {
        invoiceNumber: "high",
        vendorName: "high",
        vendorGstin: "high",
        invoiceDate: "high",
        dueDate: "high",
        poNumber: "high",
        placeOfSupply: "high",
        lineItems: "high",
      },
      notes: input.notes?.trim() || "Entered manually into ledger.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const finalBill = recalculateBillTotals(baseBill);
    writeStorage(STORAGE_KEYS.BILLS, [finalBill, ...current]);

    notificationService.push({
      type: "bill_uploaded",
      title: `Manual bill added: ${finalBill.invoiceNumber}`,
      description: `${finalBill.vendorName} logged manually.`,
      linkTo: `/bills/${finalBill.id}`,
    });
    notificationService.pushActivity({
      type: "bill_confirmed",
      title: "Manual bill created",
      detail: `${finalBill.invoiceNumber} from ${finalBill.vendorName} added`,
      actor: "Arjun Deshmukh",
      linkTo: `/bills/${finalBill.id}`,
    });

    return finalBill;
  },

  async update(id: string, patch: Partial<Bill>): Promise<Bill> {
    await simulateLatency(220);
    const current = getBills();
    let updated: Bill | undefined;
    const next = current.map((b) => {
      if (b.id !== id) return b;
      const merged: Bill = { ...b, ...patch };
      updated = recalculateBillTotals(merged);
      return updated;
    });
    if (!updated) throw new Error("Bill not found.");
    writeStorage(STORAGE_KEYS.BILLS, next);
    return updated;
  },

  async confirmBill(id: string, patch: Partial<Bill>): Promise<Bill> {
    await simulateLatency(300);
    const current = getBills();
    let updated: Bill | undefined;
    const next = current.map((b) => {
      if (b.id !== id) return b;
      const merged: Bill = {
        ...b,
        ...patch,
        reviewStatus: "Confirmed" as ReviewStatus,
        confidence: {
          invoiceNumber: "high",
          vendorName: "high",
          vendorGstin: "high",
          invoiceDate: "high",
          dueDate: "high",
          poNumber: "high",
          placeOfSupply: "high",
          lineItems: "high",
        },
      };
      updated = recalculateBillTotals(merged);
      return updated;
    });
    if (!updated) throw new Error("Bill not found.");
    writeStorage(STORAGE_KEYS.BILLS, next);
    notificationService.pushActivity({
      type: "bill_confirmed",
      title: "Bill confirmed",
      detail: `${updated.invoiceNumber} from ${updated.vendorName} confirmed`,
      actor: "Arjun Deshmukh",
      linkTo: `/bills/${updated.id}`,
    });
    return updated;
  },

  async deleteDraft(id: string): Promise<void> {
    await simulateLatency(180);
    const next = getBills().filter((b) => b.id !== id);
    writeStorage(STORAGE_KEYS.BILLS, next);
  },

  async simulateUpload(files: UploadedFilePayload[]): Promise<Bill[]> {
    await simulateLatency(400);
    const vendors = readStorage(STORAGE_KEYS.VENDORS, SEED_VENDORS);
    const current = getBills();

    const createdBills: Bill[] = files.map((payload, idx) => {
      const f = payload.file;
      const ext = f.name.split(".").pop()?.toUpperCase();
      const fileType: "PDF" | "JPG" | "PNG" =
        ext === "PNG" ? "PNG" : ext === "JPG" || ext === "JPEG" ? "JPG" : "PDF";

      const sampleVendor = vendors[idx % Math.min(5, vendors.length)];
      const randNum = Math.floor(1200 + Math.random() * 8500);
      const isInterState = sampleVendor.state !== "Maharashtra";

      const unitPrice = 1480 + idx * 320;
      const qty = 25 + idx * 10;
      const taxable = unitPrice * qty;
      const taxAmt = Number((taxable * 0.18).toFixed(2));
      const totalAmt = Number((taxable + taxAmt).toFixed(2));

      const bill: Bill = {
        id: `bill-${Date.now().toString(36)}-${idx}`,
        invoiceNumber: `INV/26-27/${randNum}`,
        vendorId: sampleVendor.id,
        vendorName: sampleVendor.name,
        vendorGstin: sampleVendor.gstin,
        category: sampleVendor.category,
        invoiceDate: "2026-11-19",
        dueDate: "2026-12-19",
        poNumber: idx % 2 === 0 ? `PO-2026-${900 + idx}` : "",
        billingAddress: "Plot C-14, MIDC Industrial Area, Chakan, Pune, Maharashtra 410501",
        shippingAddress: "Plot C-14, MIDC Industrial Area, Chakan, Pune, Maharashtra 410501",
        placeOfSupply: "Maharashtra (27)",
        lineItems: [
          {
            id: `li-new-${Date.now()}-${idx}-1`,
            description:
              sampleVendor.category === "Raw Materials"
                ? "Cold Rolled Steel Sheet 2mm (CRCA Grade)"
                : sampleVendor.category === "Logistics & Freight"
                  ? "Priority Air Cargo Dispatches"
                  : "Monthly Enterprise Service Retainer",
            hsnSac: sampleVendor.category === "Raw Materials" ? "720916" : "998315",
            quantity: qty,
            unit: sampleVendor.category === "Raw Materials" ? "Kg" : "Units",
            unitPrice,
            discount: 0,
            taxableValue: taxable,
            gstRate: 18,
            taxAmount: taxAmt,
            total: totalAmt,
            confidence: idx % 2 === 0 ? "high" : "attention",
          },
        ],
        subtotal: taxable,
        discountTotal: 0,
        taxableAmount: taxable,
        cgst: isInterState ? 0 : Number((taxAmt / 2).toFixed(2)),
        sgst: isInterState ? 0 : Number((taxAmt / 2).toFixed(2)),
        igst: isInterState ? taxAmt : 0,
        otherCharges: 0,
        roundOff: 0,
        totalAmount: totalAmt,
        amountPaid: 0,
        paymentStatus: "Unpaid",
        reviewStatus: "Needs Review",
        fileName: f.name,
        fileType,
        fileSizeBytes: f.size,
        previewDataUrl: payload.previewDataUrl,
        confidence: {
          invoiceNumber: "high",
          vendorName: "high",
          vendorGstin: "high",
          invoiceDate: "high",
          dueDate: "attention",
          poNumber: idx % 2 === 0 ? "high" : "missing",
          placeOfSupply: "high",
          lineItems: idx % 2 === 0 ? "high" : "attention",
        },
        notes: "Simulated demo extraction ready for review and confirmation.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      notificationService.push({
        type: "bill_uploaded",
        title: `Invoice uploaded: ${f.name}`,
        description: `Mock extraction prepared (${bill.invoiceNumber}) — ready for review.`,
        linkTo: `/bills/${bill.id}/review`,
      });
      notificationService.pushActivity({
        type: "bill_uploaded",
        title: "Bill uploaded",
        detail: `${f.name} queued as ${bill.invoiceNumber}`,
        actor: "Arjun Deshmukh",
        linkTo: `/bills/${bill.id}/review`,
      });

      return bill;
    });

    writeStorage(STORAGE_KEYS.BILLS, [...createdBills, ...current]);
    return createdBills;
  },
};
