"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Film,
  CreditCard,
  TrendingUp,
  HardDrive,
  ShieldAlert,
  ArrowUpRight,
  UserCheck,
  UserX,
  Clock,
  Sparkles,
  FileText,
  Activity,
  AlertCircle,
  PlusCircle,
  ExternalLink,
} from "lucide-react";
import { PlatformOverviewMetrics } from "@/lib/project-types";

export default function AdminOverviewPage() {
  const [metrics, setMetrics] = useState<PlatformOverviewMetrics | null>(null);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/metrics").then((r) => r.json()),
      fetch("/api/admin/audit-logs?limit=8").then((r) => r.json()),
    ])
      .then(([metricsRes, logsRes]) => {
        if (metricsRes.success) setMetrics(metricsRes.metrics);
        if (logsRes.success) setRecentLogs(logsRes.logs);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-900 rounded-lg w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-900/60 rounded-2xl border border-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Photographers",
      value: metrics?.totalPhotographers || 0,
      subValue: `${metrics?.activePhotographers || 0} active • ${metrics?.suspendedPhotographers || 0} suspended`,
      icon: Users,
      color: "from-blue-600/20 to-indigo-600/10 text-indigo-400 border-indigo-500/30",
      href: "/admin/photographers",
    },
    {
      title: "Active Subscriptions",
      value: metrics?.activeSubscriptions || 0,
      subValue: `${metrics?.pastDueSubscriptions || 0} past due`,
      icon: CreditCard,
      color: "from-cyan-600/20 to-blue-600/10 text-cyan-400 border-cyan-500/30",
      href: "/admin/subscriptions",
    },
    {
      title: "Trialing Photographers",
      value: metrics?.trialPhotographers || 0,
      subValue: "Active 14-day evaluation",
      icon: Clock,
      color: "from-orange-600/20 to-amber-600/10 text-orange-400 border-orange-500/30",
      href: "/admin/photographers?status=trial",
    },
    {
      title: "Published Galleries",
      value: metrics?.liveGalleries || 0,
      subValue: `${metrics?.totalWeddings || 0} total weddings`,
      icon: Film,
      color: "from-purple-600/20 to-pink-600/10 text-purple-400 border-purple-500/30",
      href: "/admin/weddings",
    },
    {
      title: "Failed Payments",
      value: metrics?.failedPaymentsCount ?? 0,
      subValue: "Requires invoice retry",
      icon: AlertCircle,
      color: (metrics?.failedPaymentsCount ?? 0) > 0
        ? "from-red-600/20 to-rose-600/10 text-red-400 border-red-500/40"
        : "from-slate-800/40 to-slate-900/40 text-slate-400 border-slate-800",
      href: "/admin/revenue",
    },
    {
      title: "Failed Webhooks",
      value: metrics?.failedWebhooksCount ?? 0,
      subValue: "Requires webhook re-delivery",
      icon: Activity,
      color: (metrics?.failedWebhooksCount ?? 0) > 0
        ? "from-amber-600/20 to-orange-600/10 text-amber-400 border-amber-500/40"
        : "from-slate-800/40 to-slate-900/40 text-slate-400 border-slate-800",
      href: "/admin/webhooks",
    },
    {
      title: "Failed Notifications",
      value: metrics?.failedNotificationsCount ?? 0,
      subValue: "Email/WhatsApp delivery drops",
      icon: ShieldAlert,
      color: (metrics?.failedNotificationsCount ?? 0) > 0
        ? "from-rose-600/20 to-pink-600/10 text-rose-400 border-rose-500/40"
        : "from-slate-800/40 to-slate-900/40 text-slate-400 border-slate-800",
      href: "/admin/system-health",
    },
    {
      title: "Open Alerts",
      value: metrics?.openAlertsCount ?? 0,
      subValue: "Unresolved platform issues",
      icon: ShieldAlert,
      color: (metrics?.openAlertsCount ?? 0) > 0
        ? "from-red-600/30 to-orange-600/20 text-red-400 border-red-500/50"
        : "from-emerald-600/20 to-teal-600/10 text-emerald-400 border-emerald-500/30",
      href: "/admin/alerts",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-indigo-950/60 via-slate-900/60 to-slate-950 border border-indigo-900/40 rounded-2xl p-6 shadow-xl">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Platform Operations & Control Center
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Real-time multi-tenant health, photographer lifecycle control, subscription monetization, and audit oversight.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/photographers"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            <span>Manage Photographers</span>
          </Link>
          <Link
            href="/admin/system-health"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-xl text-xs font-semibold transition-all flex items-center gap-2"
          >
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>Diagnostics</span>
          </Link>
          <Link
            href="/admin/alerts"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-xl text-xs font-semibold transition-all flex items-center gap-2"
          >
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>Alerts</span>
          </Link>
        </div>
      </div>

      {/* Revenue & MRR Header Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/30 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Monthly Recurring Revenue (MRR)</div>
            <div className="text-xl font-bold text-white font-mono">₹{(metrics?.mrrInr || 0).toLocaleString("en-IN")}</div>
            <div className="text-[10px] text-slate-400">ARR: ₹{(metrics?.arrInr || 0).toLocaleString("en-IN")}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Total Realized Revenue</div>
            <div className="text-xl font-bold text-white font-mono">₹{(metrics?.totalRevenueInr || 0).toLocaleString("en-IN")}</div>
            <div className="text-[10px] text-slate-400">Lifetime paid invoices</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Storage & Media Assets</div>
            <div className="text-xl font-bold text-white font-mono">{metrics?.totalStorageGb || 0} GB</div>
            <div className="text-[10px] text-slate-400">{(metrics?.totalPhotos || 0) + (metrics?.totalVideos || 0)} files hosted</div>
          </div>
        </div>
      </div>

      {/* 8 Core Operational KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Link
              key={idx}
              href={card.href}
              className={`p-5 rounded-2xl bg-gradient-to-br ${card.color} border bg-slate-900/40 hover:scale-[1.02] transition-all group flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">{card.title}</span>
                <div className="p-2 rounded-xl bg-slate-950/60 border border-white/5">
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-2xl font-bold text-white font-mono tracking-tight">
                  {card.value}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                  <span>{card.subValue}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Action Cards & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Jumps */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-sm font-semibold text-slate-300 font-mono uppercase tracking-wider">
            Quick Actions
          </h2>
          <div className="space-y-3">
            <Link
              href="/admin/photographers"
              className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white group-hover:text-indigo-300 transition-colors">
                    Photographer Directory
                  </div>
                  <div className="text-[11px] text-slate-400">Search, impersonate, and override plans</div>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
            </Link>

            <Link
              href="/admin/weddings"
              className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-purple-500/40 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-600/20 text-purple-400">
                  <Film className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white group-hover:text-purple-300 transition-colors">
                    Global Wedding Browser
                  </div>
                  <div className="text-[11px] text-slate-400">Read-only preview of any tenant gallery</div>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
            </Link>

            <Link
              href="/admin/domains"
              className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-600/20 text-emerald-400">
                  <ExternalLink className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white group-hover:text-emerald-300 transition-colors">
                    Custom Domain Approvals
                  </div>
                  <div className="text-[11px] text-slate-400">Verify DNS mappings across studios</div>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
            </Link>

            <Link
              href="/admin/webhooks"
              className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-amber-500/40 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-600/20 text-amber-400">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white group-hover:text-amber-300 transition-colors">
                    Razorpay Webhook Monitor
                  </div>
                  <div className="text-[11px] text-slate-400">Idempotency logs & event retry triggers</div>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
            </Link>
          </div>
        </div>

        {/* Live Admin Audit Feed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-300 font-mono uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>Immutable Admin Audit Trail</span>
            </h2>
            <Link
              href="/admin/audit-logs"
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-mono"
            >
              View All Logs →
            </Link>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 overflow-hidden">
            {recentLogs.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No administrative actions recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {recentLogs.map((log) => (
                  <div key={log.id} className="py-3 flex items-start justify-between gap-4 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-indigo-900/40 border border-indigo-700/50 text-[10px] font-mono text-indigo-300">
                          {log.action}
                        </span>
                        <span className="font-semibold text-slate-200">
                          {log.targetName || log.targetId}
                        </span>
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        Performed by <strong className="text-slate-300">{log.adminEmail}</strong>
                        {log.metadata?.reason && (
                          <span className="italic text-slate-400"> — "{log.metadata.reason}"</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-slate-400 font-mono shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      <div className="text-[10px] text-slate-400">
                        {new Date(log.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
