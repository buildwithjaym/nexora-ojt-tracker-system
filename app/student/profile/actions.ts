"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type UpdateStudentProfileResult =
  | { success: true; message: string; avatarUrl?: string | null }
  | { success: false; message: string };

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

export async function updateStudentProfile(
  formData: FormData
): Promise<UpdateStudentProfileResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Your session expired. Please log in again." };
  }

  const firstName = String(formData.get("first_name") ?? "").trim();
  const middleName = String(formData.get("middle_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const suffix = String(formData.get("suffix") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const sex = String(formData.get("sex") ?? "").trim();
  const ageRaw = String(formData.get("age") ?? "").trim();
  const avatar = formData.get("avatar");

  if (!firstName || !lastName) {
    return { success: false, message: "First name and last name are required." };
  }

  const age =
    ageRaw === ""
      ? null
      : Number.isFinite(Number(ageRaw))
      ? Number(ageRaw)
      : null;

  if (age !== null && age < 0) {
    return { success: false, message: "Age must be zero or greater." };
  }

  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id, profile_id")
    .eq("profile_id", user.id)
    .single();

  if (studentError || !student) {
    return { success: false, message: "Student record not found." };
  }

  let avatarUrl: string | null | undefined = undefined;

  if (avatar instanceof File && avatar.size > 0) {
    const bucket = "profile-avatars";
    const ext = avatar.name.split(".").pop() || "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, avatar, {
        contentType: avatar.type || "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      return {
        success: false,
        message: `Avatar upload failed: ${uploadError.message}`,
      };
    }

    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(path);
    avatarUrl = publicUrlData.publicUrl;
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
    return { success: false, message: profileUpdateError.message };
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
      age,
    })
    .eq("id", student.id);

  if (studentUpdateError) {
    return { success: false, message: studentUpdateError.message };
  }

  revalidatePath("/student/profile");
  revalidatePath("/student");

  return {
    success: true,
    message: "Profile updated successfully.",
    avatarUrl,
  };
}