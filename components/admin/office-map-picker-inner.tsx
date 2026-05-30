"use client";

import { useEffect, useMemo, useState } from "react";
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

// Rough Basilan / nearby search box.
// Format for Nominatim viewbox: left,top,right,bottom = lon,lat,lon,lat
const BASILAN_VIEWBOX = "121.55,6.95,122.35,6.35";

type Props = {
  latitude: string;
  longitude: string;
  onChange: (coords: { lat: number; lng: number }) => void;
};

type SearchResult = {
  source: "Nominatim" | "Photon";
  title: string;
  subtitle: string;
  lat: number;
  lng: number;
  importance?: number;
};

type NominatimItem = {
  display_name?: string;
  lat?: string;
  lon?: string;
  name?: string;
  type?: string;
  class?: string;
  importance?: number;
  address?: {
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    municipality?: string;
    county?: string;
    state?: string;
    country?: string;
  };
  namedetails?: Record<string, string>;
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

function normalizeText(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function expandAcronyms(query: string) {
  const lower = query.toLowerCase();

  if (lower.includes("dict")) {
    return [
      query,
      query.replace(/dict/gi, "Department of Information and Communications Technology"),
      `DICT Office ${query}`,
      `Department of Information and Communications Technology ${query}`,
    ];
  }

  if (lower.includes("psa")) {
    return [
      query,
      query.replace(/psa/gi, "Philippine Statistics Authority"),
      `PSA Office ${query}`,
      `Philippine Statistics Authority ${query}`,
    ];
  }

  if (lower.includes("deped")) {
    return [
      query,
      query.replace(/deped/gi, "Department of Education"),
      `DepEd Office ${query}`,
      `Department of Education ${query}`,
    ];
  }

  return [
    query,
    `${query} office`,
    `${query} Basilan`,
    `${query} Isabela Basilan`,
    `${query} Philippines`,
  ];
}

function buildNominatimTitle(item: NominatimItem) {
  return (
    item.name ||
    item.namedetails?.name ||
    item.display_name?.split(",")[0] ||
    "Unnamed location"
  );
}

function buildNominatimSubtitle(item: NominatimItem) {
  const address = item.address ?? {};

  return [
    address.road,
    address.suburb,
    address.city || address.town || address.municipality,
    address.county,
    address.state,
    address.country,
  ]
    .filter(Boolean)
    .join(", ");
}

function scoreResult(result: SearchResult, rawQuery: string) {
  const query = normalizeText(rawQuery);
  const title = normalizeText(result.title);
  const subtitle = normalizeText(result.subtitle);

  let score = 0;

  if (title === query) score += 150;
  if (title.startsWith(query)) score += 110;
  if (title.includes(query)) score += 90;
  if (subtitle.includes(query)) score += 40;

  if (subtitle.includes("basilan")) score += 60;
  if (subtitle.includes("isabela")) score += 40;
  if (subtitle.includes("philippines")) score += 25;

  if (title.includes("office")) score += 15;
  if (title.includes("department")) score += 12;
  if (title.includes("branch")) score += 10;

  if (result.source === "Nominatim") score += 8;
  if (result.importance) score += result.importance * 20;

  return score;
}

function dedupeResults(results: SearchResult[]) {
  const seen = new Set<string>();

  return results.filter((result) => {
    const key = `${result.lat.toFixed(5)}-${result.lng.toFixed(5)}-${normalizeText(
      result.title
    )}`;

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

async function searchNominatim(query: string): Promise<SearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    addressdetails: "1",
    namedetails: "1",
    extratags: "1",
    limit: "8",
    countrycodes: "ph",
    viewbox: BASILAN_VIEWBOX,
    bounded: "0",
    "accept-language": "en",
  });

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?${params.toString()}`,
    {
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error("Nominatim search failed.");
  }

  const data = (await response.json()) as NominatimItem[];

  return data
    .map((item) => {
      const lat = Number.parseFloat(item.lat ?? "");
      const lng = Number.parseFloat(item.lon ?? "");

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

      return {
        source: "Nominatim" as const,
        title: buildNominatimTitle(item),
        subtitle: buildNominatimSubtitle(item) || item.display_name || "No address details",
        lat,
        lng,
        importance: item.importance,
      };
    })
    .filter(Boolean) as SearchResult[];
}

async function searchPhoton(query: string): Promise<SearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    limit: "8",
    lang: "en",
    lat: String(SEARCH_BIAS_LAT),
    lon: String(SEARCH_BIAS_LON),
    zoom: "13",
    location_bias_scale: "0.7",
  });

  const response = await fetch(`https://photon.komoot.io/api/?${params.toString()}`, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Photon search failed.");
  }

  const data = (await response.json()) as PhotonResponse;
  const features = Array.isArray(data.features) ? data.features : [];

  return features
    .map((feature) => {
      const coords = feature.geometry?.coordinates;

      if (
        !Array.isArray(coords) ||
        coords.length !== 2 ||
        !Number.isFinite(coords[0]) ||
        !Number.isFinite(coords[1])
      ) {
        return null;
      }

      const [lng, lat] = coords;
      const props = feature.properties ?? {};

      const title =
        props.name ||
        props.street ||
        props.suburb ||
        props.city ||
        "Unnamed location";

      const subtitle = [
        props.street,
        props.suburb,
        props.city,
        props.county,
        props.state,
        props.country,
      ]
        .filter(Boolean)
        .join(", ");

      return {
        source: "Photon" as const,
        title,
        subtitle: subtitle || "No address details",
        lat,
        lng,
      };
    })
    .filter(Boolean) as SearchResult[];
}

export default function OfficeMapPickerInner({
  latitude,
  longitude,
  onChange,
}: Props) {
  const [searchText, setSearchText] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);

  const lat = Number.parseFloat(latitude);
  const lng = Number.parseFloat(longitude);

  const hasCoords = !Number.isNaN(lat) && !Number.isNaN(lng);

  const center = hasCoords
    ? ([lat, lng] as [number, number])
    : ISABELA_CITY_BASILAN;

  const markerPosition = hasCoords ? ([lat, lng] as [number, number]) : null;

  const querySuggestions = useMemo(() => {
    const query = searchText.trim();

    if (!query) return [];

    return Array.from(new Set(expandAcronyms(query))).slice(0, 4);
  }, [searchText]);

  async function handleSearch() {
    const query = searchText.trim();

    if (!query) {
      toast.error("Please enter a location to search.");
      return;
    }

    setIsSearching(true);
    setResults([]);

    try {
      const queries = Array.from(new Set(expandAcronyms(query))).slice(0, 3);
      let collectedResults: SearchResult[] = [];

      for (let index = 0; index < queries.length; index++) {
        const attempt = queries[index];

        if (index > 0) {
          await delay(1100);
        }

        const nominatimResults = await searchNominatim(attempt);
        collectedResults = [...collectedResults, ...nominatimResults];

        if (collectedResults.length >= 3) break;
      }

      const photonResults = await searchPhoton(query);
      collectedResults = [...collectedResults, ...photonResults];

      const finalResults = dedupeResults(collectedResults)
        .sort((a, b) => scoreResult(b, query) - scoreResult(a, query))
        .slice(0, 8);

      if (finalResults.length === 0) {
        toast.error("Location not found. Try a more specific search or pin it manually.");
        return;
      }

      setResults(finalResults);
      toast.success("Search results found. Select the correct location.");
    } catch (error) {
      console.error(error);
      toast.error("Failed to search the map location.");
    } finally {
      setIsSearching(false);
    }
  }

  function handleSelectResult(result: SearchResult) {
    onChange({
      lat: Number(result.lat.toFixed(6)),
      lng: Number(result.lng.toFixed(6)),
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
            placeholder="Search office, building, landmark, or agency..."
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

      {querySuggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {querySuggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setSearchText(suggestion)}
              className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground transition hover:bg-muted"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {results.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-background">
          <div className="border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">
            Select the correct result
          </div>

          <div className="max-h-72 overflow-y-auto">
            {results.map((result, index) => (
              <button
                key={`${result.source}-${result.title}-${result.lat}-${result.lng}-${index}`}
                type="button"
                onClick={() => handleSelectResult(result)}
                className="flex w-full items-start gap-3 border-b border-border px-3 py-3 text-left transition hover:bg-muted/50 last:border-b-0"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {result.title}
                    </p>

                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                      {result.source}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {result.subtitle}
                  </p>

                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {result.lat.toFixed(6)}, {result.lng.toFixed(6)}
                  </p>
                </div>
              </button>
            ))}
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
        Tip: If the office is not found, search a nearby landmark or click the
        exact location on the map. Some offices exist in Google Maps but not yet
        in OpenStreetMap search data.
      </p>
    </div>
  );
}