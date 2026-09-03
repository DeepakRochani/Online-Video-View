"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { Lock, Heart, ArrowRight, ShieldCheck, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";

function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [resetUrl, setResetUrl] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError("");
    setSuccessMessage("");
    setResetUrl("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process request");
      }

      setSuccessMessage(data.message || "Reset link generated.");
      if (data.resetUrl) {
        setResetUrl(data.resetUrl);
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel p-8 sm:p-10 border border-amber-400/20 shadow-2xl relative overflow-hidden">
      {/* Subtle decorative glow */}
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-amber-200/10 border border-amber-400/30 text-amber-300 mb-4 shadow-lg shadow-amber-500/10">
          <Heart className="w-7 h-7 stroke-[1.5] fill-amber-400/20" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">
          Reset Your Password
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 font-light">
          Enter your photographer email to receive a password reset link
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Success Alert */}
      {successMessage && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Instructions Sent</span>
          </div>
          <p className="text-emerald-300/80">{successMessage}</p>
          {resetUrl && (
            <div className="mt-2 pt-2 border-t border-emerald-500/20">
              <p className="text-[11px] text-slate-300 mb-1">Direct Reset Link (Local/Dev):</p>
              <Link
                href={resetUrl}
                className="text-amber-300 underline font-mono text-[11px] break-all hover:text-amber-200"
              >
                {resetUrl}
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Photographer Email
          </label>
          <div className="relative">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@yourstudio.com"
              required
              autoFocus
              className="glass-input pl-10 pr-4 py-3 text-sm text-white"
            />
            <Mail className="w-4 h-4 text-amber-400/60 absolute left-3.5 top-3.5" />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !email}
          className="w-full accent-button py-3 text-sm rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-amber-500/20 mt-2"
        >
          {loading ? (
            <>
              <div className="loader-spin border-black border-t-transparent w-4 h-4" />
              <span>Sending link...</span>
            </>
          ) : (
            <>
              <span>Send Reset Link</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Back to login */}
      <div className="mt-6 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-amber-300 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sign In</span>
        </Link>
      </div>

      <div className="mt-8 pt-6 border-t border-white/5 text-center">
        <div className="inline-flex items-center gap-1.5 text-xs text-slate-400 font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400/70" />
          <span>Secure Password Verification</span>
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
      <Suspense fallback={<div className="glass-panel p-8 text-center text-slate-400">Loading...</div>}>
        <ForgotPasswordForm />
      </Suspense>
    </div>
  );
}
