"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ClientSummary } from "@/lib/project-types";
import {
  Users,
  Search,
  Heart,
  CheckCircle2,
  Clock,
  ExternalLink,
  Copy,
  Check,
  Share2,
  Calendar,
  MapPin,
  Sparkles,
  FolderHeart,
  SlidersHorizontal,
  Image as ImageIcon,
  Film,
  Download,
  ArrowUpRight
} from "lucide-react";

type ClientFilter = "all" | "submitted" | "in_progress" | "live" | "draft" | "expired";

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<ClientFilter>("all");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/clients");
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients || []);
      }
    } catch (err) {
      console.error("Failed to load clients", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleCopyLink = (accessCode: string) => {
    const url = `${window.location.origin}/gallery/${accessCode}`;
    navigator.clipboard.writeText(url);
    setCopiedCode(accessCode);
    setTimeout(() => setCopiedCode(null), 3000);
  };

  const handleShareWhatsApp = (client: ClientSummary) => {
    const url = `${window.location.origin}/gallery/${client.accessCode}`;
    const text = encodeURIComponent(
      `Hello ${client.coupleName}! ✨ Here is the private link to your wedding video and photo gallery:\n\n${url}\n\nEnjoy your beautiful memories!`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  // Metrics
  const totalClients = clients.length;
  const liveGalleries = clients.filter((c) => c.status === "published").length;
  const submittedSelections = clients.filter((c) => c.selectionStatus === "SUBMITTED").length;
  const inProgressSelections = clients.filter(
    (c) => c.selectionStatus === "OPEN" && c.selectionCount > 0
  ).length;

  const filteredClients = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return clients.filter((client) => {
      const matchesSearch =
        !query ||
        client.coupleName.toLowerCase().includes(query) ||
        client.accessCode.toLowerCase().includes(query) ||
        (client.weddingLocation && client.weddingLocation.toLowerCase().includes(query)) ||
        (client.weddingDate && client.weddingDate.toLowerCase().includes(query)) ||
        (client.packageType && client.packageType.toLowerCase().includes(query));

      if (!matchesSearch) return false;

      switch (activeFilter) {
        case "submitted":
          return client.selectionStatus === "SUBMITTED";
        case "in_progress":
          return client.selectionStatus === "OPEN" && client.selectionCount > 0;
        case "live":
          return client.status === "published";
        case "draft":
          return client.status === "draft";
        case "expired":
          return client.status === "expired";
        default:
          return true;
      }
    });
  }, [clients, searchQuery, activeFilter]);

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-slate-900/60 to-slate-950 p-8 shadow-2xl backdrop-blur-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3.5 py-1 text-xs font-semibold text-amber-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Client Delivery & CRM</span>
            </div>
            <h1 className="mt-3 font-serif text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Client Management
            </h1>
            <p className="mt-2 text-sm text-slate-400 max-w-xl">
              Track your couples, monitor album selection milestones, and manage luxury delivery links across all wedding projects.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/projects/new"
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-semibold text-sm shadow-lg shadow-amber-500/20 hover:scale-[1.02] transition-all flex items-center gap-2"
            >
              <FolderHeart className="w-4 h-4" />
              <span>New Wedding Client</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Couples</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-white font-mono">{totalClients}</p>
          <span className="text-[11px] text-slate-500">Delivered on platform</span>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-400">Live Galleries</span>
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-300 font-mono">{liveGalleries}</p>
          <span className="text-[11px] text-emerald-500/80">Active for guests & couples</span>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-400">Selections Received</span>
            <CheckCircle2 className="w-4 h-4 text-amber-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-300 font-mono">{submittedSelections}</p>
          <span className="text-[11px] text-amber-500/80">Ready for album design</span>
        </div>

        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-blue-400">In Selection</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-blue-300 font-mono">{inProgressSelections}</p>
          <span className="text-[11px] text-blue-500/80">Couples picking favorites</span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by couple, location, code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-slate-900/80 pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-amber-400/50 focus:outline-none focus:ring-1 focus:ring-amber-400/50"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
          {(
            [
              { id: "all", label: "All Clients" },
              { id: "submitted", label: "Selection Received" },
              { id: "in_progress", label: "In Progress" },
              { id: "live", label: "Live" },
              { id: "draft", label: "Draft" },
            ] as { id: ClientFilter; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                activeFilter === tab.id
                  ? "bg-amber-400/20 text-amber-300 border border-amber-400/40"
                  : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Client List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-amber-400/20 border-t-amber-400 animate-spin" />
            <span className="text-xs text-slate-400">Loading client directory...</span>
          </div>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-slate-900/30 p-12 text-center">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="font-serif text-lg font-bold text-white">No Clients Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? "No clients match your search criteria. Try a different query."
              : "Create a new wedding project to begin managing client deliveries."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredClients.map((client) => {
            const isSubmitted = client.selectionStatus === "SUBMITTED";
            const percent = client.selectionLimit
              ? Math.min(100, Math.round((client.selectionCount / client.selectionLimit) * 100))
              : 0;

            return (
              <div
                key={client.projectId}
                className="group relative rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl hover:border-amber-500/30 transition-all shadow-lg flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Couple Name & Status */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-serif text-lg font-bold text-white group-hover:text-amber-300 transition-colors">
                        {client.coupleName}
                      </h3>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                        {client.weddingDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-amber-400/70" />
                            {client.weddingDate}
                          </span>
                        )}
                        {client.weddingLocation && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-amber-400/70" />
                            {client.weddingLocation}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider ${
                          client.status === "published"
                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                            : client.status === "expired"
                            ? "bg-red-500/15 text-red-300 border border-red-500/30"
                            : "bg-slate-800 text-slate-400 border border-white/10"
                        }`}
                      >
                        {client.status}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        Code: {client.accessCode}
                      </span>
                    </div>
                  </div>

                  {/* Album Selection Status Box */}
                  <div className="mt-5 rounded-xl border border-white/5 bg-slate-950/50 p-4">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="flex items-center gap-1.5 font-medium text-slate-300">
                        <Heart className="w-3.5 h-3.5 text-rose-400" />
                        <span>Album Selection</span>
                      </span>
                      {isSubmitted ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Submitted ({client.selectionCount} photos)</span>
                        </span>
                      ) : client.selectionCount > 0 ? (
                        <span className="text-[11px] font-medium text-amber-400">
                          In Progress ({client.selectionCount}/{client.selectionLimit || 20})
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500">Not Started</span>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isSubmitted
                            ? "bg-emerald-400"
                            : client.selectionCount > 0
                            ? "bg-amber-400"
                            : "bg-slate-700"
                        }`}
                        style={{ width: `${percent || (client.selectionCount > 0 ? 10 : 0)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between mt-3 text-[11px] text-slate-400">
                      <span className="flex items-center gap-2">
                        <span className="flex items-center gap-1">
                          <ImageIcon className="w-3 h-3 text-slate-500" />
                          {client.totalPhotos} Photos
                        </span>
                        <span>&bull;</span>
                        <span className="flex items-center gap-1">
                          <Film className="w-3 h-3 text-slate-500" />
                          {client.totalVideos} Films
                        </span>
                      </span>

                      <span className="text-slate-500">
                        Favorites: {client.favoritesCount}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleCopyLink(client.accessCode)}
                      className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 border border-white/5 transition-all text-xs flex items-center gap-1"
                      title="Copy Direct Link"
                    >
                      {copiedCode === client.accessCode ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span className="hidden sm:inline">
                        {copiedCode === client.accessCode ? "Copied" : "Copy Link"}
                      </span>
                    </button>

                    <button
                      onClick={() => handleShareWhatsApp(client)}
                      className="p-2 rounded-xl text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-emerald-500/20 transition-all text-xs flex items-center gap-1"
                      title="Share on WhatsApp"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">WhatsApp</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/projects/${client.projectId}`}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 border border-white/10 transition-all"
                    >
                      Project
                    </Link>

                    <Link
                      href={`/gallery/${client.accessCode}`}
                      target="_blank"
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/30 transition-all flex items-center gap-1"
                    >
                      <span>Open Gallery</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
