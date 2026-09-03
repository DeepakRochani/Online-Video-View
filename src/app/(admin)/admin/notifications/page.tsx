"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Activity,
  Mail,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  RefreshCw,
  Server,
  Zap,
  TrendingUp,
  XCircle,
  Lock,
  ArrowUpRight
} from "lucide-react";
import { NotificationMetrics } from "@/lib/project-types";

export default function AdminNotificationsPage() {
  const [data, setData] = useState<{
    metrics: NotificationMetrics;
    providers: {
      email: { provider: string; isConfigured: boolean; fromAddress: string };
      whatsapp: { status: string; provider: string; phoneNumberId?: string; fromNumber?: string };
    };
    systemTimestamp: string;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchData = async () => {
    try {
      setError("");
      const res = await fetch("/api/admin/notifications");
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to load admin notification metrics");
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      console.error("[Admin Notifications Page]", err);
      setError(err?.message || "Unable to load platform notification health metrics.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400">
        <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin text-indigo-500" />
        <p className="text-sm font-medium">Aggregating platform delivery health...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="py-16 max-w-lg mx-auto text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-950/60 border border-rose-800 text-rose-400 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-white">Unable to Load Notification Metrics</h2>
          <p className="text-xs text-slate-400">{error}</p>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            fetchData();
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-indigo-600/30"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </button>
      </div>
    );
  }

  const metrics = data?.metrics || {
    totalSent: 0,
    totalDelivered: 0,
    totalFailed: 0,
    totalPending: 0,
    deliveryRate: 100,
    byChannel: { EMAIL: 0, WHATSAPP: 0, IN_APP: 0 },
    byType: {} as any
  };

  const providers = data?.providers || {
    email: { provider: "development", isConfigured: false, fromAddress: "notifications@drfilms.com" },
    whatsapp: { status: "NOT_CONFIGURED", provider: "NONE" }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <Activity className="w-7 h-7 text-indigo-400" /> Notification & Delivery Infrastructure
            </h1>
            <span className="bg-indigo-950 border border-indigo-500/40 text-indigo-300 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              Phase 15 Super Admin
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Real-time delivery reliability, provider health monitoring, and transaction metrics across all tenants.
          </p>
        </div>

        <button
          onClick={() => {
            setRefreshing(true);
            fetchData();
          }}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs sm:text-sm font-medium rounded-xl transition shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-indigo-400" : ""}`} />
          {refreshing ? "Refreshing..." : "Refresh Status"}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => {
              setRefreshing(true);
              fetchData();
            }}
            className="px-3 py-1 bg-rose-900/80 hover:bg-rose-800 text-rose-200 text-xs font-semibold rounded-lg transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Total Dispatched</span>
            <Mail className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">
            {metrics.totalSent + metrics.totalDelivered}
          </div>
          <p className="text-[11px] text-slate-500">Across all active tenant workflows</p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Delivery Reliability</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-400 tracking-tight">
            {metrics.deliveryRate}%
          </div>
          <p className="text-[11px] text-emerald-500/80">Calculated on non-transient status</p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Failed Deliveries</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-3xl font-extrabold text-rose-400 tracking-tight">
            {metrics.totalFailed}
          </div>
          <p className="text-[11px] text-rose-500/80">Logged in failure diagnostic ledger</p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>In-Flight / Pending</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-amber-300 tracking-tight">
            {metrics.totalPending}
          </div>
          <p className="text-[11px] text-slate-500">Queued in asynchronous dispatch</p>
        </div>
      </div>

      {/* Provider Connectivity Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Email Engine */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-indigo-400" /> Primary Email Transport
            </h3>
            {providers.email.isConfigured ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Active ({providers.email.provider.toUpperCase()})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950 text-amber-300 border border-amber-500/30">
                <Clock className="w-3 h-3 text-amber-400" /> Development / Safe Log
              </span>
            )}
          </div>

          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Configured Driver:</span>
              <span className="font-semibold text-slate-100 uppercase">{providers.email.provider}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Default From:</span>
              <span className="font-mono text-slate-100">{providers.email.fromAddress}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Supported Drivers:</span>
              <span className="text-slate-300">Resend, SendGrid, Postmark, SMTP</span>
            </div>
          </div>
        </div>

        {/* WhatsApp Business Engine */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-400" /> Official WhatsApp Gateway
            </h3>
            {providers.whatsapp.status === "CONNECTED" ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Connected ({providers.whatsapp.provider})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                <Lock className="w-3 h-3 text-slate-400" /> Unconfigured
              </span>
            )}
          </div>

          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Gateway Provider:</span>
              <span className="font-semibold text-slate-100">{providers.whatsapp.provider}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Status:</span>
              <span className="font-mono text-slate-100">{providers.whatsapp.status}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Templates:</span>
              <span className="text-slate-300">gallery_published, selection_submitted, selection_confirmation</span>
            </div>
          </div>
        </div>
      </div>

      {/* Channel Volume Breakdown */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <Server className="w-5 h-5 text-indigo-400" /> Dispatches by Channel
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Mail className="w-5 h-5 text-indigo-400" />
              <div>
                <div className="text-xs text-slate-400 font-medium">Email Channel</div>
                <div className="text-xl font-bold text-white">{metrics.byChannel.EMAIL || 0}</div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <MessageSquare className="w-5 h-5 text-emerald-400" />
              <div>
                <div className="text-xs text-slate-400 font-medium">WhatsApp Channel</div>
                <div className="text-xl font-bold text-white">{metrics.byChannel.WHATSAPP || 0}</div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-purple-400" />
              <div>
                <div className="text-xs text-slate-400 font-medium">In-App Events</div>
                <div className="text-xl font-bold text-white">{metrics.byChannel.IN_APP || 0}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
