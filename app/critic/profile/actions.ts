"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CriticProfileActionResult =
  | { success: true; message: string }
  | { success: false; message: string };

function cleanText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidPHPhone(phone: string) {
  return /^09\d{9}$/.test(phone);
}

function isValidImage(file: File) {
  return ["image/jpeg", "image/png", "image/webp"].includes(file.type);
}

export async function updateCriticProfile(
  formData: FormData
): Promise<CriticProfileActionResult> {
  const supabase = await createClient();

  const phone = cleanText(formData.get("phone"));
  const position = cleanText(formData.get("position"));
  const avatarFile = formData.get("avatar");

  if (phone && !isValidPHPhone(phone)) {
    return {
      success: false,
      message: "Phone number must be 11 digits and start with 09.",
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "You must be logged in." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "critic" || !profile.is_active) {
    return {
      success: false,
      message: "Only active critic accounts can update this profile.",
    };
  }

  let avatarUrl: string | null = null;

  if (avatarFile instanceof File && avatarFile.size > 0) {
    if (!isValidImage(avatarFile)) {
      return {
        success: false,
        message: "Avatar must be a JPG, PNG, or WebP image.",
      };
    }

    if (avatarFile.size > 3 * 1024 * 1024) {
      return {
        success: false,
        message: "Avatar image must not exceed 3MB.",
      };
    }

    const extension = avatarFile.name.split(".").pop()?.toLowerCase() || "jpg";
    const filePath = `${user.id}/avatar.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("profile-avatars")
      .upload(filePath, avatarFile, {
        upsert: true,
        contentType: avatarFile.type,
      });

    if (uploadError) {
      return {
        success: false,
        message: uploadError.message,
      };
    }

    const { data } = supabase.storage
      .from("profile-avatars")
      .getPublicUrl(filePath);

    avatarUrl = data.publicUrl;
  }

  const { error: criticError } = await supabase
    .from("critics")
    .update({
      phone: phone || null,
      position: position || null,
    })
    .eq("profile_id", user.id)
    .eq("status", "active");

  if (criticError) {
    return { success: false, message: criticError.message };
  }

  if (avatarUrl) {
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        avatar_url: avatarUrl,
      })
      .eq("id", user.id);

    if (profileError) {
      return { success: false, message: profileError.message };
    }
  }

  revalidatePath("/critic/profile");
  revalidatePath("/critic");

  return {
    success: true,
    message: "Profile updated successfully.",
  };
}