import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TeacherEvaluationsClient } from "@/components/teacher/teacher-evaluations-client";

export const dynamic = "force-dynamic";

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
    console.error("Assignments error:", JSON.stringify(assignmentsError, null, 2));
  }

  const safeAssignments = assignments ?? [];

  const studentIds = [...new Set(safeAssignments.map((a) => a.student_id))];
  const officeIds = [...new Set(safeAssignments.map((a) => a.office_id))];
  const assignmentIds = safeAssignments.map((a) => a.id);

  const [
    { data: students, error: studentsError },
    { data: offices, error: officesError },
    { data: evaluations, error: evaluationsError },
  ] = await Promise.all([
    studentIds.length > 0
      ? supabase
          .from("students")
          .select(
            "id, student_number, first_name, middle_name, last_name, required_hours, completed_hours, status"
          )
          .in("id", studentIds)
      : Promise.resolve({ data: [], error: null }),

    officeIds.length > 0
      ? supabase.from("offices").select("id, name").in("id", officeIds)
      : Promise.resolve({ data: [], error: null }),

    assignmentIds.length > 0
      ? supabase
          .from("evaluations")
          .select("*")
          .in("assignment_id", assignmentIds)
          .order("submitted_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (studentsError) console.error("Students error:", JSON.stringify(studentsError, null, 2));
  if (officesError) console.error("Offices error:", JSON.stringify(officesError, null, 2));
  if (evaluationsError) console.error("Evaluations error:", JSON.stringify(evaluationsError, null, 2));

  const criticIds = [...new Set((evaluations ?? []).map((e) => e.critic_id))];

  const { data: critics, error: criticsError } =
    criticIds.length > 0
      ? await supabase
          .from("critics")
          .select("id, first_name, last_name, email, position, office_id")
          .in("id", criticIds)
      : { data: [], error: null };

  if (criticsError) console.error("Critics error:", JSON.stringify(criticsError, null, 2));

  const studentsById = new Map((students ?? []).map((s) => [s.id, s]));
  const officesById = new Map((offices ?? []).map((o) => [o.id, o]));
  const evaluationsByAssignmentId = new Map(
    (evaluations ?? []).map((e) => [e.assignment_id, e])
  );
  const criticsById = new Map((critics ?? []).map((c) => [c.id, c]));

  const rows = safeAssignments.map((assignment) => {
    const student = studentsById.get(assignment.student_id);
    const office = officesById.get(assignment.office_id);
    const evaluation = evaluationsByAssignmentId.get(assignment.id);
    const critic = evaluation ? criticsById.get(evaluation.critic_id) : null;

    return {
      assignment,
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
      evaluation: evaluation ?? null,
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