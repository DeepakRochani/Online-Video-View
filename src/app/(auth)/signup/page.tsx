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
  User, 
  Building, 
  Phone, 
  Globe, 
  MapPin, 
  Eye, 
  EyeOff, 
  CheckSquare, 
  Square 
} from "lucide-react";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [name, setName] = useState("");
  const [studioName, setStudioName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Map OAuth query errors
  React.useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      switch (errorParam) {
        case "google_not_configured":
          setError("Google Sign-In is not configured yet. Please complete the form below.");
          break;
        case "google_cancelled":
          setError("Google Sign-Up was cancelled.");
          break;
        case "google_invalid_state":
          setError("Security validation failed during Google Sign-Up. Please try again.");
          break;
        case "google_auth_failed":
          setError("Google authentication failed. Please try again or create an account with email.");
          break;
        case "google_account_creation_failed":
          setError("Failed to create photographer account via Google. Please sign up manually.");
          break;
        default:
          setError("Authentication failed. Please try again.");
      }
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return;

    if (!termsAccepted) {
      setError("Please accept the Terms of Service & Privacy Policy to continue.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          studioName: studioName.trim() || name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          website: website.trim(),
          city: city.trim(),
          country: country.trim(),
          termsAccepted,
          password,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create account");
      }

      router.push(data.redirect || "/onboarding");
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create account. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel p-8 sm:p-10 border border-amber-400/20 shadow-2xl relative overflow-hidden my-6">
      {/* Subtle decorative glows */}
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-amber-200/10 border border-amber-400/30 text-amber-300 mb-3 shadow-lg shadow-amber-500/10">
          <Heart className="w-7 h-7 stroke-[1.5] fill-amber-400/20" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">
          Create Photographer Account
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 font-light">
          Join DR Films to deliver luxury client galleries with your custom brand
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2 animate-in fade-in duration-200">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Google Sign In for Photographers */}
      <div className="mb-5">
        <GoogleSignInButton mode="signup" />
      </div>

      {/* Divider */}
      <div className="relative my-5 text-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-[#121218] px-3 text-slate-500 font-mono tracking-wider">
            Or register with email
          </span>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Full Name *
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Liam Vance"
                required
                autoFocus
                className="glass-input pl-10 pr-4 py-2.5 text-sm text-white w-full"
              />
              <User className="w-4 h-4 text-amber-400/60 absolute left-3.5 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Studio / Business Name *
            </label>
            <div className="relative">
              <input
                type="text"
                value={studioName}
                onChange={(e) => setStudioName(e.target.value)}
                placeholder="e.g. Vance Wedding Cinema"
                required
                className="glass-input pl-10 pr-4 py-2.5 text-sm text-white w-full"
              />
              <Building className="w-4 h-4 text-amber-400/60 absolute left-3.5 top-3" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Email Address *
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourstudio.com"
                required
                className="glass-input pl-10 pr-4 py-2.5 text-sm text-white w-full"
              />
              <Mail className="w-4 h-4 text-amber-400/60 absolute left-3.5 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Phone Number
            </label>
            <div className="relative">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="glass-input pl-10 pr-4 py-2.5 text-sm text-white w-full"
              />
              <Phone className="w-4 h-4 text-amber-400/60 absolute left-3.5 top-3" />
            </div>
          </div>
        </div>

        {/* Optional Studio Details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Website
            </label>
            <div className="relative">
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://..."
                className="glass-input pl-9 pr-3 py-2 text-xs text-white w-full"
              />
              <Globe className="w-3.5 h-3.5 text-amber-400/60 absolute left-3 top-2.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              City
            </label>
            <div className="relative">
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. New York"
                className="glass-input pl-9 pr-3 py-2 text-xs text-white w-full"
              />
              <MapPin className="w-3.5 h-3.5 text-amber-400/60 absolute left-3 top-2.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Country
            </label>
            <div className="relative">
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g. United States"
                className="glass-input pl-9 pr-3 py-2 text-xs text-white w-full"
              />
              <MapPin className="w-3.5 h-3.5 text-amber-400/60 absolute left-3 top-2.5" />
            </div>
          </div>
        </div>

        {/* Password and Confirm Password */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 chars"
                required
                className="glass-input pl-10 pr-9 py-2.5 text-sm text-white w-full"
              />
              <Lock className="w-4 h-4 text-amber-400/60 absolute left-3.5 top-3" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Confirm Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                required
                className="glass-input pl-10 pr-4 py-2.5 text-sm text-white w-full"
              />
              <Lock className="w-4 h-4 text-amber-400/60 absolute left-3.5 top-3" />
            </div>
          </div>
        </div>

        {/* Terms acceptance */}
        <div className="pt-2">
          <label 
            onClick={() => setTermsAccepted(!termsAccepted)}
            className="flex items-start gap-2.5 cursor-pointer select-none text-xs text-slate-300"
          >
            <span className="mt-0.5 text-amber-400">
              {termsAccepted ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-500" />}
            </span>
            <span>
              I agree to the{" "}
              <span className="text-amber-400 underline underline-offset-2">Terms of Service</span> and{" "}
              <span className="text-amber-400 underline underline-offset-2">Privacy Policy</span>.
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading || !name || !email || !password || !confirmPassword || !termsAccepted}
          className="w-full accent-button py-3 text-sm rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-amber-500/20 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <div className="loader-spin border-black border-t-transparent w-4 h-4" />
              <span>Creating your account...</span>
            </>
          ) : (
            <>
              <span>Create Photographer Account</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Login link */}
      <div className="mt-5 text-center">
        <p className="text-xs text-slate-400">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-4 ml-1 transition-colors"
          >
            Sign In
          </Link>
        </p>
      </div>

      <div className="mt-6 pt-5 border-t border-white/5 text-center">
        <div className="inline-flex items-center gap-1.5 text-xs text-slate-400 font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400/70" />
          <span>Includes 14-Day Free Trial • No Credit Card Required Upfront</span>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="w-full max-w-lg animate-in fade-in zoom-in-95 duration-500">
      <Suspense fallback={<div className="glass-panel p-8 text-center text-slate-400">Loading signup...</div>}>
        <SignupForm />
      </Suspense>
    </div>
  );
}
