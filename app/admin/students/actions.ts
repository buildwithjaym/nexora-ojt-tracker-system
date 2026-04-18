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

const cleanText = (v: FormDataEntryValue | null) =>
  typeof v === "string" ? v.trim() : "";

const toNullable = (v: string) => {
  const value = v.trim();
  return value === "" ? null : value;
};

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const buildStudentPassword = (studentNumber: string) => studentNumber.trim();

const buildFullName = ({
  first_name,
  middle_name,
  last_name,
  suffix,
}: {
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  suffix?: string | null;
}) => {
  return [first_name.trim(), middle_name?.trim(), last_name.trim(), suffix?.trim()]
    .filter(Boolean)
    .join(" ");
};

async function findAuthUserByEmail(email: string) {
  const adminSupabase = createAdminClient();
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await adminSupabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      return { user: null, error };
    }

    const users = data.users ?? [];
    const matchedUser = users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase()
    );

    if (matchedUser) {
      return { user: matchedUser, error: null };
    }

    if (users.length < perPage) {
      break;
    }

    page += 1;
  }

  return { user: null, error: null };
}

export async function createStudent(
  formData: FormData
): Promise<StudentActionResult> {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  const student_number = cleanText(formData.get("student_number"));
  const first_name = cleanText(formData.get("first_name"));
  const middle_name = toNullable(cleanText(formData.get("middle_name")));
  const last_name = cleanText(formData.get("last_name"));
  const suffix = toNullable(cleanText(formData.get("suffix")));
  const sex = toNullable(cleanText(formData.get("sex")));
  const ageText = cleanText(formData.get("age"));
  const email = cleanText(formData.get("email")).toLowerCase();
  const phone = toNullable(cleanText(formData.get("phone")));
  const batch_id = cleanText(formData.get("batch_id"));
  const status = cleanText(formData.get("status")) || "active";

  if (!student_number || !first_name || !last_name || !batch_id || !email) {
    return { success: false, message: "Missing required fields." };
  }

  if (!isValidEmail(email)) {
    return { success: false, message: "Invalid email address." };
  }

  const age =
    ageText === ""
      ? null
      : Number.isNaN(Number(ageText))
      ? NaN
      : Number(ageText);

  if (Number.isNaN(age)) {
    return { success: false, message: "Age must be a valid number." };
  }

  if (age !== null && age < 0) {
    return { success: false, message: "Age cannot be negative." };
  }

  const full_name = buildFullName({
    first_name,
    middle_name,
    last_name,
    suffix,
  });

  const password = buildStudentPassword(student_number);

  const { data: existingStudentNumber, error: existingStudentNumberError } =
    await supabase
      .from("students")
      .select("id")
      .eq("student_number", student_number)
      .maybeSingle();

  if (existingStudentNumberError) {
    return { success: false, message: existingStudentNumberError.message };
  }

  if (existingStudentNumber) {
    return { success: false, message: "Student number already exists." };
  }

  const { data: existingStudentEmail, error: existingStudentEmailError } =
    await supabase
      .from("students")
      .select("id")
      .eq("email", email)
      .maybeSingle();

  if (existingStudentEmailError) {
    return { success: false, message: existingStudentEmailError.message };
  }

  if (existingStudentEmail) {
    return { success: false, message: "Student email already exists." };
  }

  const { user: existingAuthUser, error: existingAuthUserError } =
    await findAuthUserByEmail(email);

  if (existingAuthUserError) {
    return { success: false, message: existingAuthUserError.message };
  }

  let userId: string | null = null;
  let createdNewAuthUser = false;

  if (existingAuthUser) {
    userId = existingAuthUser.id;

    const { data: linkedStudent, error: linkedStudentError } = await supabase
      .from("students")
      .select("id")
      .eq("profile_id", userId)
      .maybeSingle();

    if (linkedStudentError) {
      return { success: false, message: linkedStudentError.message };
    }

    if (linkedStudent) {
      return {
        success: false,
        message: "This email is already linked to an existing student account.",
      };
    }

    const { error: updateAuthError } =
      await adminSupabase.auth.admin.updateUserById(userId, {
        password,
        email,
        user_metadata: {
          first_name,
          middle_name,
          last_name,
          suffix,
          full_name,
          role: "student",
          student_number,
          must_change_password: true,
        },
      });

    if (updateAuthError) {
      return { success: false, message: updateAuthError.message };
    }
  } else {
    const { data: authData, error: authError } =
      await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name,
          middle_name,
          last_name,
          suffix,
          full_name,
          role: "student",
          student_number,
          must_change_password: true,
        },
      });

    if (authError || !authData.user) {
      return {
        success: false,
        message: authError?.message || "Auth creation failed.",
      };
    }

    userId = authData.user.id;
    createdNewAuthUser = true;
  }

  if (!userId) {
    return { success: false, message: "Unable to resolve auth user." };
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: userId,
      email,
      full_name,
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
    if (createdNewAuthUser) {
      await adminSupabase.auth.admin.deleteUser(userId);
    }

    return { success: false, message: `Profile error: ${profileError.message}` };
  }

  const { error: studentError } = await supabase.from("students").insert({
    profile_id: userId,
    student_number,
    first_name,
    middle_name,
    last_name,
    suffix,
    sex,
    age,
    email,
    phone,
    batch_id,
    status,
    completed_hours: 0,
  });

  if (studentError) {
    if (createdNewAuthUser) {
      await supabase.from("profiles").delete().eq("id", userId);
      await adminSupabase.auth.admin.deleteUser(userId);
    }

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

export async function updateStudent(
  studentId: string,
  formData: FormData
): Promise<StudentActionResult> {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  const student_number = cleanText(formData.get("student_number"));
  const first_name = cleanText(formData.get("first_name"));
  const middle_name = toNullable(cleanText(formData.get("middle_name")));
  const last_name = cleanText(formData.get("last_name"));
  const suffix = toNullable(cleanText(formData.get("suffix")));
  const sex = toNullable(cleanText(formData.get("sex")));
  const ageText = cleanText(formData.get("age"));
  const email = cleanText(formData.get("email")).toLowerCase();
  const phone = toNullable(cleanText(formData.get("phone")));
  const batch_id = cleanText(formData.get("batch_id"));
  const status = cleanText(formData.get("status")) || "active";

  if (!studentId) {
    return { success: false, message: "Missing student id." };
  }

  if (!student_number || !first_name || !last_name || !batch_id || !email) {
    return { success: false, message: "Missing required fields." };
  }

  if (!isValidEmail(email)) {
    return { success: false, message: "Invalid email address." };
  }

  const age =
    ageText === ""
      ? null
      : Number.isNaN(Number(ageText))
      ? NaN
      : Number(ageText);

  if (Number.isNaN(age)) {
    return { success: false, message: "Age must be a valid number." };
  }

  if (age !== null && age < 0) {
    return { success: false, message: "Age cannot be negative." };
  }

  const full_name = buildFullName({
    first_name,
    middle_name,
    last_name,
    suffix,
  });

  const { data: current, error: currentError } = await supabase
    .from("students")
    .select("id, profile_id, email, student_number")
    .eq("id", studentId)
    .single();

  if (currentError || !current) {
    return { success: false, message: currentError?.message || "Student not found." };
  }

  if (!current.profile_id) {
    return { success: false, message: "Student profile link missing." };
  }

  const { data: duplicateStudentNumber, error: duplicateStudentNumberError } =
    await supabase
      .from("students")
      .select("id")
      .eq("student_number", student_number)
      .neq("id", studentId)
      .maybeSingle();

  if (duplicateStudentNumberError) {
    return { success: false, message: duplicateStudentNumberError.message };
  }

  if (duplicateStudentNumber) {
    return { success: false, message: "Student number already exists." };
  }

  const { data: duplicateStudentEmail, error: duplicateStudentEmailError } =
    await supabase
      .from("students")
      .select("id")
      .eq("email", email)
      .neq("id", studentId)
      .maybeSingle();

  if (duplicateStudentEmailError) {
    return { success: false, message: duplicateStudentEmailError.message };
  }

  if (duplicateStudentEmail) {
    return { success: false, message: "Student email already exists." };
  }

  const { data: duplicateProfileEmail, error: duplicateProfileEmailError } =
    await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .neq("id", current.profile_id)
      .maybeSingle();

  if (duplicateProfileEmailError) {
    return { success: false, message: duplicateProfileEmailError.message };
  }

  if (duplicateProfileEmail) {
    return { success: false, message: "Profile email already exists." };
  }

  const { error: authError } = await adminSupabase.auth.admin.updateUserById(
    current.profile_id,
    {
      email,
      user_metadata: {
        first_name,
        middle_name,
        last_name,
        suffix,
        full_name,
        role: "student",
        student_number,
        must_change_password: true,
      },
    }
  );

  if (authError) {
    return { success: false, message: authError.message };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert(
      {
        id: current.profile_id,
        email,
        full_name,
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
    return { success: false, message: profileError.message };
  }

  const { error: studentError } = await supabase
    .from("students")
    .update({
      student_number,
      first_name,
      middle_name,
      last_name,
      suffix,
      sex,
      age,
      email,
      phone,
      batch_id,
      status,
    })
    .eq("id", studentId);

  if (studentError) {
    return { success: false, message: studentError.message };
  }

  revalidatePath("/admin/students");
  revalidatePath("/admin");

  return { success: true, message: "Student updated successfully." };
}

export async function deleteStudent(
  studentId: string
): Promise<StudentActionResult> {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  const { data: student, error: studentLookupError } = await supabase
    .from("students")
    .select("profile_id")
    .eq("id", studentId)
    .single();

  if (studentLookupError) {
    return { success: false, message: studentLookupError.message };
  }

  const { error: deleteStudentError } = await supabase
    .from("students")
    .delete()
    .eq("id", studentId);

  if (deleteStudentError) {
    return { success: false, message: deleteStudentError.message };
  }

  if (student?.profile_id) {
    await adminSupabase.auth.admin.deleteUser(student.profile_id);
  }

  revalidatePath("/admin/students");
  revalidatePath("/admin");

  return { success: true, message: "Student deleted successfully." };
}