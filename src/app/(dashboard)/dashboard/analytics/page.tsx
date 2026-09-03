"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { 
  BarChart3, 
  Calendar, 
  ChevronDown, 
  Eye, 
  Heart, 
  CheckSquare, 
  Film, 
  Play, 
  CheckCircle2, 
  Download, 
  Share2, 
  QrCode, 
  HardDrive, 
  Clock, 
  Users, 
  Sparkles, 
  Filter, 
  ArrowUpRight, 
  FolderHeart, 
  TrendingUp, 
  Activity, 
  Smartphone, 
  Monitor, 
  Tablet, 
  Info,
  RefreshCw,
  Award,
  Layers
} from "lucide-react";
import { PhotographerAnalyticsResponse, TimeRangeOption } from "@/lib/analytics";
import { WeddingProject } from "@/lib/project-types";

export default function PhotographerAnalyticsPage() {
  const [data, setData] = useState<PhotographerAnalyticsResponse | null>(null);
  const [projects, setProjects] = useState<WeddingProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [range, setRange] = useState<TimeRangeOption>("30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [activeChartMetric, setActiveChartMetric] = useState<"views" | "favorites" | "selections" | "videoPlays">("views");
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; point: any } | null>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("range", range);
      if (range === "custom") {
        if (customStart) params.set("startDate", customStart);
        if (customEnd) params.set("endDate", customEnd);
      }
      if (selectedProjectId) {
        params.set("projectId", selectedProjectId);
      }

      const res = await fetch(`/api/dashboard/analytics?${params.toString()}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to load analytics");
      }
      const json: PhotographerAnalyticsResponse = await res.json();
      setData(json);
    } catch (err: any) {
      console.error("Analytics fetch failed:", err);
      setError(err.message || "Failed to load studio analytics");
    } finally {
      setLoading(false);
    }
  };

  // Fetch projects list for filter dropdown
  useEffect(() => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then((d) => setProjects(d.projects || []))
      .catch(() => {});
  }, []);

  // Fetch analytics whenever filters change
  useEffect(() => {
    fetchAnalytics();
  }, [range, customStart, customEnd, selectedProjectId]);

  // SVG Chart Calculations
  const chartData = data?.timeseries || [];
  const maxChartValue = useMemo(() => {
    if (!chartData.length) return 10;
    const maxVal = Math.max(
      ...chartData.map((d) => {
        if (activeChartMetric === "views") return d.views;
        if (activeChartMetric === "favorites") return d.favorites;
        if (activeChartMetric === "selections") return d.selections;
        if (activeChartMetric === "videoPlays") return d.videoPlays;
        return 0;
      })
    );
    return Math.max(5, Math.ceil(maxVal * 1.15));
  }, [chartData, activeChartMetric]);

  const chartPoints = useMemo(() => {
    if (!chartData.length) return [];
    const width = 800;
    const height = 220;
    const padding = 30;

    return chartData.map((d, index) => {
      const x = padding + (index / Math.max(1, chartData.length - 1)) * (width - padding * 2);
      const val = d[activeChartMetric] || 0;
      const y = height - padding - (val / maxChartValue) * (height - padding * 2);
      return { x, y, val, data: d };
    });
  }, [chartData, activeChartMetric, maxChartValue]);

  const svgPath = useMemo(() => {
    if (!chartPoints.length) return "";
    return chartPoints.reduce((acc, curr, index) => {
      return `${acc} ${index === 0 ? "M" : "L"} ${curr.x} ${curr.y}`;
    }, "");
  }, [chartPoints]);

  const svgArea = useMemo(() => {
    if (!chartPoints.length) return "";
    const first = chartPoints[0];
    const last = chartPoints[chartPoints.length - 1];
    const bottomY = 220 - 30;
    return `${svgPath} L ${last.x} ${bottomY} L ${first.x} ${bottomY} Z`;
  }, [chartPoints, svgPath]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-20">
      {/* ── Page Header & Controls ── */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-slate-900/80 to-slate-950 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs uppercase tracking-widest font-mono text-amber-400 font-semibold flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5" />
                Photographer Analytics & Client Insights
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white tracking-tight">
              Studio Engagement & Performance
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl">
              Real-time client gallery interactions, album selection progress, film viewership, and storage metrics computed directly from authentic client visits.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => fetchAnalytics()}
              disabled={loading}
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-amber-400/40 text-slate-300 hover:text-amber-300 transition-all cursor-pointer flex items-center gap-2 text-xs font-semibold"
              title="Refresh Analytics"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-400" : ""}`} />
              <span className="hidden sm:inline">Refresh Data</span>
            </button>
          </div>
        </div>

        {/* ── Filter Toolbar ── */}
        <div className="mt-6 pt-6 border-t border-white/10 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Time Range Pills */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {[
              { label: "Today", value: "today" },
              { label: "7 Days", value: "7d" },
              { label: "30 Days", value: "30d" },
              { label: "90 Days", value: "90d" },
              { label: "This Year", value: "this_year" },
              { label: "All Time", value: "all" },
              { label: "Custom", value: "custom" },
            ].map((t) => (
              <button
                key={t.value}
                onClick={() => setRange(t.value as TimeRangeOption)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  range === t.value
                    ? "bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20"
                    : "bg-white/5 text-slate-300 hover:bg-white/10 border border-white/5 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Project Selector & Custom Dates */}
          <div className="flex flex-wrap items-center gap-3">
            {range === "custom" && (
              <div className="flex items-center gap-2 bg-slate-900/90 border border-white/10 px-3 py-1.5 rounded-xl text-xs">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="bg-transparent text-slate-200 focus:outline-none text-xs"
                />
                <span className="text-slate-500">to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="bg-transparent text-slate-200 focus:outline-none text-xs"
                />
              </div>
            )}

            {/* Gallery Dropdown Filter */}
            <div className="relative min-w-[200px]">
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full appearance-none bg-slate-900/90 border border-white/15 hover:border-amber-400/40 text-slate-200 text-xs px-3.5 py-2 pr-8 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer font-medium"
              >
                <option value="">All Wedding Galleries ({projects.length})</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.coupleName} ({p.accessCode})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => fetchAnalytics()} className="underline hover:text-white cursor-pointer">Retry</button>
        </div>
      )}

      {/* ── Metric Cards Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Views */}
        <div className="glass-panel p-4 border border-white/10 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Gallery Views</span>
            <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-white font-mono">
              {data ? data.overview.totalGalleryViews.toLocaleString() : "..."}
            </div>
            <div className="text-[10px] text-amber-400/90 font-mono mt-1">
              {data ? `${data.overview.uniqueVisits.toLocaleString()} unique visitors` : "Loading..."}
            </div>
          </div>
        </div>

        {/* Client Favorites */}
        <div className="glass-panel p-4 border border-white/10 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Client Favorites</span>
            <div className="p-1.5 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30">
              <Heart className="w-4 h-4 fill-rose-400/20" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-rose-300 font-mono">
              {data ? data.overview.totalClientFavorites.toLocaleString() : "..."}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Loved by couples & family
            </div>
          </div>
        </div>

        {/* Album Selections */}
        <div className="glass-panel p-4 border border-white/10 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Album Selections</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-emerald-300 font-mono">
              {data ? data.overview.totalSelectedMedia.toLocaleString() : "..."}
            </div>
            <div className="text-[10px] text-emerald-400/90 font-mono mt-1">
              {data ? `${data.overview.totalSelectionSubmissions} submitted orders` : ""}
            </div>
          </div>
        </div>

        {/* Film Plays */}
        <div className="glass-panel p-4 border border-white/10 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Film Plays</span>
            <div className="p-1.5 rounded-lg bg-purple-500/15 text-purple-300 border border-purple-500/30">
              <Film className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-purple-300 font-mono">
              {data ? data.overview.totalVideoPlays.toLocaleString() : "..."}
            </div>
            <div className="text-[10px] text-purple-400/90 font-mono mt-1">
              {data ? `${data.overview.totalVideoCompletions} 100% watched` : ""}
            </div>
          </div>
        </div>

        {/* Client Engagement Score */}
        <div className="glass-panel p-4 border border-white/10 rounded-2xl flex flex-col justify-between relative group">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Engagement</span>
              <Info className="w-3 h-3 text-slate-500 hover:text-slate-300 cursor-help" />
            </div>
            <div className="p-1.5 rounded-lg bg-sky-500/15 text-sky-300 border border-sky-500/30">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-sky-300 font-mono">
              {data ? `${data.overview.overallEngagementScore}/100` : "..."}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Formula: visits + favs + sels + films
            </div>
          </div>
        </div>

        {/* Cloud Storage Meter */}
        <div className="glass-panel p-4 border border-white/10 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Storage Used</span>
            <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-white font-mono">
              {data ? data.overview.storageUsedFormatted : "..."}
            </div>
            <div className="text-[10px] text-slate-400 mt-1 font-mono">
              Limit: {data ? data.overview.planStorageLimitFormatted : "..."}
            </div>
          </div>
        </div>
      </div>

      {/* ── Interactive Timeseries Chart ── */}
      <div className="glass-panel p-6 border border-white/10 rounded-3xl relative overflow-hidden shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" />
              <h2 className="text-base sm:text-lg font-serif font-bold text-white">Client Engagement Timeline</h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Daily trend of genuine client interactions over selected period.
            </p>
          </div>

          {/* Metric Selector Pills */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-white/10 text-xs">
            {[
              { id: "views", label: "Gallery Views", icon: Eye, color: "text-amber-300" },
              { id: "favorites", label: "Favorites", icon: Heart, color: "text-rose-300" },
              { id: "selections", label: "Selections", icon: CheckSquare, color: "text-emerald-300" },
              { id: "videoPlays", label: "Film Plays", icon: Play, color: "text-purple-300" },
            ].map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  onClick={() => setActiveChartMetric(m.id as any)}
                  className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeChartMetric === m.id
                      ? "bg-amber-400/20 text-amber-300 border border-amber-400/40 shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* SVG Chart Area */}
        <div className="relative w-full h-[230px] overflow-hidden">
          {chartPoints.length > 1 ? (
            <svg
              viewBox="0 0 800 220"
              className="w-full h-full overflow-visible"
              preserveAspectRatio="none"
              onMouseLeave={() => setHoveredPoint(null)}
            >
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = 220 - 30 - ratio * (220 - 60);
                return (
                  <g key={ratio}>
                    <line x1="30" y1={y} x2="770" y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                    <text x="25" y={y + 3} textAnchor="end" fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="monospace">
                      {Math.round(ratio * maxChartValue)}
                    </text>
                  </g>
                );
              })}

              {/* Area Fill */}
              <path d={svgArea} fill="url(#chartGradient)" />

              {/* Line Stroke */}
              <path d={svgPath} fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

              {/* Data points */}
              {chartPoints.map((p, idx) => (
                <circle
                  key={idx}
                  cx={p.x}
                  cy={p.y}
                  r={hoveredPoint?.point === p.data ? 5 : p.val > 0 ? 3.5 : 2}
                  className={`transition-all duration-150 cursor-pointer ${
                    hoveredPoint?.point === p.data
                      ? "fill-amber-300 stroke-slate-950 stroke-2"
                      : p.val > 0
                      ? "fill-amber-400 hover:fill-white"
                      : "fill-slate-700"
                  }`}
                  onMouseEnter={() => setHoveredPoint({ x: p.x, y: p.y, point: p.data })}
                />
              ))}
            </svg>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
              <Activity className="w-8 h-8 stroke-1 text-slate-600 mb-2" />
              <p className="text-xs">No activity recorded for this period yet.</p>
              <p className="text-[11px] text-slate-600 mt-0.5">Share your gallery link to see real-time visitor interactions.</p>
            </div>
          )}

          {/* Interactive Tooltip Overlay */}
          {hoveredPoint && (
            <div
              className="absolute pointer-events-none z-30 p-2.5 rounded-xl bg-slate-900/95 border border-amber-400/40 text-xs shadow-2xl backdrop-blur-md -translate-x-1/2 -translate-y-full -mt-2 font-mono text-slate-200"
              style={{ left: `${(hoveredPoint.x / 800) * 100}%`, top: `${(hoveredPoint.y / 220) * 100}%` }}
            >
              <div className="font-bold text-amber-300 mb-1">{hoveredPoint.point.label}</div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-slate-400 capitalize">{activeChartMetric}:</span>
                <span className="font-bold text-white">{hoveredPoint.point[activeChartMetric]}</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {hoveredPoint.point.uniqueVisits} unique visitors
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Event Breakdown & Video Performance Two-Column ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Event Breakdown (Baraat, Reception, Haldi, etc.) */}
        <div className="glass-panel p-6 border border-white/10 rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <h2 className="text-base font-serif font-bold text-white">Event Category Breakdown</h2>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              {data?.eventBreakdown.length || 0} Events tracked
            </span>
          </div>

          {data && data.eventBreakdown.length > 0 ? (
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {data.eventBreakdown.map((evt, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-white/5 border border-white/5 hover:border-amber-400/20 transition-all flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-xs sm:text-sm text-white">{evt.eventName}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {evt.totalMediaCount} media items in event
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono">
                    <div className="text-right">
                      <div className="text-amber-300 font-bold">{evt.views}</div>
                      <div className="text-[9px] text-slate-400 uppercase">Views</div>
                    </div>
                    <div className="text-right">
                      <div className="text-rose-300 font-bold">{evt.favorites}</div>
                      <div className="text-[9px] text-slate-400 uppercase">Favs</div>
                    </div>
                    <div className="text-right">
                      <div className="text-emerald-300 font-bold">{evt.selections}</div>
                      <div className="text-[9px] text-slate-400 uppercase">Selected</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs">
              No event categorization metrics recorded for this period yet.
            </div>
          )}
        </div>

        {/* Video & Film Watch Performance */}
        <div className="glass-panel p-6 border border-white/10 rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-purple-400" />
              <h2 className="text-base font-serif font-bold text-white">Cinema & Video Performance</h2>
            </div>
            <span className="text-[11px] text-purple-400 font-mono">
              {data?.overview.totalVideoPlays || 0} Total Plays
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center">
              <div className="text-xl font-bold font-mono text-purple-300">
                {data?.overview.totalVideoPlays || 0}
              </div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Total Plays</div>
            </div>
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center">
              <div className="text-xl font-bold font-mono text-purple-300">
                {data?.overview.totalVideoCompletions || 0}
              </div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">100% Finished</div>
            </div>
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center">
              <div className="text-xl font-bold font-mono text-purple-300">
                {data ? Math.round(data.overview.totalWatchTimeSeconds / 60) : 0}m
              </div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Watch Time</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-300 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Completion Rate</span>
              <span className="font-mono font-bold text-white">
                {data && data.overview.totalVideoPlays > 0
                  ? `${Math.round((data.overview.totalVideoCompletions / data.overview.totalVideoPlays) * 100)}%`
                  : "0%"}
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-purple-400 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${
                    data && data.overview.totalVideoPlays > 0
                      ? Math.min(100, (data.overview.totalVideoCompletions / data.overview.totalVideoPlays) * 100)
                      : 0
                  }%`,
                }}
              />
            </div>
            <p className="text-[11px] text-slate-400 pt-1">
              Plays are captured from authentic modal playback starts and exclude web crawlers or video stream byte-range requests.
            </p>
          </div>
        </div>
      </div>

      {/* ── Top Performing Media ── */}
      <div className="glass-panel p-6 border border-white/10 rounded-3xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-400" />
            <h2 className="text-base sm:text-lg font-serif font-bold text-white">Top Performing Media</h2>
          </div>
          <span className="text-xs text-slate-400">Ranked by client favorites and album selections</span>
        </div>

        {data && (data.topFavoritedMedia.length > 0 || data.topSelectedMedia.length > 0) ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {data.topFavoritedMedia.slice(0, 8).map((item) => (
              <div
                key={item.id}
                className="group relative rounded-2xl overflow-hidden border border-white/10 bg-slate-900/60 flex flex-col justify-between"
              >
                <div className="aspect-[4/3] relative bg-slate-800 overflow-hidden">
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600">
                      <Film className="w-6 h-6" />
                    </div>
                  )}

                  {/* Favorite Badge */}
                  <div className="absolute top-2 right-2 bg-slate-950/80 backdrop-blur-md px-2 py-0.5 rounded-md border border-rose-500/30 text-rose-300 text-[10px] font-mono font-bold flex items-center gap-1">
                    <Heart className="w-2.5 h-2.5 fill-rose-400" />
                    {item.favoritesCount}
                  </div>
                </div>

                <div className="p-2.5">
                  <div className="text-[11px] font-semibold text-white truncate" title={item.name}>
                    {item.name}
                  </div>
                  <div className="text-[9px] text-amber-400/80 truncate font-mono mt-0.5">
                    {item.galleryName}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500 text-xs">
            No top favorited media recorded yet. Once couples tap hearts on their photos, they will appear here.
          </div>
        )}
      </div>

      {/* ── Client Selection & Gallery Delivery Tracker ── */}
      <div className="glass-panel p-6 border border-white/10 rounded-3xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <h2 className="text-base sm:text-lg font-serif font-bold text-white">Client Selection & Delivery Status</h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live progress of photo album selections, submission status, and client milestones.
            </p>
          </div>
        </div>

        {data && data.weddingsEngagement.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 uppercase text-[10px] font-mono tracking-wider">
                  <th className="pb-3 font-semibold">Wedding Couple</th>
                  <th className="pb-3 font-semibold">Access Code</th>
                  <th className="pb-3 font-semibold">Unique Visits</th>
                  <th className="pb-3 font-semibold">Favorites</th>
                  <th className="pb-3 font-semibold">Album Selections</th>
                  <th className="pb-3 font-semibold">Submission Status</th>
                  <th className="pb-3 font-semibold">Engagement</th>
                  <th className="pb-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.weddingsEngagement.map((w) => {
                  const selPercent = Math.min(
                    100,
                    Math.round((w.selectedCount / Math.max(1, w.minSelections)) * 100)
                  );
                  return (
                    <tr key={w.projectId} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 pr-3">
                        <div className="font-semibold text-white">{w.coupleName}</div>
                        <div className="text-[10px] text-slate-400">
                          {w.weddingDate ? new Date(w.weddingDate).toLocaleDateString() : "No date set"}
                        </div>
                      </td>
                      <td className="py-3.5 pr-3 font-mono text-amber-300 font-bold">
                        {w.accessCode}
                      </td>
                      <td className="py-3.5 pr-3 font-mono">
                        <span className="text-white font-bold">{w.uniqueVisits}</span>
                        <span className="text-slate-500 text-[10px] ml-1">({w.totalVisits} total)</span>
                      </td>
                      <td className="py-3.5 pr-3 font-mono text-rose-300 font-bold">
                        {w.favoritesCount}
                      </td>
                      <td className="py-3.5 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-emerald-300 font-bold">
                            {w.selectedCount} / {w.minSelections}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">({selPercent}%)</span>
                        </div>
                        <div className="w-24 bg-slate-800 rounded-full h-1.5 mt-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              w.isSelectionSubmitted ? "bg-emerald-400" : "bg-amber-400"
                            }`}
                            style={{ width: `${selPercent}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3.5 pr-3">
                        {w.isSelectionSubmitted ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono font-bold">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Submitted {w.selectionSubmittedAt ? new Date(w.selectionSubmittedAt).toLocaleDateString() : ""}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-mono">
                            <Clock className="w-2.5 h-2.5" />
                            In Progress
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 pr-3 font-mono font-bold text-sky-300">
                        {w.engagementScore}/100
                      </td>
                      <td className="py-3.5 text-right">
                        <Link
                          href={`/gallery/${w.accessCode}?preview=true`}
                          target="_blank"
                          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-semibold text-slate-300 hover:text-white transition-all inline-flex items-center gap-1"
                        >
                          View <ArrowUpRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500 text-xs">
            No wedding galleries available to track.
          </div>
        )}
      </div>

      {/* ── Live Activity Stream ── */}
      <div className="glass-panel p-6 border border-white/10 rounded-3xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" />
            <h2 className="text-base font-serif font-bold text-white">Live Client Activity Stream</h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">Real-time event feed</span>
        </div>

        {data && data.recentActivity.length > 0 ? (
          <div className="divide-y divide-white/5 max-h-[320px] overflow-y-auto pr-1">
            {data.recentActivity.map((act) => (
              <div key={act.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  <div>
                    <span className="font-semibold text-white">{act.coupleName}: </span>
                    <span className="text-slate-300">{act.description}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono">
                  {act.deviceCategory && (
                    <span className="hidden sm:inline-flex items-center gap-1 text-slate-400 capitalize">
                      {act.deviceCategory === "mobile" && <Smartphone className="w-3 h-3" />}
                      {act.deviceCategory === "tablet" && <Tablet className="w-3 h-3" />}
                      {act.deviceCategory === "desktop" && <Monitor className="w-3 h-3" />}
                      {act.deviceCategory}
                    </span>
                  )}
                  <span>{new Date(act.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500 text-xs">
            No live activity recorded yet in this time window.
          </div>
        )}
      </div>
    </div>
  );
}
