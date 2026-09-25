// Central access point for the OSM-derived trotro route dataset.
// Each route's stop list was computed offline (see scripts/match_routes.py)
// by snapping StreetMate's own named stops onto that route's road line —
// OSM's route relations don't include stop order themselves.

import rawRoutes from '@/assets/data/ghana_bus_routes.json';

type RawRoute = {
  route_id: string;
  ref: string | null;
  name: string | null;
  from: string | null;
  to: string | null;
  operator: string | null;
  travel_time_min: string | null;
  geometry: [number, number][]; // [lng, lat] pairs, OSM order
  stops: string[]; // stop IDs, in road order
  stop_names: (string | null)[];
};

export type RouteStop = {
  id: string;
  name: string;
};

export type Route = {
  id: string;
  ref: string | null;
  name: string;
  from: string | null;
  to: string | null;
  operator: string | null;
  travelTimeMin: number | null;
  // Ready for <Polyline coordinates={...} /> — already flipped to {latitude, longitude}.
  path: { latitude: number; longitude: number }[];
  stops: RouteStop[];
};

// A route with fewer than 2 matched stops can't be used for a journey anyway.
export const routes: Route[] = (rawRoutes as RawRoute[])
  .filter((r) => r.stops.length >= 2)
  .map((r) => ({
    id: r.route_id,
    ref: r.ref,
    name: r.name ?? `${r.from ?? '?'} → ${r.to ?? '?'}`,
    from: r.from,
    to: r.to,
    operator: r.operator,
    travelTimeMin: r.travel_time_min ? Number(r.travel_time_min) : null,
    path: r.geometry.map(([lng, lat]) => ({ latitude: lat, longitude: lng })),
    stops: r.stops.map((id, i) => ({ id, name: r.stop_names[i] ?? '' })),
  }));

/** All routes that pass through a given stop, e.g. to show "which trotros stop here". */
export function routesForStop(stopId: string): Route[] {
  return routes.filter((r) => r.stops.some((s) => s.id === stopId));
}

export function routeById(id: string): Route | undefined {
  return routes.find((r) => r.id === id);
}
