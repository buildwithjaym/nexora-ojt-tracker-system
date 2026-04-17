import {
  Activity,
  BookOpen,
  CheckCircle2,
  Users,
} from "lucide-react";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { TeacherDashboardCharts } from "@/components/teacher/dashboard-charts";

type AssignmentStatus = "pending" | "active" | "completed" | "cancelled";
type StudentStatus = "active" | "completed" | "inactive" | "dropped";

type BatchRow = {
  id: string;
  name: string;
  code: string;
  course: string;
} | null;

type StudentRow = {
  id: string;
  student_number: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix: string | null;
  required_hours: number;
  completed_hours: number;
  status: StudentStatus;
  batch: BatchRow | BatchRow[] | null;
} | null;

type OfficeRow = {
  id: string;
  name: string;
  status: "active" | "inactive";
} | null;

type AssignmentRow = {
  id: string;
  status: AssignmentStatus;
  assigned_hours: number | null;
  start_date: string | null;
  end_date: string | null;
  remarks: string | null;
  created_at: string;
  student: StudentRow | StudentRow[] | null;
  office: OfficeRow | OfficeRow[] | null;
};

type NormalizedStudent = {
  id: string;
  student_number: string;
  full_name: string;
  required_hours: number;
  completed_hours: number;
  remaining_hours: number;
  progress_percent: number;
  status: StudentStatus;
  batch_name: string;
  batch_code: string;
  batch_course: string;
};

type NormalizedAssignment = {
  id: string;
  status: AssignmentStatus;
  assigned_hours: number | null;
  start_date: string | null;
  end_date: string | null;
  remarks: string | null;
  created_at: string;
  office_name: string;
  office_status: "active" | "inactive" | "unknown";
  student: NormalizedStudent | null;
};

function pickFirst<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function formatFullName(params: {
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  suffix?: string | null;
}) {
  const middleInitial = params.middle_name?.trim()
    ? `${params.middle_name.trim().charAt(0)}.`
    : "";

  return [
    params.first_name?.trim(),
    middleInitial,
    params.last_name?.trim(),
    params.suffix?.trim(),
  ]
    .filter(Boolean)
    .join(" ");
}

function clampProgress(completed: number, required: number) {
  if (!required || required <= 0) return 0;
  const raw = (completed / required) * 100;
  return Math.max(0, Math.min(100, raw));
}

