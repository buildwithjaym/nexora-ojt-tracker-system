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
  X,
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

const FULL_DAY_SECONDS = 8 * 60 * 60;

function parseDateOnly(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
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

function getDayLevel(seconds: number) {
  if (seconds >= FULL_DAY_SECONDS) return "complete";
  if (seconds > 0) return "partial";
  return "empty";
}

function getStatusBadgeClasses(level: "complete" | "partial" | "empty") {
  if (level === "complete") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-400";
  }
  if (level === "partial") {
    return "border-amber-500/20 bg-amber-500/10 text-amber-400";
  }
  return "border-border bg-background text-muted-foreground";
}

type DaySummaryModalProps = {
  selectedDate: Date;
  activeLog: AttendanceLog | null;
  onClose: () => void;
};

function DaySummaryModal({
  selectedDate,
  activeLog,
  onClose,
}: DaySummaryModalProps) {
  const totalSeconds = Number(activeLog?.total_work_seconds ?? 0);
  const dayLevel = getDayLevel(totalSeconds);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
        aria-label="Close summary modal overlay"
      />

      <div className="relative z-10 flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-[1.75rem] border border-border bg-background shadow-2xl animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-200">
        <div className="relative border-b border-border px-5 py-4">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-primary/5 blur-2xl" />
          <div className="relative flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Daily Attendance Summary</p>
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                {formatDateLong(selectedDate)}
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card transition hover:bg-muted"
              aria-label="Close summary modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-5 py-5">
          {activeLog ? (
            <div className="space-y-5">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-border bg-card p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Attendance Status
                  </p>
                  <p className="mt-2 text-sm font-medium capitalize">
                    {activeLog.status}
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-card p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Total Work Time
                  </p>
                  <p className="mt-2 text-sm font-medium">
                    {formatWorkHours(totalSeconds)}
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-card p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Day Level
                  </p>
                  <div
                    className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-medium capitalize ${getStatusBadgeClasses(
                      dayLevel
                    )}`}
                  >
                    {dayLevel === "complete"
                      ? "Completed day"
                      : dayLevel === "partial"
                      ? "Partial day"
                      : "No work time"}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex snap-x snap-mandatory gap-4">
                  <section className="min-w-full snap-center rounded-[1.5rem] border border-border bg-card p-5 shadow-sm md:min-w-[48%]">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Sun className="h-4 w-4 text-primary" />
                      <p className="text-xs uppercase tracking-wide">Morning Session</p>
                    </div>

                    <div className="mt-4 grid gap-3">
                      <div className="rounded-2xl border border-border bg-background p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Time In
                        </p>
                        <p className="mt-1 text-sm font-medium">
                          {formatLogged(activeLog.am_in_at)}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-border bg-background p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Time Out
                        </p>
                        <p className="mt-1 text-sm font-medium">
                          {formatLogged(activeLog.am_out_at)}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-border bg-background p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Activity Summary
                        </p>
                        <p className="mt-2 text-sm leading-6 text-foreground">
                          {activeLog.am_activity_summary?.trim() ||
                            "No morning activity summary recorded."}
                        </p>
                      </div>
                    </div>
                  </section>

                  <section className="min-w-full snap-center rounded-[1.5rem] border border-border bg-card p-5 shadow-sm md:min-w-[48%]">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Sunset className="h-4 w-4 text-primary" />
                      <p className="text-xs uppercase tracking-wide">Afternoon Session</p>
                    </div>

                    <div className="mt-4 grid gap-3">
                      <div className="rounded-2xl border border-border bg-background p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Time In
                        </p>
                        <p className="mt-1 text-sm font-medium">
                          {formatLogged(activeLog.pm_in_at)}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-border bg-background p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Time Out
                        </p>
                        <p className="mt-1 text-sm font-medium">
                          {formatLogged(activeLog.pm_out_at)}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-border bg-background p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Activity Summary
                        </p>
                        <p className="mt-2 text-sm leading-6 text-foreground">
                          {activeLog.pm_activity_summary?.trim() ||
                            "No afternoon activity summary recorded."}
                        </p>
                      </div>
                    </div>
                  </section>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <ChevronLeft className="h-4 w-4" />
                <span>Swipe horizontally to switch session cards</span>
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
              <Clock3 className="mx-auto h-5 w-5 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">No summary for this date</p>
              <p className="mt-1 text-xs text-muted-foreground">
                This day does not have an attendance record yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function StudentCalendarView({
  studentName,
  attendanceLogs,
}: StudentCalendarViewProps) {
  const today = useMemo(() => getTodayLocalDate(), []);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(today);
  const [openModal, setOpenModal] = useState(false);

  const logsByDate = useMemo(() => {
    const map = new Map<string, AttendanceLog>();
    for (const log of attendanceLogs) {
      map.set(log.attendance_date, log);
    }
    return map;
  }, [attendanceLogs]);

  const activeLog = useMemo(() => {
    if (!selectedDate) return null;
    return logsByDate.get(formatDateKey(selectedDate)) ?? null;
  }, [selectedDate, logsByDate]);

  const completeDates = useMemo(
    () =>
      attendanceLogs
        .filter((log) => Number(log.total_work_seconds ?? 0) >= FULL_DAY_SECONDS)
        .map((log) => parseDateOnly(log.attendance_date)),
    [attendanceLogs]
  );

  const partialDates = useMemo(
    () =>
      attendanceLogs
        .filter((log) => {
          const seconds = Number(log.total_work_seconds ?? 0);
          return seconds > 0 && seconds < FULL_DAY_SECONDS;
        })
        .map((log) => parseDateOnly(log.attendance_date)),
    [attendanceLogs]
  );

  const selectedLabel = selectedDate ? formatDateLong(selectedDate) : "No date selected";
  const selectedSeconds = Number(activeLog?.total_work_seconds ?? 0);
  const selectedLevel = getDayLevel(selectedSeconds);

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[1.5rem] border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="pointer-events-none absolute -left-16 top-0 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>{studentName}</span>
            </div>

            <h2 className="text-2xl font-semibold tracking-tight">
              Attendance Calendar
            </h2>

            <p className="max-w-2xl text-sm text-muted-foreground">
              Click a date to open a swipeable summary of your morning and afternoon activities.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-background px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Selected Date
              </p>
              <p className="mt-2 text-sm font-medium">{selectedLabel}</p>
            </div>

            <div className="rounded-2xl border border-border bg-background px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Work Time
              </p>
              <p className="mt-2 text-sm font-medium">
                {activeLog ? formatWorkHours(selectedSeconds) : "—"}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-background px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Day Level
              </p>
              <div
                className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-medium capitalize ${getStatusBadgeClasses(
                  activeLog ? selectedLevel : "empty"
                )}`}
              >
                {activeLog
                  ? selectedLevel === "complete"
                    ? "Completed"
                    : selectedLevel === "partial"
                    ? "Partial"
                    : "Empty"
                  : "No record"}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="rounded-[1.5rem] border border-border bg-card p-4 shadow-sm">
          <div className="mb-4">
            <p className="text-sm font-medium">Interactive Calendar</p>
            <p className="text-xs text-muted-foreground">
              Blue glow is today. Green means completed, amber means partial.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-background p-3">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                setSelectedDate(date);
                if (date) setOpenModal(true);
              }}
              className="w-full"
              modifiers={{
                complete: completeDates,
                partial: partialDates,
                todayGlow: [today],
              }}
              modifiersClassNames={{
                complete:
                  "relative after:absolute after:bottom-1.5 after:left-1/2 after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:rounded-full after:bg-emerald-400",
                partial:
                  "relative after:absolute after:bottom-1.5 after:left-1/2 after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:rounded-full after:bg-amber-400",
                todayGlow:
                  "bg-primary/10 text-primary ring-1 ring-primary/20 shadow-[0_0_20px_rgba(59,130,246,0.15)]",
              }}
            />
          </div>

          <div className="mt-4 grid gap-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              Completed day (8 hours)
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              Partial day
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-full bg-primary" />
              Today
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Quick Preview</p>
              <p className="text-xs text-muted-foreground">
                A preview section.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              Tap a date
            </div>
          </div>

          {activeLog ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-border bg-background p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Sun className="h-4 w-4 text-primary" />
                  <p className="text-xs uppercase tracking-wide">Morning Preview</p>
                </div>
                <p className="mt-3 text-sm">
                  {activeLog.am_activity_summary?.trim() || "No morning summary"}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {formatLogged(activeLog.am_in_at)} • {formatLogged(activeLog.am_out_at)}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-background p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Sunset className="h-4 w-4 text-primary" />
                  <p className="text-xs uppercase tracking-wide">Afternoon Preview</p>
                </div>
                <p className="mt-3 text-sm">
                  {activeLog.pm_activity_summary?.trim() || "No afternoon summary"}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {formatLogged(activeLog.pm_in_at)} • {formatLogged(activeLog.pm_out_at)}
                </p>
              </div>

              <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4 lg:col-span-2">
                <p className="text-xs uppercase tracking-wide text-primary">
                  View Full Summary
                </p>
                <p className="mt-2 text-sm font-medium text-foreground">
                  Click the date to open the swipeable modal with full day details.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-border bg-background p-8 text-center">
              <div>
                <Clock3 className="mx-auto h-5 w-5 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium">No attendance preview</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Select any date to open the modal summary and review your day.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {openModal && selectedDate && (
        <DaySummaryModal
          selectedDate={selectedDate}
          activeLog={activeLog}
          onClose={() => setOpenModal(false)}
        />
      )}
    </div>
  );
}