import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TeacherAttendanceCalendar } from "@/components/teacher/teacher-attendance-calendar";

export const dynamic = "force-dynamic";

export default async function TeacherAttendancePage() {
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
    .select("id, student_id, teacher_id, office_id, status")
    .eq("teacher_id", teacher.id)
    .in("status", ["active", "pending"])
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
    { data: attendanceLogs, error: attendanceError },
  ] = await Promise.all([
    studentIds.length > 0
      ? supabase
          .from("students")
          .select("id, first_name, last_name, student_number")
          .in("id", studentIds)
      : Promise.resolve({ data: [], error: null }),

    officeIds.length > 0
      ? supabase
          .from("offices")
          .select("id, name")
          .in("id", officeIds)
      : Promise.resolve({ data: [], error: null }),

    assignmentIds.length > 0
      ? supabase
          .from("attendance_days")
          .select("*")
          .in("assignment_id", assignmentIds)
          .order("attendance_date", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (studentsError) {
    console.error("Students error:", JSON.stringify(studentsError, null, 2));
  }

  if (officesError) {
    console.error("Offices error:", JSON.stringify(officesError, null, 2));
  }

  if (attendanceError) {
    console.error("Attendance error:", JSON.stringify(attendanceError, null, 2));
  }

  const studentsById = new Map((students ?? []).map((student) => [student.id, student]));
  const officesById = new Map((offices ?? []).map((office) => [office.id, office]));

  const normalizedStudents = safeAssignments.map((assignment) => {
    const student = studentsById.get(assignment.student_id);
    const office = officesById.get(assignment.office_id);

    return {
      id: assignment.student_id,
      first_name: student?.first_name ?? "Unknown",
      last_name: student?.last_name ?? "Student",
      student_no: student?.student_number ?? null,
      office_name: office?.name ?? "No office assigned",
      assignment_id: assignment.id,
      office_id: assignment.office_id,
      assignment_status: assignment.status,
    };
  });

  return (
    <TeacherAttendanceCalendar
      teacherName={`${teacher.first_name} ${teacher.last_name}`}
      students={normalizedStudents}
      attendanceLogs={attendanceLogs ?? []}
    />
  );
}