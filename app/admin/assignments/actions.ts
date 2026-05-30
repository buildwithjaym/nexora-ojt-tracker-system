"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AssignmentActionResult =
  | { success: true; message: string }
  | { success: false; message: string };

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const CAPACITY_STATUSES = ["pending", "active"] as const;
const VALID_STATUSES = ["pending", "active", "completed", "cancelled"];

function cleanText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function toNullable(value: string) {
  return value.trim() === "" ? null : value.trim();
}

async function validateOfficeCapacity({
  supabase,
  officeId,
  excludeAssignmentId,
  nextStatus,
}: {
  supabase: SupabaseServerClient;
  officeId: string;
  excludeAssignmentId?: string;
  nextStatus: string;
}): Promise<AssignmentActionResult> {
  const consumesCapacity = CAPACITY_STATUSES.includes(
    nextStatus as (typeof CAPACITY_STATUSES)[number]
  );

  if (!consumesCapacity) {
    return { success: true, message: "This status does not consume capacity." };
  }

  const { data: office, error: officeError } = await supabase
    .from("offices")
    .select("id, name, status, capacity")
    .eq("id", officeId)
    .single();

  if (officeError || !office) {
    return { success: false, message: "Office not found." };
  }

  if (office.status !== "active") {
    return {
      success: false,
      message: "Only active offices can receive student assignments.",
    };
  }

  if (office.capacity === null) {
    return { success: true, message: "Office has unlimited capacity." };
  }

  if (office.capacity <= 0) {
    return {
      success: false,
      message: `${office.name} has no available capacity.`,
    };
  }

  let query = supabase
    .from("assignments")
    .select("id", { count: "exact", head: true })
    .eq("office_id", officeId)
    .in("status", CAPACITY_STATUSES);

  if (excludeAssignmentId) {
    query = query.neq("id", excludeAssignmentId);
  }

  const { count, error } = await query;

  if (error) {
    return {
      success: false,
      message: "Unable to verify office capacity. Please try again.",
    };
  }

  const used = count ?? 0;

  if (used >= office.capacity) {
    return {
      success: false,
      message: `${office.name} is already full (${used}/${office.capacity}). Please choose another office.`,
    };
  }

  return {
    success: true,
    message: `${office.name} has ${office.capacity - used} available slot(s).`,
  };
}

export async function createAssignment(
  formData: FormData
): Promise<AssignmentActionResult> {
  const supabase = await createClient();

  const student_id = cleanText(formData.get("student_id"));
  const teacher_id = cleanText(formData.get("teacher_id"));
  const office_id = cleanText(formData.get("office_id"));
  const start_date = toNullable(cleanText(formData.get("start_date")));
  const status = cleanText(formData.get("status")) || "active";
  const remarks = toNullable(cleanText(formData.get("remarks")));

  if (!student_id || !teacher_id || !office_id) {
    return {
      success: false,
      message: "Student, teacher, and office are required.",
    };
  }

  if (!VALID_STATUSES.includes(status)) {
    return { success: false, message: "Invalid assignment status." };
  }

  const [studentRes, teacherRes, existingAssignmentRes] = await Promise.all([
    supabase
      .from("students")
      .select("id, status, required_hours")
      .eq("id", student_id)
      .single(),

    supabase
      .from("teachers")
      .select("id, status")
      .eq("id", teacher_id)
      .single(),

    supabase
      .from("assignments")
      .select("id")
      .eq("student_id", student_id)
      .in("status", CAPACITY_STATUSES)
      .maybeSingle(),
  ]);

  if (studentRes.error || !studentRes.data) {
    return { success: false, message: "Student not found." };
  }

  if (teacherRes.error || !teacherRes.data) {
    return { success: false, message: "Teacher not found." };
  }

  if (studentRes.data.status !== "active") {
    return { success: false, message: "Only active students can be assigned." };
  }

  if (teacherRes.data.status !== "active") {
    return { success: false, message: "Only active teachers can be assigned." };
  }

  if (existingAssignmentRes.data) {
    return {
      success: false,
      message: "This student already has an active or pending assignment.",
    };
  }

  const capacityCheck = await validateOfficeCapacity({
    supabase,
    officeId: office_id,
    nextStatus: status,
  });

  if (!capacityCheck.success) return capacityCheck;

  const { error } = await supabase.from("assignments").insert({
    student_id,
    teacher_id,
    office_id,
    start_date,
    end_date: null,
    assigned_hours: studentRes.data.required_hours,
    status,
    remarks,
  });

  if (error) return { success: false, message: error.message };

  revalidatePath("/admin/assignments");
  revalidatePath("/admin");

  return {
    success: true,
    message: "Assignment created successfully. Office capacity was verified.",
  };
}

export async function updateAssignment(
  assignmentId: string,
  formData: FormData
): Promise<AssignmentActionResult> {
  const supabase = await createClient();

  const teacher_id = cleanText(formData.get("teacher_id"));
  const office_id = cleanText(formData.get("office_id"));
  const start_date = toNullable(cleanText(formData.get("start_date")));
  const status = cleanText(formData.get("status")) || "active";
  const remarks = toNullable(cleanText(formData.get("remarks")));

  if (!assignmentId) {
    return { success: false, message: "Assignment ID is required." };
  }

  if (!teacher_id || !office_id) {
    return { success: false, message: "Teacher and office are required." };
  }

  if (!VALID_STATUSES.includes(status)) {
    return { success: false, message: "Invalid assignment status." };
  }

  const [assignmentRes, teacherRes] = await Promise.all([
    supabase
      .from("assignments")
      .select("id")
      .eq("id", assignmentId)
      .single(),

    supabase
      .from("teachers")
      .select("id, status")
      .eq("id", teacher_id)
      .single(),
  ]);

  if (assignmentRes.error || !assignmentRes.data) {
    return { success: false, message: "Assignment not found." };
  }

  if (teacherRes.error || !teacherRes.data) {
    return { success: false, message: "Teacher not found." };
  }

  if (teacherRes.data.status !== "active") {
    return { success: false, message: "Only active teachers can be assigned." };
  }

  const capacityCheck = await validateOfficeCapacity({
    supabase,
    officeId: office_id,
    excludeAssignmentId: assignmentId,
    nextStatus: status,
  });

  if (!capacityCheck.success) return capacityCheck;

  const { error } = await supabase
    .from("assignments")
    .update({
      teacher_id,
      office_id,
      start_date,
      status,
      remarks,
    })
    .eq("id", assignmentId);

  if (error) return { success: false, message: error.message };

  revalidatePath("/admin/assignments");
  revalidatePath("/admin");

  return {
    success: true,
    message: "Assignment updated successfully. Office capacity was verified.",
  };
}

export async function deleteAssignment(
  assignmentId: string
): Promise<AssignmentActionResult> {
  const supabase = await createClient();

  if (!assignmentId) {
    return { success: false, message: "Assignment ID is required." };
  }

  const { error } = await supabase
    .from("assignments")
    .delete()
    .eq("id", assignmentId);

  if (error) return { success: false, message: error.message };

  revalidatePath("/admin/assignments");
  revalidatePath("/admin");

  return {
    success: true,
    message: "Assignment deleted successfully.",
  };
}