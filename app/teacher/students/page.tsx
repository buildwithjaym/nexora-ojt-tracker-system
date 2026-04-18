import Link from "next/link";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { ChevronLeft, ChevronRight, Trophy, Users } from "lucide-react";

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
  status: "pending" | "active" | "completed" | "cancelled";
  student: StudentRow | StudentRow[] | null;
  office: OfficeRow | OfficeRow[] | null;
};

type StudentRecord = {
  id: string;
  student_name: string;
  family_name: string;
  first_name: string;
  middle_name: string | null;
  student_number: string;
  batch_name: string;
  batch_code: string;
  office_name: string;
  completed_hours: number;
  required_hours: number;
  remaining_hours: number;
  progress_percent: number;
  status: StudentStatus;
};

const PAGE_SIZE = 10;

function pickFirst<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function formatStudentName(params: {
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  suffix?: string | null;
}) {
  const firstName = params.first_name?.trim() ?? "";
  const lastName = params.last_name?.trim() ?? "";
  const middleInitial = params.middle_name?.trim()
    ? `${params.middle_name.trim().charAt(0)}.`
    : "";
  const suffix = params.suffix?.trim() ? ` ${params.suffix.trim()}` : "";

  return `${lastName}, ${firstName}${middleInitial ? ` ${middleInitial}` : ""}${suffix}`;
}

function getProgress(completed: number, required: number) {
  if (!required || required <= 0) return 0;
  return Math.max(0, Math.min(100, (completed / required) * 100));
}

function roundTo(value: number, decimals = 1) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function getStatusClass(status: StudentStatus) {
  switch (status) {
    case "active":
      return "bg-primary/10 text-primary ring-1 ring-primary/20";
    case "completed":
      return "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20";
    case "inactive":
      return "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20";
    case "dropped":
      return "bg-destructive/10 text-destructive ring-1 ring-destructive/20";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function EmptyState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-4 sm:p-5 lg:p-6">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{message}</p>
    </div>
  );
}

function TopStudentCard({
  student,
  rank,
}: {
  student: StudentRecord;
  rank: number;
}) {
  const progress = Math.min(student.progress_percent, 100);

  return (
    <div className="student-card group relative overflow-hidden rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-5 lg:p-4 xl:p-5">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative flex flex-col gap-4 min-[430px]:flex-row min-[430px]:items-start min-[430px]:justify-between">
        <div className="min-w-0 flex-1">
          <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary ring-1 ring-primary/15">
            <Trophy className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Top {rank}</span>
          </div>

          <h3 className="mt-4 break-words text-lg font-semibold tracking-tight text-foreground sm:text-xl lg:text-[1.35rem] xl:text-[1.5rem] xl:leading-tight">
            {student.student_name}
          </h3>

          <p className="mt-2 break-words text-sm text-muted-foreground sm:text-base lg:text-[0.95rem]">
            {student.student_number} • {student.batch_name}
          </p>

          <p className="mt-1 break-words text-xs text-muted-foreground sm:text-sm lg:text-[0.9rem]">
            Office: {student.office_name}
          </p>
        </div>

        <div className="relative mx-auto flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full bg-background min-[430px]:mx-0 sm:h-20 sm:w-20 lg:h-[76px] lg:w-[76px] xl:h-[88px] xl:w-[88px]">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(hsl(var(--primary)) ${progress * 3.6}deg, hsl(var(--muted)) 0deg)`,
            }}
          />
          <div className="absolute inset-[8px] rounded-full bg-card sm:inset-[9px] xl:inset-[10px]" />
          <div className="relative text-center">
            <p className="text-base font-semibold text-foreground sm:text-lg xl:text-xl">
              {roundTo(progress, 0)}%
            </p>
            <p className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground sm:text-[10px]">
              Progress
            </p>
          </div>
        </div>
      </div>

      <div className="relative mt-5">
        <div className="mb-2 flex flex-col gap-1 text-xs text-muted-foreground min-[390px]:flex-row min-[390px]:items-center min-[390px]:justify-between sm:text-sm">
          <span>Completed Hours</span>
          <span className="shrink-0">
            {student.completed_hours} / {student.required_hours}
          </span>
        </div>

        <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mt-3 flex flex-col gap-2 text-xs min-[500px]:flex-row min-[500px]:items-center min-[500px]:justify-between sm:text-sm">
          <span className="text-muted-foreground">
            Remaining:{" "}
            <span className="font-semibold text-foreground">
              {student.remaining_hours} hrs
            </span>
          </span>

          <span
            className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium capitalize sm:text-sm ${getStatusClass(
              student.status
            )}`}
          >
            {student.status}
          </span>
        </div>
      </div>
    </div>
  );
}

