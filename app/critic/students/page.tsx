"use client"
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  AlertCircle,
  GraduationCap,
  Star,
} from "lucide-react";

// Types
type PageProps = { params: { studentId: string } };

// Helpers
function fullName(student?: any) {
  if (!student) return "-";
  return [student.first_name, student.middle_name, student.last_name, student.suffix]
    .filter(Boolean)
    .join(" ");
}

function getInitials(name: string) {
  if (!name) return "";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function resolveAvatarUrl(supabaseUrl: string, avatarUrl?: string) {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith("http")) return avatarUrl;
  return `${supabaseUrl}/storage/v1/object/public/profile-avatars/${avatarUrl.replace(/^\/+/, "")}`;
}

export default async function StudentDetailPage({ params }: PageProps) {
  const supabase = await createClient();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const studentId = params.studentId;

  // Fetch current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch critic
  const { data: critic } = await supabase
    .from("critics")
    .select("id, office_id")
    .eq("profile_id", user.id)
    .eq("status", "active")
    .single();

  if (!critic) redirect("/login");

  // Fetch student assignment + evaluation
  const { data: assignment, error } = await supabase
    .from("assignments")
    .select(`
      id,
      status,
      start_date,
      end_date,
      students:student_id (
        id,
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
      ),
      evaluations (
        id,
        practicum_grade,
        average_rating,
        assertiveness,
        tact_ethics,
        courtesy_ethics,
        accepts_criticism,
        written_communication,
        oral_communication,
        active_listening,
        learning_ability,
        computer_knowledge,
        potential_growth,
        sound_judgment,
        theory_integration,
        output_quality,
        task_timeliness,
        attire,
        decorum,
        self_confidence,
        enthusiasm,
        recommendation,
        submitted_at
      )
    `)
    .eq("office_id", critic.office_id)
    .eq("students.id", studentId)
    .single();

  if (error || !assignment) throw new Error("Student assignment not found.");

  // Safe extraction
  const student = assignment.students?.[0] ?? null;
  const profile = student?.profiles?.[0] ?? null;
  const batch = student?.batches?.[0] ?? null;
  const evaluation = assignment.evaluations?.[0] ?? null;

  // Plain object to pass to client
  const plainData = JSON.parse(JSON.stringify({
    assignment,
    student,
    profile,
    batch,
    evaluation,
  }));

  return <StudentDetailClient data={plainData} supabaseUrl={supabaseUrl} />;
}

// Client Component
function StudentDetailClient({ data, supabaseUrl }: any) {
  const { assignment, student, profile, batch, evaluation } = data;

  const name = fullName(student);
  const initials = getInitials(name);
  const completed = Number(student?.completed_hours ?? 0);
  const required = Number(student?.required_hours ?? 0);
  const remaining = Math.max(required - completed, 0);
  const progress = required > 0 ? Math.min(Math.round((completed / required) * 100), 100) : 0;
  const ready = completed >= required;
  const avatarUrl = resolveAvatarUrl(supabaseUrl, profile?.avatar_url);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <p className="text-sm text-muted-foreground">Student Overview</p>
        <h2 className="text-2xl font-semibold tracking-tight">{name}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {student?.student_number ?? "-"} • {batch?.course ?? "-"} • {batch?.name ?? "-"}
        </p>
      </div>

      {/* Avatar + Progress */}
      <div className="rounded-3xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 text-xl font-bold text-primary overflow-hidden">
            {avatarUrl ? <img src={avatarUrl} className="h-full w-full object-cover" /> : initials}
          </div>
          <div className="flex flex-col gap-1">
            <p className="font-semibold">{name}</p>
            <p className="text-sm text-muted-foreground">{student?.student_number}</p>
            <p className="text-xs text-muted-foreground">Completed: {completed} / {required} hours</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">OJT Completion</p>
            <p className="text-sm font-bold">{progress}%</p>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* MiniStats */}
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <MiniStat label="Completed" value={completed.toFixed(2)} />
          <MiniStat label="Required" value={required.toFixed(2)} />
          <MiniStat label="Remaining" value={ready ? "0.00" : remaining.toFixed(2)} />
        </div>

        {/* Evaluation */}
        {evaluation && <EvaluationDetails evaluation={evaluation} />}
        {!evaluation && !ready && (
          <div className="mt-2 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-600 flex gap-2 items-center">
            <AlertCircle className="h-4 w-4 shrink-0" /> Needs {remaining.toFixed(2)} more hours before evaluation.
          </div>
        )}
        {!evaluation && ready && (
          <div className="mt-2 rounded-2xl border border-primary/20 bg-primary/5 p-3 text-xs text-primary">
            Student ready for evaluation.
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

function EvaluationDetails({ evaluation }: any) {
  const factors = [
    "assertiveness",
    "tact_ethics",
    "courtesy_ethics",
    "accepts_criticism",
    "written_communication",
    "oral_communication",
    "active_listening",
    "learning_ability",
    "computer_knowledge",
    "potential_growth",
    "sound_judgment",
    "theory_integration",
    "output_quality",
    "task_timeliness",
    "attire",
    "decorum",
    "self_confidence",
    "enthusiasm",
  ];

  return (
    <div className="mt-4 rounded-2xl border border-green-500/20 bg-green-500/10 p-3 text-green-600 text-xs space-y-2">
      <p className="font-semibold">Practicum Grade: {evaluation?.practicum_grade}</p>
      <p className="font-semibold">Average Rating: {evaluation?.average_rating}</p>
      <p className="font-semibold">Recommendation: {evaluation?.recommendation}</p>
      <p className="font-semibold mt-2">Job Factors:</p>
      <ul className="list-disc list-inside space-y-1">
        {factors.map((f) => (
          <li key={f}>{f.replace(/_/g, " ")}: {evaluation[f]}</li>
        ))}
      </ul>
    </div>
  );
}