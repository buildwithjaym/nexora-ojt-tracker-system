"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

const MIN_SCORE = 70;
const MAX_SCORE = 95;
const MAX_COMMENT_LENGTH = 1000;

const recommendations = [
  "highly_recommended",
  "recommended",
  "needs_improvement",
  "not_recommended",
] as const;

export type Recommendation =
  (typeof recommendations)[number];

const jobFactors = [
  "assertiveness",
  "tact_ethics",
  "courtesy_ethics",
  "accepts_criticism",

  "written_communication",
  "oral_communication",
  "active_listening",

  "learning_ability",
  "computer_knowledge",
  "potential_growth",
  "sound_judgment",

  "theory_integration",
  "output_quality",
  "task_timeliness",

  "attire",
  "decorum",
  "self_confidence",
  "enthusiasm",
] as const;

type JobFactor = (typeof jobFactors)[number];

const factorLabels: Record<JobFactor, string> = {
  assertiveness: "Assertiveness",
  tact_ethics: "Tact and consideration",
  courtesy_ethics: "Courtesy and professional ethics",
  accepts_criticism: "Acceptance of criticism",

  written_communication: "Written communication",
  oral_communication: "Oral communication",
  active_listening: "Active listening",

  learning_ability: "Learning ability",
  computer_knowledge: "Computer knowledge",
  potential_growth: "Potential for growth",
  sound_judgment: "Sound judgment",

  theory_integration: "Theory integration",
  output_quality: "Output quality",
  task_timeliness: "Task timeliness",

  attire: "Appropriate attire",
  decorum: "Professional decorum",
  self_confidence: "Self-confidence",
  enthusiasm: "Enthusiasm",
};

export type SubmittedEvaluation = {
  id: string;
  assignmentId: string;
  studentId: string;
  averageRating: number;
  recommendation: Recommendation;
  status: string;
  submittedAt: string;
};

export type EvaluationActionResult =
  | {
      success: true;
      message: string;
      data: SubmittedEvaluation;
    }
  | {
      success: false;
      message: string;
    };

type AssignmentStudent = {
  completed_hours: number | string | null;
  required_hours: number | string | null;
};

