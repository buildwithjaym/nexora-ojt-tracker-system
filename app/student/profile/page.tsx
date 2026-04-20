import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StudentProfilePage } from "@/components/student/student-profile-page";

function normalizeSex(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toLowerCase();

  if (normalized === "male") return "male";
  if (normalized === "female") return "female";
  if (
    normalized === "prefer_not_to_say" ||
    normalized === "prefer not to say"
  ) {
    return "prefer_not_to_say";
  }

  return "";
}

export default async function StudentProfileRoute() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(`
      id,
      email,
      full_name,
      role,
      avatar_url,
      is_active,
      first_name,
      middle_name,
      last_name,
      suffix
    `)
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "student" || !profile.is_active) {
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
      sex,
      age,
      email,
      phone,
      required_hours,
      completed_hours,
      status,
      profile_id
    `)
    .eq("profile_id", user.id)
    .single();

  if (studentError || !student) {
    redirect("/student");
  }

  return (
    <StudentProfilePage
      profile={{
        id: profile.id,
        email: profile.email ?? "",
        avatarUrl: profile.avatar_url ?? null,
        firstName: profile.first_name ?? "",
        middleName: profile.middle_name ?? "",
        lastName: profile.last_name ?? "",
        suffix: profile.suffix ?? "",
      }}
      student={{
        id: student.id,
        studentNumber: student.student_number,
        firstName: student.first_name ?? profile.first_name ?? "",
        middleName: student.middle_name ?? profile.middle_name ?? "",
        lastName: student.last_name ?? profile.last_name ?? "",
        suffix: student.suffix ?? profile.suffix ?? "",
        sex: normalizeSex(student.sex),
        age: student.age ?? null,
        email: student.email ?? profile.email ?? "",
        phone: student.phone ?? "",
        requiredHours: Number(student.required_hours ?? 0),
        completedHours: Number(student.completed_hours ?? 0),
        status: student.status ?? "active",
      }}
    />
  );
}