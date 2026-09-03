"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  Heart, 
  Calendar, 
  Film, 
  Folder, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  Link as LinkIcon,
  HelpCircle,
  Lock,
  Download,
  Maximize,
  Shield,
  Layers,
  MapPin,
  Clock,
  Palette,
  CheckSquare
} from "lucide-react";
import { extractGoogleDriveFolderId } from "@/lib/drive-parser";

export default function NewProjectPage() {
  const router = useRouter();

  // Couple Names
  const [partner1, setPartner1] = useState("");
  const [partner2, setPartner2] = useState("");
  const [weddingDate, setWeddingDate] = useState("");
  const [weddingLocation, setWeddingLocation] = useState("");
  const [packageType, setPackageType] = useState("Full Wedding Cinema");
  const [welcomeMessage, setWelcomeMessage] = useState("Our beautiful beginning");
  const [driveFolderUrl, setDriveFolderUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [coverImage, setCoverImage] = useState("");

  // Studio Branding Defaults
  const [studioName, setStudioName] = useState("DR FILMS");
  const [studioSubtitle, setStudioSubtitle] = useState("Wedding Cinema");

  // Settings & Expiry State
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [password, setPassword] = useState("");
  const [expiryPreset, setExpiryPreset] = useState<"never" | "30d" | "90d" | "1y" | "custom">("never");
  const [expiresAt, setExpiresAt] = useState("");
  const [allowDownloads, setAllowDownloads] = useState(false); // Default OFF
  const [allowFullscreen, setAllowFullscreen] = useState(true);
  const [showBranding, setShowBranding] = useState(true);

  // Client Selection Mode
  const [selectionEnabled, setSelectionEnabled] = useState(false);
  const [selectionLimit, setSelectionLimit] = useState(50);
  const [selectionTitle, setSelectionTitle] = useState("Wedding Album Selection");

  // Scan Testing State
  const [testingFolder, setTestingFolder] = useState(false);
  const [scanResult, setScanResult] = useState<{ 
    videoCount?: number; 
    photoCount?: number; 
    folderName?: string; 
    eventsCount?: number; 
    error?: string 
  } | null>(null);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleExpiryPresetChange = (preset: "never" | "30d" | "90d" | "1y" | "custom") => {
    setExpiryPreset(preset);
    if (preset === "never") {
      setExpiresAt("");
    } else if (preset === "30d") {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      setExpiresAt(d.toISOString().split("T")[0]);
    } else if (preset === "90d") {
      const d = new Date();
      d.setDate(d.getDate() + 90);
      setExpiresAt(d.toISOString().split("T")[0]);
    } else if (preset === "1y") {
      const d = new Date();
      d.setFullYear(d.getFullYear() + 1);
      setExpiresAt(d.toISOString().split("T")[0]);
    }
  };

  const handleTestFolder = async () => {
    if (!driveFolderUrl) return;
    setTestingFolder(true);
    setScanResult(null);

    const folderId = extractGoogleDriveFolderId(driveFolderUrl);
    if (!folderId) {
      setScanResult({ error: "Invalid Google Drive folder link format. Please check the URL." });
      setTestingFolder(false);
      return;
    }

    try {
      const res = await fetch("/api/drive/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderUrl: driveFolderUrl }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setScanResult({ error: data.error || "Failed to access folder." });
      } else {
        setScanResult({
          videoCount: data.totalVideos ?? (data.videos || []).length,
          photoCount: data.totalPhotos ?? (data.photos || []).length,
          eventsCount: (data.events || []).length,
          folderName: data.folder?.name,
        });
      }
    } catch {
      setScanResult({ error: "Network error while connecting to Google Drive." });
    } finally {
      setTestingFolder(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert("Image is too large. Please select an image under 3MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setCoverImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const unifiedCoupleName = partner1.trim() && partner2.trim()
      ? `${partner1.trim()} & ${partner2.trim()}`
      : partner1.trim() || partner2.trim();

    if (!unifiedCoupleName || !weddingDate || !driveFolderUrl) {
      setError("Please fill in Couple names, Wedding Date, and Google Drive Folder URL.");
      return;
    }

    if (isPasswordProtected && !password.trim()) {
      setError("Please enter a gallery password since Password Protection is enabled.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coupleName: unifiedCoupleName,
          weddingDate,
          weddingLocation: weddingLocation.trim(),
          packageType,
          welcomeMessage,
          driveFolderUrl,
          notes,
          coverImage,
          status: "published",
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
          branding: {
            businessName: studioName.trim() || "DR FILMS",
            studioName: studioName.trim() || "DR FILMS",
            subtitle: studioSubtitle.trim() || "Wedding Cinema",
            weddingLocation: weddingLocation.trim(),
          },
          settings: {
            isPasswordProtected,
            password: isPasswordProtected ? password.trim() : "",
            allowDownloads,
            allowFullscreen,
            showBranding,
            selectionConfig: {
              enabled: selectionEnabled,
              limit: selectionLimit,
              title: selectionTitle,
              instructions: "Please select your favorite photos and films for your custom luxury wedding album.",
              status: "OPEN",
            },
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create project");
      }

      // Redirect immediately to project workspace
      router.push(`/projects/${data.project.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to create project");
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      <div className="text-center sm:text-left">
        <h1 className="text-3xl font-serif font-bold text-white tracking-tight">
          Create New Wedding Gallery
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Set up a client showcase, configure studio branding, and connect your Google Drive media folder.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Couple & Wedding Information */}
        <div className="glass-panel p-6 sm:p-8 space-y-6 border border-white/10 rounded-2xl">
          <div className="flex items-center gap-3 pb-4 border-b border-white/10">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Couple & Wedding Information</h2>
              <p className="text-xs text-slate-400">Personalized wedding information displayed across client invitations</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Partner 1 Name <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                value={partner1}
                onChange={(e) => setPartner1(e.target.value)}
                placeholder="e.g. Harshil"
                required
                className="glass-input"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Partner 2 Name <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                value={partner2}
                onChange={(e) => setPartner2(e.target.value)}
                placeholder="e.g. Jahnavi"
                required
                className="glass-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Wedding Date <span className="text-amber-400">*</span>
              </label>
              <input
                type="date"
                value={weddingDate}
                onChange={(e) => setWeddingDate(e.target.value)}
                required
                className="glass-input"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Wedding Location / Venue
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-amber-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={weddingLocation}
                  onChange={(e) => setWeddingLocation(e.target.value)}
                  placeholder="e.g. Udaipur, Rajasthan &bull; The Oberoi Udaivilas"
                  className="glass-input pl-10"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Welcome Subtitle / Tagline
              </label>
              <input
                type="text"
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                placeholder="e.g. Our beautiful beginning"
                className="glass-input"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Package Name
              </label>
              <input
                type="text"
                value={packageType}
                onChange={(e) => setPackageType(e.target.value)}
                placeholder="e.g. Full Wedding Cinema"
                className="glass-input"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Google Drive Connection & Scan Test */}
        <div className="glass-panel p-6 sm:p-8 space-y-6 border border-white/10 rounded-2xl">
          <div className="flex items-center gap-3 pb-4 border-b border-white/10">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Google Drive Media Folder</h2>
              <p className="text-xs text-slate-400">Where wedding films and high-resolution photo ceremony subfolders reside</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Drive Folder Share URL <span className="text-amber-400">*</span>
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <input
                  type="url"
                  value={driveFolderUrl}
                  onChange={(e) => {
                    setDriveFolderUrl(e.target.value);
                    setScanResult(null);
                  }}
                  placeholder="https://drive.google.com/drive/folders/FOLDER_ID?usp=drive_link"
                  required
                  className="glass-input pl-10"
                />
                <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>

              <button
                type="button"
                onClick={handleTestFolder}
                disabled={testingFolder || !driveFolderUrl}
                className="glass-button whitespace-nowrap justify-center px-4 cursor-pointer"
              >
                {testingFolder ? (
                  <>
                    <div className="loader-spin w-4 h-4 border-2 border-amber-400 border-t-transparent" />
                    <span>Scanning Drive...</span>
                  </>
                ) : (
                  <>
                    <Film className="w-4 h-4 text-amber-400" />
                    <span>Test & Scan Folder</span>
                  </>
                )}
              </button>
            </div>

            {/* Scan Feedback */}
            {scanResult && (
              <div className="mt-3">
                {scanResult.error ? (
                  <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{scanResult.error}</span>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>
                      ✓ Success! Found <strong>{scanResult.videoCount || 0}</strong> films and <strong>{scanResult.photoCount || 0}</strong> photos in <strong>{scanResult.eventsCount || 1}</strong> event folders (&ldquo;{scanResult.folderName || "Drive Folder"}&rdquo;).
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="mt-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-slate-400 flex items-start gap-2">
              <HelpCircle className="w-4 h-4 text-amber-400/80 flex-shrink-0 mt-0.5" />
              <span>
                Ensure your Google Drive folder is shared with <strong>&ldquo;Anyone with the link &rarr; Viewer&rdquo;</strong> so media streams securely to your clients.
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Studio Branding Defaults */}
        <div className="glass-panel p-6 sm:p-8 space-y-6 border border-white/10 rounded-2xl">
          <div className="flex items-center gap-3 pb-4 border-b border-white/10">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Studio Branding</h2>
              <p className="text-xs text-slate-400">Your studio identity displayed in the client navigation bar and footer</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Studio / Business Name
              </label>
              <input
                type="text"
                value={studioName}
                onChange={(e) => setStudioName(e.target.value)}
                placeholder="e.g. DR FILMS"
                className="glass-input"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Studio Subtitle
              </label>
              <input
                type="text"
                value={studioSubtitle}
                onChange={(e) => setStudioSubtitle(e.target.value)}
                placeholder="e.g. Luxury Wedding Cinema"
                className="glass-input"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Security, Expiry & Permissions */}
        <div className="glass-panel p-6 sm:p-8 space-y-6 border border-white/10 rounded-2xl">
          <div className="flex items-center gap-3 pb-4 border-b border-white/10">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Access Control, Expiry & Permissions</h2>
              <p className="text-xs text-slate-400">Configure client privacy, expiration dates, and download permissions</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Password Protection */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPasswordProtected}
                  onChange={(e) => setIsPasswordProtected(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-400 accent-amber-400 cursor-pointer"
                />
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>Gallery Password Protection</span>
                </div>
              </label>

              {isPasswordProtected && (
                <div className="pt-2 pl-7 animate-in fade-in duration-200">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Client Access Password <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter private access password..."
                    className="glass-input max-w-sm text-xs font-mono"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Clients will be asked to enter this password before entering the gallery.
                  </p>
                </div>
              )}
            </div>

            {/* Gallery Expiry */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Gallery Expiry Schedule</span>
              </div>
              <p className="text-xs text-slate-400">
                After the expiration date, client viewing links will show a friendly expired notice.
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {[
                  { id: "never", label: "No Expiry (Lifetime)" },
                  { id: "30d", label: "30 Days" },
                  { id: "90d", label: "90 Days" },
                  { id: "1y", label: "1 Year" },
                  { id: "custom", label: "Custom Date" },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleExpiryPresetChange(preset.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      expiryPreset === preset.id
                        ? "bg-amber-400 text-black font-bold shadow-md"
                        : "bg-white/5 text-slate-300 hover:bg-white/10 border border-white/5"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {(expiryPreset === "custom" || (expiryPreset !== "never" && expiresAt)) && (
                <div className="pt-2">
                  <input
                    type="date"
                    value={expiresAt}
                    onChange={(e) => {
                      setExpiresAt(e.target.value);
                      setExpiryPreset("custom");
                    }}
                    className="glass-input max-w-xs text-xs"
                  />
                </div>
              )}
            </div>

            {/* Download and Cinema Permissions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-3 cursor-pointer hover:bg-white/[0.04] transition-all">
                <input
                  type="checkbox"
                  checked={allowDownloads}
                  onChange={(e) => setAllowDownloads(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-400 accent-amber-400 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-semibold text-white block">Allow Downloads</span>
                  <span className="text-[10px] text-slate-400">Default OFF</span>
                </div>
              </label>

              <label className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-3 cursor-pointer hover:bg-white/[0.04] transition-all">
                <input
                  type="checkbox"
                  checked={allowFullscreen}
                  onChange={(e) => setAllowFullscreen(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-400 accent-amber-400 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-semibold text-white block">Allow Cinema View</span>
                  <span className="text-[10px] text-slate-400">Full immersion</span>
                </div>
              </label>

              <label className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-3 cursor-pointer hover:bg-white/[0.04] transition-all">
                <input
                  type="checkbox"
                  checked={showBranding}
                  onChange={(e) => setShowBranding(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-400 accent-amber-400 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-semibold text-white block">Show Studio Brand</span>
                  <span className="text-[10px] text-slate-400">Logo & signature</span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Section 5: Client Album Selection Mode */}
        <div className="glass-panel p-6 sm:p-8 space-y-6 border border-white/10 rounded-2xl">
          <div className="flex items-center gap-3 pb-4 border-b border-white/10">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Client Album Selection Workflow</h2>
              <p className="text-xs text-slate-400">Allow couple to curate their favorite photos & films for print albums</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={selectionEnabled}
                onChange={(e) => setSelectionEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-amber-400 accent-amber-400 cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-semibold text-white block">Enable Album Selection for Client</span>
                <span className="text-[10px] text-slate-400">Displays a Selection bar in the client gallery with Submit button</span>
              </div>
            </label>

            {selectionEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/5 animate-in fade-in">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Selection Limit (Max Items)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={selectionLimit}
                    onChange={(e) => setSelectionLimit(Number(e.target.value))}
                    className="glass-input text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Selection Title
                  </label>
                  <input
                    type="text"
                    value={selectionTitle}
                    onChange={(e) => setSelectionTitle(e.target.value)}
                    className="glass-input text-xs"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 6: Cover Image & Notes */}
        <div className="glass-panel p-6 sm:p-8 space-y-6 border border-white/10 rounded-2xl">
          <div className="flex items-center gap-3 pb-4 border-b border-white/10">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Cover Photo & Internal Notes</h2>
              <p className="text-xs text-slate-400">Hero background image and private notes for the studio</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Gallery Cover Photo (Optional)
            </label>
            <div className="flex items-center gap-4">
              {coverImage ? (
                <div className="relative w-36 h-24 rounded-xl overflow-hidden border border-amber-400/40 group shadow-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverImage} alt="Cover preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setCoverImage("")}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs text-red-300 font-semibold transition-opacity cursor-pointer"
                  >
                    Remove Cover
                  </button>
                </div>
              ) : (
                <label className="flex-1 border-2 border-dashed border-white/15 hover:border-amber-400/50 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer bg-white/[0.02] hover:bg-white/[0.04] transition-all">
                  <Upload className="w-6 h-6 text-amber-400 mb-1" />
                  <span className="text-xs font-semibold text-slate-200">Upload couple cover / poster</span>
                  <span className="text-[11px] text-slate-400 mt-0.5">PNG, JPG up to 3MB</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Internal Notes (Photographer Only)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Lead shooter: David, Backup hard drive #3, deliver by Dec 1st..."
              rows={3}
              className="glass-input resize-none text-xs"
            />
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link
            href="/dashboard"
            className="glass-button px-5 py-2.5 text-xs font-semibold"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={submitting}
            className="wedding-gold-btn text-xs sm:text-sm px-7 py-3 shadow-xl cursor-pointer"
          >
            {submitting ? (
              <>
                <div className="loader-spin border-black border-t-transparent w-4 h-4" />
                <span>Creating Wedding Gallery...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Create & Open Wedding Workspace</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
