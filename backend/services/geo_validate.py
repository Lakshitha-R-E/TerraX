"""
geo_validate.py — Geospatial validation utilities for 3D ULPIN System.

Validates GeoJSON features before rendering in Cesium:
- Geometry type check (Polygon / MultiPolygon only)
- Coordinate range validation (WGS84 lon/lat)
- No NaN / null coordinates
- Study-area bounding-box check
- Minimum area / degenerate geometry check

NOTE: All datasets in this project use EPSG:4326 (WGS84 geographic).
Coordinates are in [longitude, latitude] order as per GeoJSON RFC 7946.
No reprojection is required.
"""

from __future__ import annotations
import math
from typing import Any

# ─── Study Area ───────────────────────────────────────────────────────────────
# Derived from buildings.microsoft.adyar.geojson metadata bbox.
# Adyar / Chennai demo sector.
STUDY_BBOX = {
    "min_lon": 80.2525,
    "min_lat": 13.0025,
    "max_lon": 80.2635,
    "max_lat": 13.0145,
}

# Acceptable GeoJSON geometry types for building footprints
ALLOWED_GEOMETRY_TYPES = {"Polygon", "MultiPolygon"}

# Minimum valid polygon ring coordinate count (degenerate geometry guard)
MIN_RING_COORDS = 4  # 3 unique + 1 closing = 4

# Minimum reasonable footprint area in square degrees (removes single-point artifacts)
MIN_AREA_SQ_DEG = 1e-12


def detect_crs(geojson: dict) -> str:
    """
    Extract CRS information from a GeoJSON object.
    Returns the CRS string from metadata if present, otherwise 'EPSG:4326 (assumed)'.
    """
    metadata = geojson.get("metadata", {})
    crs = metadata.get("crs")
    if crs:
        return crs

    # Check legacy GeoJSON 'crs' property (pre-RFC 7946)
    crs_obj = geojson.get("crs")
    if crs_obj and isinstance(crs_obj, dict):
        props = crs_obj.get("properties", {})
        name = props.get("name", "")
        if name:
            return name

    return "EPSG:4326 (assumed — no explicit CRS tag found)"


def is_valid_lon(lon: float) -> bool:
    return isinstance(lon, (int, float)) and not math.isnan(lon) and -180.0 <= lon <= 180.0


def is_valid_lat(lat: float) -> bool:
    return isinstance(lat, (int, float)) and not math.isnan(lat) and -90.0 <= lat <= 90.0


def is_within_study_bbox(lon: float, lat: float, bbox: dict | None = None) -> bool:
    """Check if a coordinate pair is within the study area bounding box."""
    b = bbox or STUDY_BBOX
    return (b["min_lon"] <= lon <= b["max_lon"]) and (b["min_lat"] <= lat <= b["max_lat"])


def _ring_area_sq_deg(ring: list[list[float]]) -> float:
    """Compute shoelace area of a polygon ring in square degrees (not projected)."""
    n = len(ring)
    if n < 3:
        return 0.0
    area = 0.0
    for i in range(n):
        j = (i + 1) % n
        area += ring[i][0] * ring[j][1]
        area -= ring[j][0] * ring[i][1]
    return abs(area) / 2.0


def validate_ring(ring: list, bbox: dict | None = None) -> tuple[bool, str]:
    """Validate a single polygon coordinate ring."""
    if not isinstance(ring, list) or len(ring) < MIN_RING_COORDS:
        return False, f"Ring has fewer than {MIN_RING_COORDS} coordinate pairs"

    for idx, coord in enumerate(ring):
        if not isinstance(coord, (list, tuple)) or len(coord) < 2:
            return False, f"Coordinate at index {idx} is malformed: {coord}"
        lon, lat = coord[0], coord[1]
        if not is_valid_lon(lon):
            return False, f"Invalid longitude at index {idx}: {lon}"
        if not is_valid_lat(lat):
            return False, f"Invalid latitude at index {idx}: {lat}"

    # Check area
    area = _ring_area_sq_deg(ring)
    if area < MIN_AREA_SQ_DEG:
        return False, f"Degenerate ring: area {area:.2e} sq_deg is below threshold"

    # Check at least one point is within study bbox (centroid check)
    mid_idx = len(ring) // 2
    lon_mid, lat_mid = ring[mid_idx][0], ring[mid_idx][1]
    if not is_within_study_bbox(lon_mid, lat_mid, bbox):
        return False, f"Midpoint ({lon_mid:.5f}, {lat_mid:.5f}) is outside study area bbox"

    return True, "ok"


def validate_polygon_geometry(coords: list, bbox: dict | None = None) -> tuple[bool, str]:
    """Validate a GeoJSON Polygon coordinate array (list of rings)."""
    if not isinstance(coords, list) or len(coords) == 0:
        return False, "Polygon coordinates list is empty"

    # Validate exterior ring (first ring)
    outer_ring = coords[0]
    ok, reason = validate_ring(outer_ring, bbox)
    if not ok:
        return False, f"Exterior ring: {reason}"

    return True, "ok"


