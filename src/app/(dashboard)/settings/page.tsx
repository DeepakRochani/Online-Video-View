"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  Building2, 
  Sparkles, 
  Save, 
  Upload, 
  Check, 
  Globe, 
  Mail, 
  Phone, 
  Palette, 
  Layout, 
  ShieldCheck, 
  AlertCircle,
  Eye,
  Camera,
  Layers,
  Share2,
  Heart,
  ExternalLink,
  Crown,
  CreditCard,
  User,
  Lock,
  Users,
  Receipt,
  CheckCircle2,
  ArrowUpRight,
  Zap,
  HardDrive,
  RefreshCw,
  Trash2,
  Plus,
  Copy,
  Info,
  AlertTriangle
} from "lucide-react";
import { StudioSettings, GalleryTemplate, GalleryTheme, SubscriptionPlanTier, InvoiceRecord, TeamMember, DomainMapping } from "@/lib/project-types";
import { SAAS_PLANS } from "@/lib/plans";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

type SettingsTab = "branding" | "profile" | "plans" | "invoices" | "domains" | "team" | "security";

function StudioSettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as SettingsTab) || "branding";
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState<"light" | "dark" | null>(null);

  // Billing & Subscription state
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  // Invoices, Team & Custom Domains
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [newTeamMember, setNewTeamMember] = useState({ name: "", email: "", role: "editor" });
  const [addingMember, setAddingMember] = useState(false);

  // Custom Domains state
  const [domains, setDomains] = useState<DomainMapping[]>([]);
  const [domainsGlobalEnabled, setDomainsGlobalEnabled] = useState<boolean>(true);
  const [cnameTarget, setCnameTarget] = useState<string>("cname.drfilms.com");
  const [newDomainInput, setNewDomainInput] = useState("");
  const [addingDomain, setAddingDomain] = useState(false);
  const [verifyingDomainId, setVerifyingDomainId] = useState<string | null>(null);
  const [domainActionLoading, setDomainActionLoading] = useState<string | null>(null);
  const [selectedDomainForInstructions, setSelectedDomainForInstructions] = useState<DomainMapping | null>(null);

  // Profile & Security state
  const [profile, setProfile] = useState<{
    name: string;
    email: string;
    businessName: string;
    phone: string;
    avatarUrl: string;
    googleId?: string;
    googleEmail?: string;
    googleAvatarUrl?: string;
    authProviders?: string[];
  }>({
    name: "DR Films Studio",
    email: "drfilms@weddingcinema.com",
    businessName: "DR Films Wedding Cinema",
    phone: "+91 98765 43210",
    avatarUrl: "",
    authProviders: ["email"],
  });
  const [passwordState, setPasswordState] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [settings, setSettings] = useState<StudioSettings>({
    studioName: "DR Films Wedding Cinema",
    tagline: "Fine Art Wedding Cinema & Photography",
    logoUrlLight: "",
    logoUrlDark: "",
    website: "",
    email: "",
    phone: "",
    whatsapp: "",
    instagram: "",
    facebook: "",
    footerText: "Crafted with love for your lifelong memories.",
    defaultTemplate: "classic",
    defaultTheme: "luxury",
    defaultAccentColor: "#D4AF37",
    whiteLabelEnabled: true,
    cnameTarget: "cname.drfilms.com",
  });

  useEffect(() => {
    const tabParam = searchParams.get("tab") as SettingsTab;
    if (tabParam && ["branding", "profile", "plans", "invoices", "domains", "team", "security"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  useEffect(() => {
    Promise.all([
      fetch("/api/settings/studio").then(res => res.json()),
      fetch("/api/billing/subscription").then(res => res.json()),
      fetch("/api/billing/invoices").then(res => res.json()),
      fetch("/api/settings/profile").then(res => res.json()),
      fetch("/api/settings/team").then(res => res.json()),
      fetch("/api/domains").then(res => res.json()),
    ])
      .then(([studioRes, subRes, invRes, profRes, teamRes, domRes]) => {
        if (studioRes.settings) setSettings(studioRes.settings);
        if (subRes) setSubscriptionData(subRes);
        if (invRes.invoices) setInvoices(invRes.invoices);
        if (profRes.profile) setProfile(profRes.profile);
        if (teamRes.members) setTeamMembers(teamRes.members);
        if (domRes?.domains) setDomains(domRes.domains);
        if (domRes?.globalEnabled !== undefined) setDomainsGlobalEnabled(domRes.globalEnabled);
        if (domRes?.cnameTarget) setCnameTarget(domRes.cnameTarget);
      })
      .catch(() => {
        setErrorMsg("Failed to load some settings data");
      })
      .finally(() => setLoading(false));
  }, []);

  const loadDomains = async () => {
    try {
      const res = await fetch("/api/domains");
      const data = await res.json();
      if (data.domains) setDomains(data.domains);
      if (data.globalEnabled !== undefined) setDomainsGlobalEnabled(data.globalEnabled);
      if (data.cnameTarget) setCnameTarget(data.cnameTarget);
    } catch {}
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomainInput.trim()) return;
    setAddingDomain(true);
    try {
      const res = await fetch("/api/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: newDomainInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.upgradeRequired) {
          showToast(data.message || "Custom domains are available on Pro and Studio plans. Upgrade to connect your domain.", true);
        } else {
          showToast(data.message || data.error || "Failed to add domain", true);
        }
        return;
      }
      setNewDomainInput("");
      showToast("Domain connected successfully! Configure your DNS records to activate.");
      await loadDomains();
      if (data.domain) setSelectedDomainForInstructions(data.domain);
    } catch {
      showToast("Network error adding custom domain", true);
    } finally {
      setAddingDomain(false);
    }
  };

  const handleVerifyDomain = async (domainId: string) => {
    setVerifyingDomainId(domainId);
    try {
      const res = await fetch(`/api/domains/${domainId}/verify`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || "Domain DNS verified and activated successfully!");
      } else {
        showToast(data.message || data.error || "DNS verification pending. Changes can take a few minutes to propagate.", true);
      }
      await loadDomains();
    } catch {
      showToast("Network error during DNS verification", true);
    } finally {
      setVerifyingDomainId(null);
    }
  };

  const handleSetPrimary = async (domainId: string) => {
    setDomainActionLoading(domainId);
    try {
      const res = await fetch(`/api/domains/${domainId}/primary`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("Primary domain updated successfully!");
        await loadDomains();
      } else {
        showToast(data.error || "Failed to set primary domain", true);
      }
    } catch {
      showToast("Network error setting primary domain", true);
    } finally {
      setDomainActionLoading(null);
    }
  };

  const handleDeleteDomain = async (domainId: string) => {
    if (!confirm("Are you sure you want to disconnect this custom domain? Your existing client galleries will remain 100% safe and accessible via the platform URL.")) return;
    setDomainActionLoading(domainId);
    try {
      const res = await fetch(`/api/domains/${domainId}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("Domain disconnected successfully.");
        await loadDomains();
        if (selectedDomainForInstructions?.id === domainId) {
          setSelectedDomainForInstructions(null);
        }
      } else {
        showToast(data.error || "Failed to delete domain", true);
      }
    } catch {
      showToast("Network error deleting domain", true);
    } finally {
      setDomainActionLoading(null);
    }
  };

  const showToast = (msg: string, isError: boolean = false) => {
    if (isError) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(""), 5000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(""), 4000);
    }
  };

  const handleSaveBranding = async (e?: React.FormEvent, customPayload?: StudioSettings) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");

    const payload = customPayload || settings;

    try {
      const res = await fetch("/api/settings/studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save settings");

      setSettings(data.settings);
      showToast("Studio branding and defaults saved successfully!");
    } catch (err: any) {
      showToast(err.message || "Failed to save settings", true);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save profile");
      showToast("Profile details updated successfully!");
    } catch (err: any) {
      showToast(err.message || "Failed to save profile", true);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordState.newPassword !== passwordState.confirmPassword) {
      showToast("New passwords do not match", true);
      return;
    }
    if (passwordState.newPassword.length < 6) {
      showToast("Password must be at least 6 characters", true);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordState.currentPassword,
          newPassword: passwordState.newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to change password");
      showToast("Password updated successfully!");
      setPasswordState({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      showToast(err.message || "Failed to change password", true);
    } finally {
      setSaving(false);
    }
  };

  const handleAddTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingMember(true);
    try {
      const res = await fetch("/api/settings/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTeamMember),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add team member");
      setTeamMembers([...teamMembers, data.member]);
      setNewTeamMember({ name: "", email: "", role: "editor" });
      showToast("Team member invited successfully!");
    } catch (err: any) {
      showToast(err.message || "Failed to invite team member", true);
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveTeamMember = async (id: string) => {
    if (!confirm("Are you sure you want to remove this team member?")) return;
    try {
      const res = await fetch(`/api/settings/team?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove member");
      setTeamMembers(teamMembers.filter(m => m.id !== id));
      showToast("Team member removed");
    } catch (err: any) {
      showToast(err.message || "Failed to remove member", true);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, mode: "light" | "dark") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Please select a valid image file (PNG, JPG, SVG)", true);
      return;
    }

    setUploadingLogo(mode);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", `logo-${mode}`);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Logo upload failed");

      const newUrl = data.url || data.filePath;
      const updated = {
        ...settings,
        [mode === "light" ? "logoUrlLight" : "logoUrlDark"]: newUrl,
      };
      setSettings(updated);
      await handleSaveBranding(undefined, updated);
      showToast(`${mode === "light" ? "Light" : "Dark"} logo uploaded and updated!`);
    } catch (err: any) {
      showToast(err.message || "Failed to upload logo", true);
    } finally {
      setUploadingLogo(null);
    }
  };

  const handlePlanUpgrade = async (targetPlan: SubscriptionPlanTier) => {
    setProcessingPlan(targetPlan);
    try {
      const createRes = await fetch("/api/billing/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: targetPlan, billingCycle }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error || "Failed to initialize subscription");

      if (createData.isFree) {
        showToast(`Successfully activated ${targetPlan} Plan!`);
        const [newSub, newInv] = await Promise.all([
          fetch("/api/billing/subscription").then(r => r.json()),
          fetch("/api/billing/invoices").then(r => r.json()),
        ]);
        setSubscriptionData(newSub);
        if (newInv.invoices) setInvoices(newInv.invoices);
        return;
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || createData.keyId,
        amount: createData.amount,
        currency: "INR",
        name: "DR Films Platform",
        description: `Upgrade to ${targetPlan} Plan`,
        order_id: createData.orderId,
        handler: async function (response: any) {
          const verifyRes = await fetch("/api/billing/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              plan: targetPlan,
              billingCycle,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          const verifyData = await verifyRes.json();
          if (verifyRes.ok) {
            showToast(`Successfully upgraded to ${targetPlan} Plan!`);
            const [newSub, newInv] = await Promise.all([
              fetch("/api/billing/subscription").then(r => r.json()),
              fetch("/api/billing/invoices").then(r => r.json()),
            ]);
            setSubscriptionData(newSub);
            if (newInv.invoices) setInvoices(newInv.invoices);
          } else {
            showToast(verifyData.error || "Payment verification failed", true);
          }
        },
        theme: { color: "#6366f1" },
      };

      if (typeof window !== "undefined" && (window as any).Razorpay) {
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else {
        router.push("/billing");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to complete subscription upgrade", true);
    } finally {
      setProcessingPlan(null);
    }
  };

  const currentPlanTier = (subscriptionData?.subscription?.plan || "PRO") as SubscriptionPlanTier;
  const currentPlanInfo = SAAS_PLANS[currentPlanTier] || SAAS_PLANS.PRO;
  const usage = subscriptionData?.usage || {
    projectsCount: 3,
    maxProjects: 25,
    photosCount: 30,
    maxPhotos: 5000,
    storageGbUsed: 0.5,
    maxStorageGb: 50,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
          <p className="text-zinc-400 text-sm font-light">Loading studio settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-light tracking-tight text-white">Account & Studio Settings</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1.5">
              <Crown className="w-3 h-3 text-amber-400" />
              {currentPlanInfo.name} Tier
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Manage your photography studio brand, client gallery defaults, subscriptions, and team access.
          </p>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 flex items-center gap-3 text-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 flex items-center gap-3 text-sm animate-in fade-in">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-zinc-800 pb-2 scrollbar-none">
        {[
          { id: "branding", label: "Studio Branding", icon: Building2 },
          { id: "profile", label: "Profile", icon: User },
          { id: "plans", label: "Subscription & Plans", icon: Crown },
          { id: "invoices", label: "Billing & Invoices", icon: Receipt },
          { id: "domains", label: "Custom Domains", icon: Globe },
          { id: "team", label: "Team Members", icon: Users },
          { id: "security", label: "Security", icon: Lock },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                isActive
                  ? "bg-zinc-800 text-white border border-zinc-700 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-amber-400" : "text-zinc-500"}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: STUDIO BRANDING */}
      {activeTab === "branding" && (
        <form onSubmit={handleSaveBranding} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Form Controls */}
            <div className="lg:col-span-8 space-y-6">
              {/* Studio Identity Card */}
              <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-md space-y-6">
                <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
                  <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-medium text-white">Studio Identity</h2>
                    <p className="text-xs text-zinc-400">Your brand name and global tagline displayed on all client galleries.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 uppercase tracking-wider mb-2">
                      Studio Name
                    </label>
                    <input
                      type="text"
                      value={settings.studioName}
                      onChange={(e) => setSettings({ ...settings, studioName: e.target.value })}
                      placeholder="e.g. DR Films Wedding Cinema"
                      className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 uppercase tracking-wider mb-2">
                      Studio Tagline / Specialty
                    </label>
                    <input
                      type="text"
                      value={settings.tagline}
                      onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                      placeholder="e.g. Fine Art Wedding Cinema & Photography"
                      className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-colors"
                    />
                  </div>
                </div>

                {/* Logos Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  {/* Light Logo */}
                  <div className="space-y-3">
                    <label className="block text-xs font-medium text-zinc-300 uppercase tracking-wider">
                      Studio Logo (For Dark Backgrounds)
                    </label>
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-950 border border-zinc-800/80">
                      <div className="w-16 h-16 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center p-2 overflow-hidden flex-shrink-0">
                        {settings.logoUrlLight ? (
                          <img src={settings.logoUrlLight} alt="Light Logo" className="max-h-full max-w-full object-contain" />
                        ) : (
                          <Building2 className="w-6 h-6 text-zinc-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={settings.logoUrlLight}
                          onChange={(e) => setSettings({ ...settings, logoUrlLight: e.target.value })}
                          placeholder="https://... or upload"
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white mb-2"
                        />
                        <label className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white cursor-pointer transition-colors">
                          <Upload className="w-3.5 h-3.5" />
                          {uploadingLogo === "light" ? "Uploading..." : "Upload Image"}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleLogoUpload(e, "light")}
                            disabled={uploadingLogo === "light"}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Dark Logo */}
                  <div className="space-y-3">
                    <label className="block text-xs font-medium text-zinc-300 uppercase tracking-wider">
                      Studio Logo (For Light Backgrounds)
                    </label>
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-950 border border-zinc-800/80">
                      <div className="w-16 h-16 rounded-lg bg-zinc-100 border border-zinc-300 flex items-center justify-center p-2 overflow-hidden flex-shrink-0">
                        {settings.logoUrlDark ? (
                          <img src={settings.logoUrlDark} alt="Dark Logo" className="max-h-full max-w-full object-contain" />
                        ) : (
                          <Building2 className="w-6 h-6 text-zinc-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={settings.logoUrlDark}
                          onChange={(e) => setSettings({ ...settings, logoUrlDark: e.target.value })}
                          placeholder="https://... or upload"
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white mb-2"
                        />
                        <label className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white cursor-pointer transition-colors">
                          <Upload className="w-3.5 h-3.5" />
                          {uploadingLogo === "dark" ? "Uploading..." : "Upload Image"}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleLogoUpload(e, "dark")}
                            disabled={uploadingLogo === "dark"}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact & Social Card */}
              <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-md space-y-6">
                <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
                  <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-medium text-white">Contact & Social Links</h2>
                    <p className="text-xs text-zinc-400">Direct booking and inquiry links embedded in your client galleries.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 uppercase tracking-wider mb-2">
                      Studio Website
                    </label>
                    <div className="relative">
                      <Globe className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                      <input
                        type="url"
                        value={settings.website}
                        onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                        placeholder="https://drfilms.com"
                        className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 uppercase tracking-wider mb-2">
                      Public Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                      <input
                        type="email"
                        value={settings.email}
                        onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                        placeholder="contact@drfilms.com"
                        className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 uppercase tracking-wider mb-2">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={settings.phone}
                        onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                        placeholder="+91 98765 43210"
                        className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 uppercase tracking-wider mb-2">
                      WhatsApp Number (For Direct Selection Sharing)
                    </label>
                    <input
                      type="text"
                      value={settings.whatsapp}
                      onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 uppercase tracking-wider mb-2">
                      Instagram Handle / URL
                    </label>
                    <input
                      type="text"
                      value={settings.instagram}
                      onChange={(e) => setSettings({ ...settings, instagram: e.target.value })}
                      placeholder="@drfilms_official or https://instagram.com/..."
                      className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 uppercase tracking-wider mb-2">
                      Facebook Page
                    </label>
                    <input
                      type="text"
                      value={settings.facebook}
                      onChange={(e) => setSettings({ ...settings, facebook: e.target.value })}
                      placeholder="https://facebook.com/drfilmsofficial"
                      className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 uppercase tracking-wider mb-2">
                    Gallery Footer Note
                  </label>
                  <input
                    type="text"
                    value={settings.footerText}
                    onChange={(e) => setSettings({ ...settings, footerText: e.target.value })}
                    placeholder="Crafted with love for your lifelong memories."
                    className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>

              {/* Gallery Defaults Card */}
              <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-md space-y-6">
                <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
                  <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
                    <Layout className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-medium text-white">Default Gallery Defaults & Themes</h2>
                    <p className="text-xs text-zinc-400">Newly created wedding projects inherit these defaults automatically.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 uppercase tracking-wider mb-2">
                      Default Template
                    </label>
                    <select
                      value={settings.defaultTemplate}
                      onChange={(e) => setSettings({ ...settings, defaultTemplate: e.target.value as GalleryTemplate })}
                      className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50"
                    >
                      <option value="classic">Classic Cinema</option>
                      <option value="cinematic">Cinematic Pro</option>
                      <option value="editorial">Editorial Vogue</option>
                      <option value="minimal">Minimal Modern</option>
                      <option value="storybook">Romantic Storybook</option>
                      <option value="interactive">Interactive Showcase</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 uppercase tracking-wider mb-2">
                      Default Theme
                    </label>
                    <select
                      value={settings.defaultTheme}
                      onChange={(e) => setSettings({ ...settings, defaultTheme: e.target.value as GalleryTheme })}
                      className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50"
                    >
                      <option value="luxury">Luxury Gold & Noir</option>
                      <option value="royal">Royal Velvet & Gold</option>
                      <option value="romantic">Romantic Rose Gold</option>
                      <option value="monochrome">Modern Monochrome</option>
                      <option value="champagne">Champagne Glow</option>
                      <option value="vintage">Vintage Sepia</option>
                      <option value="editorial">High-Fashion Dark</option>
                    </select>
                  </div>
                </div>

                {/* Accent Color Preset */}
                <div>
                  <label className="block text-xs font-medium text-zinc-300 uppercase tracking-wider mb-2">
                    Default Accent Color
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {["#D4AF37", "#E5C158", "#E0A899", "#C5A059", "#3B82F6", "#10B981", "#EC4899"].map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setSettings({ ...settings, defaultAccentColor: color })}
                          style={{ backgroundColor: color }}
                          className={`w-7 h-7 rounded-full transition-transform ${
                            settings.defaultAccentColor === color ? "scale-125 ring-2 ring-white ring-offset-2 ring-offset-zinc-950" : "hover:scale-110"
                          }`}
                        />
                      ))}
                    </div>
                    <input
                      type="text"
                      value={settings.defaultAccentColor}
                      onChange={(e) => setSettings({ ...settings, defaultAccentColor: e.target.value })}
                      className="w-28 bg-zinc-950/80 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>

                {/* White Label Switch */}
                <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">White-Label Galleries</p>
                    <p className="text-xs text-zinc-400">Remove &quot;Powered by Wedding Gallery&quot; branding badge from client views.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.whiteLabelEnabled}
                      onChange={(e) => setSettings({ ...settings, whiteLabelEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-sm bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 hover:from-amber-400 hover:to-amber-500 shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "Saving Changes..." : "Save Studio Branding"}
                </button>
              </div>
            </div>

            {/* Right Column: Live Gallery Card Preview */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-md sticky top-6 space-y-4">
                <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  <Eye className="w-4 h-4 text-amber-400" />
                  Live Branding Preview
                </div>

                {/* Simulated Header Preview */}
                <div className="rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 p-6 flex flex-col items-center text-center space-y-4 shadow-xl">
                  {settings.logoUrlLight ? (
                    <img src={settings.logoUrlLight} alt="Logo" className="h-12 max-w-[200px] object-contain" />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                      <Camera className="w-6 h-6 text-amber-400" />
                    </div>
                  )}

                  <div>
                    <h3 className="text-base font-medium text-white tracking-wide">{settings.studioName || "Studio Name"}</h3>
                    <p className="text-xs text-zinc-400 mt-1 font-light italic">{settings.tagline || "Wedding Cinema & Photography"}</p>
                  </div>

                  <div className="w-16 h-0.5" style={{ backgroundColor: settings.defaultAccentColor }} />

                  {/* Sample Wedding Tag */}
                  <div className="p-3 w-full rounded-lg bg-zinc-900/90 border border-zinc-800 text-left">
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Client View Preview</p>
                    <p className="text-xs text-white font-medium">Wedding Gallery Preview</p>
                    <p className="text-[10px] text-zinc-500">Event Date & Venue</p>
                  </div>

                  {/* Sample Footer */}
                  <p className="text-[10px] text-zinc-500 italic mt-4">{settings.footerText}</p>

                  {!settings.whiteLabelEnabled && (
                    <div className="text-[9px] text-zinc-600 uppercase tracking-widest pt-2">
                      Powered by Wedding Cinema Platform
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: PROFILE */}
      {activeTab === "profile" && (
        <div className="max-w-2xl bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-md space-y-6">
          <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-white">Photographer Profile</h2>
              <p className="text-xs text-zinc-400">Personal contact details and studio administrator info.</p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            {/* Avatar & Identity Info */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 mb-2">
              <div className="w-14 h-14 rounded-full overflow-hidden bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-300 font-bold text-lg flex-shrink-0">
                {profile.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  profile.name.charAt(0).toUpperCase() || "P"
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-white truncate">{profile.name}</h3>
                <p className="text-xs text-zinc-400 truncate">{profile.email}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {profile.authProviders?.includes("google") || profile.googleId ? (
                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                      ✓ Google Linked
                    </span>
                  ) : null}
                  {profile.authProviders?.includes("email") || !profile.googleId ? (
                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                      ✓ Password Protected
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 uppercase tracking-wider mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 uppercase tracking-wider mb-2">
                Primary Account Email (Read-Only)
              </label>
              <input
                type="email"
                value={profile.email}
                disabled
                className="w-full bg-zinc-950/40 border border-zinc-800/60 rounded-xl px-4 py-2.5 text-sm text-zinc-400 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 uppercase tracking-wider mb-2">
                Business / Studio Name
              </label>
              <input
                type="text"
                value={profile.businessName}
                onChange={(e) => setProfile({ ...profile, businessName: e.target.value })}
                className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 uppercase tracking-wider mb-2">
                Direct Phone
              </label>
              <input
                type="text"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50"
              />
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-sm bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 hover:from-amber-400 hover:to-amber-500 shadow-md cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Update Profile"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: SUBSCRIPTION & PLANS */}
      {activeTab === "plans" && (
        <div className="space-y-8">
          {/* Active Subscription Overview Card */}
          <div className="bg-gradient-to-r from-zinc-900/90 to-zinc-900/50 border border-zinc-800/90 rounded-2xl p-6 backdrop-blur-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                    <Crown className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-light text-white flex items-center gap-2">
                      {currentPlanInfo.name} Plan
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                        Active
                      </span>
                    </h2>
                    <p className="text-xs text-zinc-400">
                      ₹{currentPlanInfo.priceMonthly}/month • Next renewal on{" "}
                      {new Date(subscriptionData?.subscription?.currentPeriodEnd || Date.now() + 30 * 86400000).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Usage Gauges */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border-t md:border-t-0 md:border-l border-zinc-800 pt-4 md:pt-0 md:pl-6">
                <div>
                  <p className="text-xs text-zinc-400 mb-1">Weddings</p>
                  <p className="text-base font-semibold text-white">
                    {usage.projectsCount} <span className="text-xs font-normal text-zinc-500">/ {usage.maxProjects === 9999 ? "∞" : usage.maxProjects}</span>
                  </p>
                  <div className="w-24 h-1.5 bg-zinc-800 rounded-full mt-1.5 overflow-hidden">
                    <div 
                      className="h-full bg-amber-400 rounded-full" 
                      style={{ width: `${Math.min(100, (usage.projectsCount / (usage.maxProjects || 1)) * 100)}%` }} 
                    />
                  </div>
                </div>

                <div>
                  <p className="text-xs text-zinc-400 mb-1">Storage</p>
                  <p className="text-base font-semibold text-white">
                    {usage.storageGbUsed || 0.5} GB <span className="text-xs font-normal text-zinc-500">/ {usage.maxStorageGb} GB</span>
                  </p>
                  <div className="w-24 h-1.5 bg-zinc-800 rounded-full mt-1.5 overflow-hidden">
                    <div 
                      className="h-full bg-blue-400 rounded-full" 
                      style={{ width: `${Math.min(100, ((usage.storageGbUsed || 0.5) / (usage.maxStorageGb || 1)) * 100)}%` }} 
                    />
                  </div>
                </div>

                <div>
                  <p className="text-xs text-zinc-400 mb-1">Team Members</p>
                  <p className="text-base font-semibold text-white">
                    {teamMembers.length} <span className="text-xs font-normal text-zinc-500">/ {currentPlanInfo.limits.maxTeamMembers === 9999 ? "∞" : currentPlanInfo.limits.maxTeamMembers}</span>
                  </p>
                  <div className="w-24 h-1.5 bg-zinc-800 rounded-full mt-1.5 overflow-hidden">
                    <div 
                      className="h-full bg-purple-400 rounded-full" 
                      style={{ width: `${Math.min(100, (teamMembers.length / (currentPlanInfo.limits.maxTeamMembers || 1)) * 100)}%` }} 
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Billing Frequency Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-light text-white">Available Subscription Tiers</h3>
              <p className="text-xs text-zinc-400">Upgrade or customize your plan to unlock more client galleries and high-bandwidth streaming.</p>
            </div>
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setBillingCycle("MONTHLY")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  billingCycle === "MONTHLY" ? "bg-amber-500 text-zinc-950 font-semibold" : "text-zinc-400 hover:text-white"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("YEARLY")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  billingCycle === "YEARLY" ? "bg-amber-500 text-zinc-950 font-semibold" : "text-zinc-400 hover:text-white"
                }`}
              >
                Yearly
                <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500 text-zinc-950 rounded-full font-bold">20% OFF</span>
              </button>
            </div>
          </div>

          {/* Plan Comparison Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {(["FREE", "STARTER", "PRO", "STUDIO"] as SubscriptionPlanTier[]).map((tier) => {
              const p = SAAS_PLANS[tier];
              const isCurrent = currentPlanTier === tier;
              const price = billingCycle === "YEARLY" ? Math.round(p.priceMonthly * 0.8) : p.priceMonthly;

              return (
                <div
                  key={tier}
                  className={`rounded-2xl p-6 flex flex-col justify-between border transition-all ${
                    isCurrent
                      ? "bg-zinc-900/90 border-amber-500/60 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/30"
                      : "bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700"
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-base font-medium text-white">{p.name}</h4>
                      {isCurrent && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          Active
                        </span>
                      )}
                    </div>

                    <div className="pt-2">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-light text-white">₹{price}</span>
                        <span className="text-xs text-zinc-400">/mo</span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">{p.tagline}</p>
                    </div>

                    <div className="border-t border-zinc-800/80 pt-4 space-y-2.5 text-xs text-zinc-300">
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                        <span><strong>{p.limits.maxProjects === 9999 ? "Unlimited" : p.limits.maxProjects}</strong> Wedding Projects</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                        <span><strong>{p.limits.maxStorageGb} GB</strong> Fast Cloud Storage</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                        <span><strong>{p.capabilities.whiteLabel ? "White-label" : "Standard"}</strong> Branding</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                        <span><strong>{p.limits.maxCustomDomains > 0 ? `${p.limits.maxCustomDomains} Custom Domains` : "Subdomain Only"}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                        <span><strong>{p.limits.maxTeamMembers}</strong> Team Members</span>
                      </div>
                    </div>
                  </div>


                  <div className="pt-6">
                    {isCurrent ? (
                      <button
                        disabled
                        className="w-full py-2.5 rounded-xl text-xs font-medium bg-zinc-800 text-zinc-400 border border-zinc-700 cursor-default"
                      >
                        Current Plan
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handlePlanUpgrade(tier)}
                        disabled={processingPlan !== null}
                        className="w-full py-2.5 rounded-xl text-xs font-semibold bg-zinc-100 text-zinc-950 hover:bg-amber-400 transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                      >
                        {processingPlan === tier ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            Upgrade to {p.name}
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: BILLING & INVOICES */}
      {activeTab === "invoices" && (
        <div className="space-y-6">
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-medium text-white">Payment & Invoice History</h2>
                  <p className="text-xs text-zinc-400">View and download GST-compliant tax invoices for your subscription.</p>
                </div>
              </div>
            </div>

            {invoices.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 text-sm">
                <Receipt className="w-10 h-10 mx-auto mb-3 opacity-40 text-zinc-400" />
                <p>No billing invoices found yet.</p>
                <p className="text-xs text-zinc-600 mt-1">Invoices appear automatically after every subscription renewal or upgrade.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Plan Tier</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Payment Method</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-zinc-400">{inv.invoiceNumber || inv.id}</td>
                        <td className="py-3.5 px-4">{new Date(inv.createdAt).toLocaleDateString()}</td>
                        <td className="py-3.5 px-4 font-medium text-white">{inv.plan}</td>
                        <td className="py-3.5 px-4 font-medium text-emerald-400">₹{inv.amount}</td>
                        <td className="py-3.5 px-4 text-zinc-400">Razorpay ({(inv.paymentId || inv.razorpayPaymentId || "Direct").substring(0, 12)}...)</td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => window.print()}
                            className="text-amber-400 hover:text-amber-300 inline-flex items-center gap-1 font-medium cursor-pointer"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Print
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

      {/* TAB 5: CUSTOM DOMAINS */}
      {activeTab === "domains" && (
        <div className="space-y-6 max-w-4xl">
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-md space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-medium text-white">Custom Domain Management</h2>
                  <p className="text-xs text-zinc-400">
                    Serve your wedding cinema galleries under your studio&apos;s personal domain (e.g. <code className="text-amber-300">gallery.yourstudio.com</code>).
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700/50">
                  Limit: 1 Custom Domain
                </span>
              </div>
            </div>

            {/* Global Disabled Alert */}
            {!domainsGlobalEnabled && (
              <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                <div className="flex items-center gap-2.5 text-amber-300 font-semibold text-sm">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <span>Custom Domains Temporarily Disabled</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Custom domains are currently disabled by the platform administrator. New domain connections and external routing are temporarily suspended. Any previously saved domain configuration is preserved safely.
                </p>
              </div>
            )}

            {/* Add Domain Form (Only visible if global is enabled AND photographer has 0 domains) */}
            {domainsGlobalEnabled && domains.length === 0 && (
              <form onSubmit={handleAddDomain} className="p-5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-4">
                <div>
                  <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                    Connect Custom Domain (1 Domain Slot Available)
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Enter the full domain or subdomain you wish to map to your wedding cinema galleries.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 items-end">
                  <div className="flex-1 w-full">
                    <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                      Domain / Subdomain Hostname
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. gallery.yourstudio.com"
                      value={newDomainInput}
                      onChange={(e) => setNewDomainInput(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/50 font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={addingDomain || !newDomainInput.trim()}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-all disabled:opacity-50 shrink-0 cursor-pointer shadow-lg shadow-amber-500/10"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{addingDomain ? "Connecting..." : "Connect Domain"}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Existing Domain Slot */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Connected Studio Domain ({domains.length > 0 ? "1 / 1 used" : "0 / 1 used"})
                </h3>
              </div>

              {domains.length === 0 ? (
                <div className="text-center py-10 px-4 rounded-xl border border-dashed border-zinc-800/80 bg-zinc-950/40">
                  <Globe className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                  <p className="text-xs text-zinc-400">No custom domain connected yet.</p>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Connect your studio domain above to display your client galleries under your personal branding.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/60 p-4">
                    {domains.slice(0, 1).map((dom) => {
                      const isVerified =
                        dom.status === "ACTIVE" ||
                        dom.status === "VERIFIED" ||
                        dom.status === "active" ||
                        dom.status === "verified" ||
                        dom.verificationStatus === "verified";
                      const isDisabled =
                        dom.status === "DISABLED_BY_PLATFORM" ||
                        dom.status === "DISABLED" ||
                        !domainsGlobalEnabled;

                      return (
                        <div key={dom.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-sm text-white">{dom.hostname}</span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                <Crown className="w-3 h-3" />
                                Primary Studio Domain
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                                  isDisabled
                                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                    : isVerified
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                    : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                }`}
                              >
                                {isDisabled
                                  ? "Disabled by Platform"
                                  : isVerified
                                  ? "Verified & Active"
                                  : "Pending DNS Verification"}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800 text-zinc-400 border border-zinc-700/50">
                                SSL: Managed by Hosting
                              </span>
                            </div>
                            <div className="text-[11px] text-zinc-400 flex items-center gap-3">
                              <span>Target CNAME: <code className="text-zinc-300">{dom.targetCname}</code></span>
                              <span>•</span>
                              <span>Added: {new Date(dom.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 flex-wrap">
                            {!isVerified && !isDisabled && (
                              <button
                                type="button"
                                onClick={() => handleVerifyDomain(dom.id)}
                                disabled={verifyingDomainId === dom.id}
                                className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                              >
                                <RefreshCw className={`w-3.5 h-3.5 ${verifyingDomainId === dom.id ? "animate-spin" : ""}`} />
                                <span>{verifyingDomainId === dom.id ? "Checking DNS..." : "Verify DNS"}</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setSelectedDomainForInstructions(dom)}
                              className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                              title="View DNS Records"
                            >
                              <Info className="w-3.5 h-3.5" />
                              <span>DNS Records</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteDomain(dom.id)}
                              disabled={domainActionLoading === dom.id}
                              className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
                              title="Disconnect Domain"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Disconnect</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-950/80 border border-zinc-800 text-[11px] text-zinc-400 flex items-center gap-2">
                    <Info className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>
                      Each studio account is allowed exactly <strong>1 custom domain</strong>. To connect a different domain, disconnect your current domain first.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* DNS Instructions Card */}
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  DNS Setup Instructions
                  {selectedDomainForInstructions ? ` (${selectedDomainForInstructions.hostname})` : ""}
                </h3>
              </div>
              <p className="text-xs text-zinc-300">
                Add one of the following DNS records at your domain registrar (e.g. Cloudflare, GoDaddy, Namecheap, Route53):
              </p>

              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs font-mono space-y-2">
                  <div className="text-[11px] font-sans font-semibold text-zinc-400 uppercase">
                    Option 1: CNAME Record (Recommended for subdomains)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <span className="text-zinc-500 block text-[10px] uppercase font-sans">Type</span>
                      CNAME
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[10px] uppercase font-sans">Name / Host</span>
                      {selectedDomainForInstructions?.hostname ? selectedDomainForInstructions.hostname.split(".")[0] : "gallery"}
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[10px] uppercase font-sans">Target Value</span>
                      {selectedDomainForInstructions?.targetCname || cnameTarget}
                    </div>
                  </div>
                </div>

                {selectedDomainForInstructions?.txtRecordName && (
                  <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs font-mono space-y-2">
                    <div className="text-[11px] font-sans font-semibold text-zinc-400 uppercase">
                      Option 2: TXT Verification Record (For root/apex domains or verification)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <span className="text-zinc-500 block text-[10px] uppercase font-sans">Type</span>
                        TXT
                      </div>
                      <div className="break-all">
                        <span className="text-zinc-500 block text-[10px] uppercase font-sans">Name / Host</span>
                        {selectedDomainForInstructions.txtRecordName}
                      </div>
                      <div className="break-all">
                        <span className="text-zinc-500 block text-[10px] uppercase font-sans">Value</span>
                        {selectedDomainForInstructions.txtRecordValue}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: TEAM MEMBERS */}
      {activeTab === "team" && (
        <div className="space-y-6 max-w-4xl">
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-md space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-medium text-white">Studio Team & Collaborators</h2>
                  <p className="text-xs text-zinc-400">
                    Invite photographers, retouchers, and cinema editors to collaborate on client galleries.
                  </p>
                </div>
              </div>
            </div>

            {/* Invite Form */}
            <form onSubmit={handleAddTeamMember} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end p-4 rounded-xl bg-zinc-950 border border-zinc-800">
              <div className="sm:col-span-4">
                <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Member Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sarah Jenkins"
                  value={newTeamMember.name}
                  onChange={(e) => setNewTeamMember({ ...newTeamMember, name: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
                  required
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="sarah@drfilms.com"
                  value={newTeamMember.email}
                  onChange={(e) => setNewTeamMember({ ...newTeamMember, email: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Role
                </label>
                <select
                  value={newTeamMember.role}
                  onChange={(e) => setNewTeamMember({ ...newTeamMember, role: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
                >
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={addingMember}
                  className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-amber-500 text-zinc-950 hover:bg-amber-400 flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {addingMember ? "Adding..." : "Invite"}
                </button>
              </div>
            </form>

            {/* Team List Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Member</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                  {/* Account Owner Row */}
                  <tr className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div>
                        <p className="font-medium text-white">{profile.name} (You)</p>
                        <p className="text-[11px] text-zinc-500">{profile.email}</p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Studio Owner
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-emerald-400">Active</td>
                    <td className="py-3.5 px-4 text-right text-zinc-500 text-[11px]">—</td>
                  </tr>

                  {teamMembers.map((m) => (
                    <tr key={m.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div>
                          <p className="font-medium text-white">{m.name}</p>
                          <p className="text-[11px] text-zinc-500">{m.email}</p>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase">
                          {m.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-emerald-400">{m.status}</td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveTeamMember(m.id)}
                          className="text-rose-400 hover:text-rose-300 p-1 rounded hover:bg-rose-500/10 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: SECURITY */}
      {activeTab === "security" && (
        <div className="max-w-2xl bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-md space-y-6">
          <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
            <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-white">Security & Password</h2>
              <p className="text-xs text-zinc-400">Update your account authentication credentials.</p>
            </div>
          </div>

          {/* Linked Authentication Methods */}
          <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-3">
            <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
              Connected Authentication Methods
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-white">Email & Password</p>
                    <p className="text-[11px] text-zinc-400 truncate">{profile.email}</p>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono">
                  Active
                </span>
              </div>

              <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-white">Google Account</p>
                    <p className="text-[11px] text-zinc-400 truncate">
                      {profile.googleEmail || (profile.googleId ? "Connected" : "Not connected")}
                    </p>
                  </div>
                </div>
                {profile.googleId ? (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono">
                    Linked
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                    Unlinked
                  </span>
                )}
              </div>
            </div>

            {!profile.googleId && (
              <div className="pt-2">
                <GoogleSignInButton mode="connect" from="/dashboard/settings?tab=security" />
              </div>
            )}
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 uppercase tracking-wider mb-2">
                Current Password
              </label>
              <input
                type="password"
                value={passwordState.currentPassword}
                onChange={(e) => setPasswordState({ ...passwordState, currentPassword: e.target.value })}
                className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 uppercase tracking-wider mb-2">
                New Password
              </label>
              <input
                type="password"
                value={passwordState.newPassword}
                onChange={(e) => setPasswordState({ ...passwordState, newPassword: e.target.value })}
                className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 uppercase tracking-wider mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                value={passwordState.confirmPassword}
                onChange={(e) => setPasswordState({ ...passwordState, confirmPassword: e.target.value })}
                className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50"
                required
              />
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-sm bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 hover:from-amber-400 hover:to-amber-500 shadow-md cursor-pointer disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                {saving ? "Updating..." : "Change Password"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default function StudioSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
        </div>
      }
    >
      <StudioSettingsContent />
    </Suspense>
  );
}

