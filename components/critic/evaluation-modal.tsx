"use client";

import { FormEvent, useState, useTransition } from "react";
import { ClipboardCheck, GraduationCap, Star, X } from "lucide-react";
import { toast } from "sonner";
import { submitEvaluation } from "@/app/critic/evaluations/actions";

type EvaluationModalProps = {
  assignmentId: string;
  studentId: string;
  studentName: string;
};

const criteria = [
  {
    name: "attendance_score",
    label: "Attendance & Punctuality",
    help: "Consistency, time discipline, and attendance behavior.",
  },
  {
    name: "work_quality_score",
    label: "Work Quality",
    help: "Accuracy, quality of output, and task completion.",
  },
  {
    name: "professionalism_score",
    label: "Professionalism",
    help: "Workplace conduct, respect, and responsibility.",
  },
  {
    name: "communication_score",
    label: "Communication",
    help: "Clarity, coordination, and responsiveness.",
  },
  {
    name: "initiative_score",
    label: "Initiative",
    help: "Willingness to learn, ask questions, and take action.",
  },
];

export function EvaluationModal({
  assignmentId,
  studentId,
  studentName,
}: EvaluationModalProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await submitEvaluation(formData);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setOpen(false);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:scale-[1.02] hover:bg-primary/90"
      >
        Evaluate
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-border bg-card shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-border bg-card px-6 py-5">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  <ClipboardCheck className="h-3.5 w-3.5" />
                  Critic Evaluation
                </div>

                <h2 className="text-xl font-bold">Evaluate {studentName}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Submit the practicum grade, rubric scores, and professional
                  feedback for this student.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-background hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 px-6 py-6">
              <input type="hidden" name="assignment_id" value={assignmentId} />
              <input type="hidden" name="student_id" value={studentId} />

              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  <p className="text-sm font-semibold">Practicum Grade</p>
                </div>

                <input
                  name="practicum_grade"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  required
                  placeholder="Example: 95"
                  className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm outline-none focus:border-primary"
                />

                <p className="mt-2 text-xs text-muted-foreground">
                  Enter the final practicum grade from 0 to 100.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {criteria.map((item) => (
                  <div
                    key={item.name}
                    className="rounded-2xl border border-border bg-background p-4"
                  >
                    <div className="mb-3 flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Star className="h-4 w-4" />
                      </div>

                      <div>
                        <p className="text-sm font-semibold">{item.label}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.help}
                        </p>
                      </div>
                    </div>

                    <select
                      name={item.name}
                      required
                      defaultValue="5"
                      className="h-12 w-full rounded-2xl border border-border bg-card px-4 text-sm text-foreground outline-none focus:border-primary"
                    >
                      <option value="5">5 - Excellent</option>
                      <option value="4">4 - Very Good</option>
                      <option value="3">3 - Good</option>
                      <option value="2">2 - Needs Improvement</option>
                      <option value="1">1 - Poor</option>
                    </select>
                  </div>
                ))}

                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-sm font-semibold">Recommendation</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Overall workplace recommendation.
                  </p>

                  <select
                    name="recommendation"
                    defaultValue="recommended"
                    className="mt-3 h-12 w-full rounded-2xl border border-border bg-card px-4 text-sm text-foreground outline-none focus:border-primary"
                  >
                    <option value="highly_recommended">
                      Highly Recommended
                    </option>
                    <option value="recommended">Recommended</option>
                    <option value="needs_improvement">Needs Improvement</option>
                    <option value="not_recommended">Not Recommended</option>
                  </select>
                </div>
              </div>

              <TextArea
                name="strengths"
                label="Strengths"
                placeholder="What did the student do well?"
              />

              <TextArea
                name="improvement_areas"
                label="Areas for Improvement"
                placeholder="What should the student improve?"
              />

              <TextArea
                name="general_comment"
                label="General Comment"
                placeholder="Add your final remarks here."
              />

              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
                By submitting, you confirm that the student has completed the
                required OJT hours and that this evaluation reflects their
                workplace performance.
              </div>

              <div className="flex justify-end gap-3 border-t border-border pt-5">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-2xl border border-border bg-background px-5 py-2.5 text-sm font-semibold hover:bg-muted"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {isPending ? "Submitting..." : "Submit Evaluation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
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
    <label className="space-y-2">
      <span className="text-sm font-semibold">{label}</span>
      <textarea
        name={name}
        rows={4}
        placeholder={placeholder}
        className="min-h-[110px] w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary"
      />
    </label>
  );
}