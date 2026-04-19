"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Camera,
  CheckCircle2,
  ImagePlus,
  Loader2,
  MapPin,
  ScanFace,
  ShieldAlert,
  Sparkles,
  Trash2,
  Upload,
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

function getShortLabel(eventType: EventType) {
  switch (eventType) {
    case "am_in":
      return "AM IN";
    case "am_out":
      return "AM OUT";
    case "pm_in":
      return "PM IN";
    case "pm_out":
      return "PM OUT";
  }
}

function getAccentClasses(eventType: EventType) {
  if (eventType === "am_in" || eventType === "pm_in") {
    return {
      badge: "bg-primary/10 text-primary border-primary/20",
      button: "bg-primary text-primary-foreground hover:opacity-90",
      glow: "bg-primary/10",
    };
  }

  return {
    badge: "bg-foreground/10 text-foreground border-foreground/15",
    button: "bg-foreground text-background hover:opacity-90",
    glow: "bg-foreground/10",
  };
}

async function compressImage(
  file: File,
  targetBytes = 900 * 1024
): Promise<File> {
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [locationLabel, setLocationLabel] = useState(
    "Location will be captured automatically when you confirm."
  );
  const [isPending, startTransition] = useTransition();

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const accent = useMemo(() => getAccentClasses(eventType), [eventType]);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [selectedFile]);

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

  function handleTakePicture() {
    cameraInputRef.current?.click();
  }

  function handleChooseFile() {
    fileInputRef.current?.click();
  }

  function handleSelectedFile(file: File | null) {
    setSelectedFile(file);
  }

  function handleRemovePhoto() {
    setSelectedFile(null);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleSubmit() {
    if (!selectedFile) {
      toast.error("Please take or choose a photo first.", {
        description: "A photo proof is required before submitting attendance.",
      });
      return;
    }

    if (!activitySummary.trim()) {
      toast.error("Please describe your activity.", {
        description: "Add a short summary of what you worked on.",
      });
      return;
    }

    const loadingId = toast.loading(`Processing ${getTitle(eventType)}...`, {
      description: "Capturing location, compressing image, and saving your record.",
    });

    startTransition(async () => {
      try {
        const compressed = await compressImage(selectedFile);
        const position = await getCurrentPosition();
        const { latitude, longitude, accuracy } = position.coords;

        setLocationLabel(
          `Location captured successfully • accuracy ${Math.round(accuracy)}m`
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
          toast.error("Attendance failed", {
            id: loadingId,
            description: result.message,
          });
          return;
        }

        toast.success(`${getTitle(result.eventType)} recorded`, {
          id: loadingId,
          description: `Saved at ${result.serverTime} • ${result.distanceMeters.toFixed(
            1
          )}m from office`,
        });

        onClose();
      } catch (error: any) {
        toast.error("Unable to complete attendance", {
          id: loadingId,
          description:
            error?.message ||
            "Please check your camera, location, and internet connection.",
        });
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close attendance modal overlay"
      />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-border bg-background shadow-2xl">
        <div
          className={`pointer-events-none absolute inset-x-0 top-0 h-40 blur-3xl ${accent.glow}`}
        />

        <div className="relative flex items-center justify-between border-b border-border px-5 py-4">
          <div className="min-w-0">
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${accent.badge}`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {getShortLabel(eventType)}
            </div>

            <h2 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">
              {getTitle(eventType)}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Capture your photo, location, and activity summary in one step.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card transition hover:bg-muted"
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
                <div className="min-w-0">
                  <p className="text-sm font-medium">{officeName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {officeAddress}
                  </p>
                  <p className="mt-2 text-xs text-primary">
                    Allowed distance: within {allowedRadiusMeters} meters
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4">
              <label className="mb-2 block text-sm font-medium">
                What did you do?
              </label>
              <textarea
                value={activitySummary}
                onChange={(e) => setActivitySummary(e.target.value)}
                placeholder="Briefly describe your work, activity, or task..."
                className="min-h-[130px] w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Keep it short and clear so your attendance record is easier to review.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <Camera className="h-4 w-4 text-primary" />
                <label className="text-sm font-medium">Photo proof</label>
              </div>

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="user"
                onChange={(e) => handleSelectedFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleSelectedFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleTakePicture}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-medium transition hover:bg-muted"
                >
                  <Camera className="h-4 w-4" />
                  Take a Picture
                </button>

                <button
                  type="button"
                  onClick={handleChooseFile}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-medium transition hover:bg-muted"
                >
                  <ImagePlus className="h-4 w-4" />
                  Choose File
                </button>
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                Camera-first is recommended. Images are compressed automatically before upload.
              </p>

              {previewUrl ? (
                <div className="mt-4 overflow-hidden rounded-2xl border border-primary/20 bg-primary/5">
                  <div className="aspect-[4/3] w-full bg-black/5">
                    <img
                      src={previewUrl}
                      alt="Attendance preview"
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Upload className="h-4 w-4 text-primary" />
                        <p className="text-sm font-medium">Photo ready</p>
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {selectedFile?.name}
                      </p>
                      <p className="mt-1 text-xs text-primary">
                        Original size:{" "}
                        {selectedFile
                          ? (selectedFile.size / 1024 / 1024).toFixed(2)
                          : "0.00"}{" "}
                        MB
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 py-2.5 text-sm font-medium transition hover:bg-muted"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-border bg-background px-4 py-8 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Camera className="h-5 w-5" />
                  </div>
                  <p className="mt-3 text-sm font-medium">No photo selected yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Take a picture or choose an image file to continue.
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-medium">
                    Time and location are automatic
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    The system captures your live location and uses the server time to prevent manual editing.
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {locationLabel}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-border bg-card p-4">
              <div className="flex items-start gap-3">
                <ScanFace className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-medium">Submission flow</p>
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <li>• Capture or choose a photo</li>
                    <li>• Enter your activity summary</li>
                    <li>• Confirm and let the system fetch your location</li>
                    <li>• Server records the official time automatically</li>
                  </ul>
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
                className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${accent.button}`}
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
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