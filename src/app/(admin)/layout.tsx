"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ShieldAlert,
  Users,
  Film,
  CreditCard,
  TrendingUp,
  Globe,
  Webhook,
  FileText,
  HelpCircle,
  Activity,
  LogOut,
  ChevronRight,
  ExternalLink,
  Search,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Settings,
  Radio,
} from "lucide-react";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [adminEmail, setAdminEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        const isSuperAdmin = data.role === "SUPER_ADMIN" || data.role === "platform_admin";
        if (!data.authenticated || !isSuperAdmin) {
          setAuthorized(false);
          router.push(`/admin/login?from=${encodeURIComponent(pathname)}&error=unauthorized_admin`);
        } else {
          setAuthorized(true);
          setAdminEmail(data.email || "superadmin@platform.internal");
        }
      })
      .catch(() => {
        setAuthorized(false);
        router.push("/admin/login");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [pathname, router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  };

  interface NavItem {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    exact?: boolean;
  }

  const navGroups: { group: string; items: NavItem[] }[] = [
    {
      group: "Core Platform",
      items: [
        { label: "Overview", href: "/admin", icon: Activity, exact: true },
        { label: "Photographers", href: "/admin/photographers", icon: Users },
        { label: "All Weddings", href: "/admin/weddings", icon: Film },
      ],
    },
    {
      group: "Monetization & Billing",
      items: [
        { label: "Plans & Entitlements", href: "/admin/plans", icon: ShieldAlert },
        { label: "Subscriptions", href: "/admin/subscriptions", icon: CreditCard },
        { label: "Revenue & Payments", href: "/admin/revenue", icon: TrendingUp },
        { label: "Google AdSense", href: "/admin/adsense", icon: Sparkles },
      ],
    },
    {
      group: "Operations & Tenancy",
      items: [
        { label: "Global Communications", href: "/admin/communications", icon: Radio },
        { label: "Platform Alerts", href: "/admin/alerts", icon: ShieldAlert },
        { label: "Platform Settings", href: "/admin/settings", icon: Settings },
        { label: "Notifications & Delivery", href: "/admin/notifications", icon: Activity },
        { label: "Custom Domains", href: "/admin/domains", icon: Globe },
        { label: "Webhook Logs", href: "/admin/webhooks", icon: Webhook },
        { label: "Admin Audit Logs", href: "/admin/audit-logs", icon: FileText },
        { label: "Support Desk", href: "/admin/support", icon: HelpCircle },
        { label: "System Health", href: "/admin/system-health", icon: Activity },
      ],
    },
  ];


  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium tracking-wide">Verifying Super Admin Authorization...</p>
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-indigo-500 selection:text-white">
      {/* Top Super Admin Header */}
      <header className="sticky top-0 z-50 border-b border-indigo-900/40 bg-slate-950/90 backdrop-blur-xl">
        <div className="px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & Platform Identifier */}
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 group-hover:scale-105 transition-transform">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm sm:text-base text-white tracking-tight">
                    SUPER ADMIN
                  </span>
                  <span className="bg-indigo-500/20 border border-indigo-400/40 px-2 py-0.5 rounded text-[10px] font-mono font-bold text-indigo-300 uppercase">
                    Platform Owner
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 block font-mono">
                  DR Films SaaS Control Center
                </span>
              </div>
            </Link>
          </div>

          {/* User actions */}
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
            >
              <span>Photographer View</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </Link>

            <div className="h-4 w-px bg-slate-800 hidden sm:block" />

            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-xs font-bold text-indigo-300">
                {(adminEmail || "A").charAt(0).toUpperCase()}
              </div>
              <span className="text-xs text-slate-300 font-mono hidden md:inline truncate max-w-[160px]">
                {adminEmail || "Super Admin"}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all flex items-center gap-1.5"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container: Sidebar + Content */}
      <div className="flex-1 flex max-w-full overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-slate-800/80 bg-slate-950/60 p-4 hidden lg:flex flex-col justify-between shrink-0">
          <div className="space-y-6">
            {navGroups.map((group) => (
              <div key={group.group}>
                <h3 className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono mb-2">
                  {group.group}
                </h3>
                <nav className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.exact
                      ? pathname === item.href
                      : pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                          isActive
                            ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-sm"
                            : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/80 border border-transparent"
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? "text-indigo-400" : "text-slate-400"}`} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>

          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>System Operational</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-mono">v2.5.0 SaaS Engine</p>
          </div>
        </aside>

        {/* Dynamic Page Content */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto bg-slate-950/40">
          {children}
        </main>
      </div>
    </div>
  );
}
