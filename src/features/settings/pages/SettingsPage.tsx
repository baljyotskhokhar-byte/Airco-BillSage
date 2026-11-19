import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, Eye, EyeOff, Laptop, Loader2, Shield, Sliders, Upload, User } from "lucide-react";
import { toast } from "sonner";
import { useAppContext } from "@/app/providers";
import { PageHeader } from "@/components/common/PageHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ElevatedCard } from "@/components/ui/card";
import { Switch } from "@/components/ui/controls";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { INDIAN_STATES } from "@/lib/constants";
import { authService } from "@/mocks/services/authService";
import { settingsService } from "@/mocks/services/settingsService";
import type { UserPreferences, WorkspaceSettings } from "@/types";
import { cn } from "@/lib/utils";

type SettingsSection = "profile" | "security" | "preferences" | "workspace";

const SECTIONS: { id: SettingsSection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "profile", label: "Personal profile", icon: User },
  { id: "security", label: "Account security", icon: Shield },
  { id: "preferences", label: "Preferences", icon: Sliders },
  { id: "workspace", label: "Workspace", icon: Building2 },
];

const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required"),
  username: z.string().trim().min(3, "Username must be at least 3 characters"),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().min(8, "Enter a valid phone number"),
  address: z.string().trim().min(5, "Enter your address"),
  pinCode: z.string().trim().regex(/^[1-9][0-9]{5}$/, "Enter a valid 6-digit PIN code"),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter current password"),
    newPassword: z.string().min(1, "Enter new password"),
    confirmPassword: z.string().min(1, "Confirm new password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const workspaceSchema = z.object({
  workspaceName: z.string().trim().min(2, "Workspace name is required"),
  legalName: z.string().trim().min(2, "Legal name is required"),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Enter a valid 15-char GSTIN"),
  businessAddress: z.string().trim().min(5, "Business address is required"),
  pinCode: z.string().trim().regex(/^[1-9][0-9]{5}$/, "Enter a valid 6-digit PIN code"),
  state: z.string().min(2),
  defaultPaymentTermsDays: z.number().min(0).max(180),
  defaultGstTreatment: z.enum(["CGST_SGST", "IGST"]),
  invoicePrefix: z.string().trim().min(1),
});

export function SettingsPage() {
  const { user, setUser, preferences, setPreferences } = useAppContext();
  const [section, setSection] = React.useState<SettingsSection>("profile");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Manage your profile, security credentials, workspace preferences, and GST configuration."
      />

      {/* Mobile Section Selector */}
      <div className="md:hidden">
        <Select value={section} onValueChange={(v) => setSection(v as SettingsSection)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SECTIONS.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Desktop Left Navigation */}
        <aside className="hidden md:block md:col-span-3">
          <nav aria-label="Settings sections" className="space-y-1">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const active = section === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSection(s.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors cursor-pointer",
                    active
                      ? "bg-[var(--bg-elevated)] text-[var(--brand-navy)] border border-[var(--brand-plum)]/30 shadow-xs"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      active ? "text-[var(--brand-burgundy)]" : "text-[var(--text-secondary)]"
                    )}
                  />
                  <span>{s.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Active Settings Panel */}
        <div className="md:col-span-9">
          {section === "profile" && <ProfileSection user={user} onUpdateUser={setUser} />}
          {section === "security" && <SecuritySection />}
          {section === "preferences" && (
            <PreferencesSection preferences={preferences} onUpdate={setPreferences} />
          )}
          {section === "workspace" && <WorkspaceSection />}
        </div>
      </div>
    </div>
  );
}

