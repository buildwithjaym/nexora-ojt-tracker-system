"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
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
  am_in_at: string | null;
  am_out_at: string | null;
  pm_in_at: string | null;
  pm_out_at: string | null;
  am_activity_summary: string | null;
  pm_activity_summary: string | null;
  total_work_seconds?: number | null;
};

type Props = {
  studentName: string;
  attendanceLogs: AttendanceLog[];
};

function formatDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA").format(date);
}

function formatLogged(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString();
}

function formatDateLong(date: Date) {
  return new Intl.DateTimeFormat("en-PH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function StudentCalendarView({
  studentName,
  attendanceLogs,
}: Props) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [open, setOpen] = useState(false);

  const logsMap = useMemo(() => {
    const map = new Map<string, AttendanceLog>();
    attendanceLogs.forEach((log) =>
      map.set(log.attendance_date, log)
    );
    return map;
  }, [attendanceLogs]);

  const activeLog = selectedDate
    ? logsMap.get(formatDateKey(selectedDate))
    : null;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <section className="rounded-2xl border bg-card p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          {studentName}
        </div>

        <h2 className="mt-2 text-2xl font-semibold">
          Attendance Calendar
        </h2>

        <p className="text-sm text-muted-foreground">
          Click any date to view your activity.
        </p>
      </section>

      {/* CALENDAR */}
      <section className="rounded-2xl border bg-card p-4">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            setSelectedDate(date);
            if (date) setOpen(true);
          }}
          className="rounded-xl border bg-background p-3"
        />
      </section>

      {/* MODAL */}
      {open && selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* overlay */}
          <div
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in"
          />

          {/* modal */}
          <div className="relative z-10 w-full max-w-3xl rounded-2xl border bg-background p-6 shadow-xl animate-in zoom-in-95 slide-in-from-bottom-10 duration-200">
            {/* header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Daily Summary
                </p>
                <h2 className="text-xl font-semibold">
                  {formatDateLong(selectedDate)}
                </h2>
              </div>

              <button
                onClick={() => setOpen(false)}
                className="p-2 rounded-lg border hover:bg-muted"
              >
                <X />
              </button>
            </div>

            {/* content */}
            <div className="mt-6 overflow-x-auto">
              <div className="flex gap-4 min-w-max">
                {/* MORNING */}
                <div className="w-[300px] rounded-xl border p-4 bg-card">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Sun className="h-4 w-4 text-primary" />
                    Morning
                  </div>

                  <div className="mt-4 space-y-2 text-sm">
                    <p>In: {formatLogged(activeLog?.am_in_at ?? null)}</p>
                    <p>Out: {formatLogged(activeLog?.am_out_at ?? null)}</p>
                    <p className="mt-2 text-muted-foreground">
                      {activeLog?.am_activity_summary ||
                        "No morning summary"}
                    </p>
                  </div>
                </div>

                {/* AFTERNOON */}
                <div className="w-[300px] rounded-xl border p-4 bg-card">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Sunset className="h-4 w-4 text-primary" />
                    Afternoon
                  </div>

                  <div className="mt-4 space-y-2 text-sm">
                    <p>In: {formatLogged(activeLog?.pm_in_at ?? null)}</p>
                    <p>Out: {formatLogged(activeLog?.pm_out_at ?? null)}</p>
                    <p className="mt-2 text-muted-foreground">
                      {activeLog?.pm_activity_summary ||
                        "No afternoon summary"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* hint */}
            <p className="mt-4 text-xs text-muted-foreground text-center">
              ← Scroll to view morning & afternoon →
            </p>
          </div>
        </div>
      )}
    </div>
  );
}