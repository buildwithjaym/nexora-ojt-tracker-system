"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteCritic } from "@/app/admin/critics/actions";

export function DeleteCriticButton({ criticId }: { criticId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    const confirmed = window.confirm(
      "Are you sure you want to delete this critic account? This will also remove the critic login account."
    );

    if (!confirmed) return;

    startTransition(async () => {
      const result = await deleteCritic(criticId);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
    });
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="inline-flex h-10 items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 text-sm font-semibold text-red-500 transition hover:bg-red-500/15 disabled:opacity-60"
    >
      <Trash2 className="h-4 w-4" />
      {isPending ? "Deleting..." : "Delete"}
    </button>
  );
}