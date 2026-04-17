"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

type ExportReportsButtonProps = {
  href: string;
};

export function ExportReportsButton({
  href,
}: ExportReportsButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  async function handleDownload() {
    try {
      setIsDownloading(true);
      toast.success("CSV export started.");

      window.location.href = href;

      setTimeout(() => {
        setIsDownloading(false);
      }, 1500);
    } catch {
      setIsDownloading(false);
      toast.error("Unable to start CSV download.");
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={isDownloading}
      className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
    >
      <span className="relative flex h-5 w-5 items-center justify-center">
        {isDownloading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4 transition-transform duration-300 group-hover:translate-y-0.5" />
        )}
      </span>
      <span>{isDownloading ? "Preparing CSV..." : "Download CSV"}</span>
    </button>
  );
}