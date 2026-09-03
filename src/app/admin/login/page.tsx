"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  ShieldAlert, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  KeyRound, 
  ArrowRight, 
  ShieldCheck 
} from "lucide-react";

function SuperAdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromParam = searchParams.get("from") || "";
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(
    errorParam === "unauthorized_admin"
      ? "Super Admin access required. Please sign in with administrator credentials."
      : ""
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) return;

    setLoading(true);
    setError("");

    const defaultRedirect = "/admin";
    const targetRedirect = fromParam && fromParam.startsWith("/admin") && !fromParam.startsWith("//")
      ? fromParam 
      : defaultRedirect;

    try {
      const res = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Invalid email or password.");
      }

      router.push(data.redirect || targetRedirect);
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Invalid email or password.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500 relative z-10">
        <div className="glass-panel p-8 sm:p-10 border border-indigo-500/20 shadow-2xl relative overflow-hidden bg-slate-900/80 backdrop-blur-2xl rounded-2xl">
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 mb-4 shadow-lg shadow-indigo-500/10">
              <ShieldAlert className="w-7 h-7 stroke-[1.5]" />
            </div>
            
            <div className="inline-block px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono text-[10px] uppercase font-bold tracking-wider mb-2 border border-indigo-500/30">
              RESTRICTED PORTAL
            </div>

            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">
              Platform Control Center
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 font-light">
              SaaS Administration & Operations
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 font-mono">
                Administrator Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@drfilms.com"
                  required
                  autoFocus
                  className="glass-input pl-10 pr-4 py-3 text-sm text-white w-full border-slate-700 bg-slate-950/60 focus:border-indigo-500"
                />
                <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-indigo-400" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="glass-input pl-10 pr-10 py-3 text-sm text-white w-full border-slate-700 bg-slate-950/60 focus:border-indigo-500"
                />
                <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-indigo-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full py-3 text-sm rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg mt-4 cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 hover:shadow-indigo-600/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Authorization...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Sign In to Platform</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-[11px] text-slate-500 font-mono">
              Authorized administrators and platform operators only.
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800/80 text-center">
            <div className="inline-flex items-center gap-1.5 text-xs text-slate-400 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400/80" />
              <span>DR Films SaaS Engine • Tier 1 Security</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SuperAdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading Control Center...</div>}>
      <SuperAdminLoginForm />
    </Suspense>
  );
}
