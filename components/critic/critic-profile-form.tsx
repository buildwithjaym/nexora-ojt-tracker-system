"use client";

import { FormEvent, useRef, useState, useTransition } from "react";
import { Camera, Save, X } from "lucide-react";
import { toast } from "sonner";
import { updateCriticProfile } from "@/app/critic/profile/actions";

type CriticProfileFormProps = {
  phone: string;
  position: string;
  avatarUrl: string | null;
  criticName: string;
};

export function CriticProfileForm({
  phone,
  position,
  avatarUrl,
  criticName,
}: CriticProfileFormProps) {
  const [isPending, startTransition] = useTransition();
  const [preview, setPreview] = useState<string | null>(avatarUrl);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await updateCriticProfile(formData);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
    });
  }

  function handleAvatarChange(file: File | null) {
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Please select a JPG, PNG, or WebP image.");
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      toast.error("Avatar image must not exceed 3MB.");
      return;
    }

    setPreview(URL.createObjectURL(file));
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <div className="rounded-3xl border border-border bg-background p-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-3xl bg-primary/10 text-primary ring-1 ring-primary/20">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt={criticName}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl font-bold">
                {criticName
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join("")
                  .toUpperCase()}
              </div>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-2 right-2 inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg transition hover:scale-105"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>

          <div className="min-w-0">
            <p className="text-sm font-semibold">Profile Photo</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload a clear JPG, PNG, or WebP photo. Maximum file size is 3MB.
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-2xl border border-border bg-card px-4 py-2 text-sm font-semibold transition hover:bg-muted"
              >
                Choose Photo
              </button>

              {preview && (
                <button
                  type="button"
                  onClick={() => {
                    setPreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                  Clear Selection
                </button>
              )}
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          name="avatar"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => handleAvatarChange(event.target.files?.[0] ?? null)}
        />
      </div>

      <label className="space-y-2">
        <span className="text-sm font-semibold">Phone Number</span>
        <input
          name="phone"
          defaultValue={phone}
          inputMode="numeric"
          maxLength={11}
          placeholder="09XXXXXXXXX"
          className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
          onInput={(event) => {
            event.currentTarget.value = event.currentTarget.value.replace(
              /\D/g,
              ""
            );
          }}
        />
        <p className="text-xs text-muted-foreground">
          Optional. Must be 11 digits and start with 09.
        </p>
      </label>

      <label className="space-y-2">
        <span className="text-sm font-semibold">Position / Designation</span>
        <input
          name="position"
          defaultValue={position}
          placeholder="Example: Office Supervisor"
          className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
        />
      </label>

      <div className="flex justify-end border-t border-border pt-4">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {isPending ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}