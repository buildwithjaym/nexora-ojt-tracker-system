"use client";

import dynamic from "next/dynamic";

const OfficeMapPickerInner = dynamic(
  () => import("./office-map-picker-inner"),
  { ssr: false }
);

type OfficeMapPickerProps = {
  latitude: string;
  longitude: string;
  onChange: (coords: { lat: number; lng: number }) => void;
};

export function OfficeMapPicker({
  latitude,
  longitude,
  onChange,
}: OfficeMapPickerProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      <OfficeMapPickerInner
        latitude={latitude}
        longitude={longitude}
        onChange={onChange}
      />
    </div>
  );
}