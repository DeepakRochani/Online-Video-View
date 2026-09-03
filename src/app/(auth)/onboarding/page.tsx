"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Building, 
  Globe, 
  Phone, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  Check, 
  UploadCloud,
  Palette,
  HardDrive,
  Heart,
  Calendar,
  FolderPlus,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  X
} from "lucide-react";

const COLOR_PRESETS = [
  { name: "Luxury Gold", hex: "#D4AF37", bgClass: "bg-[#D4AF37]" },
  { name: "Rose Gold", hex: "#B76E79", bgClass: "bg-[#B76E79]" },
  { name: "Champagne", hex: "#E5C158", bgClass: "bg-[#E5C158]" },
  { name: "Royal Emerald", hex: "#10B981", bgClass: "bg-[#10B981]" },
  { name: "Platinum Silver", hex: "#94A3B8", bgClass: "bg-[#94A3B8]" },
  { name: "Sunset Crimson", hex: "#E11D48", bgClass: "bg-[#E11D48]" },
];

const THEME_OPTIONS = [
  { id: "luxury", label: "Luxury Royal", desc: "Gold accents, dark crystal glass, editorial serif typography" },
  { id: "cinematic", label: "Cinematic Dark", desc: "Film grain, wide anamorphic frames, deep contrast" },
  { id: "modern", label: "Modern Minimalist", desc: "Crisp lines, understated elegance, clean whitespace" },
  { id: "editorial", label: "Vogue Editorial", desc: "High fashion layouts, bold typography, magazine style" },
];

const TEMPLATE_OPTIONS = [
  { id: "classic", label: "Classic Cinema", desc: "Hero film player with categorized ceremony playlists" },
  { id: "editorial", label: "Editorial Split", desc: "Side-by-side cinema playback with photo lookbooks" },
  { id: "royal-cinema", label: "Royal Panorama", desc: "Full-bleed immersive theater view with ambient glow" },
  { id: "minimal-grid", label: "Boutique Grid", desc: "Clean visual masonry with instant modal viewing" },
];

const DEFAULT_EVENTS = ["Haldi", "Mehndi", "Sangeet", "Wedding Ceremony", "Grand Reception"];

function OnboardingWizardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successNotice, setSuccessNotice] = useState("");

  // Step 1: Your Studio
  const [name, setName] = useState("");
  const [studioName, setStudioName] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [logoUrlLight, setLogoUrlLight] = useState("");

  // Step 2: Branding & Appearance
  const [accentColor, setAccentColor] = useState("#D4AF37");
  const [defaultTheme, setDefaultTheme] = useState("luxury");
  const [defaultTemplate, setDefaultTemplate] = useState("classic");
  const [tagline, setTagline] = useState("Fine Art Wedding Cinema & Photography");

  // Step 3: Google Drive
  const [driveConnected, setDriveConnected] = useState(false);
  const [driveEmail, setDriveEmail] = useState<string | null>(null);
  const [checkingDrive, setCheckingDrive] = useState(false);

  // Step 4: Create First Wedding
  const [coupleName, setCoupleName] = useState("");
  const [weddingName, setWeddingName] = useState("");
  const [weddingDate, setWeddingDate] = useState("");
  const [driveFolderUrl, setDriveFolderUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(["Haldi", "Wedding Ceremony", "Grand Reception"]);
  const [customEventInput, setCustomEventInput] = useState("");

  const checkDriveStatus = () => {
    setCheckingDrive(true);
    fetch("/api/drive/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.connected) {
          setDriveConnected(true);
          setDriveEmail(data.email || null);
        } else {
          setDriveConnected(false);
        }
      })
      .catch(() => {})
      .finally(() => setCheckingDrive(false));
  };

  useEffect(() => {
    // Check url search params for drive callback indicators
    if (searchParams.get("drive_connected") === "true") {
      setSuccessNotice("✓ Google Drive connected successfully!");
      setStep(3);
    }
    if (searchParams.get("drive_error")) {
      setError(`Google Drive connection error: ${searchParams.get("drive_error")}`);
    }

    fetch("/api/settings/onboarding")
      .then((res) => res.json())
      .then((data) => {
        if (data.photographer) {
          setName(data.photographer.name || "");
          setStudioName(data.photographer.studioName || "");
          setWebsite(data.photographer.website || "");
          setPhone(data.photographer.phone || "");
          setLogoUrlLight(data.photographer.logoUrlLight || "");

          if (data.photographer.branding) {
            if (data.photographer.branding.accentColor) setAccentColor(data.photographer.branding.accentColor);
            if (data.photographer.branding.defaultTheme) setDefaultTheme(data.photographer.branding.defaultTheme);
            if (data.photographer.branding.defaultTemplate) setDefaultTemplate(data.photographer.branding.defaultTemplate);
            if (data.photographer.branding.tagline) setTagline(data.photographer.branding.tagline);
          }

          if (data.photographer.googleDriveConnected) {
            setDriveConnected(true);
            setDriveEmail(data.photographer.googleDriveEmail || null);
          }

          if (data.photographer.onboardingStep && !searchParams.get("drive_connected")) {
            setStep(data.photographer.onboardingStep);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        checkDriveStatus();
      });
  }, [searchParams]);

  const saveProgress = async (nextStep: number, extraData: Record<string, any> = {}) => {
    setSaving(true);
    setError("");
    setSuccessNotice("");

    try {
      const payload = {
        name: name.trim(),
        studioName: studioName.trim() || name.trim(),
        website: website.trim(),
        phone: phone.trim(),
        logoUrlLight: logoUrlLight.trim(),
        branding: {
          accentColor,
          defaultTheme,
          defaultTemplate,
          tagline: tagline.trim(),
          logoUrlLight: logoUrlLight.trim(),
          website: website.trim(),
          phone: phone.trim(),
          studioName: studioName.trim() || name.trim(),
        },
        onboardingStep: nextStep,
        ...extraData,
      };

      const res = await fetch("/api/settings/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save onboarding progress");

      setStep(nextStep);
      return data;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save progress");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studioName.trim() && !name.trim()) {
      setError("Please provide your studio or photographer name.");
      return;
    }
    await saveProgress(2);
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveProgress(3);
  };

  const handleDisconnectDrive = async () => {
    setCheckingDrive(true);
    try {
      await fetch("/api/drive/disconnect", { method: "POST" });
      setDriveConnected(false);
      setDriveEmail(null);
      setSuccessNotice("Google Drive disconnected.");
    } catch {
      setError("Failed to disconnect Google Drive");
    } finally {
      setCheckingDrive(false);
    }
  };

  const toggleEvent = (evt: string) => {
    if (selectedEvents.includes(evt)) {
      setSelectedEvents(selectedEvents.filter((e) => e !== evt));
    } else {
      setSelectedEvents([...selectedEvents, evt]);
    }
  };

  const addCustomEvent = () => {
    if (customEventInput.trim() && !selectedEvents.includes(customEventInput.trim())) {
      setSelectedEvents([...selectedEvents, customEventInput.trim()]);
      setCustomEventInput("");
    }
  };

  const handleStep4Finish = async (skipWedding = false) => {
    const weddingData = (!skipWedding && coupleName.trim() && weddingDate)
      ? {
          coupleName: coupleName.trim(),
          weddingName: weddingName.trim() || `${coupleName.trim()}'s Wedding`,
          weddingDate,
          driveFolderUrl: driveFolderUrl.trim(),
          events: selectedEvents,
        }
      : undefined;

    const result = await saveProgress(4, {
      onboardingCompleted: true,
      firstWedding: weddingData,
    });

    if (result) {
      router.push("/dashboard");
      router.refresh();
    }
  };

  if (loading) {
    return (
      <div className="glass-panel p-10 text-center text-slate-300">
        <div className="loader-spin border-amber-400 border-t-transparent w-8 h-8 mx-auto mb-4" />
        <p className="text-sm font-serif">Initializing your luxury studio experience...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl glass-panel p-6 sm:p-10 border border-amber-400/20 shadow-2xl relative overflow-hidden my-6">
      {/* Ambient Lighting */}
      <div className="absolute -top-32 -left-32 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* 4-Step Progress Indicator */}
      <div className="flex items-center justify-between max-w-xl mx-auto mb-8 relative">
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-800 -translate-y-1/2 z-0" />
        {[
          { num: 1, label: "Studio", icon: Building },
          { num: 2, label: "Branding", icon: Palette },
          { num: 3, label: "Google Drive", icon: HardDrive },
          { num: 4, label: "First Wedding", icon: Heart },
        ].map((s) => (
          <div key={s.num} className="relative z-10 flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                step > s.num
                  ? "bg-amber-400 text-black shadow-lg shadow-amber-400/20"
                  : step === s.num
                  ? "bg-gradient-to-tr from-amber-500 to-amber-300 text-black ring-4 ring-amber-400/20 font-bold"
                  : "bg-slate-900 border border-slate-700 text-slate-500"
              }`}
            >
              {step > s.num ? <Check className="w-5 h-5 stroke-[2.5]" /> : s.num}
            </div>
            <span className={`text-[11px] mt-1.5 font-medium ${step >= s.num ? "text-amber-300" : "text-slate-500"}`}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successNotice && (
        <div className="mb-6 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* STEP 1: YOUR STUDIO */}
      {step === 1 && (
        <div className="animate-in fade-in zoom-in-95 duration-300">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-serif font-bold text-white tracking-tight">
              Step 1: Your Studio Profile
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Configure your studio brand details. These appear on client galleries, invitations, and custom links.
            </p>
          </div>

          <form onSubmit={handleStep1Submit} className="space-y-4 max-w-lg mx-auto">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Studio / Business Name *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={studioName}
                  onChange={(e) => setStudioName(e.target.value)}
                  placeholder="e.g. DR Films Wedding Cinema"
                  required
                  autoFocus
                  className="glass-input pl-10 pr-4 py-2.5 text-sm text-white w-full"
                />
                <Building className="w-4 h-4 text-amber-400/60 absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Lead Photographer / Director Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. David Ross"
                  className="glass-input pl-10 pr-4 py-2.5 text-sm text-white w-full"
                />
                <Sparkles className="w-4 h-4 text-amber-400/60 absolute left-3.5 top-3" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Studio Website
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://drfilms.com"
                    className="glass-input pl-10 pr-4 py-2.5 text-sm text-white w-full"
                  />
                  <Globe className="w-4 h-4 text-amber-400/60 absolute left-3.5 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  WhatsApp / Phone
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="glass-input pl-10 pr-4 py-2.5 text-sm text-white w-full"
                  />
                  <Phone className="w-4 h-4 text-amber-400/60 absolute left-3.5 top-3" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Studio Logo URL (PNG/SVG with transparent background)
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={logoUrlLight}
                  onChange={(e) => setLogoUrlLight(e.target.value)}
                  placeholder="https://drfilms.com/logo.png"
                  className="glass-input pl-10 pr-4 py-2.5 text-sm text-white w-full"
                />
                <UploadCloud className="w-4 h-4 text-amber-400/60 absolute left-3.5 top-3" />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                You can also customize your high-resolution logos in Studio Settings later.
              </p>
            </div>

            <div className="pt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Skip & Complete Later
              </button>

              <button
                type="submit"
                disabled={saving || (!studioName && !name)}
                className="accent-button py-2.5 px-6 text-sm font-bold flex items-center gap-2 rounded-xl shadow-lg cursor-pointer"
              >
                {saving ? "Saving..." : "Continue to Branding"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 2: BRANDING & APPEARANCE */}
      {step === 2 && (
        <div className="animate-in fade-in zoom-in-95 duration-300">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-serif font-bold text-white tracking-tight">
              Step 2: Signature Branding
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Set your gallery aesthetics, primary color palette, and default cinema template.
            </p>
          </div>

          <form onSubmit={handleStep2Submit} className="space-y-5 max-w-lg mx-auto">
            {/* Color Presets */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Primary Brand Accent Color
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setAccentColor(c.hex)}
                    className={`p-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      accentColor.toLowerCase() === c.hex.toLowerCase()
                        ? "border-amber-400 bg-amber-400/10 scale-105 shadow-md"
                        : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full ${c.bgClass} shadow`} />
                    <span className="text-[10px] text-slate-300 truncate w-full text-center">{c.name}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                />
                <input
                  type="text"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="bg-transparent text-sm text-white font-mono uppercase focus:outline-none w-24"
                />
                <span className="text-xs text-slate-400">Custom Brand Hex</span>
              </div>
            </div>

            {/* Gallery Theme */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Default Gallery Theme
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {THEME_OPTIONS.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setDefaultTheme(t.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      defaultTheme === t.id
                        ? "bg-amber-400/10 border-amber-400 shadow-md"
                        : "bg-slate-900/40 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{t.label}</span>
                      {defaultTheme === t.id && <Check className="w-3.5 h-3.5 text-amber-400" />}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">{t.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Gallery Template */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Default Gallery Layout
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {TEMPLATE_OPTIONS.map((tpl) => (
                  <div
                    key={tpl.id}
                    onClick={() => setDefaultTemplate(tpl.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      defaultTemplate === tpl.id
                        ? "bg-amber-400/10 border-amber-400 shadow-md"
                        : "bg-slate-900/40 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{tpl.label}</span>
                      {defaultTemplate === tpl.id && <Check className="w-3.5 h-3.5 text-amber-400" />}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">{tpl.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tagline */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Studio Tagline / Subtitle
              </label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="e.g. Fine Art Wedding Cinema & Photography"
                className="glass-input px-3.5 py-2.5 text-sm text-white w-full"
              />
            </div>

            <div className="pt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Back to Studio
              </button>

              <button
                type="submit"
                disabled={saving}
                className="accent-button py-2.5 px-6 text-sm font-bold flex items-center gap-2 rounded-xl shadow-lg cursor-pointer"
              >
                {saving ? "Saving..." : "Continue to Google Drive"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 3: GOOGLE DRIVE INTEGRATION */}
      {step === 3 && (
        <div className="animate-in fade-in zoom-in-95 duration-300 max-w-lg mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-serif font-bold text-white tracking-tight">
              Step 3: Connect Google Drive
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              DR Films streams directly from your Google Drive without uploading files to our servers.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 mb-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shrink-0 text-amber-400">
                <HardDrive className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h4 className="text-sm font-bold text-white">Direct Drive Streaming Engine</h4>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  Keep 100% ownership of your original video and photo assets. Paste your folder links and we automatically categorize Haldi, Mehndi, Wedding & Reception.
                </p>
              </div>
            </div>

            {/* Connection Card */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${driveConnected ? "bg-emerald-400 shadow-lg shadow-emerald-400/50" : "bg-slate-600"}`} />
                <div>
                  <div className="text-xs font-semibold text-white">
                    {driveConnected ? "Google Drive Connected" : "Not Connected Yet"}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {driveConnected ? (driveEmail || "Authorized with read-only scopes") : "Connect to access your private Drive folders"}
                  </div>
                </div>
              </div>

              {driveConnected ? (
                <button
                  type="button"
                  onClick={handleDisconnectDrive}
                  disabled={checkingDrive}
                  className="text-xs text-red-400 hover:text-red-300 py-1.5 px-3 rounded-lg border border-red-500/20 hover:bg-red-500/10 transition-colors cursor-pointer"
                >
                  Disconnect
                </button>
              ) : (
                <a
                  href="/api/drive/connect?returnTo=/onboarding"
                  className="accent-button text-xs py-2 px-4 font-bold rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <HardDrive className="w-3.5 h-3.5" />
                  <span>Connect Drive</span>
                </a>
              )}
            </div>

            <div className="text-[11px] text-slate-500 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Read-only permissions requested. Your files are never moved or deleted.</span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Back to Branding
            </button>

            <button
              type="button"
              onClick={() => saveProgress(4)}
              disabled={saving}
              className="accent-button py-2.5 px-6 text-sm font-bold flex items-center gap-2 rounded-xl shadow-lg cursor-pointer"
            >
              {saving ? "Saving..." : "Continue to First Wedding"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: CREATE FIRST WEDDING */}
      {step === 4 && (
        <div className="animate-in fade-in zoom-in-95 duration-300 max-w-lg mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-serif font-bold text-white tracking-tight">
              Step 4: Create Your First Wedding
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Add your first wedding gallery or skip to jump straight into your studio dashboard.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Couple Names *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={coupleName}
                  onChange={(e) => setCoupleName(e.target.value)}
                  placeholder="e.g. Ananya & Kabir"
                  className="glass-input pl-10 pr-4 py-2.5 text-sm text-white w-full"
                />
                <Heart className="w-4 h-4 text-amber-400/60 absolute left-3.5 top-3" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Wedding Date *
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={weddingDate}
                    onChange={(e) => setWeddingDate(e.target.value)}
                    className="glass-input pl-10 pr-4 py-2.5 text-sm text-white w-full [color-scheme:dark]"
                  />
                  <Calendar className="w-4 h-4 text-amber-400/60 absolute left-3.5 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Wedding Title / Subtitle
                </label>
                <input
                  type="text"
                  value={weddingName}
                  onChange={(e) => setWeddingName(e.target.value)}
                  placeholder="e.g. The Udaipur Royal Celebration"
                  className="glass-input px-3.5 py-2.5 text-sm text-white w-full"
                />
              </div>
            </div>

            {/* Events Tag Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Ceremony & Event Categories
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {DEFAULT_EVENTS.map((evt) => (
                  <button
                    key={evt}
                    type="button"
                    onClick={() => toggleEvent(evt)}
                    className={`text-xs px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                      selectedEvents.includes(evt)
                        ? "bg-amber-400 text-black font-semibold border-amber-400"
                        : "bg-slate-900/60 text-slate-300 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    {selectedEvents.includes(evt) && <Check className="w-3 h-3 stroke-[2.5]" />}
                    <span>{evt}</span>
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={customEventInput}
                  onChange={(e) => setCustomEventInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomEvent())}
                  placeholder="Add custom event (e.g. Ring Ceremony)"
                  className="glass-input px-3 py-1.5 text-xs text-white flex-1"
                />
                <button
                  type="button"
                  onClick={addCustomEvent}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white rounded-xl cursor-pointer"
                >
                  + Add
                </button>
              </div>
            </div>

            {/* Drive Link */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Google Drive Folder Link (Optional)
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={driveFolderUrl}
                  onChange={(e) => setDriveFolderUrl(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/..."
                  className="glass-input pl-10 pr-4 py-2.5 text-sm text-white w-full"
                />
                <FolderPlus className="w-4 h-4 text-amber-400/60 absolute left-3.5 top-3" />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                You can also paste and sync Drive folders later from the wedding project editor.
              </p>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => handleStep4Finish(true)}
                disabled={saving}
                className="w-full sm:w-auto text-xs text-slate-400 hover:text-white py-2 px-3 transition-colors cursor-pointer"
              >
                Skip & Launch Dashboard
              </button>

              <button
                type="button"
                onClick={() => handleStep4Finish(false)}
                disabled={saving || !coupleName || !weddingDate}
                className="w-full sm:w-auto accent-button py-2.5 px-6 text-sm font-bold flex items-center justify-center gap-2 rounded-xl shadow-lg cursor-pointer"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Creating Wedding...</span>
                  </>
                ) : (
                  <>
                    <span>Create Wedding & Launch</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 wedding-bg">
      <Suspense fallback={<div className="glass-panel p-8 text-center text-slate-400">Loading onboarding...</div>}>
        <OnboardingWizardContent />
      </Suspense>
    </div>
  );
}
