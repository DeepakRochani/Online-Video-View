"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Users,
  Film,
  CreditCard,
  HardDrive,
  Crown,
  Key,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ArrowLeft,
  ExternalLink,
  PlusCircle,
  FileText,
  MessageSquare,
  Shield,
  Send,
  HelpCircle,
  Check,
  RefreshCw,
} from "lucide-react";
import { SubscriptionPlanTier } from "@/lib/project-types";

export default function PhotographerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "weddings" | "subscription" | "notes" | "tickets" | "audit">("overview");

  // Notes state
  const [newNote, setNewNote] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);

  // Tickets state
  const [newTicketModal, setNewTicketModal] = useState(false);
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketDesc, setTicketDesc] = useState("");
  const [ticketPriority, setTicketPriority] = useState("medium");
  const [submittingTicket, setSubmittingTicket] = useState(false);

  // Override & Suspend Modals
  const [overrideModal, setOverrideModal] = useState(false);
  const [overrideForm, setOverrideForm] = useState({
    plan: "PRO" as SubscriptionPlanTier,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    reason: "VIP Studio Partner",
  });
  const [suspendModal, setSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [resetPwModal, setResetPwModal] = useState(false);
  const [resetPwValue, setResetPwValue] = useState("");
  const [resetPwSuccess, setResetPwSuccess] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [impersonating, setImpersonating] = useState(false);

  const loadData = () => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/admin/photographers/${id}`)
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setData(res);
          if (res.photographer?.adminPlanOverride) {
            setOverrideForm({
              plan: res.photographer.adminPlanOverride.plan,
              expiresAt: new Date(res.photographer.adminPlanOverride.expiresAt).toISOString().split("T")[0],
              reason: res.photographer.adminPlanOverride.reason || "",
            });
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleImpersonate = async () => {
    if (!data?.photographer) return;
    if (!confirm(`Enter ADMIN SUPPORT MODE for "${data.photographer.name}"?`)) return;

    setImpersonating(true);
    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photographerId: id }),
      });
      const resData = await res.json();
      if (resData.success) {
        window.location.href = resData.redirectUrl || "/dashboard";
      } else {
        alert(resData.error || "Failed to impersonate");
        setImpersonating(false);
      }
    } catch {
      alert("Error initiating support session");
      setImpersonating(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setSubmittingNote(true);

    try {
      const res = await fetch("/api/admin/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photographerId: id, note: newNote }),
      });
      const resData = await res.json();
      if (resData.success) {
        setNewNote("");
        loadData();
      }
    } catch {} finally {
      setSubmittingNote(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketDesc.trim()) return;
    setSubmittingTicket(true);

    try {
      const res = await fetch("/api/admin/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photographerId: id,
          photographerName: data?.photographer?.name,
          photographerEmail: data?.photographer?.email,
          subject: ticketSubject,
          description: ticketDesc,
          priority: ticketPriority,
        }),
      });
      const resData = await res.json();
      if (resData.success) {
        setNewTicketModal(false);
        setTicketSubject("");
        setTicketDesc("");
        loadData();
      }
    } catch {} finally {
      setSubmittingTicket(false);
    }
  };

  const handleUpdateTicketStatus = async (ticketId: string, newStatus: string) => {
    try {
      await fetch("/api/admin/tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, status: newStatus }),
      });
      loadData();
    } catch {}
  };

  const handleSavePlanOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      const res = await fetch(`/api/admin/photographers/${id}/override-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set",
          plan: overrideForm.plan,
          expiresAt: new Date(overrideForm.expiresAt).toISOString(),
          reason: overrideForm.reason,
        }),
      });
      const resData = await res.json();
      if (resData.success) {
        setOverrideModal(false);
        loadData();
      }
    } catch {} finally {
      setActionLoading(false);
    }
  };

  const handleRevokePlanOverride = async () => {
    if (!confirm("Revoke manual admin plan override?")) return;
    try {
      await fetch(`/api/admin/photographers/${id}/override-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke" }),
      });
      loadData();
    } catch {}
  };

  const handleStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    const isSuspended = data?.photographer?.status === "suspended";
    const action = isSuspended ? "reactivate" : "suspend";

    try {
      const res = await fetch(`/api/admin/photographers/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reason: suspendReason || "Platform Terms Compliance Review",
        }),
      });
      const resData = await res.json();
      if (resData.success) {
        setSuspendModal(false);
        setSuspendReason("");
        loadData();
      }
    } catch {} finally {
      setActionLoading(false);
    }
  };

  const handleForceLogout = async () => {
    if (!confirm(`Force logout all active sessions for "${data?.photographer?.name}"?`)) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/photographers/${id}/force-logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const resData = await res.json();
      if (resData.success) {
        alert("All active sessions for this photographer have been immediately revoked.");
        loadData();
      } else {
        alert(resData.error || "Failed to force logout");
      }
    } catch {
      alert("Network error forcing logout");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdminResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPwValue || resetPwValue.length < 8) {
      alert("Password must be at least 8 characters.");
      return;
    }
    setActionLoading(true);
    setResetPwSuccess("");
    try {
      const res = await fetch(`/api/admin/photographers/${id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: resetPwValue }),
      });
      const resData = await res.json();
      if (resData.success) {
        setResetPwSuccess("Password reset successfully! All prior sessions revoked.");
        setResetPwValue("");
        loadData();
        setTimeout(() => {
          setResetPwModal(false);
          setResetPwSuccess("");
        }, 2000);
      } else {
        alert(resData.error || "Failed to reset password");
      }
    } catch {
      alert("Network error resetting password");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400">
        <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Loading tenant inspector...
      </div>
    );
  }

  if (!data || !data.photographer) {
    return (
      <div className="py-20 text-center text-slate-400">
        <h2 className="text-lg font-bold text-white mb-2">Photographer Not Found</h2>
        <Link href="/admin/photographers" className="text-xs text-indigo-400 hover:underline">
          ← Back to Photographers Directory
        </Link>
      </div>
    );
  }

  const { photographer, stats, subscription, invoices, domains, projects, notes, tickets, auditLogs } = data;
  const isSuspended = photographer.status === "suspended";
  const hasOverride = !!photographer.adminPlanOverride;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/admin/photographers"
          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Photographers</span>
        </Link>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Support Mode Impersonate */}
          <button
            onClick={handleImpersonate}
            disabled={impersonating}
            className="px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
          >
            <Key className="w-3.5 h-3.5" />
            <span>{impersonating ? "Starting Support Mode..." : "Support Mode Login"}</span>
          </button>

          {/* Force Logout */}
          <button
            onClick={handleForceLogout}
            disabled={actionLoading}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
            title="Revoke all active sessions immediately"
          >
            <Shield className="w-3.5 h-3.5 text-rose-400" />
            <span>Force Logout</span>
          </button>

          {/* Reset Password */}
          <button
            onClick={() => {
              setResetPwModal(true);
              setResetPwValue("");
              setResetPwSuccess("");
            }}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
          >
            <Key className="w-3.5 h-3.5 text-indigo-400" />
            <span>Reset Password</span>
          </button>

          {/* Override Plan */}
          <button
            onClick={() => setOverrideModal(true)}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-800 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
          >
            <Crown className="w-3.5 h-3.5" />
            <span>Plan Override</span>
          </button>

          {/* Suspend / Reactivate */}
          <button
            onClick={() => {
              setSuspendModal(true);
              setSuspendReason(isSuspended ? "" : "Policy terms review");
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              isSuspended
                ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                : "bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40"
            }`}
          >
            {isSuspended ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
            <span>{isSuspended ? "Reactivate Account" : "Suspend Account"}</span>
          </button>
        </div>
      </div>

      {/* Photographer Header Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-indigo-950/40 border border-slate-800 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-indigo-600/30">
              {photographer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  {photographer.name}
                </h1>
                {isSuspended ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-mono font-bold uppercase">
                    SUSPENDED
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold uppercase">
                    ACTIVE
                  </span>
                )}
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-[10px] font-mono font-bold uppercase">
                  {photographer.adminPlanOverride?.plan || subscription?.plan || "FREE"}
                </span>
                {hasOverride && (
                  <span className="px-2 py-0.5 rounded bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[9px] font-mono font-bold">
                    ADMIN OVERRIDE
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-300 mt-1">
                <strong>{photographer.studioName}</strong> &bull; {photographer.email} {photographer.phone && `• ${photographer.phone}`}
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                ID: {photographer.id} &bull; Joined: {new Date(photographer.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t sm:border-t-0 sm:border-l border-slate-800 pt-4 sm:pt-0 sm:pl-6">
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-mono">Weddings</div>
              <div className="text-lg font-bold text-white font-mono">{stats.totalWeddings}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-mono">Photos</div>
              <div className="text-lg font-bold text-indigo-400 font-mono">{stats.totalPhotos}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-mono">Videos</div>
              <div className="text-lg font-bold text-purple-400 font-mono">{stats.totalVideos}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-mono">Storage</div>
              <div className="text-lg font-bold text-emerald-400 font-mono">{stats.totalStorageGb} GB</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-800 gap-2 overflow-x-auto">
        {[
          { id: "overview", label: "Overview & Stats", icon: Users },
          { id: "weddings", label: `Weddings (${projects.length})`, icon: Film },
          { id: "subscription", label: "Subscription & Invoices", icon: CreditCard },
          { id: "notes", label: `Internal Notes (${notes.length})`, icon: MessageSquare },
          { id: "tickets", label: `Support Tickets (${tickets.length})`, icon: HelpCircle },
          { id: "audit", label: `Audit Log (${auditLogs.length})`, icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? "border-indigo-500 text-indigo-300 bg-indigo-500/10"
                  : "border-transparent text-slate-400 hover:text-white hover:bg-slate-900/60"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-3">
            <h3 className="text-xs font-mono font-bold text-slate-400 uppercase">Studio Branding & Profile</h3>
            <div className="space-y-2 text-xs text-slate-300">
              <div><strong>Studio Name:</strong> {photographer.studioName}</div>
              <div><strong>Tagline:</strong> {photographer.tagline || "None"}</div>
              <div><strong>Website:</strong> {photographer.website || "None"}</div>
              <div><strong>Account Role:</strong> {photographer.role}</div>
              <div><strong>Status:</strong> {photographer.status || "active"}</div>
              {photographer.suspensionReason && (
                <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs">
                  <strong>Suspension Reason:</strong> {photographer.suspensionReason}
                </div>
              )}
            </div>
          </div>

          <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-3">
            <h3 className="text-xs font-mono font-bold text-slate-400 uppercase">Custom Domain & Delivery</h3>
            <div className="space-y-2 text-xs text-slate-300">
              {domains.length === 0 ? (
                <p className="text-slate-400 italic">No custom domains configured for this studio.</p>
              ) : (
                domains.map((d: any) => (
                  <div key={d.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-mono text-indigo-300 font-semibold">{d.hostname}</div>
                      <div className="text-[10px] text-slate-400">Target CNAME: {d.targetCname}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
                      d.status === "verified" ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
                    }`}>
                      {d.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: WEDDINGS */}
      {activeTab === "weddings" && (
        <div className="space-y-4">
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 font-mono text-[11px] uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Couple / Wedding</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Access Code</th>
                  <th className="px-4 py-3">Media Files</th>
                  <th className="px-4 py-3 text-right">Preview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {projects.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      No wedding projects created by this photographer yet.
                    </td>
                  </tr>
                ) : (
                  projects.map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-white">{p.coupleName}</div>
                        <div className="text-[11px] text-slate-400">{p.weddingDate}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase ${
                          p.status === "published"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : "bg-slate-800 text-slate-400"
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-amber-300 font-bold">
                        {p.accessCode}
                      </td>
                      <td className="px-4 py-3.5">
                        {p.photoCount} photos • {p.videoCount} videos
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <a
                          href={`/gallery/${p.accessCode}?adminPreview=true`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 rounded-lg text-xs font-semibold transition-colors"
                        >
                          <span>Admin Gallery Preview</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: SUBSCRIPTIONS & INVOICES */}
      {activeTab === "subscription" && (
        <div className="space-y-6">
          <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-2xl">
            <h3 className="text-xs font-mono font-bold text-slate-400 uppercase mb-3">Subscription Status</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <div className="text-slate-400">Current Plan:</div>
                <div className="text-base font-bold text-white font-mono mt-1">
                  {photographer.adminPlanOverride?.plan || subscription?.plan || "FREE"}
                  {hasOverride && " (ADMIN GRANTED)"}
                </div>
              </div>
              <div>
                <div className="text-slate-400">Subscription Status:</div>
                <div className="text-base font-bold text-emerald-400 font-mono mt-1">
                  {subscription?.status || "ACTIVE"}
                </div>
              </div>
              <div>
                <div className="text-slate-400">Current Period End:</div>
                <div className="text-base font-semibold text-slate-300 font-mono mt-1">
                  {subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : "N/A"}
                </div>
              </div>
            </div>

            {hasOverride && (
              <div className="mt-4 p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-center justify-between">
                <div>
                  <strong>Admin Plan Override Active:</strong> Tier {photographer.adminPlanOverride.plan} until {new Date(photographer.adminPlanOverride.expiresAt).toLocaleDateString()}.
                  <div className="text-[11px] text-amber-300/80 mt-0.5">Reason: "{photographer.adminPlanOverride.reason}"</div>
                </div>
                <button
                  onClick={handleRevokePlanOverride}
                  className="px-3 py-1 bg-rose-600/30 text-rose-300 border border-rose-500/40 rounded-lg font-semibold hover:bg-rose-600/40"
                >
                  Revoke Override
                </button>
              </div>
            )}
          </div>

          {/* Invoices */}
          <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-2xl">
            <h3 className="text-xs font-mono font-bold text-slate-400 uppercase mb-3">Billing & Payment History</h3>
            <div className="divide-y divide-slate-800/60">
              {invoices.length === 0 ? (
                <p className="py-4 text-slate-400 text-xs italic">No transaction records found.</p>
              ) : (
                invoices.map((inv: any) => (
                  <div key={inv.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-white">₹{inv.amount.toLocaleString("en-IN")} &bull; Tier {inv.plan}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{inv.id} &bull; {new Date(inv.createdAt).toLocaleDateString()}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-semibold uppercase">
                      {inv.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: INTERNAL SUPPORT NOTES */}
      {activeTab === "notes" && (
        <div className="space-y-6">
          <form onSubmit={handleAddNote} className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
            <h3 className="text-xs font-mono font-bold text-slate-300 uppercase flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
              <span>Add Admin Support Note (Private to Platform Admins)</span>
            </h3>
            <textarea
              rows={3}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Enter internal details, conversation logs, special terms, or billing notes..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submittingNote || !newNote.trim()}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submittingNote ? "Saving..." : "Save Note"}</span>
              </button>
            </div>
          </form>

          <div className="space-y-3">
            {notes.length === 0 ? (
              <p className="py-8 text-center text-slate-400 text-xs italic">No internal support notes added yet.</p>
            ) : (
              notes.map((n: any) => (
                <div key={n.id} className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl text-xs space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span className="text-indigo-300 font-semibold">{n.authorName}</span>
                    <span>{new Date(n.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-slate-200 whitespace-pre-wrap">{n.note}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: SUPPORT TICKETS */}
      {activeTab === "tickets" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono font-bold text-slate-400 uppercase">Support Tickets</h3>
            <button
              onClick={() => setNewTicketModal(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Create Ticket</span>
            </button>
          </div>

          <div className="space-y-3">
            {tickets.length === 0 ? (
              <p className="py-8 text-center text-slate-400 text-xs italic">No support tickets recorded for this photographer.</p>
            ) : (
              tickets.map((t: any) => (
                <div key={t.id} className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-white text-sm">{t.subject}</div>
                    <div className="flex items-center gap-2">
                      <select
                        value={t.status}
                        onChange={(e) => handleUpdateTicketStatus(t.id, e.target.value)}
                        className="px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-[11px] text-slate-200 font-mono"
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="waiting">Waiting</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        t.priority === "urgent" ? "bg-rose-500/20 text-rose-300" : "bg-slate-800 text-slate-400"
                      }`}>
                        {t.priority}
                      </span>
                    </div>
                  </div>
                  <p className="text-slate-300">{t.description}</p>
                  <div className="text-[10px] text-slate-400 font-mono pt-2 border-t border-slate-800 flex justify-between">
                    <span>Ticket ID: {t.id}</span>
                    <span>Updated: {new Date(t.updatedAt || t.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: AUDIT LOG */}
      {activeTab === "audit" && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 overflow-hidden">
          <div className="divide-y divide-slate-800/60">
            {auditLogs.length === 0 ? (
              <p className="py-8 text-center text-slate-400 text-xs italic">No audit events logged for this tenant.</p>
            ) : (
              auditLogs.map((l: any) => (
                <div key={l.id} className="py-3 flex items-start justify-between gap-4 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-indigo-900/40 border border-indigo-700/50 text-[10px] font-mono text-indigo-300">
                        {l.action}
                      </span>
                      <span className="text-slate-300 font-semibold">{l.adminEmail}</span>
                    </div>
                    {l.metadata && (
                      <div className="text-[11px] text-slate-400 font-mono mt-1">
                        {JSON.stringify(l.metadata)}
                      </div>
                    )}
                  </div>
                  <div className="text-right text-[11px] text-slate-400 font-mono shrink-0">
                    {new Date(l.timestamp).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* OVERRIDE PLAN MODAL */}
      {overrideModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-400" />
              <span>Admin Plan Override</span>
            </h2>
            <form onSubmit={handleSavePlanOverride} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Target Plan Tier *</label>
                <select
                  value={overrideForm.plan}
                  onChange={(e) => setOverrideForm({ ...overrideForm, plan: e.target.value as SubscriptionPlanTier })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
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
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Reason *</label>
                <input
                  type="text"
                  required
                  value={overrideForm.reason}
                  onChange={(e) => setOverrideForm({ ...overrideForm, reason: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setOverrideModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl"
                >
                  {actionLoading ? "Saving..." : "Apply Override"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUSPEND MODAL */}
      {suspendModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              {isSuspended ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertTriangle className="w-5 h-5 text-rose-400" />}
              <span>{isSuspended ? "Reactivate Account" : "Suspend Account"}</span>
            </h2>
            <form onSubmit={handleStatusChange} className="space-y-3 text-xs">
              {!isSuspended && (
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Suspension Reason *</label>
                  <textarea
                    required
                    rows={3}
                    value={suspendReason}
                    onChange={(e) => setSuspendReason(e.target.value)}
                    placeholder="Provide reason for suspension..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  />
                </div>
              )}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSuspendModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className={`px-4 py-2 rounded-xl font-bold ${
                    isSuspended ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
                  }`}
                >
                  {actionLoading ? "Updating..." : isSuspended ? "Reactivate" : "Confirm Suspension"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE TICKET MODAL */}
      {newTicketModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-indigo-400" />
              <span>Create Support Ticket</span>
            </h2>
            <form onSubmit={handleCreateTicket} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Subject *</label>
                <input
                  type="text"
                  required
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  placeholder="e.g. Google Drive sync permissions issue"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Priority *</label>
                <select
                  value={ticketPriority}
                  onChange={(e) => setTicketPriority(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Description *</label>
                <textarea
                  required
                  rows={4}
                  value={ticketDesc}
                  onChange={(e) => setTicketDesc(e.target.value)}
                  placeholder="Detailed description of the issue or support request..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setNewTicketModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTicket}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl"
                >
                  {submittingTicket ? "Creating..." : "Create Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {resetPwModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-amber-400" />
              <span>Admin Reset Password</span>
            </h2>
            <p className="text-xs text-slate-400">
              Set a temporary or permanent password for <strong className="text-white">{photographer.name}</strong> ({photographer.email}). This will immediately invalidate all active sessions.
            </p>

            {resetPwSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{resetPwSuccess}</span>
              </div>
            )}

            <form onSubmit={handleAdminResetPassword} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">New Password (min 8 chars) *</label>
                <input
                  type="text"
                  required
                  minLength={8}
                  value={resetPwValue}
                  onChange={(e) => setResetPwValue(e.target.value)}
                  placeholder="Enter new strong password"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setResetPwModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !resetPwValue}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl"
                >
                  {actionLoading ? "Updating..." : "Save Password & Invalidate Sessions"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
