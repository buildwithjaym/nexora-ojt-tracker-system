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
    if (isDownloading) return;

    try {
      setIsDownloading(true);
      toast.success("Preparing CSV download...");

      const link = document.createElement("a");
      link.href = href;
      link.setAttribute("download", "");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        setIsDownloading(false);
        toast.success("CSV download started.");
      }, 900);
    } catch {
      setIsDownloading(false);
      toast.error("Unable to download CSV.");
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={isDownloading}
      className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
      aria-label="Download CSV report"
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