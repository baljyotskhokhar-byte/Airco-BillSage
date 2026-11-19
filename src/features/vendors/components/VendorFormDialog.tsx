import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { INDIAN_STATES } from "@/lib/constants";
import type { Vendor } from "@/types";

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PIN_REGEX = /^[1-9][0-9]{5}$/;

const vendorSchema = z.object({
  name: z.string().trim().min(2, "Vendor name is required"),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(GSTIN_REGEX, "Enter a valid 15-character Indian GSTIN (e.g. 27AAACT2727Q1ZW)"),
  email: z.string().trim().email("Enter a valid email address"),
  phone: z.string().trim().min(8, "Enter a valid contact phone number"),
  address: z.string().trim().min(5, "Address is required"),
  pinCode: z.string().trim().regex(PIN_REGEX, "Enter a valid 6-digit PIN code"),
  state: z.string().min(2, "Select a state"),
  notes: z.string().optional(),
});

export type VendorFormValues = z.infer<typeof vendorSchema>;

interface VendorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor?: Vendor | null;
  onSubmitVendor: (values: VendorFormValues) => Promise<void>;
}

export function VendorFormDialog({
  open,
  onOpenChange,
  vendor,
  onSubmitVendor,
}: VendorFormDialogProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<VendorFormValues>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      name: vendor?.name ?? "",
      gstin: vendor?.gstin ?? "",
      email: vendor?.email ?? "",
      phone: vendor?.phone ?? "",
      address: vendor?.address ?? "",
      pinCode: vendor?.pinCode ?? "",
      state: vendor?.state ?? "Maharashtra",
      notes: vendor?.notes ?? "",
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({
        name: vendor?.name ?? "",
        gstin: vendor?.gstin ?? "",
        email: vendor?.email ?? "",
        phone: vendor?.phone ?? "",
        address: vendor?.address ?? "",
        pinCode: vendor?.pinCode ?? "",
        state: vendor?.state ?? "Maharashtra",
        notes: vendor?.notes ?? "",
      });
    }
  }, [open, vendor, reset]);

  const submit = async (values: VendorFormValues) => {
    await onSubmitVendor(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{vendor ? "Edit vendor" : "Add vendor"}</DialogTitle>
          <DialogDescription>
            {vendor
              ? "Update supplier tax registration and contact details."
              : "Register a new supplier with GSTIN and billing address."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="vnd-name">Vendor name</Label>
              <Input
                id="vnd-name"
                placeholder="Apex Industrial Components Pvt. Ltd."
                {...register("name")}
              />
              {errors.name && (
                <p className="text-[12px] text-[var(--status-danger)]">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="vnd-gstin">GSTIN</Label>
              <Input
                id="vnd-gstin"
                placeholder="27AAACA1234B1Z5"
                maxLength={15}
                className="font-mono-data uppercase"
                {...register("gstin")}
              />
              {errors.gstin && (
                <p className="text-[12px] text-[var(--status-danger)]">{errors.gstin.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="vnd-phone">Phone</Label>
              <Input id="vnd-phone" placeholder="+91 22 4012 8800" {...register("phone")} />
              {errors.phone && (
                <p className="text-[12px] text-[var(--status-danger)]">{errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="vnd-email">Email</Label>
              <Input
                id="vnd-email"
                type="email"
                placeholder="accounts@supplier.in"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-[12px] text-[var(--status-danger)]">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="vnd-address">Address</Label>
              <Input
                id="vnd-address"
                placeholder="Plot 45, MIDC Phase II, Pune"
                {...register("address")}
              />
              {errors.address && (
                <p className="text-[12px] text-[var(--status-danger)]">{errors.address.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="vnd-pin">PIN code</Label>
              <Input id="vnd-pin" placeholder="411019" maxLength={6} {...register("pinCode")} />
              {errors.pinCode && (
                <p className="text-[12px] text-[var(--status-danger)]">{errors.pinCode.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>State</Label>
              <Controller
                name="state"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDIAN_STATES.map((st) => (
                        <SelectItem key={st} value={st}>
                          {st}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.state && (
                <p className="text-[12px] text-[var(--status-danger)]">{errors.state.message}</p>
              )}
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="vnd-notes">Notes</Label>
              <Textarea
                id="vnd-notes"
                placeholder="Payment terms, contact person, or supply notes..."
                {...register("notes")}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {vendor ? "Save changes" : "Add vendor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
