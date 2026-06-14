"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  Mail,
  Search,
  Star,
  TrendingDown,
  UserRoundCheck,
  Users,
  X,
} from "lucide-react";

type Recommendation =
  | "highly_recommended"
  | "recommended"
  | "needs_improvement"
  | "not_recommended";

type EvaluationStatus = "draft" | "submitted" | "returned" | "approved";

type RatingField =
  | "assertiveness"
  | "tact_ethics"
  | "courtesy_ethics"
  | "accepts_criticism"
  | "written_communication"
  | "oral_communication"
  | "active_listening"
  | "learning_ability"
  | "computer_knowledge"
  | "potential_growth"
  | "sound_judgment"
  | "theory_integration"
  | "output_quality"
  | "task_timeliness"
  | "attire"
  | "decorum"
  | "self_confidence"
  | "enthusiasm";

export type Evaluation = {
  id: string;
  assignment_id: string;
  student_id: string;
  critic_id: string;
  office_id: string;
  strengths: string | null;
  improvement_areas: string | null;
  general_comment: string | null;
  recommendation: Recommendation;
  status: EvaluationStatus;
  submitted_at: string;
  created_at: string;
  updated_at: string;
  assertiveness: number;
  tact_ethics: number;
  courtesy_ethics: number;
  accepts_criticism: number;
  written_communication: number;
  oral_communication: number;
  active_listening: number;
  learning_ability: number;
  computer_knowledge: number;
  potential_growth: number;
  sound_judgment: number;
  theory_integration: number;
  output_quality: number;
  task_timeliness: number;
  attire: number;
  decorum: number;
  self_confidence: number;
  enthusiasm: number;
  average_rating: number | string | null;
};

