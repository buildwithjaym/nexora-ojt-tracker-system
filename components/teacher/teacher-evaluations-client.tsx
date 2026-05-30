"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  Search,
  Star,
  TrendingDown,
  Users,
  X,
} from "lucide-react";

type Evaluation = {
  id: string;
  assignment_id: string;
  student_id: string;
  critic_id: string;
  office_id: string;
  attendance_score: number;
  work_quality_score: number;
  professionalism_score: number;
  communication_score: number;
  initiative_score: number;
  overall_score: number;
  practicum_grade: number | null;
  strengths: string | null;
  improvement_areas: string | null;
  general_comment: string | null;
  recommendation:
    | "highly_recommended"
    | "recommended"
    | "needs_improvement"
    | "not_recommended";
  status: "draft" | "submitted" | "returned" | "approved";
  submitted_at: string;
};

type EvaluationRow = {
  assignment: {
    id: string;
    status: string;
    assigned_hours: number | null;
  };
  student: {
    id: string;
    student_number: string | null;
    first_name: string;
    middle_name: string | null;
    last_name: string;
    required_hours: number;
    completed_hours: number;
    status: string;
  };
  office: {
    id: string;
    name: string;
  };
  evaluation: Evaluation | null;
  critic: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    position: string | null;
  } | null;
};

type Props = {
  teacherName: string;
  rows: EvaluationRow[];
};

type SortMode =
  | "evaluated_first"
  | "pending_first"
  | "needs_review_first"
  | "highest_score"
  | "lowest_score"
  | "student_name";

function fullName(row: EvaluationRow) {
  return `${row.student.last_name}, ${row.student.first_name}`;
}

