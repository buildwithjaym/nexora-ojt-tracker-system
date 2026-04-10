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
import { LocateFixed, Search } from "lucide-react";
import { toast } from "sonner";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const ISABELA_CITY_BASILAN: [number, number] = [6.7081, 121.9710];

type Props = {
  latitude: string;
  longitude: string;
  onChange: (coords: { lat: number; lng: number }) => void;
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

export default function OfficeMapPickerInner({
  latitude,
  longitude,
  onChange,
}: Props) {
  const [searchText, setSearchText] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const lat = Number.parseFloat(latitude);
  const lng = Number.parseFloat(longitude);

  const hasCoords = !Number.isNaN(lat) && !Number.isNaN(lng);

  const center = hasCoords ? ([lat, lng] as [number, number]) : ISABELA_CITY_BASILAN;

  async function handleSearch() {
    const query = searchText.trim();
    if (!query) {
      toast.error("Please enter a location to search.");
      return;
    }

    setIsSearching(true);

    try {
      const q = `${query}, Isabela City, Basilan, Philippines`;

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=ph&q=${encodeURIComponent(
          q
        )}`,
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to search location.");
      }

      const results = await response.json();

      if (!Array.isArray(results) || results.length === 0) {
        toast.error("Location not found. Try a more specific search.");
        return;
      }

      const first = results[0];
      const foundLat = Number.parseFloat(first.lat);
      const foundLng = Number.parseFloat(first.lon);

      if (Number.isNaN(foundLat) || Number.isNaN(foundLng)) {
        toast.error("Could not determine location coordinates.");
        return;
      }

      onChange({
        lat: Number(foundLat.toFixed(6)),
        lng: Number(foundLng.toFixed(6)),
      });

      toast.success("Location found and pinned.");
    } catch (error) {
      toast.error("Failed to search the map location.");
    } finally {
      setIsSearching(false);
    }
  }

  const markerPosition = hasCoords ? ([lat, lng] as [number, number]) : null;

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
            placeholder="Search place, building, or landmark..."
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
          {isSearching ? "Locating..." : "Locate"}
        </button>
      </div>

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
        Tip: Search a place like <span className="font-medium">PSA Isabela City</span> or click directly on the map to pin the office.
      </p>
    </div>
  );
}