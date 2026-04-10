"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type BatchActionResult =
  | {
      success: true;
      message: string;
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

function parseRequiredHours(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export async function createBatch(
  formData: FormData
): Promise<BatchActionResult> {
  const supabase = await createClient();

  const code = cleanText(formData.get("code")).toUpperCase();
  const name = cleanText(formData.get("name"));
  const course = cleanText(formData.get("course"));
  const year_level = toNullable(cleanText(formData.get("year_level")));
  const required_hours = parseRequiredHours(
    cleanText(formData.get("required_hours"))
  );
  const is_active = cleanText(formData.get("is_active")) === "true";

  if (!code || !name || !course || required_hours <= 0) {
    return {
      success: false,
      message: "Code, name, course, and valid required hours are required.",
    };
  }

  const { data: existingCode } = await supabase
    .from("batches")
    .select("id")
    .eq("code", code)
    .maybeSingle();

  if (existingCode) {
    return {
      success: false,
      message: "A batch with this code already exists.",
    };
  }

  const { error } = await supabase.from("batches").insert({
    code,
    name,
    course,
    year_level,
    required_hours,
    is_active,
  });

  if (error) {
    return {
      success: false,
      message: error.message,
    };
  }

  revalidatePath("/admin/batches");
  revalidatePath("/admin");

  return {
    success: true,
    message: "Batch created successfully.",
  };
}

export async function updateBatch(
  batchId: string,
  formData: FormData
): Promise<BatchActionResult> {
  const supabase = await createClient();

  const code = cleanText(formData.get("code")).toUpperCase();
  const name = cleanText(formData.get("name"));
  const course = cleanText(formData.get("course"));
  const year_level = toNullable(cleanText(formData.get("year_level")));
  const required_hours = parseRequiredHours(
    cleanText(formData.get("required_hours"))
  );
  const is_active = cleanText(formData.get("is_active")) === "true";

  if (!code || !name || !course || required_hours <= 0) {
    return {
      success: false,
      message: "Code, name, course, and valid required hours are required.",
    };
  }

  const { data: existingBatch, error: existingBatchError } = await supabase
    .from("batches")
    .select("id")
    .eq("id", batchId)
    .single();

  if (existingBatchError || !existingBatch) {
    return {
      success: false,
      message: existingBatchError?.message || "Batch not found.",
    };
  }

  const { data: codeConflict } = await supabase
    .from("batches")
    .select("id")
    .eq("code", code)
    .neq("id", batchId)
    .maybeSingle();

  if (codeConflict) {
    return {
      success: false,
      message: "A different batch already uses this code.",
    };
  }

  const { error } = await supabase
    .from("batches")
    .update({
      code,
      name,
      course,
      year_level,
      required_hours,
      is_active,
    })
    .eq("id", batchId);

  if (error) {
    return {
      success: false,
      message: error.message,
    };
  }

  revalidatePath("/admin/batches");
  revalidatePath("/admin");

  return {
    success: true,
    message: "Batch updated successfully.",
  };
}

export async function deleteBatch(
  batchId: string
): Promise<BatchActionResult> {
  const supabase = await createClient();

  const { data: existingBatch, error: existingBatchError } = await supabase
    .from("batches")
    .select("id")
    .eq("id", batchId)
    .single();

  if (existingBatchError || !existingBatch) {
    return {
      success: false,
      message: existingBatchError?.message || "Batch not found.",
    };
  }

  const { error } = await supabase.from("batches").delete().eq("id", batchId);

  if (error) {
    return {
      success: false,
      message: error.message,
    };
  }

  revalidatePath("/admin/batches");
  revalidatePath("/admin");

  return {
    success: true,
    message: "Batch deleted successfully.",
  };
}