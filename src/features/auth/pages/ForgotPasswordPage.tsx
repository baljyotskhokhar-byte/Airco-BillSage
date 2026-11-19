import * as React from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ElevatedCard } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/mocks/services/authService";
import { AuthLayout } from "@/layouts/AuthLayout";
import { forgotPasswordSchema, type ForgotPasswordValues } from "../schemas/authSchemas";

export function ForgotPasswordPage() {
  const [submittedEmail, setSubmittedEmail] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: ForgotPasswordValues) => {
    await authService.requestPasswordReset(values.email);
    setSubmittedEmail(values.email);
  };

  return (
    <AuthLayout>
      <ElevatedCard className="p-6 sm:p-8">
        {submittedEmail ? (
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--brand-teal-bg)] text-[var(--brand-teal)]">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-[22px] font-semibold tracking-tight text-[var(--text-primary)]">
              Reset flow simulated
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--text-secondary)]">
              In a live deployment, password recovery instructions would be issued for{" "}
              <span className="font-medium text-[var(--text-primary)]">{submittedEmail}</span>. Because this preview runs locally without a backend mail server, no email was transmitted.
            </p>
            <Button variant="outline" asChild className="mt-6">
              <Link to="/login">
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
            </Button>
          </div>
        ) : (
          <div>
            <h2 className="text-[22px] font-semibold tracking-tight text-[var(--text-primary)]">
              Reset your password
            </h2>
            <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
              Enter the email address linked to your Airco BillSage account.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="reset-email">Email address</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="arjun.deshmukh@aircoenterprises.in"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-[12px] text-[var(--status-danger)]">{errors.email.message}</p>
                )}
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full h-10">
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Send reset link
              </Button>
            </form>

            <div className="mt-5">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to sign in
              </Link>
            </div>
          </div>
        )}
      </ElevatedCard>
    </AuthLayout>
  );
}
