import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import {
  FileSpreadsheet,
  Files,
  Search,
  TrendingUp,
  Users,
} from "lucide-react";
import { ExportReportsButton } from "@/components/teacher/export-reports-button";

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
  start_date: string | null;
  end_date: string | null;
  assigned_hours: number | null;
  remarks: string | null;
  created_at: string;
  student: StudentRow | StudentRow[] | null;
  office: OfficeRow | OfficeRow[] | null;
};

type ReportRow = {
  id: string;
  student_name: string;
  family_name: string;
  first_name: string;
  middle_name: string | null;
  student_number: string;
  batch_name: string;
  office_name: string;
  assignment_status: AssignmentStatus;
  completed_hours: number;
  required_hours: number;
  remaining_hours: number;
  progress_percent: number;
  start_date: string | null;
  end_date: string | null;
  assigned_hours: number | null;
  remarks: string | null;
};

type PageProps = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
  }>;
};

const STATUS_OPTIONS: Array<"all" | AssignmentStatus> = [
  "all",
  "pending",
  "active",
  "completed",
  "cancelled",
];

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

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getStatusClass(status: AssignmentStatus) {
  switch (status) {
    case "pending":
      return "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20";
    case "active":
      return "bg-primary/10 text-primary ring-1 ring-primary/20";
    case "completed":
      return "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20";
    case "cancelled":
      return "bg-destructive/10 text-destructive ring-1 ring-destructive/20";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function SummaryCard({
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
    <div className="report-card group rounded-3xl border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {value}
          </p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15 transition-transform duration-300 group-hover:scale-105">
          <Icon className="h-5 w-5" />
        </div>
      </div>
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

export default async function TeacherReportsPage({
  searchParams,
}: PageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const searchQuery = (resolvedSearchParams.q || "").trim().toLowerCase();
  const selectedStatus = STATUS_OPTIONS.includes(
    (resolvedSearchParams.status as "all" | AssignmentStatus) || "all"
  )
    ? ((resolvedSearchParams.status as "all" | AssignmentStatus) || "all")
    : "all";

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
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    redirect("/login");
  }

  const { data: teacher, error: teacherError } = await supabase
    .from("teachers")
    .select("id")
    .eq("profile_id", session.user.id)
    .maybeSingle();

  if (teacherError || !teacher) {
    redirect("/login");
  }

  const { data: assignmentsData, error } = await supabase
    .from("assignments")
    .select(
      `
        id,
        status,
        start_date,
        end_date,
        assigned_hours,
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
    .eq("teacher_id", teacher.id);

  if (error) {
    return (
      <EmptyState
        title="Unable to load reports"
        message={error.message}
      />
    );
  }

  const rows: ReportRow[] = ((assignmentsData ?? []) as AssignmentRow[])
    .map((item) => {
      const studentRaw = pickFirst(item.student);
      const officeRaw = pickFirst(item.office);
      const batchRaw = pickFirst(studentRaw?.batch ?? null);

      if (!studentRaw) return null;

      return {
        id: item.id,
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
        office_name: officeRaw?.name ?? "Unknown Office",
        assignment_status: item.status,
        completed_hours: studentRaw.completed_hours,
        required_hours: studentRaw.required_hours,
        remaining_hours: Math.max(
          0,
          studentRaw.required_hours - studentRaw.completed_hours
        ),
        progress_percent: getProgress(
          studentRaw.completed_hours,
          studentRaw.required_hours
        ),
        start_date: item.start_date,
        end_date: item.end_date,
        assigned_hours: item.assigned_hours,
        remarks: item.remarks,
      };
    })
    .filter(Boolean) as ReportRow[];

  const filteredRows = rows.filter((row) => {
    const matchesStatus =
      selectedStatus === "all"
        ? true
        : row.assignment_status === selectedStatus;

    const matchesSearch = !searchQuery
      ? true
      : [
          row.student_name,
          row.family_name,
          row.first_name,
          row.student_number,
          row.batch_name,
          row.office_name,
          row.remarks ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(searchQuery);

    return matchesStatus && matchesSearch;
  });

  const orderedRows = [...filteredRows].sort((a, b) => {
    if (b.completed_hours !== a.completed_hours) {
      return b.completed_hours - a.completed_hours;
    }

    if (b.progress_percent !== a.progress_percent) {
      return b.progress_percent - a.progress_percent;
    }

    return a.student_name.localeCompare(b.student_name);
  });

  const totalRecords = orderedRows.length;
  const totalCompletedHours = orderedRows.reduce(
    (sum, row) => sum + row.completed_hours,
    0
  );
  const averageProgress = orderedRows.length
    ? roundTo(
        orderedRows.reduce((sum, row) => sum + row.progress_percent, 0) /
          orderedRows.length,
        1
      )
    : 0;
  const completedStatusCount = orderedRows.filter(
    (row) => row.assignment_status === "completed"
  ).length;

  const exportHref = `/teacher/reports/export?q=${encodeURIComponent(
    resolvedSearchParams.q || ""
  )}&status=${encodeURIComponent(selectedStatus)}`;

  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="fade-up rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-primary">Teacher Reports</p>
            <h1 className="mt-1 break-words text-xl font-semibold tracking-tight text-foreground sm:text-2xl lg:text-3xl">
              Performance Reports
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Review assignment-related student performance ordered by completed
              hours, then export the filtered data directly as CSV.
            </p>
          </div>

          <div className="w-full shrink-0 2xl:w-auto">
            <ExportReportsButton href={exportHref} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <SummaryCard
          title="Total Records"
          value={String(totalRecords)}
          description="Teacher-scoped report entries after current filters."
          icon={Files}
        />
        <SummaryCard
          title="Total Completed Hours"
          value={String(totalCompletedHours)}
          description="Combined completed hours across filtered report records."
          icon={TrendingUp}
        />
        <SummaryCard
          title="Average Progress"
          value={`${averageProgress}%`}
          description="Average completion percentage across filtered records."
          icon={Users}
        />
        <SummaryCard
          title="Completed Assignments"
          value={String(completedStatusCount)}
          description="Assignments with completed status in the current report."
          icon={FileSpreadsheet}
        />
      </section>

      <section className="fade-up-delayed overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-4 py-5 sm:px-6">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Report Records
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Sorted by completed hours from highest to lowest.
              </p>
            </div>

            <div className="text-sm text-muted-foreground xl:text-right">
              Showing{" "}
              <span className="font-medium text-foreground">{orderedRows.length}</span>
              {" "}record{orderedRows.length === 1 ? "" : "s"}
            </div>
          </div>
        </div>

        <div className="border-b border-border px-4 py-4 sm:px-6">
          <form className="grid gap-3 md:grid-cols-2 2xl:grid-cols-[minmax(0,1fr)_220px_auto]">
            <div className="relative md:col-span-2 2xl:col-span-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                name="q"
                defaultValue={resolvedSearchParams.q || ""}
                placeholder="Search by student, batch, office, or remarks"
                className="w-full rounded-2xl border border-input bg-background pl-11 pr-4 py-3 text-sm text-foreground outline-none transition-all duration-200 placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>

            <select
              name="status"
              defaultValue={selectedStatus}
              className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition-all duration-200 focus:border-primary focus:ring-4 focus:ring-primary/10"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-background px-5 py-3 text-sm font-medium text-foreground ring-1 ring-border transition-all duration-200 hover:bg-muted hover:ring-primary/20"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Apply Filters
            </button>
          </form>
        </div>

        {orderedRows.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-muted-foreground">
            No report records matched your filters.
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto 2xl:block">
              <table className="min-w-[1180px] w-full text-sm">
                <thead className="bg-background/60">
                  <tr className="border-b border-border text-left">
                    <th className="px-6 py-4 font-medium text-muted-foreground">
                      Student Name
                    </th>
                    <th className="px-6 py-4 font-medium text-muted-foreground">
                      Student No.
                    </th>
                    <th className="px-6 py-4 font-medium text-muted-foreground">
                      Batch
                    </th>
                    <th className="px-6 py-4 font-medium text-muted-foreground">
                      Office
                    </th>
                    <th className="px-6 py-4 font-medium text-muted-foreground">
                      Completed Hours
                    </th>
                    <th className="px-6 py-4 font-medium text-muted-foreground">
                      Required Hours
                    </th>
                    <th className="px-6 py-4 font-medium text-muted-foreground">
                      Remaining
                    </th>
                    <th className="px-6 py-4 font-medium text-muted-foreground">
                      Progress
                    </th>
                    <th className="px-6 py-4 font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="px-6 py-4 font-medium text-muted-foreground">
                      Start Date
                    </th>
                    <th className="px-6 py-4 font-medium text-muted-foreground">
                      End Date
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {orderedRows.map((row, index) => (
                    <tr
                      key={row.id}
                      className="table-row-animate border-b border-border/70 transition hover:bg-muted/30"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-foreground">
                            {row.student_name}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {row.family_name}, {row.first_name}
                            {row.middle_name ? ` • ${row.middle_name}` : ""}
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-muted-foreground">
                        {row.student_number}
                      </td>

                      <td className="px-6 py-4 text-muted-foreground">
                        {row.batch_name}
                      </td>

                      <td className="px-6 py-4 text-muted-foreground">
                        {row.office_name}
                      </td>

                      <td className="px-6 py-4 font-semibold text-foreground">
                        {row.completed_hours}
                      </td>

                      <td className="px-6 py-4 text-foreground">
                        {row.required_hours}
                      </td>

                      <td className="px-6 py-4 text-foreground">
                        {row.remaining_hours}
                      </td>

                      <td className="px-6 py-4">
                        <div className="min-w-[180px]">
                          <div className="mb-1.5 flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium text-foreground">
                              {roundTo(row.progress_percent, 1)}%
                            </span>
                          </div>
                          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-700 ease-out"
                              style={{
                                width: `${Math.min(row.progress_percent, 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${getStatusClass(
                            row.assignment_status
                          )}`}
                        >
                          {row.assignment_status}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-muted-foreground">
                        {formatDate(row.start_date)}
                      </td>

                      <td className="px-6 py-4 text-muted-foreground">
                        {formatDate(row.end_date)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-4 p-4 sm:p-6 2xl:hidden">
              {orderedRows.map((row, index) => (
                <div
                  key={row.id}
                  className="table-row-animate rounded-2xl border border-border bg-background p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-foreground">
                        {row.student_name}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {row.student_number} • {row.batch_name}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Office: {row.office_name}
                      </p>
                    </div>

                    <span
                      className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium capitalize ${getStatusClass(
                        row.assignment_status
                      )}`}
                    >
                      {row.assignment_status}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl border border-border/70 bg-card px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        Completed
                      </p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {row.completed_hours}
                      </p>
                    </div>

                    <div className="rounded-xl border border-border/70 bg-card px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        Required
                      </p>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {row.required_hours}
                      </p>
                    </div>

                    <div className="rounded-xl border border-border/70 bg-card px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        Remaining
                      </p>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {row.remaining_hours}
                      </p>
                    </div>

                    <div className="rounded-xl border border-border/70 bg-card px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        Schedule
                      </p>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {formatDate(row.start_date)} - {formatDate(row.end_date)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium text-foreground">
                        {roundTo(row.progress_percent, 1)}%
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-700 ease-out"
                        style={{
                          width: `${Math.min(row.progress_percent, 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  {row.remarks?.trim() && (
                    <div className="mt-4 rounded-xl border border-border/70 bg-card px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        Remarks
                      </p>
                      <p className="mt-1 text-sm text-foreground">
                        {row.remarks}
                      </p>
                    </div>
                  )}
                </div>
              ))}
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

        .report-card {
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