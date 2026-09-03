"use client";

import React, { useState, useEffect } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  Info,
  CheckCircle2,
  RefreshCw,
  Clock,
  Check,
  Eye,
  Activity,
  Layers,
} from "lucide-react";

interface PlatformAlert {
  id: string;
  fingerprint: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  title: string;
  description: string;
  source: string;
  status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
  occurrences: number;
  createdAt: string;
  lastOccurredAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export default function AdminAlertsPage() {
  const [alerts, setAlerts] = useState<PlatformAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchAlerts = () => {
    setLoading(true);
    let url = "/api/admin/alerts?limit=100";
    if (statusFilter !== "ALL") url += `&status=${statusFilter}`;
    if (severityFilter !== "ALL") url += `&severity=${severityFilter}`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.alerts)) {
          setAlerts(data.alerts);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAlerts();
  }, [statusFilter, severityFilter]);

  const handleUpdateStatus = async (alertId: string, newStatus: "ACKNOWLEDGED" | "RESOLVED") => {
    setActionLoading(alertId);
    try {
      const res = await fetch(`/api/admin/alerts/${alertId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchAlerts();
      }
    } catch {
    } finally {
      setActionLoading(null);
    }
  };

  const openCount = alerts.filter((a) => a.status === "OPEN").length;
  const ackCount = alerts.filter((a) => a.status === "ACKNOWLEDGED").length;
  const resolvedCount = alerts.filter((a) => a.status === "RESOLVED").length;
  const criticalCount = alerts.filter(
    (a) => a.severity === "CRITICAL" && a.status !== "RESOLVED"
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <AlertOctagon className="w-6 h-6 text-rose-400" />
            Platform Alerts & Incident Center
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time incident detection, automated deduplication, and operational response tracking.
          </p>
        </div>
        <button
          onClick={fetchAlerts}
          className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Alerts</span>
        </button>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-mono">Open Incidents</span>
            <span className={`w-2.5 h-2.5 rounded-full ${openCount > 0 ? "bg-amber-400 animate-pulse" : "bg-slate-600"}`} />
          </div>
          <div className="text-2xl font-bold text-white font-mono mt-2">{openCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">Requiring triage</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-mono">Critical Severity</span>
            <AlertTriangle className={`w-4 h-4 ${criticalCount > 0 ? "text-rose-400" : "text-slate-600"}`} />
          </div>
          <div className={`text-2xl font-bold font-mono mt-2 ${criticalCount > 0 ? "text-rose-400" : "text-slate-400"}`}>
            {criticalCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">High-impact failures</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-mono">Acknowledged</span>
            <Eye className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-sky-400 font-mono mt-2">{ackCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">Investigating</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-mono">Resolved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono mt-2">{resolvedCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">Past incidents</div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/40 border border-slate-800/80 rounded-2xl">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Status:</span>
          {["ALL", "OPEN", "ACKNOWLEDGED", "RESOLVED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                statusFilter === st
                  ? "bg-indigo-600 text-white font-medium"
                  : "bg-slate-800/60 text-slate-400 hover:text-slate-200"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Severity:</span>
          {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                severityFilter === sev
                  ? "bg-slate-700 text-white font-medium"
                  : "bg-slate-800/40 text-slate-400 hover:text-slate-200"
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts List */}
      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading platform telemetry...
        </div>
      ) : alerts.length === 0 ? (
        <div className="py-16 bg-slate-900/40 border border-slate-800 rounded-2xl text-center space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto opacity-80" />
          <div className="text-sm font-semibold text-slate-200">No Active Alerts</div>
          <div className="text-xs text-slate-400 max-w-sm mx-auto">
            All platform subsystems are operating within normal operational parameters.
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const isCrit = alert.severity === "CRITICAL";
            const isHigh = alert.severity === "HIGH";
            const isMed = alert.severity === "MEDIUM";

            const badgeBg = isCrit
              ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
              : isHigh
              ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
              : isMed
              ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30"
              : "bg-slate-500/15 text-slate-300 border-slate-500/30";

            return (
              <div
                key={alert.id}
                className={`p-4 rounded-2xl border transition-all ${
                  alert.status === "RESOLVED"
                    ? "bg-slate-900/30 border-slate-800/60 opacity-60"
                    : isCrit
                    ? "bg-rose-950/10 border-rose-800/30 hover:border-rose-700/50"
                    : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeBg}`}>
                        {alert.severity}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                        {alert.source}
                      </span>
                      {alert.occurrences > 1 && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-700/40">
                          {alert.occurrences}x occurrences
                        </span>
                      )}
                      <span className="text-[11px] text-slate-500 flex items-center gap-1 ml-auto sm:ml-0">
                        <Clock className="w-3 h-3" />
                        {new Date(alert.lastOccurredAt).toLocaleString()}
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold text-white tracking-tight">{alert.title}</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">{alert.description}</p>

                    {alert.status === "RESOLVED" && alert.resolvedBy && (
                      <div className="text-[11px] text-emerald-400 font-mono mt-1 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Resolved by {alert.resolvedBy} at{" "}
                        {new Date(alert.resolvedAt || "").toLocaleTimeString()}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {alert.status === "OPEN" && (
                      <button
                        onClick={() => handleUpdateStatus(alert.id, "ACKNOWLEDGED")}
                        disabled={actionLoading === alert.id}
                        className="px-2.5 py-1.5 bg-sky-950 hover:bg-sky-900 text-sky-200 border border-sky-800/60 rounded-xl text-xs flex items-center gap-1 transition-colors disabled:opacity-50"
                      >
                        <Eye className="w-3 h-3" />
                        Acknowledge
                      </button>
                    )}

                    {alert.status !== "RESOLVED" && (
                      <button
                        onClick={() => handleUpdateStatus(alert.id, "RESOLVED")}
                        disabled={actionLoading === alert.id}
                        className="px-2.5 py-1.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-200 border border-emerald-800/60 rounded-xl text-xs flex items-center gap-1 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Resolve
                      </button>
                    )}
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
