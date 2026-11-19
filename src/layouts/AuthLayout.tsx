import * as React from "react";
import { Link } from "react-router-dom";
import { BrandLogo } from "@/components/common/BrandLogo";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const [imgError, setImgError] = React.useState(false);

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] flex flex-col lg:grid lg:grid-cols-12">
      {/* Left Jewel-Tone Brand Panel (Deep Burgundy & Plum with Navy & Antique Gold highlights) */}
      <aside className="lg:col-span-5 xl:col-span-5 relative flex flex-col justify-between bg-[#601D49] text-[#FAF8F4] px-6 py-8 sm:px-10 lg:px-12 lg:py-12 border-b lg:border-b-0 lg:border-r border-[#4C163A]">
        {/* Architectural Burgundy Top Strip */}
        <div className="absolute inset-x-0 top-0 h-1.5 bg-[#930031]" aria-hidden="true" />

        <div>
          <Link to="/dashboard" className="inline-flex items-center">
            <BrandLogo onDark />
          </Link>

          <div className="mt-10 lg:mt-14 max-w-md">
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#C39742]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#C39742]" aria-hidden="true" />
              Enterprise Payables &amp; GST Control
            </div>
            <h1 className="mt-3 text-[28px] sm:text-[34px] font-semibold tracking-tight leading-[1.18] text-white [text-wrap:balance]">
              A sharper view of every rupee billed.
            </h1>
            <p className="mt-3 text-[14px] leading-relaxed text-[#E7D8E1]">
              Capture vendor invoices, reconcile CGST, SGST &amp; IGST line items, track supplier pricing shifts, and audit bank settlements from one disciplined financial workspace.
            </p>
          </div>
        </div>

        <div className="mt-8 lg:mt-12 space-y-4">
          <div className="overflow-hidden rounded-lg border border-white/15 bg-[#133458] shadow-sm">
            {!imgError ? (
              <div className="relative aspect-[4/3]">
                <img
                  src="/src/assets/images/auth_invoice_abstract_1795093772986.jpg"
                  alt="Structured invoice and ledger composition"
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className="h-full w-full object-cover opacity-90"
                />
                <div className="absolute inset-x-0 bottom-0 bg-[#133458]/92 px-4 py-3 border-t border-[#C39742]/40 flex items-center justify-between text-[12px]">
                  <span className="font-medium text-white">GSTR-2B &amp; Ledger Ready</span>
                  <span className="font-mono-data font-semibold text-[#C39742]">
                    CGST · SGST · IGST
                  </span>
                </div>
              </div>
            ) : (
              <div className="aspect-[4/3] flex flex-col justify-between p-6 bg-[#133458]">
                <div className="flex items-center justify-between border-b border-white/15 pb-3">
                  <span className="text-[12px] font-medium text-[#D6E1EE]">
                    Ledger Verification
                  </span>
                  <span className="font-mono-data text-[12px] text-[#C39742]">
                    GSTIN Ready
                  </span>
                </div>
                <div className="space-y-2.5 my-auto">
                  <div className="h-3 w-3/4 rounded bg-white/15" />
                  <div className="h-3 w-1/2 rounded bg-[#930031]" />
                  <div className="h-3 w-2/3 rounded bg-[#176B70]" />
                </div>
                <div className="text-[11px] text-[#D6E1EE]">
                  Airco BillSage Financial Control
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-white/15 pt-3 text-[12px] text-[#DFCED8]">
            <span>Built for Indian GST workflows</span>
            <span className="font-mono-data text-[#C39742]">INR · FY 26-27</span>
          </div>
        </div>
      </aside>

      {/* Right Warm Ivory Form Surface */}
      <main className="lg:col-span-7 xl:col-span-7 flex items-center justify-center bg-[var(--bg-canvas)] px-5 py-10 sm:px-10 lg:px-14">
        <div className="w-full max-w-[540px]">{children}</div>
      </main>
    </div>
  );
}
