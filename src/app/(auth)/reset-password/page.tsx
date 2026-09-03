"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Heart, ArrowRight, ShieldCheck, Eye, EyeOff, CheckCircle2, ArrowLeft } from "lucide-react";

function ResetPasswordForm({ directToken }: { directToken?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = directToken || searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("Invalid or missing reset token. Please request a new link.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Password reset failed");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/login?reset=success");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="glass-panel p-8 sm:p-10 border border-amber-400/20 shadow-2xl text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 mx-auto flex items-center justify-center">
          <Lock className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-serif font-bold text-white">Invalid Reset Link</h1>
        <p className="text-xs text-slate-400">
          The reset link is missing a valid security token. Please request a new link.
        </p>
        <div className="pt-2">
          <Link
            href="/forgot-password"
            className="accent-button inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold"
          >
            <span>Request New Reset Link</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="glass-panel p-8 sm:p-10 border border-emerald-500/30 shadow-2xl text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/10">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-serif font-bold text-white">Password Updated!</h1>
        <p className="text-xs text-emerald-300">
          Your password has been successfully reset and all previous sessions have been securely invalidated.
        </p>
        <p className="text-xs text-slate-400 font-mono">Redirecting to sign in...</p>
        <div className="pt-2">
          <Link
            href="/login"
            className="accent-button inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold"
          >
            <span>Sign In Now</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel p-8 sm:p-10 border border-amber-400/20 shadow-2xl relative overflow-hidden">
      {/* Glow */}
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-amber-200/10 border border-amber-400/30 text-amber-300 mb-4 shadow-lg shadow-amber-500/10">
          <Heart className="w-7 h-7 stroke-[1.5] fill-amber-400/20" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">
          Create New Password
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 font-light">
          Enter a strong, unique password for your studio account
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
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            New Password (min 8 chars)
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              minLength={8}
              autoFocus
              className="glass-input pl-10 pr-10 py-3 text-sm text-white"
            />
            <Lock className="w-4 h-4 text-amber-400/60 absolute left-3.5 top-3.5" />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Confirm New Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              minLength={8}
              className="glass-input pl-10 pr-4 py-3 text-sm text-white"
            />
            <Lock className="w-4 h-4 text-amber-400/60 absolute left-3.5 top-3.5" />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !newPassword || !confirmPassword}
          className="w-full accent-button py-3 text-sm rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-amber-500/20 mt-4"
        >
          {loading ? (
            <>
              <div className="loader-spin border-black border-t-transparent w-4 h-4" />
              <span>Updating password...</span>
            </>
          ) : (
            <>
              <span>Save & Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

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
          <span>Bcrypt Strong Key Derivation</span>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage({ directToken }: { directToken?: string }) {
  return (
    <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
      <Suspense fallback={<div className="glass-panel p-8 text-center text-slate-400">Loading...</div>}>
        <ResetPasswordForm directToken={directToken} />
      </Suspense>
    </div>
  );
}
