import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useAppContext } from "@/app/providers";
import { AnalyticsPage } from "@/features/analytics/pages/AnalyticsPage";
import { ForgotPasswordPage } from "@/features/auth/pages/ForgotPasswordPage";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { SignupPage } from "@/features/auth/pages/SignupPage";
import { BillDetailPage } from "@/features/bills/pages/BillDetailPage";
import { BillReviewPage } from "@/features/bills/pages/BillReviewPage";
import { BillsPage } from "@/features/bills/pages/BillsPage";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { BankAccountPage } from "@/features/payments/pages/BankAccountPage";
import { SettingsPage } from "@/features/settings/pages/SettingsPage";
import { VendorDetailPage } from "@/features/vendors/pages/VendorDetailPage";
import { VendorsPage } from "@/features/vendors/pages/VendorsPage";
import { AppLayout } from "@/layouts/AppLayout";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAppContext();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Auth Routes */}
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Protected Application Shell */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/bills" element={<BillsPage />} />
          <Route path="/bills/:id" element={<BillDetailPage />} />
          <Route path="/bills/:id/review" element={<BillReviewPage />} />
          <Route path="/vendors" element={<VendorsPage />} />
          <Route path="/vendors/:id" element={<VendorDetailPage />} />
          <Route path="/bank-account" element={<BankAccountPage />} />
          <Route path="/payments" element={<Navigate to="/bank-account" replace />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
