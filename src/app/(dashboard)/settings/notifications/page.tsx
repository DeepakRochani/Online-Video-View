"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Bell,
  Mail,
  MessageSquare,
  Sparkles,
  Save,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Smartphone,
  ExternalLink,
  ChevronLeft,
  Info,
  HelpCircle,
  Lock
} from "lucide-react";
import { PhotographerNotificationPreferences } from "@/lib/project-types";
import { WhatsAppProviderStatus } from "@/lib/whatsapp/provider";

export default function NotificationSettingsPage() {
  const [preferences, setPreferences] = useState<PhotographerNotificationPreferences>({
    photographerId: "",
    clientGalleryPublished: true,
    clientSelectionConfirmation: true,
    clientGalleryExpiring: true,
    photographerSelectionSubmitted: true,
    photographerDownloadAlert: true,
    photographerPaymentAlert: true,
    whatsappEnabled: false,
    whatsappStatus: "NOT_CONFIGURED",
    updatedAt: new Date().toISOString()
  });

  const [waStatus, setWaStatus] = useState<WhatsAppProviderStatus>({
    status: "NOT_CONFIGURED",
    provider: "NONE"
  });

  const [platformStatus, setPlatformStatus] = useState<{
    globalEnabled?: boolean;
    emergencyKillSwitch?: boolean;
    emailEnabled?: boolean;
    whatsappEnabled?: boolean;
    maintenanceNote?: string;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetch("/api/notifications/preferences")
      .then((res) => res.json())
      .then((data) => {
        if (data.preferences) setPreferences(data.preferences);
        if (data.whatsappProviderStatus) setWaStatus(data.whatsappProviderStatus);
        if (data.platformCommunicationStatus) setPlatformStatus(data.platformCommunicationStatus);
      })
      .catch((err) => {
        console.error("Failed to load preferences:", err);
        setErrorMsg("Unable to load notification settings.");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save preferences");
      }

      setPreferences(data.preferences);
      if (data.whatsappProviderStatus) setWaStatus(data.whatsappProviderStatus);
      setSuccessMsg("✓ Notification preferences saved successfully!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 mb-2 font-medium"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Studio Settings
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Bell className="w-7 h-7 text-indigo-400" /> Notification & Channels Setup
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Configure automated client alerts, selection confirmations, and WhatsApp Business messaging.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-600/20 transition transform active:scale-95"
        >
          <Save className="w-4 h-4" /> {saving ? "Saving Changes..." : "Save Preferences"}
        </button>
      </div>

      {/* Status Messages */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Platform-Wide Communication Status Banners */}
      {platformStatus && (platformStatus.globalEnabled === false || platformStatus.emergencyKillSwitch === true) && (
        <div className="p-4 rounded-xl bg-amber-950/70 border border-amber-500/40 text-amber-200 text-sm space-y-1">
          <div className="flex items-center gap-2 font-semibold text-amber-300">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <span>Platform-Wide Communication Notice</span>
          </div>
          <p className="text-xs text-amber-300/90 pl-7">
            {platformStatus.maintenanceNote || "Platform communication dispatch is currently paused for scheduled system maintenance. Notifications will queue safely until service resumes."}
          </p>
        </div>
      )}

      {platformStatus && platformStatus.globalEnabled !== false && !platformStatus.emergencyKillSwitch && platformStatus.emailEnabled === false && (
        <div className="p-3.5 rounded-xl bg-slate-900 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Email dispatch is temporarily suspended platform-wide by administrators. Your preferences are saved and will apply once email service resumes.</span>
        </div>
      )}

      {platformStatus && platformStatus.globalEnabled !== false && !platformStatus.emergencyKillSwitch && platformStatus.whatsappEnabled === false && (
        <div className="p-3.5 rounded-xl bg-slate-900 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-400 shrink-0" />
          <span>WhatsApp dispatch is currently paused at the platform level.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* Section 1: Client Automated Notifications */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-indigo-400" /> Client Communication Triggers
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Automated notifications sent directly to your couples and gallery viewers.
            </p>
          </div>

          <div className="space-y-4">
            <label className="flex items-start justify-between gap-4 p-4 rounded-xl bg-slate-950/50 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition">
              <div className="space-y-1">
                <span className="text-sm font-semibold text-slate-200">Gallery Published Notification</span>
                <p className="text-xs text-slate-400">
                  Automatically send a branded welcome email with custom domain link and access code when a wedding gallery is published.
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferences.clientGalleryPublished}
                onChange={(e) => setPreferences({ ...preferences, clientGalleryPublished: e.target.checked })}
                className="mt-1 w-4 h-4 text-indigo-600 rounded bg-slate-900 border-slate-700 focus:ring-indigo-500"
              />
            </label>

            <label className="flex items-start justify-between gap-4 p-4 rounded-xl bg-slate-950/50 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition">
              <div className="space-y-1">
                <span className="text-sm font-semibold text-slate-200">Selection Confirmation Receipt</span>
                <p className="text-xs text-slate-400">
                  Send an instant confirmation receipt to the couple when they submit their photo selections for album printing.
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferences.clientSelectionConfirmation}
                onChange={(e) => setPreferences({ ...preferences, clientSelectionConfirmation: e.target.checked })}
                className="mt-1 w-4 h-4 text-indigo-600 rounded bg-slate-900 border-slate-700 focus:ring-indigo-500"
              />
            </label>

            <label className="flex items-start justify-between gap-4 p-4 rounded-xl bg-slate-950/50 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition">
              <div className="space-y-1">
                <span className="text-sm font-semibold text-slate-200">Gallery Expiration Notice</span>
                <p className="text-xs text-slate-400">
                  Remind couples 7 days before their online gallery access expires to download their media.
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferences.clientGalleryExpiring}
                onChange={(e) => setPreferences({ ...preferences, clientGalleryExpiring: e.target.checked })}
                className="mt-1 w-4 h-4 text-indigo-600 rounded bg-slate-900 border-slate-700 focus:ring-indigo-500"
              />
            </label>
          </div>
        </div>

        {/* Section 2: Photographer Activity Alerts */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-indigo-400" /> Photographer In-App & Email Alerts
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Choose which client activities trigger alerts to your studio email.
            </p>
          </div>

          <div className="space-y-4">
            <label className="flex items-start justify-between gap-4 p-4 rounded-xl bg-slate-950/50 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition">
              <div className="space-y-1">
                <span className="text-sm font-semibold text-slate-200">Client Photo Selection Submitted</span>
                <p className="text-xs text-slate-400">
                  Receive an immediate notification with client comments whenever a couple locks and submits selections.
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferences.photographerSelectionSubmitted}
                onChange={(e) => setPreferences({ ...preferences, photographerSelectionSubmitted: e.target.checked })}
                className="mt-1 w-4 h-4 text-indigo-600 rounded bg-slate-900 border-slate-700 focus:ring-indigo-500"
              />
            </label>

            <label className="flex items-start justify-between gap-4 p-4 rounded-xl bg-slate-950/50 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition">
              <div className="space-y-1">
                <span className="text-sm font-semibold text-slate-200">Original Media Download Alerts</span>
                <p className="text-xs text-slate-400">
                  Notify me when clients download original high-resolution photo archives or videos.
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferences.photographerDownloadAlert}
                onChange={(e) => setPreferences({ ...preferences, photographerDownloadAlert: e.target.checked })}
                className="mt-1 w-4 h-4 text-indigo-600 rounded bg-slate-900 border-slate-700 focus:ring-indigo-500"
              />
            </label>

            <label className="flex items-start justify-between gap-4 p-4 rounded-xl bg-slate-950/50 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition">
              <div className="space-y-1">
                <span className="text-sm font-semibold text-slate-200">Payment & Invoice Receipts</span>
                <p className="text-xs text-slate-400">
                  Receive alerts when clients pay for extra photo downloads or studio add-on services.
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferences.photographerPaymentAlert}
                onChange={(e) => setPreferences({ ...preferences, photographerPaymentAlert: e.target.checked })}
                className="mt-1 w-4 h-4 text-indigo-600 rounded bg-slate-900 border-slate-700 focus:ring-indigo-500"
              />
            </label>
          </div>
        </div>

        {/* Section 3: Official WhatsApp Business Integration */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-400" /> WhatsApp Business Messaging Architecture
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Deliver instant gallery links and updates via official WhatsApp Business API (Meta Cloud API / Twilio).
              </p>
            </div>

            <div>
              {waStatus.status === "CONNECTED" ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> WhatsApp Connected ({waStatus.provider})
                </span>
              ) : waStatus.status === "CONFIG_REQUIRED" ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-950 text-amber-300 border border-amber-500/40">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" /> Partial Config ({waStatus.provider})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                  <Lock className="w-3.5 h-3.5 text-slate-400" /> Not Configured
                </span>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <label className="flex items-start justify-between gap-4 p-4 rounded-xl bg-slate-950/50 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition">
              <div className="space-y-1">
                <span className="text-sm font-semibold text-slate-200">Enable WhatsApp Notifications</span>
                <p className="text-xs text-slate-400">
                  When enabled and provider is configured, couples receive template-approved WhatsApp messages alongside emails.
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferences.whatsappEnabled}
                onChange={(e) => setPreferences({ ...preferences, whatsappEnabled: e.target.checked })}
                className="mt-1 w-4 h-4 text-emerald-600 rounded bg-slate-900 border-slate-700 focus:ring-emerald-500"
              />
            </label>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Studio Sender / Contact WhatsApp Number (E.164)
              </label>
              <input
                type="text"
                placeholder="+14155552671"
                value={preferences.whatsappPhoneNumber || ""}
                onChange={(e) => setPreferences({ ...preferences, whatsappPhoneNumber: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Must include country code in E.164 format (e.g. +14155552671).
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Enterprise WhatsApp Compliance
              </div>
              <p>
                To maintain 100% WhatsApp deliverability and prevent spam blocks, our platform uses pre-registered official templates (<code>gallery_published</code>, <code>selection_submitted</code>, <code>selection_confirmation</code>). No unofficial scraping or QR hacks are permitted.
              </p>
            </div>
          </div>
        </div>

        {/* Section 4: White-Label Email Customization */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" /> White-Label Email Customization
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Customize reply addresses, subject styling, and personalized footer notes for client emails.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Studio Reply-To Email
              </label>
              <input
                type="email"
                placeholder="studio@yourdomain.com"
                value={preferences.emailReplyTo || ""}
                onChange={(e) => setPreferences({ ...preferences, emailReplyTo: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Direct client replies to your studio inbox instead of the system address.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Custom Gallery Ready Subject Template
              </label>
              <input
                type="text"
                placeholder="Your wedding gallery is ready! 📸"
                value={preferences.customEmailSubjectTemplate || ""}
                onChange={(e) => setPreferences({ ...preferences, customEmailSubjectTemplate: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Leave blank to use the standard studio brand subject.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Custom Email Footer Message
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Thank you for letting us capture your once-in-a-lifetime moments! — DR Films Studio"
              value={preferences.customEmailFooter || ""}
              onChange={(e) => setPreferences({ ...preferences, customEmailFooter: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link
            href="/communications"
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
          >
            View Communications Log
          </Link>
          <button
            type="submit"
            disabled={saving || loading}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-600/20 transition"
          >
            {saving ? "Saving Changes..." : "Save Preferences"}
          </button>
        </div>
      </form>
    </div>
  );
}
