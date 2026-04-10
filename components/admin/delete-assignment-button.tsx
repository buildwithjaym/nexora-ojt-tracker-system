"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteAssignment } from "@/app/admin/assignments/actions";

type DeleteAssignmentButtonProps = {
  assignmentId: string;
  label: string;
};

export function DeleteAssignmentButton({
  assignmentId,
  label,
}: DeleteAssignmentButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    const confirmed = window.confirm(
      `Are you sure you want to delete this assignment for ${label}?`
    );

    if (!confirmed) return;

    startTransition(async () => {
      const result = await deleteAssignment(assignmentId);

      if (!result.success) {
        toast.error(result.message || "Failed to delete assignment.");
        return;
      }

      toast.success(result.message || "Assignment deleted.");
      router.replace("/admin/assignments");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="inline-flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive transition-all duration-200 hover:scale-[1.02] hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Trash2 className="h-4 w-4" />
      {isPending ? "Deleting..." : "Delete"}
    </button>
  );
}