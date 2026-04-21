"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type UpdateStudentProfileResult =
  | {
      success: true;
      message: string;
      avatarUrl?: string | null;
    }
  | {
      success: false;
      message: string;
      fieldErrors?: Record<string, string>;
    };

function buildFullName(
  firstName: string,
  middleName: string,
  lastName: string,
  suffix: string
) {
  return [firstName, middleName, lastName, suffix]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(" ");
}

function normalizeSex(value: string) {
  const normalized = value.trim().toLowerCase();

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

export async function updateStudentProfile(
  formData: FormData
): Promise<UpdateStudentProfileResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      message: "Your session expired. Please log in again.",
    };
  }

  const firstName = String(formData.get("first_name") ?? "").trim();
  const middleName = String(formData.get("middle_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const suffix = String(formData.get("suffix") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const sex = normalizeSex(String(formData.get("sex") ?? ""));
  const ageRaw = String(formData.get("age") ?? "").trim();
  const avatar = formData.get("avatar");

  const fieldErrors: Record<string, string> = {};

  if (!firstName) {
    fieldErrors.first_name = "First name is required.";
  }

  if (!lastName) {
    fieldErrors.last_name = "Last name is required.";
  }

  const age =
    ageRaw === ""
      ? null
      : Number.isFinite(Number(ageRaw))
      ? Number(ageRaw)
      : NaN;

  if (Number.isNaN(age)) {
    fieldErrors.age = "Age must be a valid number.";
  } else if (age !== null && age < 0) {
    fieldErrors.age = "Age must be zero or greater.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      message: "Please correct the highlighted fields.",
      fieldErrors,
    };
  }

  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id, profile_id")
    .eq("profile_id", user.id)
    .single();

  if (studentError || !student) {
    return {
      success: false,
      message: "Student record not found.",
    };
  }

  let avatarUrl: string | null | undefined = undefined;

  if (avatar instanceof File && avatar.size > 0) {
    const bucket = "profile-avatars";
    const ext = (avatar.name.split(".").pop() || "jpg").toLowerCase();
    const safeExt = ext === "png" || ext === "webp" || ext === "jpg" || ext === "jpeg"
      ? ext
      : "jpg";

    const storagePath = `${user.id}/official-avatar.${safeExt}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, avatar, {
        contentType: avatar.type || "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      return {
        success: false,
        message: `Avatar upload failed: ${uploadError.message}`,
      };
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(storagePath);

    avatarUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;
  }

  const fullName = buildFullName(firstName, middleName, lastName, suffix);

  const profilePatch: Record<string, unknown> = {
    first_name: firstName,
    middle_name: middleName || null,
    last_name: lastName,
    suffix: suffix || null,
    full_name: fullName,
  };

  if (avatarUrl !== undefined) {
    profilePatch.avatar_url = avatarUrl;
  }

  const { error: profileUpdateError } = await supabase
    .from("profiles")
    .update(profilePatch)
    .eq("id", user.id);

  if (profileUpdateError) {
    return {
      success: false,
      message: `Unable to update profile: ${profileUpdateError.message}`,
    };
  }

  const { error: studentUpdateError } = await supabase
    .from("students")
    .update({
      first_name: firstName,
      middle_name: middleName || null,
      last_name: lastName,
      suffix: suffix || null,
      phone: phone || null,
      sex: sex || null,
      age: age === null ? null : Number(age),
    })
    .eq("id", student.id);

  if (studentUpdateError) {
    return {
      success: false,
      message: `Unable to update student details: ${studentUpdateError.message}`,
    };
  }

  revalidatePath("/student");
  revalidatePath("/student/profile");

  return {
    success: true,
    message: "Profile updated successfully.",
    avatarUrl,
  };
}