export const STORAGE_KEYS = {
  AUTH_USER: "billsage_auth_user_v1",
  USERS: "billsage_users_v1",
  BILLS: "billsage_bills_v1",
  VENDORS: "billsage_vendors_v1",
  PAYMENTS: "billsage_payments_v1",
  BANK_CREDITS: "billsage_bank_credits_v1",
  NOTIFICATIONS: "billsage_notifications_v1",
  PREFERENCES: "billsage_preferences_v1",
  WORKSPACE: "billsage_workspace_v1",
  ACTIVITY: "billsage_activity_v1",
} as const;

export const JEWEL_CHART_PALETTE = [
  "#930031", // Royal Burgundy
  "#601D49", // Deep Plum
  "#133458", // Midnight Navy
  "#176B70", // Petrol Teal
  "#C39742", // Antique Gold
  "#813653", // Mulberry
  "#526E91", // Slate Blue
  "#C77C91", // Dusty Rose
] as const;

export const VENDOR_AVATAR_PALETTE = [
  { bg: "bg-[var(--brand-burgundy-bg)]", text: "text-[var(--brand-burgundy)]", border: "border-[var(--brand-burgundy)]/20" },
  { bg: "bg-[var(--brand-plum-bg)]", text: "text-[var(--brand-plum)]", border: "border-[var(--brand-plum)]/20" },
  { bg: "bg-[var(--brand-navy-bg)]", text: "text-[var(--brand-navy)]", border: "border-[var(--brand-navy)]/20" },
  { bg: "bg-[var(--brand-teal-bg)]", text: "text-[var(--brand-teal)]", border: "border-[var(--brand-teal)]/20" },
] as const;

export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu & Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Tamil Nadu",
  "Telangana",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
] as const;

export const EXPENSE_CATEGORIES = [
  "Cloud & Software",
  "Logistics & Freight",
  "Office Supplies & Hardware",
  "Professional Services",
  "Raw Materials",
  "Facilities & Utilities",
  "Marketing & Print",
] as const;

export const PAYMENT_METHODS = [
  "Bank Transfer",
  "UPI",
  "Cheque",
  "Cash",
  "Other",
] as const;
