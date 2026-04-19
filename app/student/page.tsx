import { redirect } from "next/navigation";
import {
  AlertTriangle,
  Award,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  MapPin,
  ShieldCheck,
  UserCircle2,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ManilaLiveClock } from "@/components/student/manila-live-clock";
import { StudentWelcomeToast } from "@/components/student/student-welcome-toast";

function getManilaDateInfo(date = new Date()) {
  const attendanceDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

  const readableDate = new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);

  const readableTime = new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date);

  return { attendanceDate, readableDate, readableTime };
}

function getGreeting(name: string, date = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Manila",
      hour: "numeric",
      hour12: false,
    }).format(date)
  );

  if (hour < 12) return `Good morning, ${name}`;
  if (hour < 18) return `Good afternoon, ${name}`;
  return `Good evening, ${name}`;
}

function getProgress(completed: number, required: number) {
  if (required <= 0) return 0;
  return Math.min((completed / required) * 100, 100);
}

function getNextAction(todayAttendance: any) {
  if (!todayAttendance) return "Morning Time In or Afternoon Time In";
  if (!todayAttendance.am_in_at) return "Morning Time In available";
  if (todayAttendance.am_in_at && !todayAttendance.am_out_at) {
    return "Morning Time Out available";
  }
  if (!todayAttendance.pm_in_at) return "Afternoon Time In available";
  if (todayAttendance.pm_in_at && !todayAttendance.pm_out_at) {
    return "Afternoon Time Out available";
  }
  return "Attendance completed for today";
}

function getTodayStatus(todayAttendance: any) {
  if (!todayAttendance) return "No attendance yet";
  if (todayAttendance.am_in_at && !todayAttendance.am_out_at) {
    return "Morning session active";
  }
  if (todayAttendance.pm_in_at && !todayAttendance.pm_out_at) {
    return "Afternoon session active";
  }
  if (todayAttendance.am_out_at || todayAttendance.pm_out_at) {
    return "Attendance recorded";
  }
  return "Open";
}

function getBadges(progress: number) {
  return [
    { label: "Started", reached: progress > 0 },
    { label: "25%", reached: progress >= 25 },
    { label: "75%", reached: progress >= 75 },
    { label: "100%", reached: progress >= 100 },
  ];
}

function formatWorkHours(seconds: number) {
  const totalHours = Math.floor((seconds || 0) / 3600);
  const totalMinutes = Math.floor(((seconds || 0) % 3600) / 60);
  return `${totalHours}h ${totalMinutes}m`;
}

