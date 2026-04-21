"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { TeacherSidebar } from "@/components/teacher/teacher-sidebar";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden bg-background">
      <TeacherSidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl sm:px-5 lg:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card transition hover:bg-muted lg:hidden"
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          <h1 className="min-w-0 truncate text-sm font-semibold tracking-tight text-foreground sm:text-base">
            Teacher Portal
          </h1>
        </header>

        <main className="flex-1 min-w-0 px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
          <div className="mx-auto w-full max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}