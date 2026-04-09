"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  BarChart3,
  Building2,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  Layers3,
  LifeBuoy,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";

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

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-72 flex-col border-r border-border bg-card/80 px-4 py-5 backdrop-blur-xl">
      <div className="mb-6 rounded-[28px] border border-white/10 bg-background/70 p-4 shadow-lg shadow-black/10">
        <Link href="/admin" className="flex items-center gap-3">
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
              <button className="mt-3 inline-flex rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition hover:bg-secondary">
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
        </div>
      </div>
    </aside>
  );
}