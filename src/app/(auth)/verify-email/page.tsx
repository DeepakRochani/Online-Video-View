"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Mail, ArrowRight, ShieldCheck, RefreshCw, Sparkles } from "lucide-react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [emailToResend, setEmailToResend] = useState("");
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState("");

  useEffect(() => {
    if (token) {
      setVerifying(true);
      setErrorMessage("");
      fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })
        .then(async (res) => {
          const data = await res.json();
          if (res.ok && data.success) {
            setVerified(true);
          } else {
            setErrorMessage(data.error || "Verification link is invalid or has expired.");
          }
        })
        .catch(() => {
          setErrorMessage("Failed to connect to verification server. Please try again.");
        })
        .finally(() => setVerifying(false));
    }
  }, [token]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailToResend.trim()) return;

    setResending(true);
    setResendStatus("");
    setErrorMessage("");

    try {
      const res = await fetch("/api/auth/verify-email/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailToResend.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setResendStatus(data.message || "Verification email sent successfully.");
      } else {
        setErrorMessage(data.error || "Failed to resend verification email.");
      }
    } catch {
      setErrorMessage("Network error while requesting verification email.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="glass-panel p-8 sm:p-10 border border-amber-400/20 shadow-2xl relative overflow-hidden text-center">
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {verifying && (
        <div className="py-12 flex flex-col items-center justify-center space-y-4">
          <RefreshCw className="w-10 h-10 text-amber-400 animate-spin" />
          <h2 className="text-xl font-serif text-white font-medium">Verifying Your Email Address...</h2>
          <p className="text-xs text-slate-400 font-light">Validating your cryptographic credentials with DR Films secure auth.</p>
        </div>
      )}

      {!verifying && verified && (
        <div className="py-8 space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white">
              Email Verified Successfully
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 font-light max-w-md mx-auto">
              Your photographer account is active and verified. You now have full access to create client galleries and upload wedding cinema.
            </p>
          </div>
          <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/onboarding"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-medium hover:from-amber-400 hover:to-amber-500 transition-all shadow-lg shadow-amber-500/20 text-sm"
            >
              <span>Continue to Studio Onboarding</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60 transition-all text-sm"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      )}

      {!verifying && !verified && (
        <div className="space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-amber-200/10 border border-amber-400/30 text-amber-300 shadow-lg shadow-amber-500/10">
            <Mail className="w-8 h-8 stroke-[1.5]" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">
              {errorMessage ? "Verification Link Expired" : "Verify Your Email"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 font-light max-w-md mx-auto">
              {errorMessage
                ? "This verification link is invalid or has expired. Please enter your email below to receive a fresh verification link."
                : "We have dispatched a verification email to your address. Please check your inbox and click the verification link to proceed."}
            </p>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-center gap-2 text-left">
              <XCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {resendStatus && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center justify-center gap-2 text-left">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{resendStatus}</span>
            </div>
          )}

          <form onSubmit={handleResend} className="space-y-4 max-w-sm mx-auto text-left pt-2">
            <div>
              <label htmlFor="resendEmail" className="block text-xs font-medium text-slate-300 mb-1.5">
                Account Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  id="resendEmail"
                  type="email"
                  value={emailToResend}
                  onChange={(e) => setEmailToResend(e.target.value)}
                  placeholder="photographer@studio.com"
                  required
                  className="w-full bg-slate-900/60 border border-slate-700/80 rounded-xl px-10 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/30 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={resending || !emailToResend}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-medium text-xs sm:text-sm transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              {resending ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending Verification...</span>
                </>
              ) : (
                <>
                  <span>Resend Verification Email</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-center gap-4 text-xs text-slate-400">
            <Link href="/login" className="text-amber-400/80 hover:text-amber-300 transition-colors">
              Return to Login
            </Link>
            <span>•</span>
            <Link href="/onboarding" className="text-slate-400 hover:text-slate-300 transition-colors">
              Continue Onboarding
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <Suspense fallback={<div className="text-white text-center py-12">Loading verification status...</div>}>
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
