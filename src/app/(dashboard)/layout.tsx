"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Heart, 
  LayoutDashboard, 
  PlusCircle, 
  LogOut, 
  FolderHeart,
  Sparkles,
  ExternalLink,
  Settings,
  Users,
  CreditCard,
  Crown,
  BarChart3
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [studioName, setStudioName] = useState("DR Films Wedding Cinema");
  const [planName, setPlanName] = useState("Pro Studio");
  const [loggingOut, setLoggingOut] = useState(false);
  const [impersonation, setImpersonation] = useState<{
    adminId: string;
    adminEmail: string;
    photographerName?: string;
  } | null>(null);
  const [isSuspended, setIsSuspended] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState("");
  const [exitingSupport, setExitingSupport] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.studioName) setStudioName(data.studioName);
        else if (data.photographerName) setStudioName(data.photographerName);
        if (data.planName) setPlanName(data.planName);
        if (data.impersonatingFromAdmin) setImpersonation(data.impersonatingFromAdmin);
        if (data.status === "suspended") {
          setIsSuspended(true);
          setSuspensionReason(data.suspendedReason || "Account suspended by platform administrator");
        }
      })
      .catch(() => {});
  }, []);

  const handleExitSupport = async () => {
    setExitingSupport(true);
    try {
      const res = await fetch("/api/admin/impersonate/exit", { method: "POST" });
      const data = await res.json();
      if (data.redirectUrl) {
        router.push(data.redirectUrl);
      } else {
        router.push("/admin/photographers");
      }
      router.refresh();
    } catch {
      setExitingSupport(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  };

  const navItems = [
    {
      label: "All Projects",
      href: "/dashboard",
      icon: LayoutDashboard,
      active: pathname === "/dashboard",
    },
    {
      label: "Clients & Selections",
      href: "/clients",
      icon: Users,
      active: pathname === "/clients",
    },
    {
      label: "Analytics",
      href: "/dashboard/analytics",
      icon: BarChart3,
      active: pathname === "/dashboard/analytics",
    },
    {
      label: "Communications",
      href: "/communications",
      icon: Sparkles,
      active: pathname === "/communications",
    },
    {
      label: "New Wedding",
      href: "/projects/new",
      icon: PlusCircle,
      active: pathname === "/projects/new",
    },
    {
      label: "Billing & Plans",
      href: "/billing",
      icon: CreditCard,
      active: pathname === "/billing",
    },
    {
      label: "Account & Settings",
      href: "/settings",
      icon: Settings,
      active: pathname === "/settings" || pathname.startsWith("/settings/"),
    },
  ];


  return (
    <div className="min-h-screen wedding-bg text-slate-100 flex flex-col">
      {/* Super Admin Support Mode Active Banner */}
      {impersonation && (
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-slate-950 font-medium px-4 py-2.5 text-xs sm:text-sm flex items-center justify-between shadow-lg sticky top-0 z-50 border-b border-amber-300">
          <div className="flex items-center gap-2 max-w-4xl truncate">
            <span className="bg-slate-950 text-amber-300 px-2 py-0.5 rounded font-mono font-bold text-[10px] tracking-wider uppercase">
              ADMIN SUPPORT MODE
            </span>
            <span>
              You are currently impersonating and viewing dashboard for{" "}
              <strong>{impersonation.photographerName || studioName}</strong> ({impersonation.adminEmail})
            </span>
          </div>
          <button
            onClick={handleExitSupport}
            disabled={exitingSupport}
            className="ml-3 px-3 py-1 bg-slate-950 text-amber-300 hover:bg-slate-900 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shadow-sm flex items-center gap-1.5"
          >
            {exitingSupport ? "Restoring Admin..." : "Exit Support Mode →"}
          </button>
        </div>
      )}

      {/* Account Suspended Warning Banner */}
      {isSuspended && (
        <div className="bg-rose-950/90 border-b border-rose-500/50 text-rose-200 px-4 py-3 text-xs sm:text-sm flex items-center gap-3">
          <span className="bg-rose-600 text-white font-bold px-2 py-0.5 rounded text-[10px] uppercase font-mono tracking-wider">
            ACCOUNT SUSPENDED
          </span>
          <span>
            {suspensionReason}. Client galleries remain safely preserved, but project modifications and new uploads are disabled. Contact support to resolve.
          </span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand & Studio */}
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500/20 to-amber-200/10 border border-amber-400/30 text-amber-300 flex items-center justify-center group-hover:scale-105 transition-transform shadow-md shadow-amber-500/10">
              <Heart className="w-5 h-5 fill-amber-400/30" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-base sm:text-lg text-white group-hover:text-amber-300 transition-colors tracking-tight">
                  Wedding Video Gallery
                </span>
                <span className="hidden md:inline-flex items-center gap-1 rounded-full bg-amber-400/15 border border-amber-400/30 px-2 py-0.5 text-[10px] font-semibold text-amber-300 uppercase tracking-wider font-mono">
                  <Crown className="w-2.5 h-2.5" />
                  {planName}
                </span>
              </div>
              <span className="hidden sm:block text-[11px] text-amber-400/80 font-mono truncate max-w-[200px]">
                {studioName}
              </span>
            </div>
          </Link>

          {/* Nav links */}
          <nav className="flex items-center gap-1.5 sm:gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 transition-all ${
                    item.active
                      ? "bg-amber-400/15 text-amber-300 border border-amber-400/40 shadow-sm"
                      : "text-slate-300 hover:text-white hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden md:inline">{item.label}</span>
                  <span className="md:hidden">
                    {item.label === "All Projects"
                      ? "Projects"
                      : item.label === "Clients & Selections"
                      ? "Clients"
                      : item.label === "New Wedding"
                      ? "New"
                      : "Settings"}
                  </span>
                </Link>
              );
            })}

            <div className="h-6 w-px bg-white/10 mx-1 hidden sm:block" />

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all flex items-center gap-1.5"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Page Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 text-center text-xs text-slate-400">
        <p>Wedding Video Gallery &bull; Multi-Tenant Client Delivery Platform</p>
      </footer>
    </div>
  );
}
