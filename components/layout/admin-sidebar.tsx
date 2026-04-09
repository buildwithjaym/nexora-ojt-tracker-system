"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import { toast } from "sonner";
import {
  BarChart3,
  Building2,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  Layers3,
  LifeBuoy,
  LogOut,
  Menu,
  Settings,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    label: "Students",
    href: "/admin/students",
    icon: Users,
  },
  {
    label: "Teachers",
    href: "/admin/teachers",
    icon: GraduationCap,
  },
  {
    label: "Offices",
    href: "/admin/offices",
    icon: Building2,
  },
  {
    label: "Assignments",
    href: "/admin/assignments",
    icon: ClipboardList,
  },
  {
    label: "Batches",
    href: "/admin/batches",
    icon: Layers3,
  },
  {
    label: "Reports",
    href: "/admin/reports",
    icon: BarChart3,
  },
  {
    label: "Settings",
    href: "/admin/settings",
    icon: Settings,
  },
];

function SidebarContent({
  pathname,
  onNavigate,
  onLogout,
  isLoggingOut,
}: {
  pathname: string;
  onNavigate?: () => void;
  onLogout: () => void;
  isLoggingOut: boolean;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-5 rounded-[28px] border border-white/10 bg-background/70 p-4 shadow-lg shadow-black/10">
        <Link href="/admin" className="flex items-center gap-3" onClick={onNavigate}>
          <div className="relative h-12 w-12 overflow-hidden rounded-2xl ring-1 ring-white/10">
            <Image
              src="/Nexora.png"
              alt="Nexora logo"
              fill
              className="object-cover"
              sizes="48px"
            />
          </div>

          <div>
            <h2 className="text-base font-semibold tracking-tight">Nexora</h2>
            <p className="text-xs text-muted-foreground">Admin Control Panel</p>
          </div>
        </Link>

        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          Trusted OJT management
        </div>
      </div>

      <div className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Main Navigation
      </div>

      <nav className="space-y-1.5">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onNavigate}
              className={clsx(
                "group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "text-muted-foreground hover:bg-background hover:text-foreground"
              )}
            >
              <span
                className={clsx(
                  "flex h-9 w-9 items-center justify-center rounded-xl transition",
                  isActive
                    ? "bg-white/10"
                    : "bg-background text-primary ring-1 ring-border group-hover:ring-primary/20"
                )}
              >
                <Icon className="h-4.5 w-4.5" />
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-4 pt-6">
        <div className="rounded-[24px] border border-primary/15 bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-primary/10 p-2 text-primary">
              <LifeBuoy className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Need help?</p>
              <p className="mt-1 text-xs leading-6 text-muted-foreground">
                Keep your OJT operations organized with a cleaner admin workflow.
              </p>
              <button
                type="button"
                className="mt-3 inline-flex rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition hover:bg-secondary"
              >
                Contact Support
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-background/70 p-4">
          <p className="text-sm font-semibold">Admin Account</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Super Administrator
          </p>

          <button
            type="button"
            onClick={onLogout}
            disabled={isLoggingOut}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-70"
          >
            <LogOut className="h-4 w-4" />
            {isLoggingOut ? "Signing out..." : "Logout"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);

    const loadingToast = toast.loading("Signing out...", {
      description: "Please wait a moment.",
    });

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        toast.dismiss(loadingToast);
        toast.error("Logout failed", {
          description: error.message || "Unable to sign out right now.",
        });
        setIsLoggingOut(false);
        return;
      }

      toast.dismiss(loadingToast);
      toast.success("Signed out", {
        description: "You have been logged out successfully.",
      });

      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
      toast.dismiss(loadingToast);
      toast.error("Something went wrong", {
        description: "An unexpected error occurred while signing out.",
      });
    } finally {
      setIsLoggingOut(false);
      setMobileOpen(false);
    }
  }

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-xl lg:hidden">
        <Link href="/admin" className="flex items-center gap-3">
          <div className="relative h-10 w-10 overflow-hidden rounded-2xl ring-1 ring-white/10">
            <Image
              src="/Nexora.png"
              alt="Nexora logo"
              fill
              className="object-cover"
              sizes="40px"
            />
          </div>
          <div>
            <p className="text-sm font-semibold">Nexora</p>
            <p className="text-[11px] text-muted-foreground">Admin Panel</p>
          </div>
        </Link>

        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-foreground transition hover:bg-secondary"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Desktop Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-border bg-card/80 px-4 py-5 backdrop-blur-xl lg:flex">
        <SidebarContent
          pathname={pathname}
          onLogout={handleLogout}
          isLoggingOut={isLoggingOut}
        />
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Close sidebar overlay"
          />

          <aside className="absolute left-0 top-0 flex h-full w-[88%] max-w-[320px] flex-col border-r border-border bg-card/95 px-4 py-5 shadow-2xl backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-foreground transition hover:bg-secondary"
                aria-label="Close sidebar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <SidebarContent
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
              onLogout={handleLogout}
              isLoggingOut={isLoggingOut}
            />
          </aside>
        </div>
      )}
    </>
  );
}