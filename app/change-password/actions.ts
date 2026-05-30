"use server";

import { createClient } from "@/lib/supabase/server";

export type ChangePasswordResult =
  | {
      success: true;
      message: string;
      redirectTo: string;
    }
  | {
      success: false;
      message: string;
    };

type UserRole = "admin" | "teacher" | "student" | "critic";

function getRedirectPath(role: UserRole) {
  if (role === "admin") return "/admin";
  if (role === "teacher") return "/teacher";
  if (role === "critic") return "/critic";
  return "/student";
}

function isStrongPassword(password: string) {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password)
  );
}

export async function changePassword(
  formData: FormData
): Promise<ChangePasswordResult> {
  const supabase = await createClient();

  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (!password || !confirmPassword) {
    return {
      success: false,
      message: "Password and confirm password are required.",
    };
  }

  if (password !== confirmPassword) {
    return {
      success: false,
      message: "Passwords do not match.",
    };
  }

  if (!isStrongPassword(password)) {
    return {
      success: false,
      message:
        "Password must be at least 8 characters with uppercase, lowercase, and number.",
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      success: false,
      message: "Session expired. Please log in again.",
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, is_active, must_change_password")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return {
      success: false,
      message: "Unable to load your profile.",
    };
  }

  if (!profile.is_active) {
    return {
      success: false,
      message: "Your account is inactive.",
    };
  }

  const { error: passwordError } = await supabase.auth.updateUser({
    password,
  });

  if (passwordError) {
    return {
      success: false,
      message: passwordError.message,
    };
  }

  const { error: updateProfileError } = await supabase
    .from("profiles")
    .update({
      must_change_password: false,
    })
    .eq("id", user.id);

  if (updateProfileError) {
    return {
      success: false,
      message: updateProfileError.message,
    };
  }

  return {
    success: true,
    message: "Password changed successfully.",
    redirectTo: getRedirectPath(profile.role as UserRole),
  };
}