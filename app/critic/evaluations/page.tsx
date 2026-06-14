import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileText,
  Search,
  UserRound,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { EvaluationModal } from "@/components/critic/evaluation-modal";

type EvaluationPageProps = {
  searchParams: Promise<{
    q?: string | string[];
  }>;
};

type StudentProfile = {
  avatar_url: string | null;
};

type StudentRecord = {
  id: string;
  profile_id: string | null;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix: string | null;
  student_number: string;
  completed_hours: number | string | null;
  required_hours: number | string | null;
  status: string;
  profiles: StudentProfile | StudentProfile[] | null;
};

type EvaluationRecord = {
  id: string;
  assignment_id: string;
  student_id: string;
  critic_id: string;
  average_rating: number | string | null;
  recommendation: string;
  status: string;
  strengths: string | null;
  improvement_areas: string | null;
  general_comment: string | null;
  submitted_at: string;
};

type EvaluationRow = {
  assignmentId: string;
  assignmentStatus: string;
  studentId: string;
  studentName: string;
  studentNumber: string;
  avatarUrl: string | null;
  completedHours: number;
  requiredHours: number;
  progress: number;
  remainingHours: number;
  ready: boolean;
  evaluation: EvaluationRecord | null;
};

function normalizeRelation<T>(
  value: T | T[] | null | undefined
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function getFullName(person: {
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  suffix?: string | null;
}) {
  return [
    person.first_name,
    person.middle_name,
    person.last_name,
    person.suffix,
  ]
    .filter(Boolean)
    .join(" ");
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

function formatRecommendation(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatSubmittedDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Submission date unavailable";
  }

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function CriticEvaluationsPage({
  searchParams,
}: EvaluationPageProps) {
  const supabase = await createClient();

  const params = await searchParams;
  const rawSearch = Array.isArray(params.q) ? params.q[0] : params.q;
  const search = rawSearch?.trim() ?? "";
  const normalizedSearch = search.toLowerCase();

  /*
   * 1. Authenticate the current account.
   */
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  /*
   * 2. Retrieve the active critic and assigned office.
   *    This follows the same flow as the working critic dashboard.
   */
  const { data: critic, error: criticError } = await supabase
    .from("critics")
    .select("id, office_id")
    .eq("profile_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (criticError || !critic) {
    redirect("/login");
  }

  /*
   * 3. Assignments are the source of truth.
   *
   *    avatar_url is obtained from:
   *    assignments -> students -> profiles
   *
   *    It must not be selected directly from students because the students
   *    table does not contain an avatar_url column.
   */
  const { data: assignments, error: assignmentsError } = await supabase
    .from("assignments")
    .select(`
      id,
      student_id,
      status,
      office_id,
      assigned_hours,
      students (
        id,
        profile_id,
        first_name,
        middle_name,
        last_name,
        suffix,
        student_number,
        completed_hours,
        required_hours,
        status,
        profiles (
          avatar_url
        )
      )
    `)
    .eq("office_id", critic.office_id)
    .in("status", ["active", "completed"])
    .order("created_at", { ascending: false });

  if (assignmentsError) {
    console.error(
      "[CRITIC_EVALUATIONS:ASSIGNMENTS]",
      assignmentsError
    );

    throw new Error(
      "Assigned students could not be loaded. Check the assignments and students read policies."
    );
  }

  const assignmentRows = assignments ?? [];
  const assignmentIds = assignmentRows.map((row) => row.id);

  /*
   * 4. Load evaluations separately.
   *
   *    This avoids relying on an ambiguous embedded relation and ensures
   *    submitted evaluations belong to the authenticated critic.
   */
  let evaluations: EvaluationRecord[] = [];

  if (assignmentIds.length > 0) {
    const { data: evaluationData, error: evaluationsError } =
      await supabase
        .from("evaluations")
        .select(`
          id,
          assignment_id,
          student_id,
          critic_id,
          average_rating,
          recommendation,
          status,
          strengths,
          improvement_areas,
          general_comment,
          submitted_at
        `)
        .eq("critic_id", critic.id)
        .in("assignment_id", assignmentIds);

    if (evaluationsError) {
      console.error(
        "[CRITIC_EVALUATIONS:EVALUATIONS]",
        evaluationsError
      );

      throw new Error(
        "Submitted evaluations could not be loaded. Check the evaluations read policy."
      );
    }

    evaluations = (evaluationData ?? []) as EvaluationRecord[];
  }

  const evaluationByAssignment = new Map(
    evaluations.map((evaluation) => [
      evaluation.assignment_id,
      evaluation,
    ])
  );

  /*
   * 5. Normalize assignments into one predictable UI model.
   */
  const rows: EvaluationRow[] = assignmentRows
    .map((assignment: any): EvaluationRow | null => {
      const student = normalizeRelation<StudentRecord>(
        assignment.students
      );

      if (!student) {
        return null;
      }

      const profile = normalizeRelation<StudentProfile>(
        student.profiles
      );

      const completedHours = Number(student.completed_hours ?? 0);
      const requiredHours = Number(student.required_hours ?? 0);

      const safeCompleted = Number.isFinite(completedHours)
        ? completedHours
        : 0;

      const safeRequired = Number.isFinite(requiredHours)
        ? requiredHours
        : 0;

      const progress =
        safeRequired > 0
          ? Math.min(
              Math.round((safeCompleted / safeRequired) * 100),
              100
            )
          : 0;

      const evaluation =
        evaluationByAssignment.get(assignment.id) ?? null;

      return {
        assignmentId: assignment.id,
        assignmentStatus: assignment.status,
        studentId: student.id,
        studentName:
          getFullName(student) || "Unnamed student",
        studentNumber:
          student.student_number || "No student number",
        avatarUrl: profile?.avatar_url ?? null,
        completedHours: safeCompleted,
        requiredHours: safeRequired,
        progress,
        remainingHours: Math.max(
          safeRequired - safeCompleted,
          0
        ),
        ready:
          safeRequired > 0 &&
          safeCompleted >= safeRequired,
        evaluation,
      };
    })
    .filter(
      (row): row is EvaluationRow => row !== null
    )
    .sort((a, b) =>
      a.studentName.localeCompare(b.studentName)
    );

  /*
   * 6. The three groups are exclusive.
   *
   *    A student cannot appear in more than one section.
   */
  const ongoingRows = rows.filter(
    (row) => !row.evaluation && !row.ready
  );

  const readyRows = rows.filter(
    (row) => !row.evaluation && row.ready
  );

  const submittedRows = rows.filter(
    (row) => Boolean(row.evaluation)
  );

  /*
   * KPI totals are based on all assigned students, not the search result.
   */
  const totals = {
    ongoing: ongoingRows.length,
    ready: readyRows.length,
    submitted: submittedRows.length,
  };

  function matchesSearch(row: EvaluationRow) {
    if (!normalizedSearch) {
      return true;
    }

    return (
      row.studentName
        .toLowerCase()
        .includes(normalizedSearch) ||
      row.studentNumber
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }

  const visibleOngoing = ongoingRows.filter(matchesSearch);
  const visibleReady = readyRows.filter(matchesSearch);
  const visibleSubmitted =
    submittedRows.filter(matchesSearch);

  const totalVisible =
    visibleOngoing.length +
    visibleReady.length +
    visibleSubmitted.length;

  return (
    <div className="space-y-7">
      {/* Page heading */}
      <div>
        <p className="text-sm text-muted-foreground">
          Evaluations
        </p>

        <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Student Evaluation Management
        </h2>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Monitor practicum progress, evaluate qualified students,
          and review submitted evaluations.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        <KpiCard
          title="Ongoing"
          value={totals.ongoing}
          description="Still completing required hours"
          icon={<Clock3 className="h-5 w-5" />}
          tone="amber"
        />

        <KpiCard
          title="Ready"
          value={totals.ready}
          description="Available for evaluation"
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="emerald"
        />

        <KpiCard
          title="Submitted"
          value={totals.submitted}
          description="Evaluations already completed"
          icon={<ClipboardCheck className="h-5 w-5" />}
          tone="blue"
        />
      </div>

      {/* Search */}
      <form
        action="/critic/evaluations"
        method="get"
        className="flex flex-col gap-2 sm:flex-row"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <input
            type="search"
            name="q"
            defaultValue={search}
            placeholder="Search by student name or number"
            className="h-12 w-full rounded-2xl border border-border bg-card pl-11 pr-4 text-sm outline-none transition focus:border-primary/60 focus:ring-4 focus:ring-primary/10"
          />
        </div>

        <button
          type="submit"
          className="h-12 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
        >
          Search
        </button>

        {search && (
          <Link
            href="/critic/evaluations"
            className="grid h-12 place-items-center rounded-2xl border border-border px-5 text-sm font-medium transition hover:bg-muted"
          >
            Clear
          </Link>
        )}
      </form>

      {search && totalVisible === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 px-5 py-8 text-center">
          <p className="font-medium">
            No matching students found
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try another student name or student number.
          </p>
        </div>
      )}

      {/* Ongoing */}
      <EvaluationSection
        title="Ongoing students"
        description="Students who still need to complete their required practicum hours."
        count={visibleOngoing.length}
        tone="amber"
      >
        {visibleOngoing.length > 0 ? (
          visibleOngoing.map((row) => (
            <OngoingStudentCard
              key={row.assignmentId}
              row={row}
            />
          ))
        ) : (
          <EmptySection
            icon={<Clock3 className="h-5 w-5" />}
            title="No ongoing students"
            description={
              search
                ? "No ongoing student matches your search."
                : "All assigned students are ready, submitted, or no students have been assigned."
            }
          />
        )}
      </EvaluationSection>

      {/* Ready */}
      <EvaluationSection
        title="Ready for evaluation"
        description="Students who completed their required hours and have not yet been evaluated."
        count={visibleReady.length}
        tone="emerald"
      >
        {visibleReady.length > 0 ? (
          visibleReady.map((row) => (
            <ReadyStudentCard
              key={row.assignmentId}
              row={row}
            />
          ))
        ) : (
          <EmptySection
            icon={<CheckCircle2 className="h-5 w-5" />}
            title="No students ready for evaluation"
            description={
              search
                ? "No ready student matches your search."
                : "Students will appear here after completing their required practicum hours."
            }
          />
        )}
      </EvaluationSection>

      {/* Submitted */}
      <EvaluationSection
        title="Submitted evaluations"
        description="Completed evaluations submitted by your critic account."
        count={visibleSubmitted.length}
        tone="blue"
      >
        {visibleSubmitted.length > 0 ? (
          visibleSubmitted.map((row) => (
            <SubmittedStudentCard
              key={row.assignmentId}
              row={row}
            />
          ))
        ) : (
          <EmptySection
            icon={<ClipboardCheck className="h-5 w-5" />}
            title="No submitted evaluations"
            description={
              search
                ? "No submitted evaluation matches your search."
                : "Submitted evaluations will appear here after you evaluate a student."
            }
          />
        )}
      </EvaluationSection>
    </div>
  );
}

function KpiCard({
  title,
  value,
  description,
  icon,
  tone,
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ReactNode;
  tone: "amber" | "emerald" | "blue";
}) {
  const toneClasses = {
    amber:
      "bg-amber-500/10 text-amber-500 ring-amber-500/20",
    emerald:
      "bg-emerald-500/10 text-emerald-500 ring-emerald-500/20",
    blue:
      "bg-blue-500/10 text-blue-500 ring-blue-500/20",
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {title}
          </p>

          <p className="mt-2 text-3xl font-bold tracking-tight">
            {value}
          </p>

          <p className="mt-1 hidden text-xs text-muted-foreground sm:block">
            {description}
          </p>
        </div>

        <div
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ring-1 ring-inset ${toneClasses[tone]}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function EvaluationSection({
  title,
  description,
  count,
  tone,
  children,
}: {
  title: string;
  description: string;
  count: number;
  tone: "amber" | "emerald" | "blue";
  children: React.ReactNode;
}) {
  const countClasses = {
    amber: "bg-amber-500/10 text-amber-500",
    emerald: "bg-emerald-500/10 text-emerald-500",
    blue: "bg-blue-500/10 text-blue-500",
  };

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold sm:text-lg">
              {title}
            </h3>

            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${countClasses[tone]}`}
            >
              {count}
            </span>
          </div>

          <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">
            {description}
          </p>
        </div>
      </div>

      <div className="grid gap-3">{children}</div>
    </section>
  );
}

function StudentIdentity({
  row,
}: {
  row: EvaluationRow;
}) {
  const initials = getInitials(row.studentName);

  return (
    <div className="flex min-w-0 items-center gap-3 sm:gap-4">
      <div className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-primary/10 text-sm font-bold text-primary ring-1 ring-border sm:h-14 sm:w-14">
        {row.avatarUrl ? (
          <img
            src={row.avatarUrl}
            alt={`${row.studentName} profile`}
            className="h-full w-full object-cover"
          />
        ) : initials ? (
          initials
        ) : (
          <UserRound className="h-5 w-5" />
        )}
      </div>

      <div className="min-w-0">
        <p className="truncate font-semibold">
          {row.studentName}
        </p>

        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {row.studentNumber}
        </p>
      </div>
    </div>
  );
}

function OngoingStudentCard({
  row,
}: {
  row: EvaluationRow;
}) {
  return (
    <article className="rounded-2xl border border-amber-500/20 bg-card p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <StudentIdentity row={row} />

        <div className="sm:min-w-64">
          <div className="flex items-center justify-between gap-4 text-xs">
            <span className="font-medium text-amber-500">
              Ongoing
            </span>

            <span className="tabular-nums text-muted-foreground">
              {row.completedHours} / {row.requiredHours} hours
            </span>
          </div>

          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-amber-500"
              style={{ width: `${row.progress}%` }}
            />
          </div>

          <p className="mt-2 text-xs text-muted-foreground">
            {row.remainingHours}{" "}
            {row.remainingHours === 1 ? "hour" : "hours"} remaining
          </p>
        </div>
      </div>
    </article>
  );
}

function ReadyStudentCard({
  row,
}: {
  row: EvaluationRow;
}) {
  return (
    <article className="rounded-2xl border border-emerald-500/20 bg-card p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <StudentIdentity row={row} />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-500">
              Required hours completed
            </span>

            <span className="text-xs text-muted-foreground">
              {row.completedHours} / {row.requiredHours} hours
            </span>
          </div>
        </div>

        <EvaluationModal
          assignmentId={row.assignmentId}
          studentId={row.studentId}
          studentName={row.studentName}
        />
      </div>
    </article>
  );
}

function SubmittedStudentCard({
  row,
}: {
  row: EvaluationRow;
}) {
  const evaluation = row.evaluation;

  if (!evaluation) {
    return null;
  }

  const average = Number(evaluation.average_rating);
  const safeAverage = Number.isFinite(average)
    ? average.toFixed(2)
    : "—";

  return (
    <article className="rounded-2xl border border-blue-500/20 bg-card p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <StudentIdentity row={row} />

        <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[460px]">
          <SubmittedMetric
            label="Average"
            value={safeAverage}
          />

          <SubmittedMetric
            label="Recommendation"
            value={formatRecommendation(
              evaluation.recommendation
            )}
          />

          <SubmittedMetric
            label="Status"
            value={formatRecommendation(evaluation.status)}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Submitted {formatSubmittedDate(evaluation.submitted_at)}
        </p>

        <details className="group">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium transition hover:bg-muted">
            <FileText className="h-4 w-4" />
            View evaluation
          </summary>

          <div className="mt-3 grid gap-3 rounded-2xl border border-border bg-background p-4 sm:grid-cols-3">
            <CommentBlock
              title="Strengths"
              value={evaluation.strengths}
            />

            <CommentBlock
              title="Areas for improvement"
              value={evaluation.improvement_areas}
            />

            <CommentBlock
              title="General comments"
              value={evaluation.general_comment}
            />
          </div>
        </details>
      </div>
    </article>
  );
}

function SubmittedMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background px-3 py-2.5">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-semibold">
        {value}
      </p>
    </div>
  );
}

function CommentBlock({
  title,
  value,
}: {
  title: string;
  value: string | null;
}) {
  return (
    <div>
      <p className="text-xs font-semibold">{title}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        {value?.trim() || "No comment provided."}
      </p>
    </div>
  );
}

function EmptySection({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/30 px-5 py-8 text-center">
      <div className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-muted text-muted-foreground">
        {icon}
      </div>

      <p className="mt-3 text-sm font-semibold">{title}</p>

      <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-muted-foreground sm:text-sm">
        {description}
      </p>
    </div>
  );
}