def validate_multipolygon_geometry(coords: list, bbox: dict | None = None) -> tuple[bool, str]:
    """Validate a GeoJSON MultiPolygon coordinate array."""
    if not isinstance(coords, list) or len(coords) == 0:
        return False, "MultiPolygon coordinates list is empty"

    valid_polys = 0
    for i, poly_coords in enumerate(coords):
        ok, reason = validate_polygon_geometry(poly_coords, bbox)
        if ok:
            valid_polys += 1

    if valid_polys == 0:
        return False, "All sub-polygons in MultiPolygon are invalid"

    return True, "ok"


def validate_feature(feature: dict[str, Any], bbox: dict | None = None) -> tuple[bool, str]:
    """
    Validate a single GeoJSON Feature for use as a building footprint.

    Returns:
        (True, "ok")              — feature is valid for rendering
        (False, reason_string)    — feature is rejected with explanation
    """
    if not isinstance(feature, dict):
        return False, "Feature is not a dict"

    geometry = feature.get("geometry")
    if not geometry or not isinstance(geometry, dict):
        return False, "Missing or null geometry"

    geom_type = geometry.get("type")
    if geom_type not in ALLOWED_GEOMETRY_TYPES:
        return False, f"Unsupported geometry type: {geom_type}"

    coords = geometry.get("coordinates")
    if coords is None:
        return False, "Missing coordinates in geometry"

    if geom_type == "Polygon":
        return validate_polygon_geometry(coords, bbox)
    elif geom_type == "MultiPolygon":
        return validate_multipolygon_geometry(coords, bbox)

    return False, f"Unhandled geometry type: {geom_type}"


def compute_bbox(features: list[dict]) -> dict:
    """
    Compute bounding box from a list of GeoJSON features.
    Returns dict with min_lon, min_lat, max_lon, max_lat.
    Falls back to STUDY_BBOX if no valid coordinates found.
    """
    min_lon = float("inf")
    min_lat = float("inf")
    max_lon = float("-inf")
    max_lat = float("-inf")
    found = False

    for feature in features:
        geom = feature.get("geometry", {})
        coords = geom.get("coordinates", [])
        geom_type = geom.get("type")

        def scan_rings(rings):
            nonlocal min_lon, min_lat, max_lon, max_lat, found
            for ring in rings:
                if not isinstance(ring, list):
                    continue
                for coord in ring:
                    if isinstance(coord, (list, tuple)) and len(coord) >= 2:
                        lon, lat = coord[0], coord[1]
                        if is_valid_lon(lon) and is_valid_lat(lat):
                            min_lon = min(min_lon, lon)
                            min_lat = min(min_lat, lat)
                            max_lon = max(max_lon, lon)
                            max_lat = max(max_lat, lat)
                            found = True

        if geom_type == "Polygon" and coords:
            scan_rings(coords)
        elif geom_type == "MultiPolygon" and coords:
            for poly in coords:
                scan_rings(poly)

    if not found:
        return STUDY_BBOX.copy()

    return {
        "min_lon": round(min_lon, 6),
        "min_lat": round(min_lat, 6),
        "max_lon": round(max_lon, 6),
        "max_lat": round(max_lat, 6),
    }


def compute_centroid(polygon_coords: list) -> tuple[float, float]:
    """
    Compute approximate centroid of a GeoJSON Polygon coordinate array.
    Returns (longitude, latitude).
    """
    if not polygon_coords or not polygon_coords[0]:
        return (80.2571, 13.0067)  # Adyar fallback

    ring = polygon_coords[0]
    lons = [c[0] for c in ring if isinstance(c, (list, tuple)) and len(c) >= 2]
    lats = [c[1] for c in ring if isinstance(c, (list, tuple)) and len(c) >= 2]

    if not lons:
        return (80.2571, 13.0067)

    return (sum(lons) / len(lons), sum(lats) / len(lats))


def validate_feature_collection(geojson: dict, bbox: dict | None = None) -> dict:
    """
    Validate all features in a GeoJSON FeatureCollection.

    Returns dict with:
        crs             : str
        total           : int
        valid           : int
        rejected        : int
        study_bbox      : dict
        computed_bbox   : dict
        valid_features  : list[dict] (features with _valid/_reject_reason annotations)
        rejected_features : list[dict]
    """
    crs = detect_crs(geojson)
    features = geojson.get("features", [])
    study_bbox = bbox or STUDY_BBOX

    valid_features = []
    rejected_features = []

    for feature in features:
        ok, reason = validate_feature(feature, study_bbox)
        annotated = {**feature, "_valid": ok, "_reject_reason": None if ok else reason}
        if ok:
            valid_features.append(annotated)
        else:
            rejected_features.append(annotated)

    computed_bbox = compute_bbox(features)

    return {
        "crs": crs,
        "total": len(features),
        "valid": len(valid_features),
        "rejected": len(rejected_features),
        "study_bbox": study_bbox,
        "computed_bbox": computed_bbox,
        "valid_features": valid_features,
        "rejected_features": rejected_features,
    }
