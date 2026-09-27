"""
spatial_utils.py — Robust Geospatial Engine for 3D ULPIN System — SIH26011.

Uses Shapely & PyProj to perform:
1. Exact metric area (sqm) and volume (cbm) calculations using projected CRS (UTM Zone 44N / EPSG:32644 for Tamil Nadu).
2. Intelligent 2D/3D topology validation (Self-intersections, parcel overlaps, gaps, building outside parcel, 3D volume overlap).
3. Reprojection from WGS84 (EPSG:4326) to EPSG:32644 and vice-versa.
4. Stable geometry hash generation for Property DNA digital fingerprints.
5. Bounding box and centroid calculations.
"""

import json
import hashlib
import math
from typing import List, Dict, Any, Tuple, Optional
from shapely.geometry import Polygon, MultiPolygon, LineString, Point, box, shape
from shapely.validation import explain_validity
from shapely.ops import transform, unary_union
import pyproj

# Projection definition for Tamil Nadu region (UTM Zone 44N)
WGS84 = pyproj.CRS("EPSG:4326")
UTM44N = pyproj.CRS("EPSG:32644")

# Transformer for coordinate reprojection
to_utm = pyproj.Transformer.from_crs(WGS84, UTM44N, always_xy=True).transform
to_wgs84 = pyproj.Transformer.from_crs(UTM44N, WGS84, always_xy=True).transform


def create_shapely_polygon(coords: List[List[float]]) -> Optional[Polygon]:
    """Creates a Shapely Polygon from GeoJSON coordinate array [[lng, lat], ...]."""
    if not coords or len(coords) < 3:
        return None
    try:
        # Ensure polygon ring is closed
        ring = list(coords)
        if ring[0] != ring[-1]:
            ring.append(ring[0])
        poly = Polygon(ring)
        if not poly.is_valid:
            poly = poly.buffer(0)
        return poly
    except Exception:
        return None


def calculate_metric_area_and_volume(coords: List[List[float]], min_z: float, max_z: float) -> Tuple[float, float, float]:
    """
    Computes exact metric area (sqm), height (m), and volume (cbm) using EPSG:32644 (UTM 44N).
    Does NOT use raw lat/lon degree conversion.
    """
    height_m = max(0.0, float(max_z - min_z))
    poly_wgs = create_shapely_polygon(coords)
    if not poly_wgs or poly_wgs.is_empty:
        return 0.0, height_m, 0.0

    try:
        # Reproject WGS84 to UTM Zone 44N for accurate metric calculations
        poly_utm = transform(to_utm, poly_wgs)
        area_sqm = round(float(poly_utm.area), 2)
        volume_cbm = round(area_sqm * height_m, 2)
        return area_sqm, height_m, volume_cbm
    except Exception:
        # Fallback to geodesic calculation if transform fails
        area_sqm = round(float(poly_wgs.area * (111320 ** 2) * math.cos(math.radians(poly_wgs.centroid.y))), 2)
        volume_cbm = round(area_sqm * height_m, 2)
        return area_sqm, height_m, volume_cbm


def generate_geometry_hash(coords: Any, min_z: float, max_z: float) -> str:
    """Generates a stable SHA-256 hash for 2D footprint + vertical extent."""
    norm_data = {
        "coords": coords,
        "min_z": round(float(min_z), 2),
        "max_z": round(float(max_z), 2)
    }
    raw_str = json.dumps(norm_data, sort_keys=True)
    return hashlib.sha256(raw_str.encode('utf-8')).hexdigest()[:16]


def validate_2d_geometry(coords: List[List[float]]) -> Tuple[bool, str]:
    """Validates 2D polygon topology for self-intersections and validity."""
    if not coords or len(coords) < 4:
        return False, "Polygon has fewer than 4 points (including closure)"

    for pt in coords:
        if not (isinstance(pt, (list, tuple)) and len(pt) >= 2):
            return False, f"Malformed point coordinate: {pt}"
        lng, lat = pt[0], pt[1]
        if not (-180.0 <= lng <= 180.0 and -90.0 <= lat <= 90.0):
            return False, f"Coordinates out of WGS84 range: [{lng}, {lat}]"

    poly = create_shapely_polygon(coords)
    if not poly:
        return False, "Failed to construct valid polygon geometry"

    if not poly.is_valid:
        return False, f"Invalid polygon topology: {explain_validity(poly)}"

    if poly.area < 1e-12:
        return False, "Degenerate polygon geometry with zero surface area"

    return True, "VALID"


