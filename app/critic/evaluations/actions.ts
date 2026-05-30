"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type EvaluationActionResult =
  | { success: true; message: string }
  | { success: false; message: string };

function cleanText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function toNullable(value: string) {
  return value.trim() === "" ? null : value.trim();
}

function toNumber(value: FormDataEntryValue | null) {
  const parsed = Number(cleanText(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function submitEvaluation(
  formData: FormData
): Promise<EvaluationActionResult> {
  const supabase = await createClient();

  const assignment_id = cleanText(formData.get("assignment_id"));
  const student_id = cleanText(formData.get("student_id"));

  const attendance_score = toNumber(formData.get("attendance_score"));
  const work_quality_score = toNumber(formData.get("work_quality_score"));
  const professionalism_score = toNumber(formData.get("professionalism_score"));
  const communication_score = toNumber(formData.get("communication_score"));
  const initiative_score = toNumber(formData.get("initiative_score"));
  const practicum_grade = toNumber(formData.get("practicum_grade"));

  const strengths = toNullable(cleanText(formData.get("strengths")));
  const improvement_areas = toNullable(
    cleanText(formData.get("improvement_areas"))
  );
  const general_comment = toNullable(cleanText(formData.get("general_comment")));
  const recommendation =
    cleanText(formData.get("recommendation")) || "recommended";

  if (!assignment_id || !student_id) {
    return { success: false, message: "Missing assignment or student record." };
  }

  const rubricScores = [
    attendance_score,
    work_quality_score,
    professionalism_score,
    communication_score,
    initiative_score,
  ];

  if (rubricScores.some((score) => score < 1 || score > 5)) {
    return {
      success: false,
      message: "All rubric scores must be between 1 and 5.",
    };
  }

  if (practicum_grade < 0 || practicum_grade > 100) {
    return {
      success: false,
      message: "Practicum grade must be between 0 and 100.",
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "You must be logged in." };
  }

  const { data: critic, error: criticError } = await supabase
    .from("critics")
    .select("id, office_id")
    .eq("profile_id", user.id)
    .eq("status", "active")
    .single();

  if (criticError || !critic) {
    return { success: false, message: "Critic account not found." };
  }

  const { data: existingEvaluation } = await supabase
    .from("evaluations")
    .select("id")
    .eq("assignment_id", assignment_id)
    .maybeSingle();

  if (existingEvaluation) {
    return {
      success: false,
      message: "This student already has a submitted evaluation.",
    };
  }

  const { data: assignment, error: assignmentError } = await supabase
    .from("assignments")
    .select(
      `
      id,
      student_id,
      office_id,
      status,
      students:student_id (
        completed_hours,
        required_hours
      )
    `
    )
    .eq("id", assignment_id)
    .eq("student_id", student_id)
    .eq("office_id", critic.office_id)
    .single();

  if (assignmentError || !assignment) {
    return {
      success: false,
      message: "Assignment is not valid for your office.",
    };
  }

  const student = Array.isArray((assignment as any).students)
    ? (assignment as any).students[0]
    : (assignment as any).students;

  const completed = Number(student?.completed_hours ?? 0);
  const required = Number(student?.required_hours ?? 0);

  if (completed < required) {
    return {
      success: false,
      message:
        "Evaluation is locked until the student completes the required hours.",
    };
  }

  const overall_score =
    rubricScores.reduce((sum, score) => sum + score, 0) / rubricScores.length;

  const { error } = await supabase.from("evaluations").insert({
    assignment_id,
    student_id,
    critic_id: critic.id,
    office_id: critic.office_id,
    attendance_score,
    work_quality_score,
    professionalism_score,
    communication_score,
    initiative_score,
    overall_score,
    practicum_grade,
    strengths,
    improvement_areas,
    general_comment,
    recommendation,
    status: "submitted",
    submitted_at: new Date().toISOString(),
  });

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath("/critic/evaluations");
  revalidatePath("/critic");
  revalidatePath("/critic/students");
  return {
    success: true,
    message: "Evaluation and practicum grade submitted successfully.",
  };
}