import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TeacherEvaluationsClient } from "@/components/teacher/teacher-evaluations-client";

export const dynamic = "force-dynamic";

const EVALUATION_SELECT = `
  id,
  assignment_id,
  student_id,
  critic_id,
  office_id,
  strengths,
  improvement_areas,
  general_comment,
  recommendation,
  status,
  submitted_at,
  created_at,
  updated_at,
  assertiveness,
  tact_ethics,
  courtesy_ethics,
  accepts_criticism,
  written_communication,
  oral_communication,
  active_listening,
  learning_ability,
  computer_knowledge,
  potential_growth,
  sound_judgment,
  theory_integration,
  output_quality,
  task_timeliness,
  attire,
  decorum,
  self_confidence,
  enthusiasm,
  average_rating
`;

export default async function TeacherEvaluationsPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) redirect("/login");

  const { data: teacher, error: teacherError } = await supabase
    .from("teachers")
    .select("id, first_name, last_name, profile_id")
    .eq("profile_id", user.id)
    .single();

  if (teacherError || !teacher) redirect("/login");

  const { data: assignments, error: assignmentsError } = await supabase
    .from("assignments")
    .select("id, student_id, teacher_id, office_id, status, assigned_hours")
    .eq("teacher_id", teacher.id)
    .in("status", ["active", "pending", "completed"])
    .order("created_at", { ascending: false });

  if (assignmentsError) {
    console.error(
      "Teacher evaluations - assignments query failed:",
      assignmentsError,
    );
  }

  const safeAssignments = assignments ?? [];

  if (safeAssignments.length === 0) {
    return (
      <TeacherEvaluationsClient
        teacherName={`${teacher.first_name} ${teacher.last_name}`}
        rows={[]}
      />
    );
  }

  const studentIds = [
    ...new Set(safeAssignments.map((assignment) => assignment.student_id)),
  ];
  const officeIds = [
    ...new Set(safeAssignments.map((assignment) => assignment.office_id)),
  ];
  const assignmentIds = safeAssignments.map((assignment) => assignment.id);

  const [studentsResult, officesResult, evaluationsResult] = await Promise.all([
    supabase
      .from("students")
      .select(
        "id, student_number, first_name, middle_name, last_name, required_hours, completed_hours, status",
      )
      .in("id", studentIds),
    supabase.from("offices").select("id, name").in("id", officeIds),
    supabase
      .from("evaluations")
      .select(EVALUATION_SELECT)
      .in("assignment_id", assignmentIds)
      .order("submitted_at", { ascending: false }),
  ]);

  if (studentsResult.error) {
    console.error(
      "Teacher evaluations - students query failed:",
      studentsResult.error,
    );
  }

  if (officesResult.error) {
    console.error(
      "Teacher evaluations - offices query failed:",
      officesResult.error,
    );
  }

  if (evaluationsResult.error) {
    console.error(
      "Teacher evaluations - evaluations query failed:",
      evaluationsResult.error,
    );
  }

  const students = studentsResult.data ?? [];
  const offices = officesResult.data ?? [];
  const evaluations = evaluationsResult.data ?? [];

  const criticIds = [
    ...new Set(
      evaluations
        .map((evaluation) => evaluation.critic_id)
        .filter((criticId): criticId is string => Boolean(criticId)),
    ),
  ];

  const criticsResult =
    criticIds.length > 0
      ? await supabase
          .from("critics")
          .select("id, first_name, last_name, email, position, office_id")
          .in("id", criticIds)
      : { data: [], error: null };

  if (criticsResult.error) {
    console.error(
      "Teacher evaluations - critics query failed:",
      criticsResult.error,
    );
  }

  const critics = criticsResult.data ?? [];

  const studentsById = new Map(
    students.map((student) => [student.id, student]),
  );
  const officesById = new Map(offices.map((office) => [office.id, office]));
  const evaluationsByAssignmentId = new Map(
    evaluations.map((evaluation) => [evaluation.assignment_id, evaluation]),
  );
  const criticsById = new Map(critics.map((critic) => [critic.id, critic]));

  const rows = safeAssignments.map((assignment) => {
    const student = studentsById.get(assignment.student_id);
    const office = officesById.get(assignment.office_id);
    const evaluation = evaluationsByAssignmentId.get(assignment.id) ?? null;
    const critic = evaluation
      ? (criticsById.get(evaluation.critic_id) ?? null)
      : null;

    return {
      assignment: {
        id: assignment.id,
        status: assignment.status,
        assigned_hours: assignment.assigned_hours,
      },
      student: {
        id: assignment.student_id,
        student_number: student?.student_number ?? null,
        first_name: student?.first_name ?? "Unknown",
        middle_name: student?.middle_name ?? null,
        last_name: student?.last_name ?? "Student",
        required_hours: student?.required_hours ?? 0,
        completed_hours: student?.completed_hours ?? 0,
        status: student?.status ?? "active",
      },
      office: {
        id: assignment.office_id,
        name: office?.name ?? "No office assigned",
      },
      evaluation,
      critic: critic
        ? {
            id: critic.id,
            first_name: critic.first_name,
            last_name: critic.last_name,
            email: critic.email,
            position: critic.position,
          }
        : null,
    };
  });

  return (
    <TeacherEvaluationsClient
      teacherName={`${teacher.first_name} ${teacher.last_name}`}
      rows={rows}
    />
  );
}