function normalizeRelation<T>(
  value: T | T[] | null | undefined
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function clean(
  value: FormDataEntryValue | null
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function parseScore(
  value: FormDataEntryValue | null
): number | null {
  const raw = clean(value);

  if (!raw) {
    return null;
  }

  const score = Number(raw);

  if (
    !Number.isFinite(score) ||
    !Number.isInteger(score)
  ) {
    return null;
  }

  return score;
}

function nullableText(
  value: FormDataEntryValue | null
): string | null {
  const text = clean(value);
  return text || null;
}

function isRecommendation(
  value: string
): value is Recommendation {
  return recommendations.includes(
    value as Recommendation
  );
}

export async function submitEvaluation(
  formData: FormData
): Promise<EvaluationActionResult> {
  try {
    const supabase = await createClient();

    /*
     * Validate identifiers.
     */
    const assignmentId = clean(
      formData.get("assignment_id")
    );

    const studentId = clean(
      formData.get("student_id")
    );

    if (
      !assignmentId ||
      !studentId ||
      !isUuid(assignmentId) ||
      !isUuid(studentId)
    ) {
      return {
        success: false,
        message:
          "The assignment or student reference is invalid.",
      };
    }

    /*
     * Validate recommendation.
     */
    const recommendationValue =
      clean(formData.get("recommendation")) ||
      "recommended";

    if (
      !isRecommendation(recommendationValue)
    ) {
      return {
        success: false,
        message:
          "Select a valid recommendation.",
      };
    }

    /*
     * Validate optional comments.
     */
    const strengths = nullableText(
      formData.get("strengths")
    );

    const improvementAreas = nullableText(
      formData.get("improvement_areas")
    );

    const generalComment = nullableText(
      formData.get("general_comment")
    );

    const comments = [
      ["Strengths", strengths],
      ["Areas for improvement", improvementAreas],
      ["General comments", generalComment],
    ] as const;

    for (const [label, value] of comments) {
      if (
        value &&
        value.length > MAX_COMMENT_LENGTH
      ) {
        return {
          success: false,
          message: `${label} must not exceed ${MAX_COMMENT_LENGTH} characters.`,
        };
      }
    }

    /*
     * Validate all 18 scores before touching the database.
     */
    const scores = {} as Record<
      JobFactor,
      number
    >;

    for (const factor of jobFactors) {
      const score = parseScore(
        formData.get(factor)
      );

      if (score === null) {
        return {
          success: false,
          message: `${factorLabels[factor]} must be a whole number.`,
        };
      }

      if (
        score < MIN_SCORE ||
        score > MAX_SCORE
      ) {
        return {
          success: false,
          message: `${factorLabels[factor]} must be between ${MIN_SCORE} and ${MAX_SCORE}.`,
        };
      }

      scores[factor] = score;
    }

    /*
     * Authenticate and verify profile access.
     */
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        success: false,
        message:
          "Your session has expired. Sign in again.",
      };
    }

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (
      profileError ||
      !profile ||
      profile.role !== "critic" ||
      profile.is_active !== true
    ) {
      return {
        success: false,
        message:
          "Your account is not authorized to submit evaluations.",
      };
    }

    /*
     * Retrieve the active critic.
     */
    const {
      data: critic,
      error: criticError,
    } = await supabase
      .from("critics")
      .select("id, office_id")
      .eq("profile_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (criticError || !critic) {
      return {
        success: false,
        message:
          "An active critic record was not found.",
      };
    }

    /*
     * Verify that the assignment:
     * - exists;
     * - belongs to this student;
     * - belongs to the critic's office;
     * - is active or completed.
     */
    const {
      data: assignment,
      error: assignmentError,
    } = await supabase
      .from("assignments")
      .select(`
        id,
        student_id,
        office_id,
        status,
        students:student_id (
          completed_hours,
          required_hours
        )
      `)
      .eq("id", assignmentId)
      .eq("student_id", studentId)
      .eq("office_id", critic.office_id)
      .in("status", ["active", "completed"])
      .maybeSingle();

    if (assignmentError || !assignment) {
      return {
        success: false,
        message:
          "The assignment is unavailable or does not belong to your office.",
      };
    }

    const student =
      normalizeRelation<AssignmentStudent>(
        assignment.students as
          | AssignmentStudent
          | AssignmentStudent[]
          | null
      );

    if (!student) {
      return {
        success: false,
        message:
          "The assigned student record could not be found.",
      };
    }

    const completedHours = Number(
      student.completed_hours ?? 0
    );

    const requiredHours = Number(
      student.required_hours ?? 0
    );

    if (
      !Number.isFinite(completedHours) ||
      !Number.isFinite(requiredHours) ||
      requiredHours <= 0
    ) {
      return {
        success: false,
        message:
          "The student's practicum-hour record is invalid.",
      };
    }

    if (completedHours < requiredHours) {
      return {
        success: false,
        message: `The student still needs ${Math.max(
          requiredHours - completedHours,
          0
        )} practicum hours before evaluation.`,
      };
    }

    /*
     * Insert only writable fields.
     *
     * average_rating is excluded because PostgreSQL generates it
     * automatically from the 18 factor scores.
     */
    const {
      data: insertedEvaluation,
      error: insertError,
    } = await supabase
      .from("evaluations")
      .insert({
        assignment_id: assignmentId,
        student_id: studentId,
        critic_id: critic.id,
        office_id: critic.office_id,

        strengths,
        improvement_areas: improvementAreas,
        general_comment: generalComment,

        recommendation: recommendationValue,
        status: "submitted",
        submitted_at: new Date().toISOString(),

        ...scores,
      })
      .select(`
        id,
        assignment_id,
        student_id,
        average_rating,
        recommendation,
        status,
        submitted_at
      `)
      .single();

    if (insertError) {
      /*
       * PostgreSQL unique violation:
       * evaluations.assignment_id is unique.
       */
      if (insertError.code === "23505") {
        return {
          success: false,
          message:
            "An evaluation has already been submitted for this assignment.",
        };
      }

      /*
       * PostgreSQL check-constraint violation.
       */
      if (insertError.code === "23514") {
        return {
          success: false,
          message:
            "One or more submitted values do not meet the evaluation rules.",
        };
      }

      /*
       * PostgreSQL foreign-key violation.
       */
      if (insertError.code === "23503") {
        return {
          success: false,
          message:
            "The assignment, student, critic, or office reference is no longer valid.",
        };
      }

      console.error(
        "[SUBMIT_EVALUATION:INSERT]",
        insertError
      );

      return {
        success: false,
        message:
          "The evaluation could not be submitted. Try again.",
      };
    }

    if (!insertedEvaluation) {
      return {
        success: false,
        message:
          "The evaluation was saved, but its result could not be retrieved.",
      };
    }

    const generatedAverage = Number(
      insertedEvaluation.average_rating
    );

    /*
     * Refresh every critic view affected by the new evaluation.
     */
    revalidatePath("/critic");
    revalidatePath("/critic/evaluations");
    revalidatePath("/critic/students");
    revalidatePath(
      `/critic/students/${studentId}`
    );

    return {
      success: true,
      message:
        "Evaluation submitted successfully.",
      data: {
        id: insertedEvaluation.id,
        assignmentId:
          insertedEvaluation.assignment_id,
        studentId:
          insertedEvaluation.student_id,
        averageRating: Number.isFinite(
          generatedAverage
        )
          ? generatedAverage
          : 0,
        recommendation:
          insertedEvaluation.recommendation as Recommendation,
        status: insertedEvaluation.status,
        submittedAt:
          insertedEvaluation.submitted_at,
      },
    };
  } catch (error) {
    console.error(
      "[SUBMIT_EVALUATION:FATAL]",
      error
    );

    return {
      success: false,
      message:
        "An unexpected error occurred while submitting the evaluation.",
    };
  }
}