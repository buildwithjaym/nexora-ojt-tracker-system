"use client";

import dynamic from "next/dynamic";

const OfficeMapPreviewInner = dynamic(
  () => import("./office-map-preview-inner"),
  { ssr: false }
);

type Props = {
  latitude: number | null;
  longitude: number | null;
};

export function OfficeMapPreview({ latitude, longitude }: Props) {
  if (latitude == null || longitude == null) {
    return (
      <div className="flex h-36 items-center justify-center rounded-2xl border border-dashed border-border text-xs text-muted-foreground">
        No pinned location
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      <OfficeMapPreviewInner latitude={latitude} longitude={longitude} />
    </div>
  );
}