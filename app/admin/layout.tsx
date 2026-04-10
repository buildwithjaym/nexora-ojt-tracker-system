"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Menu, Search, X } from "lucide-react";
import { toast } from "sonner";
import { AdminSidebar } from "@/components/layout/admin-sidebar";

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [query, setQuery] = useState("");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const isStudentsPage = pathname.startsWith("/admin/students");

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const trimmed = query.trim();
    if (!trimmed) {
      toast.error("Please enter a search term.");
      return;
    }

    router.push(`/admin/students?search=${encodeURIComponent(trimmed)}`);
    toast.success(`Searching for "${trimmed}"`);
  }

  function clearSearch() {
    setQuery("");

    if (isStudentsPage) {
      router.push("/admin/students");
      toast("Search cleared.");
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <AdminSidebar
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
        />

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
            <div className="flex min-h-[72px] items-center justify-between gap-3 px-4 sm:px-5 lg:px-6 xl:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card lg:hidden"
                  onClick={() => setMobileSidebarOpen(true)}
                  aria-label="Open sidebar"
                >
                  <Menu className="h-5 w-5" />
                </button>

                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">Admin Panel</p>
                  <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">
                    Nexora Management
                  </h1>
                </div>
              </div>

              <div className="hidden items-center gap-3 md:flex">
                <form
                  onSubmit={handleSearchSubmit}
                  className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2"
                >
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-40 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground lg:w-64"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="submit"
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:opacity-90"
                  >
                    Search
                  </button>
                </form>

                <button
                  type="button"
                  className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition hover:text-foreground"
                  aria-label="Notifications"
                  onClick={() => toast("No new notifications right now.")}
                >
                  <Bell className="h-5 w-5" />
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent" />
                </button>

                <Link
                  href="/admin/settings"
                  className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 transition hover:bg-muted"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                    AD
                  </div>

                  <div className="hidden xl:block">
                    <p className="text-sm font-medium">Admin Account</p>
                    <p className="text-xs text-muted-foreground">
                      Super Administrator
                    </p>
                  </div>
                </Link>
              </div>
            </div>

            <div className="border-t border-border px-4 py-3 md:hidden">
              <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full min-w-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
                >
                  Search
                </button>
              </form>
            </div>
          </header>

          <main className="flex-1 px-4 py-4 sm:px-5 lg:px-6 lg:py-6 xl:px-8">
            <div className="mx-auto w-full max-w-[1600px]">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}