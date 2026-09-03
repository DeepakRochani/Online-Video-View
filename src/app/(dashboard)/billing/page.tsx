"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  CreditCard,
  Crown,
  Check,
  Zap,
  ShieldCheck,
  AlertTriangle,
  Clock,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Download,
  Tag,
  CheckCircle2,
  AlertCircle,
  FileText,
  Building2,
  ChevronRight,
  Info,
} from "lucide-react";
import { DynamicPlan, InvoiceRecord, Subscription } from "@/lib/project-types";

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export default function BillingPage() {
  const [data, setData] = useState<{
    subscription?: Subscription;
    entitlements?: any;
    usage?: any;
    allPlans?: DynamicPlan[];
    razorpayKeyId?: string;
  } | null>(null);

  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");

  // Upgrade & Checkout State
  const [selectedPlan, setSelectedPlan] = useState<DynamicPlan | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponState, setCouponState] = useState<{
    validating: boolean;
    applied: boolean;
    discountPaise: number;
    discountInr: number;
    finalAmountInr: number;
    error?: string;
  } | null>(null);

  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Downgrade confirmation modal
  const [downgradeWarnings, setDowngradeWarnings] = useState<string[] | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4500);
  };

  const handleCancelSubscription = async () => {
    setIsCancelling(true);
    try {
      const res = await fetch("/api/billing/cancel-subscription", {
        method: "POST",
      });
      const resData = await res.json();
      if (res.ok) {
        showToast("success", resData.message || "Subscription cancelled. Access remains active until period end.");
        setShowCancelModal(false);
        fetchBillingData();
      } else {
        showToast("error", resData.error || "Failed to cancel subscription.");
      }
    } catch {
      showToast("error", "Network error cancelling subscription.");
    } finally {
      setIsCancelling(false);
    }
  };

  const fetchBillingData = async () => {
    setLoading(true);
    try {
      const [subRes, invRes] = await Promise.all([
        fetch("/api/billing/subscription"),
        fetch("/api/billing/invoices"),
      ]);
      const subData = await subRes.json();
      const invData = await invRes.json();

      setData(subData);
      if (invData.invoices) setInvoices(invData.invoices);
    } catch {
      showToast("error", "Failed to load billing details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();

    // Load Razorpay script dynamically
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleApplyCoupon = async (plan: DynamicPlan) => {
    if (!couponCode.trim()) return;
    setCouponState({ validating: true, applied: false, discountPaise: 0, discountInr: 0, finalAmountInr: 0 });

    try {
      const res = await fetch("/api/billing/coupon/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponCode.trim(),
          planSlug: plan.slug,
          planId: plan.id,
          billingCycle,
        }),
      });
      const val = await res.json();
      if (!val.valid) {
        setCouponState({
          validating: false,
          applied: false,
          discountPaise: 0,
          discountInr: 0,
          finalAmountInr: 0,
          error: val.error || "Invalid coupon",
        });
      } else {
        setCouponState({
          validating: false,
          applied: true,
          discountPaise: val.calculation.discountPaise,
          discountInr: val.calculation.discountInr,
          finalAmountInr: val.calculation.finalAmountInr,
        });
        showToast("success", `Coupon ${couponCode.toUpperCase()} applied! You saved ₹${val.calculation.discountInr}`);
      }
    } catch {
      setCouponState({
        validating: false,
        applied: false,
        discountPaise: 0,
        discountInr: 0,
        finalAmountInr: 0,
        error: "Failed to validate coupon",
      });
    }
  };

  const handleSelectPlan = async (plan: DynamicPlan) => {
    // Check if downgrade
    if (data?.entitlements && data.entitlements.planSlug !== plan.slug) {
      try {
        const checkRes = await fetch("/api/billing/downgrade-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetPlanSlug: plan.slug }),
        });
        const checkData = await checkRes.json();
        if (checkData.hasWarnings && checkData.warnings.length > 0) {
          setDowngradeWarnings(checkData.warnings);
        }
      } catch {}
    }
    setSelectedPlan(plan);
    setCouponCode("");
    setCouponState(null);
  };

  const handleProceedCheckout = async () => {
    if (!selectedPlan) return;
    setIsProcessingPayment(true);

    try {
      const createRes = await fetch("/api/billing/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlan.id,
          planSlug: selectedPlan.slug,
          billingCycle,
          couponCode: couponState?.applied ? couponCode.trim() : undefined,
        }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error || "Failed to initiate subscription");

      // If 100% Free or Promo Direct Activation
      if (createData.isFree) {
        showToast("success", createData.message);
        setSelectedPlan(null);
        setDowngradeWarnings(null);
        fetchBillingData();
        return;
      }

      // Check if Razorpay JS is available
      if (typeof window !== "undefined" && window.Razorpay && createData.keyId) {
        const options = {
          key: createData.keyId,
          amount: createData.amountPaise,
          currency: "INR",
          name: "DR Films Wedding Cinema",
          description: `Subscription: ${selectedPlan.name} (${billingCycle})`,
          order_id: createData.orderId,
          handler: async function (response: any) {
            // Verify payment
            const verifyRes = await fetch("/api/billing/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                planSlug: selectedPlan.slug,
                planId: selectedPlan.id,
                billingCycle,
                couponCode: couponState?.applied ? couponCode.trim() : undefined,
              }),
            });
            const verifyData = await verifyRes.json();
            if (verifyRes.ok) {
              showToast("success", `Upgraded to ${selectedPlan.name} successfully!`);
              setSelectedPlan(null);
              setDowngradeWarnings(null);
              fetchBillingData();
            } else {
              showToast("error", verifyData.error || "Payment verification failed.");
            }
          },
          theme: { color: "#6366f1" },
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        showToast("error", "Payment provider checkout SDK is unavailable. Please check your network or contact support.");
      }
    } catch (err: any) {
      showToast("error", err.message || "Checkout failed");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-400">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium">Loading subscription and billing data...</p>
      </div>
    );
  }

  const currentEntitlements = data?.entitlements;
  const usageReport = data?.usage;
  const currentPlanSlug = currentEntitlements?.planSlug || "pro";

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl backdrop-blur-lg animate-in fade-in slide-in-from-bottom-5 text-sm font-medium ${
            toast.type === "success"
              ? "bg-emerald-950/90 border-emerald-500/40 text-emerald-200"
              : "bg-rose-950/90 border-rose-500/40 text-rose-200"
          }`}
        >
          {toast.type === "success" ? <Check className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-rose-400" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <CreditCard className="w-6 h-6 text-indigo-400" />
            Studio Subscription & Resource Limits
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage your luxury gallery hosting tier, monitor live resource capacity, and view payment invoices.
          </p>
        </div>

        <button
          onClick={fetchBillingData}
          className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Quotas
        </button>
      </div>

      {/* Trial / Grace Alert Banner */}
      {currentEntitlements?.isTrial && (
        <div className="bg-gradient-to-r from-indigo-950/80 to-purple-950/80 border border-indigo-500/40 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-300 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">
                Active 14-Day Free Trial ({currentEntitlements.trialDaysRemaining ?? 14} days remaining)
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                Enjoy full Pro Studio access. Select a plan below to keep your custom domains and 4K video deliveries active.
              </p>
            </div>
          </div>
        </div>
      )}

      {currentEntitlements?.isGracePeriod && (
        <div className="bg-gradient-to-r from-amber-950/80 to-orange-950/80 border border-amber-500/40 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-300 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-200">
                Payment Grace Period ({currentEntitlements.graceDaysRemaining} days remaining)
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                Your galleries remain active for your couples. Please renew your subscription to prevent creation limits.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Top Grid: Current Plan Details + Key Features */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Plan Card */}
        <div className="lg:col-span-1 rounded-2xl border border-indigo-500/30 bg-gradient-to-b from-indigo-950/40 via-slate-900/60 to-slate-950 p-6 flex flex-col justify-between shadow-xl backdrop-blur-sm">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400">
                Current Plan
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold uppercase ${
                  currentEntitlements?.effectiveStatus === "ACTIVE"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : currentEntitlements?.effectiveStatus === "TRIAL"
                    ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                    : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                }`}
              >
                {currentEntitlements?.effectiveStatus || "ACTIVE"}
              </span>
            </div>

            <h3 className="text-2xl font-black text-white tracking-tight mt-3">
              {currentEntitlements?.planName || "Pro Studio"}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Active until {new Date(currentEntitlements?.currentPeriodEnd || Date.now()).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>

            <div className="mt-6 pt-5 border-t border-slate-800/80 space-y-2.5 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>
                  {currentEntitlements?.features?.whiteLabel
                    ? "100% White-Label (No DR Films logo)"
                    : "Standard Studio Branding"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>
                  {currentEntitlements?.limits?.maxCustomDomains
                    ? `${currentEntitlements.limits.maxCustomDomains} Custom Domains Included`
                    : "Custom Domains (Pro Feature)"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>All 6 Luxury & Cinematic Gallery Templates</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Direct Google Drive Scanning & Video Streaming</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-800 space-y-2">
            <a
              href="#plans-section"
              className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 text-center"
            >
              <Crown className="w-4 h-4" />
              Change or Upgrade Plan
            </a>

            {data?.subscription?.cancelAtPeriodEnd ? (
              <div className="w-full py-2 px-3 rounded-xl text-[11px] font-medium text-amber-300 bg-amber-950/40 border border-amber-800/40 text-center">
                Cancellation Scheduled for Period End
              </div>
            ) : (
              data?.subscription?.status === "ACTIVE" && (
                <button
                  type="button"
                  onClick={() => setShowCancelModal(true)}
                  className="w-full py-2 px-3 rounded-xl text-[11px] font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 border border-transparent hover:border-rose-900/40 transition-colors text-center"
                >
                  Cancel Subscription
                </button>
              )
            )}
          </div>
        </div>

        {/* Live Resource Utilization Cards */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-400" />
              Live Resource Capacity & Quotas
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">Real-time usage aggregation</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {usageReport?.metrics &&
              Object.values(usageReport.metrics).map((m: any) => {
                const isExceeded = m.status === "exceeded";
                const isWarning = m.status === "warning" || m.status === "critical";
                return (
                  <div key={m.key} className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-xl">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-slate-300">{m.label}</span>
                      <span className="font-mono text-slate-400">
                        <strong className="text-white">{m.used}</strong> / {m.isUnlimited ? "∞" : m.limit} {m.unit}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-800/80 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isExceeded
                            ? "bg-rose-500"
                            : isWarning
                            ? "bg-amber-400"
                            : "bg-indigo-500"
                        }`}
                        style={{ width: `${m.isUnlimited ? 5 : m.percent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 font-mono">
                      <span>{m.isUnlimited ? "Uncapped capacity" : `${m.percent}% utilized`}</span>
                      {isExceeded && <span className="text-rose-400 font-bold">Limit Reached</span>}
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Zero Data Loss Guarantee Banner */}
          <div className="mt-5 p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2.5 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong>Zero Data Deletion Guarantee:</strong> If your project count exceeds a plan limit or your plan is downgraded, DR Films <em>never</em> deletes your existing wedding galleries or client media. Existing links remain fully accessible.
            </span>
          </div>
        </div>
      </div>

      {/* Dynamic Plans Selection Matrix */}
      <div id="plans-section" className="space-y-6 pt-4">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Select the Perfect Plan for Your Studio
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Seamlessly upgrade or change your subscription. Instant feature activation.
          </p>

          {/* Billing Cycle Switcher */}
          <div className="mt-5 inline-flex items-center p-1 bg-slate-900 border border-slate-800 rounded-full">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                billingCycle === "monthly" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                billingCycle === "yearly" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              <span>Annual Billing</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                SAVE 20%
              </span>
            </button>
          </div>
        </div>

        {/* Plan Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {data?.allPlans?.map((plan) => {
            const isCurrent = currentPlanSlug === plan.slug;
            const price = billingCycle === "yearly" ? plan.priceYearlyPaise / 100 : plan.priceMonthlyPaise / 100;
            const monthlyEquivalent = billingCycle === "yearly" ? Math.round(price / 12) : price;

            return (
              <div
                key={plan.id}
                className={`rounded-2xl border p-6 flex flex-col justify-between transition-all backdrop-blur-sm ${
                  plan.isPopular
                    ? "bg-gradient-to-b from-indigo-950/40 via-slate-900/80 to-slate-950 border-indigo-500/60 shadow-xl shadow-indigo-500/10"
                    : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                } ${isCurrent ? "ring-2 ring-indigo-500" : ""}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                      {plan.slug}
                    </span>
                    {plan.badge && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                        {plan.badge}
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-black text-white">{plan.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 min-h-[32px]">{plan.tagline || plan.description}</p>

                  {/* Pricing */}
                  <div className="mt-5 pt-4 border-t border-slate-800/80">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-white">₹{price.toLocaleString()}</span>
                      <span className="text-xs text-slate-400">
                        /{billingCycle === "yearly" ? "year" : "month"}
                      </span>
                    </div>
                    {billingCycle === "yearly" && (
                      <span className="text-[11px] text-emerald-400 block mt-0.5 font-mono">
                        ≈ ₹{monthlyEquivalent}/mo (billed annually)
                      </span>
                    )}
                  </div>

                  {/* Features List */}
                  <div className="mt-6 space-y-2.5 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        <strong>{plan.limits.maxProjects === -1 ? "Unlimited" : plan.limits.maxProjects}</strong> Wedding Projects
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        <strong>{plan.limits.maxPhotos === -1 ? "Unlimited" : plan.limits.maxPhotos.toLocaleString()}</strong> Photo Deliveries
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        <strong>{plan.limits.maxStorageGb === -1 ? "Unlimited" : `${plan.limits.maxStorageGb} GB`}</strong> Cloud Storage
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        {plan.limits.maxCustomDomains > 0 ? (
                          <><strong>{plan.limits.maxCustomDomains}</strong> Custom Domains</>
                        ) : (
                          "Standard Domain"
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        {plan.features.whiteLabel ? (
                          <strong className="text-emerald-300">100% White-Label</strong>
                        ) : (
                          "Studio Co-branding"
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>All 6 Luxury Templates</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-slate-800">
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full py-2.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-400 cursor-default flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-4 h-4 text-emerald-400" />
                      Active Current Plan
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSelectPlan(plan)}
                      className={`w-full py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                        plan.isPopular
                          ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30"
                          : "bg-slate-800 hover:bg-slate-700 text-white"
                      }`}
                    >
                      <span>Choose {plan.name}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Invoices & Billing History */}
      <div className="space-y-4 pt-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-400" />
          Invoice & Payment History
        </h3>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-mono text-[11px]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold">Invoice ID</th>
                  <th className="py-3 px-4 font-semibold">Plan Description</th>
                  <th className="py-3 px-4 font-semibold">Amount</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Payment Ref</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                      No invoices recorded yet.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-400">
                        {new Date(inv.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-white">
                        {inv.id}
                      </td>
                      <td className="py-3.5 px-4">
                        {inv.description || `${inv.planName || inv.plan} Subscription`}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                        ₹{(inv.amountPaise ? inv.amountPaise / 100 : inv.amount || 0).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-400 text-[11px]">
                        {inv.razorpayPaymentId}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* CHECKOUT / UPGRADE MODAL */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Crown className="w-5 h-5 text-indigo-400" />
                Confirm Subscription: {selectedPlan.name}
              </h2>
              <button
                onClick={() => {
                  setSelectedPlan(null);
                  setDowngradeWarnings(null);
                }}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Downgrade Warning Notice */}
            {downgradeWarnings && downgradeWarnings.length > 0 && (
              <div className="mt-4 p-3 rounded-xl bg-amber-950/80 border border-amber-500/40 text-xs text-amber-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-300">
                  <AlertTriangle className="w-4 h-4" />
                  Capacity Notice
                </div>
                {downgradeWarnings.map((w, i) => (
                  <p key={i}>• {w}</p>
                ))}
              </div>
            )}

            {/* Order Summary */}
            <div className="mt-5 space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Plan Tier:</span>
                <span className="font-bold text-white">{selectedPlan.name}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Billing Frequency:</span>
                <span className="font-bold text-white uppercase font-mono">{billingCycle}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Base Price:</span>
                <span className="font-mono text-white">
                  ₹{(billingCycle === "yearly" ? selectedPlan.priceYearlyPaise / 100 : selectedPlan.priceMonthlyPaise / 100).toLocaleString()}
                </span>
              </div>

              {couponState?.applied && (
                <div className="flex justify-between text-emerald-400 font-semibold pt-1 border-t border-slate-800">
                  <span>Promo Discount ({couponCode.toUpperCase()}):</span>
                  <span>-₹{couponState.discountInr.toLocaleString()}</span>
                </div>
              )}

              <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-slate-800">
                <span>Total Amount Due:</span>
                <span className="text-emerald-400 font-mono text-base">
                  ₹{couponState?.applied
                    ? couponState.finalAmountInr.toLocaleString()
                    : (billingCycle === "yearly" ? selectedPlan.priceYearlyPaise / 100 : selectedPlan.priceMonthlyPaise / 100).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Promo Coupon Input */}
            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Have a Promo / Discount Code?
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. WELCOME20, LAUNCH50"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => handleApplyCoupon(selectedPlan)}
                  disabled={couponState?.validating || !couponCode.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors"
                >
                  {couponState?.validating ? "Checking..." : "Apply"}
                </button>
              </div>
              {couponState?.error && (
                <p className="text-[11px] text-rose-400 mt-1">{couponState.error}</p>
              )}
            </div>

            {/* Checkout Action Button */}
            <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedPlan(null);
                  setDowngradeWarnings(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProceedCheckout}
                disabled={isProcessingPayment}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-1.5"
              >
                <CreditCard className="w-4 h-4" />
                {isProcessingPayment ? "Processing..." : "Proceed with Razorpay"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL SUBSCRIPTION CONFIRMATION MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <h3 className="text-base font-bold text-white">Cancel Subscription?</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Your subscription will remain <strong>fully active</strong> until the end of your current billing period (
              <span className="text-white font-mono">
                {new Date(currentEntitlements?.currentPeriodEnd || Date.now()).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
              ). After this date, your plan will not automatically renew.
            </p>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <p className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Zero Data Loss Policy
              </p>
              <p>Your client wedding galleries and uploaded files will <strong>never</strong> be automatically deleted.</p>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                disabled={isCancelling}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800"
              >
                Keep Subscription
              </button>
              <button
                type="button"
                onClick={handleCancelSubscription}
                disabled={isCancelling}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 transition-colors flex items-center gap-1.5"
              >
                {isCancelling ? "Cancelling..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
