"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  Radio,
  Mail,
  MessageSquare,
  Smartphone,
  Bell,
  LayoutGrid,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Save,
  RotateCcw,
  RefreshCw,
  Send,
  Sliders,
  Users,
  Camera,
  Megaphone,
  Power,
  Info,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Search,
  Filter,
  Download,
  Eye,
  Activity,
  AlertOctagon,
  Clock,
  Check,
  X,
  FileText,
  PieChart,
  BarChart3,
  Layers,
  Flame,
  HelpCircle
} from "lucide-react";
import {
  PlatformCommunicationSettings,
  CommunicationProviderStatusReport,
  NotificationRecord
} from "@/lib/project-types";

interface AnalyticsReport {
  timeframe: string;
  totalAttempts: number;
  successful: number;
  failed: number;
  blocked: number;
  skipped: number;
  successRate: number | null;
  failureRate: number | null;
  blockedRate: number | null;
  channelBreakdown: {
    email: number;
    whatsapp: number;
    sms: number;
    push: number;
    inApp: number;
  };
  topFailureReasons: Array<{
    reason: string;
    count: number;
    percentage: number;
  }>;
}

export default function SuperAdminCommunicationsPage() {
  // Settings & Status state
  const [settings, setSettings] = useState<PlatformCommunicationSettings | null>(null);
  const [initialSettings, setInitialSettings] = useState<PlatformCommunicationSettings | null>(null);
  const [providerStatuses, setProviderStatuses] = useState<CommunicationProviderStatusReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Active View Tab
  const [mainView, setMainView] = useState<"monitoring" | "controls">("monitoring");
  const [activeTab, setActiveTab] = useState<"all" | "features" | "email" | "whatsapp" | "sms_push" | "audience" | "marketing">("all");

  // Analytics state
  const [analyticsRange, setAnalyticsRange] = useState<"24h" | "7d" | "30d" | "all">("7d");
  const [analytics, setAnalytics] = useState<AnalyticsReport | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Activity Logs state
  const [logs, setLogs] = useState<NotificationRecord[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [logsLoading, setLogsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [audienceFilter, setAudienceFilter] = useState("ALL");
  const [dateRangeFilter, setDateRangeFilter] = useState<"all" | "today" | "7d" | "30d">("all");

  // Detail Modal / Drawer State
  const [selectedRecord, setSelectedRecord] = useState<NotificationRecord | null>(null);

  // Test Modal State
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testChannel, setTestChannel] = useState<"EMAIL" | "WHATSAPP">("EMAIL");
  const [testRecipient, setTestRecipient] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);

  // Confirmation Modals State
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    type: "MASTER_OFF" | "MASTER_ON" | "EMERGENCY_SHUTDOWN" | "MAINTENANCE_MODE";
    title: string;
    description: string;
    confirmText: string;
    action: () => void;
  } | null>(null);

  // Fetch Settings & Providers
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/communications/settings");
      if (!res.ok) {
        throw new Error(`Failed to load settings (HTTP ${res.status})`);
      }
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings(data.settings);
        setInitialSettings(data.settings);
        setProviderStatuses(data.providerStatuses);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Could not fetch platform communication settings");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Analytics
  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const res = await fetch(`/api/admin/communications/analytics?range=${analyticsRange}`);
      const data = await res.json();
      if (data.success && data.report) {
        setAnalytics(data.report);
      }
    } catch (err) {
      console.error("Failed to load analytics:", err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Fetch Logs
  const fetchLogs = async () => {
    try {
      setLogsLoading(true);
      const offset = (page - 1) * pageSize;
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: offset.toString(),
        dateRange: dateRangeFilter,
      });

      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (channelFilter !== "ALL") params.set("channel", channelFilter);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (audienceFilter !== "ALL") params.set("audience", audienceFilter);

      const res = await fetch(`/api/admin/communications/logs?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        const rawRecords: NotificationRecord[] = (data.records || []).filter(
          (r: any) => r && typeof r.id === "string" && r.id.trim() !== ""
        );

        // Development-time diagnostic duplicate ID detection
        if (process.env.NODE_ENV !== "production") {
          const seenIds = new Set<string>();
          const duplicateIds: string[] = [];
          for (const r of rawRecords) {
            if (seenIds.has(r.id)) {
              duplicateIds.push(r.id);
            } else {
              seenIds.add(r.id);
            }
          }
          if (duplicateIds.length > 0) {
            console.error(
              "[Communication] Duplicate record IDs received from API:",
              duplicateIds
            );
          }
        }

        // Defensive normalization to ensure unique stable IDs
        const uniqueRecords = Array.from(
          new Map(rawRecords.map((r) => [r.id, r])).values()
        );

        setLogs(uniqueRecords);
        setTotalLogs(data.total || 0);
      }
    } catch (err) {
      console.error("Failed to load logs:", err);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [analyticsRange]);

  useEffect(() => {
    fetchLogs();
  }, [page, pageSize, channelFilter, statusFilter, audienceFilter, dateRangeFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchLogs();
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleToggle = (key: keyof PlatformCommunicationSettings) => {
    if (!settings) return;
    if (key === "globalEnabled") {
      if (settings.globalEnabled) {
        // Prompt confirmation for turning OFF
        setConfirmModal({
          open: true,
          type: "MASTER_OFF",
          title: "Disable All Global Outbound Communications?",
          description:
            "Warning: Halting global communications will prevent all standard outbound emails, WhatsApp messages, and SMS dispatches across all client and photographer accounts. (Essential security events like password reset will remain protected).",
          confirmText: "Yes, Disable Global Outbound",
          action: () => {
            setSettings({ ...settings, globalEnabled: false });
            setConfirmModal(null);
            setSaveStatus("idle");
          },
        });
        return;
      } else {
        // Prompt confirmation for turning ON
        setConfirmModal({
          open: true,
          type: "MASTER_ON",
          title: "Re-enable Global Outbound Communications?",
          description:
            "This will resume standard outbound delivery across all enabled channels according to each photographer's preferences.",
          confirmText: "Yes, Resume Outbound",
          action: () => {
            setSettings({ ...settings, globalEnabled: true });
            setConfirmModal(null);
            setSaveStatus("idle");
          },
        });
        return;
      }
    }

    setSettings({
      ...settings,
      [key]: !settings[key],
    });
    setSaveStatus("idle");
  };

  const handleTextChange = (key: keyof PlatformCommunicationSettings, val: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      [key]: val,
    });
    setSaveStatus("idle");
  };

  const handleBulkToggle = (keys: (keyof PlatformCommunicationSettings)[], enable: boolean) => {
    if (!settings) return;
    const updated = { ...settings };
    for (const k of keys) {
      if (typeof updated[k] === "boolean") {
        (updated as any)[k] = enable;
      }
    }
    setSettings(updated);
    setSaveStatus("idle");
  };

  const hasUnsavedChanges = Boolean(
    settings && initialSettings && JSON.stringify(settings) !== JSON.stringify(initialSettings)
  );

  const handleReset = () => {
    if (initialSettings) {
      setSettings({ ...initialSettings });
      setSaveStatus("idle");
      setErrorMessage(null);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaveStatus("saving");
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/admin/communications/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save settings");
      }

      setSettings(data.settings);
      setInitialSettings(data.settings);
      setProviderStatuses(data.providerStatuses);
      setSaveStatus("success");
      setSuccessMessage("Platform communication controls successfully updated and applied server-wide.");

      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (err: any) {
      setSaveStatus("error");
      setErrorMessage(err.message || "An unexpected error occurred while saving.");
    }
  };

  const handleTriggerEmergencyShutdown = () => {
    setConfirmModal({
      open: true,
      type: "EMERGENCY_SHUTDOWN",
      title: "🚨 ACTIVATE EMERGENCY COMMUNICATION SHUTDOWN",
      description:
        "This immediately halts all outbound email, WhatsApp, SMS, and Push dispatches across the entire platform. Non-critical background delivery will be terminated server-side. (Protected password reset and security recovery remain online).",
      confirmText: "ACTIVATE EMERGENCY SHUTDOWN",
      action: async () => {
        try {
          setSaveStatus("saving");
          const res = await fetch("/api/admin/communications/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "emergency_shutdown",
              reason: "Super Admin triggered emergency communication shutdown.",
            }),
          });
          const data = await res.json();
          if (data.success) {
            setSettings(data.settings);
            setInitialSettings(data.settings);
            setSuccessMessage("Emergency shutdown successfully activated.");
            fetchAnalytics();
          }
        } catch (err: any) {
          setErrorMessage(err.message || "Failed to trigger emergency shutdown.");
        } finally {
          setConfirmModal(null);
          setSaveStatus("idle");
        }
      },
    });
  };

  const handleExportCsv = () => {
    const params = new URLSearchParams({
      export: "csv",
      dateRange: dateRangeFilter,
    });
    if (searchQuery.trim()) params.set("search", searchQuery.trim());
    if (channelFilter !== "ALL") params.set("channel", channelFilter);
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    if (audienceFilter !== "ALL") params.set("audience", audienceFilter);

    window.open(`/api/admin/communications/logs?${params.toString()}`, "_blank");
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testRecipient) return;
    setTestSending(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/admin/communications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: testChannel,
          recipient: testRecipient,
        }),
      });
      const data = await res.json();
      setTestResult(data);
      // Refresh logs & analytics
      fetchLogs();
      fetchAnalytics();
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setTestSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-slate-400">
        <RefreshCw className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
        <p className="text-sm font-medium tracking-wide">Loading platform communication control center...</p>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-800 text-rose-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-rose-400" />
            <h2 className="text-lg font-semibold">Unable to Load Communication Controls</h2>
          </div>
          <p className="mt-2 text-sm text-rose-300">{errorMessage || "Configuration file or database read error."}</p>
          <button
            onClick={fetchSettings}
            className="mt-4 px-4 py-2 bg-rose-900 hover:bg-rose-800 text-white text-sm font-medium rounded-xl transition"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(totalLogs / pageSize));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-36 pt-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-1">
            <Radio className="w-4 h-4" />
            Super Admin Operations
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            Communication Control Center & Monitoring
            {!settings.globalEnabled && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold uppercase tracking-wider">
                Platform Muted
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl">
            Real-time delivery monitoring, server-side kill-switches, failure diagnostics, live provider health, and compliance guardrails.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
          {/* Emergency Kill Switch Button */}
          <button
            type="button"
            onClick={handleTriggerEmergencyShutdown}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-700/80 text-xs sm:text-sm font-semibold transition shadow-lg shadow-rose-950/40"
          >
            <Flame className="w-4 h-4 text-rose-400" />
            Emergency Shutdown
          </button>

          <button
            type="button"
            onClick={() => setTestModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs sm:text-sm font-medium transition"
          >
            <Send className="w-4 h-4 text-indigo-400" />
            Test Delivery
          </button>

          <button
            type="button"
            onClick={() => {
              fetchSettings();
              fetchAnalytics();
              fetchLogs();
            }}
            title="Refresh All"
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Alerts */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/80 text-emerald-200 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-sm font-medium">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-xs text-emerald-400 hover:text-emerald-200 font-bold px-2 py-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-200 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <span className="text-sm font-medium">{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs text-rose-400 hover:text-rose-200 font-bold px-2 py-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2. Top-Level Mode Selector */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
        <button
          onClick={() => setMainView("monitoring")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
            mainView === "monitoring"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
              : "bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          }`}
        >
          <Activity className="w-4 h-4" />
          Live Monitoring & Logs
        </button>

        <button
          onClick={() => setMainView("controls")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
            mainView === "controls"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
              : "bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          }`}
        >
          <Sliders className="w-4 h-4" />
          Platform Policies & Toggles
          {hasUnsavedChanges && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          )}
        </button>
      </div>

      {/* 3. Live Provider Status Bar Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatusBadge
          label="Global Master"
          status={settings.globalEnabled ? "ACTIVE" : "MUTED"}
          icon={Power}
          tone={settings.globalEnabled ? "emerald" : "rose"}
        />
        <StatusBadge
          label="Email Gateway"
          status={settings.emailEnabled ? "ENABLED" : "MUTED"}
          provider={providerStatuses?.email.provider}
          configured={providerStatuses?.email.configured}
          icon={Mail}
        />
        <StatusBadge
          label="WhatsApp Gateway"
          status={settings.whatsappEnabled ? "ENABLED" : "MUTED"}
          provider={providerStatuses?.whatsapp.provider}
          configured={providerStatuses?.whatsapp.configured}
          icon={MessageSquare}
        />
        <StatusBadge
          label="SMS Gateway"
          status={settings.smsEnabled ? "ENABLED" : "MUTED"}
          provider={providerStatuses?.sms.provider}
          configured={providerStatuses?.sms.configured}
          icon={Smartphone}
        />
        <StatusBadge
          label="Push Gateway"
          status={settings.pushEnabled ? "ENABLED" : "MUTED"}
          provider={providerStatuses?.push.provider}
          configured={providerStatuses?.push.configured}
          icon={Bell}
        />
        <StatusBadge
          label="Security Bypass"
          status="PROTECTED"
          sub="Always Active"
          icon={ShieldCheck}
          tone="amber"
        />
      </div>

      {/* ========================================================= */}
      {/* VIEW A: LIVE MONITORING & LOGS                           */}
      {/* ========================================================= */}
      {mainView === "monitoring" && (
        <div className="space-y-8">
          {/* Analytics Overview Cards */}
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-400" />
                  Real Outbound Delivery Analytics
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Calculated from persistent notification log records.
                </p>
              </div>

              {/* Timeframe selector */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                {(["24h", "7d", "30d", "all"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setAnalyticsRange(t)}
                    className={`px-3 py-1.5 rounded-lg font-medium transition ${
                      analyticsRange === t
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {t === "24h" ? "Past 24h" : t === "7d" ? "7 Days" : t === "30d" ? "30 Days" : "All Time"}
                  </button>
                ))}
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Total Dispatches
                </span>
                <span className="text-2xl font-bold text-white mt-1 block">
                  {analytics ? analytics.totalAttempts.toLocaleString() : "0"}
                </span>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Attempted across all channels
                </span>
              </div>

              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/40">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                    Delivered
                  </span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-2xl font-bold text-emerald-300 mt-1 block">
                  {analytics ? analytics.successful.toLocaleString() : "0"}
                </span>
                <span className="text-[11px] text-emerald-400/80 mt-1 block">
                  Success Rate: {analytics?.successRate !== null ? `${analytics?.successRate}%` : "N/A (0 attempts)"}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-800/40">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">
                    Failed Delivery
                  </span>
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                </div>
                <span className="text-2xl font-bold text-rose-300 mt-1 block">
                  {analytics ? analytics.failed.toLocaleString() : "0"}
                </span>
                <span className="text-[11px] text-rose-400/80 mt-1 block">
                  Failure Rate: {analytics?.failureRate !== null ? `${analytics?.failureRate}%` : "0%"}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/40">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                    Blocked by Policy
                  </span>
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                </div>
                <span className="text-2xl font-bold text-amber-300 mt-1 block">
                  {analytics ? analytics.blocked.toLocaleString() : "0"}
                </span>
                <span className="text-[11px] text-amber-400/80 mt-1 block">
                  Blocked Rate: {analytics?.blockedRate !== null ? `${analytics?.blockedRate}%` : "0%"}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  User Preferences Skipped
                </span>
                <span className="text-2xl font-bold text-slate-300 mt-1 block">
                  {analytics ? analytics.skipped.toLocaleString() : "0"}
                </span>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Opt-out preferences respected
                </span>
              </div>
            </div>

            {/* Failure Breakdown & Channels */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
              {/* Failure Reasons */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 text-rose-400" />
                  Top Delivery Failure Reasons
                </h3>
                {analytics && analytics.topFailureReasons.length > 0 ? (
                  <div className="space-y-2.5">
                    {analytics.topFailureReasons.map((item, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-300 truncate max-w-[70%]">{item.reason}</span>
                          <span className="text-slate-400 font-mono">
                            {item.count} ({item.percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-rose-500 h-full rounded-full"
                            style={{ width: `${Math.min(item.percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-slate-500">
                    No delivery failures recorded in this timeframe.
                  </div>
                )}
              </div>

              {/* Channel Distribution */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-indigo-400" />
                  Channel Volume Breakdown
                </h3>
                {analytics ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Mail className="w-3.5 h-3.5 text-indigo-400" /> Email
                      </div>
                      <span className="text-lg font-bold text-white mt-1 block">
                        {analytics.channelBreakdown.email}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-400" /> WhatsApp
                      </div>
                      <span className="text-lg font-bold text-white mt-1 block">
                        {analytics.channelBreakdown.whatsapp}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Smartphone className="w-3.5 h-3.5 text-sky-400" /> SMS
                      </div>
                      <span className="text-lg font-bold text-white mt-1 block">
                        {analytics.channelBreakdown.sms}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Bell className="w-3.5 h-3.5 text-amber-400" /> Push
                      </div>
                      <span className="text-lg font-bold text-white mt-1 block">
                        {analytics.channelBreakdown.push}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <LayoutGrid className="w-3.5 h-3.5 text-purple-400" /> In-App
                      </div>
                      <span className="text-lg font-bold text-white mt-1 block">
                        {analytics.channelBreakdown.inApp}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-slate-500">
                    No volume data available.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Activity Logs Table */}
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-400" />
                  Live Outbound Communication Stream
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Searchable notification ledger with PII masking, status filters, and CSV export.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-400" />
                  Export CSV
                </button>
                <button
                  type="button"
                  onClick={fetchLogs}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Search Bar */}
              <div className="lg:col-span-2 relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by ID, recipient, subject, type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Channel Filter */}
              <select
                value={channelFilter}
                onChange={(e) => {
                  setChannelFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Channels</option>
                <option value="EMAIL">Email</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="SMS">SMS</option>
                <option value="PUSH">Push</option>
                <option value="IN_APP">In-App</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="SENT">Delivered / Sent</option>
                <option value="FAILED">Failed</option>
                <option value="BLOCKED">Blocked by Policy</option>
                <option value="SKIPPED">Skipped by Preference</option>
                <option value="PENDING">Pending / Queued</option>
              </select>

              {/* Audience Filter */}
              <select
                value={audienceFilter}
                onChange={(e) => {
                  setAudienceFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Audiences</option>
                <option value="CLIENT">Client (Couples)</option>
                <option value="PHOTOGRAPHER">Photographers</option>
                <option value="SYSTEM">System / Admin</option>
              </select>
            </div>

            {/* Logs Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/80 text-slate-400 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Channel</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Masked Recipient</th>
                    <th className="px-4 py-3">Subject / Preview</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Provider</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {logsLoading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                        Fetching activity records...
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        {channelFilter !== "ALL" || statusFilter !== "ALL" || audienceFilter !== "ALL" || searchQuery
                          ? "No communication records found matching the active filters."
                          : "No communication activity yet."}
                      </td>
                    </tr>
                  ) : (
                    logs.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-900/40 transition">
                        <td className="px-4 py-3 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                          {new Date(record.createdAt).toLocaleDateString()} {new Date(record.createdAt).toLocaleTimeString()}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px] font-semibold text-slate-200">
                            {record.channel === "EMAIL" && <Mail className="w-3 h-3 text-indigo-400" />}
                            {record.channel === "WHATSAPP" && <MessageSquare className="w-3 h-3 text-emerald-400" />}
                            {record.channel === "SMS" && <Smartphone className="w-3 h-3 text-sky-400" />}
                            {record.channel === "PUSH" && <Bell className="w-3 h-3 text-amber-400" />}
                            {record.channel === "IN_APP" && <LayoutGrid className="w-3 h-3 text-purple-400" />}
                            {record.channel}
                          </span>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-slate-300 font-mono text-[11px]">
                            {record.type}
                          </span>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-slate-300">
                          {(record as any).maskedRecipient || record.recipient || "N/A"}
                        </td>

                        <td className="px-4 py-3 max-w-xs truncate text-slate-300">
                          {record.subject || record.content || "—"}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <NotificationStatusBadge status={record.status} />
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-slate-400">
                          {record.provider || "N/A"}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedRecord(record)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 text-[11px] font-semibold transition"
                          >
                            <Eye className="w-3 h-3" />
                            Details
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-slate-400">
              <div>
                Showing {logs.length > 0 ? (page - 1) * pageSize + 1 : 0} to{" "}
                {Math.min(page * pageSize, totalLogs)} of {totalLogs} total events
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 text-xs focus:outline-none"
                >
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                </select>

                <button
                  type="button"
                  disabled={page <= 1 || logsLoading}
                  onClick={() => setPage(page - 1)}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 hover:bg-slate-800 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="font-mono text-slate-300">
                  {page} / {totalPages}
                </span>

                <button
                  type="button"
                  disabled={page >= totalPages || logsLoading}
                  onClick={() => setPage(page + 1)}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 hover:bg-slate-800 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW B: PLATFORM CONTROLS & TOGGLES                      */}
      {/* ========================================================= */}
      {mainView === "controls" && (
        <div className="space-y-8">
          {/* Master Controls & Security Alert Callout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Master Control Card */}
            <div
              className={`p-6 rounded-2xl border transition-all lg:col-span-2 ${
                settings.globalEnabled
                  ? "bg-slate-900/70 border-slate-800"
                  : "bg-rose-950/20 border-rose-800/80 shadow-lg shadow-rose-950/30"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div
                    className={`p-3 rounded-2xl shrink-0 ${
                      settings.globalEnabled
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    }`}
                  >
                    <Power className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      Global Outbound Communication Master Switch
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">
                      Master toggle for all standard outbound messages (Email, WhatsApp, SMS, Push, In-App). When turned OFF, non-critical delivery is halted server-side.
                    </p>
                  </div>
                </div>

                <Switch
                  id="master-switch"
                  checked={settings.globalEnabled}
                  onChange={() => handleToggle("globalEnabled")}
                  size="lg"
                />
              </div>

              <div className="mt-6 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                    Maintenance or Pause Explanation Note
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Temporarily muted during system migration (Oct 2026)"
                    value={settings.maintenanceNote || ""}
                    onChange={(e) => handleTextChange("maintenanceNote", e.target.value)}
                    className="w-full text-sm bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs text-slate-500 block">Last Updated</span>
                  <span className="text-xs font-mono text-slate-400">
                    {new Date(settings.lastUpdated).toLocaleDateString()} {new Date(settings.lastUpdated).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Security Exemption Notice */}
            <div className="p-6 rounded-2xl bg-amber-950/20 border border-amber-800/40 text-amber-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 font-semibold text-amber-400 mb-2">
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                  <span>Protected Security Bypass</span>
                </div>
                <p className="text-xs leading-relaxed text-amber-200/90">
                  In strict accordance with SaaS security standards, <strong>Password Reset</strong>, <strong>Email Verification</strong>, and <strong>Security Alert</strong> emails are safeguarded and will <strong>ALWAYS</strong> remain operational, even if the Global Switch is turned OFF.
                </p>
                <div className="mt-3 text-[11px] text-amber-300/80 bg-amber-950/40 p-2.5 rounded-lg border border-amber-900/40">
                  🛡️ Prevents admin lockout and guarantees account recovery remains available during maintenance.
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-amber-900/40 flex items-center justify-between text-xs text-amber-400/80">
                <span>Security Policy: Active</span>
                <span className="font-mono text-[10px] uppercase tracking-wider bg-amber-900/40 px-2 py-0.5 rounded">
                  RFC Compliant
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Filter Tabs */}
          <div className="border-b border-slate-800 flex items-center gap-2 overflow-x-auto pb-px">
            {[
              { id: "all", label: "All Controls", icon: LayoutGrid },
              { id: "features", label: "Feature Controls", icon: Layers },
              { id: "email", label: "Email Controls", icon: Mail },
              { id: "whatsapp", label: "WhatsApp Controls", icon: MessageSquare },
              { id: "sms_push", label: "SMS, Push & In-App", icon: Smartphone },
              { id: "audience", label: "Audience Isolation", icon: Users },
              { id: "marketing", label: "Marketing Guardrails", icon: Megaphone },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                    isActive
                      ? "border-indigo-500 text-white bg-slate-900/40"
                      : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-indigo-400" : "text-slate-500"}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Settings Category Sections */}
          <div className="space-y-8">
            {/* Feature-Level Controls Section (Phase 27) */}
            {(activeTab === "all" || activeTab === "features") && (
              <SectionCard
                title="Feature-Level Notification Controls"
                description="Granular platform switches for specific transactional triggers and business events."
                icon={Layers}
                headerAction={
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleBulkToggle(
                          [
                            "galleryPublishedEnabled",
                            "selectionSubmittedEnabled",
                            "selectionConfirmationEnabled",
                            "expiryReminderEnabled",
                            "teamInvitationEnabled",
                            "passwordResetEnabled",
                            "billingNotificationsEnabled",
                            "securityNotificationsEnabled",
                          ],
                          true
                        )
                      }
                      className="text-xs px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                    >
                      Enable All Features
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleBulkToggle(
                          [
                            "galleryPublishedEnabled",
                            "selectionSubmittedEnabled",
                            "selectionConfirmationEnabled",
                            "expiryReminderEnabled",
                            "teamInvitationEnabled",
                            "billingNotificationsEnabled",
                          ],
                          false
                        )
                      }
                      className="text-xs px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                    >
                      Disable Non-Security
                    </button>
                  </div>
                }
              >
                <div className="divide-y divide-slate-800/60">
                  <ToggleRow
                    label="Gallery Published Notifications"
                    description="Triggered when a wedding gallery is published or delivered to client couples."
                    checked={settings.galleryPublishedEnabled !== false}
                    onChange={() => handleToggle("galleryPublishedEnabled")}
                  />
                  <ToggleRow
                    label="Client Photo Selection Submitted Alerts"
                    description="Triggered when a couple submits their final photo selections to the photographer."
                    checked={settings.selectionSubmittedEnabled !== false}
                    onChange={() => handleToggle("selectionSubmittedEnabled")}
                  />
                  <ToggleRow
                    label="Client Selection Confirmation Receipts"
                    description="Triggered to confirm receipt of selected media and album preferences back to the couple."
                    checked={settings.selectionConfirmationEnabled !== false}
                    onChange={() => handleToggle("selectionConfirmationEnabled")}
                  />
                  <ToggleRow
                    label="Gallery Expiry & Renewal Reminders"
                    description="Automated countdown warning notices sent before a private gallery access period concludes."
                    checked={settings.expiryReminderEnabled !== false}
                    onChange={() => handleToggle("expiryReminderEnabled")}
                  />
                  <ToggleRow
                    label="Team & Staff Member Invitations"
                    description="Invitations and onboarding activation links dispatched to photographer team members."
                    checked={settings.teamInvitationEnabled !== false}
                    onChange={() => handleToggle("teamInvitationEnabled")}
                  />
                  <ToggleRow
                    label="Password Reset & Recovery Requests (Security-Critical)"
                    description="Self-service password reset links and emergency recovery tokens."
                    checked={settings.passwordResetEnabled !== false}
                    onChange={() => handleToggle("passwordResetEnabled")}
                    protectedBadge
                  />
                  <ToggleRow
                    label="Billing, Subscriptions & Invoicing"
                    description="Subscription renewal notices, payment receipts, and invoice failure alerts."
                    checked={settings.billingNotificationsEnabled !== false}
                    onChange={() => handleToggle("billingNotificationsEnabled")}
                  />
                  <ToggleRow
                    label="Security, 2FA & Account Status Alerts (Security-Critical)"
                    description="New device logins, email verifications, OTPs, and suspension/reactivation notices."
                    checked={settings.securityNotificationsEnabled !== false}
                    onChange={() => handleToggle("securityNotificationsEnabled")}
                    protectedBadge
                  />
                </div>
              </SectionCard>
            )}

            {/* Email Controls Section */}
            {(activeTab === "all" || activeTab === "email") && (
              <SectionCard
                title="Email Communication Controls"
                description="Manage outbound SMTP/Transactional email delivery across all customer workflows."
                icon={Mail}
                headerAction={
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleBulkToggle(
                          [
                            "emailEnabled",
                            "emailClientGalleries",
                            "emailClientSelections",
                            "emailPhotographerDigest",
                            "emailPhotographerBilling",
                            "emailMarketingCampaigns",
                            "emailSecurityAlerts",
                            "emailPasswordReset",
                            "emailVerification",
                            "emailAccountAlerts",
                          ],
                          true
                        )
                      }
                      className="text-xs px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                    >
                      Enable All
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleBulkToggle(
                          [
                            "emailEnabled",
                            "emailClientGalleries",
                            "emailClientSelections",
                            "emailPhotographerDigest",
                            "emailPhotographerBilling",
                            "emailMarketingCampaigns",
                          ],
                          false
                        )
                      }
                      className="text-xs px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                    >
                      Disable Non-Critical
                    </button>
                  </div>
                }
              >
                <div className="divide-y divide-slate-800/60">
                  <ToggleRow
                    label="Master Email Channel Gateway"
                    description="Master switch for all standard outbound platform emails."
                    checked={settings.emailEnabled}
                    onChange={() => handleToggle("emailEnabled")}
                    highlight
                  />
                  <ToggleRow
                    label="Client Gallery Published Emails"
                    description="Transactional notifications sent to couples when their wedding photo/video gallery is ready."
                    checked={settings.emailClientGalleries}
                    onChange={() => handleToggle("emailClientGalleries")}
                  />
                  <ToggleRow
                    label="Client Photo Selection Confirmations"
                    description="Confirmation emails sent to couples after submitting or updating their final selection."
                    checked={settings.emailClientSelections}
                    onChange={() => handleToggle("emailClientSelections")}
                  />
                  <ToggleRow
                    label="Photographer Daily / Weekly Activity Digest"
                    description="Summary digests sent to photographers regarding gallery views and client interactions."
                    checked={settings.emailPhotographerDigest}
                    onChange={() => handleToggle("emailPhotographerDigest")}
                  />
                  <ToggleRow
                    label="Photographer Billing & Invoicing Receipts"
                    description="Receipts, subscription renewal notices, and invoice generation alerts."
                    checked={settings.emailPhotographerBilling}
                    onChange={() => handleToggle("emailPhotographerBilling")}
                  />
                  <ToggleRow
                    label="Marketing & Promotional Campaign Emails"
                    description="Broadcast promotional updates, discount codes, and platform feature announcements."
                    checked={settings.emailMarketingCampaigns}
                    onChange={() => handleToggle("emailMarketingCampaigns")}
                  />
                  <ToggleRow
                    label="Password Reset & Recovery (Security-Critical)"
                    description="Self-service password reset links and emergency access recovery."
                    checked={settings.emailPasswordReset}
                    onChange={() => handleToggle("emailPasswordReset")}
                    protectedBadge
                  />
                  <ToggleRow
                    label="Email Verification (Security-Critical)"
                    description="New user onboarding email verification tokens."
                    checked={settings.emailVerification}
                    onChange={() => handleToggle("emailVerification")}
                    protectedBadge
                  />
                  <ToggleRow
                    label="Security & Suspicious Activity Alerts (Security-Critical)"
                    description="New device logins, password modification confirmations, and tenant risk alerts."
                    checked={settings.emailSecurityAlerts}
                    onChange={() => handleToggle("emailSecurityAlerts")}
                    protectedBadge
                  />
                </div>
              </SectionCard>
            )}

            {/* WhatsApp Controls Section */}
            {(activeTab === "all" || activeTab === "whatsapp") && (
              <SectionCard
                title="WhatsApp Communication Controls"
                description="Platform-wide Meta Cloud API and Twilio WhatsApp delivery controls."
                icon={MessageSquare}
                headerAction={
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleBulkToggle(
                          [
                            "whatsappEnabled",
                            "whatsappClientGalleries",
                            "whatsappClientSelections",
                            "whatsappPhotographerAlerts",
                            "whatsappMarketingBroadcasts",
                          ],
                          true
                        )
                      }
                      className="text-xs px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                    >
                      Enable All WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleBulkToggle(
                          [
                            "whatsappEnabled",
                            "whatsappClientGalleries",
                            "whatsappClientSelections",
                            "whatsappPhotographerAlerts",
                            "whatsappMarketingBroadcasts",
                          ],
                          false
                        )
                      }
                      className="text-xs px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                    >
                      Disable All WhatsApp
                    </button>
                  </div>
                }
              >
                <div className="divide-y divide-slate-800/60">
                  <ToggleRow
                    label="Master WhatsApp Channel Gateway"
                    description="Master kill switch for all platform WhatsApp dispatches."
                    checked={settings.whatsappEnabled}
                    onChange={() => handleToggle("whatsappEnabled")}
                    highlight
                  />
                  <ToggleRow
                    label="Client Gallery Ready WhatsApp Notifications"
                    description="Instant WhatsApp message sent to couples with access codes and gallery direct links."
                    checked={settings.whatsappClientGalleries}
                    onChange={() => handleToggle("whatsappClientGalleries")}
                  />
                  <ToggleRow
                    label="Client Selection Confirmation WhatsApp"
                    description="Instant confirmation message to couples once photo selection is submitted."
                    checked={settings.whatsappClientSelections}
                    onChange={() => handleToggle("whatsappClientSelections")}
                  />
                  <ToggleRow
                    label="Photographer Realtime WhatsApp Alerts"
                    description="Instant notifications to photographers when a couple locks in selections."
                    checked={settings.whatsappPhotographerAlerts}
                    onChange={() => handleToggle("whatsappPhotographerAlerts")}
                  />
                  <ToggleRow
                    label="WhatsApp Marketing & Broadcast Messages"
                    description="Promotional announcements and campaign broadcasts sent over WhatsApp."
                    checked={settings.whatsappMarketingBroadcasts}
                    onChange={() => handleToggle("whatsappMarketingBroadcasts")}
                  />
                </div>
              </SectionCard>
            )}

            {/* SMS, Push & In-App Section */}
            {(activeTab === "all" || activeTab === "sms_push") && (
              <div className="space-y-6">
                <SectionCard
                  title="SMS Gateway Controls"
                  description="Direct SMS delivery switches via Twilio, AWS SNS, or MSG91."
                  icon={Smartphone}
                >
                  <div className="divide-y divide-slate-800/60">
                    <ToggleRow
                      label="Master SMS Gateway"
                      description="Enable or disable SMS message delivery across the entire platform."
                      checked={settings.smsEnabled}
                      onChange={() => handleToggle("smsEnabled")}
                      highlight
                    />
                    <ToggleRow
                      label="Client Gallery Ready SMS"
                      description="Short-link SMS sent to couple mobile numbers."
                      checked={settings.smsClientGalleries}
                      onChange={() => handleToggle("smsClientGalleries")}
                    />
                    <ToggleRow
                      label="Client Selection Confirmation SMS"
                      description="SMS confirmation sent after selection submission."
                      checked={settings.smsClientSelections}
                      onChange={() => handleToggle("smsClientSelections")}
                    />
                    <ToggleRow
                      label="Photographer Urgent Activity SMS"
                      description="High-priority photographer operational alerts."
                      checked={settings.smsPhotographerAlerts}
                      onChange={() => handleToggle("smsPhotographerAlerts")}
                    />
                    <ToggleRow
                      label="Security 2FA / OTP SMS (Protected)"
                      description="One-Time Passwords and authentication login codes."
                      checked={settings.smsSecurityOtp}
                      onChange={() => handleToggle("smsSecurityOtp")}
                      protectedBadge
                    />
                  </div>
                </SectionCard>

                <SectionCard
                  title="Push & In-App Notification Controls"
                  description="Web Push (VAPID/FCM) and In-App Photographer Dashboard notifications."
                  icon={Bell}
                >
                  <div className="divide-y divide-slate-800/60">
                    <ToggleRow
                      label="Master Web Push Gateway"
                      description="Browser web push notifications for photographers and clients."
                      checked={settings.pushEnabled}
                      onChange={() => handleToggle("pushEnabled")}
                      highlight
                    />
                    <ToggleRow
                      label="Client Web Push Notifications"
                      description="Gallery status updates in supporting browsers."
                      checked={settings.pushClientGalleries}
                      onChange={() => handleToggle("pushClientGalleries")}
                    />
                    <ToggleRow
                      label="Photographer Realtime Web Push"
                      description="Immediate desktop and mobile push notifications for photographer staff."
                      checked={settings.pushPhotographerAlerts}
                      onChange={() => handleToggle("pushPhotographerAlerts")}
                    />
                    <ToggleRow
                      label="In-App Notification Feed (Dashboard)"
                      description="Internal notification bell, activity log, and announcement drawer in the photographer dashboard."
                      checked={settings.inAppEnabled}
                      onChange={() => handleToggle("inAppEnabled")}
                      highlight
                    />
                    <ToggleRow
                      label="System Maintenance & Broadcast Announcements (In-App)"
                      description="Platform-wide maintenance banners and release notes displayed in photographer workspaces."
                      checked={settings.inAppSystemAnnouncements}
                      onChange={() => handleToggle("inAppSystemAnnouncements")}
                    />
                  </div>
                </SectionCard>
              </div>
            )}

            {/* Audience Controls Section */}
            {(activeTab === "all" || activeTab === "audience") && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SectionCard
                  title="Client Communications"
                  description="Global policies governing messages addressed to end-user clients (couples & guests)."
                  icon={Users}
                >
                  <div className="divide-y divide-slate-800/60">
                    <ToggleRow
                      label="All Client Communications"
                      description="Master switch for any communication addressed to clients."
                      checked={settings.clientAllEnabled}
                      onChange={() => handleToggle("clientAllEnabled")}
                      highlight
                    />
                    <ToggleRow
                      label="Gallery Published Delivery"
                      description="Allow sending gallery delivery messages to clients."
                      checked={settings.clientGalleryPublished}
                      onChange={() => handleToggle("clientGalleryPublished")}
                    />
                    <ToggleRow
                      label="Selection Confirmations"
                      description="Allow sending photo selection receipts to clients."
                      checked={settings.clientSelectionConfirmation}
                      onChange={() => handleToggle("clientSelectionConfirmation")}
                    />
                    <ToggleRow
                      label="Client Marketing & Upsells"
                      description="Allow print store offers, album upsell reminders, or client promotions."
                      checked={settings.clientMarketing}
                      onChange={() => handleToggle("clientMarketing")}
                    />
                  </div>
                </SectionCard>

                <SectionCard
                  title="Photographer Communications"
                  description="Global policies governing messages addressed to SaaS photographer subscribers."
                  icon={Camera}
                >
                  <div className="divide-y divide-slate-800/60">
                    <ToggleRow
                      label="All Photographer Communications"
                      description="Master switch for notifications addressed to photographers."
                      checked={settings.photographerAllEnabled}
                      onChange={() => handleToggle("photographerAllEnabled")}
                      highlight
                    />
                    <ToggleRow
                      label="Client Selection Submitted Alerts"
                      description="Notify photographers when a couple finishes their photo choices."
                      checked={settings.photographerSelectionSubmitted}
                      onChange={() => handleToggle("photographerSelectionSubmitted")}
                    />
                    <ToggleRow
                      label="Billing & Subscription Invoices"
                      description="Notify photographers of subscription renewals and payment events."
                      checked={settings.photographerBillingReceipts}
                      onChange={() => handleToggle("photographerBillingReceipts")}
                    />
                    <ToggleRow
                      label="Storage Quota & Limit Warnings"
                      description="Alert photographers when reaching 80% or 100% of plan storage capacity."
                      checked={settings.photographerStorageAlerts}
                      onChange={() => handleToggle("photographerStorageAlerts")}
                    />
                  </div>
                </SectionCard>
              </div>
            )}

            {/* Marketing & Compliance Section */}
            {(activeTab === "all" || activeTab === "marketing") && (
              <SectionCard
                title="Marketing, Campaigns & Consent Guardrails"
                description="Anti-spam compliance controls, double opt-in enforcement, and marketing boundaries."
                icon={Megaphone}
              >
                <div className="mb-4 p-4 rounded-xl bg-indigo-950/30 border border-indigo-900/50 text-indigo-200 text-xs flex items-start gap-3">
                  <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold text-indigo-300">Compliance Boundary:</strong> Marketing communications are strictly segregated from transactional and security-critical channels. Toggling marketing OFF will never disrupt critical gallery deliverables or password recovery.
                  </div>
                </div>

                <div className="divide-y divide-slate-800/60">
                  <ToggleRow
                    label="Master Marketing Communications Switch"
                    description="Master switch for all promotional, marketing, and non-transactional campaigns."
                    checked={settings.marketingAllEnabled}
                    onChange={() => handleToggle("marketingAllEnabled")}
                    highlight
                  />
                  <ToggleRow
                    label="Promotional & Seasonal Discount Campaigns"
                    description="Special plan discounts, festival promotions, and upgrade incentives."
                    checked={settings.marketingPromotions}
                    onChange={() => handleToggle("marketingPromotions")}
                  />
                  <ToggleRow
                    label="Product Updates & Feature Announcements"
                    description="Feature release notes and major product enhancement emails."
                    checked={settings.marketingProductUpdates}
                    onChange={() => handleToggle("marketingProductUpdates")}
                  />
                  <ToggleRow
                    label="Monthly Platform Newsletter"
                    description="Tips for wedding photography businesses and platform best practices."
                    checked={settings.marketingNewsletter}
                    onChange={() => handleToggle("marketingNewsletter")}
                  />
                  <ToggleRow
                    label="Strictly Require Double Opt-In"
                    description="Require recipients to confirm their subscription before receiving any marketing."
                    checked={settings.marketingRequireDoubleOptIn}
                    onChange={() => handleToggle("marketingRequireDoubleOptIn")}
                  />
                  <ToggleRow
                    label="Strictly Enforce Unsubscribe & Honor List-Unsubscribe Header"
                    description="Automatically suppress delivery to unsubscribed contacts and include standard RFC List-Unsubscribe headers."
                    checked={settings.marketingRespectUnsubscribe}
                    onChange={() => handleToggle("marketingRespectUnsubscribe")}
                  />
                </div>
              </SectionCard>
            )}
          </div>
        </div>
      )}

      {/* Sticky Bottom Action Bar (when in Controls mode) */}
      {mainView === "controls" && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 px-4 sm:px-6 py-4 shadow-2xl safe-floating-bar">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {hasUnsavedChanges ? (
                <span className="flex items-center gap-2 text-xs font-semibold text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20">
                  <AlertTriangle className="w-4 h-4" />
                  You have unsaved changes in communication controls
                </span>
              ) : (
                <span className="flex items-center gap-2 text-xs text-slate-400">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  All controls synchronized with cluster storage
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleReset}
                disabled={!hasUnsavedChanges || saveStatus === "saving"}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:pointer-events-none text-sm font-medium transition"
              >
                <RotateCcw className="w-4 h-4" />
                Discard Changes
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={!hasUnsavedChanges || saveStatus === "saving"}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-medium text-sm transition shadow-lg shadow-indigo-600/30 disabled:opacity-40 disabled:pointer-events-none"
              >
                {saveStatus === "saving" ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Saving Controls...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Platform Controls
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && confirmModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{confirmModal.title}</h3>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">{confirmModal.description}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmModal.action}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition shadow-lg shadow-rose-600/30"
              >
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Communication Details Drawer / Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-5">
            <button
              onClick={() => setSelectedRecord(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            >
              <XCircle className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
              <FileText className="w-4 h-4" />
              Notification Dispatch Record
            </div>

            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white font-mono">{selectedRecord.id}</h3>
                <span className="text-xs text-slate-400">{selectedRecord.type}</span>
              </div>
              <NotificationStatusBadge status={selectedRecord.status} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <span className="text-slate-500 block">Channel & Provider</span>
                <span className="font-semibold text-slate-200">
                  {selectedRecord.channel} ({selectedRecord.provider || "Internal"})
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <span className="text-slate-500 block">Masked Recipient</span>
                <span className="font-semibold text-slate-200 font-mono">
                  {(selectedRecord as any).maskedRecipient || selectedRecord.recipient || selectedRecord.recipientEmail || "N/A"}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <span className="text-slate-500 block">Created At</span>
                <span className="font-semibold text-slate-200 font-mono">
                  {new Date(selectedRecord.createdAt).toLocaleString()}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <span className="text-slate-500 block">Sent / Delivered At</span>
                <span className="font-semibold text-slate-200 font-mono">
                  {selectedRecord.sentAt || selectedRecord.deliveredAt
                    ? new Date(selectedRecord.sentAt || selectedRecord.deliveredAt!).toLocaleString()
                    : "Not Sent"}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <span className="text-slate-500 block">Photographer ID</span>
                <span className="font-semibold text-slate-200 font-mono">
                  {selectedRecord.photographerId || "SYSTEM"}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <span className="text-slate-500 block">Project ID</span>
                <span className="font-semibold text-slate-200 font-mono">
                  {selectedRecord.projectId || "N/A"}
                </span>
              </div>
            </div>

            {selectedRecord.subject && (
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
                <span className="text-slate-500 block mb-1">Subject</span>
                <span className="text-slate-200 font-medium">{selectedRecord.subject}</span>
              </div>
            )}

            {selectedRecord.errorMessage && (
              <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-800/60 text-xs space-y-1">
                <span className="text-rose-400 font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> Error Description
                </span>
                <p className="text-rose-200 font-mono text-[11px] leading-relaxed">
                  {selectedRecord.errorMessage}
                </p>
              </div>
            )}

            {selectedRecord.metadata && Object.keys(selectedRecord.metadata).length > 0 && (
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
                <span className="text-slate-500 block mb-1 font-mono">Metadata Payload</span>
                <pre className="text-[11px] font-mono text-slate-300 bg-slate-900 p-2.5 rounded-lg overflow-x-auto">
                  {JSON.stringify(selectedRecord.metadata, null, 2)}
                </pre>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Dispatch Modal */}
      {testModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setTestModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            >
              <XCircle className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Send className="w-4 h-4" />
              Super Admin Diagnostic
            </div>
            <h3 className="text-lg font-bold text-white">Test Communication Delivery</h3>
            <p className="text-xs text-slate-400 mt-1">
              Test live gateway configuration and server-side policy enforcement.
            </p>

            <form onSubmit={handleSendTest} className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Channel
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTestChannel("EMAIL")}
                    className={`py-2 px-3 rounded-xl text-xs font-medium border flex items-center justify-center gap-2 transition ${
                      testChannel === "EMAIL"
                        ? "bg-indigo-600/20 border-indigo-500 text-indigo-300"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Email
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestChannel("WHATSAPP")}
                    className={`py-2 px-3 rounded-xl text-xs font-medium border flex items-center justify-center gap-2 transition ${
                      testChannel === "WHATSAPP"
                        ? "bg-emerald-600/20 border-emerald-500 text-emerald-300"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    WhatsApp
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  {testChannel === "EMAIL" ? "Recipient Email Address" : "Recipient Phone Number (E.164)"}
                </label>
                <input
                  type={testChannel === "EMAIL" ? "email" : "text"}
                  placeholder={testChannel === "EMAIL" ? "admin@example.com" : "+919876543210"}
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  required
                  className="w-full text-sm bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-xl text-xs border ${
                    testResult.success
                      ? "bg-emerald-950/40 border-emerald-800 text-emerald-200"
                      : "bg-rose-950/40 border-rose-800 text-rose-200"
                  }`}
                >
                  <div className="font-semibold flex items-center gap-2">
                    {testResult.success ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        Dispatched Successfully
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                        {testResult.blocked ? "Blocked by Platform Setting" : "Delivery Error"}
                      </>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] opacity-90">
                    {testResult.error || testResult.reason || `Provider: ${testResult.provider || "Active Gateway"}`}
                  </p>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTestModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={testSending || !testRecipient}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-2 disabled:opacity-40"
                >
                  {testSending ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Send Test Message
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// Component Helpers
// -------------------------------------------------------------

function NotificationStatusBadge({ status }: { status: string }) {
  if (status === "SENT" || status === "DELIVERED") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
        <Check className="w-3 h-3 text-emerald-400" /> {status}
      </span>
    );
  }
  if (status === "FAILED") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/80 text-rose-300 border border-rose-500/40">
        <X className="w-3 h-3 text-rose-400" /> FAILED
      </span>
    );
  }
  if (status === "RETRYING") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-950/80 text-indigo-300 border border-indigo-500/40 animate-pulse">
        <RefreshCw className="w-3 h-3 text-indigo-400 animate-spin" /> RETRYING
      </span>
    );
  }
  if (status === "BLOCKED" || status === "BLOCKED_BY_PLATFORM_SETTING") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-500/40">
        <ShieldAlert className="w-3 h-3 text-amber-400" /> BLOCKED
      </span>
    );
  }
  if (status === "SKIPPED" || status === "SKIPPED_BY_PREFERENCE") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-slate-400 border border-slate-800">
        <Sliders className="w-3 h-3 text-slate-500" /> SKIPPED
      </span>
    );
  }
  if (status === "NOT_CONFIGURED") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-slate-400 border border-slate-700">
        <AlertTriangle className="w-3 h-3 text-slate-500" /> NOT CONFIGURED
      </span>
    );
  }
  if (status === "QUEUED" || status === "SENDING") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/40">
        <Clock className="w-3 h-3 text-cyan-400" /> {status}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-slate-300 border border-slate-800">
      <Clock className="w-3 h-3 text-slate-400" /> {status}
    </span>
  );
}

function StatusBadge({
  label,
  status,
  sub,
  provider,
  configured,
  icon: Icon,
  tone,
}: {
  label: string;
  status: string;
  sub?: string;
  provider?: string;
  configured?: boolean;
  icon: any;
  tone?: "emerald" | "rose" | "amber" | "indigo";
}) {
  const isOk = status === "ENABLED" || status === "ACTIVE" || status === "PROTECTED";
  const badgeTone = tone || (isOk ? "emerald" : "rose");

  const colors = {
    emerald: "bg-emerald-950/30 border-emerald-800/60 text-emerald-300",
    rose: "bg-rose-950/30 border-rose-800/60 text-rose-300",
    amber: "bg-amber-950/30 border-amber-800/60 text-amber-300",
    indigo: "bg-indigo-950/30 border-indigo-800/60 text-indigo-300",
  };

  return (
    <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between">
      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
        <span className="font-medium truncate">{label}</span>
        <Icon className="w-4 h-4 text-slate-500 shrink-0" />
      </div>

      <div className="flex items-center justify-between gap-1 flex-wrap">
        <span
          className={`text-[11px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${colors[badgeTone]}`}
        >
          {status}
        </span>
        {configured !== undefined && (
          <span
            className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
              configured
                ? "bg-emerald-950/40 text-emerald-400 border-emerald-800/50"
                : "bg-slate-900 text-slate-500 border-slate-800"
            }`}
          >
            {configured ? "CONFIGURED" : "NOT CONFIGURED"}
          </span>
        )}
        {provider && (
          <span className="text-[10px] text-slate-500 truncate font-mono">
            {provider}
          </span>
        )}
        {sub && <span className="text-[10px] text-slate-500 truncate">{sub}</span>}
      </div>
    </div>
  );
}

function SectionCard({
  title,
  description,
  icon: Icon,
  headerAction,
  children,
}: {
  title: string;
  description: string;
  icon: any;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-slate-900/40 border border-slate-800/80 overflow-hidden shadow-sm">
      <div className="p-5 sm:p-6 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">{title}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{description}</p>
          </div>
        </div>

        {headerAction && <div>{headerAction}</div>}
      </div>

      <div className="p-2 sm:p-4">{children}</div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  highlight,
  protectedBadge,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
  highlight?: boolean;
  protectedBadge?: boolean;
}) {
  return (
    <div
      className={`p-3.5 sm:p-4 rounded-xl flex items-center justify-between gap-4 transition ${
        highlight ? "bg-indigo-950/10 border border-indigo-900/30" : "hover:bg-slate-900/30"
      }`}
    >
      <div className="flex-1 pr-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-slate-200">{label}</span>
          {protectedBadge && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              Protected Security
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{description}</p>
      </div>

      <Switch checked={checked} onChange={onChange} size="md" disabled={false} />
    </div>
  );
}

function Switch({
  checked,
  onChange,
  disabled,
  size = "md",
  id,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  size?: "md" | "lg";
  id?: string;
}) {
  const isLg = size === "lg";
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-950 min-h-[44px] min-w-[44px] items-center justify-center ${
        disabled ? "opacity-40 cursor-not-allowed" : ""
      }`}
    >
      <div
        className={`rounded-full transition-colors duration-200 ${
          isLg ? "w-14 h-8 p-1" : "w-11 h-6 p-0.5"
        } ${checked ? "bg-indigo-600" : "bg-slate-800 border border-slate-700"}`}
      >
        <div
          className={`bg-white rounded-full shadow-md transform transition-transform duration-200 ${
            isLg ? "w-6 h-6" : "w-5 h-5"
          } ${checked ? (isLg ? "translate-x-6" : "translate-x-5") : "translate-x-0"}`}
        />
      </div>
    </button>
  );
}
