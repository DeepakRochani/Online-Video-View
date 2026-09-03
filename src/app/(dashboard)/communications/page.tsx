"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Mail,
  MessageSquare,
  Sparkles,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Settings,
  HelpCircle,
  XCircle,
  ArrowRight,
  Info
} from "lucide-react";
import { NotificationRecord, NotificationChannel, NotificationStatus, NotificationType } from "@/lib/project-types";

export default function CommunicationsPage() {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [channelFilter, setChannelFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  // Manual Send Modal State
  const [showSendModal, setShowSendModal] = useState(false);
  const [projects, setProjects] = useState<Array<{ id: string; coupleName: string; accessCode: string; clientEmail?: string; clientPhone?: string }>>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [sendEvent, setSendEvent] = useState<NotificationType>("GALLERY_PUBLISHED");
  const [sendNotes, setSendNotes] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Error details modal
  const [viewErrorRecord, setViewErrorRecord] = useState<NotificationRecord | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (channelFilter !== "ALL") params.append("channel", channelFilter);
      params.append("limit", "100");

      const res = await fetch(`/api/notifications?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch notifications");
      const data = await res.json();
      setNotifications(data.notifications || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      console.error(err);
      setActionMsg({ type: "error", text: "Unable to load communications history." });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, channelFilter]);

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch {}
  };

  useEffect(() => {
    fetchNotifications();
    fetchProjects();
  }, [fetchNotifications]);

  const handleResend = async (record: NotificationRecord) => {
    setResendingId(record.id);
    setActionMsg(null);
    try {
      const res = await fetch(`/api/notifications/${record.id}/resend`, {
        method: "POST"
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to resend notification");
      }
      setActionMsg({
        type: "success",
        text: `✓ Notification re-queued successfully for ${record.recipientName}.`
      });
      fetchNotifications();
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Failed to resend notification" });
    } finally {
      setResendingId(null);
    }
  };

  const handleManualSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setActionMsg(null);

    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProjectId || undefined,
          recipientName,
          recipientEmail: recipientEmail || undefined,
          recipientPhone: recipientPhone || undefined,
          event: sendEvent,
          notes: sendNotes || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to dispatch notification");
      }

      setActionMsg({
        type: "success",
        text: `✓ Notification successfully queued and dispatched to ${recipientName}!`
      });
      setShowSendModal(false);
      setSelectedProjectId("");
      setRecipientName("");
      setRecipientEmail("");
      setRecipientPhone("");
      setSendNotes("");
      fetchNotifications();
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Failed to send notification" });
    } finally {
      setIsSending(false);
    }
  };

  const handleProjectSelect = (projId: string) => {
    setSelectedProjectId(projId);
    const p = projects.find(item => item.id === projId);
    if (p) {
      if (!recipientName) setRecipientName(p.coupleName);
      if (p.clientEmail && !recipientEmail) setRecipientEmail(p.clientEmail);
      if (p.clientPhone && !recipientPhone) setRecipientPhone(p.clientPhone);
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (n.recipientName && n.recipientName.toLowerCase().includes(q)) ||
      (n.recipientEmail && n.recipientEmail.toLowerCase().includes(q)) ||
      (n.recipientPhone && n.recipientPhone.toLowerCase().includes(q)) ||
      (n.subject && n.subject.toLowerCase().includes(q)) ||
      (n.type && n.type.toLowerCase().includes(q))
    );
  });

  const getStatusBadge = (status: NotificationStatus) => {
    switch (status) {
      case "DELIVERED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Delivered
          </span>
        );
      case "SENT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-950/80 text-blue-300 border border-blue-500/30">
            <CheckCircle2 className="w-3 h-3 text-blue-400" /> Sent
          </span>
        );
      case "SENDING":
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-500/30">
            <Clock className="w-3 h-3 text-amber-400 animate-spin" /> {status}
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-950/80 text-rose-300 border border-rose-500/30">
            <XCircle className="w-3 h-3 text-rose-400" /> Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            {status}
          </span>
        );
    }
  };

  const getChannelBadge = (channel: NotificationChannel) => {
    if (channel === "WHATSAPP") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-900/40 text-emerald-300 border border-emerald-500/20">
          <MessageSquare className="w-3 h-3 text-emerald-400" /> WhatsApp
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-900/40 text-indigo-300 border border-indigo-500/20">
        <Mail className="w-3 h-3 text-indigo-400" /> Email
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <Mail className="w-7 h-7 text-indigo-400" /> Client Communications
            </h1>
            <span className="bg-indigo-950 border border-indigo-500/40 text-indigo-300 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              Phase 15 Production
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Real-time delivery log for gallery releases, client selection updates, and custom notifications.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/settings/notifications"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs sm:text-sm font-medium transition shadow-sm"
          >
            <Settings className="w-4 h-4 text-slate-400" /> Notification Settings
          </Link>
          <button
            onClick={() => setShowSendModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-600/20 transition transform active:scale-95"
          >
            <Send className="w-4 h-4" /> Send Notification
          </button>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionMsg && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between gap-3 text-sm border ${
            actionMsg.type === "success"
              ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-200"
              : "bg-rose-950/80 border-rose-500/40 text-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMsg.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span>{actionMsg.text}</span>
          </div>
          <button
            onClick={() => setActionMsg(null)}
            className="text-xs underline hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by client, email, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Channel:</span>
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-200 px-3 py-2 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Channels</option>
              <option value="EMAIL">Email</option>
              <option value="WHATSAPP">WhatsApp</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-200 px-3 py-2 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="SENT">Sent</option>
              <option value="DELIVERED">Delivered</option>
              <option value="FAILED">Failed</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>

          <button
            onClick={() => {
              setRefreshing(true);
              fetchNotifications();
            }}
            disabled={refreshing}
            className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl transition flex items-center justify-center"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-indigo-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Notifications Table */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin text-indigo-500" />
            <p className="text-sm">Loading delivery logs from database...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="py-20 text-center px-4">
            <Mail className="w-12 h-12 mx-auto mb-3 text-slate-600" />
            <h3 className="text-base font-semibold text-slate-300">No communication records found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              When galleries are published or client selections are submitted, notifications and their real delivery statuses will appear here.
            </p>
            <button
              onClick={() => setShowSendModal(true)}
              className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium transition"
            >
              Send First Notification
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-4 font-semibold">Recipient & Couple</th>
                  <th className="py-3.5 px-4 font-semibold">Event & Subject</th>
                  <th className="py-3.5 px-4 font-semibold">Channel</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold">Date & Time</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filteredNotifications.map((notif) => (
                  <tr key={notif.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-200">{notif.recipientName}</div>
                      <div className="text-[11px] text-slate-400">
                        {notif.recipientEmail || notif.recipientPhone || "—"}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-medium text-slate-300 truncate">
                        {notif.type.replace(/_/g, " ")}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate" title={notif.subject || notif.content}>
                        {notif.subject || notif.content}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getChannelBadge(notif.channel)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {getStatusBadge(notif.status)}
                        {notif.status === "FAILED" && (
                          <button
                            onClick={() => setViewErrorRecord(notif)}
                            className="text-rose-400 hover:text-rose-300 text-[10px] underline ml-1"
                          >
                            Details
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                      {new Date(notif.createdAt).toLocaleDateString()}{" "}
                      <span className="text-[10px] text-slate-500">
                        {new Date(notif.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {notif.status === "FAILED" && (
                        <button
                          onClick={() => handleResend(notif)}
                          disabled={resendingId === notif.id || notif.retryCount >= 3}
                          className="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 rounded-lg text-[11px] font-medium transition disabled:opacity-40"
                        >
                          {resendingId === notif.id ? "Resending..." : `Resend (${notif.retryCount}/3)`}
                        </button>
                      )}
                      {notif.status === "SENT" && notif.channel === "EMAIL" && (
                        <button
                          onClick={() => handleResend(notif)}
                          disabled={resendingId === notif.id}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-medium transition"
                        >
                          {resendingId === notif.id ? "Queuing..." : "Send Again"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Send Notification Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Send className="w-5 h-5 text-indigo-400" /> Send Client Notification
              </h3>
              <button
                onClick={() => setShowSendModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleManualSend} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Attach Project / Wedding (Optional)
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => handleProjectSelect(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Standalone / General Message --</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.coupleName} (Code: {p.accessCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Notification Type
                </label>
                <select
                  value={sendEvent}
                  onChange={(e) => setSendEvent(e.target.value as NotificationType)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="GALLERY_PUBLISHED">Gallery Published / Ready Invite</option>
                  <option value="SELECTION_UPDATED">Selection Confirmation</option>
                  <option value="SELECTION_SUBMITTED">Selection Submitted Notice</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Recipient Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sarah & Michael"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Client Email
                  </label>
                  <input
                    type="email"
                    placeholder="sarah@example.com"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Client WhatsApp / Phone (E.164 format e.g. +1234567890)
                </label>
                <input
                  type="text"
                  placeholder="+14155552671"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Custom Note / Personal Message (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Add a personal touch to the client's email..."
                  value={sendNotes}
                  onChange={(e) => setSendNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSendModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSending || (!recipientEmail && !recipientPhone)}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition"
                >
                  {isSending ? "Dispatching..." : "Send Notification →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Error Details Modal */}
      {viewErrorRecord && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-400" /> Delivery Failure Diagnostic
              </h3>
              <button
                onClick={() => setViewErrorRecord(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400">Recipient:</span>
                <p className="font-semibold text-slate-200">
                  {viewErrorRecord.recipientName} ({viewErrorRecord.recipientEmail || viewErrorRecord.recipientPhone})
                </p>
              </div>

              <div>
                <span className="text-slate-400">Channel & Type:</span>
                <p className="text-slate-200">{viewErrorRecord.channel} • {viewErrorRecord.type}</p>
              </div>

              <div>
                <span className="text-slate-400">Error Message:</span>
                <div className="p-3 bg-rose-950/40 border border-rose-500/20 rounded-xl text-rose-200 font-mono text-[11px] break-words">
                  {viewErrorRecord.errorMessage || "Unknown provider rejection."}
                </div>
              </div>

              <div>
                <span className="text-slate-400">Transient Failure:</span>
                <span className="ml-2 font-medium text-slate-200">
                  {viewErrorRecord.isTransientError ? "Yes (Safe to retry)" : "No (Permanent config or invalid address)"}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setViewErrorRecord(null)}
                className="px-4 py-1.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
