import { redirect } from "next/navigation";
import { AlertTriangle, BriefcaseBusiness, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StudentAttendancePanel } from "@/components/student/student-attendance-panel";

function getManilaDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getManilaTimeParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");

  return {
    hour,
    minute,
    totalMinutes: hour * 60 + minute,
  };
}

function getReadableDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function getReadableTime(date = new Date()) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date);
}

function EmptyState({
  title,
  message,
  icon,
}: {
  title: string;
  message: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-4">
          {icon ? (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
              {icon}
            </div>
          ) : null}

          <div className="max-w-2xl">
            <p className="text-sm text-muted-foreground">Student Attendance</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              {title}
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
              {message}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default async function StudentAttendancePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const now = new Date();
  const attendanceDate = getManilaDateKey(now);
  const readableDate = getReadableDate(now);
  const readableTime = getReadableTime(now);
  const manilaTime = getManilaTimeParts(now);

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "student" || !profile.is_active) {
    redirect("/login");
  }

  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id, first_name, last_name, profile_id")
    .eq("profile_id", user.id)
    .single();

  if (studentError || !student) {
    return (
      <EmptyState
        title="Student account setup incomplete"
        message="Your student record is not accessible yet. Please contact your administrator if this continues."
        icon={<AlertTriangle className="h-5 w-5" />}
      />
    );
  }

  const { data: assignment, error: assignmentError } = await supabase
    .from("assignments")
    .select(`
      id,
      student_id,
      teacher_id,
      office_id,
      status,
      offices:office_id (
        id,
        name,
        address,
        latitude,
        longitude,
        allowed_radius_meters
      )
    `)
    .eq("student_id", student.id)
    .eq("status", "active")
    .maybeSingle();

  if (assignmentError || !assignment) {
    return (
      <EmptyState
        title="No active assignment"
        message="You need an active assignment before using attendance. Please contact your coordinator or administrator."
        icon={<BriefcaseBusiness className="h-5 w-5" />}
      />
    );
  }

  const office = Array.isArray(assignment.offices)
    ? assignment.offices[0]
    : assignment.offices;

  if (!office) {
    return (
      <EmptyState
        title="Office details missing"
        message="Your assigned office could not be loaded. Please contact your administrator to complete your attendance setup."
        icon={<MapPin className="h-5 w-5" />}
      />
    );
  }

  const { data: todayAttendance, error: todayAttendanceError } = await supabase
    .from("attendance_days")
    .select(`
      id,
      status,
      attendance_date,
      am_in_at,
      am_out_at,
      pm_in_at,
      pm_out_at,
      am_activity_summary,
      pm_activity_summary,
      total_work_seconds
    `)
    .eq("student_id", student.id)
    .eq("attendance_date", attendanceDate)
    .maybeSingle();

  if (todayAttendanceError) {
    return (
      <EmptyState
        title="Unable to load attendance"
        message="Your attendance record for today could not be loaded. Please refresh the page or try again later."
        icon={<AlertTriangle className="h-5 w-5" />}
      />
    );
  }

  const { data: recentLogs, error: recentLogsError } = await supabase
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
    .limit(7);

  return (
    <StudentAttendancePanel
      studentName={`${student.first_name} ${student.last_name}`}
      attendanceDate={attendanceDate}
      readableDate={readableDate}
      initialServerTime={readableTime}
      currentMinutes={manilaTime.totalMinutes}
      office={{
        id: office.id,
        name: office.name ?? "Assigned Office",
        address: office.address ?? "No office address available",
        allowedRadiusMeters: Number(office.allowed_radius_meters ?? 50),
      }}
      assignmentId={assignment.id}
      todayAttendance={todayAttendance}
      recentLogs={recentLogsError ? [] : recentLogs ?? []}
    />
  );
}