"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Sparkles,
  Sun,
  Sunset,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";

type AttendanceLog = {
  id: string;
  attendance_date: string;
  status: string;
  am_in_at: string | null;
  am_out_at: string | null;
  pm_in_at: string | null;
  pm_out_at: string | null;
  am_activity_summary: string | null;
  pm_activity_summary: string | null;
  total_work_seconds?: number | null;
};

type StudentCalendarViewProps = {
  studentName: string;
  attendanceLogs: AttendanceLog[];
};

function parseDateOnly(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDateLong(date: Date) {
  return new Intl.DateTimeFormat("en-PH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function formatWorkHours(seconds: number) {
  const totalHours = Math.floor((seconds || 0) / 3600);
  const totalMinutes = Math.floor(((seconds || 0) % 3600) / 60);
  return `${totalHours}h ${totalMinutes}m`;
}

function formatLogged(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(new Date(value));
}

function getTodayLocalDate() {
  const now = new Date();
  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  const [year, month, day] = formatted.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function StudentCalendarView({
  studentName,
  attendanceLogs,
}: StudentCalendarViewProps) {
  const today = useMemo(() => getTodayLocalDate(), []);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(today);

  const logsByDate = useMemo(() => {
    const map = new Map<string, AttendanceLog>();
    for (const log of attendanceLogs) {
      map.set(log.attendance_date, log);
    }
    return map;
  }, [attendanceLogs]);

  const activeLog = useMemo(() => {
    if (!selectedDate) return null;

    const key = new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(selectedDate);

    return logsByDate.get(key) ?? null;
  }, [selectedDate, logsByDate]);

  const datesWithLogs = useMemo(
    () => attendanceLogs.map((log) => parseDateOnly(log.attendance_date)),
    [attendanceLogs]
  );

  const selectedDateLabel = selectedDate
    ? formatDateLong(selectedDate)
    : "No date selected";

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="pointer-events-none absolute -left-16 top-0 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>{studentName}</span>
            </div>

            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Attendance Calendar
            </h2>

            <p className="max-w-2xl text-sm text-muted-foreground">
              Review your attendance records by date. Click a day to open the
              detailed summary for your morning and afternoon activity.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-background px-4 py-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              <p className="text-xs uppercase tracking-wide">Selected Date</p>
            </div>
            <p className="mt-2 text-sm font-medium">{selectedDateLabel}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[1.75rem] border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="mb-4">
            <p className="text-sm font-medium">Interactive Calendar</p>
            <p className="text-xs text-muted-foreground">
              Blue glow highlights today. Dates with attendance records are marked.
            </p>
          </div>

          <div className="overflow-x-auto">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="w-full rounded-2xl border border-border bg-background p-3"
              modifiers={{
                logged: datesWithLogs,
                todayGlow: [today],
              }}
              modifiersClassNames={{
                logged:
                  "relative after:absolute after:bottom-1.5 after:left-1/2 after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:rounded-full after:bg-primary",
                todayGlow:
                  "bg-primary/10 text-primary ring-1 ring-primary/20 shadow-[0_0_20px_rgba(59,130,246,0.15)]",
              }}
            />
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Daily Summary</p>
              <p className="text-xs text-muted-foreground">
                Scroll horizontally to view morning and afternoon details.
              </p>
            </div>

            {activeLog ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {activeLog.status}
              </div>
            ) : null}
          </div>

          {selectedDate && activeLog ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-background px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Attendance Date
                    </p>
                    <p className="mt-1 text-sm font-medium">{selectedDateLabel}</p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Work Time
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {formatWorkHours(Number(activeLog.total_work_seconds ?? 0))}
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <div className="flex min-w-max gap-4 pb-2">
                  <div className="w-[320px] shrink-0 rounded-[1.5rem] border border-border bg-background p-5 shadow-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Sun className="h-4 w-4 text-primary" />
                      <p className="text-xs uppercase tracking-wide">Morning</p>
                    </div>

                    <div className="mt-4 space-y-3">
                      <div className="rounded-2xl border border-border bg-card p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Time In
                        </p>
                        <p className="mt-1 text-sm font-medium">
                          {formatLogged(activeLog.am_in_at)}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-border bg-card p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Time Out
                        </p>
                        <p className="mt-1 text-sm font-medium">
                          {formatLogged(activeLog.am_out_at)}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-border bg-card p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Summary
                        </p>
                        <p className="mt-2 text-sm text-foreground">
                          {activeLog.am_activity_summary?.trim() ||
                            "No morning activity summary recorded."}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="w-[320px] shrink-0 rounded-[1.5rem] border border-border bg-background p-5 shadow-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Sunset className="h-4 w-4 text-primary" />
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Afternoon
                      </p>
                    </div>

                    <div className="mt-4 space-y-3">
                      <div className="rounded-2xl border border-border bg-card p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Time In
                        </p>
                        <p className="mt-1 text-sm font-medium">
                          {formatLogged(activeLog.pm_in_at)}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-border bg-card p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Time Out
                        </p>
                        <p className="mt-1 text-sm font-medium">
                          {formatLogged(activeLog.pm_out_at)}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-border bg-card p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Summary
                        </p>
                        <p className="mt-2 text-sm text-foreground">
                          {activeLog.pm_activity_summary?.trim() ||
                            "No afternoon activity summary recorded."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ChevronLeft className="h-4 w-4" />
                <span>Scroll left or right to view both summaries</span>
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          ) : selectedDate ? (
            <div className="rounded-2xl border border-dashed border-border bg-background p-8 text-center">
              <Clock3 className="mx-auto h-5 w-5 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">No summary for this date</p>
              <p className="mt-1 text-xs text-muted-foreground">
                This day does not have an attendance record yet.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-background p-8 text-center">
              <Clock3 className="mx-auto h-5 w-5 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">Select a date</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Choose any day from the calendar to view your detailed summary.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}