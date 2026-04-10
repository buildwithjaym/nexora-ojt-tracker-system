"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type TeacherActionResult =
  | {
      success: true;
      message: string;
      credentials?: {
        email: string;
        password: string;
      };
    }
  | {
      success: false;
      message: string;
    };

function cleanText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function toNullable(value: string) {
  return value.trim() === "" ? null : value.trim();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function buildTeacherPassword(employeeNumber: string, email: string) {
  return `${employeeNumber}${email}`;
}

export async function createTeacher(
  formData: FormData
): Promise<TeacherActionResult> {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  const employee_number = cleanText(formData.get("employee_number"));
  const first_name = cleanText(formData.get("first_name"));
  const middle_name = toNullable(cleanText(formData.get("middle_name")));
  const last_name = cleanText(formData.get("last_name"));
  const suffix = toNullable(cleanText(formData.get("suffix")));
  const email = cleanText(formData.get("email")).toLowerCase();
  const phone = toNullable(cleanText(formData.get("phone")));
  const department = toNullable(cleanText(formData.get("department")));
  const status = cleanText(formData.get("status")) || "active";

  if (!employee_number || !first_name || !last_name || !email) {
    return {
      success: false,
      message: "Employee number, first name, last name, and email are required.",
    };
  }

  if (!isValidEmail(email)) {
    return {
      success: false,
      message: "Please enter a valid email address.",
    };
  }

  const password = buildTeacherPassword(employee_number, email);

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
        role: "teacher",
        employee_number,
      },
    });

  if (authError || !authData.user) {
    return {
      success: false,
      message: authError?.message || "Failed to create auth user.",
    };
  }

  const userId = authData.user.id;

  const { error: profileError } = await supabase.from("profiles").insert({
    id: userId,
    email,
    first_name,
    middle_name,
    last_name,
    suffix,
    role: "teacher",
    is_active: status !== "inactive",
    must_change_password: true,
  });

  if (profileError) {
    await adminSupabase.auth.admin.deleteUser(userId);
    return {
      success: false,
      message: profileError.message,
    };
  }

  const { error: teacherError } = await supabase.from("teachers").insert({
    profile_id: userId,
    employee_number,
    first_name,
    middle_name,
    last_name,
    suffix,
    email,
    phone,
    department,
    status,
  });

  if (teacherError) {
    await supabase.from("profiles").delete().eq("id", userId);
    await adminSupabase.auth.admin.deleteUser(userId);

    return {
      success: false,
      message: teacherError.message,
    };
  }

  revalidatePath("/admin/teachers");
  revalidatePath("/admin");

  return {
    success: true,
    message: "Teacher created successfully.",
    credentials: {
      email,
      password,
    },
  };
}

export async function updateTeacher(
  teacherId: string,
  formData: FormData
): Promise<TeacherActionResult> {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  const employee_number = cleanText(formData.get("employee_number"));
  const first_name = cleanText(formData.get("first_name"));
  const middle_name = toNullable(cleanText(formData.get("middle_name")));
  const last_name = cleanText(formData.get("last_name"));
  const suffix = toNullable(cleanText(formData.get("suffix")));
  const email = cleanText(formData.get("email")).toLowerCase();
  const phone = toNullable(cleanText(formData.get("phone")));
  const department = toNullable(cleanText(formData.get("department")));
  const status = cleanText(formData.get("status")) || "active";

  if (!employee_number || !first_name || !last_name || !email) {
    return {
      success: false,
      message: "Employee number, first name, last name, and email are required.",
    };
  }

  if (!isValidEmail(email)) {
    return {
      success: false,
      message: "Please enter a valid email address.",
    };
  }

  const { data: existingTeacher, error: existingTeacherError } = await supabase
    .from("teachers")
    .select("id, profile_id, email")
    .eq("id", teacherId)
    .single();

  if (existingTeacherError || !existingTeacher) {
    return {
      success: false,
      message: existingTeacherError?.message || "Teacher not found.",
    };
  }

  if (!existingTeacher.profile_id) {
    return {
      success: false,
      message: "Teacher is not linked to a profile.",
    };
  }

  const profileId = existingTeacher.profile_id;
  const oldEmail = existingTeacher.email;

  if (oldEmail !== email) {
    const { error: authUpdateError } =
      await adminSupabase.auth.admin.updateUserById(profileId, {
        email,
        user_metadata: {
          first_name,
          middle_name,
          last_name,
          suffix,
          role: "teacher",
          employee_number,
        },
      });

    if (authUpdateError) {
      return {
        success: false,
        message: authUpdateError.message,
      };
    }
  } else {
    const { error: authMetaError } =
      await adminSupabase.auth.admin.updateUserById(profileId, {
        user_metadata: {
          first_name,
          middle_name,
          last_name,
          suffix,
          role: "teacher",
          employee_number,
        },
      });

    if (authMetaError) {
      return {
        success: false,
        message: authMetaError.message,
      };
    }
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      email,
      first_name,
      middle_name,
      last_name,
      suffix,
      role: "teacher",
      is_active: status !== "inactive",
    })
    .eq("id", profileId);

  if (profileError) {
    return {
      success: false,
      message: profileError.message,
    };
  }

  const { error: teacherError } = await supabase
    .from("teachers")
    .update({
      employee_number,
      first_name,
      middle_name,
      last_name,
      suffix,
      email,
      phone,
      department,
      status,
    })
    .eq("id", teacherId);

  if (teacherError) {
    return {
      success: false,
      message: teacherError.message,
    };
  }

  revalidatePath("/admin/teachers");
  revalidatePath("/admin");

  return {
    success: true,
    message: "Teacher updated successfully.",
  };
}

export async function deleteTeacher(
  teacherId: string
): Promise<TeacherActionResult> {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  const { data: existingTeacher, error: existingTeacherError } = await supabase
    .from("teachers")
    .select("id, profile_id")
    .eq("id", teacherId)
    .single();

  if (existingTeacherError || !existingTeacher) {
    return {
      success: false,
      message: existingTeacherError?.message || "Teacher not found.",
    };
  }

  const profileId = existingTeacher.profile_id;

  const { error: teacherDeleteError } = await supabase
    .from("teachers")
    .delete()
    .eq("id", teacherId);

  if (teacherDeleteError) {
    return {
      success: false,
      message: teacherDeleteError.message,
    };
  }

  if (profileId) {
    await supabase.from("profiles").delete().eq("id", profileId);
    await adminSupabase.auth.admin.deleteUser(profileId);
  }

  revalidatePath("/admin/teachers");
  revalidatePath("/admin");

  return {
    success: true,
    message: "Teacher deleted successfully.",
  };
}