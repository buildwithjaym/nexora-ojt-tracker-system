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
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
        aria-label="Close summary modal overlay"
      />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-border bg-background shadow-2xl animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-200">
        <div className="relative border-b border-border px-5 py-4">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-primary/5 blur-2xl" />
          <div className="relative flex items-center justify-between">
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
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-border bg-card p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Status
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
                    {formatWorkHours(Number(activeLog.total_work_seconds ?? 0))}
                  </p>
                </div>

                <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4">
                  <div className="flex items-center gap-2 text-primary">
                    <CheckCircle2 className="h-4 w-4" />
                    <p className="text-xs uppercase tracking-wide">Swipe View</p>
                  </div>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    Swipe left and right to switch between morning and afternoon.
                  </p>
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
                        <p className="mt-2 text-sm text-foreground leading-6">
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
                        <p className="mt-2 text-sm text-foreground leading-6">
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

  const datesWithLogs = useMemo(
    () => attendanceLogs.map((log) => parseDateOnly(log.attendance_date)),
    [attendanceLogs]
  );

  const selectedLabel = selectedDate ? formatDateLong(selectedDate) : "No date selected";

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
              Tap a date to open a swipeable summary of your morning and afternoon activities.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-background px-4 py-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              <p className="text-xs uppercase tracking-wide">Selected Date</p>
            </div>
            <p className="mt-2 text-sm font-medium">{selectedLabel}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="rounded-[1.75rem] border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="mb-4">
            <p className="text-sm font-medium">Interactive Calendar</p>
            <p className="text-xs text-muted-foreground">
              Today has a blue glow. Logged dates have markers.
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
                logged: datesWithLogs,
                todayGlow: [today],
              }}
              modifiersClassNames={{
                logged:
                  "relative after:absolute after:bottom-1.5 after:left-1/2 after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:rounded-full after:bg-primary",
                todayGlow:
                  "bg-primary/10 text-primary ring-1 ring-primary/20 shadow-[0_0_24px_rgba(59,130,246,0.18)]",
              }}
            />
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-5">
            <p className="text-sm font-medium">Quick Preview</p>
            <p className="text-xs text-muted-foreground">
              The large empty area now shows a useful preview instead of staying blank.
            </p>
          </div>

          {activeLog ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Status
                </p>
                <p className="mt-2 text-sm font-medium capitalize">
                  {activeLog.status}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Work Time
                </p>
                <p className="mt-2 text-sm font-medium">
                  {formatWorkHours(Number(activeLog.total_work_seconds ?? 0))}
                </p>
              </div>

              <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4">
                <p className="text-xs uppercase tracking-wide text-primary">
                  Details
                </p>
                <p className="mt-2 text-sm font-medium">
                  Click the date again or choose another date to open the modal summary.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Morning
                </p>
                <p className="mt-2 text-sm">
                  {activeLog.am_activity_summary?.trim() || "No morning summary"}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Afternoon
                </p>
                <p className="mt-2 text-sm">
                  {activeLog.pm_activity_summary?.trim() || "No afternoon summary"}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Date
                </p>
                <p className="mt-2 text-sm font-medium">{selectedLabel}</p>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-border bg-background p-8 text-center">
              <div>
                <Clock3 className="mx-auto h-5 w-5 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium">No attendance preview</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Select a date with or without logs to open the summary modal.
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