export type EvaluationRow = {
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

type EvaluationState =
  | "pending"
  | "draft"
  | "returned"
  | "at-risk"
  | "approved"
  | "evaluated";

const NEEDS_REVIEW_THRESHOLD = 75;

const EVALUATION_GROUPS: ReadonlyArray<{
  title: string;
  description: string;
  fields: ReadonlyArray<{ key: RatingField; label: string }>;
}> = [
  {
    title: "Professional Conduct",
    description: "Behavior, ethics, courtesy, and response to feedback.",
    fields: [
      { key: "assertiveness", label: "Assertiveness" },
      { key: "tact_ethics", label: "Tact and Ethics" },
      { key: "courtesy_ethics", label: "Courtesy and Ethics" },
      { key: "accepts_criticism", label: "Accepts Criticism" },
    ],
  },
  {
    title: "Communication",
    description: "Written, oral, and listening competence.",
    fields: [
      { key: "written_communication", label: "Written Communication" },
      { key: "oral_communication", label: "Oral Communication" },
      { key: "active_listening", label: "Active Listening" },
    ],
  },
  {
    title: "Learning and Judgment",
    description: "Ability to learn, apply knowledge, and make decisions.",
    fields: [
      { key: "learning_ability", label: "Learning Ability" },
      { key: "computer_knowledge", label: "Computer Knowledge" },
      { key: "potential_growth", label: "Potential for Growth" },
      { key: "sound_judgment", label: "Sound Judgment" },
      { key: "theory_integration", label: "Theory Integration" },
    ],
  },
  {
    title: "Work Performance",
    description: "Quality and timeliness of assigned work.",
    fields: [
      { key: "output_quality", label: "Output Quality" },
      { key: "task_timeliness", label: "Task Timeliness" },
    ],
  },
  {
    title: "Personal Presentation",
    description: "Professional appearance, confidence, and engagement.",
    fields: [
      { key: "attire", label: "Attire" },
      { key: "decorum", label: "Decorum" },
      { key: "self_confidence", label: "Self-Confidence" },
      { key: "enthusiasm", label: "Enthusiasm" },
    ],
  },
];

function fullName(row: EvaluationRow) {
  return `${row.student.last_name}, ${row.student.first_name}`;
}

function criticFullName(row: EvaluationRow) {
  if (!row.critic) return "No critic data";
  return `${row.critic.first_name} ${row.critic.last_name}`;
}

function formatDate(value?: string | null) {
  if (!value) return "Not yet submitted";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function titleCaseDatabaseValue(value?: string | null) {
  if (!value) return "Pending";

  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getAverageRating(evaluation?: Evaluation | null) {
  if (!evaluation) return null;

  const value = Number(evaluation.average_rating);
  return Number.isFinite(value) ? value : null;
}

function isSubmittedEvaluation(evaluation?: Evaluation | null) {
  return Boolean(evaluation && evaluation.status !== "draft");
}

function getEvaluationState(row: EvaluationRow): EvaluationState {
  const evaluation = row.evaluation;

  if (!evaluation) return "pending";
  if (evaluation.status === "draft") return "draft";
  if (evaluation.status === "returned") return "returned";
  if (evaluation.status === "approved") return "approved";

  const average = getAverageRating(evaluation);
  const recommendationNeedsReview =
    evaluation.recommendation === "needs_improvement" ||
    evaluation.recommendation === "not_recommended";

  if (
    recommendationNeedsReview ||
    (average !== null && average < NEEDS_REVIEW_THRESHOLD)
  ) {
    return "at-risk";
  }

  return "evaluated";
}

function getGroupAverage(
  evaluation: Evaluation,
  fields: readonly RatingField[],
) {
  const total = fields.reduce(
    (sum, field) => sum + Number(evaluation[field]),
    0,
  );
  return total / fields.length;
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const safeValue = Math.min(Math.max(Number(value), 0), 100);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="shrink-0 font-semibold tabular-nums">{value}</span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
}

function StatusBadge({ row }: { row: EvaluationRow }) {
  const state = getEvaluationState(row);

  if (state === "pending") {
    return (
      <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
        Pending Evaluation
      </span>
    );
  }

  if (state === "draft") {
    return (
      <span className="rounded-full border border-slate-500/20 bg-slate-500/10 px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
        Draft Evaluation
      </span>
    );
  }

  if (state === "returned") {
    return (
      <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-600 dark:text-orange-400">
        Returned
      </span>
    );
  }

  if (state === "at-risk") {
    return (
      <span className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-600 dark:text-red-400">
        Needs Review
      </span>
    );
  }

  if (state === "approved") {
    return (
      <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
        Approved
      </span>
    );
  }

  return (
    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
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
  const averageRating = getAverageRating(evaluation);
  const evaluationState = getEvaluationState(row);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="evaluation-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
        aria-label="Close evaluation modal"
      />

      <div className="relative z-10 max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-[2rem] border border-border bg-background shadow-2xl animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <p className="text-sm text-muted-foreground">Evaluation Review</p>
            <h2 id="evaluation-modal-title" className="text-xl font-semibold">
              {fullName(row)}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {row.student.student_number ?? "No student number"} ·{" "}
              {row.office.name}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card transition hover:bg-muted"
            aria-label="Close evaluation modal"
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
                This student is still waiting for a critic evaluation. The
                assignment remains visible so the teacher can monitor it.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-border bg-card p-4">
                  <Star className="h-4 w-4 text-primary" />
                  <p className="mt-2 text-2xl font-semibold tabular-nums">
                    {averageRating !== null ? averageRating.toFixed(2) : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Average Rating
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-card p-4">
                  <ClipboardCheck className="h-4 w-4 text-primary" />
                  <p className="mt-2 text-sm font-semibold">
                    {titleCaseDatabaseValue(evaluation.status)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Evaluation Status
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-card p-4">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <p className="mt-2 text-sm font-semibold">
                    {titleCaseDatabaseValue(evaluation.recommendation)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Recommendation
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-card p-4">
                  <Users className="h-4 w-4 text-primary" />
                  <p className="mt-2 text-sm font-semibold">
                    {criticFullName(row)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {row.critic?.position || "Critic"}
                  </p>
                </div>
              </div>

              {row.critic?.email && (
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <UserRoundCheck className="h-4 w-4" />
                    Evaluated by {criticFullName(row)}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {row.critic.email}
                  </span>
                </div>
              )}

              <div className="grid gap-5 lg:grid-cols-[1.25fr_0.85fr]">
                <section className="rounded-3xl border border-border bg-card p-5">
                  <h3 className="font-semibold">Score Breakdown</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    All 18 ratings are loaded directly from the evaluation
                    record. Allowed database values are 70 to 95.
                  </p>

                  <div className="mt-5 space-y-5">
                    {EVALUATION_GROUPS.map((group) => {
                      const groupAverage = getGroupAverage(
                        evaluation,
                        group.fields.map((field) => field.key),
                      );

                      return (
                        <div
                          key={group.title}
                          className="rounded-2xl border border-border bg-background p-4"
                        >
                          <div className="mb-4 flex items-start justify-between gap-4">
                            <div>
                              <p className="text-sm font-semibold">
                                {group.title}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {group.description}
                              </p>
                            </div>
                            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary tabular-nums">
                              {groupAverage.toFixed(2)}
                            </span>
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2">
                            {group.fields.map((field) => (
                              <ScoreBar
                                key={field.key}
                                label={field.label}
                                value={evaluation[field.key]}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="rounded-3xl border border-border bg-card p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Strengths
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                      {evaluation.strengths || "No strengths provided."}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-border bg-card p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Areas for Improvement
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                      {evaluation.improvement_areas ||
                        "No improvement areas provided."}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-border bg-card p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      General Comment
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                      {evaluation.general_comment ||
                        "No general comment provided."}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-border bg-muted/40 p-5">
                    <p className="text-sm font-semibold">Teacher Guidance</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {evaluationState === "at-risk" ||
                      evaluationState === "returned"
                        ? "This evaluation requires teacher review. Check the lowest criteria, the critic comments, and the recommendation before deciding on the appropriate follow-up."
                        : evaluationState === "draft"
                          ? "This record is still marked as draft. Treat its scores and comments as incomplete until the critic submits the evaluation."
                          : "The evaluation has been submitted. Review the detailed scores and preserve the critic feedback as part of the student’s practicum record."}
                    </p>
                  </div>
                </section>
              </div>

              <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span>Submitted on {formatDate(evaluation.submitted_at)}</span>
                <span>Last updated {formatDate(evaluation.updated_at)}</span>
              </div>
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

  const evaluated = rows.filter((row) =>
    isSubmittedEvaluation(row.evaluation),
  ).length;
  const pending = rows.length - evaluated;
  const atRisk = rows.filter((row) => {
    const state = getEvaluationState(row);
    return state === "at-risk" || state === "returned";
  }).length;

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    const searched = rows.filter((row) => {
      const value = `
        ${row.student.first_name}
        ${row.student.middle_name ?? ""}
        ${row.student.last_name}
        ${row.student.student_number ?? ""}
        ${row.office.name}
        ${row.critic?.first_name ?? ""}
        ${row.critic?.last_name ?? ""}
        ${row.evaluation?.recommendation ?? ""}
        ${row.evaluation?.status ?? ""}
      `.toLowerCase();

      return value.includes(keyword);
    });

    return [...searched].sort((a, b) => {
      if (sortBy === "evaluated_first") {
        return (
          Number(isSubmittedEvaluation(b.evaluation)) -
          Number(isSubmittedEvaluation(a.evaluation))
        );
      }

      if (sortBy === "pending_first") {
        return (
          Number(!isSubmittedEvaluation(b.evaluation)) -
          Number(!isSubmittedEvaluation(a.evaluation))
        );
      }

      if (sortBy === "needs_review_first") {
        const bNeedsReview = ["at-risk", "returned"].includes(
          getEvaluationState(b),
        );
        const aNeedsReview = ["at-risk", "returned"].includes(
          getEvaluationState(a),
        );

        return Number(bNeedsReview) - Number(aNeedsReview);
      }

      if (sortBy === "highest_score") {
        return (
          (getAverageRating(b.evaluation) ?? -1) -
          (getAverageRating(a.evaluation) ?? -1)
        );
      }

      if (sortBy === "lowest_score") {
        return (
          (getAverageRating(a.evaluation) ?? 999) -
          (getAverageRating(b.evaluation) ?? 999)
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
              Review critic evaluations, detailed competency ratings, feedback,
              and students who may need adviser intervention.
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
              Submitted evaluations are shown first by default. Draft and
              missing evaluations remain visible for monitoring.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortMode)}
              className="h-11 rounded-2xl border border-border bg-background px-4 text-sm outline-none transition focus:ring-2 focus:ring-primary/20"
              aria-label="Sort evaluations"
            >
              <option value="evaluated_first">Evaluated first</option>
              <option value="pending_first">Pending first</option>
              <option value="needs_review_first">Needs review first</option>
              <option value="highest_score">Highest rating</option>
              <option value="lowest_score">Lowest rating</option>
              <option value="student_name">Student name</option>
            </select>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search student, office, critic..."
                className="h-11 w-full rounded-2xl border border-border bg-background pl-9 pr-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/20 sm:w-72"
                aria-label="Search evaluations"
              />
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          {filteredRows.length > 0 ? (
            filteredRows.map((row) => {
              const averageRating = getAverageRating(row.evaluation);

              return (
                <div
                  key={row.assignment.id}
                  className="grid gap-4 rounded-3xl border border-border bg-background p-4 transition duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg lg:grid-cols-[1.2fr_0.75fr_0.9fr_auto]"
                >
                  <div>
                    <p className="font-semibold">{fullName(row)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {row.student.student_number ?? "No student number"} ·{" "}
                      {row.office.name}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">
                      Average Rating
                    </p>
                    <p className="mt-1 text-sm font-semibold tabular-nums">
                      {averageRating !== null ? averageRating.toFixed(2) : "—"}
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
              );
            })
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
        <EvaluationModal
          row={selectedRow}
          onClose={() => setSelectedRow(null)}
        />
      )}
    </div>
  );
}
