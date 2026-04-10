"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type StudentActionResult =
  | {
      success: true;
      message: string;
      credentials?: { email: string; password: string };
    }
  | { success: false; message: string };

const cleanText = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");
const toNullable = (v: string) => (v.trim() === "" ? null : v.trim());
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const buildStudentPassword = (num: string, email: string) => `${num}${email}`;

export async function createStudent(formData: FormData): Promise<StudentActionResult> {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  const student_number = cleanText(formData.get("student_number"));
  const first_name = cleanText(formData.get("first_name"));
  const middle_name = toNullable(cleanText(formData.get("middle_name")));
  const last_name = cleanText(formData.get("last_name"));
  const suffix = toNullable(cleanText(formData.get("suffix")));
  const sex = toNullable(cleanText(formData.get("sex")));
  const age = toNullable(cleanText(formData.get("age")));
  const email = cleanText(formData.get("email")).toLowerCase();
  const phone = toNullable(cleanText(formData.get("phone")));
  const batch_id = cleanText(formData.get("batch_id"));
  const status = cleanText(formData.get("status")) || "active";

  // 1. Validation
  if (!student_number || !first_name || !last_name || !batch_id || !email) {
    return { success: false, message: "Missing required fields." };
  }
  if (!isValidEmail(email)) {
    return { success: false, message: "Invalid email address." };
  }

  const password = buildStudentPassword(student_number, email);

  // 2. Create Auth User
  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name, last_name, role: "student", student_number },
  });

  if (authError || !authData.user) {
    return { success: false, message: authError?.message || "Auth creation failed." };
  }

  const userId = authData.user.id;

  // 3. Upsert Profile (Prevents the duplicate key profiles_pkey error)
  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: userId,
      email,
      first_name,
      middle_name,
      last_name,
      suffix,
      role: "student",
      is_active: true,
      must_change_password: true,
    },
    { onConflict: "id" }
  );

  if (profileError) {
    await adminSupabase.auth.admin.deleteUser(userId);
    return { success: false, message: `Profile error: ${profileError.message}` };
  }

  // 4. Upsert Student Record
  const { error: studentError } = await supabase.from("students").upsert(
    {
      profile_id: userId,
      student_number,
      first_name,
      middle_name,
      last_name,
      suffix,
      sex,
      age: age ? Number(age) : null,
      email,
      phone,
      batch_id,
      status,
      completed_hours: 0,
    },
    { onConflict: "student_number" }
  );

  if (studentError) {
    // Cleanup if student insertion fails
    await supabase.from("profiles").delete().eq("id", userId);
    await adminSupabase.auth.admin.deleteUser(userId);
    return { success: false, message: `Student error: ${studentError.message}` };
  }

  revalidatePath("/admin/students");
  revalidatePath("/admin");

  return {
    success: true,
    message: "Student created successfully.",
    credentials: { email, password },
  };
}

export async function updateStudent(studentId: string, formData: FormData): Promise<StudentActionResult> {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  const email = cleanText(formData.get("email")).toLowerCase();
  const first_name = cleanText(formData.get("first_name"));
  const last_name = cleanText(formData.get("last_name"));

  // Fetch current link
  const { data: current } = await supabase.from("students").select("profile_id, email").eq("id", studentId).single();
  if (!current?.profile_id) return { success: false, message: "Student profile link missing." };

  // Update Auth (Metadata and Email if changed)
  const { error: authError } = await adminSupabase.auth.admin.updateUserById(current.profile_id, {
    email,
    user_metadata: { first_name, last_name, role: "student" },
  });

  if (authError) return { success: false, message: authError.message };

  // Update Profile
  await supabase.from("profiles").update({
    email,
    first_name,
    middle_name: toNullable(cleanText(formData.get("middle_name"))),
    last_name,
    suffix: toNullable(cleanText(formData.get("suffix"))),
  }).eq("id", current.profile_id);

  // Update Student Table
  const { error: studentError } = await supabase.from("students").update({
    student_number: cleanText(formData.get("student_number")),
    first_name,
    last_name,
    sex: toNullable(cleanText(formData.get("sex"))),
    age: formData.get("age") ? Number(formData.get("age")) : null,
    email,
    phone: toNullable(cleanText(formData.get("phone"))),
    batch_id: cleanText(formData.get("batch_id")),
    status: cleanText(formData.get("status")),
  }).eq("id", studentId);

  if (studentError) return { success: false, message: studentError.message };

  revalidatePath("/admin/students");
  return { success: true, message: "Student updated successfully." };
}

export async function deleteStudent(studentId: string): Promise<StudentActionResult> {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  const { data: student } = await supabase.from("students").select("profile_id").eq("id", studentId).single();

  const { error: delError } = await supabase.from("students").delete().eq("id", studentId);
  if (delError) return { success: false, message: delError.message };

  if (student?.profile_id) {
    // This will cascade delete from profiles if fkey is set to cascade, 
    // but deleting via Admin Auth is the cleanest way.
    await adminSupabase.auth.admin.deleteUser(student.profile_id);
  }

  revalidatePath("/admin/students");
  revalidatePath("/admin");
  return { success: true, message: "Student deleted successfully." };
}