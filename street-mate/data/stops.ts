// Central access point for the OpenStreetMap bus stop dataset.
// Normalises the raw file once at module load so screens never touch
// the awkward "Stop names" key or worry about unnamed nodes.

import rawStops from '@/assets/data/ghana_bus_stops.json';

type RawStop = {
  ID: string;
  'Stop names': string | null;
  latitude: number;
  longitude: number;
};

export type Stop = {
  id: string;
  name: string;
  lat: number;
  lng: number;
};

// 636 of the 4,013 OSM nodes carry coordinates but no name. They're unusable
// for search and meaningless as map labels, so they're dropped here.
export const stops: Stop[] = (rawStops as RawStop[])
  .filter((s) => s['Stop names'] && typeof s.latitude === 'number' && typeof s.longitude === 'number')
  .map((s) => ({
    id: s.ID,
    name: (s['Stop names'] as string).trim(),
    lat: s.latitude,
    lng: s.longitude,
  }));

// Placeholder origin until GPS is wired up — roughly Adenta Municipality,
// matching the "Current location" label shown on the search screen.
export const CURRENT_LOCATION = {
  name: 'Adenta Municipality',
  lat: 5.7069,
  lng: -0.1665,
};

const EARTH_RADIUS_KM = 6371;

const toRadians = (deg: number) => (deg * Math.PI) / 180;

// Straight-line distance. Good enough for ranking search results and finding
// the nearest stop; it is not road distance.
export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export const formatDistance = (km: number) =>
  km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;

// OSM maps each side of a road as its own node, so the same stop name often
// appears several times within a few dozen metres. Showing all of them in a
// result list is noise, so near-duplicates collapse to the closest one.
const DEDUPE_RADIUS_KM = 0.25;

export type StopResult = Stop & { distanceKm: number };

/**
 * Ranks stops whose name starts with the query above those that merely contain
 * it, then by distance from the reference point.
 */
export function searchStops(
  query: string,
  from: { lat: number; lng: number } = CURRENT_LOCATION,
  limit = 20
): StopResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const matches = stops
    .filter((s) => s.name.toLowerCase().includes(q))
    .map((s) => ({ ...s, distanceKm: distanceKm(from, s) }))
    .sort((a, b) => {
      const aStarts = a.name.toLowerCase().startsWith(q);
      const bStarts = b.name.toLowerCase().startsWith(q);
      if (aStarts !== bStarts) return aStarts ? -1 : 1;
      return a.distanceKm - b.distanceKm;
    });

  const kept: StopResult[] = [];
  for (const candidate of matches) {
    const duplicate = kept.some(
      (k) =>
        k.name.toLowerCase() === candidate.name.toLowerCase() &&
        distanceKm(k, candidate) < DEDUPE_RADIUS_KM
    );
    if (!duplicate) kept.push(candidate);
    if (kept.length >= limit) break;
  }

  return kept;
}

/** Closest stop to an arbitrary point — the first half of last-mile resolution. */
export function nearestStop(point: { lat: number; lng: number }): StopResult | null {
  if (stops.length === 0) return null;

  let best = stops[0];
  let bestDistance = distanceKm(point, best);

  for (const stop of stops) {
    const d = distanceKm(point, stop);
    if (d < bestDistance) {
      best = stop;
      bestDistance = d;
    }
  }

  return { ...best, distanceKm: bestDistance };
}

/** Stops inside the current map viewport, capped so rendering stays smooth. */
export function stopsInRegion(
  region: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number },
  limit = 150
): Stop[] {
  const halfLat = region.latitudeDelta / 2;
  const halfLng = region.longitudeDelta / 2;

  const visible: Stop[] = [];
  for (const stop of stops) {
    if (
      Math.abs(stop.lat - region.latitude) <= halfLat &&
      Math.abs(stop.lng - region.longitude) <= halfLng
    ) {
      visible.push(stop);
      if (visible.length >= limit) break;
    }
  }

  return visible;
}