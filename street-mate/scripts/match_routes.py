# Matches StreetMate's own bus stops onto OpenStreetMap trotro route lines.
#
# Why this exists: OSM stores a route's road path (a line) separately from
# which stops sit along it (an ordered relation membership). The GeoJSON
# export from Overpass Turbo keeps the line but drops that stop ordering.
# This script rebuilds it by snapping each of our own stops onto the
# nearest point on each route's line, then sorting by position along it.
#
# Inputs:
#   - ghana_bus_stops.json   our own stop dataset (ID, Stop names, latitude, longitude)
#   - export.geojson         Overpass Turbo export of Greater Accra bus route relations
# Output:
#   - ghana_bus_routes.json  one entry per route, with stops listed in road order
#
# Run:  python3 match_routes.py
# Needs: pip install numpy --break-system-packages

import json
import math
import statistics

STOPS_PATH = "ghana_bus_stops.json"
ROUTES_PATH = "export.geojson"
OUT_PATH = "ghana_bus_routes.json"

# A stop counts as "on" a route if it falls within this distance of the
# route's road line. 60m covers a stop standing off to the side of the
# road without pulling in stops from a parallel street.
THRESHOLD_M = 60

# Bounding-box prefilter margin in degrees (~330m) before the precise
# distance check, so each route only tests stops that could plausibly be near it.
MARGIN_DEG = 0.003

import numpy as np

with open(STOPS_PATH) as f:
    raw_stops = json.load(f)

# Same filter as data/stops.ts: unnamed OSM nodes are unusable for search
# or display, so they're excluded here too, for consistency.
stops = [s for s in raw_stops if s.get("Stop names")]

with open(ROUTES_PATH) as f:
    geo = json.load(f)

route_feats = [f for f in geo["features"] if f["properties"].get("type") == "route"]

# Local flat projection centred on Accra. Good enough at city scale;
# avoids pulling in a full geo library for this one-off script.
LAT0 = 5.6
R = 6371000.0


def to_xy_arr(lons, lats):
    x = np.radians(lons) * R * math.cos(math.radians(LAT0))
    y = np.radians(lats) * R
    return x, y


def flatten_coords(geom):
    if geom["type"] == "LineString":
        return [geom["coordinates"]]
    if geom["type"] == "MultiLineString":
        return geom["coordinates"]
    return []


def point_seg_dist_t_vec(px, py, ax, ay, bx, by):
    """Vectorised distance + position-along-segment from N points to M segments."""
    dx, dy = bx - ax, by - ay
    seg_len2 = dx * dx + dy * dy
    seg_len2[seg_len2 == 0] = 1e-9
    wx = px[:, None] - ax[None, :]
    wy = py[:, None] - ay[None, :]
    t = (wx * dx[None, :] + wy * dy[None, :]) / seg_len2[None, :]
    t = np.clip(t, 0, 1)
    cx = ax[None, :] + t * dx[None, :]
    cy = ay[None, :] + t * dy[None, :]
    dist = np.hypot(px[:, None] - cx, py[:, None] - cy)
    return dist, t


stop_lons = np.array([s["longitude"] for s in stops])
stop_lats = np.array([s["latitude"] for s in stops])
stop_x, stop_y = to_xy_arr(stop_lons, stop_lats)

results = []
match_counts = []

for feat in route_feats:
    props = feat["properties"]
    parts = flatten_coords(feat["geometry"])
    base = {
        "route_id": props.get("@id"),
        "ref": props.get("ref"),
        "name": props.get("name"),
        "from": props.get("from"),
        "to": props.get("to"),
        "operator": props.get("operator"),
        "travel_time_min": props.get("travel_time"),
        "geometry": feat["geometry"]["coordinates"],
        "stops": [],
        "stop_names": [],
    }
    if not parts:
        results.append(base)
        match_counts.append(0)
        continue

    all_lons = [pt[0] for part in parts for pt in part]
    all_lats = [pt[1] for part in parts for pt in part]
    min_lon, max_lon = min(all_lons) - MARGIN_DEG, max(all_lons) + MARGIN_DEG
    min_lat, max_lat = min(all_lats) - MARGIN_DEG, max(all_lats) + MARGIN_DEG

    mask = (
        (stop_lons >= min_lon) & (stop_lons <= max_lon) &
        (stop_lats >= min_lat) & (stop_lats <= max_lat)
    )
    cand_idx = np.where(mask)[0]
    if len(cand_idx) == 0:
        results.append(base)
        match_counts.append(0)
        continue

    px, py = stop_x[cand_idx], stop_y[cand_idx]

    ax_list, ay_list, bx_list, by_list, cum_before_list = [], [], [], [], []
    cum = 0.0
    for part in parts:
        xs, ys = to_xy_arr(np.array([p[0] for p in part]), np.array([p[1] for p in part]))
        for i in range(len(xs) - 1):
            ax_list.append(xs[i]); ay_list.append(ys[i])
            bx_list.append(xs[i + 1]); by_list.append(ys[i + 1])
            cum_before_list.append(cum)
            cum += math.hypot(xs[i + 1] - xs[i], ys[i + 1] - ys[i])

    ax, ay = np.array(ax_list), np.array(ay_list)
    bx, by = np.array(bx_list), np.array(by_list)
    cum_before = np.array(cum_before_list)
    seg_len = np.hypot(bx - ax, by - ay)

    dist, t = point_seg_dist_t_vec(px, py, ax, ay, bx, by)
    best_seg = np.argmin(dist, axis=1)
    best_dist = dist[np.arange(len(cand_idx)), best_seg]
    best_t = t[np.arange(len(cand_idx)), best_seg]
    best_pos = cum_before[best_seg] + best_t * seg_len[best_seg]

    matched = [
        (best_pos[i], stops[gi])
        for i, gi in enumerate(cand_idx)
        if best_dist[i] <= THRESHOLD_M
    ]
    matched.sort(key=lambda x: x[0])

    ordered = []
    last_id = None
    for _, s in matched:
        if s["ID"] == last_id:
            continue  # route line doubling back over itself
        ordered.append(s)
        last_id = s["ID"]

    base["stops"] = [s["ID"] for s in ordered]
    base["stop_names"] = [s["Stop names"] for s in ordered]
    results.append(base)
    match_counts.append(len(ordered))

with open(OUT_PATH, "w") as f:
    json.dump(results, f)

print(f"Matched {len(results)} routes.")
print(f"  0 stops matched: {sum(1 for c in match_counts if c == 0)} routes")
print(f"  average stops per route: {statistics.mean(match_counts):.1f}")
print(f"  median: {statistics.median(match_counts)}, max: {max(match_counts)}")
print(f"Wrote {OUT_PATH}")
