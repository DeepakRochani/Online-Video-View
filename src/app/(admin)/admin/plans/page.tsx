"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Tag,
  Zap,
  Layers,
  Sparkles,
  Save,
  RefreshCw,
  Percent,
  Calendar,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { DynamicPlan, Coupon, PlanFeatures, PlanLimits } from "@/lib/project-types";

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<DynamicPlan[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"plans" | "coupons">("plans");
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Plan Edit/Create Modal
  const [editingPlan, setEditingPlan] = useState<DynamicPlan | null>(null);
  const [isNewPlan, setIsNewPlan] = useState(false);

  // Coupon Edit/Create Modal
  const [editingCoupon, setEditingCoupon] = useState<Partial<Coupon> | null>(null);
  const [isNewCoupon, setIsNewCoupon] = useState(false);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [plansRes, couponsRes] = await Promise.all([
        fetch("/api/admin/plans"),
        fetch("/api/admin/coupons"),
      ]);
      const plansData = await plansRes.json();
      const couponsData = await couponsRes.json();

      if (plansData.plans) setPlans(plansData.plans);
      if (couponsData.coupons) setCoupons(couponsData.coupons);
    } catch (err) {
      showToast("error", "Failed to load plans and coupons data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingPlan),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save plan");

      showToast("success", `Plan "${editingPlan.name}" saved successfully.`);
      setEditingPlan(null);
      fetchData();
    } catch (err: any) {
      showToast("error", err.message || "Failed to save plan");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePlan = async (planId: string, planName: string) => {
    if (!confirm(`Are you sure you want to delete or deactivate the plan "${planName}"?`)) return;
    try {
      const res = await fetch(`/api/admin/plans?id=${planId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete plan");

      showToast("success", "Plan deleted successfully.");
      fetchData();
    } catch (err: any) {
      showToast("error", err.message || "Failed to delete plan");
    }
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCoupon) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingCoupon),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save coupon");

      showToast("success", `Coupon "${editingCoupon.code}" saved successfully.`);
      setEditingCoupon(null);
      fetchData();
    } catch (err: any) {
      showToast("error", err.message || "Failed to save coupon");
    } finally {
      setIsSaving(false);
    }
  };

  const openNewPlanModal = () => {
    setIsNewPlan(true);
    setEditingPlan({
      id: "",
      slug: "",
      name: "",
      tagline: "",
      badge: "",
      description: "",
      priceMonthlyPaise: 199900,
      priceMonthlyInPaise: 199900,
      priceYearlyPaise: 1999000,
      priceYearlyInPaise: 1999000,
      currency: "INR",
      isPopular: false,
      isActive: true,
      sortOrder: plans.length + 1,
      features: {
        googleDrive: true,
        weddingProjects: true,
        clientGalleries: true,
        photoDelivery: true,
        videoDelivery: true,
        favorites: true,
        clientSelection: true,
        qrCodes: true,
        whatsappSharing: true,
        whiteLabel: false,
        customBranding: true,
        customDomains: false,
        galleryTemplates: true,
        advancedGalleryTemplates: false,
        analytics: false,
        clientNotifications: true,
        aiFeatures: false,
        prioritySupport: false,
        apiAccess: false,
        teamCollaboration: false,
        downloadZip: true,
        prioritySync: false,
      },
      limits: {
        maxProjects: 10,
        maxActiveProjects: 10,
        maxPhotos: 5000,
        maxVideos: 100,
        maxStorageGb: 30,
        maxCustomDomains: 1,
        maxTeamMembers: 2,
        maxAiCredits: 200,
        maxMonthlyAiJobs: 100,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  const openNewCouponModal = () => {
    setIsNewCoupon(true);
    setEditingCoupon({
      code: "",
      discountType: "PERCENT",
      discountValue: 20,
      isActive: true,
      allowedPlans: [],
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <ShieldAlert className="w-6 h-6 text-indigo-400" />
              Plans & Entitlements Engine
            </h1>
            <span className="bg-indigo-500/20 text-indigo-300 text-xs px-2.5 py-0.5 rounded-full font-mono border border-indigo-500/30">
              SaaS Control
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Configure dynamic subscription tiers, feature flags, resource caps, and promo discounts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          {activeTab === "plans" ? (
            <button
              onClick={openNewPlanModal}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Create Dynamic Plan
            </button>
          ) : (
            <button
              onClick={openNewCouponModal}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-600/30 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Create Promo Coupon
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800/80 gap-6">
        <button
          onClick={() => setActiveTab("plans")}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 transition-colors border-b-2 ${
            activeTab === "plans"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Layers className="w-4 h-4" />
          Subscription Plans ({plans.length})
        </button>
        <button
          onClick={() => setActiveTab("coupons")}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 transition-colors border-b-2 ${
            activeTab === "coupons"
              ? "border-purple-500 text-purple-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Tag className="w-4 h-4" />
          Promo Coupons ({coupons.length})
        </button>
      </div>

      {/* PLANS TAB CONTENT */}
      {activeTab === "plans" && (
        plans.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-2xl">
            <p className="text-slate-300 font-medium">No plans configured.</p>
            <p className="text-xs text-slate-500 mt-1 mb-4">Create your first subscription tier to start accepting photographer registrations.</p>
            <button
              onClick={openNewPlanModal}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create Plan Tier</span>
            </button>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-2xl border bg-slate-900/60 p-5 flex flex-col justify-between backdrop-blur-sm transition-all hover:border-slate-700 ${
                plan.isPopular ? "border-indigo-500/50 shadow-lg shadow-indigo-500/10" : "border-slate-800"
              } ${!plan.isActive ? "opacity-60 border-dashed" : ""}`}
            >
              <div>
                {/* Header badge & title */}
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
                <h3 className="text-lg font-bold text-white tracking-tight">{plan.name}</h3>
                <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{plan.tagline || plan.description}</p>

                {/* Pricing */}
                <div className="mt-4 pt-4 border-t border-slate-800/80">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-white">₹{plan.priceMonthlyPaise / 100}</span>
                    <span className="text-xs text-slate-400">/month</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                    Yearly: ₹{plan.priceYearlyPaise / 100}/yr (Save {Math.round((1 - (plan.priceYearlyPaise / (plan.priceMonthlyPaise * 12 || 1))) * 100)}%)
                  </div>
                </div>

                {/* Resource Limits List */}
                <div className="mt-4 space-y-1.5 text-xs text-slate-300">
                  <div className="flex justify-between py-1 border-b border-slate-800/40">
                    <span className="text-slate-400">Weddings:</span>
                    <span className="font-semibold text-white">
                      {plan.limits.maxProjects === -1 ? "Unlimited" : plan.limits.maxProjects}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/40">
                    <span className="text-slate-400">Photo Cap:</span>
                    <span className="font-semibold text-white">
                      {plan.limits.maxPhotos === -1 ? "Unlimited" : `${plan.limits.maxPhotos.toLocaleString()}`}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/40">
                    <span className="text-slate-400">Storage:</span>
                    <span className="font-semibold text-white">
                      {plan.limits.maxStorageGb === -1 ? "Unlimited" : `${plan.limits.maxStorageGb} GB`}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/40">
                    <span className="text-slate-400">Custom Domains:</span>
                    <span className="font-semibold text-white">
                      {plan.limits.maxCustomDomains}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/40">
                    <span className="text-slate-400">Team Seats:</span>
                    <span className="font-semibold text-white">
                      {plan.limits.maxTeamMembers}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/40">
                    <span className="text-slate-400">AI Credits:</span>
                    <span className="font-semibold text-white">
                      {plan.limits.maxAiCredits}
                    </span>
                  </div>
                </div>

                {/* Key feature pills */}
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {plan.features.whiteLabel && (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      White Label
                    </span>
                  )}
                  {plan.features.advancedGalleryTemplates && (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                      All 6 Templates
                    </span>
                  )}
                  {plan.features.aiFeatures && (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/10 text-purple-300 border border-purple-500/20">
                      AI Tools
                    </span>
                  )}
                  {plan.features.prioritySupport && (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      VIP Support
                    </span>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => {
                    setIsNewPlan(false);
                    setEditingPlan(JSON.parse(JSON.stringify(plan)));
                  }}
                  className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5 text-indigo-400" />
                  Edit Plan
                </button>
                <button
                  onClick={() => handleDeletePlan(plan.id, plan.name)}
                  className="p-1.5 rounded-lg text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Delete Plan"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
        )
      )}

      {/* COUPONS TAB CONTENT */}
      {activeTab === "coupons" && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-mono">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Coupon Code</th>
                  <th className="py-3.5 px-4 font-semibold">Discount</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold">Redemptions</th>
                  <th className="py-3.5 px-4 font-semibold">Validity</th>
                  <th className="py-3.5 px-4 font-semibold">Applicable Plans</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {coupons.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 px-4 text-center text-slate-400">
                      No promo coupons configured yet.
                    </td>
                  </tr>
                ) : (
                  coupons.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      <span className="bg-purple-500/10 border border-purple-500/30 px-2 py-1 rounded text-purple-300">
                        {c.code}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-emerald-400">
                      {c.discountType === "PERCENT" ? `${c.discountValue}% OFF` : `₹${c.discountValue / 100} FLAT`}
                    </td>
                    <td className="py-3.5 px-4">
                      {c.isActive ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          <Check className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-400 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-full text-[10px]">
                          Disabled
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      {c.timesRedeemed} / {c.maxRedemptions || "∞"}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {c.validUntil ? `Until ${new Date(c.validUntil).toLocaleDateString()}` : "No expiry"}
                    </td>
                    <td className="py-3.5 px-4">
                      {c.allowedPlans && c.allowedPlans.length > 0 ? (
                        <div className="flex gap-1 flex-wrap">
                          {c.allowedPlans.map((p) => (
                            <span key={p} className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px] uppercase font-mono">
                              {p}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400">All Plans</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          setIsNewCoupon(false);
                          setEditingCoupon(JSON.parse(JSON.stringify(c)));
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                        title="Edit Coupon"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PLAN EDIT / CREATE MODAL */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-indigo-400" />
                {isNewPlan ? "Create New Dynamic Plan" : `Edit Plan: ${editingPlan.name}`}
              </h2>
              <button
                onClick={() => setEditingPlan(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="mt-6 space-y-6">
              {/* General Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Plan Name *</label>
                  <input
                    type="text"
                    required
                    value={editingPlan.name}
                    onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. Pro Studio"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Slug (Identifier) *</label>
                  <input
                    type="text"
                    required
                    value={editingPlan.slug}
                    onChange={(e) => setEditingPlan({ ...editingPlan, slug: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. pro"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Monthly Price (Paise) *</label>
                  <input
                    type="number"
                    required
                    value={editingPlan.priceMonthlyPaise}
                    onChange={(e) => setEditingPlan({ ...editingPlan, priceMonthlyPaise: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">
                    = ₹{editingPlan.priceMonthlyPaise / 100}/month
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Yearly Price (Paise) *</label>
                  <input
                    type="number"
                    required
                    value={editingPlan.priceYearlyPaise}
                    onChange={(e) => setEditingPlan({ ...editingPlan, priceYearlyPaise: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">
                    = ₹{editingPlan.priceYearlyPaise / 100}/year
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Badge Text</label>
                  <input
                    type="text"
                    value={editingPlan.badge || ""}
                    onChange={(e) => setEditingPlan({ ...editingPlan, badge: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. Most Popular"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tagline</label>
                  <input
                    type="text"
                    value={editingPlan.tagline || ""}
                    onChange={(e) => setEditingPlan({ ...editingPlan, tagline: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    placeholder="Brief description for cards"
                  />
                </div>
              </div>

              {/* Resource Caps & Limits */}
              <div className="pt-4 border-t border-slate-800">
                <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider font-mono mb-3">
                  Resource Limits (-1 for Unlimited)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Max Projects</label>
                    <input
                      type="number"
                      value={editingPlan.limits.maxProjects}
                      onChange={(e) =>
                        setEditingPlan({
                          ...editingPlan,
                          limits: { ...editingPlan.limits, maxProjects: Number(e.target.value) },
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Max Photos</label>
                    <input
                      type="number"
                      value={editingPlan.limits.maxPhotos}
                      onChange={(e) =>
                        setEditingPlan({
                          ...editingPlan,
                          limits: { ...editingPlan.limits, maxPhotos: Number(e.target.value) },
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Max Storage (GB)</label>
                    <input
                      type="number"
                      value={editingPlan.limits.maxStorageGb}
                      onChange={(e) =>
                        setEditingPlan({
                          ...editingPlan,
                          limits: { ...editingPlan.limits, maxStorageGb: Number(e.target.value) },
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Custom Domains</label>
                    <input
                      type="number"
                      value={editingPlan.limits.maxCustomDomains}
                      onChange={(e) =>
                        setEditingPlan({
                          ...editingPlan,
                          limits: { ...editingPlan.limits, maxCustomDomains: Number(e.target.value) },
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Team Seats</label>
                    <input
                      type="number"
                      value={editingPlan.limits.maxTeamMembers}
                      onChange={(e) =>
                        setEditingPlan({
                          ...editingPlan,
                          limits: { ...editingPlan.limits, maxTeamMembers: Number(e.target.value) },
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">AI Credits</label>
                    <input
                      type="number"
                      value={editingPlan.limits.maxAiCredits}
                      onChange={(e) =>
                        setEditingPlan({
                          ...editingPlan,
                          limits: { ...editingPlan.limits, maxAiCredits: Number(e.target.value) },
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Feature Matrix Toggles */}
              <div className="pt-4 border-t border-slate-800">
                <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider font-mono mb-3">
                  Entitlement Feature Flags
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {[
                    { key: "whiteLabel", label: "100% White-Label (No DR Branding)" },
                    { key: "customDomains", label: "Custom Domain Mapping" },
                    { key: "advancedGalleryTemplates", label: "All 6 Premium Templates" },
                    { key: "analytics", label: "Client Activity Analytics" },
                    { key: "aiFeatures", label: "AI Culling & Highlights" },
                    { key: "teamCollaboration", label: "Multi-User Team Seats" },
                    { key: "prioritySync", label: "Priority Drive Re-sync" },
                    { key: "prioritySupport", label: "VIP Dedicated Support" },
                  ].map((feat) => (
                    <label
                      key={feat.key}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer hover:border-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={!!editingPlan.features[feat.key as keyof PlanFeatures]}
                        onChange={(e) =>
                          setEditingPlan({
                            ...editingPlan,
                            features: {
                              ...editingPlan.features,
                              [feat.key]: e.target.checked,
                            },
                          })
                        }
                        className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4 bg-slate-900"
                      />
                      <span className="text-xs font-medium text-slate-200">{feat.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Status & Options */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingPlan.isActive}
                      onChange={(e) => setEditingPlan({ ...editingPlan, isActive: e.target.checked })}
                      className="rounded border-slate-700 text-indigo-600 w-4 h-4 bg-slate-900"
                    />
                    <span className="text-xs font-medium text-slate-300">Active (Publicly selectable)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingPlan.isPopular}
                      onChange={(e) => setEditingPlan({ ...editingPlan, isPopular: e.target.checked })}
                      className="rounded border-slate-700 text-indigo-600 w-4 h-4 bg-slate-900"
                    />
                    <span className="text-xs font-medium text-slate-300">Highlight as Popular</span>
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingPlan(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4" />
                    {isSaving ? "Saving..." : "Save Plan Configuration"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COUPON EDIT / CREATE MODAL */}
      {editingCoupon && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Tag className="w-5 h-5 text-purple-400" />
                {isNewCoupon ? "Create Promo Coupon" : `Edit Coupon: ${editingCoupon.code}`}
              </h2>
              <button
                onClick={() => setEditingCoupon(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCoupon} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Coupon Code *</label>
                <input
                  type="text"
                  required
                  value={editingCoupon.code}
                  onChange={(e) => setEditingCoupon({ ...editingCoupon, code: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono uppercase focus:outline-none focus:border-purple-500"
                  placeholder="e.g. WEDDING50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Discount Type</label>
                  <select
                    value={editingCoupon.discountType}
                    onChange={(e) =>
                      setEditingCoupon({
                        ...editingCoupon,
                        discountType: e.target.value as "PERCENT" | "FLAT_AMOUNT",
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="PERCENT">Percentage (%)</option>
                    <option value="FLAT_AMOUNT">Flat Amount (Paise)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {editingCoupon.discountType === "PERCENT" ? "Discount %" : "Discount in Paise (100 = ₹1)"}
                  </label>
                  <input
                    type="number"
                    required
                    value={editingCoupon.discountValue}
                    onChange={(e) =>
                      setEditingCoupon({ ...editingCoupon, discountValue: Number(e.target.value) })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Max Redemptions (Optional)</label>
                <input
                  type="number"
                  value={editingCoupon.maxRedemptions || ""}
                  onChange={(e) =>
                    setEditingCoupon({
                      ...editingCoupon,
                      maxRedemptions: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                  placeholder="Leave empty for unlimited"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={editingCoupon.isActive}
                  onChange={(e) => setEditingCoupon({ ...editingCoupon, isActive: e.target.checked })}
                  className="rounded border-slate-700 text-purple-600 w-4 h-4 bg-slate-900"
                />
                <span className="text-xs font-medium text-slate-300">Active and redeemable</span>
              </label>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCoupon(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-600/30 transition-all flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? "Saving..." : "Save Coupon"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
