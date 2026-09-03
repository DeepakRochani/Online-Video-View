"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Lock, 
  Heart, 
  ArrowRight, 
  ShieldCheck, 
  Mail, 
  Eye, 
  EyeOff 
} from "lucide-react";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

function PhotographerLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromParam = searchParams.get("from") || "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Map OAuth query errors
  React.useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      switch (errorParam) {
        case "google_not_configured":
          setError("Google Sign-In is not configured yet. Please use email & password or contact support.");
          break;
        case "google_cancelled":
          setError("Google Sign-In was cancelled.");
          break;
        case "google_invalid_state":
          setError("Security validation failed during Google Sign-In. Please try again.");
          break;
        case "google_auth_failed":
          setError("Google authentication failed. Please try again or use your password.");
          break;
        case "google_account_creation_failed":
          setError("Failed to create photographer account via Google. Please sign up manually.");
          break;
        case "account_inactive":
          setError("Your photographer account is currently inactive. Please contact support.");
          break;
        default:
          setError("Authentication failed. Please try again.");
      }
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) return;

    setLoading(true);
    setError("");

    // Photographers always authenticate through the photographer login endpoint
    const endpoint = "/api/auth/login";
    const defaultRedirect = "/dashboard";
    const targetRedirect = fromParam && fromParam.startsWith("/") && !fromParam.startsWith("//") && !fromParam.startsWith("/admin")
      ? fromParam 
      : defaultRedirect;

    try {
      const res = await fetch(endpoint, {
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
    <div className="glass-panel p-8 sm:p-10 border border-amber-400/20 shadow-2xl relative overflow-hidden">
      {/* Subtle decorative gold glows */}
      <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full blur-3xl pointer-events-none bg-amber-500/10" />
      <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full blur-3xl pointer-events-none bg-amber-500/10" />

      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-amber-200/10 border border-amber-400/30 text-amber-300 mb-4 shadow-lg shadow-amber-500/10">
          <Heart className="w-7 h-7 stroke-[1.5] fill-amber-400/20" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">
          Wedding Video Gallery
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 font-light">
          Photographer & Studio Owner Portal
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Google Sign In for Photographers */}
      <div className="mb-6">
        <GoogleSignInButton mode="login" from={fromParam} />
      </div>

      {/* Divider */}
      <div className="relative my-6 text-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-[#121218] px-3 text-slate-500 font-mono tracking-wider">
            Or continue with email
          </span>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Email Address
          </label>
          <div className="relative">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@yourstudio.com"
              required
              autoFocus
              className="glass-input pl-10 pr-4 py-3 text-sm text-white w-full"
            />
            <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-amber-400/60" />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password..."
              required
              className="glass-input pl-10 pr-10 py-3 text-sm text-white w-full"
            />
            <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-amber-400/60" />
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
          className="w-full py-3 text-sm rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg mt-3 cursor-pointer accent-button text-black hover:shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span>Signing In...</span>
            </>
          ) : (
            <>
              <span>Sign In to Studio</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Registration Link for Photographers */}
      <div className="mt-6 text-center">
        <p className="text-xs text-slate-400">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-4 ml-1 transition-colors"
          >
            Create Photographer Account
          </Link>
        </p>
      </div>

      <div className="mt-8 pt-6 border-t border-white/5 text-center">
        <div className="inline-flex items-center gap-1.5 text-xs text-slate-400 font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400/70" />
          <span>End-to-End Secure Multi-Tenant Cloud</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
      <Suspense fallback={<div className="glass-panel p-8 text-center text-slate-400">Loading portal...</div>}>
        <PhotographerLoginForm />
      </Suspense>
    </div>
  );
}
