"use client";

import { useMemo, useState } from "react";
import {
  Camera,
  CheckCircle2,
  Clock3,
  MapPin,
  ShieldCheck,
  Sparkles,
  TimerReset,
} from "lucide-react";
import { AttendanceActionModal } from "@/components/student/attendance-action-modal";
import { ManilaLiveClock } from "@/components/student/manila-live-clock";

type AttendanceDay = {
  id: string;
  status: string;
  attendance_date: string;
  am_in_at: string | null;
  am_out_at: string | null;
  pm_in_at: string | null;
  pm_out_at: string | null;
  am_activity_summary: string | null;
  pm_activity_summary: string | null;
  total_work_seconds?: number | null;
} | null;

type RecentLog = {
  id: string;
  attendance_date: string;
  status: string;
  am_in_at: string | null;
  am_out_at: string | null;
  pm_in_at: string | null;
  pm_out_at: string | null;
  total_work_seconds?: number | null;
};

type StudentAttendancePanelProps = {
  studentName: string;
  attendanceDate: string;
  readableDate: string;
  currentMinutes: number;
  office: {
    id: string;
    name: string;
    address: string;
    allowedRadiusMeters: number;
  };
  assignmentId: string;
  todayAttendance: AttendanceDay;
  recentLogs: RecentLog[];
};

type EventType = "am_in" | "am_out" | "pm_in" | "pm_out";

const MORNING_IN_START = 8 * 60;
const MORNING_END = 12 * 60 + 30;
const AFTERNOON_START = 13 * 60;
const AFTERNOON_END = 17 * 60;