export default async function StudentDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const now = new Date();
  const { attendanceDate, readableDate, readableTime } = getManilaDateInfo(now);

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, first_name, last_name, role, is_active")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "student" || !profile.is_active) {
    redirect("/login");
  }

  const { data: student, error: studentError } = await supabase
    .from("students")
    .select(`
      id,
      student_number,
      first_name,
      middle_name,
      last_name,
      suffix,
      required_hours,
      completed_hours,
      status,
      profile_id,
      batches:batch_id (
        id,
        name,
        course
      )
    `)
    .eq("profile_id", user.id)
    .single();

  if (studentError || !student) {
    return (
      <div className="space-y-6">
        <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="max-w-2xl">
            <p className="text-sm text-muted-foreground">Student Portal</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Student account setup incomplete
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
              Your login was successful, but your student record is not accessible yet.
              Please make sure the student table RLS allows students to read their own record.
            </p>
          </div>
        </section>
      </div>
    );
  }

  const { data: assignment } = await supabase
    .from("assignments")
    .select(`
      id,
      status,
      start_date,
      assigned_hours,
      remarks,
      offices:office_id (
        id,
        name,
        address
      ),
      teachers:teacher_id (
        id,
        first_name,
        middle_name,
        last_name,
        suffix
      )
    `)
    .eq("student_id", student.id)
    .in("status", ["active", "pending"])
    .maybeSingle();

  const { data: todayAttendance } = await supabase
    .from("attendance_days")
    .select(`
      id,
      attendance_date,
      status,
      am_in_at,
      am_out_at,
      pm_in_at,
      pm_out_at,
      am_activity_summary,
      pm_activity_summary,
      am_in_distance_meters,
      pm_in_distance_meters,
      total_work_seconds
    `)
    .eq("student_id", student.id)
    .eq("attendance_date", attendanceDate)
    .maybeSingle();

  const { data: recentLogs } = await supabase
    .from("attendance_days")
    .select(`
      id,
      attendance_date,
      status,
      am_in_at,
      am_out_at,
      pm_in_at,
      pm_out_at,
      total_work_seconds
    `)
    .eq("student_id", student.id)
    .order("attendance_date", { ascending: false })
    .limit(5);

  const completedHours = Number(student.completed_hours ?? 0);
  const requiredHours = Number(student.required_hours ?? 0);
  const progress = getProgress(completedHours, requiredHours);
  const remainingHours = Math.max(requiredHours - completedHours, 0);

  const firstName =
    student.first_name ||
    profile.first_name ||
    profile.full_name?.split(" ")[0] ||
    "Student";

  const office = Array.isArray(assignment?.offices)
    ? assignment.offices[0]
    : assignment?.offices;

  const teacher = Array.isArray(assignment?.teachers)
    ? assignment.teachers[0]
    : assignment?.teachers;

  const badges = getBadges(progress);
  const nextAction = getNextAction(todayAttendance);
  const todayStatus = getTodayStatus(todayAttendance);

  const reminders = [
    !assignment ? "You do not have an active assignment yet." : null,
    remainingHours > 0
      ? `You still need ${remainingHours} hour${remainingHours === 1 ? "" : "s"} to complete your OJT.`
      : "You have completed your required OJT hours.",
    todayAttendance && !todayAttendance.am_out_at && todayAttendance.am_in_at
      ? "Do not forget to complete your morning time out."
      : null,
    todayAttendance && todayAttendance.pm_in_at && !todayAttendance.pm_out_at
      ? "Do not forget to complete your afternoon time out."
      : null,
  ].filter(Boolean) as string[];

  const teacherName = teacher
    ? [teacher.first_name, teacher.middle_name, teacher.last_name, teacher.suffix]
        .filter(Boolean)
        .join(" ")
    : "No assigned teacher";

  return (
    <div className="space-y-6">
      <StudentWelcomeToast firstName={firstName} />

      <section className="relative overflow-hidden rounded-[1.75rem] border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="pointer-events-none absolute -left-16 top-0 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Welcome back</span>
              </div>

              <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                {getGreeting(firstName, now)}
              </h2>

              <p className="mt-2 text-sm text-muted-foreground">{readableDate}</p>

              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5">
                <Clock3 className="h-4 w-4 text-primary" />
                <ManilaLiveClock initialTime={readableTime} />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Your OJT Progress</p>
              <div className="flex items-end gap-3">
                <span className="text-4xl font-bold tracking-tight">
                  {progress.toFixed(1)}%
                </span>
                <span className="pb-1 text-sm text-muted-foreground">
                  {completedHours}/{requiredHours} hours
                </span>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Remaining hours: {remainingHours}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:w-[380px]">
            <div className="rounded-2xl border border-border bg-background p-4 transition hover:border-primary/20 hover:shadow-[0_0_30px_rgba(59,130,246,0.08)]">
              <div className="flex items-center gap-2 text-muted-foreground">
                <BriefcaseBusiness className="h-4 w-4" />
                <p className="text-xs uppercase tracking-wide">Assigned Office</p>
              </div>
              <p className="mt-2 text-sm font-medium">
                {office?.name ?? "No active office"}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-background p-4 transition hover:border-primary/20 hover:shadow-[0_0_30px_rgba(59,130,246,0.08)]">
              <div className="flex items-center gap-2 text-muted-foreground">
                <UserCircle2 className="h-4 w-4" />
                <p className="text-xs uppercase tracking-wide">Teacher</p>
              </div>
              <p className="mt-2 text-sm font-medium">{teacherName}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
        <div className="space-y-6">
          <div className="rounded-[1.75rem] border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Today’s Attendance</p>
                <p className="text-xs text-muted-foreground">
                  Your current attendance status and next valid action
                </p>
              </div>
              <Clock3 className="h-5 w-5 text-primary" />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
                <p className="mt-2 text-sm font-semibold">{todayStatus}</p>
              </div>

              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Next Action</p>
                <p className="mt-2 text-sm font-semibold">{nextAction}</p>
              </div>

              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Morning</p>
                <div className="mt-2 space-y-1 text-sm">
                  <p>In: {todayAttendance?.am_in_at ? "Recorded" : "-"}</p>
                  <p>Out: {todayAttendance?.am_out_at ? "Recorded" : "-"}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Afternoon</p>
                <div className="mt-2 space-y-1 text-sm">
                  <p>In: {todayAttendance?.pm_in_at ? "Recorded" : "-"}</p>
                  <p>Out: {todayAttendance?.pm_out_at ? "Recorded" : "-"}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="mb-5">
              <p className="text-sm font-medium">Recent Activity</p>
              <p className="text-xs text-muted-foreground">
                Your latest attendance records
              </p>
            </div>

            <div className="space-y-3">
              {recentLogs && recentLogs.length > 0 ? (
                recentLogs.map((log: any) => (
                  <div
                    key={log.id}
                    className="rounded-2xl border border-border bg-background p-4"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-medium">{log.attendance_date}</p>
                        <p className="text-xs capitalize text-muted-foreground">{log.status}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatWorkHours(log.total_work_seconds ?? 0)}
                      </p>
                    </div>

                    <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                      <p>AM: {log.am_in_at ? "In" : "-"} / {log.am_out_at ? "Out" : "-"}</p>
                      <p>PM: {log.pm_in_at ? "In" : "-"} / {log.pm_out_at ? "Out" : "-"}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-background p-6 text-center">
                  <p className="text-sm font-medium">No DTR records yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Your recent attendance logs will appear here once you start logging attendance.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="mb-5">
              <p className="text-sm font-medium">Badges & Achievements</p>
              <p className="text-xs text-muted-foreground">
                Milestones based on your OJT completion progress
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {badges.map((badge) => (
                <div
                  key={badge.label}
                  className={`rounded-2xl border p-4 text-center transition ${
                    badge.reached
                      ? "border-primary/25 bg-primary/10 shadow-[0_0_30px_rgba(59,130,246,0.08)]"
                      : "border-border bg-background"
                  }`}
                >
                  <div
                    className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${
                      badge.reached
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    <Award className="h-5 w-5" />
                  </div>
                  <p className="mt-3 text-sm font-medium">{badge.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[1.75rem] border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="mb-5">
              <p className="text-sm font-medium">Assignment Snapshot</p>
              <p className="text-xs text-muted-foreground">
                Quick overview of your current OJT assignment
              </p>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-background p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <BriefcaseBusiness className="h-4 w-4" />
                  <p className="text-xs uppercase tracking-wide">Office</p>
                </div>
                <p className="mt-2 text-sm font-medium">
                  {office?.name ?? "No active office"}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-background p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <p className="text-xs uppercase tracking-wide">Address</p>
                </div>
                <p className="mt-2 text-sm font-medium">
                  {office?.address ?? "No office address available"}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-background p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <p className="text-xs uppercase tracking-wide">Assignment Status</p>
                </div>
                <p className="mt-2 text-sm font-medium capitalize">
                  {assignment?.status ?? "No active assignment"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="mb-5">
              <p className="text-sm font-medium">Reminders</p>
              <p className="text-xs text-muted-foreground">
                Important notices for your attendance and progress
              </p>
            </div>

            <div className="space-y-3">
              {reminders.length > 0 ? (
                reminders.map((reminder, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-border bg-background p-4"
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <p className="text-sm text-foreground">{reminder}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-background p-6 text-center">
                  <p className="text-sm font-medium">No reminders right now</p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="mb-5">
              <p className="text-sm font-medium">Attendance Integrity</p>
              <p className="text-xs text-muted-foreground">
                Keep your logs accurate and valid
              </p>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl border border-border bg-background p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Location-based attendance</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      You must be within the allowed office radius when logging time in and time out.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-background p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Photo proof required</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Your attendance logs may require a photo and activity summary for verification.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}