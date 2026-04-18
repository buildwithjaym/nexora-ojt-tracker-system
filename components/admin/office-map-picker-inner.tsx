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
const SEARCH_BIAS_LAT = 6.7081;
const SEARCH_BIAS_LON = 121.971;

type Props = {
  latitude: string;
  longitude: string;
  onChange: (coords: { lat: number; lng: number }) => void;
};

type PhotonFeature = {
  geometry?: {
    coordinates?: [number, number];
  };
  properties?: {
    name?: string;
    street?: string;
    suburb?: string;
    city?: string;
    county?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
};

type PhotonResponse = {
  features?: PhotonFeature[];
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

function normalizeText(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function buildResultLabel(feature: PhotonFeature) {
  const props = feature.properties ?? {};

  const title =
    props.name ||
    props.street ||
    props.suburb ||
    props.city ||
    "Unnamed location";

  const preferredSubtitle = [props.street, props.suburb, props.city]
    .filter(Boolean)
    .join(", ");

  const fallbackSubtitle = [props.county, props.state, props.country]
    .filter(Boolean)
    .join(", ");

  return {
    title,
    subtitle: preferredSubtitle || fallbackSubtitle || "No address details",
  };
}

function scoreFeature(feature: PhotonFeature, rawQuery: string) {
  const props = feature.properties ?? {};
  const query = normalizeText(rawQuery);

  const name = normalizeText(props.name);
  const street = normalizeText(props.street);
  const suburb = normalizeText(props.suburb);
  const city = normalizeText(props.city);
  const county = normalizeText(props.county);
  const state = normalizeText(props.state);

  let score = 0;

  if (!query) return score;

  if (name === query) score += 120;
  if (name.startsWith(query)) score += 90;
  if (name.includes(query)) score += 70;

  if (street.includes(query)) score += 30;
  if (suburb.includes(query)) score += 20;

  if (city.includes("isabela")) score += 30;
  if (county.includes("basilan")) score += 20;
  if (state.includes("basilan")) score += 20;

  if (name.includes("office")) score += 8;
  if (name.includes("branch")) score += 8;

  return score;
}

async function searchPhoton(query: string) {
  const response = await fetch(
    `https://photon.komoot.io/api/?q=${encodeURIComponent(
      query
    )}&limit=8&lang=en&lat=${SEARCH_BIAS_LAT}&lon=${SEARCH_BIAS_LON}&zoom=13&location_bias_scale=0.6`,
    {
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to search location.");
  }

  return (await response.json()) as PhotonResponse;
}

export default function OfficeMapPickerInner({
  latitude,
  longitude,
  onChange,
}: Props) {
  const [searchText, setSearchText] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<PhotonFeature[]>([]);

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

    try {
      const attempts = [
        query,
        `${query} office`,
        `${query} branch`,
        `${query} Isabela`,
        `${query} Basilan`,
      ];

      let validFeatures: PhotonFeature[] = [];

      for (const attempt of attempts) {
        const data = await searchPhoton(attempt);
        const features = Array.isArray(data.features) ? data.features : [];

        validFeatures = features.filter((feature) => {
          const coords = feature.geometry?.coordinates;

          return (
            Array.isArray(coords) &&
            coords.length === 2 &&
            Number.isFinite(coords[0]) &&
            Number.isFinite(coords[1])
          );
        });

        if (validFeatures.length > 0) {
          validFeatures = validFeatures
            .sort((a, b) => scoreFeature(b, query) - scoreFeature(a, query))
            .slice(0, 5);

          break;
        }
      }

      if (validFeatures.length === 0) {
        setResults([]);
        toast.error("Location not found. Try a more specific search.");
        return;
      }

      setResults(validFeatures);
      toast.success("Search results found. Select the correct location.");
    } catch (error) {
      setResults([]);
      toast.error("Failed to search the map location.");
    } finally {
      setIsSearching(false);
    }
  }

  function handleSelectResult(feature: PhotonFeature) {
    const coords = feature.geometry?.coordinates;

    if (!coords || coords.length !== 2) {
      toast.error("Selected result has invalid coordinates.");
      return;
    }

    const [selectedLng, selectedLat] = coords;

    if (!Number.isFinite(selectedLat) || !Number.isFinite(selectedLng)) {
      toast.error("Selected result has invalid coordinates.");
      return;
    }

    onChange({
      lat: Number(selectedLat.toFixed(6)),
      lng: Number(selectedLng.toFixed(6)),
    });

    setResults([]);
    toast.success("Location pinned from search result.");
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
            placeholder="Search office, building, or landmark..."
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
            Select the correct result
          </div>

          <div className="max-h-64 overflow-y-auto">
            {results.map((feature, index) => {
              const { title, subtitle } = buildResultLabel(feature);

              return (
                <button
                  key={`${title}-${subtitle}-${index}`}
                  type="button"
                  onClick={() => handleSelectResult(feature)}
                  className="flex w-full items-start gap-3 border-b border-border px-3 py-3 text-left transition hover:bg-muted/50 last:border-b-0"
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {subtitle}
                    </p>
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
        Tip: Search by office name like{" "}
        <span className="font-medium">SSS</span>,{" "}
        <span className="font-medium">SSS Isabela</span>, or{" "}
        <span className="font-medium">SSS Sumisip</span>, then choose the best
        result or click directly on the map to pin the office.
      </p>
    </div>
  );
}