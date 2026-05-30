"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  MapPin,
  Search,
  TimerReset,
  Users,
  X,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { createClient } from "@/lib/supabase/client";

type Student = {
  id: string;
  first_name: string;
  last_name: string;
  student_no?: string | null;
  office_name?: string | null;
  assignment_id?: string;
  office_id?: string;
  assignment_status?: string;
};

type AttendanceLog = {
  id: string;
  student_id: string;
  assignment_id: string;
  office_id: string;
  attendance_date: string;
  status?: string | null;

  am_in_at?: string | null;
  am_out_at?: string | null;
  pm_in_at?: string | null;
  pm_out_at?: string | null;

  am_in_photo_url?: string | null;
  am_out_photo_url?: string | null;
  pm_in_photo_url?: string | null;
  pm_out_photo_url?: string | null;

  am_in_latitude?: number | null;
  am_in_longitude?: number | null;
  am_in_accuracy_meters?: number | null;
  am_in_distance_meters?: number | null;

  am_out_latitude?: number | null;
  am_out_longitude?: number | null;
  am_out_accuracy_meters?: number | null;
  am_out_distance_meters?: number | null;

  pm_in_latitude?: number | null;
  pm_in_longitude?: number | null;
  pm_in_accuracy_meters?: number | null;
  pm_in_distance_meters?: number | null;

  pm_out_latitude?: number | null;
  pm_out_longitude?: number | null;
  pm_out_accuracy_meters?: number | null;
  pm_out_distance_meters?: number | null;

  am_activity_summary?: string | null;
  pm_activity_summary?: string | null;

  am_work_seconds?: number | null;
  pm_work_seconds?: number | null;
  total_work_seconds?: number | null;
};

type Props = {
  teacherName: string;
  students: Student[];
  attendanceLogs: AttendanceLog[];
};

type SessionType = "morning" | "afternoon";

const FULL_DAY_SECONDS = 8 * 60 * 60;
const BUCKET_NAME = "attendance-photos";

function formatDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function parseDateOnly(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDateLong(date: Date) {
  return new Intl.DateTimeFormat("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatTime(value?: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));
}

function formatHours(seconds?: number | null) {
  const value = Number(seconds ?? 0);
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function getStudentName(student?: Student) {
  if (!student) return "Unknown Student";
  return `${student.last_name}, ${student.first_name}`;
}

function resolvePhotoUrl(photoUrl?: string | null) {
  if (!photoUrl) return null;

  if (photoUrl.startsWith("http://") || photoUrl.startsWith("https://")) {
    return photoUrl;
  }

  const supabase = createClient();
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(photoUrl);
  return data.publicUrl;
}

function isDayComplete(log: AttendanceLog) {
  return Boolean(
    log.am_in_at &&
      log.am_out_at &&
      log.pm_in_at &&
      log.pm_out_at &&
      Number(log.total_work_seconds ?? 0) >= FULL_DAY_SECONDS
  );
}

function getSessionStatus(log: AttendanceLog, session: SessionType) {
  const inAt = session === "morning" ? log.am_in_at : log.pm_in_at;
  const outAt = session === "morning" ? log.am_out_at : log.pm_out_at;

  if (inAt && outAt) return "complete";
  if (inAt && !outAt) return "missing-out";
  if (!inAt && outAt) return "missing-in";
  return "none";
}

function StatusPill({ status }: { status: string }) {
  if (status === "complete") {
    return (
      <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-500">
        Complete
      </span>
    );
  }

  if (status === "missing-out") {
    return (
      <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-500">
        Missing Time Out
      </span>
    );
  }

  if (status === "missing-in") {
    return (
      <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-500">
        Missing Time In
      </span>
    );
  }

  return (
    <span className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-500">
      No Record
    </span>
  );
}

function EvidenceCard({
  title,
  time,
  latitude,
  longitude,
  accuracy,
  distance,
  photoUrl,
}: {
  title: string;
  time?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  distance?: number | null;
  photoUrl?: string | null;
}) {
  const resolvedPhotoUrl = resolvePhotoUrl(photoUrl);

  return (
    <div className="rounded-3xl border border-border bg-background p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">{title}</p>
        <p className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium">
          {formatTime(time)}
        </p>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-muted/30">
        {resolvedPhotoUrl ? (
          <img
            src={resolvedPhotoUrl}
            alt={`${title} evidence`}
            className="h-56 w-full object-cover transition duration-500 hover:scale-105"
          />
        ) : (
          <div className="flex h-56 items-center justify-center text-xs text-muted-foreground">
            No photo evidence
          </div>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-card p-3">
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          Location Evidence
        </p>

        {latitude && longitude ? (
          <div className="mt-2 space-y-1">
            <p className="break-all text-xs font-medium">
              {latitude}, {longitude}
            </p>
            <p className="text-xs text-muted-foreground">
              Accuracy: {accuracy ?? "—"}m · Distance: {distance ?? "—"}m
            </p>
          </div>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            No location recorded.
          </p>
        )}
      </div>
    </div>
  );
}

function AttendanceModal({
  logs,
  activeIndex,
  studentsById,
  onClose,
  onChangeIndex,
}: {
  logs: AttendanceLog[];
  activeIndex: number;
  studentsById: Map<string, Student>;
  onClose: () => void;
  onChangeIndex: (index: number) => void;
}) {
  const log = logs[activeIndex];
  const student = studentsById.get(log.student_id);

  const canGoPrev = activeIndex > 0;
  const canGoNext = activeIndex < logs.length - 1;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
        aria-label="Close modal"
      />

      <div className="relative z-10 max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-[2rem] border border-border bg-background shadow-2xl animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Student Attendance Evidence
            </p>
            <h2 className="text-xl font-semibold">
              {getStudentName(student)}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Student {activeIndex + 1} of {logs.length} ·{" "}
              {formatDateLong(parseDateOnly(log.attendance_date))}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={!canGoPrev}
              onClick={() => onChangeIndex(activeIndex - 1)}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </button>

            <button
              disabled={!canGoNext}
              onClick={() => onChangeIndex(activeIndex + 1)}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>

            <button
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card transition hover:bg-muted"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="max-h-[calc(92vh-110px)] overflow-y-auto p-5">
          <div className="mb-5 grid gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-border bg-card p-4">
              <Clock3 className="h-4 w-4 text-primary" />
              <p className="mt-2 text-sm font-semibold">
                {formatHours(log.total_work_seconds)}
              </p>
              <p className="text-xs text-muted-foreground">Total Rendered</p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <p className="mt-2 text-sm font-semibold">
                {formatHours(log.am_work_seconds)}
              </p>
              <p className="text-xs text-muted-foreground">Morning Hours</p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <p className="mt-2 text-sm font-semibold">
                {formatHours(log.pm_work_seconds)}
              </p>
              <p className="text-xs text-muted-foreground">Afternoon Hours</p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <p className="mt-2 text-sm font-semibold capitalize">
                {log.status ?? "open"}
              </p>
              <p className="text-xs text-muted-foreground">Record Status</p>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <section className="rounded-[1.5rem] border border-border bg-card p-4">
              <div className="mb-4">
                <h3 className="text-lg font-semibold">Morning Attendance</h3>
                <p className="text-xs text-muted-foreground">
                  AM Time In and AM Time Out evidence.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <EvidenceCard
                  title="AM Time In"
                  time={log.am_in_at}
                  latitude={log.am_in_latitude}
                  longitude={log.am_in_longitude}
                  accuracy={log.am_in_accuracy_meters}
                  distance={log.am_in_distance_meters}
                  photoUrl={log.am_in_photo_url}
                />

                <EvidenceCard
                  title="AM Time Out"
                  time={log.am_out_at}
                  latitude={log.am_out_latitude}
                  longitude={log.am_out_longitude}
                  accuracy={log.am_out_accuracy_meters}
                  distance={log.am_out_distance_meters}
                  photoUrl={log.am_out_photo_url}
                />
              </div>

              <div className="mt-4 rounded-2xl border border-border bg-background p-4">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Morning Activity
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {log.am_activity_summary?.trim() ||
                    "No morning activity summary."}
                </p>
              </div>
            </section>

            <section className="rounded-[1.5rem] border border-border bg-card p-4">
              <div className="mb-4">
                <h3 className="text-lg font-semibold">Afternoon Attendance</h3>
                <p className="text-xs text-muted-foreground">
                  PM Time In and PM Time Out evidence.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <EvidenceCard
                  title="PM Time In"
                  time={log.pm_in_at}
                  latitude={log.pm_in_latitude}
                  longitude={log.pm_in_longitude}
                  accuracy={log.pm_in_accuracy_meters}
                  distance={log.pm_in_distance_meters}
                  photoUrl={log.pm_in_photo_url}
                />

                <EvidenceCard
                  title="PM Time Out"
                  time={log.pm_out_at}
                  latitude={log.pm_out_latitude}
                  longitude={log.pm_out_longitude}
                  accuracy={log.pm_out_accuracy_meters}
                  distance={log.pm_out_distance_meters}
                  photoUrl={log.pm_out_photo_url}
                />
              </div>

              <div className="mt-4 rounded-2xl border border-border bg-background p-4">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Afternoon Activity
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {log.pm_activity_summary?.trim() ||
                    "No afternoon activity summary."}
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TeacherAttendanceCalendar({
  teacherName,
  students,
  attendanceLogs,
}: Props) {
  const today = useMemo(() => new Date(), []);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(today);
  const [session, setSession] = useState<SessionType>("morning");
  const [search, setSearch] = useState("");
  const [modalIndex, setModalIndex] = useState<number | null>(null);

  const studentsById = useMemo(() => {
    return new Map(students.map((student) => [student.id, student]));
  }, [students]);

  const logsByDate = useMemo(() => {
    const map = new Map<string, AttendanceLog[]>();

    for (const log of attendanceLogs) {
      const existing = map.get(log.attendance_date) ?? [];
      existing.push(log);
      map.set(log.attendance_date, existing);
    }

    return map;
  }, [attendanceLogs]);

  const selectedKey = selectedDate ? formatDateKey(selectedDate) : "";
  const selectedLogs = logsByDate.get(selectedKey) ?? [];

  const filteredLogs = selectedLogs.filter((log) => {
    const student = studentsById.get(log.student_id);
    const name = getStudentName(student).toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const completeDates = useMemo(() => {
    return Array.from(logsByDate.entries())
      .filter(([, logs]) => logs.length > 0 && logs.every(isDayComplete))
      .map(([date]) => parseDateOnly(date));
  }, [logsByDate]);

  const partialDates = useMemo(() => {
    return Array.from(logsByDate.entries())
      .filter(([, logs]) => logs.length > 0 && !logs.every(isDayComplete))
      .map(([date]) => parseDateOnly(date));
  }, [logsByDate]);

  const sessionComplete = selectedLogs.filter(
    (log) => getSessionStatus(log, session) === "complete"
  ).length;

  const sessionIncomplete = selectedLogs.filter((log) => {
    const status = getSessionStatus(log, session);
    return status !== "complete" && status !== "none";
  }).length;

  const noRecordToday = Math.max(students.length - selectedLogs.length, 0);

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="pointer-events-none absolute -left-20 top-0 h-44 w-44 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{teacherName}</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Attendance Calendar
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              See who timed in and out for the morning and afternoon sessions,
              then review photo and location evidence.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-border bg-background p-4">
              <Users className="h-4 w-4 text-primary" />
              <p className="mt-2 text-2xl font-semibold">{students.length}</p>
              <p className="text-xs text-muted-foreground">Assigned</p>
            </div>

            <div className="rounded-2xl border border-border bg-background p-4">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <p className="mt-2 text-2xl font-semibold">{sessionComplete}</p>
              <p className="text-xs text-muted-foreground">
                {session === "morning" ? "AM Complete" : "PM Complete"}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-background p-4">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <p className="mt-2 text-2xl font-semibold">
                {sessionIncomplete}
              </p>
              <p className="text-xs text-muted-foreground">Incomplete</p>
            </div>

            <div className="rounded-2xl border border-border bg-background p-4">
              <TimerReset className="h-4 w-4 text-red-500" />
              <p className="mt-2 text-2xl font-semibold">{noRecordToday}</p>
              <p className="text-xs text-muted-foreground">No Record</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="rounded-[1.75rem] border border-border bg-card p-4 shadow-sm">
          <div className="mb-4">
            <p className="font-medium">Calendar</p>
            <p className="text-xs text-muted-foreground">
              Green means complete day. Amber means incomplete records.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-background p-3">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              modifiers={{
                complete: completeDates,
                partial: partialDates,
              }}
              modifiersClassNames={{
                complete:
                  "relative after:absolute after:bottom-1.5 after:left-1/2 after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:rounded-full after:bg-emerald-400",
                partial:
                  "relative after:absolute after:bottom-1.5 after:left-1/2 after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:rounded-full after:bg-amber-400",
              }}
              className="w-full"
            />
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-border bg-card p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="font-medium">
                {selectedDate ? formatDateLong(selectedDate) : "Select a date"}
              </p>
              <p className="text-xs text-muted-foreground">
                {selectedLogs.length} students with attendance · {noRecordToday}{" "}
                without record
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="flex rounded-2xl border border-border bg-background p-1">
                <button
                  onClick={() => setSession("morning")}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                    session === "morning"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Morning
                </button>

                <button
                  onClick={() => setSession("afternoon")}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                    session === "afternoon"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Afternoon
                </button>
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search student..."
                  className="h-11 w-full rounded-2xl border border-border bg-background pl-9 pr-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/20 sm:w-64"
                />
              </div>
            </div>
          </div>

          {filteredLogs.length > 0 ? (
            <div className="grid gap-3">
              {filteredLogs.map((log, index) => {
                const student = studentsById.get(log.student_id);
                const sessionStatus = getSessionStatus(log, session);

                const inTime =
                  session === "morning" ? log.am_in_at : log.pm_in_at;
                const outTime =
                  session === "morning" ? log.am_out_at : log.pm_out_at;
                const workSeconds =
                  session === "morning"
                    ? log.am_work_seconds
                    : log.pm_work_seconds;

                return (
                  <div
                    key={log.id}
                    className="group grid gap-4 rounded-3xl border border-border bg-background p-4 transition duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg lg:grid-cols-[1.3fr_1fr_1fr_auto]"
                  >
                    <div>
                      <p className="font-semibold">{getStudentName(student)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {student?.student_no ?? "No student no."} ·{" "}
                        {student?.office_name ?? "No office assigned"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-3">
                      <p className="text-xs text-muted-foreground">
                        {session === "morning" ? "AM Time In" : "PM Time In"}
                      </p>
                      <p className="mt-1 text-sm font-semibold">
                        {formatTime(inTime)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-3">
                      <p className="text-xs text-muted-foreground">
                        {session === "morning" ? "AM Time Out" : "PM Time Out"}
                      </p>
                      <p className="mt-1 text-sm font-semibold">
                        {formatTime(outTime)}
                      </p>
                    </div>

                    <div className="flex flex-col justify-between gap-3 lg:items-end">
                      <StatusPill status={sessionStatus} />

                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium">
                          {formatHours(workSeconds)}
                        </span>

                        <button
                          type="button"
                          onClick={() => setModalIndex(index)}
                          className="inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-3 text-xs font-medium text-primary-foreground transition hover:scale-[1.02] hover:bg-primary/90 active:scale-[0.98]"
                        >
                          <Eye className="h-4 w-4" />
                          Details
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-[260px] items-center justify-center rounded-3xl border border-dashed border-border bg-background p-8 text-center">
              <div>
                <Clock3 className="mx-auto h-6 w-6 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium">
                  No attendance records
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  No students have submitted attendance for this date.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {modalIndex !== null && filteredLogs[modalIndex] && (
        <AttendanceModal
          logs={filteredLogs}
          activeIndex={modalIndex}
          studentsById={studentsById}
          onClose={() => setModalIndex(null)}
          onChangeIndex={setModalIndex}
        />
      )}
    </div>
  );
}