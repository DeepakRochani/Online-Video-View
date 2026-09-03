"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  TrendingUp,
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  ArrowDownToLine,
  Filter,
} from "lucide-react";

export default function AdminRevenuePage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [totalCollected, setTotalCollected] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);

    fetch(`/api/admin/payments?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setInvoices(data.invoices);
          setTotalCollected(data.totalCollected);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [statusFilter]);

  const filtered = invoices.filter((i) => {
    const q = search.toLowerCase();
    return (
      !q ||
      i.photographerName.toLowerCase().includes(q) ||
      i.photographerEmail.toLowerCase().includes(q) ||
      i.id.toLowerCase().includes(q) ||
      i.studioName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Revenue & Transaction Ledger
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Realized platform earnings, customer invoice records, and Razorpay charge histories.
          </p>
        </div>
      </div>

      {/* Revenue Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/60 to-slate-900 border border-emerald-800/40 shadow-xl">
          <div className="text-xs font-mono font-medium text-emerald-400 uppercase">Total Realized Revenue</div>
          <div className="text-3xl font-bold text-white font-mono mt-2">
            ₹{totalCollected.toLocaleString("en-IN")}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Gross paid invoice receipts</div>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/60 to-slate-900 border border-indigo-800/40 shadow-xl">
          <div className="text-xs font-mono font-medium text-indigo-400 uppercase">Paid Invoices</div>
          <div className="text-3xl font-bold text-white font-mono mt-2">
            {invoices.filter((i) => i.status.toLowerCase() === "paid").length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Successful transactions</div>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/60 to-slate-900 border border-amber-800/40 shadow-xl">
          <div className="text-xs font-mono font-medium text-amber-400 uppercase">Average Ticket Size</div>
          <div className="text-3xl font-bold text-white font-mono mt-2">
            ₹{invoices.length > 0 ? Math.round(totalCollected / (invoices.filter((i) => i.status.toLowerCase() === "paid").length || 1)).toLocaleString("en-IN") : 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Average transaction value</div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search payments by invoice ID, photographer, or studio..."
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
            <option value="all">All Payment Statuses</option>
            <option value="paid">Paid Only</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-mono text-[11px] uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Invoice / Transaction ID</th>
                <th className="px-4 py-3">Photographer / Studio</th>
                <th className="px-4 py-3">Tier Plan</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading transaction ledger...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    {search || statusFilter !== "all"
                      ? "No payment records found matching criteria."
                      : "No payments yet."}
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3.5 font-mono text-white">
                      <div>{inv.id}</div>
                      {inv.razorpayPaymentId && (
                        <div className="text-[10px] text-slate-400">Ref: {inv.razorpayPaymentId}</div>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      <Link
                        href={`/admin/photographers/${inv.photographerId}`}
                        className="font-semibold text-white hover:text-indigo-300 transition-colors block"
                      >
                        {inv.photographerName}
                      </Link>
                      <div className="text-[11px] text-slate-400">{inv.studioName}</div>
                    </td>

                    <td className="px-4 py-3.5 font-mono font-bold text-slate-200">
                      {inv.plan}
                    </td>

                    <td className="px-4 py-3.5 font-mono font-bold text-emerald-400 text-sm">
                      ₹{inv.amount.toLocaleString("en-IN")}
                    </td>

                    <td className="px-4 py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase ${
                        inv.status.toLowerCase() === "paid"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : inv.status.toLowerCase() === "pending"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      }`}>
                        {inv.status}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-right font-mono text-slate-400">
                      {new Date(inv.createdAt).toLocaleDateString()}
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
