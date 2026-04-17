import Link from "next/link";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import {
  Activity,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Search,
  UserSquare2,
} from "lucide-react";

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

type AssignmentRecord = {
  id: string;
  status: AssignmentStatus;
  start_date: string | null;
  end_date: string | null;
  assigned_hours: number | null;
  remarks: string | null;
  created_at: string;
  student_name: string;
  family_name: string;
  first_name: string;
  middle_name: string | null;
  student_number: string;
  batch_name: string;
  batch_code: string;
  office_name: string;
  office_status: "active" | "inactive" | "unknown";
  progress_percent: number;
  completed_hours: number;
  required_hours: number;
};

type PageProps = {
  searchParams?: Promise<{
    page?: string;
    q?: string;
    status?: string;
  }>;
};

const PAGE_SIZE = 10;
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

function buildQueryString(params: {
  page?: number | string;
  q?: string;
  status?: string;
}) {
  const search = new URLSearchParams();

  if (params.page && String(params.page) !== "1") {
    search.set("page", String(params.page));
  }

  if (params.q?.trim()) {
    search.set("q", params.q.trim());
  }

  if (params.status && params.status !== "all") {
    search.set("status", params.status);
  }

  const query = search.toString();
  return query ? `?${query}` : "";
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
    <div className="summary-card rounded-3xl border border-border bg-card p-5 shadow-sm">
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

export default async function TeacherAssignmentsPage({
  searchParams,
}: PageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const rawPage = Number(resolvedSearchParams.page || "1") || 1;
  const currentPage = Math.max(1, rawPage);
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
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <EmptyState
        title="Unable to load assignments"
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
    .eq("teacher_id", teacher.id)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <EmptyState
        title="Unable to load assignments"
        message={error.message}
      />
    );
  }

  const assignments: AssignmentRecord[] = ((assignmentsData ?? []) as AssignmentRow[])
    .map((item) => {
      const studentRaw = pickFirst(item.student);
      const officeRaw = pickFirst(item.office);
      const batchRaw = pickFirst(studentRaw?.batch ?? null);

      if (!studentRaw) return null;

      return {
        id: item.id,
        status: item.status,
        start_date: item.start_date,
        end_date: item.end_date,
        assigned_hours: item.assigned_hours,
        remarks: item.remarks,
        created_at: item.created_at,
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
        office_status: officeRaw?.status ?? "unknown",
        progress_percent: getProgress(
          studentRaw.completed_hours,
          studentRaw.required_hours
        ),
        completed_hours: studentRaw.completed_hours,
        required_hours: studentRaw.required_hours,
      };
    })
    .filter(Boolean) as AssignmentRecord[];

  const totalAssignments = assignments.length;
  const activeAssignments = assignments.filter(
    (item) => item.status === "active"
  ).length;
  const completedAssignments = assignments.filter(
    (item) => item.status === "completed"
  ).length;
  const pendingAssignments = assignments.filter(
    (item) => item.status === "pending"
  ).length;

  const filteredAssignments = assignments.filter((assignment) => {
    const matchesStatus =
      selectedStatus === "all" ? true : assignment.status === selectedStatus;

    const query = searchQuery;
    const matchesSearch = !query
      ? true
      : [
          assignment.student_name,
          assignment.family_name,
          assignment.first_name,
          assignment.student_number,
          assignment.batch_name,
          assignment.office_name,
          assignment.remarks ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);

    return matchesStatus && matchesSearch;
  });

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAssignments.length / PAGE_SIZE)
  );
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const paginatedAssignments = filteredAssignments.slice(
    startIndex,
    startIndex + PAGE_SIZE
  );

  const startRow = filteredAssignments.length === 0 ? 0 : startIndex + 1;
  const endRow = Math.min(startIndex + PAGE_SIZE, filteredAssignments.length);

  return (
    <div className="space-y-6">
      <section className="fade-up rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Teacher Assignments</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Assignment Monitoring
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Review your assigned students, office placements, assignment status,
              timelines, and related remarks in one responsive view.
            </p>
          </div>

          <div className="inline-flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 transition-all duration-300 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
              <BriefcaseBusiness className="h-5 w-5" />
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Total Assignments
              </p>
              <p className="text-sm font-semibold text-foreground">
                {totalAssignments}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total Assignments"
          value={String(totalAssignments)}
          description="All assignments currently visible under your account."
          icon={BriefcaseBusiness}
        />
        <SummaryCard
          title="Active Assignments"
          value={String(activeAssignments)}
          description="Assignments currently in active supervision."
          icon={Activity}
        />
        <SummaryCard
          title="Completed Assignments"
          value={String(completedAssignments)}
          description="Assignments that have already been completed."
          icon={CheckCircle2}
        />
        <SummaryCard
          title="Pending Assignments"
          value={String(pendingAssignments)}
          description="Assignments that still need activation or follow-up."
          icon={Clock3}
        />
      </section>

      <section className="fade-up-delayed overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-4 border-b border-border px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Assignment Records
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Search, filter, and review your assigned student placements.
            </p>
          </div>

          <div className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="font-medium text-foreground">{startRow}</span>
            {" "}to{" "}
            <span className="font-medium text-foreground">{endRow}</span>
            {" "}of{" "}
            <span className="font-medium text-foreground">
              {filteredAssignments.length}
            </span>
          </div>
        </div>

        <div className="border-b border-border px-4 py-4 sm:px-6">
          <form className="grid gap-3 lg:grid-cols-[1fr_220px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                name="q"
                defaultValue={resolvedSearchParams.q || ""}
                placeholder="Search by student, student number, office, or remarks"
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
              className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-all duration-200 hover:translate-y-[-1px] hover:shadow-lg hover:shadow-primary/20 active:translate-y-0"
            >
              Apply Filters
            </button>
          </form>
        </div>

        {filteredAssignments.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-muted-foreground">
            No assignments matched your current filters.
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full text-sm">
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
                      Start Date
                    </th>
                    <th className="px-6 py-4 font-medium text-muted-foreground">
                      End Date
                    </th>
                    <th className="px-6 py-4 font-medium text-muted-foreground">
                      Assigned Hours
                    </th>
                    <th className="px-6 py-4 font-medium text-muted-foreground">
                      Progress
                    </th>
                    <th className="px-6 py-4 font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="px-6 py-4 font-medium text-muted-foreground">
                      Remarks
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedAssignments.map((assignment, index) => (
                    <tr
                      key={assignment.id}
                      className="table-row-animate border-b border-border/70 transition hover:bg-muted/30"
                      style={{ animationDelay: `${index * 70}ms` }}
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-foreground">
                            {assignment.student_name}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {assignment.family_name}, {assignment.first_name}
                            {assignment.middle_name
                              ? ` • ${assignment.middle_name}`
                              : ""}
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-muted-foreground">
                        {assignment.student_number}
                      </td>

                      <td className="px-6 py-4 text-muted-foreground">
                        {assignment.batch_name}
                      </td>

                      <td className="px-6 py-4 text-muted-foreground">
                        {assignment.office_name}
                      </td>

                      <td className="px-6 py-4 text-muted-foreground">
                        {formatDate(assignment.start_date)}
                      </td>

                      <td className="px-6 py-4 text-muted-foreground">
                        {formatDate(assignment.end_date)}
                      </td>

                      <td className="px-6 py-4 text-foreground">
                        {assignment.assigned_hours ?? "—"}
                      </td>

                      <td className="px-6 py-4">
                        <div className="min-w-[180px]">
                          <div className="mb-1.5 flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium text-foreground">
                              {roundTo(assignment.progress_percent, 1)}%
                            </span>
                          </div>
                          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-700 ease-out"
                              style={{
                                width: `${Math.min(
                                  assignment.progress_percent,
                                  100
                                )}%`,
                              }}
                            />
                          </div>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {assignment.completed_hours} / {assignment.required_hours} hrs
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${getStatusClass(
                            assignment.status
                          )}`}
                        >
                          {assignment.status}
                        </span>
                      </td>

                      <td className="max-w-[240px] px-6 py-4 text-muted-foreground">
                        <span className="line-clamp-2">
                          {assignment.remarks?.trim() || "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-4 p-4 sm:p-6 lg:hidden">
              {paginatedAssignments.map((assignment, index) => (
                <div
                  key={assignment.id}
                  className="table-row-animate rounded-2xl border border-border bg-background p-4"
                  style={{ animationDelay: `${index * 70}ms` }}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-foreground">
                        {assignment.student_name}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {assignment.student_number} • {assignment.batch_name}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Office: {assignment.office_name}
                      </p>
                    </div>

                    <span
                      className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium capitalize ${getStatusClass(
                        assignment.status
                      )}`}
                    >
                      {assignment.status}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-border/70 bg-card px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        Start Date
                      </p>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {formatDate(assignment.start_date)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-border/70 bg-card px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        End Date
                      </p>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {formatDate(assignment.end_date)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-border/70 bg-card px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        Assigned Hours
                      </p>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {assignment.assigned_hours ?? "—"}
                      </p>
                    </div>

                    <div className="rounded-xl border border-border/70 bg-card px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        Remarks
                      </p>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {assignment.remarks?.trim() || "—"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium text-foreground">
                        {roundTo(assignment.progress_percent, 1)}%
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-700 ease-out"
                        style={{
                          width: `${Math.min(
                            assignment.progress_percent,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {assignment.completed_hours} / {assignment.required_hours} hrs
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-4 border-t border-border px-4 py-4 sm:px-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                Page{" "}
                <span className="font-medium text-foreground">{safePage}</span>
                {" "}of{" "}
                <span className="font-medium text-foreground">{totalPages}</span>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/teacher/assignments${buildQueryString({
                    page: Math.max(1, safePage - 1),
                    q: resolvedSearchParams.q || "",
                    status: selectedStatus,
                  })}`}
                  aria-disabled={safePage === 1}
                  className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium transition-all duration-200 ${
                    safePage === 1
                      ? "pointer-events-none border-border bg-background text-muted-foreground opacity-50"
                      : "border-border bg-background text-foreground hover:border-primary/30 hover:bg-muted"
                  }`}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Link>

                <Link
                  href={`/teacher/assignments${buildQueryString({
                    page: Math.min(totalPages, safePage + 1),
                    q: resolvedSearchParams.q || "",
                    status: selectedStatus,
                  })}`}
                  aria-disabled={safePage === totalPages}
                  className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium transition-all duration-200 ${
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

        .summary-card {
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