function ProfileSection({
  user,
  onUpdateUser,
}: {
  user: ReturnType<typeof useAppContext>["user"];
  onUpdateUser: ReturnType<typeof useAppContext>["setUser"];
}) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = React.useState(user?.avatarUrl ?? "");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.fullName ?? "",
      username: user?.username ?? "",
      email: user?.email ?? "",
      phone: user?.phone ?? "",
      address: user?.address ?? "",
      pinCode: user?.pinCode ?? "",
    },
  });

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result === "string") {
        setAvatarPreview(reader.result);
        const updated = await authService.updateProfile({ avatarUrl: reader.result });
        onUpdateUser(updated);
        toast.success("Profile photo updated");
      }
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = async (values: z.infer<typeof profileSchema>) => {
    const updated = await authService.updateProfile({ ...values, avatarUrl: avatarPreview });
    onUpdateUser(updated);
    reset(values);
    toast.success("Personal profile saved");
  };

  return (
    <ElevatedCard className="p-6 space-y-6">
      <div>
        <h2 className="text-[17px] font-semibold text-[var(--text-primary)]">Personal profile</h2>
        <p className="text-[13px] text-[var(--text-secondary)]">
          Update your contact information and profile photo.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={avatarPreview} alt={user?.fullName ?? "Profile"} />
          <AvatarFallback>AD</AvatarFallback>
        </Avatar>
        <div className="space-y-1.5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarFile}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-3.5 w-3.5" />
            Change photo
          </Button>
          <p className="text-[11px] text-[var(--text-muted)]">PNG or JPG recommended</p>
        </div>
      </div>

      <Separator />

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="set-name">Full name</Label>
            <Input id="set-name" {...register("fullName")} />
            {errors.fullName && (
              <p className="text-[12px] text-[var(--status-danger)]">{errors.fullName.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="set-username">Username</Label>
            <Input id="set-username" {...register("username")} />
            {errors.username && (
              <p className="text-[12px] text-[var(--status-danger)]">{errors.username.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="set-email">Email</Label>
            <Input id="set-email" type="email" {...register("email")} />
            {errors.email && (
              <p className="text-[12px] text-[var(--status-danger)]">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="set-phone">Phone</Label>
            <Input id="set-phone" {...register("phone")} />
            {errors.phone && (
              <p className="text-[12px] text-[var(--status-danger)]">{errors.phone.message}</p>
            )}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="set-address">Address</Label>
            <Input id="set-address" {...register("address")} />
            {errors.address && (
              <p className="text-[12px] text-[var(--status-danger)]">{errors.address.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="set-pin">PIN code</Label>
            <Input id="set-pin" maxLength={6} {...register("pinCode")} />
            {errors.pinCode && (
              <p className="text-[12px] text-[var(--status-danger)]">{errors.pinCode.message}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            disabled={!isDirty}
            onClick={() => reset()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </div>
      </form>
    </ElevatedCard>
  );
}

function SecuritySection() {
  const [showCurrent, setShowCurrent] = React.useState(false);
  const [showNew, setShowNew] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [sessions, setSessions] = React.useState([
    { id: "s1", device: "Chrome on macOS · Mumbai, IN", current: true, lastActive: "Active now" },
    { id: "s2", device: "Safari on iPadOS · Pune, IN", current: false, lastActive: "2 days ago" },
  ]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit = async (values: z.infer<typeof passwordSchema>) => {
    await authService.changePassword(values.currentPassword, values.newPassword);
    reset();
    toast.success("Password updated in local demo session");
  };

  return (
    <div className="space-y-5">
      <ElevatedCard className="p-6 space-y-5">
        <div>
          <h2 className="text-[17px] font-semibold text-[var(--text-primary)]">Change password</h2>
          <p className="text-[13px] text-[var(--text-secondary)]">
            Update the password associated with your local demo account.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 max-w-md">
          <div className="space-y-1.5">
            <Label htmlFor="sec-curr">Current password</Label>
            <div className="relative">
              <Input
                id="sec-curr"
                type={showCurrent ? "text" : "password"}
                className="pr-9"
                {...register("currentPassword")}
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                aria-label="Toggle current password visibility"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] cursor-pointer"
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.currentPassword && (
              <p className="text-[12px] text-[var(--status-danger)]">
                {errors.currentPassword.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sec-new">New password</Label>
            <div className="relative">
              <Input
                id="sec-new"
                type={showNew ? "text" : "password"}
                className="pr-9"
                {...register("newPassword")}
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                aria-label="Toggle new password visibility"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] cursor-pointer"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.newPassword && (
              <p className="text-[12px] text-[var(--status-danger)]">{errors.newPassword.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sec-conf">Confirm new password</Label>
            <div className="relative">
              <Input
                id="sec-conf"
                type={showConfirm ? "text" : "password"}
                className="pr-9"
                {...register("confirmPassword")}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label="Toggle confirm password visibility"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] cursor-pointer"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-[12px] text-[var(--status-danger)]">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Update password
          </Button>
        </form>
      </ElevatedCard>

      <ElevatedCard className="p-6 space-y-4">
        <div>
          <h2 className="text-[17px] font-semibold text-[var(--text-primary)]">Active sessions</h2>
          <p className="text-[13px] text-[var(--text-secondary)]">
            Devices currently signed in to your workspace (simulated).
          </p>
        </div>

        <div className="divide-y divide-[var(--border-subtle)]">
          {sessions.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3">
                <Laptop className="h-4 w-4 text-[var(--text-secondary)]" />
                <div>
                  <p className="text-[13px] font-medium text-[var(--text-primary)]">{s.device}</p>
                  <p className="text-[11px] text-[var(--text-secondary)]">{s.lastActive}</p>
                </div>
              </div>
              {s.current ? (
                <Badge variant="teal">Current session</Badge>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSessions((prev) => prev.filter((item) => item.id !== s.id));
                    toast.success("Session revoked");
                  }}
                >
                  Revoke
                </Button>
              )}
            </div>
          ))}
        </div>
      </ElevatedCard>
    </div>
  );
}

function PreferencesSection({
  preferences,
  onUpdate,
}: {
  preferences: UserPreferences;
  onUpdate: React.Dispatch<React.SetStateAction<UserPreferences>>;
}) {
  const [draft, setDraft] = React.useState<UserPreferences>(preferences);
  const [saving, setSaving] = React.useState(false);

  const handleSave = async () => {
    setSaving(true);
    const saved = await settingsService.savePreferences(draft);
    onUpdate(saved);
    setSaving(false);
    toast.success("Preferences updated");
  };

  return (
    <ElevatedCard className="p-6 space-y-6">
      <div>
        <h2 className="text-[17px] font-semibold text-[var(--text-primary)]">Preferences</h2>
        <p className="text-[13px] text-[var(--text-secondary)]">
          Configure formatting, appearance, and notification alerts.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Currency</Label>
          <Select value={draft.currency} onValueChange={() => {}}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="INR">INR (₹) — Indian Rupee</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Date format</Label>
          <Select
            value={draft.dateFormat}
            onValueChange={(val) =>
              setDraft((d) => ({ ...d, dateFormat: val as UserPreferences["dateFormat"] }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dd MMM yyyy">19 Nov 2026 (dd MMM yyyy)</SelectItem>
              <SelectItem value="dd/MM/yyyy">19/11/2026 (dd/MM/yyyy)</SelectItem>
              <SelectItem value="yyyy-MM-dd">2026-11-19 (ISO)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Time zone</Label>
          <Select
            value={draft.timezone}
            onValueChange={(val) => setDraft((d) => ({ ...d, timezone: val }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST, UTC+05:30)</SelectItem>
              <SelectItem value="UTC">UTC</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Theme preference</Label>
          <Select
            value={draft.theme}
            onValueChange={(val) => {
              const nextTheme = val as UserPreferences["theme"];
              setDraft((d) => ({ ...d, theme: nextTheme }));
              onUpdate((prev) => ({ ...prev, theme: nextTheme }));
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Warm Ivory (Light)</SelectItem>
              <SelectItem value="dark">Charcoal (Dark)</SelectItem>
              <SelectItem value="system">System default</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">
          Notification preferences
        </h3>
        {(
          [
            ["billUploaded", "Invoice uploaded", "Notify when new bills are queued for review"],
            ["needsReview", "Review alerts", "Alert when extracted fields need verification"],
            ["overdueReminders", "Overdue bill reminders", "Highlight bills past their due date"],
            ["paymentRecorded", "Payment confirmations", "Confirm when outgoing payments are logged"],
            ["weeklySummary", "Weekly spend digest", "Prepare a Monday morning summary"],
          ] as const
        ).map(([key, title, desc]) => (
          <div key={key} className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[13px] font-medium text-[var(--text-primary)]">{title}</p>
              <p className="text-[12px] text-[var(--text-secondary)]">{desc}</p>
            </div>
            <Switch
              checked={draft.notifications[key]}
              onCheckedChange={(checked) =>
                setDraft((d) => ({
                  ...d,
                  notifications: { ...d.notifications, [key]: checked },
                }))
              }
            />
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={() => setDraft(preferences)}>
          Cancel
        </Button>
        <Button type="button" disabled={saving} onClick={handleSave}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save preferences
        </Button>
      </div>
    </ElevatedCard>
  );
}

function WorkspaceSection() {
  const initial = React.useMemo(() => settingsService.getWorkspace(), []);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<WorkspaceSettings>({
    resolver: zodResolver(workspaceSchema) as never,
    defaultValues: initial,
  });

  const onSubmit = async (values: WorkspaceSettings) => {
    const saved = await settingsService.saveWorkspace(values);
    reset(saved);
    toast.success("Workspace configuration saved");
  };

  return (
    <ElevatedCard className="p-6 space-y-6">
      <div>
        <h2 className="text-[17px] font-semibold text-[var(--text-primary)]">Workspace</h2>
        <p className="text-[13px] text-[var(--text-secondary)]">
          Manage your business entity, GSTIN, and default invoice booking rules.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="ws-name">Workspace name</Label>
            <Input id="ws-name" {...register("workspaceName")} />
            {errors.workspaceName && (
              <p className="text-[12px] text-[var(--status-danger)]">
                {errors.workspaceName.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ws-legal">Legal business name</Label>
            <Input id="ws-legal" {...register("legalName")} />
            {errors.legalName && (
              <p className="text-[12px] text-[var(--status-danger)]">{errors.legalName.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ws-gstin">Business GSTIN</Label>
            <Input id="ws-gstin" className="font-mono-data uppercase" {...register("gstin")} />
            {errors.gstin && (
              <p className="text-[12px] text-[var(--status-danger)]">{errors.gstin.message}</p>
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
                    <SelectValue />
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
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="ws-addr">Business address</Label>
            <Input id="ws-addr" {...register("businessAddress")} />
            {errors.businessAddress && (
              <p className="text-[12px] text-[var(--status-danger)]">
                {errors.businessAddress.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ws-pin">PIN code</Label>
            <Input id="ws-pin" maxLength={6} {...register("pinCode")} />
            {errors.pinCode && (
              <p className="text-[12px] text-[var(--status-danger)]">{errors.pinCode.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ws-terms">Default payment terms (days)</Label>
            <Input
              id="ws-terms"
              type="number"
              {...register("defaultPaymentTermsDays", { valueAsNumber: true })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Default GST treatment</Label>
            <Controller
              name="defaultGstTreatment"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CGST_SGST">Intra-state (CGST + SGST)</SelectItem>
                    <SelectItem value="IGST">Inter-state (IGST)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ws-prefix">Reference prefix</Label>
            <Input id="ws-prefix" className="font-mono-data" {...register("invoicePrefix")} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" disabled={!isDirty} onClick={() => reset()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Save workspace
          </Button>
        </div>
      </form>
    </ElevatedCard>
  );
}
