"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  Search,
  Filter,
  RefreshCw,
  Shield,
  User,
  Clock,
} from "lucide-react";

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetTypeFilter, setTargetTypeFilter] = useState("all");
  const [search, setSearch] = useState("");

  const loadLogs = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (targetTypeFilter !== "all") params.set("targetType", targetTypeFilter);
    params.set("limit", "200");

    fetch(`/api/admin/audit-logs?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setLogs(data.logs);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadLogs();
  }, [targetTypeFilter]);

  const filtered = logs.filter((l) => {
    const q = search.toLowerCase();
    return (
      !q ||
      l.action.toLowerCase().includes(q) ||
      l.adminEmail.toLowerCase().includes(q) ||
      (l.targetName && l.targetName.toLowerCase().includes(q)) ||
      l.targetId.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Administrative Audit Trail
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Immutable security log recording all operator actions, tenant modifications, plan grants, and support sessions.
          </p>
        </div>
        <button
          onClick={loadLogs}
          className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search & Filter */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search audit trail by action, admin email, or target..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950/80 border border-slate-700/60 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <select
            value={targetTypeFilter}
            onChange={(e) => setTargetTypeFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700/60 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Target Entity Types</option>
            <option value="photographer">Photographer</option>
            <option value="project">Project / Wedding</option>
            <option value="subscription">Subscription</option>
            <option value="domain">Custom Domain</option>
            <option value="system">System / Operations</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-mono text-[11px] uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Operator (Admin)</th>
                <th className="px-4 py-3">Target Entity</th>
                <th className="px-4 py-3">Metadata & Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading audit trail...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                    {search || targetTypeFilter !== "all"
                      ? "No audit records found matching criteria."
                      : "No audit activity yet."}
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3.5 whitespace-nowrap font-mono text-slate-400 text-[11px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-indigo-900/40 border border-indigo-700/50 text-[10px] font-mono text-indigo-300 font-bold">
                        {log.action}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="font-semibold text-white">{log.adminEmail}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{log.adminId}</div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-200">
                        {log.targetName || log.targetId}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Type: {log.targetType}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-slate-300">
                      {log.metadata ? (
                        <pre className="text-[10px] font-mono bg-slate-950/60 p-1.5 rounded border border-slate-800 max-w-xs overflow-x-auto">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">None</span>
                      )}
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
