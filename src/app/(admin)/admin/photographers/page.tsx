"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Users,
  Search,
  Filter,
  PlusCircle,
  MoreVertical,
  Shield,
  Eye,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  HardDrive,
  Film,
  Crown,
  Key,
} from "lucide-react";
import { SubscriptionPlanTier } from "@/lib/project-types";

export default function PhotographersDirectoryPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-slate-400">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading photographers...
        </div>
      }
    >
      <PhotographersDirectoryContent />
    </Suspense>
  );
}

function PhotographersDirectoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStatus = searchParams?.get("status") || "all";

  const [photographers, setPhotographers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [planFilter, setPlanFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [overrideModalTarget, setOverrideModalTarget] = useState<any | null>(null);
  const [suspendModalTarget, setSuspendModalTarget] = useState<any | null>(null);
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);

  // Form states
  const [newPhotog, setNewPhotog] = useState({
    name: "",
    email: "",
    password: "",
    studioName: "",
    phone: "",
    plan: "FREE",
  });
  const [overrideForm, setOverrideForm] = useState({
    plan: "PRO" as SubscriptionPlanTier,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    reason: "VIP Partner Beta Access",
  });
  const [suspendReason, setSuspendReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const loadPhotographers = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (planFilter !== "all") params.set("plan", planFilter);
    if (sortBy) params.set("sortBy", sortBy);
    if (sortOrder) params.set("sortOrder", sortOrder);

    fetch(`/api/admin/photographers?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setPhotographers(data.photographers);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPhotographers();
  }, [search, statusFilter, planFilter, sortBy, sortOrder]);

  const handleImpersonate = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to enter ADMIN SUPPORT MODE for "${name}"? You will temporarily assume their dashboard view.`)) {
      return;
    }

    setImpersonatingId(id);
    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photographerId: id }),
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = data.redirectUrl || "/dashboard";
      } else {
        alert(data.error || "Failed to impersonate");
        setImpersonatingId(null);
      }
    } catch {
      alert("Error starting support session");
      setImpersonatingId(null);
    }
  };

  const handleCreatePhotographer = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/admin/photographers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPhotog),
      });
      const data = await res.json();
      if (data.success) {
        setAddModalOpen(false);
        setNewPhotog({ name: "", email: "", password: "", studioName: "", phone: "", plan: "FREE" });
        loadPhotographers();
      } else {
        setErrorMsg(data.error || "Failed to create photographer");
      }
    } catch {
      setErrorMsg("Network error creating photographer");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSavePlanOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideModalTarget) return;
    setActionLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch(`/api/admin/photographers/${overrideModalTarget.id}/override-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set",
          plan: overrideForm.plan,
          expiresAt: new Date(overrideForm.expiresAt).toISOString(),
          reason: overrideForm.reason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setOverrideModalTarget(null);
        loadPhotographers();
      } else {
        setErrorMsg(data.error || "Failed to set plan override");
      }
    } catch {
      setErrorMsg("Network error saving plan override");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokePlanOverride = async (photographerId: string) => {
    if (!confirm("Revoke manual admin plan override for this photographer?")) return;
    try {
      const res = await fetch(`/api/admin/photographers/${photographerId}/override-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke" }),
      });
      const data = await res.json();
      if (data.success) {
        loadPhotographers();
      }
    } catch {}
  };

  const handleStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suspendModalTarget) return;
    setActionLoading(true);
    setErrorMsg("");

    const isSuspending = suspendModalTarget.status !== "suspended";
    const action = isSuspending ? "suspend" : "reactivate";

    try {
      const res = await fetch(`/api/admin/photographers/${suspendModalTarget.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reason: suspendReason || "Platform Terms Compliance Review",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuspendModalTarget(null);
        setSuspendReason("");
        loadPhotographers();
      } else {
        setErrorMsg(data.error || "Failed to update status");
      }
    } catch {
      setErrorMsg("Network error updating status");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Photographer & Studio Directory
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Search, inspect, impersonate, and manage multi-tenant accounts and plan permissions.
          </p>
        </div>
        <button
          onClick={() => setAddModalOpen(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add Photographer</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, email, studio, or custom domain..."
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
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="trial">Trialing</option>
              <option value="past_due">Past Due</option>
              <option value="suspended">Suspended</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700/60 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Plans</option>
              <option value="FREE">Free Tier</option>
              <option value="STARTER">Starter Tier</option>
              <option value="PRO">Pro Tier</option>
              <option value="STUDIO">Studio Tier</option>
            </select>
          </div>
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-mono text-[11px] uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3 font-semibold">Photographer / Studio</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Plan</th>
                <th className="px-4 py-3 font-semibold">Weddings</th>
                <th className="px-4 py-3 font-semibold">Media & Volume</th>
                <th className="px-4 py-3 font-semibold">Custom Domain</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading tenants...
                  </td>
                </tr>
              ) : photographers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    {search || statusFilter !== "all" || planFilter !== "all"
                      ? "No photographers found matching current filters."
                      : "No photographers found."}
                  </td>
                </tr>
              ) : (
                photographers.map((p) => {
                  const isSuspended = p.status === "suspended";
                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isSuspended ? "bg-rose-950/10" : ""
                      }`}
                    >
                      {/* Name & Studio */}
                      <td className="px-4 py-3.5">
                        <Link
                          href={`/admin/photographers/${p.id}`}
                          className="font-semibold text-white hover:text-indigo-300 transition-colors block"
                        >
                          {p.name}
                        </Link>
                        <div className="text-[11px] text-slate-400 truncate max-w-[200px]">
                          {p.studioName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{p.email}</div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {isSuspended ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 font-mono text-[10px] font-semibold uppercase">
                            <XCircle className="w-3 h-3" />
                            Suspended
                          </span>
                        ) : p.subscriptionStatus === "TRIAL" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-[10px] font-semibold uppercase">
                            <Clock className="w-3 h-3" />
                            Trial
                          </span>
                        ) : p.subscriptionStatus === "PAST_DUE" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-300 font-mono text-[10px] font-semibold uppercase">
                            <AlertTriangle className="w-3 h-3" />
                            Past Due
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[10px] font-semibold uppercase">
                            <CheckCircle2 className="w-3 h-3" />
                            Active
                          </span>
                        )}
                      </td>

                      {/* Plan */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-200">
                            {p.plan}
                          </span>
                          {p.isOverride && (
                            <span className="bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[9px] px-1.5 py-0.2 rounded font-mono font-bold">
                              ADMIN GRANTED
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Weddings */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-semibold text-white">{p.totalWeddings}</span>
                        <span className="text-slate-400 text-[11px] ml-1">
                          ({p.publishedWeddings} live)
                        </span>
                      </td>

                      {/* Media & Storage */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div>
                          <span className="text-slate-200 font-medium">{p.totalPhotos}</span> photos •{" "}
                          <span className="text-slate-200 font-medium">{p.totalVideos}</span> videos
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {p.totalStorageGb} GB volume
                        </div>
                      </td>

                      {/* Custom Domain */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {p.customDomain ? (
                          <span className="text-indigo-300 font-mono text-[11px] flex items-center gap-1">
                            {p.customDomain}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">None</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Impersonate */}
                          <button
                            onClick={() => handleImpersonate(p.id, p.name)}
                            disabled={impersonatingId === p.id}
                            className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1"
                            title="Log in as photographer in Support Mode"
                          >
                            <Key className="w-3 h-3" />
                            <span>Support Login</span>
                          </button>

                          {/* Detail View */}
                          <Link
                            href={`/admin/photographers/${p.id}`}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
                            title="View Deep Profile"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>

                          {/* Quick Override */}
                          <button
                            onClick={() => {
                              setOverrideModalTarget(p);
                              setOverrideForm({
                                plan: p.plan,
                                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                                  .toISOString()
                                  .split("T")[0],
                                reason: "VIP Partner Beta",
                              });
                            }}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg transition-colors"
                            title="Plan Override"
                          >
                            <Crown className="w-3.5 h-3.5" />
                          </button>

                          {/* Suspend / Reactivate */}
                          <button
                            onClick={() => {
                              setSuspendModalTarget(p);
                              setSuspendReason(
                                p.status === "suspended" ? "" : "Policy terms review"
                              );
                            }}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isSuspended
                                ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                                : "bg-rose-500/20 text-rose-300 hover:bg-rose-500/30"
                            }`}
                            title={isSuspended ? "Reactivate Tenant" : "Suspend Tenant"}
                          >
                            {isSuspended ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD PHOTOGRAPHER MODAL */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-indigo-400" />
              <span>Provision New Photographer Account</span>
            </h2>
            <p className="text-xs text-slate-400">
              Manually onboard a studio or photographer tenant with custom credentials.
            </p>

            {errorMsg && (
              <div className="p-3 bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs rounded-xl">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreatePhotographer} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newPhotog.name}
                  onChange={(e) => setNewPhotog({ ...newPhotog, name: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Email Address *</label>
                <input
                  type="email"
                  required
                  value={newPhotog.email}
                  onChange={(e) => setNewPhotog({ ...newPhotog, email: e.target.value })}
                  placeholder="rahul@cinemastudio.com"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Temporary Password (min 8 chars) *</label>
                <input
                  type="text"
                  required
                  minLength={8}
                  value={newPhotog.password}
                  onChange={(e) => setNewPhotog({ ...newPhotog, password: e.target.value })}
                  placeholder="Enter strong temporary password"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Studio Name</label>
                  <input
                    type="text"
                    value={newPhotog.studioName}
                    onChange={(e) => setNewPhotog({ ...newPhotog, studioName: e.target.value })}
                    placeholder="e.g. Rahul Cinema Works"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Phone</label>
                  <input
                    type="text"
                    value={newPhotog.phone}
                    onChange={(e) => setNewPhotog({ ...newPhotog, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20"
                >
                  {actionLoading ? "Creating..." : "Create Tenant Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PLAN OVERRIDE MODAL */}
      {overrideModalTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-400" />
              <span>Admin Plan Override</span>
            </h2>
            <p className="text-xs text-slate-400">
              Grant a manual VIP or beta tier to <strong>{overrideModalTarget.name}</strong> without requiring Razorpay payment.
            </p>

            {overrideModalTarget.isOverride && (
              <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-center justify-between">
                <span>Current: {overrideModalTarget.plan} (ADMIN GRANTED)</span>
                <button
                  type="button"
                  onClick={() => handleRevokePlanOverride(overrideModalTarget.id)}
                  className="text-rose-400 hover:text-rose-300 font-semibold"
                >
                  Revoke Override
                </button>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs rounded-xl">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSavePlanOverride} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Target Plan Tier *</label>
                <select
                  value={overrideForm.plan}
                  onChange={(e) => setOverrideForm({ ...overrideForm, plan: e.target.value as SubscriptionPlanTier })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="FREE">FREE</option>
                  <option value="STARTER">STARTER</option>
                  <option value="PRO">PRO</option>
                  <option value="STUDIO">STUDIO</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Override Expiration Date *</label>
                <input
                  type="date"
                  required
                  value={overrideForm.expiresAt}
                  onChange={(e) => setOverrideForm({ ...overrideForm, expiresAt: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Reason for Override *</label>
                <input
                  type="text"
                  required
                  value={overrideForm.reason}
                  onChange={(e) => setOverrideForm({ ...overrideForm, reason: e.target.value })}
                  placeholder="e.g. VIP Studio Partner / Extended Trial"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setOverrideModalTarget(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold shadow-md shadow-amber-500/20"
                >
                  {actionLoading ? "Applying..." : "Apply Plan Override"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUSPEND / REACTIVATE MODAL */}
      {suspendModalTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              {suspendModalTarget.status === "suspended" ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>Reactivate Photographer Account</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                  <span>Suspend Photographer Account</span>
                </>
              )}
            </h2>
            <p className="text-xs text-slate-400">
              {suspendModalTarget.status === "suspended"
                ? `Restore full dashboard access for ${suspendModalTarget.name}.`
                : `Suspend ${suspendModalTarget.name}'s dashboard. Their client galleries will remain safely preserved, but they cannot upload or edit projects.`}
            </p>

            {errorMsg && (
              <div className="p-3 bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs rounded-xl">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleStatusChange} className="space-y-3 text-xs">
              {suspendModalTarget.status !== "suspended" && (
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Reason for Suspension *</label>
                  <textarea
                    required
                    rows={3}
                    value={suspendReason}
                    onChange={(e) => setSuspendReason(e.target.value)}
                    placeholder="Provide clear reason (e.g. Terms violation, overdue payment, customer request)..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSuspendModalTarget(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className={`px-4 py-2 rounded-xl text-xs font-bold shadow-md ${
                    suspendModalTarget.status === "suspended"
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20"
                      : "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20"
                  }`}
                >
                  {actionLoading
                    ? "Updating..."
                    : suspendModalTarget.status === "suspended"
                    ? "Reactivate Account"
                    : "Confirm Suspension"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
