import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileCheck2,
  GraduationCap,
  Lock,
  Search,
  Star,
  User,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EvaluationModal } from "@/components/critic/evaluation-modal";

type PageProps = {
  searchParams?: Promise<{
    search?: string;
  }>;
};

function fullName(person: any) {
  return [
    person?.first_name,
    person?.middle_name,
    person?.last_name,
    person?.suffix,
  ]
    .filter(Boolean)
    .join(" ");
}

function normalizeRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function formatHours(value: number) {
  return Number(value.toFixed(2)).toLocaleString();
}

function recommendationLabel(value: string) {
  return value.replace(/_/g, " ");
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function resolveAvatarUrl(supabaseUrl: string, avatarUrl?: string | null) {
  if (!avatarUrl) return null;

  if (avatarUrl.startsWith("http://") || avatarUrl.startsWith("https://")) {
    return avatarUrl;
  }

  const cleanPath = avatarUrl.replace(/^\/+/, "");

  return `${supabaseUrl}/storage/v1/object/public/profile-avatars/${cleanPath}`;
}

export default async function CriticEvaluationsPage({
  searchParams,
}: PageProps) {
  const params = (await searchParams) ?? {};
  const search = params.search?.trim() ?? "";

  const supabase = await createClient();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: critic } = await supabase
    .from("critics")
    .select("id, office_id")
    .eq("profile_id", user.id)
    .eq("status", "active")
    .single();

  if (!critic) redirect("/login");

  const { data: assignments, error } = await supabase
    .from("assignments")
    .select(
      `
      id,
      office_id,
      student_id,
      status,
      start_date,
      students:student_id (
        id,
        profile_id,
        student_number,
        first_name,
        middle_name,
        last_name,
        suffix,
        email,
        completed_hours,
        required_hours,
        profiles:profile_id (
          id,
          avatar_url
        ),
        batches:batch_id (
          name,
          course
        )
      ),
      evaluations (
        id,
        overall_score,
        practicum_grade,
        recommendation,
        status,
        submitted_at
      )
    `
    )
    .eq("office_id", critic.office_id)
    .in("status", ["active", "completed"])
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  let rows =
    assignments
      ?.map((row: any) => {
        const student = normalizeRelation(row.students);
        const batch = normalizeRelation(student?.batches);
        const profile = normalizeRelation(student?.profiles);
        const evaluation = normalizeRelation(row.evaluations);

        if (!student) return null;

        const completed = Number(student.completed_hours ?? 0);
        const required = Number(student.required_hours ?? 0);
        const progress =
          required > 0
            ? Math.min(Math.round((completed / required) * 100), 100)
            : 0;
        const ready = completed >= required;
        const evaluated = Boolean(evaluation);
        const name = fullName(student);

        return {
          assignment: row,
          student,
          batch,
          profile,
          evaluation,
          name,
          avatarUrl: resolveAvatarUrl(
            supabaseUrl,
            (profile as any)?.avatar_url
          ),
          completed,
          required,
          remaining: Math.max(required - completed, 0),
          progress,
          ready,
          evaluated,
        };
      })
      .filter(Boolean) ?? [];

  if (search) {
    const keyword = search.toLowerCase();

    rows = rows.filter((row: any) => {
      return (
        row.name.toLowerCase().includes(keyword) ||
        String(row.student.student_number ?? "")
          .toLowerCase()
          .includes(keyword) ||
        String(row.batch?.course ?? "").toLowerCase().includes(keyword)
      );
    });
  }

  const readyRows = rows.filter((row: any) => row.ready && !row.evaluated);
  const submittedRows = rows.filter((row: any) => row.evaluated);
  const lockedRows = rows.filter((row: any) => !row.ready && !row.evaluated);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Evaluations</p>
        <h2 className="text-2xl font-semibold tracking-tight">
          Student Evaluations
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Submit practicum grades, record workplace performance, and monitor
          which students are ready for evaluation.
        </p>
      </div>

      <div className="rounded-3xl border border-border bg-card p-4">
        <form className="flex max-w-xl items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-border bg-background px-3 py-2.5 transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              name="search"
              defaultValue={search}
              placeholder="Search student, number, or course..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          <button
            type="submit"
            className="rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Search
          </button>

          {search && (
            <Link
              href="/critic/evaluations"
              className="rounded-2xl border border-border bg-background px-5 py-2.5 text-sm font-semibold hover:bg-muted"
            >
              Reset
            </Link>
          )}
        </form>
      </div>

      <Section
        title="Ready for Evaluation"
        description="These students completed their required hours and are waiting for your evaluation."
        icon={<CheckCircle2 className="h-5 w-5 text-green-600" />}
      >
        {readyRows.length > 0 ? (
          readyRows.map((row: any) => (
            <EvaluationCard key={row.assignment.id} row={row}>
              <EvaluationModal
                assignmentId={row.assignment.id}
                studentId={row.student.id}
                studentName={row.name}
              />
            </EvaluationCard>
          ))
        ) : (
          <EmptyState text="No students are ready for evaluation right now." />
        )}
      </Section>

      <Section
        title="Submitted Evaluations"
        description="These records already have submitted evaluations and practicum grades."
        icon={<FileCheck2 className="h-5 w-5 text-primary" />}
      >
        {submittedRows.length > 0 ? (
          submittedRows.map((row: any) => (
            <EvaluationCard key={row.assignment.id} row={row}>
              <div className="rounded-2xl border border-border bg-background px-4 py-2.5 text-center text-sm font-semibold">
                Submitted
              </div>
            </EvaluationCard>
          ))
        ) : (
          <EmptyState text="No submitted evaluations yet." />
        )}
      </Section>

      <Section
        title="Locked Evaluations"
        description="These students still need more approved hours before evaluation."
        icon={<Lock className="h-5 w-5 text-amber-600" />}
      >
        {lockedRows.length > 0 ? (
          lockedRows.map((row: any) => (
            <EvaluationCard key={row.assignment.id} row={row}>
              <button
                disabled
                className="rounded-2xl bg-muted px-4 py-2.5 text-sm font-semibold text-muted-foreground"
              >
                Locked
              </button>
            </EvaluationCard>
          ))
        ) : (
          <EmptyState text="No locked evaluations." />
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border bg-card p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-background">
          {icon}
        </div>

        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      <div className="grid gap-3">{children}</div>
    </section>
  );
}

function EvaluationCard({
  row,
  children,
}: {
  row: any;
  children: React.ReactNode;
}) {
  const initials = getInitials(row.name);

  return (
    <div className="group grid gap-4 rounded-3xl border border-border bg-background p-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_0_30px_rgba(59,130,246,0.10)] lg:grid-cols-[1fr_280px_180px] lg:items-center">
      <div className="flex items-start gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary/10 text-lg font-bold text-primary ring-1 ring-primary/20">
          {row.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={row.avatarUrl}
              alt={row.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <span>{initials || <User className="h-6 w-6" />}</span>
          )}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{row.name}</p>

            {row.evaluated ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <ClipboardCheck className="h-3.5 w-3.5" />
                Evaluated
              </span>
            ) : row.ready ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Ready
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-600">
                <Clock className="h-3.5 w-3.5" />
                In Progress
              </span>
            )}
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            {row.student.student_number} • {row.batch?.course ?? "-"} •{" "}
            {row.batch?.name ?? "-"}
          </p>

          {row.evaluation && (
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Star className="h-3.5 w-3.5" />
                Rubric {Number(row.evaluation.overall_score).toFixed(2)}
              </span>

              {row.evaluation.practicum_grade !== null &&
                row.evaluation.practicum_grade !== undefined && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-600">
                    <GraduationCap className="h-3.5 w-3.5" />
                    Grade {Number(row.evaluation.practicum_grade).toFixed(2)}
                  </span>
                )}

              <span className="inline-flex rounded-full bg-muted px-3 py-1 text-xs font-medium capitalize text-muted-foreground">
                {recommendationLabel(row.evaluation.recommendation)}
              </span>
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">
            Hours Progress
          </p>
          <p className="text-xs font-bold">{row.progress}%</p>
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${row.progress}%` }}
          />
        </div>

        <p className="mt-2 text-xs text-muted-foreground">
          {formatHours(row.completed)} / {formatHours(row.required)} hours
        </p>

        {!row.ready && (
          <p className="mt-1 text-xs text-amber-600">
            Needs {formatHours(row.remaining)} more hours
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-background py-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}