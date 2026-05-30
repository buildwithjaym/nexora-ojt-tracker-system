import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  GraduationCap,
  Mail,
  Phone,
  Search,
  SlidersHorizontal,
  User,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams?: Promise<{
    search?: string;
    sort?: string;
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

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function normalizeRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function formatHours(value: number) {
  return Number(value.toFixed(2)).toLocaleString();
}

function resolveAvatarUrl(supabaseUrl: string, avatarUrl?: string | null) {
  if (!avatarUrl) return null;

  if (avatarUrl.startsWith("http://") || avatarUrl.startsWith("https://")) {
    return avatarUrl;
  }

  const cleanPath = avatarUrl.replace(/^\/+/, "");

  return `${supabaseUrl}/storage/v1/object/public/profile-avatars/${cleanPath}`;
}

export default async function CriticStudentsPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const search = params.search?.trim() ?? "";
  const sort = params.sort ?? "progress_desc";

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
    .select(`
      id,
      start_date,
      end_date,
      status,
      evaluations (
        id,
        status,
        overall_score,
        practicum_grade,
        submitted_at
      ),
      students:student_id (
        id,
        profile_id,
        student_number,
        first_name,
        middle_name,
        last_name,
        suffix,
        email,
        phone,
        completed_hours,
        required_hours,
        status,
        profiles:profile_id (
          id,
          avatar_url
        ),
        batches:batch_id (
          name,
          course
        )
      )
    `)
    .eq("office_id", critic.office_id)
    .in("status", ["active", "completed"])
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  let rows =
    assignments
      ?.map((row: any) => {
        const student = normalizeRelation(row.students);
        if (!student) return null;

        const profile = normalizeRelation(student.profiles);
        const batch = normalizeRelation(student.batches);
        const evaluation = normalizeRelation(row.evaluations);

        const name = fullName(student);
        const completed = Number(student.completed_hours ?? 0);
        const required = Number(student.required_hours ?? 0);
        const remaining = Math.max(required - completed, 0);
        const progress =
          required > 0
            ? Math.min(Math.round((completed / required) * 100), 100)
            : 0;

        return {
          assignment: row,
          student,
          profile,
          batch,
          evaluation,
          evaluated: Boolean(evaluation),
          name,
          avatarUrl: resolveAvatarUrl(supabaseUrl, (profile as any)?.avatar_url),
          completed,
          required,
          remaining,
          progress,
          ready: completed >= required,
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
        String(row.batch?.course ?? "").toLowerCase().includes(keyword) ||
        String(row.student.email ?? "").toLowerCase().includes(keyword)
      );
    });
  }

  rows = [...rows].sort((a: any, b: any) => {
    switch (sort) {
      case "progress_asc":
        return a.progress - b.progress;
      case "ready_first":
        return Number(b.ready && !b.evaluated) - Number(a.ready && !a.evaluated);
      case "evaluated_first":
        return Number(b.evaluated) - Number(a.evaluated);
      case "not_evaluated_first":
        return Number(a.evaluated) - Number(b.evaluated);
      case "remaining_asc":
        return a.remaining - b.remaining;
      case "name_asc":
        return a.name.localeCompare(b.name);
      case "completed_desc":
        return b.completed - a.completed;
      case "progress_desc":
      default:
        return b.progress - a.progress;
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">My Students</p>
        <h2 className="text-2xl font-semibold tracking-tight">
          Student Monitoring
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Track assigned OJT students, contact details, evaluation status,
          progress, and readiness.
        </p>
      </div>

      <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
        <form className="grid gap-3 lg:grid-cols-[1fr_280px_auto]">
          <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-border bg-background px-3 py-2.5 transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              name="search"
              defaultValue={search}
              placeholder="Search name, student number, course, or email..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-border bg-background px-3 py-2.5 transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            <select
              name="sort"
              defaultValue={sort}
              className="w-full bg-background text-sm text-foreground outline-none"
            >
              <option value="progress_desc">Highest progress</option>
              <option value="progress_asc">Lowest progress</option>
              <option value="ready_first">Ready and not evaluated first</option>
              <option value="not_evaluated_first">Not evaluated first</option>
              <option value="evaluated_first">Evaluated first</option>
              <option value="remaining_asc">Least hours remaining</option>
              <option value="completed_desc">Most completed hours</option>
              <option value="name_asc">Name A to Z</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:scale-[1.02] hover:bg-primary/90"
            >
              Apply
            </button>

            {(search || sort !== "progress_desc") && (
              <Link
                href="/critic/students"
                className="rounded-2xl border border-border bg-background px-5 py-2.5 text-sm font-semibold transition hover:bg-muted"
              >
                Reset
              </Link>
            )}
          </div>
        </form>
      </div>

      <div className="grid gap-4">
        {rows.map((row: any) => {
          const initials = getInitials(row.name);

          return (
            <div
              key={row.assignment.id}
              className="group overflow-hidden rounded-3xl border border-border bg-card transition duration-300 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-[0_0_35px_rgba(59,130,246,0.12)]"
            >
              <div className="grid gap-6 p-5 xl:grid-cols-[minmax(280px,1.1fr)_minmax(360px,1fr)_240px] xl:items-center">
                <div className="flex min-w-0 items-start gap-4">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-primary/10 text-xl font-bold text-primary ring-1 ring-primary/20">
                    {row.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={row.avatarUrl}
                        alt={row.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span>{initials || <User className="h-7 w-7" />}</span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-lg font-semibold">
                        {row.name}
                      </h3>

                      {row.evaluated ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-600">
                          <ClipboardCheck className="h-3.5 w-3.5" />
                          Evaluated
                        </span>
                      ) : row.ready ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
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

                    <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                      <div className="flex min-w-0 items-center gap-2">
                        <Mail className="h-4 w-4 shrink-0" />
                        <span className="truncate">
                          {row.student.email ?? "No email"}
                        </span>
                      </div>

                      <div className="flex min-w-0 items-center gap-2">
                        <Phone className="h-4 w-4 shrink-0" />
                        <span className="truncate">
                          {row.student.phone ?? "No phone"}
                        </span>
                      </div>
                    </div>

                    {row.evaluated && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {row.evaluation?.practicum_grade !== null &&
                          row.evaluation?.practicum_grade !== undefined && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-600">
                              <GraduationCap className="h-3.5 w-3.5" />
                              Grade{" "}
                              {Number(row.evaluation.practicum_grade).toFixed(2)}
                            </span>
                          )}

                        {row.evaluation?.overall_score !== null &&
                          row.evaluation?.overall_score !== undefined && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                              Rubric{" "}
                              {Number(row.evaluation.overall_score).toFixed(2)}
                            </span>
                          )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold">OJT Completion</p>
                    <p className="text-sm font-bold">{row.progress}%</p>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500 group-hover:shadow-[0_0_18px_rgba(59,130,246,0.65)]"
                      style={{ width: `${row.progress}%` }}
                    />
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <MiniStat
                      label="Completed"
                      value={formatHours(row.completed)}
                    />
                    <MiniStat
                      label="Required"
                      value={formatHours(row.required)}
                    />
                    <MiniStat
                      label="Remaining"
                      value={formatHours(row.ready ? 0 : row.remaining)}
                    />
                  </div>
                </div>

                <div className="flex min-w-0 flex-col gap-2">
                  {row.evaluated ? (
                    <button
                      type="button"
                      disabled
                      className="rounded-2xl border border-green-500/20 bg-green-500/10 px-4 py-2.5 text-center text-sm font-semibold text-green-600"
                    >
                      Already Evaluated
                    </button>
                  ) : row.ready ? (
                    <Link
                      href="/critic/evaluations"
                      className="rounded-2xl bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground transition hover:scale-[1.02] hover:bg-primary/90"
                    >
                      Evaluate Student
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="rounded-2xl bg-muted px-4 py-2.5 text-center text-sm font-semibold text-muted-foreground"
                    >
                      Evaluation Locked
                    </button>
                  )}

                  <Link
                    href={`/critic/students/${row.student.id}`}
                    className="rounded-2xl border border-border bg-background px-4 py-2.5 text-center text-sm font-semibold transition hover:bg-muted"
                  >
                    View Full Record
                  </Link>

                  {row.evaluated ? (
                    <div className="mt-2 rounded-2xl border border-green-500/20 bg-green-500/10 p-3 text-xs text-green-600">
                      Evaluation has already been submitted for this student.
                    </div>
                  ) : !row.ready ? (
                    <div className="mt-2 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-600">
                      <div className="flex gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>
                          Needs {formatHours(row.remaining)} more approved
                          hours before evaluation.
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 rounded-2xl border border-primary/20 bg-primary/5 p-3 text-xs text-primary">
                      This student is ready and waiting for evaluation.
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {rows.length === 0 && (
          <div className="rounded-3xl border border-border bg-card py-14 text-center">
            <p className="text-sm font-semibold">No students found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try changing your search or sort filter.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-background p-3 text-center">
      <p className="truncate text-base font-bold">{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}