function roundTo(value: number, decimals = 1) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {value}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">{description}</p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function ErrorState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="rounded-3xl border border-destructive/30 bg-destructive/10 p-6">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function EmptyState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export default async function TeacherDashboardPage() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Components cannot always set cookies directly.
          }
        },
      },
    }
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return (
      <ErrorState
        title="Unable to load dashboard"
        message="Your session could not be verified. Please sign in again."
      />
    );
  }

  const { data: teacher, error: teacherError } = await supabase
    .from("teachers")
    .select(
      "id, first_name, middle_name, last_name, suffix, department, status, profile_id"
    )
    .eq("profile_id", user.id)
    .maybeSingle();

  if (teacherError) {
    return (
      <ErrorState
        title="Unable to load teacher profile"
        message={teacherError.message}
      />
    );
  }

  if (!teacher) {
    return (
      <EmptyState
        title="Teacher account not found"
        message="Your login is active, but no matching teacher record was found for this profile yet."
      />
    );
  }

  const { data: assignmentsData, error: assignmentsError } = await supabase
    .from("assignments")
    .select(
      `
        id,
        status,
        assigned_hours,
        start_date,
        end_date,
        remarks,
        created_at,
        student:students(
          id,
          student_number,
          first_name,
          middle_name,
          last_name,
          suffix,
          required_hours,
          completed_hours,
          status,
          batch:batches(
            id,
            name,
            code,
            course
          )
        ),
        office:offices(
          id,
          name,
          status
        )
      `
    )
    .eq("teacher_id", teacher.id)
    .order("created_at", { ascending: false });

  if (assignmentsError) {
    return (
      <ErrorState
        title="Unable to load dashboard data"
        message={assignmentsError.message}
      />
    );
  }

  const assignments: NormalizedAssignment[] = (assignmentsData ?? []).map(
    (assignment) => {
      const row = assignment as unknown as AssignmentRow;

      const studentRaw = pickFirst(row.student);
      const officeRaw = pickFirst(row.office);
      const batchRaw = pickFirst(studentRaw?.batch ?? null);

      const normalizedStudent: NormalizedStudent | null = studentRaw
        ? {
            id: studentRaw.id,
            student_number: studentRaw.student_number,
            full_name: formatFullName({
              first_name: studentRaw.first_name,
              middle_name: studentRaw.middle_name,
              last_name: studentRaw.last_name,
              suffix: studentRaw.suffix,
            }),
            required_hours: studentRaw.required_hours,
            completed_hours: studentRaw.completed_hours,
            remaining_hours: Math.max(
              0,
              studentRaw.required_hours - studentRaw.completed_hours
            ),
            progress_percent: clampProgress(
              studentRaw.completed_hours,
              studentRaw.required_hours
            ),
            status: studentRaw.status,
            batch_name: batchRaw?.name ?? "Unassigned Batch",
            batch_code: batchRaw?.code ?? "N/A",
            batch_course: batchRaw?.course ?? "N/A",
          }
        : null;

      return {
        id: row.id,
        status: row.status,
        assigned_hours: row.assigned_hours,
        start_date: row.start_date,
        end_date: row.end_date,
        remarks: row.remarks,
        created_at: row.created_at,
        office_name: officeRaw?.name ?? "Unknown Office",
        office_status: officeRaw?.status ?? "unknown",
        student: normalizedStudent,
      };
    }
  );

  const uniqueStudentsMap = new Map<string, NormalizedStudent>();

  for (const assignment of assignments) {
    if (assignment.student) {
      uniqueStudentsMap.set(assignment.student.id, assignment.student);
    }
  }

  const uniqueStudents = Array.from(uniqueStudentsMap.values());

  const totalAssignedStudents = uniqueStudents.length;
  const activeAssignments = assignments.filter(
    (assignment) => assignment.status === "active"
  ).length;

  const totalCompletedHours = uniqueStudents.reduce(
    (sum, student) => sum + student.completed_hours,
    0
  );

  const averageStudentProgress = uniqueStudents.length
    ? roundTo(
        uniqueStudents.reduce(
          (sum, student) => sum + student.progress_percent,
          0
        ) / uniqueStudents.length,
        1
      )
    : 0;

  const assignmentStatusData = [
    {
      name: "Pending",
      value: assignments.filter((item) => item.status === "pending").length,
    },
    {
      name: "Active",
      value: assignments.filter((item) => item.status === "active").length,
    },
    {
      name: "Completed",
      value: assignments.filter((item) => item.status === "completed").length,
    },
    {
      name: "Cancelled",
      value: assignments.filter((item) => item.status === "cancelled").length,
    },
  ];

  const progressDistributionData = [
    {
      name: "0–24%",
      value: uniqueStudents.filter((student) => student.progress_percent < 25)
        .length,
    },
    {
      name: "25–49%",
      value: uniqueStudents.filter(
        (student) =>
          student.progress_percent >= 25 && student.progress_percent < 50
      ).length,
    },
    {
      name: "50–74%",
      value: uniqueStudents.filter(
        (student) =>
          student.progress_percent >= 50 && student.progress_percent < 75
      ).length,
    },
    {
      name: "75–99%",
      value: uniqueStudents.filter(
        (student) =>
          student.progress_percent >= 75 && student.progress_percent < 100
      ).length,
    },
    {
      name: "100%",
      value: uniqueStudents.filter((student) => student.progress_percent >= 100)
        .length,
    },
  ];

  const batchCounts = new Map<string, number>();

  for (const student of uniqueStudents) {
    batchCounts.set(
      student.batch_name,
      (batchCounts.get(student.batch_name) ?? 0) + 1
    );
  }

  const studentsByBatchData = Array.from(batchCounts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const teacherName = formatFullName({
    first_name: teacher.first_name,
    middle_name: teacher.middle_name,
    last_name: teacher.last_name,
    suffix: teacher.suffix,
  });

  const topStudents = [...uniqueStudents]
    .sort((a, b) => b.progress_percent - a.progress_percent)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Teacher Dashboard</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Welcome back, {teacherName}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Monitor your assigned students, track internship progress, and
              review assignment activity in one place.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-background px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Department
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {teacher.department?.trim() || "Not set"}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Assigned Students"
          value={String(totalAssignedStudents)}
          description="Unique students assigned to you."
          icon={Users}
        />
        <StatCard
          title="Average Student Progress"
          value={`${averageStudentProgress}%`}
          description="Average completion rate based on completed and required hours."
          icon={Activity}
        />
        <StatCard
          title="Total Completed Hours"
          value={String(totalCompletedHours)}
          description="Combined completed hours of your assigned students."
          icon={CheckCircle2}
        />
        <StatCard
          title="Active Assignments"
          value={String(activeAssignments)}
          description="Assignments currently active under your supervision."
          icon={BookOpen}
        />
      </section>

      <TeacherDashboardCharts
        assignmentStatusData={assignmentStatusData}
        progressDistributionData={progressDistributionData}
        studentsByBatchData={studentsByBatchData}
      />

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Top Student Progress
            </h2>
            <p className="text-sm text-muted-foreground">
              Highest-performing assigned students based on completion percentage.
            </p>
          </div>

          {topStudents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-background px-4 py-10 text-center text-sm text-muted-foreground">
              No assigned students found yet.
            </div>
          ) : (
            <div className="space-y-3">
              {topStudents.map((student) => (
                <div
                  key={student.id}
                  className="rounded-2xl border border-border bg-background px-4 py-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {student.full_name}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {student.student_number} • {student.batch_name}
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="text-sm font-semibold text-foreground">
                        {roundTo(student.progress_percent, 1)}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {student.completed_hours} / {student.required_hours} hours
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{
                        width: `${Math.min(student.progress_percent, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Assignment Summary
            </h2>
            <p className="text-sm text-muted-foreground">
              Snapshot of your teacher-scoped assignment workload.
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                label: "Pending Assignments",
                value:
                  assignmentStatusData.find((item) => item.name === "Pending")
                    ?.value ?? 0,
              },
              {
                label: "Completed Assignments",
                value:
                  assignmentStatusData.find((item) => item.name === "Completed")
                    ?.value ?? 0,
              },
              {
                label: "Cancelled Assignments",
                value:
                  assignmentStatusData.find((item) => item.name === "Cancelled")
                    ?.value ?? 0,
              },
              {
                label: "Students at 100%",
                value:
                  progressDistributionData.find((item) => item.name === "100%")
                    ?.value ?? 0,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-3"
              >
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className="text-sm font-semibold text-foreground">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}