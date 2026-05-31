"use client";

import { ReactNode, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GraduationCap, Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import {
  createStudent,
  updateStudent,
  type StudentActionResult,
} from "@/app/admin/students/actions";

type BatchOption = {
  id: string;
  name: string;
  course: string;
  required_hours: number;
};

type StudentData = {
  id: string;
  student_number: string | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  suffix: string | null;
  sex: string | null;
  age: number | null;
  email: string | null;
  phone: string | null;
  batch_id: string | null;
  status: string | null;
};

type StudentModalProps = {
  mode: "create" | "edit";
  batches: BatchOption[];
  student?: StudentData | null;
};

const inputClass =
  "h-12 w-full rounded-2xl border border-border bg-card px-3 text-base outline-none transition focus:border-primary focus:shadow-sm sm:text-sm";

export function StudentModal({ mode, batches, student }: StudentModalProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [selectedBatchId, setSelectedBatchId] = useState(
    student?.batch_id ?? ""
  );

  const selectedBatch = useMemo(
    () => batches.find((batch) => batch.id === selectedBatchId),
    [batches, selectedBatchId]
  );

  function closeModal() {
    const params = new URLSearchParams(searchParams.toString());

    params.delete("modal");
    params.delete("edit");

    const next = params.toString();

    router.replace(next ? `/admin/students?${next}` : "/admin/students");
  }

  function handleSuccess(result: StudentActionResult) {
    if (!result.success) {
      toast.error(result.message || "Something went wrong.");
      return;
    }

    if (mode === "create" && result.credentials) {
      toast.success("Student account created successfully.", {
        description: `Email: ${result.credentials.email}`,
      });

      toast.success("Temporary password generated.", {
        description: result.credentials.password,
      });
    } else {
      toast.success(result.message || "Student updated successfully.");
    }

    closeModal();
    router.refresh();
  }

  function handleSubmit(formData: FormData) {
    const email = String(formData.get("email") || "").trim();

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createStudent(formData)
          : await updateStudent(student?.id || "", formData);

      handleSuccess(result);
    });
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-2 sm:items-center sm:p-4">
      <style>{`
        @keyframes modalOverlayIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes modalPanelIn {
          from {
            opacity: 0;
            transform: translateY(22px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes modalGlow {
          0%, 100% {
            opacity: 0.4;
            transform: scale(1);
          }
          50% {
            opacity: 0.75;
            transform: scale(1.08);
          }
        }

        .modal-overlay-in {
          animation: modalOverlayIn 0.22s ease both;
        }

        .modal-panel-in {
          animation: modalPanelIn 0.32s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .modal-glow {
          animation: modalGlow 3.5s ease-in-out infinite;
        }
      `}</style>

      <button
        type="button"
        className="modal-overlay-in absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closeModal}
        aria-label="Close modal overlay"
      />

      <div className="modal-panel-in relative z-10 flex max-h-[calc(100dvh-1rem)] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl border border-border bg-background shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-3xl">
        <div className="relative flex shrink-0 items-start justify-between gap-4 overflow-hidden border-b border-border px-4 py-4 sm:px-5">
          <div className="modal-glow absolute right-14 top-3 h-20 w-20 rounded-full bg-primary/20 blur-2xl" />

          <div className="relative flex items-start gap-3">
            <div className="hidden h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary sm:flex">
              <GraduationCap className="h-5 w-5" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Student Management
              </div>

              <h2 className="mt-2 text-lg font-semibold tracking-tight sm:text-xl">
                {mode === "create" ? "Add Student" : "Edit Student"}
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                {mode === "create"
                  ? "Create a student profile and connect it to an active batch."
                  : "Update student information, batch assignment, and status."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeModal}
            className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card transition hover:-translate-y-0.5 hover:bg-muted hover:shadow-sm"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form action={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-5">
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Field label="Student Number" required>
                  <input
                    type="text"
                    name="student_number"
                    defaultValue={student?.student_number ?? ""}
                    className={inputClass}
                    placeholder="2024-0001"
                    required
                  />
                </Field>

                <Field label="First Name" required>
                  <input
                    type="text"
                    name="first_name"
                    defaultValue={student?.first_name ?? ""}
                    className={inputClass}
                    placeholder="Juan"
                    required
                  />
                </Field>

                <Field label="Middle Name">
                  <input
                    type="text"
                    name="middle_name"
                    defaultValue={student?.middle_name ?? ""}
                    className={inputClass}
                    placeholder="Santos"
                  />
                </Field>

                <Field label="Last Name" required>
                  <input
                    type="text"
                    name="last_name"
                    defaultValue={student?.last_name ?? ""}
                    className={inputClass}
                    placeholder="Dela Cruz"
                    required
                  />
                </Field>

                <Field label="Suffix">
                  <input
                    type="text"
                    name="suffix"
                    defaultValue={student?.suffix ?? ""}
                    className={inputClass}
                    placeholder="Jr., III"
                  />
                </Field>

                <Field label="Sex">
                  <select
                    name="sex"
                    defaultValue={student?.sex ?? ""}
                    className={inputClass}
                  >
                    <option value="">Select sex</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </Field>

                <Field label="Age">
                  <input
                    type="number"
                    name="age"
                    min={0}
                    defaultValue={student?.age ?? ""}
                    className={inputClass}
                    placeholder="21"
                  />
                </Field>

                <Field label="Email" required>
                  <input
                    type="email"
                    name="email"
                    defaultValue={student?.email ?? ""}
                    className={inputClass}
                    placeholder="student@email.com"
                    pattern="^[^\s@]+@[^\s@]+\.[^\s@]+$"
                    required
                  />

                  <p className="text-xs text-muted-foreground">
                    This email will be used for login. Temporary password is the
                    student number.
                  </p>
                </Field>

                <Field label="Phone">
                  <input
                    type="text"
                    name="phone"
                    inputMode="numeric"
                    maxLength={11}
                    defaultValue={student?.phone ?? ""}
                    className={inputClass}
                    placeholder="09XXXXXXXXX"
                    onInput={(event) => {
                      event.currentTarget.value =
                        event.currentTarget.value.replace(/\D/g, "");
                    }}
                  />
                </Field>

                <Field label="Batch" required>
                  <select
                    name="batch_id"
                    value={selectedBatchId}
                    onChange={(event) => setSelectedBatchId(event.target.value)}
                    className={inputClass}
                    required
                  >
                    <option value="">Select batch</option>
                    {batches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.name} - {batch.course}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Required Hours">
                  <input
                    type="text"
                    value={
                      selectedBatch ? `${selectedBatch.required_hours} hrs` : ""
                    }
                    readOnly
                    className="h-12 w-full rounded-2xl border border-border bg-muted px-3 text-base text-muted-foreground outline-none sm:text-sm"
                    placeholder="Auto from batch"
                  />
                </Field>

                <Field label="Status">
                  <select
                    name="status"
                    defaultValue={student?.status ?? "active"}
                    className={inputClass}
                  >
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="inactive">Inactive</option>
                    <option value="dropped">Dropped</option>
                  </select>
                </Field>
              </div>

              {selectedBatch && (
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm">
                  <p className="font-medium text-foreground">
                    Selected Batch: {selectedBatch.name}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {selectedBatch.course} • {selectedBatch.required_hours}{" "}
                    required hours
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-border bg-background px-4 py-4 sm:flex-row sm:justify-end sm:px-5">
            <button
              type="button"
              onClick={closeModal}
              className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-border bg-background px-5 text-sm font-medium transition hover:-translate-y-0.5 hover:bg-secondary hover:shadow-sm sm:w-auto"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isPending}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:-translate-y-0.5 hover:opacity-90 hover:shadow-lg disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60 sm:w-auto"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}

              {isPending
                ? mode === "create"
                  ? "Creating..."
                  : "Updating..."
                : mode === "create"
                ? "Create Student"
                : "Update Student"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </label>

      {children}
    </div>
  );
}