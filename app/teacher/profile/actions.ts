"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function sanitizeText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeNullableText(value: FormDataEntryValue | null) {
  const parsed = typeof value === "string" ? value.trim() : "";
  return parsed.length > 0 ? parsed : null;
}

export async function updateTeacherProfile(formData: FormData) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // No-op in some server contexts
          }
        },
      },
    }
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/teacher/profile?error=session");
  }

  const firstName = sanitizeText(formData.get("first_name"));
  const middleName = sanitizeNullableText(formData.get("middle_name"));
  const lastName = sanitizeText(formData.get("last_name"));
  const suffix = sanitizeNullableText(formData.get("suffix"));
  const phone = sanitizeNullableText(formData.get("phone"));

  if (!firstName || !lastName) {
    redirect("/teacher/profile?error=required");
  }

  if (firstName.length > 100 || lastName.length > 100) {
    redirect("/teacher/profile?error=name_length");
  }

  if (middleName && middleName.length > 100) {
    redirect("/teacher/profile?error=middle_length");
  }

  if (suffix && suffix.length > 30) {
    redirect("/teacher/profile?error=suffix_length");
  }

  if (phone && phone.length > 30) {
    redirect("/teacher/profile?error=phone_length");
  }

  const { data: teacher, error: teacherError } = await supabase
    .from("teachers")
    .select("id, profile_id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (teacherError || !teacher) {
    redirect("/teacher/profile?error=teacher_not_found");
  }

  const { error: profileUpdateError } = await supabase
    .from("profiles")
    .update({
      first_name: firstName,
      middle_name: middleName,
      last_name: lastName,
      suffix,
      full_name: [firstName, lastName].filter(Boolean).join(" "),
    })
    .eq("id", user.id);

  if (profileUpdateError) {
    redirect("/teacher/profile?error=profile_update_failed");
  }

  const { error: teacherUpdateError } = await supabase
    .from("teachers")
    .update({
      first_name: firstName,
      middle_name: middleName,
      last_name: lastName,
      suffix,
      phone,
    })
    .eq("id", teacher.id);

  if (teacherUpdateError) {
    redirect("/teacher/profile?error=teacher_update_failed");
  }

  revalidatePath("/teacher/profile");
  redirect("/teacher/profile?success=1");
}