function getActionState(
  eventType: EventType,
  currentMinutes: number,
  todayAttendance: AttendanceDay
) {
  const day = todayAttendance;

  if (eventType === "am_in") {
    if (day?.am_in_at) return { enabled: false, reason: "Already recorded" };
    if (currentMinutes < MORNING_IN_START) {
      return { enabled: false, reason: "Starts at 8:00 AM" };
    }
    if (currentMinutes > MORNING_END) {
      return { enabled: false, reason: "Morning session closed" };
    }
    return { enabled: true, reason: "Available now" };
  }

  if (eventType === "am_out") {
    if (!day?.am_in_at) return { enabled: false, reason: "Time in first" };
    if (day?.am_out_at) return { enabled: false, reason: "Already recorded" };
    if (currentMinutes > MORNING_END) {
      return { enabled: false, reason: "Morning session closed" };
    }
    return { enabled: true, reason: "Available now" };
  }

  if (eventType === "pm_in") {
    if (!day?.am_in_at || !day?.am_out_at) {
      return { enabled: false, reason: "Complete morning first" };
    }
    if (day?.pm_in_at) return { enabled: false, reason: "Already recorded" };
    if (currentMinutes < AFTERNOON_START) {
      return { enabled: false, reason: "Starts at 1:00 PM" };
    }
    if (currentMinutes > AFTERNOON_END) {
      return { enabled: false, reason: "Afternoon session closed" };
    }
    return { enabled: true, reason: "Available now" };
  }

  if (eventType === "pm_out") {
    if (!day?.pm_in_at) return { enabled: false, reason: "Time in first" };
    if (day?.pm_out_at) return { enabled: false, reason: "Already recorded" };
    if (currentMinutes < AFTERNOON_START) {
      return { enabled: false, reason: "Starts at 1:00 PM" };
    }
    if (currentMinutes > AFTERNOON_END) {
      return { enabled: false, reason: "Afternoon session closed" };
    }
    return { enabled: true, reason: "Available now" };
  }

  return { enabled: false, reason: "Unavailable" };
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

function formatWorkHours(seconds: number) {
  const totalHours = Math.floor((seconds || 0) / 3600);
  const totalMinutes = Math.floor(((seconds || 0) % 3600) / 60);
  return `${totalHours}h ${totalMinutes}m`;
}

export function StudentAttendancePanel({
  studentName,
  attendanceDate,
  readableDate,
  currentMinutes,
  office,
  todayAttendance,
  recentLogs,
}: StudentAttendancePanelProps) {
  const [openEvent, setOpenEvent] = useState<EventType | null>(null);

  const states = useMemo(
    () => ({
      am_in: getActionState("am_in", currentMinutes, todayAttendance),
      am_out: getActionState("am_out", currentMinutes, todayAttendance),
      pm_in: getActionState("pm_in", currentMinutes, todayAttendance),
      pm_out: getActionState("pm_out", currentMinutes, todayAttendance),
    }),
    [currentMinutes, todayAttendance]
  );

  const cards: {
    key: EventType;
    label: string;
    variant: "in" | "out";
    loggedAt: string | null;
  }[] = [
    { key: "am_in", label: "Morning Time In", variant: "in", loggedAt: todayAttendance?.am_in_at ?? null },
    { key: "am_out", label: "Morning Time Out", variant: "out", loggedAt: todayAttendance?.am_out_at ?? null },
    { key: "pm_in", label: "Afternoon Time In", variant: "in", loggedAt: todayAttendance?.pm_in_at ?? null },
    { key: "pm_out", label: "Afternoon Time Out", variant: "out", loggedAt: todayAttendance?.pm_out_at ?? null },
  ];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="pointer-events-none absolute -left-16 top-0 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>{studentName}</span>
              </div>

              <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                Daily Time Record
              </h2>

              <p className="mt-2 text-sm text-muted-foreground">{readableDate}</p>

              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5">
                <Clock3 className="h-4 w-4 text-primary" />
                <ManilaLiveClock />
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-background p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <p className="text-xs uppercase tracking-wide">Assigned Office</p>
              </div>
              <p className="mt-2 text-sm font-medium">{office.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{office.address}</p>
              <p className="mt-2 text-xs text-primary">
                Allowed radius: {office.allowedRadiusMeters} meters
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:w-[420px]">
            <div className="rounded-2xl border border-border bg-background p-4 transition hover:border-primary/20 hover:shadow-[0_0_30px_rgba(59,130,246,0.08)]">
              <div className="flex items-center gap-2 text-muted-foreground">
                <ShieldCheck className="h-4 w-4" />
                <p className="text-xs uppercase tracking-wide">Server Time</p>
              </div>
              <p className="mt-2 text-sm font-medium">
                Time is populated automatically by the server.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-background p-4 transition hover:border-primary/20 hover:shadow-[0_0_30px_rgba(59,130,246,0.08)]">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Camera className="h-4 w-4" />
                <p className="text-xs uppercase tracking-wide">Photo Proof</p>
              </div>
              <p className="mt-2 text-sm font-medium">
                Camera-first with image compression before upload.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const state = states[card.key];
          const logged = !!card.loggedAt;

          return (
            <div
              key={card.key}
              className={`rounded-[1.5rem] border p-5 shadow-sm transition ${
                logged
                  ? "border-primary/25 bg-primary/10 shadow-[0_0_30px_rgba(59,130,246,0.08)]"
                  : "border-border bg-card"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    {card.variant === "in" ? "Time In" : "Time Out"}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold">{card.label}</h3>
                </div>

                <div
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    logged
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-background text-muted-foreground"
                  }`}
                >
                  {logged ? "Recorded" : "Pending"}
                </div>
              </div>

              <p className="mt-4 text-sm text-muted-foreground">
                Logged Time:{" "}
                <span className="font-medium text-foreground">
                  {formatLogged(card.loggedAt)}
                </span>
              </p>

              <p className="mt-2 text-xs text-muted-foreground">{state.reason}</p>

              <button
                type="button"
                disabled={!state.enabled}
                onClick={() => setOpenEvent(card.key)}
                className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                  state.enabled
                    ? card.variant === "in"
                      ? "bg-primary text-primary-foreground hover:opacity-90"
                      : "bg-foreground text-background hover:opacity-90"
                    : "cursor-not-allowed border border-border bg-background text-muted-foreground opacity-60"
                }`}
              >
                {card.variant === "in" ? (
                  <>
                    <Clock3 className="h-4 w-4" />
                    TIME IN
                  </>
                ) : (
                  <>
                    <TimerReset className="h-4 w-4" />
                    TIME OUT
                  </>
                )}
              </button>
            </div>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[1.75rem] border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-5">
            <p className="text-sm font-medium">Today Overview</p>
            <p className="text-xs text-muted-foreground">
              Your attendance flow resets for the afternoon after the morning window closes.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Morning</p>
              <p className="mt-2 text-sm">In: {formatLogged(todayAttendance?.am_in_at ?? null)}</p>
              <p className="text-sm">Out: {formatLogged(todayAttendance?.am_out_at ?? null)}</p>
            </div>

            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Afternoon</p>
              <p className="mt-2 text-sm">In: {formatLogged(todayAttendance?.pm_in_at ?? null)}</p>
              <p className="text-sm">Out: {formatLogged(todayAttendance?.pm_out_at ?? null)}</p>
            </div>

            <div className="rounded-2xl border border-border bg-background p-4 sm:col-span-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Today Work Time</p>
              <p className="mt-2 text-base font-semibold">
                {formatWorkHours(Number(todayAttendance?.total_work_seconds ?? 0))}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-5">
            <p className="text-sm font-medium">Recent DTR</p>
            <p className="text-xs text-muted-foreground">
              Your most recent attendance days
            </p>
          </div>

          <div className="space-y-3">
            {recentLogs.length > 0 ? (
              recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-2xl border border-border bg-background p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{log.attendance_date}</p>
                      <p className="text-xs capitalize text-muted-foreground">{log.status}</p>
                    </div>

                    <div className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {formatWorkHours(Number(log.total_work_seconds ?? 0))}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-background p-6 text-center">
                <p className="text-sm font-medium">No attendance records yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Your attendance history will appear here after your first entry.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {openEvent && (
        <AttendanceActionModal
          eventType={openEvent}
          officeName={office.name}
          officeAddress={office.address}
          allowedRadiusMeters={office.allowedRadiusMeters}
          onClose={() => setOpenEvent(null)}
        />
      )}
    </div>
  );
}