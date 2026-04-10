"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { toast } from "sonner";
import {
  Building2,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  Layers3,
  LogOut,
  Menu,
  Users,
  X,
  ChevronRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Students", href: "/admin/students", icon: Users },
  { label: "Teachers", href: "/admin/teachers", icon: GraduationCap },
  { label: "Offices", href: "/admin/offices", icon: Building2 },
  { label: "Assignments", href: "/admin/assignments", icon: ClipboardList },
  { label: "Batches", href: "/admin/batches", icon: Layers3 },
];

interface SidebarProps {
  pathname: string;
  onNavigate?: () => void;
  onLogout: () => void;
  isLoggingOut: boolean;
}

function SidebarContent({
  pathname,
  onNavigate,
  onLogout,
  isLoggingOut,
}: SidebarProps) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-card">
      <div className="border-b border-border/60 px-4 py-4 sm:px-5">
        <Link
          href="/admin"
          onClick={onNavigate}
          className="flex items-center gap-3"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
            <Image
              src="/Nexora.png"
              alt="Nexora"
              width={24}
              height={24}
              className="brightness-0 invert"
            />
          </div>

          <div className="min-w-0">
            <p className="truncate text-base font-semibold tracking-tight text-foreground">
              Nexora
            </p>
            <p className="truncate text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Admin System
            </p>
          </div>
        </Link>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
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
                  "group flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Icon
                    className={clsx(
                      "h-5 w-5 shrink-0",
                      isActive
                        ? "text-current"
                        : "text-muted-foreground/70 group-hover:text-primary"
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                {isActive && <ChevronRight className="h-4 w-4 shrink-0 opacity-70" />}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-border/60 p-3">
        <button
          type="button"
          onClick={onLogout}
          disabled={isLoggingOut}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-destructive transition hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <span>{isLoggingOut ? "Signing out..." : "Logout Account"}</span>
        </button>
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

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  async function handleLogout() {
    setIsLoggingOut(true);
    const toastId = toast.loading("Signing out...");

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      toast.success("Logged out successfully.", { id: toastId });
      router.push("/login");
      router.refresh();
    } catch (error: any) {
      toast.error(error?.message || "Logout failed.", { id: toastId });
      setIsLoggingOut(false);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur lg:hidden">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Image
              src="/Nexora.png"
              alt="logo"
              width={20}
              height={20}
              className="brightness-0 invert"
            />
          </div>
          <span className="text-sm font-semibold tracking-tight">Nexora</span>
        </Link>

        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card transition hover:bg-muted"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      <aside className="hidden h-screen w-72 shrink-0 border-r border-border bg-card lg:sticky lg:top-0 lg:block">
        <SidebarContent
          pathname={pathname}
          onLogout={handleLogout}
          isLoggingOut={isLoggingOut}
        />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
            onClick={() => setMobileOpen(false)}
            aria-label="Close sidebar overlay"
          />

          <aside className="absolute inset-y-0 left-0 flex h-dvh w-[84%] max-w-[320px] flex-col border-r border-border bg-card shadow-2xl">
            <div className="flex items-center justify-end border-b border-border/60 p-3">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background transition hover:bg-muted"
                aria-label="Close sidebar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1">
              <SidebarContent
                pathname={pathname}
                onNavigate={() => setMobileOpen(false)}
                onLogout={handleLogout}
                isLoggingOut={isLoggingOut}
              />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}