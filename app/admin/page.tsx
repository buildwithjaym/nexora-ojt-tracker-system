import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  ClipboardList,
  GraduationCap,
  Layers3,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

function getStudentStatus(progress: number) {
  if (progress >= 100) return "Completed";
  if (progress >= 90) return "Almost Complete";
  return "On Track";
}

function statusClasses(status: string) {
  switch (status) {
    case "Completed":
      return "border-emerald-500/20 bg-emerald-500/15 text-emerald-400";
    case "Almost Complete":
      return "border-yellow-500/20 bg-yellow-500/15 text-yellow-400";
    default:
      return "border-border bg-secondary text-secondary-foreground";
  }
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [
    studentsCountRes,
    teachersCountRes,
    officesCountRes,
    batchesCountRes,
    assignmentsCountRes,
    almostFinishedRes,
    recentAssignmentsRes,
  ] = await Promise.all([
    supabase.from("students").select("id", { count: "exact", head: true }),
    supabase.from("teachers").select("id", { count: "exact", head: true }),
    supabase.from("offices").select("id", { count: "exact", head: true }),
    supabase.from("batches").select("id", { count: "exact", head: true }),
    supabase.from("assignments").select("id", { count: "exact", head: true }),

    supabase
      .from("students")
      .select(
        `
        id,
        first_name,
        middle_name,
        last_name,
        suffix,
        required_hours,
        completed_hours,
        status,
        batches:batch_id (
          id,
          name,
          course
        )
      `
      )
      .neq("status", "completed")
      .order("completed_hours", { ascending: false })
      .limit(10),

    supabase
      .from("assignments")
      .select(
        `
        id,
        status,
        created_at,
        students:student_id (
          id,
          first_name,
          last_name
        ),
        teachers:teacher_id (
          id,
          first_name,
          last_name
        ),
        offices:office_id (
          id,
          name
        )
      `
      )
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const stats = [
    {
      title: "Students",
      value: studentsCountRes.count ?? 0,
      note: "Total records",
      icon: Users,
    },
    {
      title: "Teachers",
      value: teachersCountRes.count ?? 0,
      note: "Active supervisors",
      icon: GraduationCap,
    },
    {
      title: "Offices",
      value: officesCountRes.count ?? 0,
      note: "Partner offices",
      icon: Building2,
    },
    {
      title: "Batches",
      value: batchesCountRes.count ?? 0,
      note: "Configured batches",
      icon: Layers3,
    },
    {
      title: "Assignments",
      value: assignmentsCountRes.count ?? 0,
      note: "All records",
      icon: ClipboardList,
    },
  ];

  const almostFinishedStudents = almostFinishedRes.data ?? [];
  const recentAssignments = recentAssignmentsRes.data ?? [];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.title}
              className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5"
            >
              <div className="flex items-start justify-between">
                <div className="rounded-xl bg-primary/10 p-3 text-primary ring-1 ring-primary/20">
                  <Icon className="h-5 w-5" />
                </div>

                <div className="flex items-center gap-1 text-xs text-accent">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  Live
                </div>
              </div>

              <p className="mt-4 text-sm text-muted-foreground">{stat.title}</p>
              <p className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                {stat.value}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{stat.note}</p>
            </div>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Students Near Completion
              </p>
              <h3 className="text-lg font-semibold">Almost Finished OJT</h3>
            </div>

            <Link
              href="/admin/students"
              className="inline-flex items-center justify-center rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium transition hover:bg-secondary"
            >
              View All
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="pb-4 font-medium">Student</th>
                  <th className="pb-4 font-medium">Batch</th>
                  <th className="pb-4 font-medium">Course</th>
                  <th className="pb-4 font-medium">Progress</th>
                  <th className="pb-4 font-medium">Remaining</th>
                  <th className="pb-4 font-medium">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {almostFinishedStudents.map((student: any) => {
                  const batch = Array.isArray(student.batches)
                    ? student.batches[0]
                    : student.batches;

                  const fullName = [
                    student.first_name,
                    student.middle_name,
                    student.last_name,
                    student.suffix,
                  ]
                    .filter(Boolean)
                    .join(" ");

                  const requiredHours = Number(student.required_hours ?? 0);
                  const completedHours = Number(student.completed_hours ?? 0);

                  const progress =
                    requiredHours > 0
                      ? Math.round((completedHours / requiredHours) * 100)
                      : 0;

                  const remaining = Math.max(requiredHours - completedHours, 0);
                  const computedStatus = getStudentStatus(progress);

                  return (
                    <tr key={student.id}>
                      <td className="py-4 text-sm font-medium">{fullName}</td>
                      <td className="py-4 text-sm text-muted-foreground">
                        {batch?.name ?? "-"}
                      </td>
                      <td className="py-4 text-sm text-muted-foreground">
                        {batch?.course ?? "-"}
                      </td>
                      <td className="py-4 text-sm text-muted-foreground">
                        {completedHours} / {requiredHours} hrs
                      </td>
                      <td className="py-4 text-sm font-medium text-foreground">
                        {remaining} hrs
                      </td>
                      <td className="py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusClasses(
                            computedStatus
                          )}`}
                        >
                          {computedStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {almostFinishedStudents.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      No student records found yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">Latest Activity</p>
            <h3 className="text-lg font-semibold">Recent Assignments</h3>
          </div>

          <div className="space-y-3">
            {recentAssignments.map((assignment: any) => {
              const student = Array.isArray(assignment.students)
                ? assignment.students[0]
                : assignment.students;

              const teacher = Array.isArray(assignment.teachers)
                ? assignment.teachers[0]
                : assignment.teachers;

              const office = Array.isArray(assignment.offices)
                ? assignment.offices[0]
                : assignment.offices;

              const studentName = [student?.first_name, student?.last_name]
                .filter(Boolean)
                .join(" ");

              const teacherName = [teacher?.first_name, teacher?.last_name]
                .filter(Boolean)
                .join(" ");

              return (
                <div
                  key={assignment.id}
                  className="rounded-xl border border-border p-4"
                >
                  <p className="text-sm font-medium">
                    {studentName || "Unknown Student"}
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {office?.name ?? "No Office"}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>Teacher: {teacherName || "-"}</span>
                    <span>•</span>
                    <span className="capitalize">{assignment.status}</span>
                  </div>
                </div>
              );
            })}

            {recentAssignments.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No assignment records found yet.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}