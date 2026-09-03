"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  HelpCircle,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  MessageSquare,
  User,
} from "lucide-react";

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [search, setSearch] = useState("");

  const loadTickets = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (priorityFilter !== "all") params.set("priority", priorityFilter);

    fetch(`/api/admin/tickets?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setTickets(data.tickets);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTickets();
  }, [statusFilter, priorityFilter]);

  const handleUpdateStatus = async (ticketId: string, status: string) => {
    try {
      await fetch("/api/admin/tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, status }),
      });
      loadTickets();
    } catch {}
  };

  const filtered = tickets.filter((t) => {
    const q = search.toLowerCase();
    return (
      !q ||
      t.subject.toLowerCase().includes(q) ||
      (t.photographerName && t.photographerName.toLowerCase().includes(q)) ||
      (t.photographerEmail && t.photographerEmail.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Support Desk & Tenant Inquiries
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track inquiries, bug reports, Drive synchronization issues, and billing requests across photographers.
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search tickets by subject or photographer..."
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
            <option value="all">All Ticket Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="waiting">Waiting for Tenant</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <div>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700/60 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Tickets List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-12 text-center text-slate-400">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading tickets...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 bg-slate-900/40 border border-slate-800 rounded-2xl text-center text-slate-400 text-xs">
            {search || statusFilter !== "all" || priorityFilter !== "all"
              ? "No support requests found matching current filters."
              : "No support tickets yet."}
          </div>
        ) : (
          filtered.map((t) => (
            <div
              key={t.id}
              className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3 hover:border-slate-700 transition-colors shadow-lg"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-white text-sm">{t.subject}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        t.priority === "urgent"
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                          : t.priority === "high"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          : "bg-slate-800 text-slate-400 border border-slate-700"
                      }`}
                    >
                      {t.priority}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-indigo-400" />
                    <Link
                      href={`/admin/photographers/${t.photographerId}`}
                      className="hover:text-indigo-300 font-semibold transition-colors"
                    >
                      {t.photographerName || t.photographerId}
                    </Link>
                    {t.photographerEmail && <span>({t.photographerEmail})</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <select
                    value={t.status}
                    onChange={(e) => handleUpdateStatus(t.id, e.target.value)}
                    className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 font-mono font-medium focus:outline-none focus:border-indigo-500"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="waiting">Waiting</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              <p className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 whitespace-pre-wrap">
                {t.description}
              </p>

              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
                <span>Ticket ID: {t.id}</span>
                <span>Created: {new Date(t.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
