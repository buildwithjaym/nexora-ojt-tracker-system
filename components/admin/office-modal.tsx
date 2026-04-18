"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  X,
  Building2,
  MapPin,
  UserRound,
  Mail,
  Phone,
  Users,
  Activity,
  MapPinned,
} from "lucide-react";
import { toast } from "sonner";
import {
  createOffice,
  updateOffice,
  type OfficeActionResult,
} from "@/app/admin/offices/actions";
import { OfficeMapPicker } from "@/components/admin/office-map-picker";

type OfficeData = {
  id: string;
  name: string | null;
  address: string | null;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  capacity: number | null;
  status: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type OfficeModalProps = {
  mode: "create" | "edit";
  office?: OfficeData | null;
};

function isValidCoordinatePair(latitude: string, longitude: string) {
  const lat = Number.parseFloat(latitude);
  const lng = Number.parseFloat(longitude);

  if (Number.isNaN(lat) || Number.isNaN(lng)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;

  return true;
}

export function OfficeModal({ mode, office }: OfficeModalProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [address, setAddress] = useState(office?.address ?? "");
  const [latitude, setLatitude] = useState(
    office?.latitude != null ? String(office.latitude) : ""
  );
  const [longitude, setLongitude] = useState(
    office?.longitude != null ? String(office.longitude) : ""
  );

  const hasValidCoords = isValidCoordinatePair(latitude, longitude);

  function closeModal() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("modal");
    params.delete("edit");

    const next = params.toString();
    router.replace(next ? `/admin/offices?${next}` : "/admin/offices");
  }

  function handleSuccess(result: OfficeActionResult) {
    if (!result.success) {
      toast.error(result.message || "Something went wrong.");
      return;
    }

    toast.success(result.message);
    closeModal();
    router.refresh();
  }

  function handleSubmit(formData: FormData) {
    const email = String(formData.get("contact_email") || "").trim();

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid contact email address.");
      return;
    }

    if (!address.trim()) {
      toast.error("Please provide the office address.");
      return;
    }

    if (!hasValidCoords) {
      toast.error("Please search or pin a valid office location on the map.");
      return;
    }

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createOffice(formData)
          : await updateOffice(office?.id || "", formData);

      handleSuccess(result);
    });
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
        onClick={closeModal}
        aria-label="Close modal overlay"
      />

      <div className="relative z-10 flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-border bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <div>
            <p className="text-sm text-muted-foreground">Office Management</p>
            <h2 className="text-2xl font-semibold tracking-tight">
              {mode === "create" ? "Add Office" : "Edit Office"}
            </h2>
          </div>

          <button
            type="button"
            onClick={closeModal}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card transition-all duration-200 hover:scale-[1.03] hover:bg-muted"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-6">
          <form action={handleSubmit} className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[1fr_1.05fr]">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Office Name *</label>
                  <div className="relative">
                    <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      name="name"
                      defaultValue={office?.name ?? ""}
                      className="w-full rounded-2xl border border-border bg-card py-3 pl-10 pr-3 text-sm outline-none transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_4px_rgba(59,130,246,0.08)]"
                      placeholder="Tech Solutions Inc."
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Address *</label>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                    <textarea
                      name="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      rows={4}
                      className="w-full rounded-2xl border border-border bg-card py-3 pl-10 pr-3 text-sm outline-none transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_4px_rgba(59,130,246,0.08)]"
                      placeholder="Office address..."
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use the map search to find the office, then adjust the pin if needed.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Contact Person</label>
                    <div className="relative">
                      <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        name="contact_person"
                        defaultValue={office?.contact_person ?? ""}
                        className="w-full rounded-2xl border border-border bg-card py-3 pl-10 pr-3 text-sm outline-none transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_4px_rgba(59,130,246,0.08)]"
                        placeholder="Juan Dela Cruz"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Capacity</label>
                    <div className="relative">
                      <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="number"
                        name="capacity"
                        min={0}
                        defaultValue={office?.capacity ?? ""}
                        className="w-full rounded-2xl border border-border bg-card py-3 pl-10 pr-3 text-sm outline-none transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_4px_rgba(59,130,246,0.08)]"
                        placeholder="10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Contact Email</label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="email"
                        name="contact_email"
                        defaultValue={office?.contact_email ?? ""}
                        className="w-full rounded-2xl border border-border bg-card py-3 pl-10 pr-3 text-sm outline-none transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_4px_rgba(59,130,246,0.08)]"
                        placeholder="office@email.com"
                        pattern="^[^\s@]+@[^\s@]+\.[^\s@]+$"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Contact Phone</label>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        name="contact_phone"
                        defaultValue={office?.contact_phone ?? ""}
                        className="w-full rounded-2xl border border-border bg-card py-3 pl-10 pr-3 text-sm outline-none transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_4px_rgba(59,130,246,0.08)]"
                        placeholder="09XXXXXXXXX"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">Status</label>
                    <div className="relative">
                      <Activity className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <select
                        name="status"
                        defaultValue={office?.status ?? "active"}
                        className="w-full rounded-2xl border border-border bg-card py-3 pl-10 pr-3 text-sm outline-none transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_4px_rgba(59,130,246,0.08)]"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium">Map Location</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Search a place, building, or landmark. Then choose the best result
                    and click the map if you want to fine-tune the exact office pin.
                  </p>
                </div>

                <OfficeMapPicker
                  latitude={latitude}
                  longitude={longitude}
                  onChange={({ lat, lng }) => {
                    setLatitude(String(lat));
                    setLongitude(String(lng));
                  }}
                />

                <div className="rounded-2xl border border-border bg-card/60 p-4">
                  <div className="flex items-start gap-3">
                    <MapPinned className="mt-0.5 h-4 w-4 text-primary" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Pinned Coordinates</p>
                      <p className="text-xs text-muted-foreground">
                        {hasValidCoords
                          ? `Latitude ${latitude}, Longitude ${longitude}`
                          : "No valid location pinned yet."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Latitude</label>
                    <input
                      type="text"
                      name="latitude"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      className="w-full rounded-2xl border border-border bg-card px-3 py-3 text-sm outline-none transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_4px_rgba(59,130,246,0.08)]"
                      placeholder="6.708100"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Longitude</label>
                    <input
                      type="text"
                      name="longitude"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      className="w-full rounded-2xl border border-border bg-card px-3 py-3 text-sm outline-none transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_4px_rgba(59,130,246,0.08)]"
                      placeholder="121.971000"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex items-center justify-center rounded-2xl border border-border bg-background px-5 py-3 text-sm font-medium transition-all duration-200 hover:scale-[1.02] hover:bg-secondary"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isPending || !hasValidCoords}
                className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-all duration-200 hover:scale-[1.02] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending
                  ? mode === "create"
                    ? "Creating..."
                    : "Updating..."
                  : mode === "create"
                  ? "Create Office"
                  : "Update Office"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}