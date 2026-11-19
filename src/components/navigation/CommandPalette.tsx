import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Command } from "cmdk";
import {
  AlertCircle,
  BarChart3,
  Building2,
  CreditCard,
  FilePlus2,
  FileText,
  LayoutDashboard,
  Plus,
  Search,
  Settings,
  UserPlus,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { formatINR } from "@/lib/formatters";
import { billService } from "@/mocks/services/billService";
import { vendorService } from "@/mocks/services/vendorService";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  const { data: bills = [] } = useQuery({
    queryKey: ["bills"],
    queryFn: () => billService.list(),
    enabled: open,
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors"],
    queryFn: () => vendorService.list(),
    enabled: open,
  });

  const runAndClose = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden max-w-[560px]">
        <DialogTitle className="sr-only">Command palette search</DialogTitle>
        <Command
          label="Global search and commands"
          className="flex flex-col bg-[var(--bg-elevated)] text-[var(--text-primary)]"
        >
          <div className="flex items-center gap-2.5 border-b border-[var(--border-subtle)] px-4 py-3">
            <Search className="h-4 w-4 text-[var(--text-secondary)] shrink-0" />
            <Command.Input
              placeholder="Search bills, vendors, pages, or actions..."
              className="w-full bg-transparent text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
            />
          </div>

          <Command.List className="max-h-[360px] overflow-y-auto p-2 space-y-2">
            <Command.Empty className="py-8 text-center text-[13px] text-[var(--text-secondary)]">
              No matching bills, vendors, or actions found.
            </Command.Empty>

            <Command.Group
              heading="Quick actions"
              className="px-1 text-[11px] font-medium text-[var(--text-secondary)]"
            >
              <CommandItem onSelect={() => runAndClose("/bills?action=upload")}>
                <FilePlus2 className="h-4 w-4 text-[var(--brand-burgundy)]" />
                <span>Upload a bill</span>
                <span className="ml-auto text-[11px] text-[var(--text-muted)]">Action</span>
              </CommandItem>
              <CommandItem onSelect={() => runAndClose("/bills?action=manual")}>
                <Plus className="h-4 w-4 text-[var(--brand-plum)]" />
                <span>Add bill manually</span>
                <span className="ml-auto text-[11px] text-[var(--text-muted)]">Action</span>
              </CommandItem>
              <CommandItem onSelect={() => runAndClose("/vendors?action=new")}>
                <UserPlus className="h-4 w-4 text-[var(--brand-navy)]" />
                <span>Add a vendor</span>
                <span className="ml-auto text-[11px] text-[var(--text-muted)]">Action</span>
              </CommandItem>
              <CommandItem onSelect={() => runAndClose("/bills?payment=Overdue")}>
                <AlertCircle className="h-4 w-4 text-[var(--brand-burgundy)]" />
                <span>View overdue bills</span>
                <span className="ml-auto text-[11px] text-[var(--text-muted)]">Filter</span>
              </CommandItem>
              <CommandItem onSelect={() => runAndClose("/bank-account?action=record")}>
                <Plus className="h-4 w-4 text-[var(--brand-teal)]" />
                <span>Record a bank payment</span>
                <span className="ml-auto text-[11px] text-[var(--text-muted)]">Action</span>
              </CommandItem>
            </Command.Group>

            <Command.Group
              heading="Pages"
              className="px-1 text-[11px] font-medium text-[var(--text-secondary)]"
            >
              <CommandItem onSelect={() => runAndClose("/dashboard")}>
                <LayoutDashboard className="h-4 w-4 text-[var(--text-secondary)]" />
                <span>Open Dashboard</span>
              </CommandItem>
              <CommandItem onSelect={() => runAndClose("/bills")}>
                <FileText className="h-4 w-4 text-[var(--text-secondary)]" />
                <span>Bills Ledger</span>
              </CommandItem>
              <CommandItem onSelect={() => runAndClose("/vendors")}>
                <Building2 className="h-4 w-4 text-[var(--text-secondary)]" />
                <span>Vendor Directory</span>
              </CommandItem>
              <CommandItem onSelect={() => runAndClose("/bank-account")}>
                <CreditCard className="h-4 w-4 text-[var(--text-secondary)]" />
                <span>Bank Account Statement</span>
              </CommandItem>
              <CommandItem onSelect={() => runAndClose("/analytics")}>
                <BarChart3 className="h-4 w-4 text-[var(--text-secondary)]" />
                <span>Financial Analytics</span>
              </CommandItem>
              <CommandItem onSelect={() => runAndClose("/settings")}>
                <Settings className="h-4 w-4 text-[var(--text-secondary)]" />
                <span>Open Settings</span>
              </CommandItem>
            </Command.Group>

            {bills.length > 0 && (
              <Command.Group
                heading="Bills"
                className="px-1 text-[11px] font-medium text-[var(--text-secondary)]"
              >
                {bills.slice(0, 6).map((bill) => (
                  <CommandItem
                    key={bill.id}
                    value={`${bill.invoiceNumber} ${bill.vendorName} ${bill.paymentStatus}`}
                    onSelect={() =>
                      runAndClose(
                        bill.reviewStatus === "Needs Review"
                          ? `/bills/${bill.id}/review`
                          : `/bills/${bill.id}`
                      )
                    }
                  >
                    <FileText className="h-4 w-4 text-[var(--text-secondary)] shrink-0" />
                    <span className="font-mono-data text-[12px]">{bill.invoiceNumber}</span>
                    <span className="text-[var(--text-secondary)] truncate">
                      {bill.vendorName}
                    </span>
                    <span className="ml-auto font-mono-data text-[12px] text-[var(--text-primary)] tabular-nums">
                      {formatINR(bill.totalAmount)}
                    </span>
                  </CommandItem>
                ))}
              </Command.Group>
            )}

            {vendors.length > 0 && (
              <Command.Group
                heading="Vendors"
                className="px-1 text-[11px] font-medium text-[var(--text-secondary)]"
              >
                {vendors.slice(0, 5).map((vendor) => (
                  <CommandItem
                    key={vendor.id}
                    value={`${vendor.name} ${vendor.gstin} ${vendor.state}`}
                    onSelect={() => runAndClose(`/vendors/${vendor.id}`)}
                  >
                    <Building2 className="h-4 w-4 text-[var(--text-secondary)] shrink-0" />
                    <span className="truncate">{vendor.name}</span>
                    <span className="ml-auto font-mono-data text-[11px] text-[var(--text-muted)]">
                      {vendor.gstin}
                    </span>
                  </CommandItem>
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

function CommandItem({
  children,
  onSelect,
  value,
}: {
  children: React.ReactNode;
  onSelect: () => void;
  value?: string;
}) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-normal text-[var(--text-primary)] cursor-pointer aria-selected:bg-[var(--brand-plum-bg)]/60 aria-selected:text-[var(--brand-plum)] transition-colors"
    >
      {children}
    </Command.Item>
  );
}
