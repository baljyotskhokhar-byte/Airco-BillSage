export type PaymentStatus = "Paid" | "Partially Paid" | "Unpaid" | "Overdue";
export type ReviewStatus = "Processing" | "Needs Review" | "Confirmed" | "Failed";
export type VendorStatus = "Active" | "Archived";
export type PaymentMethod = "Bank Transfer" | "UPI" | "Cheque" | "Cash" | "Other";
export type ConfidenceLevel = "high" | "attention" | "missing";

export interface UserProfile {
  id: string;
  fullName: string;
  username: string;
  email: string;
  phone: string;
  address: string;
  pinCode: string;
  role: string;
  avatarUrl?: string;
}

export interface WorkspaceSettings {
  workspaceName: string;
  legalName: string;
  gstin: string;
  pan: string;
  businessAddress: string;
  pinCode: string;
  state: string;
  defaultPaymentTermsDays: number;
  defaultGstTreatment: "CGST_SGST" | "IGST";
  invoicePrefix: string;
}

export interface UserPreferences {
  currency: "INR";
  dateFormat: "dd MMM yyyy" | "dd/MM/yyyy" | "yyyy-MM-dd";
  timezone: string;
  theme: "light" | "dark" | "system";
  notifications: {
    billUploaded: boolean;
    needsReview: boolean;
    overdueReminders: boolean;
    paymentRecorded: boolean;
    weeklySummary: boolean;
  };
}

export interface Vendor {
  id: string;
  name: string;
  gstin: string;
  email: string;
  phone: string;
  address: string;
  pinCode: string;
  state: string;
  status: VendorStatus;
  category: string;
  notes?: string;
  createdAt: string;
}

export interface BillLineItem {
  id: string;
  description: string;
  hsnSac: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  taxableValue: number;
  gstRate: number;
  taxAmount: number;
  total: number;
  confidence?: ConfidenceLevel;
}

export interface BillConfidenceMap {
  invoiceNumber?: ConfidenceLevel;
  vendorName?: ConfidenceLevel;
  vendorGstin?: ConfidenceLevel;
  invoiceDate?: ConfidenceLevel;
  dueDate?: ConfidenceLevel;
  poNumber?: ConfidenceLevel;
  placeOfSupply?: ConfidenceLevel;
  lineItems?: ConfidenceLevel;
}

export interface Bill {
  id: string;
  invoiceNumber: string;
  vendorId: string;
  vendorName: string;
  vendorGstin: string;
  category: string;
  invoiceDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  poNumber?: string;
  billingAddress: string;
  shippingAddress: string;
  placeOfSupply: string;
  lineItems: BillLineItem[];
  subtotal: number;
  discountTotal: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  otherCharges: number;
  roundOff: number;
  totalAmount: number;
  amountPaid: number;
  paymentStatus: PaymentStatus;
  reviewStatus: ReviewStatus;
  fileName: string;
  fileType: "PDF" | "JPG" | "PNG";
  fileSizeBytes: number;
  previewDataUrl?: string;
  confidence?: BillConfidenceMap;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  billId: string;
  invoiceNumber: string;
  vendorId: string;
  vendorName: string;
  paymentDate: string; // YYYY-MM-DD
  amount: number;
  method: PaymentMethod;
  referenceNumber: string;
  status: "Completed" | "Cleared" | "Pending";
  notes?: string;
  createdAt: string;
}

export interface BankTransaction {
  id: string;
  valueDate: string; // YYYY-MM-DD
  postDate: string; // YYYY-MM-DD
  description: string;
  chequeNo: string;
  debit: number;
  credit: number;
  balance: number;
  method?: PaymentMethod;
  billId?: string;
  invoiceNumber?: string;
  vendorId?: string;
  vendorName?: string;
  category: "Vendor Payment" | "Customer Receipt" | "Bank Fee" | "Payroll / Ops";
}

export interface AppNotification {
  id: string;
  type: "bill_uploaded" | "needs_review" | "payment_overdue" | "vendor_added" | "payment_recorded";
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  linkTo: string;
}

export interface ActivityEvent {
  id: string;
  type: "bill_uploaded" | "bill_confirmed" | "payment_recorded" | "vendor_added";
  title: string;
  detail: string;
  timestamp: string;
  actor: string;
  linkTo?: string;
}
