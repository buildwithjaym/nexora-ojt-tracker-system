
import { redirect } from "next/navigation";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

function fullName(person: any) {
  return [person?.first_name, person?.middle_name, person?.last_name, person?.suffix]
    .filter(Boolean)
    .join(" ");
}

export default async function CriticDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: critic } = await supabase
    .from("critics")
    .select("id, office_id")
    .eq("profile_id", user.id)
    .single();

  if (!critic) redirect("/login");

  const { data: assignments, error } = await supabase
    .from("assignments")
    .select(`
      id,
      status,
      office_id,
      students (
        id,
        first_name,
        middle_name,
        last_name,
        suffix,
        student_number,
        completed_hours,
        required_hours,
        status
      )
    `)
    .eq("office_id", critic.office_id)
    .in("status", ["active", "completed"]);

  if (error) throw new Error(error.message);

  const rows = assignments ?? [];

  // Serialize all data to plain objects
  const normalizedRows = rows.map((row: any) => {
    const student = Array.isArray(row.students) ? row.students[0] : row.students;
    const completed = Number(student?.completed_hours ?? 0);
    const required = Number(student?.required_hours ?? 0);
    const progress = required > 0 ? Math.min(Math.round((completed / required) * 100), 100) : 0;

    return JSON.parse(JSON.stringify({
      ...row,
      student,
      completed,
      required,
      progress,
      ready: completed >= required,
    }));
  });

  const assignedStudents = normalizedRows.length;
  const readyForEvaluation = normalizedRows.filter((row) => row.ready).length;
  const inProgressStudents = normalizedRows.filter((row) => !row.ready).length;

  const { count: submittedEvaluations } = await supabase
    .from("evaluations")
    .select("id", { count: "exact", head: true })
    .eq("critic_id", critic.id);

  const averageProgress =
    assignedStudents > 0
      ? Math.round(normalizedRows.reduce((sum, row) => sum + row.progress, 0) / assignedStudents)
      : 0;

  const topReadyStudents = normalizedRows.filter((row) => row.ready).slice(0, 5);
  const inProgressList = normalizedRows
    .filter((row) => !row.ready)
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm text-muted-foreground">Dashboard</p>
        <h2 className="text-2xl font-semibold tracking-tight">Critic Evaluation Dashboard</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          See who is ready, who is still completing hours, and where your action is needed.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          key="summary-assigned"
          title="Assigned Students"
          value={assignedStudents}
          helper="Students assigned to your office"
          icon={<Users className="h-5 w-5" />}
        />
        <SummaryCard
          key="summary-ready"
          title="Ready for Evaluation"
          value={readyForEvaluation}
          helper="Completed required hours"
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <SummaryCard
          key="summary-progress"
          title="In Progress"
          value={inProgressStudents}
          helper="Still completing OJT hours"
          icon={<Clock className="h-5 w-5" />}
        />
        <SummaryCard
          key="summary-submitted"
          title="Submitted Evaluations"
          value={submittedEvaluations ?? 0}
          helper="Evaluations already submitted"
          icon={<ClipboardCheck className="h-5 w-5" />}
        />
      </div>

      {/* Progress & Ready Panels */}
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        {/* OJT Progress Overview */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">OJT Progress Overview</h3>
              <p className="text-sm text-muted-foreground">
                Current completion progress of your assigned students.
              </p>
            </div>
            <div className="rounded-2xl bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
              Avg. {averageProgress}%
            </div>
          </div>

          <div className="space-y-4">
            {normalizedRows.slice(0, 8).map((row) => (
              <div key={`progress-${row.id}`} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{fullName(row.student)}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.completed} / {row.required} hours
                    </p>
                  </div>
                  <p className="text-sm font-semibold">{row.progress}%</p>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${row.progress}%` }} />
                </div>
              </div>
            ))}
            {normalizedRows.length === 0 && (
              <div className="py-10 text-center text-sm text-muted-foreground">No assigned students yet.</div>
            )}
          </div>
        </div>

        {/* Ready & In Progress */}
        <div className="space-y-6">
          {/* Ready Now */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-semibold">Ready Now</h3>
            </div>
            <div className="space-y-3">
              {topReadyStudents.length > 0 ? (
                topReadyStudents.map((row) => (
                  <div key={`ready-${row.id}`} className="rounded-2xl border border-border bg-background p-4">
                    <p className="font-semibold">{fullName(row.student)}</p>
                    <p className="text-sm text-muted-foreground">{row.student?.student_number}</p>
                    <p className="mt-2 text-xs font-medium text-green-600">Ready for evaluation</p>
                  </div>
                ))
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No student is ready for evaluation yet.
                </p>
              )}
            </div>
          </div>

          {/* Closest to Completion */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <h3 className="text-lg font-semibold">Closest to Completion</h3>
            </div>
            <div className="space-y-3">
              {inProgressList.length > 0 ? (
                inProgressList.map((row) => (
                  <div key={`inprogress-${row.id}`} className="rounded-2xl border border-border bg-background p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{fullName(row.student)}</p>
                      <p className="text-sm font-semibold">{row.progress}%</p>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Needs {Math.max(row.required - row.completed, 0)} more hours
                    </p>
                  </div>
                ))
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No pending students. Everyone is ready or completed.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Summary */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Action Summary</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <ActionBox title="Evaluate now" value={readyForEvaluation} description="Students can already be evaluated." />
          <ActionBox title="Monitor" value={inProgressStudents} description="Students still need more approved hours." />
          <ActionBox title="Completion rate" value={`${averageProgress}%`} description="Average OJT hour completion." />
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, helper, icon }: { title: string; value: number; helper: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">{icon}</div>
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
    </div>
  );
}

function ActionBox({ title, value, description }: { title: string; value: number | string; description: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}