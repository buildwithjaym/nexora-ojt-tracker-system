"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteOffice } from "@/app/admin/offices/actions";

type DeleteOfficeButtonProps = {
  officeId: string;
  officeName: string;
};

export function DeleteOfficeButton({
  officeId,
  officeName,
}: DeleteOfficeButtonProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${officeName}?`
    );

    if (!confirmed) return;

    startTransition(async () => {
      const result = await deleteOffice(officeId);

      if (!result.success) {
        toast.error(result.message || "Failed to delete office.");
        return;
      }

      toast.success(result.message || "Office deleted.");

      const params = new URLSearchParams(searchParams.toString());
      router.replace(`/admin/offices?${params.toString()}`);
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