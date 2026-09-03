"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  CreditCard,
  Crown,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  Users,
  Search,
  ArrowUpRight,
  PlusCircle,
  Sliders,
  Gift,
  Calendar,
  X,
  Check,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { SubscriptionStatus } from "@/lib/project-types";

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modals state
  const [selectedSub, setSelectedSub] = useState<any | null>(null);
  const [actionType, setActionType] = useState<"extend" | "comp" | "override" | "status" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Extend state
  const [extendDays, setExtendDays] = useState(30);

  // Comp state
  const [compPlan, setCompPlan] = useState("pro");
  const [compDays, setCompDays] = useState(30);
  const [compReason, setCompReason] = useState("VIP Partnership Grant");

  // Status state
  const [newStatus, setNewStatus] = useState<SubscriptionStatus>("ACTIVE");

  // Override state
  const [overrideProjects, setOverrideProjects] = useState<number>(25);
  const [overrideStorage, setOverrideStorage] = useState<number>(50);
  const [overrideDomains, setOverrideDomains] = useState<number>(3);
  const [overrideWhiteLabel, setOverrideWhiteLabel] = useState<boolean>(true);
  const [overrideDays, setOverrideDays] = useState<number>(365);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchSubscriptions = () => {
    setLoading(true);
    fetch("/api/admin/subscriptions")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setSubscriptions(data.subscriptions);
        }
      })
      .catch(() => showToast("error", "Failed to load subscriptions"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub || !actionType) return;
    setIsSubmitting(true);

    try {
      let payload: any = {
        action: actionType,
        photographerId: selectedSub.photographerId,
      };

      if (actionType === "extend") {
        payload.days = Number(extendDays);
      } else if (actionType === "comp") {
        payload.planSlug = compPlan;
        payload.durationDays = Number(compDays);
        payload.reason = compReason;
      } else if (actionType === "status") {
        payload.status = newStatus;
      } else if (actionType === "override") {
        const expiresAt = new Date(Date.now() + overrideDays * 24 * 60 * 60 * 1000).toISOString();
        payload.override = {
          limits: {
            maxProjects: Number(overrideProjects),
            maxStorageGb: Number(overrideStorage),
            maxCustomDomains: Number(overrideDomains),
          },
          features: {
            whiteLabel: overrideWhiteLabel,
          },
          reason: "Super Admin Custom Grant",
          grantedAt: new Date().toISOString(),
          expiresAt,
        };
      }

      const res = await fetch("/api/admin/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");

      showToast("success", data.message || "Subscription updated successfully.");
      setActionType(null);
      setSelectedSub(null);
      fetchSubscriptions();
    } catch (err: any) {
      showToast("error", err.message || "Failed to update subscription");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = subscriptions.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      s.photographerName.toLowerCase().includes(q) ||
      s.photographerEmail.toLowerCase().includes(q) ||
      s.studioName.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast */}
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
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <CreditCard className="w-6 h-6 text-indigo-400" />
            Tenant Subscription Monitor & Control
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time subscriber lifecycle management, extensions, comp grants, and custom entitlement overrides.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/plans"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors flex items-center gap-1.5"
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            Configure Dynamic Plans
          </Link>
          <button
            onClick={fetchSubscriptions}
            disabled={loading}
            className="px-3 py-2 rounded-xl text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search subscriptions by photographer, email, or studio name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950/80 border border-slate-700/60 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700/60 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Subscription States</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="TRIAL">TRIAL</option>
            <option value="GRACE_PERIOD">GRACE PERIOD</option>
            <option value="PAST_DUE">PAST DUE</option>
            <option value="EXPIRED">EXPIRED</option>
            <option value="CANCELLED">CANCELLED</option>
            <option value="SUSPENDED">SUSPENDED</option>
          </select>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-mono text-[11px] uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3.5">Photographer / Studio</th>
                <th className="px-4 py-3.5">Plan Tier</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Period End</th>
                <th className="px-4 py-3.5">Overrides / Notes</th>
                <th className="px-4 py-3.5 text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading subscriptions...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    {search || statusFilter !== "all"
                      ? "No matching subscriptions found."
                      : "No subscriptions yet."}
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3.5">
                      <Link
                        href={`/admin/photographers/${s.photographerId}`}
                        className="font-semibold text-white hover:text-indigo-300 transition-colors block"
                      >
                        {s.photographerName}
                      </Link>
                      <div className="text-[11px] text-slate-400">{s.studioName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{s.photographerEmail}</div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="font-mono font-bold text-white uppercase bg-slate-800/80 px-2 py-1 rounded border border-slate-700">
                        {s.resolvedPlanName || s.plan}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase ${
                          s.status === "ACTIVE"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : s.status === "TRIAL"
                            ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                            : s.status === "GRACE_PERIOD"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : s.status === "PAST_DUE"
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            : s.status === "SUSPENDED"
                            ? "bg-red-950 text-red-400 border border-red-800"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 font-mono text-slate-300">
                      {s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString() : "N/A"}
                    </td>

                    <td className="px-4 py-3.5">
                      {s.entitlementOverride ? (
                        <span className="px-2 py-0.5 rounded bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[10px] font-mono font-bold">
                          CUSTOM OVERRIDE
                        </span>
                      ) : s.isComp ? (
                        <span className="px-2 py-0.5 rounded bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[10px] font-mono font-bold">
                          COMP: {s.compReason || "VIP"}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Standard</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedSub(s);
                            setActionType("extend");
                            setExtendDays(30);
                          }}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition-colors"
                          title="Extend Days"
                        >
                          + Extend
                        </button>
                        <button
                          onClick={() => {
                            setSelectedSub(s);
                            setActionType("comp");
                            setCompPlan("pro");
                            setCompDays(30);
                          }}
                          className="px-2.5 py-1 rounded bg-purple-950/80 hover:bg-purple-900 text-purple-200 border border-purple-800/40 text-[11px] font-medium transition-colors"
                          title="Grant Free Comp"
                        >
                          <Gift className="w-3 h-3 inline mr-1" />
                          Comp
                        </button>
                        <button
                          onClick={() => {
                            setSelectedSub(s);
                            setActionType("override");
                          }}
                          className="px-2.5 py-1 rounded bg-indigo-950/80 hover:bg-indigo-900 text-indigo-200 border border-indigo-800/40 text-[11px] font-medium transition-colors"
                          title="Entitlement Override"
                        >
                          Override
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ACTION MODAL */}
      {actionType && selectedSub && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {actionType === "extend" && <Calendar className="w-5 h-5 text-indigo-400" />}
                {actionType === "comp" && <Gift className="w-5 h-5 text-purple-400" />}
                {actionType === "override" && <Sliders className="w-5 h-5 text-amber-400" />}
                {actionType === "extend" && `Extend Subscription: ${selectedSub.photographerName}`}
                {actionType === "comp" && `Grant Complimentary Access: ${selectedSub.photographerName}`}
                {actionType === "override" && `Custom Entitlement Override: ${selectedSub.photographerName}`}
              </h2>
              <button
                onClick={() => {
                  setActionType(null);
                  setSelectedSub(null);
                }}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleActionSubmit} className="mt-5 space-y-4">
              {actionType === "extend" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Extension Duration (Days) *
                  </label>
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {[7, 14, 30, 90].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setExtendDays(d)}
                        className={`py-1.5 rounded-lg text-xs font-bold font-mono transition-colors ${
                          extendDays === d
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        }`}
                      >
                        +{d} Days
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    required
                    min={1}
                    value={extendDays}
                    onChange={(e) => setExtendDays(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              {actionType === "comp" && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Complimentary Plan</label>
                    <select
                      value={compPlan}
                      onChange={(e) => setCompPlan(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="starter">Starter Studio</option>
                      <option value="pro">Pro Studio (Recommended)</option>
                      <option value="studio">Studio Unlimited</option>
                      <option value="enterprise">Enterprise VIP</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Duration (Days)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={compDays}
                      onChange={(e) => setCompDays(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Reason / Campaign</label>
                    <input
                      type="text"
                      value={compReason}
                      onChange={(e) => setCompReason(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                      placeholder="e.g. VIP Creator Partner Grant"
                    />
                  </div>
                </>
              )}

              {actionType === "override" && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Max Projects</label>
                      <input
                        type="number"
                        value={overrideProjects}
                        onChange={(e) => setOverrideProjects(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Storage (GB)</label>
                      <input
                        type="number"
                        value={overrideStorage}
                        onChange={(e) => setOverrideStorage(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Domains</label>
                      <input
                        type="number"
                        value={overrideDomains}
                        onChange={(e) => setOverrideDomains(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer pt-2">
                    <input
                      type="checkbox"
                      checked={overrideWhiteLabel}
                      onChange={(e) => setOverrideWhiteLabel(e.target.checked)}
                      className="rounded border-slate-700 text-amber-500 w-4 h-4 bg-slate-900"
                    />
                    <span className="text-xs font-medium text-slate-300">Force Enable White-Label</span>
                  </label>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Override Duration (Days)</label>
                    <input
                      type="number"
                      value={overrideDays}
                      onChange={(e) => setOverrideDays(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                </>
              )}

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActionType(null);
                    setSelectedSub(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  {isSubmitting ? "Applying..." : "Confirm & Apply"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
