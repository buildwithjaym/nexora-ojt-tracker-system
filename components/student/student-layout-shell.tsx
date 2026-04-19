"use client";

import { ReactNode, useState } from "react";
import { Menu } from "lucide-react";
import { StudentSidebar } from "@/components/student/student-sidebar";

type StudentLayoutShellProps = {
  children: ReactNode;
};

export function StudentLayoutShell({ children }: StudentLayoutShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <StudentSidebar
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />

        <main className="min-w-0 flex-1">
          <div className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur">
            <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card transition hover:bg-muted lg:hidden"
                aria-label="Open sidebar"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Nexora Student Portal
                </p>
                <h1 className="text-sm font-medium text-foreground sm:text-base">
                  OJT Dashboard
                </h1>
              </div>
            </div>
          </div>

          <div className="px-4 py-5 sm:px-6 lg:px-8 lg:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}