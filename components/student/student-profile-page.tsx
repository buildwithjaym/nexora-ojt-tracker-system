"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Camera,
  CheckCircle2,
  Loader2,
  Save,
  Sparkles,
  Upload,
  UserCircle2,
  X,
} from "lucide-react";
import { updateStudentProfile } from "@/app/student/profile/actions";

type StudentProfilePageProps = {
  profile: {
    id: string;
    email: string;
    avatarUrl: string | null;
    firstName: string;
    middleName: string;
    lastName: string;
    suffix: string;
  };
  student: {
    id: string;
    studentNumber: string;
    firstName: string;
    middleName: string;
    lastName: string;
    suffix: string;
    sex: string;
    age: number | null;
    email: string;
    phone: string;
    requiredHours: number;
    completedHours: number;
    status: string;
  };
};

async function cropAndCompressAvatar(
  file: File,
  targetBytes = 2 * 1024 * 1024
): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  const objectUrl = URL.createObjectURL(file);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = objectUrl;
    });

    const square = Math.min(img.width, img.height);
    const cropX = Math.max(0, (img.width - square) / 2);
    const cropY = Math.max(0, (img.height - square) / 2);

    const outputSize = Math.min(square, 1200);

    const canvas = document.createElement("canvas");
    canvas.width = outputSize;
    canvas.height = outputSize;

    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(
      img,
      cropX,
      cropY,
      square,
      square,
      0,
      0,
      outputSize,
      outputSize
    );

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
    URL.revokeObjectURL(objectUrl);
  }
}

export function StudentProfilePage({
  profile,
  student,
}: StudentProfilePageProps) {
  const [firstName, setFirstName] = useState(student.firstName);
  const [middleName, setMiddleName] = useState(student.middleName);
  const [lastName, setLastName] = useState(student.lastName);
  const [suffix, setSuffix] = useState(student.suffix);
  const [phone, setPhone] = useState(student.phone);
  const [sex, setSex] = useState(student.sex);
  const [age, setAge] = useState(student.age?.toString() ?? "");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(profile.avatarUrl);
  const [imageFailed, setImageFailed] = useState(false);

  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!selectedFile) return;

    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    setImageFailed(false);

    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(profile.avatarUrl);
      setImageFailed(false);
    }
  }, [profile.avatarUrl, selectedFile]);

  const progress = useMemo(() => {
    if (!student.requiredHours) return 0;
    return Math.min((student.completedHours / student.requiredHours) * 100, 100);
  }, [student.completedHours, student.requiredHours]);

  function handlePickImage() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(file: File | null) {
    if (!file) return;

    try {
      const processed = await cropAndCompressAvatar(file);
      setSelectedFile(processed);
      toast.success("Profile photo ready", {
        description: `Auto-cropped and compressed to ${(processed.size / 1024 / 1024).toFixed(2)} MB`,
      });
    } catch {
      toast.error("Unable to prepare image", {
        description: "Please try another photo.",
      });
    }
  }

  function handleRemoveImage() {
    setSelectedFile(null);
    setPreviewUrl(profile.avatarUrl);
    setImageFailed(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleSubmit() {
    const loadingId = toast.loading("Saving profile...");

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("first_name", firstName);
        formData.append("middle_name", middleName);
        formData.append("last_name", lastName);
        formData.append("suffix", suffix);
        formData.append("phone", phone);
        formData.append("sex", sex);
        formData.append("age", age);

        if (selectedFile) {
          formData.append("avatar", selectedFile);
        }

        const result = await updateStudentProfile(formData);

        if (!result.success) {
          toast.error("Unable to save profile", {
            id: loadingId,
            description: result.message,
          });
          return;
        }

        if (result.avatarUrl) {
          setPreviewUrl(result.avatarUrl);
          setImageFailed(false);
          setSelectedFile(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }

        toast.success("Profile updated", {
          id: loadingId,
          description: result.message,
        });
      } catch (error: any) {
        toast.error("Unable to save profile", {
          id: loadingId,
          description: error?.message || "Please try again.",
        });
      }
    });
  }

  const displayName = [firstName, lastName].filter(Boolean).join(" ");

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="pointer-events-none absolute -left-16 top-0 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Student Profile</span>
            </div>

            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Manage Your Profile
            </h2>

            <p className="max-w-2xl text-sm text-muted-foreground">
              Update your basic personal information and upload a profile photo.
              Your image is auto-cropped and compressed by the system before upload.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-background px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Student Number
            </p>
            <p className="mt-2 text-sm font-medium">{student.studentNumber}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              <div className="pointer-events-none absolute inset-0 rounded-full bg-primary/15 blur-2xl" />
              <div className="relative flex h-40 w-40 items-center justify-center overflow-hidden rounded-full border border-primary/20 bg-background shadow-[0_0_40px_rgba(59,130,246,0.12)]">
                {previewUrl && !imageFailed ? (
                  <img
                    src={previewUrl}
                    alt="Student avatar preview"
                    className="h-full w-full object-cover"
                    onError={() => setImageFailed(true)}
                  />
                ) : (
                  <UserCircle2 className="h-20 w-20 text-muted-foreground" />
                )}
              </div>

              <button
                type="button"
                onClick={handlePickImage}
                className="absolute bottom-2 right-2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:scale-105 hover:opacity-90"
                aria-label="Upload profile photo"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              className="hidden"
            />

            <h3 className="mt-5 text-xl font-semibold">{displayName}</h3>
            <p className="text-sm text-muted-foreground">{profile.email}</p>

            <div className="mt-5 w-full rounded-2xl border border-border bg-background p-4 text-left">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                OJT Progress
              </p>
              <p className="mt-2 text-sm font-medium">
                {student.completedHours}/{student.requiredHours} hours
              </p>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="mt-4 flex w-full gap-3">
              <button
                type="button"
                onClick={handlePickImage}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-medium transition hover:bg-muted"
              >
                <Upload className="h-4 w-4" />
                Upload
              </button>

              <button
                type="button"
                onClick={handleRemoveImage}
                className="inline-flex items-center justify-center rounded-2xl border border-border bg-background px-4 py-3 text-sm font-medium transition hover:bg-muted"
                aria-label="Reset avatar preview"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              Avatar images are center-cropped into a square and compressed to around 2MB or less.
            </p>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-5">
            <p className="text-sm font-medium">Personal Information</p>
            <p className="text-xs text-muted-foreground">
              Update your editable profile details below.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">First Name</label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Middle Name</label>
              <input
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Last Name</label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Suffix</label>
              <input
                value={suffix}
                onChange={(e) => setSuffix(e.target.value)}
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm"
                placeholder="Jr., Sr., III"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Phone Number</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Sex</label>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value)}
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm"
              >
                <option value="">Select sex</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Age</label>
              <input
                value={age}
                onChange={(e) => setAge(e.target.value)}
                type="number"
                min="0"
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Email Address</label>
              <input
                value={profile.email}
                disabled
                className="w-full rounded-2xl border border-border bg-muted px-4 py-3 text-sm text-muted-foreground"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Student Number</label>
              <input
                value={student.studentNumber}
                disabled
                className="w-full rounded-2xl border border-border bg-muted px-4 py-3 text-sm text-muted-foreground"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Status</label>
              <input
                value={student.status}
                disabled
                className="w-full rounded-2xl border border-border bg-muted px-4 py-3 text-sm capitalize text-muted-foreground"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end border-t border-border pt-5">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-[0_0_30px_rgba(59,130,246,0.18)] transition hover:opacity-90 disabled:opacity-60"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}