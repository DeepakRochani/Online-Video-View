"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { WeddingProject, isProjectExpired, isExpiringSoon, getRemainingDays } from "@/lib/project-types";
import { 
  Calendar, 
  Film, 
  Share2, 
  ExternalLink, 
  Settings, 
  Copy, 
  Check, 
  EyeOff, 
  Heart,
  RefreshCw,
  Layers,
  MessageCircle,
  Lock,
  Image as ImageIcon,
  MapPin,
  MoreVertical,
  Trash2,
  Archive,
  RotateCcw,
  Clock,
  AlertTriangle,
  CheckCircle2,
  CalendarPlus,
  ShieldCheck
} from "lucide-react";

interface ProjectCardProps {
  project: WeddingProject;
  onStatusToggle?: (projectId: string, currentStatus: boolean) => void;
  onSyncProject?: (projectId: string) => Promise<void>;
  onDuplicateProject?: (projectId: string) => Promise<void>;
  onArchiveProject?: (projectId: string, archive: boolean) => Promise<void>;
  onDeleteProject?: (projectId: string) => Promise<void>;
  onExtendExpiration?: (projectId: string, expiresAt: string | null) => Promise<void>;
  onRestoreExpired?: (projectId: string, days?: number) => Promise<void>;
}

export default function ProjectCard({
  project,
  onStatusToggle,
  onSyncProject,
  onDuplicateProject,
  onArchiveProject,
  onDeleteProject,
  onExtendExpiration,
  onRestoreExpired,
}: ProjectCardProps) {
  const [copied, setCopied] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Extend Expiration Modal State
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendOption, setExtendOption] = useState<"30" | "60" | "90" | "365" | "never" | "custom">("90");
  const [customDate, setCustomDate] = useState("");
  const [updatingExpiration, setUpdatingExpiration] = useState(false);

  // Compute status
  const isExpired = isProjectExpired(project) || project.status === "expired";
  const isArchived = project.status === "archived";
  const isLive = (project.status === "published" || project.isActive) && !isExpired && !isArchived;
  const isDraft = !isLive && !isExpired && !isArchived;
  const expiringSoon = isLive && isExpiringSoon(project, 7);
  const remainingDays = getRemainingDays(project);

  const formattedDate = project.weddingDate
    ? new Date(project.weddingDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Date not set";

  const formattedExpiry = project.expiresAt
    ? new Date(project.expiresAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Never expires";

  const location = project.branding?.weddingLocation || "";

  const photoCount = project.photoFiles?.length ?? 0;
  const videoCount = project.videoFiles?.length ?? project.mediaFiles?.filter(m => m.mimeType.startsWith("video/")).length ?? 0;
  const favoritesCount = (project as any).favoritesCount ?? 0;
  const selectedCount = (project as any).selectedCount ?? 0;
  const eventsCount = project.events?.length || (videoCount > 0 ? 1 : 0);

  const lastActivityDate = project.updatedAt || project.lastScanned || project.createdAt;
  const formattedLastActivity = lastActivityDate
    ? new Date(lastActivityDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;

  const handleCopyLink = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/gallery/${project.accessCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const galleryUrl = `${window.location.origin}/gallery/${project.accessCode}`;
    const text = `Your wedding memories are ready ❤️\n\nView ${project.coupleName} wedding photos & films:\n${galleryUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleSync = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (syncing || !onSyncProject) return;
    setSyncing(true);
    setSyncMessage("Syncing Google Drive...");
    try {
      await onSyncProject(project.id);
      setSyncMessage("✓ Synced");
      setTimeout(() => setSyncMessage(null), 3000);
    } catch {
      setSyncMessage("Sync error");
      setTimeout(() => setSyncMessage(null), 3000);
    } finally {
      setSyncing(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!onDeleteProject || deleting) return;
    setDeleting(true);
    try {
      await onDeleteProject(project.id);
      setShowDeleteModal(false);
    } catch (err: any) {
      alert(err.message || "Failed to delete project");
      setDeleting(false);
    }
  };

  const handleExtendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onExtendExpiration || updatingExpiration) return;
    setUpdatingExpiration(true);

    try {
      let targetIso: string | null = null;
      const now = new Date();

      if (extendOption === "30") {
        now.setDate(now.getDate() + 30);
        targetIso = now.toISOString();
      } else if (extendOption === "60") {
        now.setDate(now.getDate() + 60);
        targetIso = now.toISOString();
      } else if (extendOption === "90") {
        now.setDate(now.getDate() + 90);
        targetIso = now.toISOString();
      } else if (extendOption === "365") {
        now.setDate(now.getDate() + 365);
        targetIso = now.toISOString();
      } else if (extendOption === "never") {
        targetIso = null;
      } else if (extendOption === "custom") {
        if (!customDate) {
          alert("Please select a valid custom date");
          setUpdatingExpiration(false);
          return;
        }
        targetIso = new Date(customDate).toISOString();
      }

      await onExtendExpiration(project.id, targetIso);
      setShowExtendModal(false);
    } catch (err: any) {
      alert(err.message || "Failed to update expiration");
    } finally {
      setUpdatingExpiration(false);
    }
  };

  return (
    <>
      <div className="glass-panel overflow-hidden border border-white/10 hover:border-amber-400/40 transition-all duration-300 flex flex-col group relative rounded-2xl shadow-xl hover:shadow-2xl">
        {/* Cover / Header Image */}
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-900 border-b border-white/5">
          {project.coverImage ? (
            <img
              src={project.coverImage}
              alt={project.coupleName}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-amber-500/30">
              <Heart className="w-12 h-12 stroke-[1.2]" />
              <span className="text-[11px] font-mono text-amber-400/50 mt-2 tracking-widest uppercase">
                DR Wedding Cinema
              </span>
            </div>
          )}

          {/* Top-left: Access Code Badge */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
            <span className="px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md text-amber-300 text-xs font-mono font-bold border border-amber-400/30 shadow-md">
              {project.accessCode}
            </span>
            {project.settings?.isPasswordProtected && (
              <span className="p-1 rounded-full bg-black/75 backdrop-blur-md text-amber-400 border border-amber-400/30 shadow-md" title="Password Protected">
                <Lock className="w-3 h-3" />
              </span>
            )}
          </div>

          {/* Top-right: Status Badge, Expiry Chip & Actions Menu */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
            {/* Expiring Soon Alert Chip */}
            {expiringSoon && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowExtendModal(true);
                }}
                title={`Expiring in ${remainingDays} days. Click to extend.`}
                className="px-2 py-1 rounded-full text-[10px] font-bold backdrop-blur-md bg-amber-500/30 text-amber-200 border border-amber-400/50 flex items-center gap-1 animate-pulse shadow-md cursor-pointer hover:bg-amber-500/40"
              >
                <AlertTriangle className="w-3 h-3 text-amber-300" />
                <span>{remainingDays !== null ? `${remainingDays}d left` : "Expiring"}</span>
              </button>
            )}

            {/* Lifecycle Status Badge */}
            {isArchived ? (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-md bg-slate-800/90 text-slate-300 border border-white/20 flex items-center gap-1.5 shadow-md">
                <Archive className="w-3 h-3 text-purple-400" />
                Archived
              </span>
            ) : isExpired ? (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowExtendModal(true);
                }}
                title="Gallery Expired. Click to restore & extend."
                className="px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-md bg-rose-500/25 text-rose-300 border border-rose-500/50 hover:bg-rose-500/35 flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Clock className="w-3 h-3 text-rose-400" />
                Expired
              </button>
            ) : isLive ? (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onStatusToggle?.(project.id, true);
                }}
                title="Click to set to Draft"
                className="px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onStatusToggle?.(project.id, false);
                }}
                title="Click to Publish LIVE"
                className="px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-md bg-slate-800/80 text-slate-400 border border-white/10 hover:bg-slate-700/80 flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
              >
                <EyeOff className="w-3 h-3" />
                DRAFT
              </button>
            )}

            {/* 3-Dots Dropdown Menu Toggle */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowMenu((prev) => !prev);
                }}
                className="p-1.5 rounded-full bg-black/75 backdrop-blur-md text-slate-300 hover:text-white border border-white/20 transition-all cursor-pointer shadow-md"
                title="More Actions"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>

              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowMenu(false);
                    }}
                  />
                  <div className="absolute right-0 top-8 w-48 rounded-xl bg-slate-900/95 backdrop-blur-xl border border-white/15 p-1.5 shadow-2xl z-50 text-xs space-y-0.5 animate-in fade-in zoom-in-95 duration-150">
                    <Link
                      href={`/projects/${project.id}`}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-200 hover:bg-white/10 transition-colors"
                      onClick={() => setShowMenu(false)}
                    >
                      <Settings className="w-3.5 h-3.5 text-amber-400" />
                      <span>Open Workspace</span>
                    </Link>

                    <Link
                      href={`/gallery/${project.accessCode}?preview=true`}
                      target="_blank"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-200 hover:bg-white/10 transition-colors"
                      onClick={() => setShowMenu(false)}
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Preview Gallery</span>
                    </Link>

                    <button
                      onClick={(e) => {
                        handleCopyLink(e);
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-200 hover:bg-white/10 transition-colors text-left cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copy Client Link</span>
                    </button>

                    {/* Extend Expiration Action */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowMenu(false);
                        setShowExtendModal(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-200 hover:bg-white/10 transition-colors text-left cursor-pointer"
                    >
                      <CalendarPlus className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isExpired ? "Reactivate / Extend" : "Extend Expiration"}</span>
                    </button>

                    {onDuplicateProject && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowMenu(false);
                          onDuplicateProject(project.id);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-200 hover:bg-white/10 transition-colors text-left cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5 text-purple-400" />
                        <span>Duplicate Wedding</span>
                      </button>
                    )}

                    {onArchiveProject && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowMenu(false);
                          onArchiveProject(project.id, !isArchived);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-200 hover:bg-white/10 transition-colors text-left cursor-pointer"
                      >
                        {isArchived ? (
                          <>
                            <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Restore Wedding</span>
                          </>
                        ) : (
                          <>
                            <Archive className="w-3.5 h-3.5 text-amber-400" />
                            <span>Archive Wedding</span>
                          </>
                        )}
                      </button>
                    )}

                    <div className="h-px bg-white/10 my-1" />

                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowMenu(false);
                        setShowDeleteModal(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors text-left cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Wedding</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Package Badge (bottom-left) */}
          <div className="absolute bottom-3 left-3 z-10">
            <span className="px-2.5 py-0.5 rounded-md bg-black/60 text-amber-200 text-[11px] font-medium border border-amber-500/30 backdrop-blur-md shadow-sm">
              {project.packageType || "Full Wedding Cinema"}
            </span>
          </div>
        </div>

        {/* Card Content Body */}
        <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
          <div>
            {/* Couple Names */}
            <h3 className="text-xl font-serif font-bold text-white tracking-tight group-hover:text-amber-300 transition-colors uppercase line-clamp-1">
              {project.coupleName}
            </h3>

            {/* Wedding Date & Location */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-2">
              <span className="flex items-center gap-1.5 font-sans">
                <Calendar className="w-3.5 h-3.5 text-amber-400/80" />
                {formattedDate}
              </span>
              {location && (
                <>
                  <span className="text-white/20">&bull;</span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-amber-400/80 flex-shrink-0" />
                    <span className="line-clamp-1">{location}</span>
                  </span>
                </>
              )}
            </div>

            {/* Gallery Expiry Info Line */}
            <div className="mt-2 flex items-center gap-1.5 text-[11px]">
              <Clock className={`w-3.5 h-3.5 ${isExpired ? "text-rose-400" : expiringSoon ? "text-amber-400 animate-pulse" : "text-slate-500"}`} />
              <span className={isExpired ? "text-rose-300 font-medium" : expiringSoon ? "text-amber-300 font-medium" : "text-slate-400 font-mono"}>
                {isExpired ? `Expired on ${formattedExpiry}` : project.expiresAt ? `Expires: ${formattedExpiry}` : "Never expires"}
              </span>
            </div>

            {/* 4-Item Counts Row: Photos, Videos, Favorites, Selected */}
            <div className="grid grid-cols-4 gap-1.5 mt-3.5 pt-3 border-t border-white/5">
              <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col items-center justify-center text-center">
                <div className="flex items-center gap-1 text-sky-400 font-mono text-xs font-bold">
                  <ImageIcon className="w-3 h-3" />
                  <span>{photoCount}</span>
                </div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Photos</span>
              </div>

              <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col items-center justify-center text-center">
                <div className="flex items-center gap-1 text-amber-400 font-mono text-xs font-bold">
                  <Film className="w-3 h-3" />
                  <span>{videoCount}</span>
                </div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Videos</span>
              </div>

              <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col items-center justify-center text-center">
                <div className="flex items-center gap-1 text-rose-400 font-mono text-xs font-bold">
                  <Heart className="w-3 h-3 fill-rose-400/30" />
                  <span>{favoritesCount}</span>
                </div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Favs</span>
              </div>

              <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col items-center justify-center text-center">
                <div className="flex items-center gap-1 text-emerald-400 font-mono text-xs font-bold">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{selectedCount}</span>
                </div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Selected</span>
              </div>
            </div>

            {/* Sync Feedback Message */}
            {syncMessage && (
              <div className="mt-3 p-2 rounded-lg bg-amber-500/10 border border-amber-400/30 text-amber-300 text-xs flex items-center gap-2 animate-in fade-in">
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
                <span>{syncMessage}</span>
              </div>
            )}
          </div>

          {/* Footer Actions Row */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
            {/* Left Quick Action Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleSync}
                disabled={syncing}
                className="text-xs font-medium p-2 rounded-lg bg-white/5 hover:bg-amber-400/20 text-slate-300 hover:text-amber-300 transition-all border border-white/10 cursor-pointer"
                title="Sync Google Drive"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin text-amber-400" : ""}`} />
              </button>

              <button
                onClick={handleCopyLink}
                className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all flex items-center gap-1.5 border border-white/10 cursor-pointer"
                title="Copy client gallery link"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300 text-[11px]">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[11px] hidden sm:inline">Copy Link</span>
                  </>
                )}
              </button>

              <button
                onClick={handleWhatsAppShare}
                className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-300 transition-colors border border-emerald-500/30 cursor-pointer"
                title="Share on WhatsApp"
              >
                <MessageCircle className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Right Main Buttons: Preview & Open */}
            <div className="flex items-center gap-1.5">
              <Link
                href={`/gallery/${project.accessCode}?preview=true`}
                target="_blank"
                className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/25 text-amber-300 transition-colors border border-amber-500/30 cursor-pointer"
                title="Preview Client Gallery"
              >
                <ExternalLink className="w-4 h-4" />
              </Link>

              <Link
                href={`/projects/${project.id}`}
                className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold transition-all flex items-center gap-1.5 shadow-md"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Open</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Extend Expiration Modal */}
      {showExtendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel p-6 max-w-md w-full border border-amber-500/30 bg-slate-900/95 space-y-4 shadow-2xl rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <CalendarPlus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-serif font-bold text-white">
                  {isExpired ? "Reactivate & Extend Gallery" : "Extend Gallery Expiration"}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Set how long {project.coupleName}&apos;s gallery remains active.
                </p>
              </div>
            </div>

            <form onSubmit={handleExtendSubmit} className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Choose Validity Duration:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "30", label: "+30 Days" },
                    { id: "60", label: "+60 Days" },
                    { id: "90", label: "+90 Days" },
                    { id: "365", label: "+1 Year" },
                    { id: "never", label: "Never Expire" },
                    { id: "custom", label: "Custom Date" },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setExtendOption(opt.id as any)}
                      className={`p-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        extendOption === opt.id
                          ? "bg-amber-400 text-black border-amber-400 font-bold shadow-md"
                          : "bg-slate-800 text-slate-300 border-white/10 hover:bg-slate-700"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {extendOption === "custom" && (
                <div className="space-y-1.5 animate-in fade-in duration-150">
                  <label className="text-xs text-slate-300 font-medium">Select Expiration Date:</label>
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/20 text-white text-xs focus:outline-none focus:border-amber-400/60"
                    required
                  />
                </div>
              )}

              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 text-[11px] text-slate-400 leading-relaxed">
                <span className="text-amber-300 font-medium">Note:</span> Original high-resolution photos and videos in Google Drive are untouched regardless of gallery expiration dates.
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExtendModal(false)}
                  disabled={updatingExpiration}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingExpiration}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-black bg-amber-400 hover:bg-amber-300 transition-colors flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-400/20"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>{updatingExpiration ? "Updating..." : "Apply Validity"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel p-6 max-w-md w-full border border-rose-500/30 bg-slate-900/95 space-y-4 shadow-2xl rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-serif font-bold text-white">Delete Wedding Project?</h3>
                <p className="text-xs text-slate-400 mt-0.5">Action moves project to trash.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-200 leading-relaxed">
              Are you sure you want to delete <strong className="text-white font-serif">{project.coupleName}</strong>?
              <br /><br />
              This will remove the project from active dashboard views. <strong>Google Drive files will NOT be deleted.</strong>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition-colors flex items-center gap-2 cursor-pointer shadow-lg shadow-rose-600/20"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleting ? "Deleting..." : "Yes, Delete Project"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
