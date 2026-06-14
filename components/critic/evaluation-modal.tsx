"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { ClipboardCheck, GraduationCap, X } from "lucide-react";
import { toast } from "sonner";

import {
  submitEvaluation,
  type SubmittedEvaluation,
} from "@/app/critic/evaluations/actions";

const MIN_SCORE = 70;
const MAX_SCORE = 95;

const scoreNames = [
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
] as const;

type ScoreName = (typeof scoreNames)[number];
type ScoreState = Record<ScoreName, string>;

type Props = {
  assignmentId: string;
  studentId: string;
  studentName: string;
  onSubmitted?: (evaluation: SubmittedEvaluation) => void;
};

type EvaluationItem = {
  name: ScoreName;
  label: string;
};

type EvaluationSection = {
  title: string;
  items: EvaluationItem[];
};

const evaluationSections: EvaluationSection[] = [
  {
    title: "Interpersonal Skills",
    items: [
      {
        name: "assertiveness",
        label: "Approaches new tasks with appropriate confidence and initiative.",
      },
      {
        name: "tact_ethics",
        label: "Works with supervisors and peers with tact and consideration.",
      },
      {
        name: "courtesy_ethics",
        label: "Maintains courtesy and professional ethics.",
      },
      {
        name: "accepts_criticism",
        label: "Receives feedback positively and applies it constructively.",
      },
    ],
  },
  {
    title: "Communication Skills",
    items: [
      {
        name: "written_communication",
        label: "Communicates ideas clearly in writing.",
      },
      {
        name: "oral_communication",
        label: "Communicates ideas clearly in conversation and presentations.",
      },
      {
        name: "active_listening",
        label: "Listens attentively and responds appropriately.",
      },
    ],
  },
  {
    title: "Technical Skills",
    items: [
      {
        name: "learning_ability",
        label: "Learns unfamiliar tasks and procedures efficiently.",
      },
      {
        name: "computer_knowledge",
        label: "Uses relevant computer tools with confidence.",
      },
      {
        name: "potential_growth",
        label: "Shows clear potential for continued professional growth.",
      },
      {
        name: "sound_judgment",
        label: "Uses sound judgment and practical common sense.",
      },
    ],
  },
  {
    title: "Work Knowledge",
    items: [
      {
        name: "theory_integration",
        label: "Applies classroom concepts to actual work situations.",
      },
      {
        name: "output_quality",
        label: "Produces accurate, organized, and presentable work.",
      },
      {
        name: "task_timeliness",
        label: "Completes assigned tasks within the expected time.",
      },
    ],
  },
  {
    title: "Professional Conduct",
    items: [
      {
        name: "attire",
        label: "Reports in appropriate workplace attire.",
      },
      {
        name: "decorum",
        label: "Observes proper workplace conduct and decorum.",
      },
      {
        name: "self_confidence",
        label: "Works with appropriate independence and confidence.",
      },
      {
        name: "enthusiasm",
        label: "Shows consistent enthusiasm and a constructive attitude.",
      },
    ],
  },
];

function createInitialScores(): ScoreState {
  return Object.fromEntries(
    scoreNames.map((name) => [name, "95"])
  ) as ScoreState;
}

function isValidScore(value: string): boolean {
  if (value.trim() === "") return false;

  const score = Number(value);

  return (
    Number.isInteger(score) && score >= MIN_SCORE && score <= MAX_SCORE
  );
}

function getSuggestedRecommendation(average: number | null) {
  if (average === null) return "recommended";
  if (average >= 93) return "highly_recommended";
  if (average >= 85) return "recommended";
  if (average >= 75) return "needs_improvement";
  return "not_recommended";
}

function formatRecommendation(value: string) {
  switch (value) {
    case "highly_recommended":
      return "Highly Recommended";
    case "recommended":
      return "Recommended";
    case "needs_improvement":
      return "Needs Improvement";
    default:
      return "Not Recommended";
  }
}

