"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AssignmentActionResult =
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

export async function createAssignment(
  formData: FormData
): Promise<AssignmentActionResult> {
  const supabase = await createClient();

  const student_id = cleanText(formData.get("student_id"));
  const teacher_id = cleanText(formData.get("teacher_id"));
  const office_id = cleanText(formData.get("office_id"));
  const start_date = toNullable(cleanText(formData.get("start_date")));
  const assigned_hours_raw = cleanText(formData.get("assigned_hours"));
  const status = cleanText(formData.get("status")) || "active";
  const remarks = toNullable(cleanText(formData.get("remarks")));

  if (!student_id || !teacher_id || !office_id) {
    return {
      success: false,
      message: "Student, teacher, and office are required.",
    };
  }


  const assigned_hours =
    assigned_hours_raw.trim() === ""
      ? null
      : Number.parseInt(assigned_hours_raw, 10);

  if (assigned_hours !== null && Number.isNaN(assigned_hours)) {
    return {
      success: false,
      message: "Assigned hours must be a valid number.",
    };
  }

  const [studentRes, teacherRes, officeRes, activeAssignmentRes] =
    await Promise.all([
      supabase
        .from("students")
        .select("id, status")
        .eq("id", student_id)
        .single(),
      supabase
        .from("teachers")
        .select("id, status")
        .eq("id", teacher_id)
        .single(),
      supabase
        .from("offices")
        .select("id, status")
        .eq("id", office_id)
        .single(),
      supabase
        .from("assignments")
        .select("id")
        .eq("student_id", student_id)
        .in("status", ["pending", "active"])
        .maybeSingle(),
    ]);

  if (studentRes.error || !studentRes.data) {
    return { success: false, message: "Student not found." };
  }

  if (teacherRes.error || !teacherRes.data) {
    return { success: false, message: "Teacher not found." };
  }

  if (officeRes.error || !officeRes.data) {
    return { success: false, message: "Office not found." };
  }

  if (studentRes.data.status !== "active") {
    return {
      success: false,
      message: "Only active students can be assigned.",
    };
  }

  if (teacherRes.data.status !== "active") {
    return {
      success: false,
      message: "Only active teachers can be assigned.",
    };
  }

  if (officeRes.data.status !== "active") {
    return {
      success: false,
      message: "Only active offices can be assigned.",
    };
  }

  if (activeAssignmentRes.data) {
    return {
      success: false,
      message: "This student already has an active or pending assignment.",
    };
  }

  const { error } = await supabase.from("assignments").insert({
    student_id,
    teacher_id,
    office_id,
    start_date,
    end_date: null,
    assigned_hours,
    status,
    remarks,
  });

  if (error) {
    return {
      success: false,
      message: error.message,
    };
  }

  revalidatePath("/admin/assignments");
  revalidatePath("/admin");

  return {
    success: true,
    message: "Assignment created successfully.",
  };
}

export async function updateAssignment(
  assignmentId: string,
  formData: FormData
): Promise<AssignmentActionResult> {
  const supabase = await createClient();

  const student_id = cleanText(formData.get("student_id"));
  const teacher_id = cleanText(formData.get("teacher_id"));
  const office_id = cleanText(formData.get("office_id"));
  const start_date = toNullable(cleanText(formData.get("start_date")));
  const assigned_hours_raw = cleanText(formData.get("assigned_hours"));
  const status = cleanText(formData.get("status")) || "active";
  const remarks = toNullable(cleanText(formData.get("remarks")));

  if (!student_id || !teacher_id || !office_id) {
    return {
      success: false,
      message: "Student, teacher, and office are required.",
    };
  }

 

  const assigned_hours =
    assigned_hours_raw.trim() === ""
      ? null
      : Number.parseInt(assigned_hours_raw, 10);

  if (assigned_hours !== null && Number.isNaN(assigned_hours)) {
    return {
      success: false,
      message: "Assigned hours must be a valid number.",
    };
  }

  const existingRes = await supabase
    .from("assignments")
    .select("id")
    .eq("student_id", student_id)
    .in("status", ["pending", "active"])
    .neq("id", assignmentId)
    .maybeSingle();

  if (existingRes.data && (status === "pending" || status === "active")) {
    return {
      success: false,
      message: "This student already has another active or pending assignment.",
    };
  }

  const { error } = await supabase
    .from("assignments")
    .update({
      student_id,
      teacher_id,
      office_id,
      start_date,
      end_date: null,
      assigned_hours,
      status,
      remarks,
    })
    .eq("id", assignmentId);

  if (error) {
    return {
      success: false,
      message: error.message,
    };
  }

  revalidatePath("/admin/assignments");
  revalidatePath("/admin");

  return {
    success: true,
    message: "Assignment updated successfully.",
  };
}

export async function deleteAssignment(
  assignmentId: string
): Promise<AssignmentActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("assignments")
    .delete()
    .eq("id", assignmentId);

  if (error) {
    return {
      success: false,
      message: error.message,
    };
  }

  revalidatePath("/admin/assignments");
  revalidatePath("/admin");

  return {
    success: true,
    message: "Assignment deleted successfully.",
  };
}