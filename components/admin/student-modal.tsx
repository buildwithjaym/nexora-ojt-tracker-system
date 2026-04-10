"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
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

export function StudentModal({
  mode,
  batches,
  student,
}: StudentModalProps) {
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
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closeModal}
        aria-label="Close modal overlay"
      />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-border bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-sm text-muted-foreground">Student Management</p>
            <h2 className="text-xl font-semibold tracking-tight">
              {mode === "create" ? "Add Student" : "Edit Student"}
            </h2>
          </div>

          <button
            type="button"
            onClick={closeModal}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card transition hover:bg-muted"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5">
          <form action={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Student Number *</label>
                <input
                  type="text"
                  name="student_number"
                  defaultValue={student?.student_number ?? ""}
                  className="w-full rounded-2xl border border-border bg-card px-3 py-3 text-sm outline-none transition focus:border-primary"
                  placeholder="2024-0001"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">First Name *</label>
                <input
                  type="text"
                  name="first_name"
                  defaultValue={student?.first_name ?? ""}
                  className="w-full rounded-2xl border border-border bg-card px-3 py-3 text-sm outline-none transition focus:border-primary"
                  placeholder="Juan"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Middle Name</label>
                <input
                  type="text"
                  name="middle_name"
                  defaultValue={student?.middle_name ?? ""}
                  className="w-full rounded-2xl border border-border bg-card px-3 py-3 text-sm outline-none transition focus:border-primary"
                  placeholder="Santos"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Last Name *</label>
                <input
                  type="text"
                  name="last_name"
                  defaultValue={student?.last_name ?? ""}
                  className="w-full rounded-2xl border border-border bg-card px-3 py-3 text-sm outline-none transition focus:border-primary"
                  placeholder="Dela Cruz"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Suffix</label>
                <input
                  type="text"
                  name="suffix"
                  defaultValue={student?.suffix ?? ""}
                  className="w-full rounded-2xl border border-border bg-card px-3 py-3 text-sm outline-none transition focus:border-primary"
                  placeholder="Jr., III"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Sex</label>
                <select
                  name="sex"
                  defaultValue={student?.sex ?? ""}
                  className="w-full rounded-2xl border border-border bg-card px-3 py-3 text-sm outline-none transition focus:border-primary"
                >
                  <option value="">Select sex</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Age</label>
                <input
                  type="number"
                  name="age"
                  min={0}
                  defaultValue={student?.age ?? ""}
                  className="w-full rounded-2xl border border-border bg-card px-3 py-3 text-sm outline-none transition focus:border-primary"
                  placeholder="21"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Email *</label>
                <input
                  type="email"
                  name="email"
                  defaultValue={student?.email ?? ""}
                  className="w-full rounded-2xl border border-border bg-card px-3 py-3 text-sm outline-none transition focus:border-primary"
                  placeholder="student@email.com"
                  pattern="^[^\s@]+@[^\s@]+\.[^\s@]+$"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Phone</label>
                <input
                  type="text"
                  name="phone"
                  defaultValue={student?.phone ?? ""}
                  className="w-full rounded-2xl border border-border bg-card px-3 py-3 text-sm outline-none transition focus:border-primary"
                  placeholder="09XXXXXXXXX"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Batch *</label>
                <select
                  name="batch_id"
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="w-full rounded-2xl border border-border bg-card px-3 py-3 text-sm outline-none transition focus:border-primary"
                  required
                >
                  <option value="">Select batch</option>
                  {batches.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.name} - {batch.course}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Required Hours</label>
                <input
                  type="text"
                  value={selectedBatch ? `${selectedBatch.required_hours} hrs` : ""}
                  readOnly
                  className="w-full rounded-2xl border border-border bg-muted px-3 py-3 text-sm text-muted-foreground outline-none"
                  placeholder="Auto from batch"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <select
                  name="status"
                  defaultValue={student?.status ?? "active"}
                  className="w-full rounded-2xl border border-border bg-card px-3 py-3 text-sm outline-none transition focus:border-primary"
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="inactive">Inactive</option>
                  <option value="dropped">Dropped</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex items-center justify-center rounded-2xl border border-border bg-background px-5 py-3 text-sm font-medium transition hover:bg-secondary"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
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
    </div>
  );
}