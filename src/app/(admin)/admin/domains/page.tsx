"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Globe,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Trash2,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Power,
  Layers,
  Lock,
  Zap,
} from "lucide-react";

interface AdminDomainItem {
  id: string;
  photographerId: string;
  projectId?: string;
  domain: string;
  normalizedDomain: string;
  hostname: string;
  type: string;
  status: string;
  rawStatus: string;
  verificationStatus: string;
  verificationToken: string;
  verificationMethod: string;
  targetCname: string;
  sslStatus: string;
  isPrimary: boolean;
  verifiedAt?: string;
  lastCheckedAt?: string;
  createdAt: string;
  updatedAt: string;
  photographerName: string;
  photographerEmail: string;
  studioName: string;
}

interface DomainStats {
  total: number;
  verified: number;
  pending: number;
  disabled: number;
  allowedPerPhotographer: number;
  globalStatus: "ON" | "OFF";
}

interface PlatformDomainSettingsData {
  id: string;
  customDomainsEnabled: boolean;
  maxDomainsPerPhotographer: number;
  allowSubdomains: boolean;
  allowApexDomains: boolean;
  cnameTarget: string;
  maintenanceNotice?: string;
  updatedAt: string;
  updatedBy: string;
}

export default function AdminDomainsPage() {
  const [domains, setDomains] = useState<AdminDomainItem[]>([]);
  const [stats, setStats] = useState<DomainStats>({
    total: 0,
    verified: 0,
    pending: 0,
    disabled: 0,
    allowedPerPhotographer: 1,
    globalStatus: "ON",
  });
  const [settings, setSettings] = useState<PlatformDomainSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadDomains = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);

    try {
      const res = await fetch(`/api/admin/domains?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setDomains(data.domains || []);
        if (data.stats) setStats(data.stats);
        if (data.settings) setSettings(data.settings);
      } else {
        showToast(data.error || "Failed to load domains", "error");
      }
    } catch {
      showToast("Network error loading custom domains", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDomains();
  }, [statusFilter]);

  const handleToggleGlobal = async () => {
    const nextState = !settings?.customDomainsEnabled;
    const confirmText = nextState
      ? "Enable Custom Domains globally across the platform?"
      : "Disable Custom Domains globally? Photographers will not be able to connect custom domains, and existing domains will be temporarily suspended.";

    if (!confirm(confirmText)) return;

    setToggleLoading(true);
    try {
      const res = await fetch("/api/admin/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_global",
          customDomainsEnabled: nextState,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || `Custom domains globally ${nextState ? "ENABLED" : "DISABLED"}`);
        await loadDomains();
      } else {
        showToast(data.error || "Failed to toggle global custom domains", "error");
      }
    } catch {
      showToast("Network error updating global domain settings", "error");
    } finally {
      setToggleLoading(false);
    }
  };

  const handleDomainAction = async (domainId: string, action: string) => {
    if (action === "delete" && !confirm("Delete and disconnect this custom domain mapping?")) return;
    setActionLoading(domainId);

    try {
      const res = await fetch("/api/admin/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domainId, action }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || `Domain action '${action}' completed successfully.`);
        await loadDomains();
      } else {
        showToast(data.error || "Action failed", "error");
      }
    } catch {
      showToast("Network error processing domain action", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const isGlobalEnabled = settings?.customDomainsEnabled ?? true;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2 border transition-all ${
            toastMessage.type === "success"
              ? "bg-emerald-950/90 text-emerald-300 border-emerald-500/40"
              : "bg-rose-950/90 text-rose-300 border-rose-500/40"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Globe className="w-6 h-6 text-indigo-400" />
            <span>Custom Domains & White-Label Routing</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Govern platform-wide custom domain routing, enforce single-domain studio limits, and inspect DNS verification.
          </p>
        </div>
        <button
          onClick={loadDomains}
          disabled={loading}
          className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs flex items-center gap-2 transition-colors self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Global Control Master Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/30 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800/80">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400">
                Platform Governance
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                  isGlobalEnabled
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                }`}
              >
                {isGlobalEnabled ? "STATUS: ENABLED" : "STATUS: DISABLED"}
              </span>
            </div>
            <h2 className="text-lg font-semibold text-white">Global Custom Domain Feature Toggle</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              When enabled, eligible studios on Pro and Studio plans can connect exactly <strong>1 custom domain</strong>.
              When disabled, new domain connections and external hostname resolutions are safely suspended without deleting stored configuration.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleToggleGlobal}
              disabled={toggleLoading}
              className={`px-5 py-3 rounded-xl font-semibold text-xs flex items-center gap-2.5 transition-all shadow-lg cursor-pointer disabled:opacity-50 ${
                isGlobalEnabled
                  ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/20 border border-rose-500/40"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20 border border-emerald-500/40"
              }`}
            >
              <Power className={`w-4 h-4 ${toggleLoading ? "animate-spin" : ""}`} />
              <span>{isGlobalEnabled ? "Disable Custom Domains" : "Enable Custom Domains"}</span>
            </button>
          </div>
        </div>

        {/* Real Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 space-y-1">
            <span className="text-[10px] font-mono font-medium text-slate-400 uppercase tracking-wider">
              Global Status
            </span>
            <div className="flex items-center gap-1.5 pt-0.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isGlobalEnabled ? "bg-emerald-400 animate-pulse" : "bg-rose-400"
                }`}
              />
              <span className={`text-base font-bold font-mono ${isGlobalEnabled ? "text-emerald-400" : "text-rose-400"}`}>
                {isGlobalEnabled ? "ON" : "OFF"}
              </span>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 space-y-1">
            <span className="text-[10px] font-mono font-medium text-slate-400 uppercase tracking-wider">
              Per Photographer
            </span>
            <div className="text-base font-bold font-mono text-white pt-0.5">
              1 <span className="text-[10px] text-slate-400 font-sans font-normal">Domain Max</span>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 space-y-1">
            <span className="text-[10px] font-mono font-medium text-slate-400 uppercase tracking-wider">
              Total Connected
            </span>
            <div className="text-base font-bold font-mono text-indigo-300 pt-0.5">
              {stats.total}
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 space-y-1">
            <span className="text-[10px] font-mono font-medium text-slate-400 uppercase tracking-wider">
              Verified & Active
            </span>
            <div className="text-base font-bold font-mono text-emerald-400 pt-0.5">
              {stats.verified}
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 space-y-1">
            <span className="text-[10px] font-mono font-medium text-slate-400 uppercase tracking-wider">
              Pending DNS
            </span>
            <div className="text-base font-bold font-mono text-amber-400 pt-0.5">
              {stats.pending}
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 space-y-1">
            <span className="text-[10px] font-mono font-medium text-slate-400 uppercase tracking-wider">
              Disabled
            </span>
            <div className="text-base font-bold font-mono text-rose-400 pt-0.5">
              {stats.disabled}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Filter by Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-950/80 border border-slate-700/60 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Statuses ({stats.total})</option>
            <option value="verified">Verified & Active ({stats.verified})</option>
            <option value="pending">Pending DNS ({stats.pending})</option>
            <option value="failed">Failed / Disabled ({stats.disabled})</option>
          </select>
        </div>

        <div className="text-xs text-slate-400 flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-indigo-400" />
          <span>Strict Limit: Maximum 1 custom domain per studio account</span>
        </div>
      </div>

      {/* Domains Table */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-mono text-[11px] uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Domain Hostname</th>
                <th className="px-4 py-3">Photographer / Studio</th>
                <th className="px-4 py-3">Target CNAME</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last Checked</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading custom domains...
                  </td>
                </tr>
              ) : domains.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    {statusFilter !== "all"
                      ? "No custom domains found matching the current filter."
                      : "No custom domains connected."}
                  </td>
                </tr>
              ) : (
                domains.map((d) => {
                  const isVerified =
                    d.verificationStatus === "verified" ||
                    d.status === "ACTIVE" ||
                    d.status === "VERIFIED" ||
                    d.status === "active" ||
                    d.status === "verified";
                  const isDisabled =
                    d.status === "DISABLED" ||
                    d.status === "DISABLED_BY_PLATFORM" ||
                    d.status === "disabled";

                  return (
                    <tr key={d.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3.5 font-mono font-bold text-indigo-300">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-indigo-400 shrink-0" />
                          <span>{d.hostname}</span>
                          {d.isPrimary && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-sans font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Primary
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <Link
                          href={`/admin/photographers/${d.photographerId}`}
                          className="font-semibold text-white hover:text-indigo-300 transition-colors block"
                        >
                          {d.photographerName}
                        </Link>
                        <div className="text-[11px] text-slate-400">{d.studioName || d.photographerEmail}</div>
                      </td>

                      <td className="px-4 py-3.5 font-mono text-slate-400 text-[11px]">
                        {d.targetCname}
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase ${
                            isDisabled
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              : isVerified
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          }`}
                        >
                          {d.status}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-slate-400 font-mono text-[11px]">
                        {d.lastCheckedAt
                          ? new Date(d.lastCheckedAt).toLocaleDateString()
                          : d.verifiedAt
                          ? new Date(d.verifiedAt).toLocaleDateString()
                          : "Pending"}
                      </td>

                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isVerified && !isDisabled && (
                            <button
                              onClick={() => handleDomainAction(d.id, "force_verify")}
                              disabled={actionLoading === d.id}
                              className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Force Verify</span>
                            </button>
                          )}

                          {isVerified && !isDisabled && (
                            <button
                              onClick={() => handleDomainAction(d.id, "disable")}
                              disabled={actionLoading === d.id}
                              className="px-2.5 py-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                            >
                              Disable
                            </button>
                          )}

                          {isDisabled && (
                            <button
                              onClick={() => handleDomainAction(d.id, "enable")}
                              disabled={actionLoading === d.id}
                              className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                            >
                              Re-Enable
                            </button>
                          )}

                          <button
                            onClick={() => handleDomainAction(d.id, "delete")}
                            disabled={actionLoading === d.id}
                            className="p-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            title="Disconnect & Delete Domain"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
    </div>
  );
}