function StudentCard({ student }: { student: StudentRecord }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="break-words text-base font-semibold text-foreground">
            {student.student_name}
          </p>
          <p className="mt-1 break-words text-sm text-muted-foreground">
            {student.student_number} • {student.batch_name}
          </p>
          <p className="mt-1 break-words text-xs text-muted-foreground sm:text-sm">
            Office: {student.office_name}
          </p>
        </div>

        <span
          className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium capitalize ${getStatusClass(
            student.status
          )}`}
        >
          {student.status}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border/70 bg-card px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            Family Name
          </p>
          <p className="mt-1 break-words text-sm font-medium text-foreground">
            {student.family_name}
          </p>
        </div>

        <div className="rounded-xl border border-border/70 bg-card px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            First Name
          </p>
          <p className="mt-1 break-words text-sm font-medium text-foreground">
            {student.first_name}
          </p>
        </div>

        <div className="rounded-xl border border-border/70 bg-card px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            Middle Name
          </p>
          <p className="mt-1 break-words text-sm font-medium text-foreground">
            {student.middle_name || "—"}
          </p>
        </div>

        <div className="rounded-xl border border-border/70 bg-card px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            Remaining Hours
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">
            {student.remaining_hours}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium text-foreground">
            {roundTo(student.progress_percent, 1)}%
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-700 ease-out"
            style={{ width: `${Math.min(student.progress_percent, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default async function TeacherStudentsPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string }>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const currentPage = Math.max(1, Number(resolvedSearchParams.page || "1") || 1);

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
            // no-op
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <EmptyState
        title="Unable to load students"
        message="Your session could not be verified. Please sign in again."
      />
    );
  }

  const { data: teacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!teacher) {
    return (
      <EmptyState
        title="Teacher account not found"
        message="No matching teacher record was found for this account."
      />
    );
  }

  const { data: assignmentsData, error } = await supabase
    .from("assignments")
    .select(
      `
        id,
        status,
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

  if (error) {
    return (
      <EmptyState
        title="Unable to load students"
        message={error.message}
      />
    );
  }

  const studentMap = new Map<string, StudentRecord>();

  for (const item of (assignmentsData ?? []) as AssignmentRow[]) {
    const studentRaw = pickFirst(item.student);
    const officeRaw = pickFirst(item.office);
    const batchRaw = pickFirst(studentRaw?.batch ?? null);

    if (!studentRaw) continue;

    const progressPercent = getProgress(
      studentRaw.completed_hours,
      studentRaw.required_hours
    );

    studentMap.set(studentRaw.id, {
      id: studentRaw.id,
      student_name: formatStudentName({
        first_name: studentRaw.first_name,
        middle_name: studentRaw.middle_name,
        last_name: studentRaw.last_name,
        suffix: studentRaw.suffix,
      }),
      family_name: studentRaw.last_name,
      first_name: studentRaw.first_name,
      middle_name: studentRaw.middle_name,
      student_number: studentRaw.student_number,
      batch_name: batchRaw?.name ?? "Unassigned Batch",
      batch_code: batchRaw?.code ?? "N/A",
      office_name: officeRaw?.name ?? "Unknown Office",
      completed_hours: studentRaw.completed_hours,
      required_hours: studentRaw.required_hours,
      remaining_hours: Math.max(
        0,
        studentRaw.required_hours - studentRaw.completed_hours
      ),
      progress_percent: progressPercent,
      status: studentRaw.status,
    });
  }

  const students = Array.from(studentMap.values()).sort((a, b) => {
    if (b.progress_percent !== a.progress_percent) {
      return b.progress_percent - a.progress_percent;
    }

    return a.student_name.localeCompare(b.student_name);
  });

  const topStudents = students.slice(0, 3);

  const totalPages = Math.max(1, Math.ceil(students.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const paginatedStudents = students.slice(startIndex, startIndex + PAGE_SIZE);

  const startRow = students.length === 0 ? 0 : startIndex + 1;
  const endRow = Math.min(startIndex + PAGE_SIZE, students.length);

  return (
    <div className="space-y-5 lg:space-y-6">
      <section className="fade-up rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-5 lg:p-6 xl:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-primary">Teacher Students</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl lg:text-[2.2rem] xl:text-[2.45rem]">
              Assigned Students
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Monitor the progress, remaining hours, and current status of
              students assigned to you.
            </p>
          </div>

          <div className="inline-flex w-full items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 transition-all duration-300 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 sm:w-fit lg:min-w-[220px] lg:justify-start lg:self-start">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15 lg:h-12 lg:w-12">
              <Users className="h-5 w-5" />
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Total Students
              </p>
              <p className="text-sm font-semibold text-foreground lg:text-base">
                {students.length}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {topStudents.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
            No assigned students found yet.
          </div>
        ) : (
          topStudents.map((student, index) => (
            <TopStudentCard
              key={student.id}
              student={student}
              rank={index + 1}
            />
          ))
        )}
      </section>

      <section className="fade-up-delayed overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:px-5 sm:py-5 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              Students Table
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Read-only list of students assigned to you.
            </p>
          </div>

          <div className="text-sm text-muted-foreground lg:text-right">
            Showing{" "}
            <span className="font-medium text-foreground">{startRow}</span>
            {" "}to{" "}
            <span className="font-medium text-foreground">{endRow}</span>
            {" "}of{" "}
            <span className="font-medium text-foreground">{students.length}</span>
          </div>
        </div>

        {students.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-muted-foreground">
            No student records available.
          </div>
        ) : (
          <>
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full min-w-[1000px] text-sm xl:min-w-[1080px]">
                <thead className="bg-background/60">
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-3.5 font-medium text-muted-foreground xl:px-5">
                      Student Name
                    </th>
                    <th className="px-4 py-3.5 font-medium text-muted-foreground xl:px-5">
                      Family Name
                    </th>
                    <th className="px-4 py-3.5 font-medium text-muted-foreground xl:px-5">
                      First Name
                    </th>
                    <th className="px-4 py-3.5 font-medium text-muted-foreground xl:px-5">
                      Middle Name
                    </th>
                    <th className="px-4 py-3.5 font-medium text-muted-foreground xl:px-5">
                      Student No.
                    </th>
                    <th className="px-4 py-3.5 font-medium text-muted-foreground xl:px-5">
                      Batch
                    </th>
                    <th className="px-4 py-3.5 font-medium text-muted-foreground xl:px-5">
                      Office
                    </th>
                    <th className="px-4 py-3.5 font-medium text-muted-foreground xl:px-5">
                      Remaining
                    </th>
                    <th className="px-4 py-3.5 font-medium text-muted-foreground xl:px-5">
                      Progress
                    </th>
                    <th className="px-4 py-3.5 font-medium text-muted-foreground xl:px-5">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedStudents.map((student, index) => (
                    <tr
                      key={student.id}
                      className="table-row-animate border-b border-border/70 transition hover:bg-muted/30"
                      style={{ animationDelay: `${index * 70}ms` }}
                    >
                      <td className="px-4 py-3.5 xl:px-5">
                        <p className="max-w-[190px] break-words font-medium leading-6 text-foreground xl:max-w-[220px]">
                          {student.student_name}
                        </p>
                      </td>

                      <td className="px-4 py-3.5 text-muted-foreground xl:px-5">
                        <p className="max-w-[120px] break-words leading-6 xl:max-w-[135px]">
                          {student.family_name}
                        </p>
                      </td>

                      <td className="px-4 py-3.5 text-muted-foreground xl:px-5">
                        <p className="max-w-[120px] break-words leading-6 xl:max-w-[135px]">
                          {student.first_name}
                        </p>
                      </td>

                      <td className="px-4 py-3.5 text-muted-foreground xl:px-5">
                        <p className="max-w-[100px] break-words leading-6 xl:max-w-[115px]">
                          {student.middle_name || "—"}
                        </p>
                      </td>

                      <td className="px-4 py-3.5 text-muted-foreground xl:px-5">
                        {student.student_number}
                      </td>

                      <td className="px-4 py-3.5 text-muted-foreground xl:px-5">
                        <p className="max-w-[130px] break-words leading-6 xl:max-w-[150px]">
                          {student.batch_name}
                        </p>
                      </td>

                      <td className="px-4 py-3.5 text-muted-foreground xl:px-5">
                        <p className="max-w-[165px] break-words leading-6 xl:max-w-[185px]">
                          {student.office_name}
                        </p>
                      </td>

                      <td className="px-4 py-3.5 text-foreground xl:px-5">
                        {student.remaining_hours}
                      </td>

                      <td className="px-4 py-3.5 xl:px-5">
                        <div className="min-w-[150px] xl:min-w-[165px]">
                          <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium text-foreground">
                              {roundTo(student.progress_percent, 1)}%
                            </span>
                          </div>
                          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-700 ease-out"
                              style={{
                                width: `${Math.min(student.progress_percent, 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 xl:px-5">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium capitalize ${getStatusClass(
                            student.status
                          )}`}
                        >
                          {student.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-4 p-4 sm:p-5 lg:hidden">
              {paginatedStudents.map((student, index) => (
                <div
                  key={student.id}
                  className="table-row-animate"
                  style={{ animationDelay: `${index * 70}ms` }}
                >
                  <StudentCard student={student} />
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 border-t border-border px-4 py-4 sm:px-5 sm:flex-row sm:items-center sm:justify-between lg:px-6">
              <div className="text-sm text-muted-foreground">
                Page{" "}
                <span className="font-medium text-foreground">{safePage}</span>
                {" "}of{" "}
                <span className="font-medium text-foreground">{totalPages}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                <Link
                  href={`/teacher/students?page=${Math.max(1, safePage - 1)}`}
                  aria-disabled={safePage === 1}
                  className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium transition-all duration-200 ${
                    safePage === 1
                      ? "pointer-events-none border-border bg-background text-muted-foreground opacity-50"
                      : "border-border bg-background text-foreground hover:border-primary/30 hover:bg-muted"
                  }`}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Link>

                <Link
                  href={`/teacher/students?page=${Math.min(totalPages, safePage + 1)}`}
                  aria-disabled={safePage === totalPages}
                  className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium transition-all duration-200 ${
                    safePage === totalPages
                      ? "pointer-events-none border-border bg-background text-muted-foreground opacity-50"
                      : "border-border bg-background text-foreground hover:border-primary/30 hover:bg-muted"
                  }`}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </>
        )}
      </section>

      <style>{`
        .fade-up {
          animation: fadeUp 0.45s ease-out forwards;
        }

        .fade-up-delayed {
          animation: fadeUp 0.55s ease-out forwards;
        }

        .student-card {
          animation: fadeUp 0.55s ease-out forwards;
        }

        .table-row-animate {
          opacity: 0;
          animation: rowIn 0.45s ease-out forwards;
        }

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes rowIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
