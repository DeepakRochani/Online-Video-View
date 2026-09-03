"use client";

import React, { useState, useEffect } from "react";
import {
  Webhook,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Play,
  Clock,
  ShieldCheck,
} from "lucide-react";

export default function AdminWebhooksPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const loadEvents = () => {
    setLoading(true);
    fetch("/api/admin/webhooks")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setEvents(data.events);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleRetry = async (eventId: string) => {
    setRetryingId(eventId);
    try {
      const res = await fetch("/api/admin/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        loadEvents();
      } else {
        alert(data.error || "Retry failed");
      }
    } catch {
      alert("Network error triggering webhook replay");
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Razorpay Webhook Stream & Idempotency
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time webhook signature verification logs, processed subscription events, and manual replay triggers.
          </p>
        </div>
        <button
          onClick={loadEvents}
          className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Events</span>
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="text-xs text-slate-400 font-mono">Processed Events</div>
          <div className="text-2xl font-bold text-white font-mono mt-1">{events.length}</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="text-xs text-emerald-400 font-mono">Signature Validation</div>
          <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">HMAC-SHA256</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="text-xs text-indigo-400 font-mono">Idempotency Guard</div>
          <div className="text-2xl font-bold text-indigo-400 font-mono mt-1">Enforced</div>
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-mono text-[11px] uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Event ID</th>
                <th className="px-4 py-3">Event Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Processed At</th>
                <th className="px-4 py-3 text-right">Replay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading webhook events...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                    No webhook events yet.
                  </td>
                </tr>
              ) : (
                events.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3.5 font-mono text-slate-300 font-semibold">
                      {e.id}
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 rounded bg-indigo-900/40 border border-indigo-700/50 text-[10px] font-mono text-indigo-300 font-bold">
                        {e.eventType}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-mono text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Success</span>
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-slate-400 font-mono text-[11px]">
                      {new Date(e.processedAt).toLocaleString()}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => handleRetry(e.id)}
                        disabled={retryingId === e.id}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[11px] font-semibold transition-colors inline-flex items-center gap-1"
                      >
                        <Play className="w-3 h-3" />
                        <span>{retryingId === e.id ? "Replaying..." : "Replay"}</span>
                      </button>
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
