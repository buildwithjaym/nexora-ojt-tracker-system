import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StudentCalendarView } from "@/components/student/student-calendar-view";

export default async function StudentCalendarPage() {
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

  const { data: logs } = await supabase
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
      total_work_seconds
    `)
    .eq("student_id", student.id)
    .order("attendance_date", { ascending: false })
    .limit(180);

  return (
    <StudentCalendarView
      studentName={`${student.first_name} ${student.last_name}`}
      attendanceLogs={logs ?? []}
    />
  );
}