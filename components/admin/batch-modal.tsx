"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { toast } from "sonner";
import {
  createBatch,
  updateBatch,
  type BatchActionResult,
} from "@/app/admin/batches/actions";

type BatchData = {
  id: string;
  code: string | null;
  name: string | null;
  course: string | null;
  year_level: string | null;
  required_hours: number | null;
  is_active: boolean | null;
};

type BatchModalProps = {
  mode: "create" | "edit";
  batch?: BatchData | null;
};

export function BatchModal({ mode, batch }: BatchModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function closeModal() {
    router.push("/admin/batches");
  }

  function handleSuccess(result: BatchActionResult) {
    if (!result.success) {
      toast.error(result.message || "Something went wrong.");
      return;
    }

    toast.success(result.message);
    closeModal();
    router.refresh();
  }

  function handleSubmit(formData: FormData) {
    const requiredHours = Number(formData.get("required_hours") || 0);

    if (!Number.isInteger(requiredHours) || requiredHours <= 0) {
      toast.error("Required hours must be greater than 0.");
      return;
    }

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createBatch(formData)
          : await updateBatch(batch?.id || "", formData);

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

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-border bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-sm text-muted-foreground">Batch Management</p>
            <h2 className="text-xl font-semibold tracking-tight">
              {mode === "create" ? "Add Batch" : "Edit Batch"}
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
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Batch Code *</label>
                <input
                  type="text"
                  name="code"
                  defaultValue={batch?.code ?? ""}
                  className="w-full rounded-2xl border border-border bg-card px-3 py-3 text-sm uppercase outline-none transition focus:border-primary"
                  placeholder="BSIT-2025-A"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Batch Name *</label>
                <input
                  type="text"
                  name="name"
                  defaultValue={batch?.name ?? ""}
                  className="w-full rounded-2xl border border-border bg-card px-3 py-3 text-sm outline-none transition focus:border-primary"
                  placeholder="BSIT 4th Year - A"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Course *</label>
                <input
                  type="text"
                  name="course"
                  defaultValue={batch?.course ?? ""}
                  className="w-full rounded-2xl border border-border bg-card px-3 py-3 text-sm outline-none transition focus:border-primary"
                  placeholder="BSIT"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Year Level</label>
                <input
                  type="text"
                  name="year_level"
                  defaultValue={batch?.year_level ?? ""}
                  className="w-full rounded-2xl border border-border bg-card px-3 py-3 text-sm outline-none transition focus:border-primary"
                  placeholder="4th Year"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Required Hours *</label>
                <input
                  type="number"
                  name="required_hours"
                  defaultValue={batch?.required_hours ?? 486}
                  min={1}
                  className="w-full rounded-2xl border border-border bg-card px-3 py-3 text-sm outline-none transition focus:border-primary"
                  placeholder="486"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <select
                  name="is_active"
                  defaultValue={String(batch?.is_active ?? true)}
                  className="w-full rounded-2xl border border-border bg-card px-3 py-3 text-sm outline-none transition focus:border-primary"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
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
                  ? "Create Batch"
                  : "Update Batch"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}