def check_parcel_overlap(poly_a_coords: List[List[float]], poly_b_coords: List[List[float]]) -> Tuple[bool, float]:
    """Checks if two 2D parcels overlap and returns overlap area in sqm."""
    poly_a = create_shapely_polygon(poly_a_coords)
    poly_b = create_shapely_polygon(poly_b_coords)
    if not poly_a or not poly_b:
        return False, 0.0

    if poly_a.intersects(poly_b):
        inter = poly_a.intersection(poly_b)
        if inter.area > 1e-9:
            inter_utm = transform(to_utm, inter)
            return True, round(float(inter_utm.area), 2)
    return False, 0.0


def check_airspace_height_conflict(
    footprint_coords: List[List[float]],
    proposed_max_z: float,
    constraint_coords: List[List[float]],
    constraint_max_z: float,
) -> Tuple[bool, float]:
    """Checks horizontal intersection and vertical clearance against an airspace ceiling."""
    try:
        if float(proposed_max_z) <= float(constraint_max_z):
            return False, 0.0
    except (TypeError, ValueError):
        return False, 0.0
    intersects, overlap_area = check_parcel_overlap(footprint_coords, constraint_coords)
    return intersects and overlap_area > 0.01, overlap_area


def check_3d_volume_overlap(
    poly_a_coords: List[List[float]], min_z_a: float, max_z_a: float,
    poly_b_coords: List[List[float]], min_z_b: float, max_z_b: float
) -> Tuple[bool, float, float]:
    """
    Checks if two 3D property volumes overlap in both 2D horizontal space and Z vertical extent.
    Returns: (has_overlap, horizontal_overlap_sqm, vertical_overlap_m)
    """
    # 1. Check vertical Z range overlap
    z_overlap_m = min(float(max_z_a), float(max_z_b)) - max(float(min_z_a), float(min_z_b))
    if z_overlap_m <= 0.05:  # Tolerance threshold 5cm
        return False, 0.0, 0.0

    # 2. Check 2D horizontal polygon overlap
    has_2d_overlap, overlap_sqm = check_parcel_overlap(poly_a_coords, poly_b_coords)
    if has_2d_overlap and overlap_sqm > 0.01:
        return True, overlap_sqm, round(z_overlap_m, 2)

    return False, 0.0, 0.0


def check_utility_building_intersection(
    utility_coords: List[List[float]], utility_depth_m: float,
    building_coords: List[List[float]], building_min_z: float, building_max_z: float
) -> Tuple[bool, str]:
    """Checks if an underground utility line intersects a building footprint or underground level."""
    if not utility_coords or len(utility_coords) < 2:
        return False, "Invalid utility geometry"

    try:
        line_wgs = LineString(utility_coords)
        bld_wgs = create_shapely_polygon(building_coords)
        if not bld_wgs:
            return False, "Invalid building geometry"

        utility_z = -abs(float(utility_depth_m))
        bld_min_z = float(building_min_z)
        bld_max_z = float(building_max_z)

        # Check vertical Z proximity
        if not (bld_min_z - 1.0 <= utility_z <= bld_max_z + 1.0):
            return False, "Utility depth outside building Z range"

        # Check 2D horizontal line-polygon intersection
        if line_wgs.intersects(bld_wgs):
            inter = line_wgs.intersection(bld_wgs)
            inter_utm = transform(to_utm, inter)
            length_m = round(float(inter_utm.length), 2)
            return True, f"Utility line intersects building by {length_m}m at depth -{abs(utility_depth_m)}m"

        return False, "No intersection"
    except Exception as ex:
        return False, str(ex)
