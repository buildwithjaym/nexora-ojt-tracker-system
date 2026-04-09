import type { ReactNode } from "react";
import { Bell, Search } from "lucide-react";
import { AdminSidebar } from "@/components/layout/admin-sidebar";

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <AdminSidebar />

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-30 hidden border-b border-border bg-background/80 backdrop-blur-xl lg:block">
            <div className="flex h-20 items-center justify-between px-6 lg:px-8">
              <div>
                <p className="text-sm text-muted-foreground">Admin Panel</p>
                <h1 className="text-xl font-semibold tracking-tight">
                  Nexora Management
                </h1>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2 md:flex">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search students, teachers, offices..."
                    className="w-72 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  />
                </div>

                <button className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground transition hover:text-foreground">
                  <Bell className="h-5 w-5" />
                  <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-accent" />
                </button>

                <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-sm font-semibold text-primary">
                    AD
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-sm font-medium">Admin Account</p>
                    <p className="text-xs text-muted-foreground">
                      Super Administrator
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}