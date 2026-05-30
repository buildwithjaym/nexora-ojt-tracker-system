"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { toast } from "sonner";
import {
  BarChart3,
  ClipboardCheck,
  LogOut,
  Menu,
  UserCircle,
  Users,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { label: "Dashboard", href: "/critic", icon: BarChart3 },
  { label: "My Students", href: "/critic/students", icon: Users },
  { label: "Evaluations", href: "/critic/evaluations", icon: ClipboardCheck },
  { label: "Profile", href: "/critic/profile", icon: UserCircle },
];

type CriticSidebarProps = {
  criticName?: string;
  officeName?: string;
};

export function CriticSidebar({
  criticName = "Critic Account",
  officeName = "Office Evaluator",
}: CriticSidebarProps) {
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

  async function handleLogout() {
    setIsLoggingOut(true);
    const toastId = toast.loading("Signing out...");

    const { error } = await supabase.auth.signOut();

    if (error) {
      toast.error(error.message, { id: toastId });
      setIsLoggingOut(false);
      return;
    }

    toast.success("Logged out successfully.", { id: toastId });
    router.push("/login");
    router.refresh();
  }

  function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
    return (
      <div className="flex h-full min-h-0 flex-col border-r border-border bg-card">
        <div className="shrink-0 border-b border-border px-5 py-5">
          <Link
            href="/critic"
            onClick={onNavigate}
            className="flex items-center gap-3"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
              <Image
                src="/Nexora.png"
                alt="Nexora"
                width={28}
                height={28}
                className="object-contain"
              />
            </div>

            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-foreground">
                Nexora
              </p>
              <p className="truncate text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Critic Portal
              </p>
            </div>
          </Link>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
          <p className="mb-3 px-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Navigation
          </p>

          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={clsx(
                    "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="shrink-0 border-t border-border p-3">
          <div className="mb-3 rounded-2xl border border-border bg-background px-4 py-3">
            <p className="truncate text-sm font-semibold text-foreground">
              {criticName}
            </p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {officeName}
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive transition hover:bg-destructive/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {isLoggingOut ? "Signing out..." : "Logout"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card shadow-lg lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <aside className="hidden h-screen w-[280px] shrink-0 lg:sticky lg:top-0 lg:block">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />

          <aside className="absolute inset-y-0 left-0 flex h-dvh w-[88%] max-w-[340px] flex-col bg-card shadow-2xl">
            <div className="shrink-0 border-b border-border px-4 py-3">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1">
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}