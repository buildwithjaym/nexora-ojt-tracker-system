"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Camera,
  Loader2,
  MapPin,
  ShieldAlert,
  X,
} from "lucide-react";
import { recordAttendance } from "@/app/student/attendance/actions";

type EventType = "am_in" | "am_out" | "pm_in" | "pm_out";

type AttendanceActionModalProps = {
  eventType: EventType;
  officeName: string;
  officeAddress: string;
  allowedRadiusMeters: number;
  onClose: () => void;
};

function getTitle(eventType: EventType) {
  switch (eventType) {
    case "am_in":
      return "Morning Time In";
    case "am_out":
      return "Morning Time Out";
    case "pm_in":
      return "Afternoon Time In";
    case "pm_out":
      return "Afternoon Time Out";
  }
}

async function compressImage(file: File, targetBytes = 900 * 1024): Promise<File> {
  const imageUrl = URL.createObjectURL(file);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = imageUrl;
    });

    const maxWidth = 1280;
    const scale = Math.min(1, maxWidth / img.width);
    const width = Math.round(img.width * scale);
    const height = Math.round(img.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(img, 0, 0, width, height);

    let quality = 0.9;
    let blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality)
    );

    while (blob && blob.size > targetBytes && quality > 0.35) {
      quality -= 0.1;
      blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", quality)
      );
    }

    if (!blob) return file;

    return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

export function AttendanceActionModal({
  eventType,
  officeName,
  officeAddress,
  allowedRadiusMeters,
  onClose,
}: AttendanceActionModalProps) {
  const [activitySummary, setActivitySummary] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [locationLabel, setLocationLabel] = useState("Location will be captured automatically.");
  const [isPending, startTransition] = useTransition();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function getCurrentPosition() {
    if (!navigator.geolocation) {
      throw new Error("Geolocation is not supported on this device.");
    }

    return new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      });
    });
  }

  function handleSubmit() {
    if (!selectedFile) {
      toast.error("Please take a photo first.");
      return;
    }

    if (!activitySummary.trim()) {
      toast.error("Please describe what you did.");
      return;
    }

    const loadingId = toast.loading("Capturing attendance...");

    startTransition(async () => {
      try {
        const compressed = await compressImage(selectedFile);

        const position = await getCurrentPosition();
        const { latitude, longitude, accuracy } = position.coords;

        setLocationLabel(
          `Location captured • accuracy ${Math.round(accuracy)}m`
        );

        const formData = new FormData();
        formData.append("event_type", eventType);
        formData.append("latitude", String(latitude));
        formData.append("longitude", String(longitude));
        formData.append("accuracy_meters", String(accuracy));
        formData.append("activity_summary", activitySummary.trim());
        formData.append("photo", compressed);
        formData.append(
          "device_info",
          JSON.stringify({
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
          })
        );

        const result = await recordAttendance(formData);

        if (!result.success) {
          toast.error(result.message, { id: loadingId });
          return;
        }

        toast.success(result.message, {
          id: loadingId,
          description: `${getTitle(result.eventType)} recorded at ${result.serverTime} • ${result.distanceMeters.toFixed(1)}m from office`,
        });

        onClose();
      } catch (error: any) {
        toast.error(error?.message || "Unable to capture attendance.", {
          id: loadingId,
        });
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close attendance modal overlay"
      />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-border bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-sm text-muted-foreground">Attendance Action</p>
            <h2 className="text-xl font-semibold tracking-tight">
              {getTitle(eventType)}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card transition hover:bg-muted"
            aria-label="Close attendance modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5">
          <div className="space-y-5">
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-medium">{officeName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{officeAddress}</p>
                  <p className="mt-2 text-xs text-primary">
                    Allowed distance: within {allowedRadiusMeters} meters
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4">
              <label className="mb-2 block text-sm font-medium">What did you do?</label>
              <textarea
                value={activitySummary}
                onChange={(e) => setActivitySummary(e.target.value)}
                placeholder="Briefly describe your work, activity, or task..."
                className="min-h-[130px] w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary"
              />
            </div>

            <div className="rounded-2xl border border-border bg-card p-4">
              <label className="mb-2 block text-sm font-medium">Photo proof</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="user"
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Camera-first is recommended. Images are compressed automatically before upload.
              </p>

              {selectedFile && (
                <p className="mt-2 text-xs text-primary">
                  Selected: {selectedFile.name} • {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-medium">Location and time are automatic</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    The system captures your current location and uses the server time to prevent manual editing.
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">{locationLabel}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-2xl border border-border bg-background px-5 py-3 text-sm font-medium transition hover:bg-secondary"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4" />
                    Confirm {getTitle(eventType)}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}