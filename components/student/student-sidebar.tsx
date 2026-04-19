"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Clock3,
  CalendarDays,
  FileSpreadsheet,
  UserCircle,
  LogOut,
  X,
  ChevronRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { label: "Dashboard", href: "/student", icon: LayoutDashboard },
  { label: "Attendance", href: "/student/attendance", icon: Clock3 },
  { label: "Calendar", href: "/student/calendar", icon: CalendarDays },
  { label: "Reports", href: "/student/reports", icon: FileSpreadsheet },
  { label: "Profile", href: "/student/profile", icon: UserCircle },
];

type StudentSidebarProps = {
  mobileOpen: boolean;
  onMobileClose: () => void;
};

type SidebarContentProps = {
  pathname: string;
  onNavigate?: () => void;
  onLogout: () => void;
  isLoggingOut: boolean;
};

function SidebarContent({
  pathname,
  onNavigate,
  onLogout,
  isLoggingOut,
}: SidebarContentProps) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-card">
      <div className="border-b border-border/60 px-4 py-4 sm:px-5">
        <Link
          href="/student"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-2xl p-1 transition hover:bg-muted/50"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/15">
            <Image
              src="/Nexora.png"
              alt="Nexora Logo"
              width={28}
              height={28}
              className="object-contain"
            />
          </div>

          <div className="min-w-0">
            <p className="truncate text-base font-semibold tracking-tight text-foreground">
              Nexora
            </p>
            <p className="truncate text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Student Portal
            </p>
          </div>
        </Link>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <div className="mb-3 px-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Navigation
          </p>
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
                  "group flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition-all",
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

                {isActive && (
                  <ChevronRight className="h-4 w-4 shrink-0 opacity-80" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-border/60 p-3">
        <div className="mb-3 rounded-2xl border border-border bg-background px-4 py-3">
          <p className="text-xs font-medium text-foreground">Student Session</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Track your attendance, view your calendar logs, and monitor your OJT progress.
          </p>
        </div>

        <button
          type="button"
          onClick={onLogout}
          disabled={isLoggingOut}
          className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-destructive transition hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <span>{isLoggingOut ? "Signing out..." : "Logout Account"}</span>
        </button>
      </div>
    </div>
  );
}

export function StudentSidebar({
  mobileOpen,
  onMobileClose,
}: StudentSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        if (redirectTimerRef.current) {
          clearTimeout(redirectTimerRef.current);
        }

        redirectTimerRef.current = setTimeout(() => {
          router.replace("/login");
          router.refresh();
        }, 1000);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, [router, supabase]);

  async function handleLogout() {
    setIsLoggingOut(true);
    const toastId = toast.loading("Signing out...");

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      toast.success("Logged out successfully.", { id: toastId });
      onMobileClose();
    } catch (error: any) {
      toast.error(error?.message || "Logout failed.", { id: toastId });
      setIsLoggingOut(false);
    }
  }

  return (
    <>
      <aside className="hidden h-screen w-[280px] shrink-0 border-r border-border bg-card lg:sticky lg:top-0 lg:block xl:w-[296px]">
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
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
            onClick={onMobileClose}
            aria-label="Close sidebar overlay"
          />

          <aside className="absolute inset-y-0 left-0 flex h-dvh w-[86%] max-w-[320px] flex-col border-r border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/15">
                  <Image
                    src="/Nexora.png"
                    alt="Nexora Logo"
                    width={24}
                    height={24}
                    className="object-contain"
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold tracking-tight">Nexora</p>
                  <p className="text-[11px] text-muted-foreground">
                    Student Navigation
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onMobileClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background transition hover:bg-muted"
                aria-label="Close sidebar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1">
              <SidebarContent
                pathname={pathname}
                onNavigate={onMobileClose}
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