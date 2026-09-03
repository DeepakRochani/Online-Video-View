"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { WeddingProject, isProjectExpired } from "@/lib/project-types";
import ProjectCard from "@/components/ProjectCard";
import { 
  Plus, 
  Search, 
  Film, 
  FolderHeart, 
  Eye, 
  Sparkles, 
  RefreshCw, 
  Heart,
  Layers,
  FolderCheck,
  CheckCircle2,
  SlidersHorizontal,
  ChevronDown,
  Archive,
  Clock,
  ArrowUpDown,
  Calendar,
  Image as ImageIcon,
  Crown,
  TrendingUp,
  ArrowUpRight,
  ShieldCheck,
  BarChart3
} from "lucide-react";
import { AdSlot } from "@/components/ads/AdSlot";

type FilterTab = "all" | "live" | "draft" | "expired" | "archived" | "upcoming" | "recent";
type SortOption = "newest" | "oldest" | "updated" | "photos" | "videos" | "name";

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<WeddingProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [sortBy, setSortBy] = useState<SortOption>("updated");
  const [syncToast, setSyncToast] = useState<string | null>(null);
  const [studioName, setStudioName] = useState("DR FILMS");

  // SaaS Subscription & Usage State
  const [planInfo, setPlanInfo] = useState<{
    planName: string;
    planTier: string;
    projectsCount: number;
    maxProjects: number;
    projectsUsagePercent: number;
    canCreateProject: boolean;
  } | null>(null);

  // Pagination / Incremental loading
  const [displayCount, setDisplayCount] = useState(12);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const [projRes, subRes] = await Promise.all([
        fetch("/api/projects"),
        fetch("/api/billing/subscription"),
      ]);

      if (projRes.ok) {
        const data = await projRes.json();
        setProjects(data.projects || []);
        const brandProject = (data.projects || []).find((p: WeddingProject) => p.branding?.studioName || p.branding?.businessName);
        if (brandProject?.branding) {
          setStudioName(brandProject.branding.studioName || brandProject.branding.businessName || "DR FILMS");
        }
      }

      if (subRes.ok) {
        const subData = await subRes.json();
        if (subData.usage) {
          setPlanInfo({
            planName: subData.usage.planName || "Pro Studio",
            planTier: subData.usage.planTier || "PRO",
            projectsCount: subData.usage.projectsCount || 0,
            maxProjects: subData.usage.maxProjects || 25,
            projectsUsagePercent: subData.usage.projectsUsagePercent || 0,
            canCreateProject: subData.usage.canCreateProject ?? true,
          });
        }
      }
    } catch (err) {
      console.error("Failed to load dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleStatusToggle = async (projectId: string, currentStatus: boolean) => {
    try {
      const action = !currentStatus ? "publish" : "unpublish";
      const res = await fetch(`/api/projects/${projectId}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok && data.project) {
        setProjects((prev) =>
          prev.map((p) => (p.id === projectId ? data.project : p))
        );
        setSyncToast(`✓ Wedding status set to ${data.project.status.toUpperCase()}`);
        setTimeout(() => setSyncToast(null), 3000);
      } else {
        throw new Error(data.error || "Failed to update status");
      }
    } catch (err: any) {
      alert(err.message || "Failed to toggle status");
    }
  };

  const handleSyncProject = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/scan`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setProjects((prev) =>
          prev.map((p) => (p.id === projectId ? data.project : p))
        );
        setSyncToast(data.message || "✓ Sync Complete");
        setTimeout(() => setSyncToast(null), 3500);
      }
    } catch {
      setSyncToast("Sync failed");
      setTimeout(() => setSyncToast(null), 3000);
    }
  };

  const handleDuplicateProject = async (projectId: string) => {
    try {
      setSyncToast("Duplicating wedding project...");
      const res = await fetch(`/api/projects/${projectId}/duplicate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to duplicate");
      setProjects((prev) => [data.project, ...prev]);
      setSyncToast(`✓ Duplicated as "${data.project.coupleName}"`);
      setTimeout(() => setSyncToast(null), 4000);
      router.push(`/projects/${data.project.id}`);
    } catch (err: any) {
      alert(err.message || "Could not duplicate wedding project");
      setSyncToast(null);
    }
  };

  const handleArchiveProject = async (projectId: string, archive: boolean) => {
    try {
      const action = archive ? "archive" : "restore-archive";
      const res = await fetch(`/api/projects/${projectId}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok && data.project) {
        setProjects((prev) =>
          prev.map((p) => (p.id === projectId ? data.project : p))
        );
        setSyncToast(archive ? "✓ Wedding archived" : "✓ Wedding restored to Live");
        setTimeout(() => setSyncToast(null), 3000);
      } else {
        throw new Error(data.error || "Failed to update archive status");
      }
    } catch (err: any) {
      alert(err.message || "Failed to update archive status");
    }
  };

  const handleExtendExpiration = async (projectId: string, expiresAt: string | null) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "extend-expiration", expiresAt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to extend expiration");
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? data.project : p))
      );
      setSyncToast(expiresAt ? `✓ Expiration updated to ${new Date(expiresAt).toLocaleDateString()}` : "✓ Set to never expire");
      setTimeout(() => setSyncToast(null), 3000);
    } catch (err: any) {
      alert(err.message || "Failed to update expiration");
    }
  };

  const handleRestoreExpired = async (projectId: string, days = 90) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore-expired", extensionDays: days }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to restore gallery");
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? data.project : p))
      );
      setSyncToast(`✓ Gallery restored for ${days} days`);
      setTimeout(() => setSyncToast(null), 3000);
    } catch (err: any) {
      alert(err.message || "Failed to restore gallery");
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to delete project");
    }
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    setSyncToast("✓ Wedding project deleted from platform");
    setTimeout(() => setSyncToast(null), 3000);
  };

  // Metrics
  const totalProjects = projects.length;
  const liveCount = projects.filter((p) => (p.status === "published" || p.isActive) && !isProjectExpired(p) && p.status !== "archived").length;
  const draftCount = projects.filter((p) => (p.status === "draft" || (!p.isActive && p.status !== "paused")) && !isProjectExpired(p) && p.status !== "archived").length;
  const expiredCount = projects.filter((p) => isProjectExpired(p) || p.status === "expired").length;
  const archivedCount = projects.filter((p) => p.status === "archived").length;

  const totalPhotos = projects.reduce((acc, p) => acc + (p.photoFiles?.length || 0), 0);
  const totalVideos = projects.reduce((acc, p) => acc + (p.videoFiles?.length || 0), 0);
  const totalFavs = projects.reduce((acc, p) => acc + ((p as any).favoritesCount || 0), 0);
  const totalSelected = projects.reduce((acc, p) => acc + ((p as any).selectedCount || 0), 0);

  // Filter & Search & Sort
  const filteredAndSortedProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const now = new Date();

    const result = projects.filter((p) => {
      const location = p.branding?.weddingLocation || "";
      const matchesSearch = !query ||
        p.coupleName.toLowerCase().includes(query) ||
        location.toLowerCase().includes(query) ||
        (p.weddingDate && p.weddingDate.toLowerCase().includes(query)) ||
        p.accessCode.toLowerCase().includes(query) ||
        p.packageType?.toLowerCase().includes(query) ||
        p.notes?.toLowerCase().includes(query);

      if (!matchesSearch) return false;

      const isExp = isProjectExpired(p) || p.status === "expired";
      const isArch = p.status === "archived";
      const isLive = (p.status === "published" || p.isActive) && !isExp && !isArch;
      const isDraft = !isLive && !isExp && !isArch;

      switch (activeFilter) {
        case "live":
          return isLive;
        case "draft":
          return isDraft;
        case "expired":
          return isExp;
        case "archived":
          return isArch;
        case "upcoming":
          return p.weddingDate ? new Date(p.weddingDate) >= now : false;
        case "recent": {
          const updated = new Date(p.updatedAt || p.createdAt || 0);
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          return updated >= sevenDaysAgo;
        }
        case "all":
        default:
          return !isArch;
      }
    });

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case "newest": {
          const dateA = a.weddingDate ? new Date(a.weddingDate).getTime() : 0;
          const dateB = b.weddingDate ? new Date(b.weddingDate).getTime() : 0;
          return dateB - dateA;
        }
        case "oldest": {
          const dateA = a.weddingDate ? new Date(a.weddingDate).getTime() : Number.MAX_SAFE_INTEGER;
          const dateB = b.weddingDate ? new Date(b.weddingDate).getTime() : Number.MAX_SAFE_INTEGER;
          return dateA - dateB;
        }
        case "updated": {
          const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
          const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
          return dateB - dateA;
        }
        case "photos":
          return (b.photoFiles?.length || 0) - (a.photoFiles?.length || 0);
        case "videos":
          return (b.videoFiles?.length || 0) - (a.videoFiles?.length || 0);
        case "name":
          return a.coupleName.localeCompare(b.coupleName);
        default:
          return 0;
      }
    });

    return result;
  }, [projects, searchQuery, activeFilter, sortBy]);

  const displayedProjects = filteredAndSortedProjects.slice(0, displayCount);
  const hasMore = filteredAndSortedProjects.length > displayCount;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* ── Top Section: Studio SaaS Header & Entitlement Banner ── */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-slate-900/70 to-slate-950 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs uppercase tracking-widest font-mono text-amber-400 font-semibold">
                Studio Management
              </span>
              {planInfo && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 border border-amber-400/40 px-2.5 py-0.5 text-[10px] font-semibold text-amber-300 font-mono uppercase tracking-wider">
                  <Crown className="w-3 h-3" />
                  {planInfo.planName}
                </span>
              )}
            </div>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white tracking-tight">
              Welcome back, <span className="text-amber-300">{studioName}</span>
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              Client wedding delivery platform &bull; High definition streaming directly from Google Drive.
            </p>

            {/* Plan Usage Meter */}
            {planInfo && (
              <div className="mt-4 flex items-center gap-4 text-xs text-slate-300">
                <div className="w-48 bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      planInfo.projectsUsagePercent >= 90
                        ? "bg-red-400"
                        : planInfo.projectsUsagePercent >= 70
                        ? "bg-amber-400"
                        : "bg-emerald-400"
                    }`}
                    style={{ width: `${Math.max(5, planInfo.projectsUsagePercent)}%` }}
                  />
                </div>
                <span className="font-mono text-xs">
                  <strong className="text-white">{planInfo.projectsCount}</strong> / {planInfo.maxProjects} Weddings Used
                </span>
                {planInfo.planTier !== "STUDIO" && (
                  <Link
                    href="/settings?tab=subscription"
                    className="text-amber-400 hover:text-amber-300 underline font-medium text-[11px] flex items-center gap-0.5"
                  >
                    <span>Upgrade Plan</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/analytics"
              className="px-4 py-3 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Analytics & Insights</span>
            </Link>

            <Link
              href="/clients"
              className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs sm:text-sm font-semibold transition-all flex items-center gap-2"
            >
              <span>View Clients</span>
            </Link>

            <Link
              href="/projects/new"
              className="wedding-gold-btn text-xs sm:text-sm px-5 py-3 shadow-xl flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ Create Wedding</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Photographer Dashboard Top Banner Slot (Entitlement & AdSense Governed) */}
      <AdSlot placement="PHOTOGRAPHER_DASHBOARD_TOP" />

      {/* Sync Toast Notification */}
      {syncToast && (
        <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-400/30 text-amber-200 text-xs flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-200 shadow-xl">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{syncToast}</span>
          </div>
          <button onClick={() => setSyncToast(null)} className="text-slate-400 hover:text-white text-xs cursor-pointer">✕</button>
        </div>
      )}

      {/* ── 5-Metrics Cards Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="glass-panel p-4 border border-white/10 flex items-center gap-3 rounded-2xl">
          <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/25">
            <FolderHeart className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-white font-mono">{totalProjects}</div>
            <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Total Weddings</div>
          </div>
        </div>

        <div className="glass-panel p-4 border border-white/10 flex items-center gap-3 rounded-2xl">
          <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-emerald-300 font-mono">{liveCount}</div>
            <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Live Galleries</div>
          </div>
        </div>

        <div className="glass-panel p-4 border border-white/10 flex items-center gap-3 rounded-2xl">
          <div className="p-2.5 rounded-xl bg-sky-500/15 text-sky-300 border border-sky-500/25">
            <ImageIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-sky-300 font-mono">{totalPhotos}</div>
            <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Total Photos</div>
          </div>
        </div>

        <div className="glass-panel p-4 border border-white/10 flex items-center gap-3 rounded-2xl">
          <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-300 border border-purple-500/25">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-purple-300 font-mono">{totalVideos}</div>
            <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Total Films</div>
          </div>
        </div>

        <div className="glass-panel p-4 border border-white/10 flex items-center gap-3 rounded-2xl">
          <div className="p-2.5 rounded-xl bg-rose-500/15 text-rose-300 border border-rose-500/25">
            <Heart className="w-5 h-5 fill-rose-400/20" />
          </div>
          <div>
            <div className="text-xl font-bold text-rose-300 font-mono">{totalFavs + totalSelected}</div>
            <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Favs & Selections</div>
          </div>
        </div>
      </div>

      {/* ── Search, Filters, and Sorting Controls ── */}
      <div className="glass-panel p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 border border-white/10 rounded-2xl">
        {/* Fast Search Input */}
        <div className="relative w-full lg:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search couple names, location, date, access code..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setDisplayCount(12); // Reset page limit
            }}
            className="w-full pl-10 pr-8 py-2 rounded-xl bg-slate-900/80 border border-white/15 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-400/60"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Chips & Sorting Dropdown */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: "all", label: "All", count: totalProjects - archivedCount },
              { id: "live", label: "Live", count: liveCount },
              { id: "draft", label: "Draft", count: draftCount },
              { id: "expired", label: "Expired", count: expiredCount },
              { id: "archived", label: "Archived", count: archivedCount },
              { id: "upcoming", label: "Upcoming" },
              { id: "recent", label: "Recently Updated" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveFilter(tab.id as FilterTab);
                  setDisplayCount(12);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeFilter === tab.id
                    ? "bg-amber-400 text-black shadow-md font-bold"
                    : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/5"
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`px-1.5 py-0.2 text-[10px] rounded-full ${activeFilter === tab.id ? "bg-black/20 text-black" : "bg-white/10 text-slate-400"}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 pl-2 border-l border-white/10">
            <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-slate-900 border border-white/15 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-amber-400/50 cursor-pointer"
            >
              <option value="updated">Recently Updated</option>
              <option value="newest">Newest Wedding</option>
              <option value="oldest">Oldest Wedding</option>
              <option value="photos">Most Photos</option>
              <option value="videos">Most Videos</option>
              <option value="name">Couple Name (A-Z)</option>
            </select>

            <button
              onClick={fetchProjects}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
              title="Refresh list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-amber-400" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Projects Grid & Empty States ── */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-4 text-slate-400">
          <div className="loader-spin w-8 h-8 border-3 border-amber-400 border-t-transparent" />
          <span className="text-sm font-medium">Loading wedding client projects...</span>
        </div>
      ) : filteredAndSortedProjects.length === 0 ? (
        <div className="glass-panel py-20 px-6 text-center border border-white/10 max-w-xl mx-auto flex flex-col items-center shadow-xl rounded-2xl">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-400/20 text-amber-300 flex items-center justify-center mb-4">
            <Heart className="w-8 h-8 stroke-[1.2]" />
          </div>
          <h3 className="text-xl font-serif font-bold text-white">
            {searchQuery
              ? "No matching wedding galleries found"
              : activeFilter === "archived"
              ? "No archived wedding galleries"
              : activeFilter === "expired"
              ? "No expired wedding galleries"
              : "No wedding galleries yet"}
          </h3>
          <p className="text-slate-400 text-xs sm:text-sm mt-2 max-w-sm">
            {searchQuery
              ? "Try adjusting your search terms or switch filter chips."
              : activeFilter !== "all"
              ? `There are no projects under the "${activeFilter}" filter.`
              : "Connect your Google Drive wedding folder and generate a luxury client gallery in seconds."}
          </p>

          {activeFilter !== "all" || searchQuery ? (
            <button
              onClick={() => {
                setActiveFilter("all");
                setSearchQuery("");
              }}
              className="mt-6 px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-all cursor-pointer"
            >
              Reset Filters & Search
            </button>
          ) : (
            <Link
              href="/projects/new"
              className="wedding-gold-btn mt-6 text-xs px-6 py-2.5 shadow-xl flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ Create Your First Wedding Gallery</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Active Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onStatusToggle={handleStatusToggle}
                onSyncProject={handleSyncProject}
                onDuplicateProject={handleDuplicateProject}
                onArchiveProject={handleArchiveProject}
                onDeleteProject={handleDeleteProject}
                onExtendExpiration={handleExtendExpiration}
                onRestoreExpired={handleRestoreExpired}
              />
            ))}
          </div>

          {/* Incremental Pagination / Load More */}
          {hasMore && (
            <div className="flex flex-col items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setDisplayCount((prev) => prev + 12)}
                className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-amber-300 text-xs font-semibold border border-amber-500/20 hover:border-amber-400/40 transition-all cursor-pointer shadow-lg"
              >
                Load More Weddings ({filteredAndSortedProjects.length - displayCount} remaining)
              </button>
              <span className="text-[11px] text-slate-500">
                Showing {displayedProjects.length} of {filteredAndSortedProjects.length} weddings
              </span>
            </div>
          )}
        </div>
      )}

      {/* Photographer Dashboard Bottom Banner Slot */}
      <AdSlot placement="PHOTOGRAPHER_DASHBOARD_BOTTOM" />
    </div>
  );
}
