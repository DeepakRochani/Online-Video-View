"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Film,
  Search,
  ExternalLink,
  Eye,
  CheckCircle2,
  Clock,
  Archive,
  Image as ImageIcon,
  Video as VideoIcon,
  HardDrive,
  User,
} from "lucide-react";

export default function AdminWeddingsPage() {
  const [weddings, setWeddings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter !== "all") params.set("status", statusFilter);

    fetch(`/api/admin/weddings?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setWeddings(data.weddings);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Global Wedding Projects Browser
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Read-only preview, media inspection, and tenant ownership mapping across all hosted galleries.
          </p>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by couple, access code, photographer, or studio..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950/80 border border-slate-700/60 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700/60 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Gallery Statuses</option>
              <option value="published">Published (Live)</option>
              <option value="draft">Draft / Processing</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {/* Weddings Table */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-mono text-[11px] uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Couple / Wedding Date</th>
                <th className="px-4 py-3">Photographer / Studio</th>
                <th className="px-4 py-3">Access Code</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Media Breakdown</th>
                <th className="px-4 py-3 text-right">Gallery Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading weddings...
                  </td>
                </tr>
              ) : weddings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    {search ? "No wedding projects found matching criteria." : "No weddings found."}
                  </td>
                </tr>
              ) : (
                weddings.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-white">{w.coupleName}</div>
                      <div className="text-[11px] text-slate-400">{w.weddingDate} {w.weddingLocation && `• ${w.weddingLocation}`}</div>
                    </td>

                    <td className="px-4 py-3.5">
                      <Link
                        href={`/admin/photographers/${w.photographerId}`}
                        className="font-medium text-indigo-300 hover:underline block"
                      >
                        {w.photographerStudio}
                      </Link>
                      <div className="text-[10px] text-slate-400 font-mono">{w.photographerEmail}</div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="font-mono font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                        {w.accessCode}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase ${
                        w.status === "published"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-slate-800 text-slate-400"
                      }`}>
                        {w.status}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                          {w.photoCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <VideoIcon className="w-3.5 h-3.5 text-purple-400" />
                          {w.videoCount}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {w.totalStorageMb} MB
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <a
                        href={w.readOnlyGalleryUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 rounded-lg text-xs font-semibold transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Admin Preview</span>
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
