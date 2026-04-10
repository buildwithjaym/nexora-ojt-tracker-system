"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteTeacher } from "@/app/admin/teachers/actions";

type DeleteTeacherButtonProps = {
  teacherId: string;
  teacherName: string;
};

export function DeleteTeacherButton({
  teacherId,
  teacherName,
}: DeleteTeacherButtonProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${teacherName}?`
    );

    if (!confirmed) return;

    startTransition(async () => {
      const result = await deleteTeacher(teacherId);

      if (!result.success) {
        toast.error(result.message || "Failed to delete teacher.");
        return;
      }

      toast.success(result.message || "Teacher deleted.");

      const params = new URLSearchParams(searchParams.toString());
      router.replace(`/admin/teachers?${params.toString()}`);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="inline-flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive transition hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Trash2 className="h-4 w-4" />
      {isPending ? "Deleting..." : "Delete"}
    </button>
  );
}