"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Camera,
  CheckCircle2,
  ImagePlus,
  Loader2,
  MapPin,
  RefreshCcw,
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
  officeLatitude: number;
  officeLongitude: number;
  onClose: () => void;
};

type ReadyLocationState = {
  status: "ready";
  message: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  distanceMeters: number;
  capturedAt: number;
  sampleCount: number;
};

type LocationState =
  | {
      status: "idle" | "loading";
      message: string;
    }
  | ReadyLocationState
  | {
      status: "error";
      message: string;
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

function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadius = 6371000;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getAccuracyLabel(accuracy: number) {
  if (accuracy <= 15) {
    return { tone: "text-emerald-600", text: "Excellent GPS accuracy" };
  }
  if (accuracy <= 30) {
    return { tone: "text-primary", text: "Good GPS accuracy" };
  }
  if (accuracy <= 50) {
    return { tone: "text-amber-600", text: "Weak GPS accuracy" };
  }
  return { tone: "text-red-600", text: "Very weak GPS accuracy" };
}

function getMaxAcceptedAccuracy(allowedRadiusMeters: number) {
  return Math.min(30, allowedRadiusMeters);
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
  officeLatitude,
  officeLongitude,
  onClose,
}: AttendanceActionModalProps) {
  const [activitySummary, setActivitySummary] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [locationState, setLocationState] = useState<LocationState>({
    status: "idle",
    message: "Preparing secure location capture...",
  });
  const [isPending, startTransition] = useTransition();
  const [isLocating, setIsLocating] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const accent = useMemo(() => getAccentClasses(eventType), [eventType]);
  const maxAcceptedAccuracy = useMemo(
    () => getMaxAcceptedAccuracy(allowedRadiusMeters),
    [allowedRadiusMeters]
  );

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  useEffect(() => {
    void captureBestLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getSinglePosition() {
    if (!navigator.geolocation) {
      throw new Error("Geolocation is not supported on this device.");
    }

    return new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      });
    });
  }

  async function captureBestLocation() {
    if (isLocating) return;

    setIsLocating(true);
    setLocationState({
      status: "loading",
      message: "Getting your live location with high accuracy...",
    });

    try {
      const samples: GeolocationPosition[] = [];
      const sampleCount = 4;

      for (let i = 0; i < sampleCount; i++) {
        setLocationState({
          status: "loading",
          message: `Capturing location sample ${i + 1} of ${sampleCount}...`,
        });

        const position = await getSinglePosition();
        samples.push(position);

        if (i < sampleCount - 1) {
          await wait(1200);
        }
      }

      samples.sort(
        (a, b) =>
          (a.coords.accuracy ?? Number.POSITIVE_INFINITY) -
          (b.coords.accuracy ?? Number.POSITIVE_INFINITY)
      );

      const best = samples[0];
      const { latitude, longitude, accuracy } = best.coords;

      const distanceMeters = haversineMeters(
        latitude,
        longitude,
        officeLatitude,
        officeLongitude
      );

      const accuracyMeta = getAccuracyLabel(accuracy);
      const withinRadius = distanceMeters <= allowedRadiusMeters;

      const message = withinRadius
        ? `${accuracyMeta.text} • about ${distanceMeters.toFixed(1)}m from office`
        : `${accuracyMeta.text} • about ${distanceMeters.toFixed(
            1
          )}m from office (outside allowed area)`;

      setLocationState({
        status: "ready",
        message,
        latitude,
        longitude,
        accuracy,
        distanceMeters,
        capturedAt: Date.now(),
        sampleCount,
      });
    } catch (error: any) {
      let message =
        "Unable to get your location. Please allow precise location and try again.";

      if (error?.code === 1) {
        message =
          "Location permission was denied. Please allow location access in your browser and device settings.";
      } else if (error?.code === 2) {
        message =
          "Your location could not be determined. Move to an open area and turn on precise location.";
      } else if (error?.code === 3) {
        message =
          "Location request timed out. Please check your signal and try again.";
      }

      setLocationState({
        status: "error",
        message,
      });
    } finally {
      setIsLocating(false);
    }
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

  const locationReady = locationState.status === "ready";
  const readyLocation = locationReady ? locationState : null;

  const locationIsFresh =
    !!readyLocation && Date.now() - readyLocation.capturedAt <= 60_000;
  const locationWithinRadius =
    !!readyLocation && readyLocation.distanceMeters <= allowedRadiusMeters;
  const locationAccuracyAcceptable =
    !!readyLocation && readyLocation.accuracy <= maxAcceptedAccuracy;

  const canSubmit =
    !!selectedFile &&
    !!activitySummary.trim() &&
    !!readyLocation &&
    locationIsFresh &&
    locationWithinRadius &&
    locationAccuracyAcceptable &&
    !isPending;

  async function handleSubmit() {
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

    if (!readyLocation) {
      toast.error("Location is not ready yet.", {
        description: "Please wait for the GPS capture to finish or retry.",
      });
      return;
    }

    if (!locationIsFresh) {
      toast.error("Location is already stale.", {
        description: "Please refresh your location before submitting.",
      });
      return;
    }

    if (!locationAccuracyAcceptable) {
      toast.error("GPS accuracy is too weak.", {
        description: `Current accuracy is ${Math.round(
          readyLocation.accuracy
        )}m. Required accuracy is ${maxAcceptedAccuracy}m or better.`,
      });
      return;
    }

    if (!locationWithinRadius) {
      toast.error("You appear to be outside the allowed office radius.", {
        description: `Current estimate is ${readyLocation.distanceMeters.toFixed(
          1
        )}m from the office. Allowed distance is ${allowedRadiusMeters}m.`,
      });
      return;
    }

    const loadingId = toast.loading(`Processing ${getTitle(eventType)}...`, {
      description:
        "Validating location, compressing image, and saving your record.",
    });

    startTransition(async () => {
      try {
        const compressed = await compressImage(selectedFile);

        const formData = new FormData();
        formData.append("event_type", eventType);
        formData.append("latitude", String(readyLocation.latitude));
        formData.append("longitude", String(readyLocation.longitude));
        formData.append("accuracy_meters", String(readyLocation.accuracy));
        formData.append("activity_summary", activitySummary.trim());
        formData.append("photo", compressed);
        formData.append(
          "device_info",
          JSON.stringify({
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            locationCapturedAt: new Date(
              readyLocation.capturedAt
            ).toISOString(),
            locationSampleCount: readyLocation.sampleCount,
            approximateDistanceMeters: readyLocation.distanceMeters,
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
              Capture your photo, exact location, and activity summary in one
              step.
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
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="block text-sm font-medium">
                  What did you do?
                </label>
                <span className="text-xs text-muted-foreground">
                  {activitySummary.trim().length}/300
                </span>
              </div>

              <textarea
                value={activitySummary}
                maxLength={300}
                onChange={(e) => setActivitySummary(e.target.value)}
                placeholder="Briefly describe your work, activity, or task..."
                className="min-h-[130px] w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Keep it short and clear so your attendance record is easier to
                review.
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
                Camera-first is recommended. Images are compressed automatically
                before upload.
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
                  <p className="mt-3 text-sm font-medium">
                    No photo selected yet
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Take a picture or choose an image file to continue.
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        Secure location capture
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        We collect multiple high-accuracy GPS readings and keep
                        the best one before submission.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={captureBestLocation}
                      disabled={isLocating || isPending}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-background px-3 py-2 text-xs font-medium transition hover:bg-muted disabled:opacity-60"
                    >
                      {isLocating ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Locating...
                        </>
                      ) : (
                        <>
                          <RefreshCcw className="h-3.5 w-3.5" />
                          Refresh location
                        </>
                      )}
                    </button>
                  </div>

                  <p className="mt-3 text-xs text-muted-foreground">
                    {locationState.message}
                  </p>

                  {readyLocation ? (
                    <>
                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-border bg-background p-3">
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                            Accuracy
                          </p>
                          <p className="mt-1 text-sm font-medium">
                            {Math.round(readyLocation.accuracy)}m
                          </p>
                        </div>

                        <div className="rounded-2xl border border-border bg-background p-3">
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                            Distance
                          </p>
                          <p className="mt-1 text-sm font-medium">
                            {readyLocation.distanceMeters.toFixed(1)}m
                          </p>
                        </div>

                        <div className="rounded-2xl border border-border bg-background p-3">
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                            Samples
                          </p>
                          <p className="mt-1 text-sm font-medium">
                            {readyLocation.sampleCount}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 space-y-1 text-xs">
                        <p className={getAccuracyLabel(readyLocation.accuracy).tone}>
                          {getAccuracyLabel(readyLocation.accuracy).text}
                          {readyLocation.accuracy > maxAcceptedAccuracy
                            ? ` • required ${maxAcceptedAccuracy}m or better`
                            : " • accepted"}
                        </p>

                        <p
                          className={
                            readyLocation.distanceMeters <= allowedRadiusMeters
                              ? "text-primary"
                              : "text-red-600"
                          }
                        >
                          {readyLocation.distanceMeters <= allowedRadiusMeters
                            ? "Inside allowed office radius"
                            : `Outside allowed office radius of ${allowedRadiusMeters}m`}
                        </p>

                        <p className="text-muted-foreground">
                          Location must be captured within the last 60 seconds
                          before submission.
                        </p>
                      </div>
                    </>
                  ) : null}
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
                    <li>• Wait for strong GPS accuracy or refresh location</li>
                    <li>• Confirm only when you are inside the allowed radius</li>
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
                disabled={!canSubmit}
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