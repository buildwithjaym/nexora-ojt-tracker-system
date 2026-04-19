import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StudentCalendarView } from "@/components/student/student-calendar-view";

export default async function StudentCalendarPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: student } = await supabase
    .from("students")
    .select("id, first_name, last_name, profile_id")
    .eq("profile_id", user.id)
    .single();

  if (!student) redirect("/login");

  const { data: logs } = await supabase
    .from("attendance_days")
    .select("*")
    .eq("student_id", student.id)
    .order("attendance_date", { ascending: false });

  return (
    <StudentCalendarView
      studentName={`${student.first_name} ${student.last_name}`}
      attendanceLogs={logs ?? []}
    />
  );
}