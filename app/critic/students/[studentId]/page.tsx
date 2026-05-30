import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  GraduationCap,
  Mail,
  Phone,
  ShieldCheck,
  Star,
  User,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{
    studentId: string;
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

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
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

function recommendationLabel(value: string) {
  return value.replace(/_/g, " ");
}

export default async function CriticStudentRecordPage({ params }: PageProps) {
  const { studentId } = await params;

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

  const { data: assignment, error } = await supabase
    .from("assignments")
    .select(
      `
      id,
      start_date,
      end_date,
      status,
      office_id,
      offices:office_id (
        id,
        name,
        address
      ),
      evaluations (
        id,
        overall_score,
        practicum_grade,
        recommendation,
        status,
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
        sex,
        age,
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
    `
    )
    .eq("student_id", studentId)
    .eq("office_id", critic.office_id)
    .in("status", ["active", "completed"])
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!assignment) redirect("/critic/students");

  const student = normalizeRelation((assignment as any).students);
  const office = normalizeRelation((assignment as any).offices);
  const evaluation = normalizeRelation((assignment as any).evaluations);

  if (!student) redirect("/critic/students");

  const profile = normalizeRelation((student as any).profiles);
  const batch = normalizeRelation((student as any).batches);

  const name = fullName(student);
  const completed = Number((student as any).completed_hours ?? 0);
  const required = Number((student as any).required_hours ?? 0);
  const remaining = Math.max(required - completed, 0);
  const progress =
    required > 0 ? Math.min(Math.round((completed / required) * 100), 100) : 0;

  const ready = completed >= required;
  const evaluated = Boolean(evaluation);
  const avatarUrl = resolveAvatarUrl(
    supabaseUrl,
    (profile as any)?.avatar_url
  );
  const initials = getInitials(name);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link
            href="/critic/students"
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to My Students
          </Link>

          <p className="text-sm text-muted-foreground">Student Record</p>
          <h2 className="text-2xl font-semibold tracking-tight">
            Full Student Monitoring Record
          </h2>
        </div>

        {evaluated ? (
          <button
            disabled
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-green-500/20 bg-green-500/10 px-5 py-3 text-sm font-semibold text-green-600"
          >
            <ShieldCheck className="h-4 w-4" />
            Already Evaluated
          </button>
        ) : ready ? (
          <Link
            href="/critic/evaluations"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:scale-[1.02] hover:bg-primary/90"
          >
            <ClipboardCheck className="h-4 w-4" />
            Evaluate Student
          </Link>
        ) : (
          <button
            disabled
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-muted px-5 py-3 text-sm font-semibold text-muted-foreground"
          >
            <Clock className="h-4 w-4" />
            Evaluation Locked
          </button>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <div className="rounded-3xl border border-border bg-card p-6">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-3xl bg-primary/10 text-4xl font-bold text-primary ring-1 ring-primary/20">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>{initials || <User className="h-10 w-10" />}</span>
              )}
            </div>

            <h3 className="mt-5 text-xl font-bold">{name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {(student as any).student_number}
            </p>

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {evaluated ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-green-500/10 px-4 py-2 text-sm font-medium text-green-600">
                  <ShieldCheck className="h-4 w-4" />
                  Evaluated
                </span>
              ) : ready ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                  <CheckCircle2 className="h-4 w-4" />
                  Ready for Evaluation
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-600">
                  <AlertCircle className="h-4 w-4" />
                  In Progress
                </span>
              )}
            </div>
          </div>

          <div className="mt-6 space-y-3 border-t border-border pt-5 text-sm">
            <InfoLine
              icon={<Mail className="h-4 w-4" />}
              value={(student as any).email ?? "No email"}
            />
            <InfoLine
              icon={<Phone className="h-4 w-4" />}
              value={(student as any).phone ?? "No phone"}
            />
            <InfoLine
              icon={<Building2 className="h-4 w-4" />}
              value={(office as any)?.name ?? "No office"}
            />
            <InfoLine
              icon={<CalendarDays className="h-4 w-4" />}
              value={`Started: ${(assignment as any).start_date ?? "Not set"}`}
            />
          </div>
        </div>

        <div className="space-y-6">
          {evaluated && (
            <div className="rounded-3xl border border-green-500/20 bg-green-500/10 p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-500/10 text-green-600">
                  <ShieldCheck className="h-5 w-5" />
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-green-700">
                    Evaluation Submitted
                  </h3>
                  <p className="text-sm text-green-700/80">
                    This student already has a submitted evaluation record.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <StatCard
                  label="Practicum Grade"
                  value={
                    (evaluation as any)?.practicum_grade !== null &&
                    (evaluation as any)?.practicum_grade !== undefined
                      ? Number((evaluation as any).practicum_grade).toFixed(2)
                      : "N/A"
                  }
                />
                <StatCard
                  label="Rubric Score"
                  value={
                    (evaluation as any)?.overall_score !== null &&
                    (evaluation as any)?.overall_score !== undefined
                      ? Number((evaluation as any).overall_score).toFixed(2)
                      : "N/A"
                  }
                />
                <StatCard
                  label="Recommendation"
                  value={recommendationLabel(
                    (evaluation as any)?.recommendation ?? "submitted"
                  )}
                />
              </div>

              <p className="mt-4 text-xs text-green-700/80">
                Submitted:{" "}
                {(evaluation as any)?.submitted_at
                  ? new Date((evaluation as any).submitted_at).toLocaleString()
                  : "Date unavailable"}
              </p>
            </div>
          )}

          <div className="rounded-3xl border border-border bg-card p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">OJT Hour Progress</h3>
                <p className="text-sm text-muted-foreground">
                  Required hours are locked from the student database record.
                </p>
              </div>

              <p className="text-2xl font-bold text-primary">{progress}%</p>
            </div>

            <div className="h-4 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <StatCard label="Completed Hours" value={formatHours(completed)} />
              <StatCard label="Required Hours" value={formatHours(required)} />
              <StatCard label="Remaining Hours" value={formatHours(remaining)} />
            </div>

            {!evaluated && ready && (
              <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-primary">
                This student has completed the required OJT hours and is ready
                for your evaluation.
              </div>
            )}

            {!ready && (
              <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-600">
                This student still needs {formatHours(remaining)} more approved
                hour{remaining === 1 ? "" : "s"} before evaluation can be
                submitted.
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-border bg-card p-6">
            <h3 className="text-lg font-semibold">Student Details</h3>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Detail label="Course" value={(batch as any)?.course ?? "-"} />
              <Detail label="Batch" value={(batch as any)?.name ?? "-"} />
              <Detail label="Sex" value={(student as any).sex ?? "-"} />
              <Detail label="Age" value={(student as any).age ?? "-"} />
              <Detail
                label="Student Status"
                value={(student as any).status ?? "-"}
              />
              <Detail
                label="Assignment Status"
                value={(assignment as any).status ?? "-"}
              />
              <Detail
                label="Start Date"
                value={(assignment as any).start_date ?? "-"}
              />
              <Detail
                label="End Date"
                value={(assignment as any).end_date ?? "-"}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoLine({
  icon,
  value,
}: {
  icon: React.ReactNode;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 text-muted-foreground">
      {icon}
      <span className="min-w-0 truncate">{value}</span>
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4 text-center">
      <p className="text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold capitalize">{value}</p>
    </div>
  );
}