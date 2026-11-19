import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAppContext } from "@/app/providers";
import { Button } from "@/components/ui/button";
import { ElevatedCard } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { authService } from "@/mocks/services/authService";
import { AuthLayout } from "@/layouts/AuthLayout";
import { signupSchema, type SignupFormValues } from "../schemas/authSchemas";

export function SignupPage() {
  const navigate = useNavigate();
  const { setUser } = useAppContext();
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [registeredEmail, setRegisteredEmail] = React.useState<string | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: "",
      username: "",
      email: "",
      phone: "",
      address: "",
      pinCode: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: SignupFormValues) => {
    setSubmitError(null);
    try {
      const profile = await authService.register({
        fullName: values.fullName,
        username: values.username,
        email: values.email,
        phone: values.phone,
        address: values.address,
        pinCode: values.pinCode,
        password: values.password,
      });
      setUser(profile);
      setRegisteredEmail(profile.email);
      toast.success("Account created in local demo workspace.");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not create account.");
    }
  };

  if (registeredEmail) {
    return (
      <AuthLayout>
        <ElevatedCard className="p-7 sm:p-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-[var(--status-success-bg)] text-[var(--status-success)]">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-[22px] font-semibold tracking-tight text-[var(--text-primary)]">
            Account created
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--text-secondary)]">
            Your demo profile for <span className="font-medium text-[var(--text-primary)]">{registeredEmail}</span> is ready and persisted locally in your browser.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
            <Button onClick={() => navigate("/dashboard")} className="w-full sm:w-auto">
              Enter workspace
            </Button>
            <Button variant="outline" asChild className="w-full sm:w-auto">
              <Link to="/login">Go to Sign in</Link>
            </Button>
          </div>
        </ElevatedCard>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <ElevatedCard className="p-6 sm:p-8">
        <div>
          <h2 className="text-[22px] font-semibold tracking-tight text-[var(--text-primary)]">
            Create your account
          </h2>
          <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
            Set up your profile to manage bills, vendors, and GST records.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 space-y-5">
          {submitError && (
            <div
              role="alert"
              className="rounded-md border border-[var(--status-danger)]/30 bg-[var(--status-danger-bg)] px-3.5 py-2.5 text-[13px] text-[var(--status-danger)]"
            >
              {submitError}
            </div>
          )}

          {/* Personal information */}
          <div className="space-y-3.5">
            <h3 className="text-[12px] font-semibold text-[var(--text-charcoal)]">
              Personal information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" placeholder="Priya Nair" {...register("fullName")} />
                {errors.fullName && (
                  <p className="text-[12px] text-[var(--status-danger)]">{errors.fullName.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <Input id="username" placeholder="priya.nair" {...register("username")} />
                {errors.username && (
                  <p className="text-[12px] text-[var(--status-danger)]">{errors.username.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="priya@company.in"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-[12px] text-[var(--status-danger)]">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone number</Label>
                <Input id="phone" placeholder="+91 98204 51290" {...register("phone")} />
                {errors.phone && (
                  <p className="text-[12px] text-[var(--status-danger)]">{errors.phone.message}</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Address information */}
          <div className="space-y-3.5">
            <h3 className="text-[12px] font-semibold text-[var(--text-charcoal)]">
              Address information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  placeholder="402, Trade Tower B, BKC, Mumbai"
                  {...register("address")}
                />
                {errors.address && (
                  <p className="text-[12px] text-[var(--status-danger)]">{errors.address.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pinCode">PIN code</Label>
                <Input id="pinCode" placeholder="400051" maxLength={6} {...register("pinCode")} />
                {errors.pinCode && (
                  <p className="text-[12px] text-[var(--status-danger)]">{errors.pinCode.message}</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Account security */}
          <div className="space-y-3.5">
            <h3 className="text-[12px] font-semibold text-[var(--text-charcoal)]">
              Account security
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter any password"
                    className="pr-9"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-[12px] text-[var(--status-danger)]">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Re-enter password"
                    className="pr-9"
                    {...register("confirmPassword")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
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
            </div>
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full h-10">
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Create account
          </Button>
        </form>

        <p className="mt-5 text-center text-[13px] text-[var(--text-secondary)]">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-[var(--brand-burgundy)] hover:underline">
            Sign in
          </Link>
        </p>
      </ElevatedCard>
    </AuthLayout>
  );
}
