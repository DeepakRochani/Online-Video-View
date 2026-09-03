"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Heart,
  Crown,
  Check,
  Zap,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  HelpCircle,
  Film,
  Camera,
  Layers,
  Globe,
  Users,
} from "lucide-react";
import { DynamicPlan } from "@/lib/project-types";

export default function PublicPricingPage() {
  const [plans, setPlans] = useState<DynamicPlan[]>([]);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/billing/subscription")
      .then((res) => res.json())
      .then((data) => {
        if (data.allPlans) {
          setPlans(data.allPlans);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-amber-500 selection:text-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500/20 to-amber-200/10 border border-amber-400/30 text-amber-300 flex items-center justify-center group-hover:scale-105 transition-transform shadow-md shadow-amber-500/10">
              <Heart className="w-5 h-5 fill-amber-400/30" />
            </div>
            <div>
              <span className="font-serif font-bold text-lg text-white group-hover:text-amber-300 transition-colors tracking-tight">
                DR Films
              </span>
              <span className="text-[11px] text-amber-400/80 block font-mono">
                Luxury Wedding Client Delivery
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs sm:text-sm font-semibold text-slate-300 hover:text-white px-3 py-1.5 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-950 bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 hover:from-amber-200 hover:to-amber-400 shadow-lg shadow-amber-500/20 transition-all"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-mono font-semibold uppercase tracking-wider mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          Transparent Pricing for Elite Photographers
        </div>
        <h1 className="text-4xl sm:text-6xl font-serif font-extrabold text-white tracking-tight leading-tight max-w-4xl mx-auto">
          The Luxury Delivery Platform That{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600">
            Wows Every Couple
          </span>
        </h1>
        <p className="text-slate-400 text-sm sm:text-lg max-w-2xl mx-auto mt-4 leading-relaxed">
          Deliver 4K highlight films, high-resolution photo galleries, album selections, and QR codes under your own custom studio domain.
        </p>

        {/* Billing Cycle Toggle */}
        <div className="mt-8 inline-flex items-center p-1.5 bg-slate-900 border border-slate-800 rounded-full shadow-inner">
          <button
            onClick={() => setBillingCycle("monthly")}
            className={`px-5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all ${
              billingCycle === "monthly" ? "bg-amber-400 text-slate-950 shadow-md font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setBillingCycle("yearly")}
            className={`px-5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
              billingCycle === "yearly" ? "bg-amber-400 text-slate-950 shadow-md font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            <span>Annual Billing</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-950 text-amber-300 border border-amber-400/40">
              SAVE 20%
            </span>
          </button>
        </div>
      </section>

      {/* Pricing Cards Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-400 font-mono">Loading pricing plans...</p>
          </div>
        ) : plans.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-12 text-center max-w-lg mx-auto">
            <p className="text-slate-300 font-medium">No plans configured</p>
            <p className="text-xs text-slate-500 mt-1">Please check back later or contact platform support.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {plans.map((plan) => {
              const price = billingCycle === "yearly" ? plan.priceYearlyPaise / 100 : plan.priceMonthlyPaise / 100;
              const monthlyEquivalent = billingCycle === "yearly" ? Math.round(price / 12) : price;

              return (
                <div
                  key={plan.id}
                  className={`rounded-3xl border p-6 flex flex-col justify-between transition-all relative backdrop-blur-sm ${
                  plan.isPopular
                    ? "bg-gradient-to-b from-amber-950/40 via-slate-900/90 to-slate-950 border-amber-400/50 shadow-2xl shadow-amber-500/10"
                    : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                }`}
              >
                {plan.isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold text-[10px] uppercase tracking-wider font-mono shadow-md">
                    {plan.badge || "Most Popular"}
                  </div>
                )}

                <div>
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400/80">
                    {plan.slug}
                  </span>
                  <h3 className="text-2xl font-bold text-white mt-1 tracking-tight">{plan.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 min-h-[32px]">{plan.tagline || plan.description}</p>

                  {/* Price */}
                  <div className="mt-6 pt-5 border-t border-slate-800/80">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black text-white">₹{price.toLocaleString()}</span>
                      <span className="text-xs text-slate-400">/{billingCycle === "yearly" ? "yr" : "mo"}</span>
                    </div>
                    {billingCycle === "yearly" && (
                      <span className="text-xs text-emerald-400 font-mono mt-1 block">
                        ≈ ₹{monthlyEquivalent}/month (billed annually)
                      </span>
                    )}
                  </div>

                  {/* Feature Limits */}
                  <div className="mt-6 space-y-3 text-xs text-slate-300">
                    <div className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        <strong>{plan.limits.maxProjects === -1 ? "Unlimited" : plan.limits.maxProjects}</strong> Wedding Projects
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        <strong>{plan.limits.maxPhotos === -1 ? "Unlimited" : plan.limits.maxPhotos.toLocaleString()}</strong> Photo Deliveries
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        <strong>{plan.limits.maxStorageGb === -1 ? "Unlimited" : `${plan.limits.maxStorageGb} GB`}</strong> Cloud Storage
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        {plan.limits.maxCustomDomains > 0 ? (
                          <><strong>{plan.limits.maxCustomDomains}</strong> Custom Domain Mappings</>
                        ) : (
                          "Standard DR Films Domain"
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        {plan.features.whiteLabel ? (
                          <strong className="text-amber-300">100% White-Label (No Branding)</strong>
                        ) : (
                          "Studio Co-branding"
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>All 6 Luxury & Cinematic Templates</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Direct Google Drive Scan Engine</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-slate-800">
                  <Link
                    href={`/register?plan=${plan.slug}`}
                    className={`w-full py-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      plan.isPopular
                        ? "bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 hover:from-amber-200 hover:to-amber-400 text-slate-950 shadow-lg shadow-amber-500/20"
                        : "bg-slate-800 hover:bg-slate-700 text-white"
                    }`}
                  >
                    <span>Start 14-Day Free Trial</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </section>

      {/* Zero Data Loss Guarantee */}
      <section className="bg-slate-900/60 border-y border-slate-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">
              Strict Zero Data Deletion Guarantee
            </h3>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 leading-relaxed">
              We respect your creative work and client commitments. If you ever downgrade, cancel, or let a subscription expire, DR Films <strong>never</strong> deletes your existing wedding galleries, scanned media, or client selections.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Everything you need to know about our photographer plans and billing.
          </p>
        </div>

        <div className="space-y-4">
          {[
            {
              q: "Can I connect my existing Google Drive folders directly?",
              a: "Yes! DR Films uses high-speed direct Google Drive integration. You paste your folder link, and our engine automatically structures highlight videos, event sections, and high-res photos.",
            },
            {
              q: "How does custom domain mapping work?",
              a: "Pro and Studio plans allow you to point your own subdomain (e.g., gallery.yourstudio.com) directly to your client galleries with automatic SSL certificates.",
            },
            {
              q: "What payment methods are supported?",
              a: "We support UPI, Net Banking, Credit/Debit Cards, and Razorpay with instant tax invoice generation in INR.",
            },
            {
              q: "Can I upgrade or downgrade at any time?",
              a: "Yes, you can upgrade instantly. If you downgrade, all your existing weddings and media remain safely hosted with no data loss.",
            },
          ].map((item, idx) => (
            <div key={idx} className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
              <h4 className="text-sm font-bold text-white">{item.q}</h4>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-8 text-center text-xs text-slate-400 mt-auto">
        <p>DR Films Wedding Cinema &bull; Enterprise Multi-Tenant SaaS Platform</p>
      </footer>
    </div>
  );
}