export function EvaluationModal({
  assignmentId,
  studentId,
  studentName,
  onSubmitted,
}: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [scores, setScores] = useState<ScoreState>(createInitialScores);

  const allScoresValid = useMemo(
    () => scoreNames.every((name) => isValidScore(scores[name])),
    [scores]
  );

  const averageRating = useMemo(() => {
    if (!allScoresValid) return null;

    const total = scoreNames.reduce(
      (sum, name) => sum + Number(scores[name]),
      0
    );

    return Number((total / scoreNames.length).toFixed(2));
  }, [allScoresValid, scores]);

  const suggestedRecommendation = useMemo(
    () => getSuggestedRecommendation(averageRating),
    [averageRating]
  );

  const [recommendation, setRecommendation] = useState(
    suggestedRecommendation
  );

  useEffect(() => {
    setRecommendation(suggestedRecommendation);
  }, [suggestedRecommendation]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPending) {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPending, open]);

  function handleScoreChange(name: ScoreName, value: string) {
    // Keep the raw input while the critic is typing. Validation is shown
    // separately, so entering values such as 89 remains natural.
    if (!/^\d{0,3}$/.test(value)) return;

    setScores((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function resetForm() {
    setScores(createInitialScores());
    setRecommendation("highly_recommended");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!allScoresValid) {
      toast.error("Every rating must be a whole number from 70 to 95.");
      return;
    }

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await submitEvaluation(formData);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      onSubmitted?.(result.data);
      resetForm();
      setOpen(false);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Evaluate
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isPending) {
              setOpen(false);
            }
          }}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="evaluation-title"
            onSubmit={handleSubmit}
            className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border bg-card shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-start justify-between border-b bg-card/95 px-5 py-4 backdrop-blur">
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2 text-xs font-medium text-primary">
                  <ClipboardCheck className="h-4 w-4" />
                  Practicum evaluation
                </div>
                <h2 id="evaluation-title" className="truncate text-xl font-semibold">
                  {studentName}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Rate each factor using a whole number from 70 to 95.
                </p>
              </div>

              <button
                type="button"
                aria-label="Close evaluation"
                disabled={isPending}
                onClick={() => setOpen(false)}
                className="ml-4 grid h-9 w-9 shrink-0 place-items-center rounded-lg border text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-7 p-5 md:p-6">
              <input type="hidden" name="assignment_id" value={assignmentId} />
              <input type="hidden" name="student_id" value={studentId} />

              <div className="flex flex-col gap-4 rounded-2xl border bg-muted/25 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">Practicum grade</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Automatically averaged from all {scoreNames.length} ratings.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <GraduationCap className="h-6 w-6 text-primary" />
                  <span className="min-w-24 text-right text-3xl font-semibold tabular-nums">
                    {averageRating === null ? "—" : averageRating.toFixed(2)}
                  </span>
                </div>
              </div>

              {evaluationSections.map((section) => (
                <section key={section.title} className="space-y-3">
                  <div className="flex items-center justify-between gap-3 border-b pb-2">
                    <h3 className="font-semibold">{section.title}</h3>
                    <span className="text-xs text-muted-foreground">70–95</span>
                  </div>

                  <div className="divide-y rounded-xl border">
                    {section.items.map((item) => {
                      const valid = isValidScore(scores[item.name]);

                      return (
                        <label
                          key={item.name}
                          className="grid gap-3 p-4 sm:grid-cols-[1fr_96px] sm:items-center"
                        >
                          <span className="text-sm leading-6 text-foreground/80">
                            {item.label}
                          </span>

                          <span>
                            <input
                              type="number"
                              inputMode="numeric"
                              name={item.name}
                              value={scores[item.name]}
                              min={MIN_SCORE}
                              max={MAX_SCORE}
                              step={1}
                              required
                              aria-invalid={!valid}
                              onChange={(event) =>
                                handleScoreChange(item.name, event.target.value)
                              }
                              className={`h-10 w-full rounded-lg border bg-background px-3 text-center font-semibold tabular-nums outline-none transition focus:ring-2 focus:ring-primary/25 ${
                                valid
                                  ? "border-input"
                                  : "border-destructive/70 text-destructive"
                              }`}
                            />
                            {!valid && (
                              <span className="mt-1 block text-center text-[11px] text-destructive">
                                Enter 70–95
                              </span>
                            )}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </section>
              ))}

              <section className="rounded-2xl border bg-muted/20 p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <SummaryItem
                    label="Average rating"
                    value={
                      averageRating === null ? "Incomplete" : averageRating.toFixed(2)
                    }
                  />
                  <SummaryItem
                    label="Suggested recommendation"
                    value={formatRecommendation(suggestedRecommendation)}
                  />
                </div>
              </section>

              <div className="grid gap-4">
                <TextArea
                  name="strengths"
                  label="Strengths"
                  placeholder="Briefly note observed strengths."
                />
                <TextArea
                  name="improvement_areas"
                  label="Areas for improvement"
                  placeholder="Briefly note areas that need further development."
                />
                <TextArea
                  name="general_comment"
                  label="General comments"
                  placeholder="Add an optional overall comment."
                />
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-medium">Recommendation</span>
                <select
                  name="recommendation"
                  value={recommendation}
                  onChange={(event) => setRecommendation(event.target.value)}
                  className="h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/25"
                >
                  <option value="highly_recommended">Highly Recommended</option>
                  <option value="recommended">Recommended</option>
                  <option value="needs_improvement">Needs Improvement</option>
                  <option value="not_recommended">Not Recommended</option>
                </select>
                <span className="block text-xs text-muted-foreground">
                  The suggested value follows the computed average and may be adjusted before submission.
                </span>
              </label>
            </div>

            <div className="sticky bottom-0 flex justify-end gap-3 border-t bg-card/95 px-5 py-4 backdrop-blur">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setOpen(false)}
                className="rounded-xl border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isPending || !allScoresValid}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? "Submitting…" : "Submit evaluation"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function TextArea({
  name,
  label,
  placeholder,
}: {
  name: string;
  label: string;
  placeholder: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium">{label}</span>
      <textarea
        name={name}
        rows={3}
        maxLength={1000}
        placeholder={placeholder}
        className="w-full resize-y rounded-xl border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-primary/25"
      />
    </label>
  );
}
