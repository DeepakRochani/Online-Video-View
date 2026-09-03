"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  Power,
  Tv,
  LayoutGrid,
  Layers,
  Sliders,
  FileText,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  Info,
  RefreshCw,
  ExternalLink,
  Users,
  Search,
  Eye,
  EyeOff,
  BarChart3,
  DollarSign,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import {
  AdSenseConfig,
  AdUnit,
  AdPlacement,
  AdOverride,
  AdSenseReportingStats,
  AdFormat,
  AdPlacementKey,
} from "@/lib/project-types";

export default function AdminAdSensePage() {
  const [activeTab, setActiveTab] = useState<"overview" | "units" | "placements" | "overrides" | "audit">("overview");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<AdSenseConfig | null>(null);
  const [reporting, setReporting] = useState<AdSenseReportingStats | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [adUnits, setAdUnits] = useState<AdUnit[]>([]);
  const [placements, setPlacements] = useState<AdPlacement[]>([]);
  const [overrides, setOverrides] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [photographers, setPhotographers] = useState<any[]>([]);

  // Modals
  const [unitModalOpen, setUnitModalOpen] = useState(false);
  const [placementModalOpen, setPlacementModalOpen] = useState(false);
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<AdUnit | null>(null);
  const [editingPlacement, setEditingPlacement] = useState<AdPlacement | null>(null);

  // Form states
  const [unitForm, setUnitForm] = useState<{
    id?: string;
    name: string;
    key: string;
    slotId: string;
    format: AdFormat;
    placement: AdPlacementKey;
    active: boolean;
    priority: number;
    responsive: boolean;
  }>({
    name: "",
    key: "",
    slotId: "",
    format: "horizontal",
    placement: "PHOTOGRAPHER_DASHBOARD_TOP",
    active: true,
    priority: 5,
    responsive: true,
  });

  const [placementForm, setPlacementForm] = useState<{
    id?: string;
    name: string;
    placementKey: AdPlacementKey;
    pageRule: string;
    adUnitId: string;
    enabled: boolean;
    allowedRoles: string[];
    planRule: "ALL" | "ADS_ENABLED_ONLY" | "EXCLUDE_PAID";
    description: string;
  }>({
    name: "",
    placementKey: "PHOTOGRAPHER_DASHBOARD_TOP",
    pageRule: "/dashboard",
    adUnitId: "",
    enabled: true,
    allowedRoles: ["PHOTOGRAPHER"],
    planRule: "ADS_ENABLED_ONLY",
    description: "",
  });

  const [overrideForm, setOverrideForm] = useState<{
    photographerId: string;
    adsEnabled: boolean;
    reason: string;
    expiresAt: string;
  }>({
    photographerId: "",
    adsEnabled: false,
    reason: "VIP Ad-Free Exemption",
    expiresAt: "",
  });

  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [cfgRes, unitsRes, placeRes, overRes, logsRes, photogsRes] = await Promise.all([
        fetch("/api/admin/adsense/config").then((r) => r.json()),
        fetch("/api/admin/adsense/units").then((r) => r.json()),
        fetch("/api/admin/adsense/placements").then((r) => r.json()),
        fetch("/api/admin/adsense/overrides").then((r) => r.json()),
        fetch("/api/admin/audit-logs?limit=25").then((r) => r.json()),
        fetch("/api/admin/photographers").then((r) => r.json()),
      ]);

      if (cfgRes.success) {
        setConfig(cfgRes.config);
        setReporting(cfgRes.reporting);
        setSummary(cfgRes.summary);
      }
      if (unitsRes.success) setAdUnits(unitsRes.units);
      if (placeRes.success) setPlacements(placeRes.placements);
      if (overRes.success) setOverrides(overRes.overrides);
      if (logsRes.success) {
        // Filter advertising related logs
        const adLogs = (logsRes.logs || []).filter(
          (l: any) =>
            l.action?.includes("AD") ||
            l.action?.includes("ADSENSE") ||
            l.targetId?.includes("ad") ||
            l.targetType === "system"
        );
        setAuditLogs(adLogs);
      }
      if (photogsRes.photographers) setPhotographers(photogsRes.photographers);
    } catch (err) {
      showNotification("error", "Failed to load AdSense configuration data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Save Global Config
  const handleSaveConfig = async (partial: Partial<AdSenseConfig>) => {
    if (!config) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/adsense/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partial),
      });
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
        showNotification("success", data.message || "AdSense configuration updated.");
      } else {
        showNotification("error", data.error || "Failed to update settings.");
      }
    } catch {
      showNotification("error", "Network error updating AdSense configuration.");
    } finally {
      setSaving(false);
    }
  };

  // Unit Modal Save
  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/adsense/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(unitForm),
      });
      const data = await res.json();
      if (data.success) {
        showNotification("success", data.message || "Ad unit saved successfully.");
        setUnitModalOpen(false);
        loadData();
      } else {
        showNotification("error", data.error || "Failed to save ad unit.");
      }
    } catch {
      showNotification("error", "Network error saving ad unit.");
    } finally {
      setSaving(false);
    }
  };

  // Delete Unit
  const handleDeleteUnit = async (id: string) => {
    if (!confirm("Are you sure you want to delete this ad unit?")) return;
    try {
      const res = await fetch(`/api/admin/adsense/units?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showNotification("success", "Ad unit deleted.");
        loadData();
      } else {
        showNotification("error", data.error || "Failed to delete ad unit.");
      }
    } catch {
      showNotification("error", "Network error deleting ad unit.");
    }
  };

  // Placement Modal Save
  const handleSavePlacement = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/adsense/placements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(placementForm),
      });
      const data = await res.json();
      if (data.success) {
        showNotification("success", data.message || "Ad placement saved successfully.");
        setPlacementModalOpen(false);
        loadData();
      } else {
        showNotification("error", data.error || "Failed to save placement.");
      }
    } catch {
      showNotification("error", "Network error saving placement.");
    } finally {
      setSaving(false);
    }
  };

  // Delete Placement
  const handleDeletePlacement = async (id: string) => {
    if (!confirm("Are you sure you want to delete this placement?")) return;
    try {
      const res = await fetch(`/api/admin/adsense/placements?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showNotification("success", "Placement deleted.");
        loadData();
      } else {
        showNotification("error", data.error || "Failed to delete placement.");
      }
    } catch {
      showNotification("error", "Network error deleting placement.");
    }
  };

  // Override Modal Save
  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideForm.photographerId) {
      showNotification("error", "Please select a photographer.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/adsense/overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(overrideForm),
      });
      const data = await res.json();
      if (data.success) {
        showNotification("success", data.message || "Photographer ad override saved.");
        setOverrideModalOpen(false);
        loadData();
      } else {
        showNotification("error", data.error || "Failed to set override.");
      }
    } catch {
      showNotification("error", "Network error setting override.");
    } finally {
      setSaving(false);
    }
  };

  // Delete Override
  const handleDeleteOverride = async (photographerId: string) => {
    if (!confirm("Are you sure you want to remove this photographer ad override?")) return;
    try {
      const res = await fetch(`/api/admin/adsense/overrides?photographerId=${photographerId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showNotification("success", "Override removed.");
        loadData();
      } else {
        showNotification("error", data.error || "Failed to remove override.");
      }
    } catch {
      showNotification("error", "Network error removing override.");
    }
  };

  const isConnected = !!config?.publisherId && config.publisherId.startsWith("ca-pub-");

  if (loading && !config) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-900 rounded-lg w-80" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-900/60 rounded-2xl border border-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-indigo-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Google AdSense & Platform Advertising
                </h1>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Control Center
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Centralized multi-tenant publisher advertising architecture and policy governance
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white transition-all text-xs flex items-center gap-1.5"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 text-xs sm:text-sm font-medium animate-fadeIn ${
            notification.type === "success"
              ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
              : "bg-rose-950/40 border-rose-500/40 text-rose-300"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* EMERGENCY SAFETY KILL SWITCH BANNER */}
      {config?.safetyMode && (
        <div className="p-5 rounded-2xl border border-rose-500/60 bg-gradient-to-r from-rose-950/70 via-slate-950/90 to-rose-950/70 shadow-xl shadow-rose-950/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shrink-0 animate-pulse">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-rose-300 tracking-wide uppercase font-mono">
                  EMERGENCY POLICY SAFETY MODE IS ACTIVE
                </span>
                <span className="bg-rose-500/20 border border-rose-400/40 px-2 py-0.5 rounded text-[10px] font-mono text-rose-200">
                  ALL ADS GLOBALLY BLOCKED
                </span>
              </div>
              <p className="text-xs text-rose-200/80 mt-1">
                Zero advertisements are being rendered anywhere across the SaaS platform. Configuration and ad units are
                preserved.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleSaveConfig({ safetyMode: false })}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs shadow-lg shadow-rose-600/30 transition-all shrink-0"
          >
            Deactivate Safety Mode
          </button>
        </div>
      )}

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status */}
        <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 font-mono">Google AdSense Status</span>
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                isConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
              }`}
            />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-lg font-bold text-white font-mono">
              {isConnected ? "CONNECTED" : "NOT CONNECTED"}
            </span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                config?.enabled && !config.safetyMode
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
              }`}
            >
              {config?.enabled && !config.safetyMode ? "ADS ENABLED" : "ADS DISABLED"}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-mono truncate">
            {config?.publisherId || "No Publisher ID set"}
          </p>
        </div>

        {/* Ad Units */}
        <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 font-mono">Ad Units</span>
            <LayoutGrid className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-lg font-bold text-white font-mono">
              {summary?.activeAdUnits || 0} / {summary?.totalAdUnits || 0}
            </span>
            <span className="text-[10px] text-indigo-300 font-mono">Units Active</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Responsive custom slots</p>
        </div>

        {/* Placements */}
        <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 font-mono">Placements & Rules</span>
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-lg font-bold text-white font-mono">
              {summary?.activePlacements || 0} / {summary?.totalPlacements || 0}
            </span>
            <span className="text-[10px] text-cyan-300 font-mono">Placements Live</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Client galleries protected</p>
        </div>

        {/* Simulation / Test Mode */}
        <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 font-mono">Simulation Mode</span>
            <Tv className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span
              className={`text-lg font-bold font-mono ${
                config?.testMode ? "text-amber-400" : "text-emerald-400"
              }`}
            >
              {config?.testMode ? "TEST MODE" : "LIVE MODE"}
            </span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                config?.testMode
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
              }`}
            >
              {config?.testMode ? "SAFE PLACEHOLDERS" : "PRODUCTION"}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {config?.testMode ? "Zero fake revenue • Layout verification" : "Live Google AdSense Serving"}
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-800 flex items-center gap-2 overflow-x-auto pb-px">
        {[
          { id: "overview", label: "Overview & Global Settings", icon: Sliders },
          { id: "units", label: `Ad Units (${adUnits.length})`, icon: LayoutGrid },
          { id: "placements", label: `Placements (${placements.length})`, icon: Layers },
          { id: "overrides", label: `Tenant Overrides (${overrides.length})`, icon: Users },
          { id: "audit", label: "AdSense Audit Trail", icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap border-t border-x ${
                isActive
                  ? "bg-slate-900/90 text-indigo-300 border-indigo-500/40 border-b-transparent shadow-sm"
                  : "text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/40"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-indigo-400" : "text-slate-400"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & GLOBAL SETTINGS */}
      {activeTab === "overview" && config && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Col: Master Controls */}
            <div className="lg:col-span-2 space-y-6">
              {/* Publisher ID & Switches Card */}
              <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                  <div>
                    <h2 className="text-base font-semibold text-white">Google AdSense Credentials & Switches</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Configure your platform Google Publisher ID and ad serving toggles.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        config.enabled && !config.safetyMode ? "bg-emerald-400" : "bg-rose-400"
                      }`}
                    />
                    <span className="text-xs font-mono text-slate-300">
                      {config.enabled && !config.safetyMode ? "Active" : "Disabled"}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 font-mono uppercase mb-1.5">
                      AdSense Publisher ID
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        value={config.publisherId}
                        onChange={(e) => setConfig({ ...config, publisherId: e.target.value })}
                        placeholder="ca-pub-XXXXXXXXXXXXXXXX"
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                      <button
                        onClick={() => handleSaveConfig({ publisherId: config.publisherId })}
                        disabled={saving}
                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium transition-all shadow-lg shadow-indigo-600/20"
                      >
                        Save ID
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      Format must begin with <code className="text-indigo-300">ca-pub-</code>. Found in your Google
                      AdSense account under Account → Settings → Account information.
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Master Switch */}
                    <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-white block">Platform Ads Master Switch</span>
                        <span className="text-[11px] text-slate-400">Enable or disable all ads platform-wide</span>
                      </div>
                      <button
                        onClick={() => handleSaveConfig({ enabled: !config.enabled })}
                        className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                          config.enabled ? "bg-indigo-600" : "bg-slate-800"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full bg-white transition-transform ${
                            config.enabled ? "translate-x-6" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Test Mode */}
                    <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-white block">AdSense Test Mode</span>
                        <span className="text-[11px] text-slate-400">Show visual placeholders; no live calls</span>
                      </div>
                      <button
                        onClick={() => handleSaveConfig({ testMode: !config.testMode })}
                        className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                          config.testMode ? "bg-amber-600" : "bg-slate-800"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full bg-white transition-transform ${
                            config.testMode ? "translate-x-6" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Auto Ads */}
                    <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-white block">Google Auto Ads</span>
                        <span className="text-[11px] text-slate-400">Allow Google AI ad placement on public pages</span>
                      </div>
                      <button
                        onClick={() => handleSaveConfig({ autoAdsEnabled: !config.autoAdsEnabled })}
                        className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                          config.autoAdsEnabled ? "bg-indigo-600" : "bg-slate-800"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full bg-white transition-transform ${
                            config.autoAdsEnabled ? "translate-x-6" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Manual In-Page Units */}
                    <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-white block">In-Page Ad Units</span>
                        <span className="text-[11px] text-slate-400">Render controlled &lt;AdSlot /&gt; components</span>
                      </div>
                      <button
                        onClick={() => handleSaveConfig({ manualAdsEnabled: !config.manualAdsEnabled })}
                        className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                          config.manualAdsEnabled ? "bg-indigo-600" : "bg-slate-800"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full bg-white transition-transform ${
                            config.manualAdsEnabled ? "translate-x-6" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Client Wedding Gallery Ads Policy */}
                    <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-between sm:col-span-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white block">Client Wedding Gallery Ads</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                            Default: OFF (Ad-Free Luxury)
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          When OFF (recommended), all client wedding galleries are 100% ad-free regardless of photographer tier.
                        </span>
                      </div>
                      <button
                        onClick={() => handleSaveConfig({ clientGalleryAdsEnabled: !config.clientGalleryAdsEnabled })}
                        className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                          config.clientGalleryAdsEnabled ? "bg-amber-600" : "bg-slate-800"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full bg-white transition-transform ${
                            config.clientGalleryAdsEnabled ? "translate-x-6" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Frequency Controls */}
                  <div className="pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 font-mono mb-1">
                        Max Ads Per Page (Frequency Cap)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={config.maxAdsPerPage}
                        onChange={(e) => setConfig({ ...config, maxAdsPerPage: parseInt(e.target.value, 10) || 3 })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Complies with Google publisher UX policies</p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 font-mono mb-1">
                        Min Spacing (Pixels)
                      </label>
                      <input
                        type="number"
                        min="100"
                        step="50"
                        value={config.minSpacingPx}
                        onChange={(e) => setConfig({ ...config, minSpacingPx: parseInt(e.target.value, 10) || 300 })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Prevents adjacent banner clutter</p>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() =>
                        handleSaveConfig({
                          maxAdsPerPage: config.maxAdsPerPage,
                          minSpacingPx: config.minSpacingPx,
                        })
                      }
                      disabled={saving}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-medium transition-all"
                    >
                      Save Frequency Settings
                    </button>
                  </div>
                </div>
              </div>

              {/* Emergency Safety Policy Mode */}
              <div className="p-6 rounded-2xl border border-rose-900/40 bg-gradient-to-tr from-rose-950/20 to-slate-900/60 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-white">Emergency Policy Safety Mode (Kill Switch)</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Use during Google policy audits, sudden warning emails, or when ad delivery must cease
                      immediately.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-rose-800/40 bg-rose-950/30 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-rose-200 block">
                      Emergency Kill Switch: {config.safetyMode ? "ACTIVE (ALL ADS BLOCKED)" : "STANDBY (NORMAL)"}
                    </span>
                    <span className="text-[11px] text-rose-300/70">
                      Instantly shuts off all client scripts and ad unit rendering without deleting ad unit definitions.
                    </span>
                  </div>
                  <button
                    onClick={() => handleSaveConfig({ safetyMode: !config.safetyMode })}
                    disabled={saving}
                    className={`px-4 py-2 rounded-xl font-mono text-xs font-bold transition-all shadow-md ${
                      config.safetyMode
                        ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30"
                        : "bg-slate-800 hover:bg-rose-950 text-rose-300 border border-rose-800/50"
                    }`}
                  >
                    {config.safetyMode ? "DEACTIVATE KILL SWITCH" : "TRIGGER EMERGENCY KILL SWITCH"}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Col: Reporting Status & Revenue Ownership */}
            <div className="space-y-6">
              {/* AdSense Reporting API Card */}
              <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-indigo-400" />
                    <h2 className="text-sm font-semibold text-white">AdSense Reporting API</h2>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30">
                    UNCONNECTED
                  </span>
                </div>

                <div className="p-4 rounded-xl border border-dashed border-slate-800 bg-slate-950/60 text-center space-y-2">
                  <AlertTriangle className="w-6 h-6 text-amber-400 mx-auto" />
                  <p className="text-xs font-medium text-slate-300">
                    {reporting?.message || "Statistics unavailable — connect AdSense reporting integration."}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    We strictly guarantee 100% honest analytics with zero fabricated impression or revenue numbers.
                  </p>
                </div>

                <div className="space-y-2 text-xs text-slate-400">
                  <div className="flex justify-between py-1 border-b border-slate-800/50 font-mono">
                    <span>Estimated Revenue:</span>
                    <span className="text-slate-400">Unavailable</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/50 font-mono">
                    <span>Impressions Today:</span>
                    <span className="text-slate-400">Unavailable</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/50 font-mono">
                    <span>Click-Through Rate (CTR):</span>
                    <span className="text-slate-400">Unavailable</span>
                  </div>
                </div>
              </div>

              {/* Revenue Ownership & Future Share Policy */}
              <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-sm font-semibold text-white">Platform Revenue Ownership</h2>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  By default, all advertising revenue generated across public marketing pages and ad-supported tiers
                  flows <strong>100% to the SaaS Platform Owner</strong>.
                </p>

                <div className="p-3 bg-indigo-950/30 border border-indigo-500/20 rounded-xl space-y-1">
                  <span className="text-[11px] font-semibold text-indigo-300 font-mono block">
                    Future Revenue Share Readiness
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Data models and tenant ledger hooks are architected for potential future revenue share models.
                  </p>
                </div>
              </div>

              {/* Hard Excluded Routes Info */}
              <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-sm font-semibold text-white">Permanently Excluded Routes</h2>
                </div>

                <ul className="space-y-1.5 text-xs text-slate-300 font-mono">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>/admin/* (Super Admin Platform)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>/gallery/* (Client Wedding Galleries)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>/client/* (Client Portal & Selection)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>/checkout & /pricing (Conversion Safe)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>/login & /register (Auth Security)</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AD UNITS */}
      {activeTab === "units" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-white">Configured Google Ad Units</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Define AdSense ad slot IDs and formats. These are dynamically mapped without hard-coding into React.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingUnit(null);
                setUnitForm({
                  name: "",
                  key: "",
                  slotId: "",
                  format: "horizontal",
                  placement: "PHOTOGRAPHER_DASHBOARD_TOP",
                  active: true,
                  priority: 5,
                  responsive: true,
                });
                setUnitModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create Ad Unit</span>
            </button>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-mono uppercase text-slate-400">
                  <tr>
                    <th className="py-3 px-4">Ad Unit Name</th>
                    <th className="py-3 px-4">Internal Key</th>
                    <th className="py-3 px-4">AdSense Slot ID</th>
                    <th className="py-3 px-4">Format</th>
                    <th className="py-3 px-4">Linked Placement</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {adUnits.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-white font-sans">{u.name}</td>
                      <td className="py-3.5 px-4 text-indigo-300">{u.key}</td>
                      <td className="py-3.5 px-4 text-amber-300">{u.slotId}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] uppercase">
                          {u.format}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">{u.placement}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.active
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {u.active ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingUnit(u);
                              setUnitForm({
                                id: u.id,
                                name: u.name,
                                key: u.key,
                                slotId: u.slotId,
                                format: u.format,
                                placement: u.placement,
                                active: u.active,
                                priority: u.priority,
                                responsive: u.responsive,
                              });
                              setUnitModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-indigo-300 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteUnit(u.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PLACEMENTS & PAGE RULES */}
      {activeTab === "placements" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-white">Ad Placements & Routing Rules</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure which SaaS pages and roles allow advertising. Client wedding galleries are strictly protected.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingPlacement(null);
                setPlacementForm({
                  name: "",
                  placementKey: "PHOTOGRAPHER_DASHBOARD_TOP",
                  pageRule: "/dashboard",
                  adUnitId: adUnits[0]?.id || "",
                  enabled: true,
                  allowedRoles: ["PHOTOGRAPHER"],
                  planRule: "ADS_ENABLED_ONLY",
                  description: "",
                });
                setPlacementModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create Placement</span>
            </button>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-mono uppercase text-slate-400">
                  <tr>
                    <th className="py-3 px-4">Placement Name</th>
                    <th className="py-3 px-4">Key</th>
                    <th className="py-3 px-4">Page Target</th>
                    <th className="py-3 px-4">Linked Ad Unit</th>
                    <th className="py-3 px-4">Plan Rule</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {placements.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-white font-sans">{p.name}</td>
                      <td className="py-3.5 px-4 text-cyan-300">{p.placementKey}</td>
                      <td className="py-3.5 px-4 text-slate-400">{p.pageRule}</td>
                      <td className="py-3.5 px-4 text-indigo-300">
                        {adUnits.find((u) => u.id === p.adUnitId)?.name || p.adUnitId || "Auto Matched"}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                          {p.planRule}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.enabled
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          }`}
                        >
                          {p.enabled ? "ENABLED" : "DISABLED"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingPlacement(p);
                              setPlacementForm({
                                id: p.id,
                                name: p.name,
                                placementKey: p.placementKey,
                                pageRule: p.pageRule,
                                adUnitId: p.adUnitId || "",
                                enabled: p.enabled,
                                allowedRoles: p.allowedRoles || ["PHOTOGRAPHER"],
                                planRule: p.planRule,
                                description: p.description || "",
                              });
                              setPlacementModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-indigo-300 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeletePlacement(p.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: TENANT OVERRIDES & PLAN ENTITLEMENTS */}
      {activeTab === "overrides" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-white">Photographer Ad Overrides & Plan Entitlements</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Override ad visibility for individual photographers regardless of their base subscription plan.
              </p>
            </div>
            <button
              onClick={() => {
                setOverrideForm({
                  photographerId: photographers[0]?.id || "",
                  adsEnabled: false,
                  reason: "VIP Ad-Free Exemption",
                  expiresAt: "",
                });
                setOverrideModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Set Photographer Override</span>
            </button>
          </div>

          {/* Plan Entitlements Matrix Card */}
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
            <h3 className="text-sm font-semibold text-white font-mono uppercase">Subscription Plan Defaults</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60">
                <span className="text-xs font-semibold text-white block">Starter Studio (₹999/mo)</span>
                <span className="text-[11px] text-amber-300 font-mono mt-1 inline-block">
                  Ads Enabled (Ad-Supported)
                </span>
                <p className="text-[10px] text-slate-400 mt-1">Discreet top/bottom dashboard banners</p>
              </div>

              <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-950/20">
                <span className="text-xs font-semibold text-indigo-300 block">Pro Studio (₹2,499/mo)</span>
                <span className="text-[11px] text-emerald-400 font-mono mt-1 inline-block">
                  100% Ad-Free Guarantee
                </span>
                <p className="text-[10px] text-slate-400 mt-1">Zero ads + White-label branding</p>
              </div>

              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60">
                <span className="text-xs font-semibold text-white block">Studio Elite (₹4,999/mo)</span>
                <span className="text-[11px] text-emerald-400 font-mono mt-1 inline-block">
                  100% Ad-Free Guarantee
                </span>
                <p className="text-[10px] text-slate-400 mt-1">Zero ads + Multi-team seats</p>
              </div>

              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60">
                <span className="text-xs font-semibold text-white block">Enterprise (₹9,999/mo)</span>
                <span className="text-[11px] text-emerald-400 font-mono mt-1 inline-block">
                  100% Ad-Free Guarantee
                </span>
                <p className="text-[10px] text-slate-400 mt-1">Custom dedicated infrastructure</p>
              </div>
            </div>
          </div>

          {/* Overrides Table */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-slate-400 font-semibold">Active Tenant Overrides</span>
              <span className="text-xs font-mono text-slate-400">{overrides.length} Total Overrides</span>
            </div>

            {overrides.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No active photographer overrides. All tenants follow their default subscription plan entitlements.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-mono uppercase text-slate-400">
                    <tr>
                      <th className="py-3 px-4">Photographer / Studio</th>
                      <th className="py-3 px-4">Current Plan</th>
                      <th className="py-3 px-4">Override State</th>
                      <th className="py-3 px-4">Reason</th>
                      <th className="py-3 px-4">Granted By</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {overrides.map((o) => (
                      <tr key={o.photographerId} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-3.5 px-4 font-sans">
                          <span className="font-semibold text-white block">{o.photographerName}</span>
                          <span className="text-[11px] text-slate-400 font-mono">{o.photographerEmail}</span>
                        </td>
                        <td className="py-3.5 px-4 text-indigo-300">{o.plan}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              o.adsEnabled
                                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            }`}
                          >
                            {o.adsEnabled ? "ADS FORCED ON" : "ADS SUPPRESSED (AD-FREE)"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 font-sans">{o.reason || "N/A"}</td>
                        <td className="py-3.5 px-4 text-slate-400">{o.grantedBy}</td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleDeleteOverride(o.photographerId)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-colors"
                            title="Remove Override"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: AUDIT LOG */}
      {activeTab === "audit" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-semibold text-white">AdSense & Advertising Audit Trail</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Cryptographic log of all Super Admin advertising operations, toggles, ad units, and overrides.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-mono uppercase text-slate-400">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Admin Email</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Target</th>
                    <th className="py-3 px-4">Metadata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {new Date(log.timestamp).toLocaleString("en-IN")}
                      </td>
                      <td className="py-3.5 px-4 text-indigo-300">{log.adminEmail}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 text-[10px] font-bold">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-white font-sans">{log.targetName || log.targetId}</td>
                      <td className="py-3.5 px-4 text-[11px] text-slate-400 max-w-xs truncate">
                        {log.metadata ? JSON.stringify(log.metadata) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT AD UNIT MODAL */}
      {unitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-base font-semibold text-white">
                {editingUnit ? "Edit Ad Unit" : "Create New Google Ad Unit"}
              </h3>
              <button
                onClick={() => setUnitModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                ✕ Close
              </button>
            </div>

            <form onSubmit={handleSaveUnit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 font-mono mb-1">Ad Unit Name</label>
                <input
                  type="text"
                  required
                  value={unitForm.name}
                  onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })}
                  placeholder="e.g. Dashboard Top Leaderboard"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 font-mono mb-1">Internal Key</label>
                  <input
                    type="text"
                    required
                    value={unitForm.key}
                    onChange={(e) => setUnitForm({ ...unitForm, key: e.target.value })}
                    placeholder="e.g. dashboard_top"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 font-mono mb-1">
                    AdSense Ad Slot ID
                  </label>
                  <input
                    type="text"
                    required
                    value={unitForm.slotId}
                    onChange={(e) => setUnitForm({ ...unitForm, slotId: e.target.value })}
                    placeholder="e.g. 1234567890"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 font-mono mb-1">Format</label>
                  <select
                    value={unitForm.format}
                    onChange={(e) => setUnitForm({ ...unitForm, format: e.target.value as AdFormat })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="horizontal">Horizontal Banner (Leaderboard)</option>
                    <option value="rectangle">Medium Rectangle (300x250)</option>
                    <option value="vertical">Vertical Sidebar</option>
                    <option value="auto">Auto Responsive</option>
                    <option value="fluid">Fluid In-Feed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 font-mono mb-1">Placement Target</label>
                  <select
                    value={unitForm.placement}
                    onChange={(e) => setUnitForm({ ...unitForm, placement: e.target.value as AdPlacementKey })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="PHOTOGRAPHER_DASHBOARD_TOP">PHOTOGRAPHER_DASHBOARD_TOP</option>
                    <option value="PHOTOGRAPHER_DASHBOARD_BOTTOM">PHOTOGRAPHER_DASHBOARD_BOTTOM</option>
                    <option value="PUBLIC_HOME">PUBLIC_HOME</option>
                    <option value="PRICING_PAGE">PRICING_PAGE</option>
                    <option value="HELP">HELP</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 text-xs text-slate-300 font-mono cursor-pointer">
                  <input
                    type="checkbox"
                    checked={unitForm.active}
                    onChange={(e) => setUnitForm({ ...unitForm, active: e.target.checked })}
                    className="rounded border-slate-800 text-indigo-600 focus:ring-indigo-500 bg-slate-950"
                  />
                  <span>Active & Ready for Serving</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setUnitModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium shadow-lg shadow-indigo-600/20"
                >
                  {saving ? "Saving..." : "Save Ad Unit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE / EDIT PLACEMENT MODAL */}
      {placementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-base font-semibold text-white">
                {editingPlacement ? "Edit Ad Placement" : "Create New Ad Placement"}
              </h3>
              <button
                onClick={() => setPlacementModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                ✕ Close
              </button>
            </div>

            <form onSubmit={handleSavePlacement} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 font-mono mb-1">Placement Name</label>
                <input
                  type="text"
                  required
                  value={placementForm.name}
                  onChange={(e) => setPlacementForm({ ...placementForm, name: e.target.value })}
                  placeholder="e.g. Photographer Dashboard Top Banner"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 font-mono mb-1">Placement Key</label>
                  <input
                    type="text"
                    required
                    value={placementForm.placementKey}
                    onChange={(e) => setPlacementForm({ ...placementForm, placementKey: e.target.value })}
                    placeholder="e.g. PHOTOGRAPHER_DASHBOARD_TOP"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 font-mono mb-1">Page Rule Target</label>
                  <input
                    type="text"
                    required
                    value={placementForm.pageRule}
                    onChange={(e) => setPlacementForm({ ...placementForm, pageRule: e.target.value })}
                    placeholder="e.g. /dashboard"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 font-mono mb-1">Linked Ad Unit</label>
                  <select
                    value={placementForm.adUnitId}
                    onChange={(e) => setPlacementForm({ ...placementForm, adUnitId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Auto-Match by Key</option>
                    {adUnits.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.key})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 font-mono mb-1">Plan Rule</label>
                  <select
                    value={placementForm.planRule}
                    onChange={(e) => setPlacementForm({ ...placementForm, planRule: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="ADS_ENABLED_ONLY">ADS_ENABLED_ONLY (Starter Tier)</option>
                    <option value="ALL">ALL (Public / All Users)</option>
                    <option value="EXCLUDE_PAID">EXCLUDE_PAID (Free Only)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 text-xs text-slate-300 font-mono cursor-pointer">
                  <input
                    type="checkbox"
                    checked={placementForm.enabled}
                    onChange={(e) => setPlacementForm({ ...placementForm, enabled: e.target.checked })}
                    className="rounded border-slate-800 text-indigo-600 focus:ring-indigo-500 bg-slate-950"
                  />
                  <span>Enable this Placement</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setPlacementModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium shadow-lg shadow-indigo-600/20"
                >
                  {saving ? "Saving..." : "Save Placement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE PHOTOGRAPHER OVERRIDE MODAL */}
      {overrideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-base font-semibold text-white">Set Photographer Ad Override</h3>
              <button
                onClick={() => setOverrideModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                ✕ Close
              </button>
            </div>

            <form onSubmit={handleSaveOverride} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 font-mono mb-1">Select Photographer</label>
                <select
                  value={overrideForm.photographerId}
                  onChange={(e) => setOverrideForm({ ...overrideForm, photographerId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Choose Photographer --</option>
                  {photographers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.studioName || p.email}) — Plan: {p.plan || "PRO"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 font-mono mb-1">Override Action</label>
                <select
                  value={overrideForm.adsEnabled ? "true" : "false"}
                  onChange={(e) => setOverrideForm({ ...overrideForm, adsEnabled: e.target.value === "true" })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="false">Suppress Ads (Grant Ad-Free Experience)</option>
                  <option value="true">Force Show Ads</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 font-mono mb-1">Reason / Note</label>
                <input
                  type="text"
                  value={overrideForm.reason}
                  onChange={(e) => setOverrideForm({ ...overrideForm, reason: e.target.value })}
                  placeholder="e.g. VIP Partner Exemption or Courtesy Grace"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-sans"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setOverrideModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium shadow-lg shadow-indigo-600/20"
                >
                  {saving ? "Saving..." : "Save Override"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
