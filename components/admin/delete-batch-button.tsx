"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteBatch } from "@/app/admin/batches/actions";
import { useRouter } from "next/navigation";

type DeleteBatchButtonProps = {
  batchId: string;
  batchName: string;
};

export function DeleteBatchButton({
  batchId,
  batchName,
}: DeleteBatchButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${batchName}"?`
    );

    if (!confirmed) return;

    startTransition(async () => {
      const result = await deleteBatch(batchId);

      if (!result.success) {
        toast.error(result.message || "Failed to delete batch.");
        return;
      }

      toast.success(result.message);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="inline-flex items-center gap-2 rounded-xl border border-destructive/30 bg-background px-3 py-2 text-sm font-medium text-destructive transition hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Trash2 className="h-4 w-4" />
      {isPending ? "Deleting..." : "Delete"}
    </button>
  );
}