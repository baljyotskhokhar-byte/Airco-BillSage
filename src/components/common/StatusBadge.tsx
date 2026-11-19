import { Badge } from "@/components/ui/badge";
import type { PaymentStatus, ReviewStatus, VendorStatus } from "@/types";

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const variant =
    status === "Paid"
      ? "teal"
      : status === "Partially Paid"
        ? "slate"
        : status === "Overdue"
          ? "burgundy"
          : "plum";

  return <Badge variant={variant}>{status}</Badge>;
}

export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  const variant =
    status === "Confirmed"
      ? "teal"
      : status === "Needs Review"
        ? "gold"
        : status === "Processing"
          ? "navy"
          : "danger";

  return <Badge variant={variant}>{status}</Badge>;
}

export function VendorStatusBadge({ status }: { status: VendorStatus }) {
  return <Badge variant={status === "Active" ? "teal" : "neutral"}>{status}</Badge>;
}