function formatDate(value?: string | null) {
  if (!value) return "Not yet submitted";

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function recommendationLabel(value?: string | null) {
  if (!value) return "Pending";
  return value.replaceAll("_", " ");
}

function getRiskLevel(row: EvaluationRow) {
  if (!row.evaluation) return "pending";

  if (
    row.evaluation.recommendation === "needs_improvement" ||
    row.evaluation.recommendation === "not_recommended" ||
    Number(row.evaluation.overall_score) < 3
  ) {
    return "at-risk";
  }

  return "good";
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const percent = Math.min(Math.max((value / 5) * 100, 0), 100);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{value}/5</span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function StatusBadge({ row }: { row: EvaluationRow }) {
  const risk = getRiskLevel(row);

  if (risk === "pending") {
    return (
      <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-500">
        Pending Evaluation
      </span>
    );
  }

  if (risk === "at-risk") {
    return (
      <span className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-500">
        Needs Review
      </span>
    );
  }

  return (
    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-500">
      Evaluated
    </span>
  );
}

function EvaluationModal({
  row,
  onClose,
}: {
  row: EvaluationRow;
  onClose: () => void;
}) {
  const evaluation = row.evaluation;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
        aria-label="Close modal"
      />

      <div className="relative z-10 max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-[2rem] border border-border bg-background shadow-2xl animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <p className="text-sm text-muted-foreground">Evaluation Review</p>
            <h2 className="text-xl font-semibold">{fullName(row)}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {row.student.student_number ?? "No student number"} ·{" "}
              {row.office.name}
            </p>
          </div>

          <button
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card transition hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[calc(92vh-90px)] overflow-y-auto p-5">
          {!evaluation ? (
            <div className="rounded-3xl border border-dashed border-border bg-card p-8 text-center">
              <AlertTriangle className="mx-auto h-8 w-8 text-amber-500" />
              <h3 className="mt-3 text-lg font-semibold">
                No evaluation submitted yet
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                This student is still waiting for critic evaluation. Keep this
                visible for follow-up.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-2xl border border-border bg-card p-4">
                  <Star className="h-4 w-4 text-primary" />
                  <p className="mt-2 text-2xl font-semibold">
                    {Number(evaluation.overall_score).toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">Overall Score</p>
                </div>

                <div className="rounded-2xl border border-border bg-card p-4">
                  <ClipboardCheck className="h-4 w-4 text-primary" />
                  <p className="mt-2 text-2xl font-semibold">
                    {evaluation.practicum_grade ?? "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Practicum Grade
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-card p-4">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <p className="mt-2 text-sm font-semibold capitalize">
                    {recommendationLabel(evaluation.recommendation)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Recommendation
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-card p-4">
                  <Users className="h-4 w-4 text-primary" />
                  <p className="mt-2 text-sm font-semibold">
                    {row.critic
                      ? `${row.critic.first_name} ${row.critic.last_name}`
                      : "No critic data"}
                  </p>
                  <p className="text-xs text-muted-foreground">Critic</p>
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
                <section className="rounded-3xl border border-border bg-card p-5">
                  <h3 className="font-semibold">Score Breakdown</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Use this to quickly identify weak areas.
                  </p>

                  <div className="mt-5 space-y-4">
                    <ScoreBar
                      label="Attendance"
                      value={evaluation.attendance_score}
                    />
                    <ScoreBar
                      label="Work Quality"
                      value={evaluation.work_quality_score}
                    />
                    <ScoreBar
                      label="Professionalism"
                      value={evaluation.professionalism_score}
                    />
                    <ScoreBar
                      label="Communication"
                      value={evaluation.communication_score}
                    />
                    <ScoreBar
                      label="Initiative"
                      value={evaluation.initiative_score}
                    />
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="rounded-3xl border border-border bg-card p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Strengths
                    </p>
                    <p className="mt-2 text-sm leading-6">
                      {evaluation.strengths || "No strengths provided."}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-border bg-card p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Areas for Improvement
                    </p>
                    <p className="mt-2 text-sm leading-6">
                      {evaluation.improvement_areas ||
                        "No improvement areas provided."}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-border bg-card p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      General Comment
                    </p>
                    <p className="mt-2 text-sm leading-6">
                      {evaluation.general_comment ||
                        "No general comment provided."}
                    </p>
                  </div>
                </section>
              </div>

              <div className="rounded-3xl border border-border bg-muted/40 p-5">
                <p className="text-sm font-semibold">Teacher Guidance</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {getRiskLevel(row) === "at-risk"
                    ? "This student may need adviser follow-up. Review the weak score areas and consider intervention or consultation."
                    : "This evaluation is acceptable. Review the feedback and keep the student’s progress documented."}
                </p>
              </div>

              <p className="text-xs text-muted-foreground">
                Submitted on {formatDate(evaluation.submitted_at)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function TeacherEvaluationsClient({ teacherName, rows }: Props) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortMode>("evaluated_first");
  const [selectedRow, setSelectedRow] = useState<EvaluationRow | null>(null);

  const evaluated = rows.filter((row) => row.evaluation).length;
  const pending = rows.length - evaluated;
  const atRisk = rows.filter((row) => getRiskLevel(row) === "at-risk").length;

  const filteredRows = useMemo(() => {
    const keyword = search.toLowerCase();

    const searched = rows.filter((row) => {
      const value = `
        ${row.student.first_name}
        ${row.student.last_name}
        ${row.student.student_number ?? ""}
        ${row.office.name}
        ${row.evaluation?.recommendation ?? ""}
      `.toLowerCase();

      return value.includes(keyword);
    });

    return [...searched].sort((a, b) => {
      if (sortBy === "evaluated_first") {
        return Number(Boolean(b.evaluation)) - Number(Boolean(a.evaluation));
      }

      if (sortBy === "pending_first") {
        return Number(!b.evaluation) - Number(!a.evaluation);
      }

      if (sortBy === "needs_review_first") {
        return (
          Number(getRiskLevel(b) === "at-risk") -
          Number(getRiskLevel(a) === "at-risk")
        );
      }

      if (sortBy === "highest_score") {
        return (
          Number(b.evaluation?.overall_score ?? -1) -
          Number(a.evaluation?.overall_score ?? -1)
        );
      }

      if (sortBy === "lowest_score") {
        return (
          Number(a.evaluation?.overall_score ?? 999) -
          Number(b.evaluation?.overall_score ?? 999)
        );
      }

      return fullName(a).localeCompare(fullName(b));
    });
  }, [rows, search, sortBy]);

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="pointer-events-none absolute -left-20 top-0 h-44 w-44 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{teacherName}</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Evaluations
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Review critic evaluations, practicum grades, feedback, and
              students who may need adviser intervention.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-border bg-background p-4">
              <Users className="h-4 w-4 text-primary" />
              <p className="mt-2 text-2xl font-semibold">{rows.length}</p>
              <p className="text-xs text-muted-foreground">Assigned</p>
            </div>

            <div className="rounded-2xl border border-border bg-background p-4">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <p className="mt-2 text-2xl font-semibold">{evaluated}</p>
              <p className="text-xs text-muted-foreground">Evaluated</p>
            </div>

            <div className="rounded-2xl border border-border bg-background p-4">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <p className="mt-2 text-2xl font-semibold">{pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>

            <div className="rounded-2xl border border-border bg-background p-4">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <p className="mt-2 text-2xl font-semibold">{atRisk}</p>
              <p className="text-xs text-muted-foreground">Needs Review</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="font-medium">Student Evaluation List</p>
            <p className="text-xs text-muted-foreground">
              Evaluated students are shown first by default. Use Sort By to
              change the view.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortMode)}
              className="h-11 rounded-2xl border border-border bg-background px-4 text-sm outline-none transition focus:ring-2 focus:ring-primary/20"
            >
              <option value="evaluated_first">Evaluated first</option>
              <option value="pending_first">Pending first</option>
              <option value="needs_review_first">Needs review first</option>
              <option value="highest_score">Highest score</option>
              <option value="lowest_score">Lowest score</option>
              <option value="student_name">Student name</option>
            </select>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search student, office..."
                className="h-11 w-full rounded-2xl border border-border bg-background pl-9 pr-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/20 sm:w-72"
              />
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          {filteredRows.length > 0 ? (
            filteredRows.map((row) => (
              <div
                key={row.assignment.id}
                className="grid gap-4 rounded-3xl border border-border bg-background p-4 transition duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg lg:grid-cols-[1.2fr_1fr_1fr_auto]"
              >
                <div>
                  <p className="font-semibold">{fullName(row)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.student.student_number ?? "No student number"} ·{" "}
                    {row.office.name}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Score</p>
                  <p className="mt-1 text-sm font-semibold">
                    {row.evaluation
                      ? Number(row.evaluation.overall_score).toFixed(2)
                      : "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Submitted</p>
                  <p className="mt-1 text-sm font-semibold">
                    {formatDate(row.evaluation?.submitted_at)}
                  </p>
                </div>

                <div className="flex flex-col gap-3 lg:items-end">
                  <StatusBadge row={row} />

                  <button
                    type="button"
                    onClick={() => setSelectedRow(row)}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:scale-[1.02] hover:bg-primary/90 active:scale-[0.98]"
                  >
                    <Eye className="h-4 w-4" />
                    View Details
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-border bg-background p-8 text-center">
              <p className="font-medium">No evaluations found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try changing the search keyword or sort option.
              </p>
            </div>
          )}
        </div>
      </section>

      {selectedRow && (
        <EvaluationModal row={selectedRow} onClose={() => setSelectedRow(null)} />
      )}
    </div>
  );
}