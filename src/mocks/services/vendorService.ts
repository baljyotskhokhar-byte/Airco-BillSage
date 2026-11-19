import { STORAGE_KEYS } from "@/lib/constants";
import { SEED_VENDORS } from "@/mocks/data/seed";
import type { Vendor, VendorStatus } from "@/types";
import { notificationService } from "./notificationService";
import { readStorage, simulateLatency, writeStorage } from "./storage";

function getVendors(): Vendor[] {
  return readStorage<Vendor[]>(STORAGE_KEYS.VENDORS, SEED_VENDORS);
}

export interface UpsertVendorInput {
  name: string;
  gstin: string;
  email: string;
  phone: string;
  address: string;
  pinCode: string;
  state: string;
  category?: string;
  notes?: string;
}

export const vendorService = {
  async list(): Promise<Vendor[]> {
    await simulateLatency(120);
    return getVendors().sort((a, b) => a.name.localeCompare(b.name));
  },

  async getById(id: string): Promise<Vendor | undefined> {
    await simulateLatency(100);
    return getVendors().find((v) => v.id === id);
  },

  async create(input: UpsertVendorInput): Promise<Vendor> {
    await simulateLatency(260);
    const current = getVendors();
    const created: Vendor = {
      id: `vnd-${Date.now().toString(36)}`,
      name: input.name.trim(),
      gstin: input.gstin.trim().toUpperCase(),
      email: input.email.trim(),
      phone: input.phone.trim(),
      address: input.address.trim(),
      pinCode: input.pinCode.trim(),
      state: input.state,
      category: input.category ?? "General Supplies",
      status: "Active",
      notes: input.notes?.trim() ?? "",
      createdAt: new Date().toISOString(),
    };
    writeStorage(STORAGE_KEYS.VENDORS, [created, ...current]);
    notificationService.push({
      type: "vendor_added",
      title: `Vendor added: ${created.name}`,
      description: `GSTIN ${created.gstin} registered in directory.`,
      linkTo: `/vendors/${created.id}`,
    });
    notificationService.pushActivity({
      type: "vendor_added",
      title: "Vendor added",
      detail: `${created.name} (${created.gstin}) added to directory`,
      actor: "Arjun Deshmukh",
      linkTo: `/vendors/${created.id}`,
    });
    return created;
  },

  async update(id: string, input: Partial<UpsertVendorInput> & { status?: VendorStatus }): Promise<Vendor> {
    await simulateLatency(220);
    const current = getVendors();
    let updatedVendor: Vendor | undefined;
    const next = current.map((v) => {
      if (v.id !== id) return v;
      updatedVendor = {
        ...v,
        ...input,
        gstin: input.gstin ? input.gstin.trim().toUpperCase() : v.gstin,
      };
      return updatedVendor;
    });
    if (!updatedVendor) {
      throw new Error("Vendor not found.");
    }
    writeStorage(STORAGE_KEYS.VENDORS, next);
    return updatedVendor;
  },

  async toggleArchive(id: string): Promise<Vendor> {
    const existing = getVendors().find((v) => v.id === id);
    if (!existing) throw new Error("Vendor not found.");
    const nextStatus: VendorStatus = existing.status === "Active" ? "Archived" : "Active";
    return this.update(id, { status: nextStatus });
  },
};
