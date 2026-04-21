"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Download, FileText, Printer } from "lucide-react";

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

function getMonthLabel(month: string) {
  const months: Record<string, string> = {
    "01": "January",
    "02": "February",
    "03": "March",
    "04": "April",
    "05": "May",
    "06": "June",
    "07": "July",
    "08": "August",
    "09": "September",
    "10": "October",
    "11": "November",
    "12": "December",
  };

  return months[month] ?? month;
}

function sanitizeYear(value: string) {
  return value.replace(/\D/g, "").slice(0, 4);
}

function DtrPreviewRow({ day }: { day: number }) {
  return (
    <div className="grid grid-cols-[28px_1fr_1fr_1fr_1fr_34px_34px] border-b border-black text-[6px] leading-none text-black">
      <div className="flex h-[14px] items-center justify-center border-r border-black">
        {day}
      </div>
      <div className="border-r border-black" />
      <div className="border-r border-black" />
      <div className="border-r border-black" />
      <div className="border-r border-black" />
      <div className="border-r border-black" />
      <div />
    </div>
  );
}

function DtrPreview({
  studentName,
  month,
  year,
}: {
  studentName: string;
  month: string;
  year: string;
}) {
  return (
    <div className="mx-auto w-full max-w-[360px] rounded-[1.5rem] bg-neutral-200 p-3 sm:max-w-[420px] sm:p-4">
      <div
        className="mx-auto overflow-hidden rounded-[2px] border border-black/20 bg-white shadow-[0_12px_30px_rgba(0,0,0,0.14)]"
        style={{ aspectRatio: "8.5 / 13" }}
      >
        <div className="h-full w-full px-4 py-3 text-black sm:px-5 sm:py-4">
          <div className="text-[7px] italic">Civil Service Form No. 48</div>

          <div className="mt-2 text-center">
            <div className="text-[16px] font-bold uppercase tracking-tight">
              Daily Time Record
            </div>
            <div className="mx-auto mt-1 h-px w-16 bg-black" />
          </div>

          <div className="mt-3">
            <div className="mx-auto w-[78%] border-b border-black text-center text-[8px]">
              {studentName}
            </div>
            <div className="mt-1 text-center text-[7px] italic">(Name)</div>
          </div>

          <div className="mt-3 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-[7px] italic">
            <div className="border-b border-black">
              For the month of {getMonthLabel(month)}
            </div>
            <div className="min-w-[72px] border-b border-black px-2 text-center">
              {year}
            </div>

            <div>Official hours of arrival</div>
            <div className="border-b border-black px-2 text-center">
              Regular Days
            </div>

            <div className="-mt-1">and departure</div>
            <div className="border-b border-black px-2 text-center">
              Saturdays
            </div>
          </div>

          <div className="mt-3 border-t border-b border-black">
            <div className="grid grid-cols-[28px_1fr_1fr_1fr_1fr_34px_34px] text-[6px] font-semibold uppercase text-black">
              <div className="flex items-center justify-center border-r border-black py-1">
                Days
              </div>
              <div className="col-span-2 flex items-center justify-center border-r border-black py-1">
                A. M.
              </div>
              <div className="col-span-2 flex items-center justify-center border-r border-black py-1">
                P. M.
              </div>
              <div className="col-span-2 flex items-center justify-center py-1 text-center">
                Under
                <br />
                Time
              </div>
            </div>

            <div className="grid grid-cols-[28px_1fr_1fr_1fr_1fr_34px_34px] border-t border-black text-[5px] font-semibold uppercase text-black">
              <div className="border-r border-black" />
              <div className="border-r border-black py-1 text-center">Arrival</div>
              <div className="border-r border-black py-1 text-center">
                Depar-
                <br />
                ture
              </div>
              <div className="border-r border-black py-1 text-center">Arrival</div>
              <div className="border-r border-black py-1 text-center">
                Depar-
                <br />
                ture
              </div>
              <div className="border-r border-black py-1 text-center">Hours</div>
              <div className="py-1 text-center">Minutes</div>
            </div>

            <div>
              {Array.from({ length: 31 }).map((_, index) => (
                <DtrPreviewRow key={index + 1} day={index + 1} />
              ))}
            </div>

            <div className="grid grid-cols-[28px_1fr_1fr_1fr_1fr_34px_34px] border-t border-black text-[6px] font-semibold uppercase text-black">
              <div className="col-span-5 border-r border-black py-1 text-center">
                Total
              </div>
              <div className="border-r border-black py-1" />
              <div className="py-1" />
            </div>
          </div>

          <div className="mt-3 text-[6px] italic leading-snug text-black">
            I CERTIFY on my honor that the above is a true and correct report of
            the hours of work performed, record of which was made daily at the
            time of arrival and departure from office.
          </div>

          <div className="mt-8 flex justify-end">
            <div className="w-[120px] text-center">
              <div className="border-t border-black pt-1 text-[7px] italic font-semibold">
                In-Charge
              </div>
              <div className="mt-1 text-[6px]">(See Instructions on back)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
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
    <div className="space-y-5 sm:space-y-6">
      <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-primary">Student Reports</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Daily Time Record
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Generate a fixed-format portrait Daily Time Record based on your
              attendance logs, styled like the official printed form.
            </p>
          </div>

          <div className="w-full rounded-2xl border border-border bg-background px-4 py-3 sm:w-fit sm:min-w-[220px]">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span className="text-xs uppercase tracking-[0.18em]">
                Report Type
              </span>
            </div>
            <p className="mt-2 text-sm font-medium text-foreground">
              Monthly DTR PDF
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="rounded-[1.5rem] border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-5">
            <p className="text-sm font-semibold text-foreground">
              Generate Report
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Select the month and year for your printable Daily Time Record.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Month
              </label>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary"
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
              <label className="mb-2 block text-sm font-medium text-foreground">
                Year
              </label>
              <input
                value={year}
                onChange={(e) => setYear(sanitizeYear(e.target.value))}
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary"
                placeholder="2026"
                inputMode="numeric"
              />
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-border bg-background p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              <span className="text-xs uppercase tracking-[0.18em]">
                Selection
              </span>
            </div>

            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Student</span>
                <span className="max-w-[180px] truncate font-medium text-foreground">
                  {studentName}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Month</span>
                <span className="font-medium text-foreground">
                  {getMonthLabel(month)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Year</span>
                <span className="font-medium text-foreground">{year}</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Size</span>
                <span className="font-medium text-foreground">8.5 × 13</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            {isDownloading ? "Preparing PDF..." : "Download DTR PDF"}
          </button>
        </aside>

        <section className="rounded-[1.5rem] border border-border bg-card p-4 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Official-style Preview
              </p>
              <p className="text-xs leading-5 text-muted-foreground">
                Portrait DTR layout based on the form you provided.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Printer className="h-4 w-4" />
              {getMonthLabel(month)} {year}
            </div>
          </div>

          <div className="overflow-x-auto">
            <DtrPreview studentName={studentName} month={month} year={year} />
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Format
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">
                Civil Service DTR style
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Data Source
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">
                Student attendance logs
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Output
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">
                Printable PDF
              </p>
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}