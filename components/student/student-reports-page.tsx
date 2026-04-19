"use client";

import { useMemo, useState } from "react";
import { Download, FileSpreadsheet, Sparkles } from "lucide-react";

type StudentReportsPageProps = {
  studentName: string;
};

function getDefaultMonth() {
  const now = new Date();
  return String(now.getMonth() + 1).padStart(2, "0");
}

function getDefaultYear() {
  return String(new Date().getFullYear());
}

export function StudentReportsPage({
  studentName,
}: StudentReportsPageProps) {
  const [month, setMonth] = useState(getDefaultMonth());
  const [year, setYear] = useState(getDefaultYear());
  const [isDownloading, setIsDownloading] = useState(false);

  const reportUrl = useMemo(() => {
    const params = new URLSearchParams({
      month,
      year,
    });

    return `/api/student/reports/dtr?${params.toString()}`;
  }, [month, year]);

  async function handleDownload() {
    try {
      setIsDownloading(true);
      window.open(reportUrl, "_blank");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="pointer-events-none absolute -left-16 top-0 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>{studentName}</span>
            </div>

            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Reports & Downloads
            </h2>

            <p className="max-w-2xl text-sm text-muted-foreground">
              Generate your monthly Daily Time Record in PDF format using your
              logged attendance records.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-background px-4 py-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileSpreadsheet className="h-4 w-4" />
              <p className="text-xs uppercase tracking-wide">Available Report</p>
            </div>
            <p className="mt-2 text-sm font-medium">Monthly Daily Time Record</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-sm">
          <div className="mb-5">
            <p className="text-sm font-medium">Report Filters</p>
            <p className="text-xs text-muted-foreground">
              Choose the month and year for your DTR export.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">Month</label>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm"
              >
                <option value="01">January</option>
                <option value="02">February</option>
                <option value="03">March</option>
                <option value="04">April</option>
                <option value="05">May</option>
                <option value="06">June</option>
                <option value="07">July</option>
                <option value="08">August</option>
                <option value="09">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Year</label>
              <input
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm"
                placeholder="2026"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            {isDownloading ? "Preparing PDF..." : "Download Monthly DTR"}
          </button>
        </div>

        <div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-sm">
          <div className="mb-5">
            <p className="text-sm font-medium">What this report includes</p>
            <p className="text-xs text-muted-foreground">
              The PDF will populate your recorded attendance for the selected month.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Daily Entries
              </p>
              <p className="mt-2 text-sm font-medium">
                AM and PM arrival and departure
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Work Totals
              </p>
              <p className="mt-2 text-sm font-medium">
                Total daily hours and minutes
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Official Use
              </p>
              <p className="mt-2 text-sm font-medium">
                Printable fixed-format DTR PDF
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Source Data
              </p>
              <p className="mt-2 text-sm font-medium">
                Generated from your attendance logs
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}