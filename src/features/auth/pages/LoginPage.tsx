import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAppContext } from "@/app/providers";
import { Button } from "@/components/ui/button";
import { ElevatedCard } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/controls";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { authService } from "@/mocks/services/authService";
import { AuthLayout } from "@/layouts/AuthLayout";
import { loginSchema, type LoginFormValues } from "../schemas/authSchemas";

export function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useAppContext();
  const [showPassword, setShowPassword] = React.useState(false);
  const [authError, setAuthError] = React.useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "arjun.deshmukh@aircoenterprises.in",
      password: "demo-password",
      rememberMe: true,
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setAuthError(null);
    try {
      const profile = await authService.login({
        identifier: values.identifier,
        password: values.password,
        rememberMe: values.rememberMe,
      });
      setUser(profile);
      toast.success(`Signed in as ${profile.fullName}`);
      navigate("/dashboard");
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Unable to sign in.");
    }
  };

  const handleDemoLogin = async () => {
    const profile = await authService.loginDemo();
    setUser(profile);
    toast.success("Entered seeded demo workspace");
    navigate("/dashboard");
  };

  return (
    <AuthLayout>
      <ElevatedCard className="p-6 sm:p-8">
        <div>
          <h2 className="text-[22px] font-semibold tracking-tight text-[var(--text-primary)]">
            Sign in to your workspace
          </h2>
          <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
            Enter your email or username to continue managing invoices.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 space-y-4">
          {authError && (
            <div
              role="alert"
              className="rounded-md border border-[var(--status-danger)]/30 bg-[var(--status-danger-bg)] px-3.5 py-2.5 text-[13px] text-[var(--status-danger)]"
            >
              {authError}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="identifier">Email or username</Label>
            <Input
              id="identifier"
              placeholder="arjun.deshmukh@aircoenterprises.in"
              {...register("identifier")}
            />
            {errors.identifier && (
              <p className="text-[12px] text-[var(--status-danger)]">{errors.identifier.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="login-password">Password</Label>
              <Link
                to="/forgot-password"
                className="text-[12px] font-medium text-[var(--brand-burgundy)] hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="login-password"
                type={showPassword ? "text" : "password"}
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

          <div className="flex items-center gap-2 pt-0.5">
            <Controller
              name="rememberMe"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="rememberMe"
                  checked={!!field.value}
                  onCheckedChange={(v) => field.onChange(Boolean(v))}
                />
              )}
            />
            <Label htmlFor="rememberMe" className="cursor-pointer font-normal text-[var(--text-secondary)]">
              Keep me signed in on this device
            </Label>
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full h-10">
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Sign in
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-[11px] text-[var(--text-muted)]">Demo access</span>
          <Separator className="flex-1" />
        </div>

        <Button type="button" variant="outline" onClick={handleDemoLogin} className="w-full h-9">
          Continue with seeded demo account
        </Button>

        <p className="mt-5 text-center text-[13px] text-[var(--text-secondary)]">
          New to Airco BillSage?{" "}
          <Link to="/signup" className="font-medium text-[var(--brand-burgundy)] hover:underline">
            Create an account
          </Link>
        </p>
      </ElevatedCard>
    </AuthLayout>
  );
}
