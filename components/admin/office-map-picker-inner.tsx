"use client";

import { useEffect, useState } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { LocateFixed, Search, MapPin } from "lucide-react";
import { toast } from "sonner";

delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const ISABELA_CITY_BASILAN: [number, number] = [6.7081, 121.971];

type Props = {
  latitude: string;
  longitude: string;
  onChange: (coords: { lat: number; lng: number }) => void;
};

type GeoapifyFeature = {
  geometry?: {
    coordinates?: [number, number];
  };
  properties?: {
    formatted?: string;
    name?: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    county?: string;
    state?: string;
    country?: string;
    confidence?: number;
    result_type?: string;
  };
};

function MapEvents({
  onChange,
}: {
  onChange: (coords: { lat: number; lng: number }) => void;
}) {
  useMapEvents({
    click(e) {
      onChange({
        lat: Number(e.latlng.lat.toFixed(6)),
        lng: Number(e.latlng.lng.toFixed(6)),
      });

      toast.success("Location pinned from map click.");
    },
  });

  return null;
}

function FlyToLocation({
  latitude,
  longitude,
}: {
  latitude: number | null;
  longitude: number | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (latitude != null && longitude != null) {
      map.flyTo([latitude, longitude], 16, {
        duration: 1.2,
      });
    }
  }, [latitude, longitude, map]);

  return null;
}

function getFeatureTitle(feature: GeoapifyFeature) {
  return (
    feature.properties?.name ||
    feature.properties?.address_line1 ||
    feature.properties?.formatted ||
    "Unnamed location"
  );
}

function getFeatureSubtitle(feature: GeoapifyFeature) {
  return (
    feature.properties?.address_line2 ||
    [
      feature.properties?.city,
      feature.properties?.county,
      feature.properties?.state,
      feature.properties?.country,
    ]
      .filter(Boolean)
      .join(", ") ||
    "No address details"
  );
}

function scoreFeature(feature: GeoapifyFeature, query: string) {
  const q = query.toLowerCase();
  const title = getFeatureTitle(feature).toLowerCase();
  const subtitle = getFeatureSubtitle(feature).toLowerCase();
  const formatted = feature.properties?.formatted?.toLowerCase() ?? "";

  let score = 0;

  if (title === q) score += 120;
  if (title.includes(q)) score += 90;
  if (formatted.includes(q)) score += 70;
  if (subtitle.includes("basilan")) score += 40;
  if (subtitle.includes("isabela")) score += 30;
  if (formatted.includes("philippines")) score += 20;

  score += (feature.properties?.confidence ?? 0) * 40;

  return score;
}

export default function OfficeMapPickerInner({
  latitude,
  longitude,
  onChange,
}: Props) {
  const [searchText, setSearchText] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<GeoapifyFeature[]>([]);

  const lat = Number.parseFloat(latitude);
  const lng = Number.parseFloat(longitude);

  const hasCoords = !Number.isNaN(lat) && !Number.isNaN(lng);

  const center = hasCoords
    ? ([lat, lng] as [number, number])
    : ISABELA_CITY_BASILAN;

  const markerPosition = hasCoords ? ([lat, lng] as [number, number]) : null;

  async function handleSearch() {
    const query = searchText.trim();

    if (!query) {
      toast.error("Please enter a location to search.");
      return;
    }

    setIsSearching(true);
    setResults([]);

    try {
      const res = await fetch(
        `/api/geoapify/search?text=${encodeURIComponent(query)}`
      );

      if (!res.ok) {
        throw new Error("Search failed.");
      }

      const data = await res.json();
      const features = Array.isArray(data.features) ? data.features : [];

      const validFeatures = features
        .filter((feature: GeoapifyFeature) => {
          const coords = feature.geometry?.coordinates;

          return (
            Array.isArray(coords) &&
            coords.length === 2 &&
            Number.isFinite(coords[0]) &&
            Number.isFinite(coords[1])
          );
        })
        .sort(
          (a: GeoapifyFeature, b: GeoapifyFeature) =>
            scoreFeature(b, query) - scoreFeature(a, query)
        )
        .slice(0, 8);

      if (validFeatures.length === 0) {
        toast.error("Location not found. Try another keyword or pin manually.");
        return;
      }

      setResults(validFeatures);
      toast.success("Search results found. Select the correct location.");
    } catch (error) {
      console.error(error);
      toast.error("Failed to search location.");
    } finally {
      setIsSearching(false);
    }
  }

  function handleSelectResult(feature: GeoapifyFeature) {
    const coords = feature.geometry?.coordinates;

    if (!coords || coords.length !== 2) {
      toast.error("Selected result has invalid coordinates.");
      return;
    }

    const [selectedLng, selectedLat] = coords;

    onChange({
      lat: Number(selectedLat.toFixed(6)),
      lng: Number(selectedLng.toFixed(6)),
    });

    setResults([]);
    toast.success("Location pinned from Geoapify result.");
  }

  return (
    <div className="space-y-3 bg-card p-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSearch();
              }
            }}
            placeholder="Search office, agency, building, or landmark..."
            className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-primary"
          />
        </div>

        <button
          type="button"
          onClick={handleSearch}
          disabled={isSearching}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-all duration-200 hover:scale-[1.02] hover:opacity-90 disabled:opacity-60"
        >
          <LocateFixed className="h-4 w-4" />
          {isSearching ? "Searching..." : "Search"}
        </button>
      </div>

      {results.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-background">
          <div className="border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">
            Select the correct Geoapify result
          </div>

          <div className="max-h-72 overflow-y-auto">
            {results.map((feature, index) => {
              const title = getFeatureTitle(feature);
              const subtitle = getFeatureSubtitle(feature);
              const confidence = feature.properties?.confidence;
              const coords = feature.geometry?.coordinates;

              return (
                <button
                  key={`${title}-${index}`}
                  type="button"
                  onClick={() => handleSelectResult(feature)}
                  className="flex w-full items-start gap-3 border-b border-border px-3 py-3 text-left transition hover:bg-muted/50 last:border-b-0"
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {title}
                      </p>

                      {typeof confidence === "number" && (
                        <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                          Confidence: {Math.round(confidence * 100)}%
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {subtitle}
                    </p>

                    {coords && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {coords[1].toFixed(6)}, {coords[0].toFixed(6)}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <MapContainer
        center={center}
        zoom={14}
        scrollWheelZoom
        className="h-[360px] w-full rounded-xl"
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        <MapEvents onChange={onChange} />

        <FlyToLocation
          latitude={hasCoords ? lat : null}
          longitude={hasCoords ? lng : null}
        />

        {markerPosition && <Marker position={markerPosition} />}
      </MapContainer>

      <p className="text-xs text-muted-foreground">
        Tip: Search using the office name first. If the exact office is still not
        found, search a nearby landmark and click the exact map location manually.
      </p>
    </div>
  );
}