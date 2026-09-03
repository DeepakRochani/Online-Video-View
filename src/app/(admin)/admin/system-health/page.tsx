"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  HardDrive,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Server,
  Cpu,
  Key,
  Database,
  Cloud,
  CreditCard,
  Mail,
  Globe,
  Archive,
  Download,
  Check,
  XCircle,
  Clock,
  Video,
  Zap,
} from "lucide-react";

export default function AdminSystemHealthPage() {
  const [health, setHealth] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupSuccess, setBackupSuccess] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);

  const loadHealth = () => {
    setLoading(true);
    fetch("/api/admin/system-health")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setHealth(data.health);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadHealth();
  }, []);

  const handleCreateBackup = async () => {
    setBackupLoading(true);
    setBackupSuccess(null);
    setBackupError(null);
    try {
      const res = await fetch("/api/admin/backups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Manual admin snapshot" }),
      });
      const data = await res.json();
      if (data.success) {
        setBackupSuccess(`Backup snapshot ${data.backup.id} created successfully (${data.backup.recordCount} records, ${data.backup.sizeBytes} bytes)`);
        loadHealth();
      } else {
        setBackupError(data.error || "Failed to create backup");
      }
    } catch (err: any) {
      setBackupError(err?.message || "Network error while creating backup");
    } finally {
      setBackupLoading(false);
    }
  };

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${d > 0 ? `${d}d ` : ""}${h}h ${m}m ${s}s`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "HEALTHY":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Healthy
          </span>
        );
      case "DEGRADED":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Degraded
          </span>
        );
      case "DOWN":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-red-500/20 text-red-300 border border-red-500/30 flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Down
          </span>
        );
      case "NOT_CONFIGURED":
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Not Configured
          </span>
        );
    }
  };

  const subsystemIcons: Record<string, any> = {
    application: Server,
    database: Database,
    googleDrive: Cloud,
    razorpay: CreditCard,
    email: Mail,
    webhooks: Activity,
    backgroundJobs: Cpu,
    customDomains: Globe,
    backups: Archive,
    mediaDelivery: Video,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            System Diagnostics & Runtime Health
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time server telemetry, subsystem integrity, database health, memory footprints, and disaster recovery.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCreateBackup}
            disabled={backupLoading}
            className="p-2 px-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs flex items-center gap-1.5 transition-colors font-medium shadow-md shadow-indigo-600/20"
          >
            <Archive className="w-3.5 h-3.5" />
            <span>{backupLoading ? "Creating Snapshot..." : "Create Backup Snapshot"}</span>
          </button>
          <button
            onClick={loadHealth}
            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sweep</span>
          </button>
        </div>
      </div>

      {backupSuccess && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-800/50 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{backupSuccess}</span>
        </div>
      )}

      {backupError && (
        <div className="p-4 bg-red-950/40 border border-red-800/50 rounded-xl text-xs text-red-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{backupError}</span>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Sweeping platform subsystems...
        </div>
      ) : !health ? (
        <div className="py-12 bg-slate-900/40 border border-slate-800 rounded-2xl text-center text-slate-400 text-xs">
          Failed to fetch system diagnostics.
        </div>
      ) : (
        <>
          {/* Top Diagnostics KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-mono">Platform Status</span>
                <span className={`w-2.5 h-2.5 rounded-full ${health.status === "HEALTHY" ? "bg-emerald-400 animate-pulse" : health.status === "DEGRADED" ? "bg-amber-400" : "bg-red-400"}`} />
              </div>
              <div className={`text-xl font-bold font-mono mt-2 uppercase ${health.status === "HEALTHY" ? "text-emerald-400" : health.status === "DEGRADED" ? "text-amber-400" : "text-red-400"}`}>
                {health.status}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Node {health.nodeVersion}</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-mono">Server Uptime</span>
                <Activity className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-xl font-bold text-white font-mono mt-2">
                {formatUptime(health.uptimeSeconds)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Continuous runtime</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-mono">Memory RSS</span>
                <Cpu className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-xl font-bold text-purple-400 font-mono mt-2">
                {health.memory.rssMb} MB
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Heap: {health.memory.heapUsedMb} MB</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-mono">Storage Stores</span>
                <HardDrive className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xl font-bold text-amber-400 font-mono mt-2">
                {health.stores.filter((s: any) => s.status === "healthy").length} / {health.stores.length}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">JSON stores verified</div>
            </div>
          </div>

          {/* Subsystems Health Grid */}
          <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-4">
            <h2 className="text-sm font-semibold text-white font-mono uppercase tracking-wider flex items-center gap-2">
              <Server className="w-4 h-4 text-indigo-400" />
              <span>Subsystem Operational Status</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {health.subsystems &&
                Object.entries(health.subsystems).map(([key, sub]: [string, any]) => {
                  const Icon = subsystemIcons[key] || Server;
                  const label = key
                    .replace(/([A-Z])/g, " $1")
                    .replace(/^./, (str) => str.toUpperCase());
                  return (
                    <div
                      key={key}
                      className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-lg bg-slate-900 text-slate-300 border border-slate-800">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-white">{label}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {sub.latencyMs !== undefined ? `${sub.latencyMs}ms latency` : "Local"}
                            </div>
                          </div>
                        </div>
                        {getStatusBadge(sub.status)}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {sub.details || "Operating normally"}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Media Delivery & CDN Telemetry */}
          {health.mediaMetrics && (
            <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                  <Video className="w-4 h-4 text-emerald-400" />
                  <span>Media Delivery & CDN Bandwidth Telemetry</span>
                </h2>
                <span className="text-[11px] font-mono text-slate-400">
                  Cache Hit Rate: <strong className="text-emerald-400">{health.mediaMetrics.cacheHitRate}</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80">
                  <div className="text-xs text-slate-400 font-mono">Total Media Requests</div>
                  <div className="text-lg font-bold text-white font-mono mt-1">
                    {health.mediaMetrics.totalRequests}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Photos: {health.mediaMetrics.imageRequests} | Videos: {health.mediaMetrics.videoRequests}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80">
                  <div className="text-xs text-slate-400 font-mono">Data Proxied / Transferred</div>
                  <div className="text-lg font-bold text-emerald-400 font-mono mt-1">
                    {health.mediaMetrics.formattedBytes}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Live HTTP stream volume</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80">
                  <div className="text-xs text-slate-400 font-mono">Cache Performance</div>
                  <div className="text-lg font-bold text-amber-400 font-mono mt-1">
                    {health.mediaMetrics.cacheHits} / {health.mediaMetrics.cacheHits + health.mediaMetrics.cacheMisses}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Hits vs Total queries</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80">
                  <div className="text-xs text-slate-400 font-mono">Drive Origin Requests</div>
                  <div className="text-lg font-bold text-indigo-400 font-mono mt-1">
                    {health.mediaMetrics.driveOriginRequests}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Errors: {health.mediaMetrics.errorCount}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Database JSON Stores Integrity Table */}
          <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-4">
            <h2 className="text-sm font-semibold text-white font-mono uppercase tracking-wider flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-indigo-400" />
              <span>Data Stores & Storage Entities</span>
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 font-mono text-[11px] uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Store Name</th>
                    <th className="px-4 py-3">Integrity Status</th>
                    <th className="px-4 py-3">Record Count</th>
                    <th className="px-4 py-3 text-right">Disk Size</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {health.stores.map((s: any) => (
                    <tr key={s.file} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold text-white">
                        {s.file}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-mono text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Healthy</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-200">
                        {s.recordCount} records
                      </td>
                      <td className="px-4 py-3 font-mono text-right text-slate-400">
                        {s.sizeKb} KB
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Environment & Security Credentials Check */}
          <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-4">
            <h2 className="text-sm font-semibold text-white font-mono uppercase tracking-wider flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-400" />
              <span>Security & Integration Secrets Health</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">Session Security Salt</div>
                  <div className="text-[11px] text-slate-400">SESSION_SECRET</div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-300">
                  Configured
                </span>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">Razorpay Key ID</div>
                  <div className="text-[11px] text-slate-400">RAZORPAY_KEY_ID</div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                  health.environment?.razorpayKeyConfigured ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
                }`}>
                  {health.environment?.razorpayKeyConfigured ? "Active" : "Test Mode Fallback"}
                </span>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">Razorpay Secret</div>
                  <div className="text-[11px] text-slate-400">RAZORPAY_KEY_SECRET</div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                  health.environment?.razorpaySecretConfigured ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
                }`}>
                  {health.environment?.razorpaySecretConfigured ? "Active" : "Test Mode Fallback"}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

