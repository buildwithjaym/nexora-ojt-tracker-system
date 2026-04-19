import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StudentReportsPage } from "@/components/student/student-reports-page";

export default async function ReportsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, is_active, full_name")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "student" || !profile.is_active) {
    redirect("/login");
  }

  const { data: student } = await supabase
    .from("students")
    .select("id, first_name, middle_name, last_name, suffix, profile_id")
    .eq("profile_id", user.id)
    .single();

  if (!student) {
    redirect("/student");
  }

  const fullName = [
    student.first_name,
    student.middle_name,
    student.last_name,
    student.suffix,
  ]
    .filter(Boolean)
    .join(" ");

  return <StudentReportsPage studentName={fullName} />;
}