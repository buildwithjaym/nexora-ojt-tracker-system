"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type CriticActionResult =
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

function isValidPHPhone(phone: string) {
  return /^09\d{9}$/.test(phone);
}

function buildFullName(
  firstName: string,
  middleName: string | null,
  lastName: string,
  suffix: string | null
) {
  return [firstName, middleName, lastName, suffix].filter(Boolean).join(" ");
}

function buildPassword(lastName: string) {
  return `critic-${lastName.toLowerCase().replace(/\s+/g, "")}`;
}

async function findAuthUserByEmail(email: string) {
  const adminSupabase = createAdminClient();
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await adminSupabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) return { user: null, error };

    const user = data.users.find(
      (item) => item.email?.toLowerCase() === email.toLowerCase()
    );

    if (user) return { user, error: null };

    if (data.users.length < perPage) break;
    page++;
  }

  return { user: null, error: null };
}

export async function createCritic(
  formData: FormData
): Promise<CriticActionResult> {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  const first_name = cleanText(formData.get("first_name"));
  const middle_name = toNullable(cleanText(formData.get("middle_name")));
  const last_name = cleanText(formData.get("last_name"));
  const suffix = toNullable(cleanText(formData.get("suffix")));
  const email = cleanText(formData.get("email")).toLowerCase();
  const phone = cleanText(formData.get("phone"));
  const position = toNullable(cleanText(formData.get("position")));
  const department = toNullable(cleanText(formData.get("department")));
  const office_id = cleanText(formData.get("office_id"));
  const status = cleanText(formData.get("status")) || "active";

  if (!first_name || !last_name || !email || !office_id) {
    return { success: false, message: "Please fill in all required fields." };
  }

  if (!isValidEmail(email)) {
    return { success: false, message: "Please enter a valid email address." };
  }

  if (phone && !isValidPHPhone(phone)) {
    return {
      success: false,
      message: "Phone number must be 11 digits and start with 09.",
    };
  }

  const full_name = buildFullName(first_name, middle_name, last_name, suffix);
  const password = buildPassword(last_name);

  const { data: existingCritic, error: existingCriticError } = await supabase
    .from("critics")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingCriticError) {
    return { success: false, message: existingCriticError.message };
  }

  if (existingCritic) {
    return { success: false, message: "Critic email already exists." };
  }

  const { user: existingAuthUser, error: existingAuthUserError } =
    await findAuthUserByEmail(email);

  if (existingAuthUserError) {
    return { success: false, message: existingAuthUserError.message };
  }

  let userId = existingAuthUser?.id ?? null;
  let createdNewAuthUser = false;

  if (!userId) {
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
          role: "critic",
          must_change_password: true,
        },
      });

    if (authError || !authData.user) {
      return {
        success: false,
        message: authError?.message || "Failed to create critic account.",
      };
    }

    userId = authData.user.id;
    createdNewAuthUser = true;
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
      role: "critic",
      is_active: status === "active",
      must_change_password: true,
    },
    { onConflict: "id" }
  );

  if (profileError) {
    if (createdNewAuthUser) {
      await adminSupabase.auth.admin.deleteUser(userId);
    }

    return { success: false, message: profileError.message };
  }

  const { error: criticError } = await supabase.from("critics").insert({
    profile_id: userId,
    office_id,
    first_name,
    middle_name,
    last_name,
    suffix,
    email,
    phone: toNullable(phone),
    position,
    department,
    status,
  });

  if (criticError) {
    if (createdNewAuthUser) {
      await supabase.from("profiles").delete().eq("id", userId);
      await adminSupabase.auth.admin.deleteUser(userId);
    }

    return { success: false, message: criticError.message };
  }

  revalidatePath("/admin/critics");
  revalidatePath("/admin");

  return {
    success: true,
    message: "Critic created successfully.",
    credentials: { email, password },
  };
}

export async function updateCritic(
  criticId: string,
  formData: FormData
): Promise<CriticActionResult> {
  const supabase = await createClient();

  const first_name = cleanText(formData.get("first_name"));
  const middle_name = toNullable(cleanText(formData.get("middle_name")));
  const last_name = cleanText(formData.get("last_name"));
  const suffix = toNullable(cleanText(formData.get("suffix")));
  const email = cleanText(formData.get("email")).toLowerCase();
  const phone = cleanText(formData.get("phone"));
  const position = toNullable(cleanText(formData.get("position")));
  const department = toNullable(cleanText(formData.get("department")));
  const office_id = cleanText(formData.get("office_id"));
  const status = cleanText(formData.get("status")) || "active";

  if (!first_name || !last_name || !email || !office_id) {
    return { success: false, message: "Please fill in all required fields." };
  }

  if (!isValidEmail(email)) {
    return { success: false, message: "Please enter a valid email address." };
  }

  if (phone && !isValidPHPhone(phone)) {
    return {
      success: false,
      message: "Phone number must be 11 digits and start with 09.",
    };
  }

  const { data: currentCritic, error: fetchError } = await supabase
    .from("critics")
    .select("id, profile_id")
    .eq("id", criticId)
    .single();

  if (fetchError || !currentCritic) {
    return { success: false, message: fetchError?.message || "Critic not found." };
  }

  const { data: duplicateEmail, error: duplicateError } = await supabase
    .from("critics")
    .select("id")
    .eq("email", email)
    .neq("id", criticId)
    .maybeSingle();

  if (duplicateError) {
    return { success: false, message: duplicateError.message };
  }

  if (duplicateEmail) {
    return { success: false, message: "Another critic already uses this email." };
  }

  const full_name = buildFullName(first_name, middle_name, last_name, suffix);

  const { error: criticError } = await supabase
    .from("critics")
    .update({
      office_id,
      first_name,
      middle_name,
      last_name,
      suffix,
      email,
      phone: toNullable(phone),
      position,
      department,
      status,
    })
    .eq("id", criticId);

  if (criticError) {
    return { success: false, message: criticError.message };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      email,
      full_name,
      first_name,
      middle_name,
      last_name,
      suffix,
      is_active: status === "active",
    })
    .eq("id", currentCritic.profile_id);

  if (profileError) {
    return { success: false, message: profileError.message };
  }

  revalidatePath("/admin/critics");
  revalidatePath("/admin");

  return {
    success: true,
    message: "Critic updated successfully.",
  };
}

export async function deleteCritic(
  criticId: string
): Promise<CriticActionResult> {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  const { data: critic, error: fetchError } = await supabase
    .from("critics")
    .select("id, profile_id")
    .eq("id", criticId)
    .single();

  if (fetchError || !critic) {
    return { success: false, message: fetchError?.message || "Critic not found." };
  }

  const { error: deleteCriticError } = await supabase
    .from("critics")
    .delete()
    .eq("id", criticId);

  if (deleteCriticError) {
    return { success: false, message: deleteCriticError.message };
  }

  await supabase.from("profiles").delete().eq("id", critic.profile_id);
  await adminSupabase.auth.admin.deleteUser(critic.profile_id);

  revalidatePath("/admin/critics");
  revalidatePath("/admin");

  return {
    success: true,
    message: "Critic deleted successfully.",
  };
}