import { redirect } from "next/navigation";
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
  return { hour, minute, totalMinutes: hour * 60 + minute };
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

export default async function StudentAttendancePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "student" || !profile.is_active) {
    redirect("/login");
  }

  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id, first_name, last_name, profile_id")
    .eq("profile_id", user.id)
    .single();

  if (studentError || !student) {
    return (
      <div className="space-y-6">
        <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-sm sm:p-6">
          <h2 className="text-2xl font-semibold tracking-tight">
            Student account setup incomplete
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Your student record is not accessible yet.
          </p>
        </section>
      </div>
    );
  }

  const { data: assignment } = await supabase
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

  if (!assignment) {
    return (
      <div className="space-y-6">
        <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-sm sm:p-6">
          <h2 className="text-2xl font-semibold tracking-tight">
            No active assignment
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            You need an active assignment before using attendance.
          </p>
        </section>
      </div>
    );
  }

  const office = Array.isArray(assignment.offices)
    ? assignment.offices[0]
    : assignment.offices;

  if (!office) {
    return (
      <div className="space-y-6">
        <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-sm sm:p-6">
          <h2 className="text-2xl font-semibold tracking-tight">
            Office details missing
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Your assigned office could not be loaded.
          </p>
        </section>
      </div>
    );
  }

  const attendanceDate = getManilaDateKey();
  const readableDate = getReadableDate();
  const manilaTime = getManilaTimeParts();

  const { data: todayAttendance } = await supabase
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
    .limit(7);

  return (
    <StudentAttendancePanel
      studentName={`${student.first_name} ${student.last_name}`}
      attendanceDate={attendanceDate}
      readableDate={readableDate}
      currentMinutes={manilaTime.totalMinutes}
      office={{
        id: office.id,
        name: office.name ?? "Assigned Office",
        address: office.address ?? "No office address available",
        allowedRadiusMeters: Number(office.allowed_radius_meters ?? 50),
      }}
      assignmentId={assignment.id}
      todayAttendance={todayAttendance}
      recentLogs={recentLogs ?? []}
    />
  );
}