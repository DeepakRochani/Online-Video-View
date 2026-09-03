"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Settings,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Sparkles,
  ExternalLink,
  RefreshCw,
  Server,
  Globe,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Clock,
  Archive,
  Save
} from "lucide-react";
import { PlatformGalleryLifecycleSettings } from "@/lib/project-types";

interface PlatformSettingsData {
  authentication: {
    googleSignInEnabled: boolean;
    googleClientIdConfigured: boolean;
    googleClientIdDisplay: string;
    googleClientSecretConfigured: boolean;
    adminPortalAuth: string;
    photographerPortalAuth: string;
    callbackUrl: string;
  };
  adsense: {
    publisherId: string;
    publisherIdConfigured: boolean;
    platformAdsEnabled: boolean;
    testMode: boolean;
    autoAdsEnabled: boolean;
    clientGalleryAdsEnabled: boolean;
    activePlacementsCount: number;
  };
  system: {
    appUrl: string;
    nodeEnv: string;
    timestamp: string;
  };
}

export default function SuperAdminSettingsPage() {
  const [data, setData] = useState<PlatformSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedCallback, setCopiedCallback] = useState(false);

  // Gallery Lifecycle Settings
  const [lifecycleSettings, setLifecycleSettings] = useState<PlatformGalleryLifecycleSettings | null>(null);
  const [savingLifecycle, setSavingLifecycle] = useState(false);
  const [lifecycleToast, setLifecycleToast] = useState<string | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const [res, lifecycleRes] = await Promise.all([
        fetch("/api/admin/settings"),
        fetch("/api/admin/lifecycle-settings"),
      ]);

      if (res.ok) {
        const json = await res.json();
        setData(json);
      }

      if (lifecycleRes.ok) {
        const lJson = await lifecycleRes.json();
        if (lJson.settings) {
          setLifecycleSettings(lJson.settings);
        }
      }
    } catch (err) {
      console.error("Failed to load admin settings", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLifecycle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lifecycleSettings || savingLifecycle) return;
    setSavingLifecycle(true);

    try {
      const res = await fetch("/api/admin/lifecycle-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lifecycleSettings),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to update lifecycle settings");
      setLifecycleToast("✓ Platform Gallery Lifecycle settings saved");
      setTimeout(() => setLifecycleToast(null), 3000);
    } catch (err: any) {
      alert(err.message || "Failed to save lifecycle settings");
    } finally {
      setSavingLifecycle(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCallback(true);
    setTimeout(() => setCopiedCallback(false), 2500);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Platform Configuration</h1>
              <p className="text-sm text-slate-400">
                Core infrastructure status, authentication gateways, and advertising controls.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchSettings}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/60 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Status</span>
        </button>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Grid of Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Section 1: Authentication & Identity */}
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-6 backdrop-blur-md space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-white">Authentication Architecture</h2>
                    <p className="text-xs text-slate-400">Photographer vs Super Admin portal boundaries</p>
                  </div>
                </div>
                {data.authentication.googleSignInEnabled ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Google OAuth Live
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Google OAuth Inactive
                  </span>
                )}
              </div>

              <div className="space-y-4">
                {/* Super Admin Isolation Notice */}
                <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 flex items-start gap-3">
                  <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0 text-purple-400" />
                  <div>
                    <span className="font-semibold text-purple-200">Strict Separation Enforced:</span>{" "}
                    Super Admin portal (<code className="font-mono text-purple-300">/admin/login</code>) allows{" "}
                    <strong>Email + Password Only</strong>. Google Sign-In is restricted to photographers and can NEVER grant Super Admin privileges.
                  </div>
                </div>

                {/* Status Table */}
                <div className="divide-y divide-slate-800/60 text-xs">
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-400">Photographer Google Sign-In</span>
                    <span className={`font-mono font-medium ${data.authentication.googleSignInEnabled ? "text-emerald-400" : "text-slate-400"}`}>
                      {data.authentication.googleSignInEnabled ? "ENABLED" : "DISABLED"}
                    </span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-400">Google Client ID</span>
                    <span className="font-mono text-slate-300">
                      {data.authentication.googleClientIdDisplay}
                    </span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-400">Google Client Secret</span>
                    <span className="font-mono text-slate-300">
                      {data.authentication.googleClientSecretConfigured ? "Configured & Masked (Never Exposed)" : "Not Configured"}
                    </span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-400">Super Admin Authentication</span>
                    <span className="font-mono text-amber-400 font-medium">
                      Email + Password Only
                    </span>
                  </div>
                </div>

                {/* Authorized Callback URL */}
                <div className="pt-2">
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Authorized Redirect URI for Google Cloud Console:
                  </label>
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                    <code className="text-xs text-slate-300 font-mono flex-1 overflow-x-auto select-all">
                      {data.authentication.callbackUrl}
                    </code>
                    <button
                      onClick={() => copyToClipboard(data.authentication.callbackUrl)}
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title="Copy URL"
                    >
                      {copiedCallback ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Google AdSense Platform Status */}
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-6 backdrop-blur-md space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-white">Google AdSense Status</h2>
                    <p className="text-xs text-slate-400">Monetization, ad delivery & gallery ad policies</p>
                  </div>
                </div>
                <Link
                  href="/admin/adsense"
                  className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors font-medium"
                >
                  <span>Manage AdSense</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="space-y-4">
                {/* Client Gallery Ads Policy Notice */}
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs flex items-start gap-3">
                  <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-400" />
                  <div className="text-slate-300">
                    <span className="font-semibold text-white">Wedding Gallery Quality Guarantee:</span>{" "}
                    Client galleries remain 100% ad-free by default (
                    <span className="font-mono text-emerald-400">clientGalleryAdsEnabled: {data.adsense.clientGalleryAdsEnabled ? "true" : "false"}</span>
                    ). Ads are strictly suppressed across all photographer dashboards, admin portals, and auth pages.
                  </div>
                </div>

                {/* Status Table */}
                <div className="divide-y divide-slate-800/60 text-xs">
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-400">Publisher ID</span>
                    <span className="font-mono text-slate-200">
                      {data.adsense.publisherId || "Not configured"}
                    </span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-400">Platform Ads Master Switch</span>
                    <span className={`font-mono font-medium ${data.adsense.platformAdsEnabled ? "text-emerald-400" : "text-rose-400"}`}>
                      {data.adsense.platformAdsEnabled ? "ENABLED" : "DISABLED"}
                    </span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-400">Test Mode</span>
                    <span className="font-mono text-slate-300">
                      {data.adsense.testMode ? "Active (Sample Ads)" : "Inactive (Live Production)"}
                    </span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-400">Auto Ads</span>
                    <span className="font-mono text-slate-300">
                      {data.adsense.autoAdsEnabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-400">Active Ad Placements</span>
                    <span className="font-mono text-amber-400">
                      {data.adsense.activePlacementsCount} active placements
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Gallery Lifecycle & Retention Policies */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-6 backdrop-blur-md space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">Gallery Lifecycle & Retention Policies</h2>
                  <p className="text-xs text-slate-400">Automated expiration, reminder schedules, and archival policies</p>
                </div>
              </div>

              {lifecycleToast && (
                <span className="text-xs text-emerald-400 font-medium animate-in fade-in flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  {lifecycleToast}
                </span>
              )}
            </div>

            {lifecycleSettings && (
              <form onSubmit={handleSaveLifecycle} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Default Lifespan */}
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                    <label className="text-xs font-semibold text-slate-200 flex items-center justify-between">
                      <span>Default Gallery Lifespan (Days)</span>
                      <span className="text-amber-400 font-mono">{lifecycleSettings.defaultLifespanDays} days</span>
                    </label>
                    <p className="text-[11px] text-slate-400">
                      Standard validity period assigned when photographers publish new client galleries.
                    </p>
                    <input
                      type="number"
                      min={1}
                      max={3650}
                      value={lifecycleSettings.defaultLifespanDays}
                      onChange={(e) =>
                        setLifecycleSettings({
                          ...lifecycleSettings,
                          defaultLifespanDays: parseInt(e.target.value) || 90,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* Warning Notification Threshold */}
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                    <label className="text-xs font-semibold text-slate-200 flex items-center justify-between">
                      <span>Expiring Soon Warning (Days)</span>
                      <span className="text-amber-400 font-mono">{lifecycleSettings.warningThresholdDays} days before</span>
                    </label>
                    <p className="text-[11px] text-slate-400">
                      Days before expiration when photographer & client alert badges are triggered.
                    </p>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={lifecycleSettings.warningThresholdDays}
                      onChange={(e) =>
                        setLifecycleSettings({
                          ...lifecycleSettings,
                          warningThresholdDays: parseInt(e.target.value) || 7,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* Auto-Archive Policy */}
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                        <Archive className="w-4 h-4 text-purple-400" />
                        <span>Auto-Archive Expired Galleries</span>
                      </label>
                      <input
                        type="checkbox"
                        checked={lifecycleSettings.autoArchiveAfterExpiration}
                        onChange={(e) =>
                          setLifecycleSettings({
                            ...lifecycleSettings,
                            autoArchiveAfterExpiration: e.target.checked,
                          })
                        }
                        className="w-4 h-4 accent-amber-400 cursor-pointer"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Automatically moves galleries to archive status after expiration.
                    </p>
                    {lifecycleSettings.autoArchiveAfterExpiration && (
                      <div className="pt-1">
                        <label className="text-[11px] text-slate-300 font-medium block mb-1">
                          Days after expiration before archiving:
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={365}
                          value={lifecycleSettings.autoArchiveDays}
                          onChange={(e) =>
                            setLifecycleSettings({
                              ...lifecycleSettings,
                              autoArchiveDays: parseInt(e.target.value) || 30,
                            })
                          }
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    )}
                  </div>

                  {/* Auto-Delete Policy */}
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-400" />
                        <span>Auto-Soft Delete Archived</span>
                      </label>
                      <input
                        type="checkbox"
                        checked={lifecycleSettings.autoDeleteAfterArchived}
                        onChange={(e) =>
                          setLifecycleSettings({
                            ...lifecycleSettings,
                            autoDeleteAfterArchived: e.target.checked,
                          })
                        }
                        className="w-4 h-4 accent-amber-400 cursor-pointer"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Soft-deletes archived galleries after extended retention. Google Drive files are never deleted.
                    </p>
                    {lifecycleSettings.autoDeleteAfterArchived && (
                      <div className="pt-1">
                        <label className="text-[11px] text-slate-300 font-medium block mb-1">
                          Days after archiving before soft-delete:
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={730}
                          value={lifecycleSettings.autoDeleteDays}
                          onChange={(e) =>
                            setLifecycleSettings({
                              ...lifecycleSettings,
                              autoDeleteDays: parseInt(e.target.value) || 180,
                            })
                          }
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Drive Preservation Guarantee Callout */}
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3 text-xs text-amber-200">
                  <ShieldCheck className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  <span>
                    <strong>Google Drive Safety Guarantee:</strong> Lifecycle operations (expiration, archival, soft-deletion) only affect platform streaming and client access. Google Drive media files are preserved permanently.
                  </span>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={savingLifecycle}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold transition-all shadow-lg shadow-amber-400/20 cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingLifecycle ? "Saving Policies..." : "Save Lifecycle Policies"}</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Section 4: Server & Infrastructure Environment */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-6 backdrop-blur-md space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">System Runtime & Environment</h2>
                <p className="text-xs text-slate-400">Deployment and endpoint parameters</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-500 uppercase tracking-wider font-mono text-[10px] block mb-1">
                  Canonical App URL
                </span>
                <span className="text-slate-200 font-mono font-medium truncate block">
                  {data.system.appUrl}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-500 uppercase tracking-wider font-mono text-[10px] block mb-1">
                  Node Environment
                </span>
                <span className="text-emerald-400 font-mono font-medium block">
                  {data.system.nodeEnv}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-500 uppercase tracking-wider font-mono text-[10px] block mb-1">
                  Server Time (UTC)
                </span>
                <span className="text-slate-300 font-mono block">
                  {new Date(data.system.timestamp).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
