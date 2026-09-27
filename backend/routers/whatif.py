"""
whatif.py — What-If 3D Planning Sandbox & Infrastructure Impact Engine — SIH26011.

Simulates planning scenarios without modifying real cadastral database records:
- Scenario 1: Add a new floor to existing building
- Scenario 2: Extend building footprint horizontal extent
- Scenario 3: Construct underground parking level (-5.0m to -2.5m)
- Scenario 4: Lay new subsurface utility pipeline
- Scenario 5: Erect elevated transit corridor / flyover (+8.5m height)
- Scenario 6: Reserve airspace volumetric spatial right

Executes 3D spatial conflict detection and returns Current vs Scenario vs Differences vs Affected Properties.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from models.database import get_db
from services.spatial_utils import (
    calculate_metric_area_and_volume, check_parcel_overlap,
    check_3d_volume_overlap, check_utility_building_intersection,
    check_airspace_height_conflict, create_shapely_polygon
)
import json
import math
import uuid

router = APIRouter()


class AddFloorScenario(BaseModel):
    building_id: str
    added_floors_count: int = 1
    floor_height_m: float = 3.0
    property_id: Optional[str] = None


def _polygon_ring(raw_geometry: Any) -> List[List[float]]:
    if isinstance(raw_geometry, str):
        try:
            raw_geometry = json.loads(raw_geometry)
        except (TypeError, ValueError):
            return []
    if isinstance(raw_geometry, dict):
        if raw_geometry.get("type") == "Polygon":
            raw_geometry = raw_geometry.get("coordinates", [])
        if isinstance(raw_geometry, list) and raw_geometry and isinstance(raw_geometry[0], list):
            raw_geometry = raw_geometry[0]
    if not isinstance(raw_geometry, list):
        return []
    ring = []
    for point in raw_geometry:
        if not isinstance(point, (list, tuple)) or len(point) < 2:
            return []
        try:
            longitude, latitude = float(point[0]), float(point[1])
        except (TypeError, ValueError):
            return []
        if not math.isfinite(longitude) or not math.isfinite(latitude):
            return []
        if not -180 <= longitude <= 180 or not -90 <= latitude <= 90:
            return []
        ring.append([longitude, latitude])
    if len(ring) < 3:
        return []
    if ring[0] != ring[-1]:
        ring.append(ring[0])
    return ring if len(ring) >= 4 else []


class ExtendBuildingScenario(BaseModel):
    building_id: str
    extension_sqm: float = 50.0
    direction: str = "North"


class UndergroundParkingScenario(BaseModel):
    parcel_id: str
    depth_min_z: float = -5.0
    depth_max_z: float = -2.5
    footprint_coordinates: List[List[float]]


class NewUtilityScenario(BaseModel):
    utility_type: str = "Water Pipeline"
    depth_m: float = 3.0
    line_coordinates: List[List[float]]


class ElevatedCorridorScenario(BaseModel):
    infra_type: str = "Metro Rail Corridor"
    height_m: float = 8.5
    line_coordinates: List[List[float]]


@router.post("/simulate/add-floor")
def simulate_add_floor(scenario: AddFloorScenario):
    """
    Sandbox Simulation: Add floor(s) to a building.
    Checks height limits, airspace constraints, and property volume changes without mutating DB.
    """
    if scenario.added_floors_count < 1 or scenario.floor_height_m <= 0:
        raise HTTPException(status_code=422, detail="Added floors and floor height must be positive")

    conn = get_db()
    bld = conn.execute("SELECT * FROM buildings WHERE id=?", (scenario.building_id,)).fetchone()
    if not bld:
        conn.close()
        raise HTTPException(status_code=404, detail="Building not found")

    b_dict = dict(bld)
    prop_dict = None
    parcel_coordinates = None
    if scenario.property_id:
        property_row = conn.execute("SELECT * FROM properties WHERE id=?", (scenario.property_id,)).fetchone()
        if not property_row:
            conn.close()
            raise HTTPException(status_code=404, detail="Property not found")
        prop_dict = dict(property_row)
        if prop_dict.get("building_id") and prop_dict.get("building_id") != scenario.building_id:
            # Fallback to property's linked building if scenario.building_id is blank or mismatched
            linked_bld = conn.execute("SELECT * FROM buildings WHERE id=?", (prop_dict.get("building_id"),)).fetchone()
            if linked_bld:
                b_dict = dict(linked_bld)
                scenario.building_id = prop_dict.get("building_id")

        parcel_row = conn.execute("SELECT coordinates FROM parcels WHERE id=?", (prop_dict.get("parcel_id"),)).fetchone()
        if parcel_row:
            parcel_coordinates = _polygon_ring(parcel_row["coordinates"])

    footprint = _polygon_ring(b_dict.get("footprint"))
    if not footprint:
        conn.close()
        raise HTTPException(status_code=422, detail="Building footprint is missing or contains invalid coordinates")

    curr_floors = int(b_dict.get("total_floors") or 1)
    curr_height = float(b_dict.get("height_m") or 0)
    base_z = float(b_dict.get("ground_elevation") or 0)
    curr_max_z = float(b_dict.get("max_z") or (base_z + curr_height))
    if curr_height <= 0 or curr_max_z <= base_z:
        conn.close()
        raise HTTPException(status_code=422, detail="Building height range is invalid")

    new_floors = curr_floors + scenario.added_floors_count
    added_h = scenario.added_floors_count * scenario.floor_height_m
    new_height = curr_height + added_h
    new_max_z = curr_max_z + added_h
    area_sqm, _, current_volume = calculate_metric_area_and_volume(footprint, base_z, curr_max_z)
    _, _, proposed_volume = calculate_metric_area_and_volume(footprint, base_z, new_max_z)

    # Spatial Conflict Detection
    conflicts = []

    # 1. Airspace Constraints Check
    airspace_rows = conn.execute("SELECT * FROM infrastructure WHERE lower(infra_type) LIKE '%airspace%' OR lower(infra_type) LIKE '%airport%' OR lower(infra_type) LIKE '%aviation%' OR lower(infra_type) LIKE '%height restriction%' OR lower(infra_type) LIKE '%obstacle surface%' ").fetchall()
    airspace = [dict(row) for row in airspace_rows]
    constraints = conn.execute("SELECT * FROM airspace_constraints WHERE status='active'").fetchall()
    for constraint_row in constraints:
        constraint = dict(constraint_row)
        airspace.append({
            "id": constraint.get("id"),
            "infra_type": constraint.get("constraint_type"),
            "geometry": constraint.get("geometry"),
            "min_z": constraint.get("min_z"),
            "max_z": constraint.get("max_z"),
            "metadata": json.dumps({
                "authority": constraint.get("authority"),
                "min_z": constraint.get("min_z"),
                "max_z": constraint.get("max_z"),
            }),
        })

    for a_dict in airspace:
        metadata = a_dict.get("metadata")
        if isinstance(metadata, str):
            try:
                metadata = json.loads(metadata)
            except (TypeError, ValueError):
                metadata = {}
        if not isinstance(metadata, dict):
            metadata = {}

        # The ceiling limit where airspace constraint begins
        constraint_min_z = float(metadata.get("allowed_height_m") or metadata.get("min_z") or a_dict.get("min_z") or 25.0)

        airspace_geometry = a_dict.get("geometry")
        airspace_ring = _polygon_ring(airspace_geometry)
        if not airspace_ring:
            continue

        has_conflict, overlap_area = check_airspace_height_conflict(
            footprint, new_max_z, airspace_ring, constraint_min_z
        )
        if has_conflict:
            exceeded_by = round(new_max_z - constraint_min_z, 2)
            conflicts.append({
                "type": "Airspace Constraint Conflict",
                "conflict_type": "Airspace Conflict",
                "severity": "conflict",
                "affected_entity": a_dict.get("id"),
                "authority": metadata.get("authority", "Airports Authority of India (AAI)"),
                "allowed_height_msl": constraint_min_z,
                "proposed_height_msl": new_max_z,
                "exceeded_by_m": exceeded_by,
                "overlap_area_sqm": round(overlap_area, 2),
                "description": f"Proposed building height {new_max_z:.1f} m penetrates {a_dict.get('infra_type', 'Airspace Constraint')} (ceiling {constraint_min_z:.1f} m) by {exceeded_by:.1f} m across {round(overlap_area, 1)} m² footprint.",
                "message": f"Proposed building height {new_max_z:.1f} m penetrates {a_dict.get('infra_type', 'Airspace Constraint')} (ceiling {constraint_min_z:.1f} m) by {exceeded_by:.1f} m across {round(overlap_area, 1)} m² footprint.",
            })

    # 2. Parcel Boundary Check
    if parcel_coordinates:
        parcel_polygon = create_shapely_polygon(parcel_coordinates)
        building_polygon = create_shapely_polygon(footprint)
        if parcel_polygon and building_polygon and not parcel_polygon.covers(building_polygon):
            conflicts.append({
                "type": "Parcel Boundary Warning",
                "severity": "warning",
                "affected_entity": prop_dict.get("parcel_id") if prop_dict else None,
                "description": "The proposed floor footprint extends beyond its linked parcel boundary.",
                "message": "The proposed floor footprint extends beyond its linked parcel boundary.",
            })

    # 3. Underground Utility Check
    utilities = conn.execute("SELECT * FROM utilities WHERE status='active'").fetchall()
    for utility_row in utilities:
        utility = dict(utility_row)
        try:
            utility_geometry = json.loads(utility["geometry"]) if utility.get("geometry") else {}
            if not isinstance(utility_geometry, dict) or utility_geometry.get("type") != "LineString":
                continue
            utility_coords = utility_geometry.get("coordinates", [])
            intersects, description = check_utility_building_intersection(
                utility_coords, float(utility.get("depth_m") or 0),
                footprint, base_z, new_max_z,
            )
        except (KeyError, TypeError, ValueError, json.JSONDecodeError):
            continue
        if intersects:
            conflicts.append({
                "type": "Underground Utility Intersection",
                "severity": "conflict",
                "affected_entity": utility.get("asset_id") or utility.get("id"),
                "description": description,
                "message": description,
            })

    # 4. Adjacent Building Volume Overlap Check
    other_buildings = conn.execute("SELECT * FROM buildings WHERE id != ? AND status='active'", (scenario.building_id,)).fetchall()
    for other_row in other_buildings:
        other = dict(other_row)
        other_footprint = _polygon_ring(other.get("footprint"))
        if not other_footprint:
            continue
        try:
            other_min_z = float(other.get("min_z") or other.get("ground_elevation") or 0)
            other_max_z = float(other.get("max_z") or (other_min_z + float(other.get("height_m") or 0)))
            overlaps, overlap_area, overlap_height = check_3d_volume_overlap(
                footprint, curr_max_z, new_max_z,
                other_footprint, other_min_z, other_max_z,
            )
        except (TypeError, ValueError):
            continue
        if overlaps:
            conflicts.append({
                "type": "Building Volume Overlap",
                "severity": "conflict",
                "affected_entity": other["id"],
                "description": f"The proposed floor overlaps {other.get('name') or other['id']} across {overlap_height:.1f} m vertically and {overlap_area:.1f} m² horizontally.",
                "message": f"The proposed floor overlaps {other.get('name') or other['id']} across {overlap_height:.1f} m vertically and {overlap_area:.1f} m² horizontally.",
            })

    # 5. Existing 3D Property Units Overlap Check
    prop_rows = conn.execute("SELECT id, unit_number, building_id, min_z, max_z, geometry_2d FROM properties WHERE status='active'").fetchall()
    for pr in prop_rows:
        p_row = dict(pr)
        if scenario.property_id and p_row["id"] == scenario.property_id:
            continue
        p_fp = _polygon_ring(p_row.get("geometry_2d"))
        if not p_fp:
            continue
        try:
            p_min_z = float(p_row.get("min_z") or 0.0)
            p_max_z = float(p_row.get("max_z") or 3.0)
            overlaps, ov_sqm, ov_m = check_3d_volume_overlap(
                footprint, curr_max_z, new_max_z,
                p_fp, p_min_z, p_max_z
            )
            if overlaps:
                conflicts.append({
                    "type": "Property Volume Conflict",
                    "severity": "conflict",
                    "affected_entity": p_row["id"],
                    "description": f"Proposed floor volume (Z: {curr_max_z:.1f}m to {new_max_z:.1f}m) intersects existing 3D property unit {p_row.get('unit_number', p_row['id'])} across {ov_m:.1f}m vertically and {ov_sqm:.1f}m² horizontally.",
                    "message": f"Proposed floor volume (Z: {curr_max_z:.1f}m to {new_max_z:.1f}m) intersects existing 3D property unit {p_row.get('unit_number', p_row['id'])} across {ov_m:.1f}m vertically and {ov_sqm:.1f}m² horizontally.",
                })
        except Exception:
            continue

    conn.close()

    normalized_conflicts = [
        {
            **conflict,
            "description": conflict.get("message", conflict.get("type", "Spatial conflict detected")),
        }
        for conflict in conflicts
    ]
    property_id = prop_dict.get("id") if prop_dict else None
    current = {
        "property_id": property_id,
        "building_id": scenario.building_id,
        "floors": curr_floors,
        "height_m": curr_height,
        "min_z": base_z,
        "max_z": curr_max_z,
        "area_sqm": area_sqm,
        "volume_cbm": current_volume,
        "footprint": footprint,
    }
    proposed = {
        "property_id": property_id,
        "building_id": scenario.building_id,
        "floors": new_floors,
        "height_m": new_height,
        "min_z": base_z,
        "max_z": new_max_z,
        "area_sqm": area_sqm,
        "volume_cbm": proposed_volume,
        "footprint": footprint,
    }

    return {
        "scenario_id": f"SCN-{uuid.uuid4().hex[:10].upper()}",
        "property_id": property_id,
        "status": "completed",
        "scenario": "Add Floor Simulation",
        "building_id": scenario.building_id,
        "building_name": b_dict.get("name"),
        "current": current,
        "proposed": proposed,
        "conflicts": normalized_conflicts,
        "summary": {
            "conflict_count": sum(1 for conflict in conflicts if conflict.get("severity") == "conflict"),
            "warning_count": sum(1 for conflict in conflicts if conflict.get("severity") == "warning"),
            "height_difference_m": round(new_height - curr_height, 2),
            "volume_difference_cbm": round(proposed_volume - current_volume, 2),
        },
        "success": True,
        "has_conflict": bool(conflicts),
        "has_conflicts": bool(conflicts),
        "message": "Spatial conflicts detected." if conflicts else "No spatial conflicts detected.",
        "simulated_volume": {
            "floors": new_floors,
            "area_sqm": round(area_sqm, 2),
            "volume_cbm": round(proposed_volume, 2),
            "min_z": round(base_z, 2),
            "max_z": round(new_max_z, 2),
            "height_m": round(new_height, 2),
        },
        "current_state": {
            "total_floors": curr_floors,
            "building_height_m": curr_height,
            "max_z": curr_max_z
        },
        "scenario_state": {
            "total_floors": new_floors,
            "building_height_m": new_height,
            "max_z": new_max_z
        },
        "differences": {
            "height_delta_m": added_h,
            "floors_delta": scenario.added_floors_count,
            "volume_delta_cbm": round(proposed_volume - current_volume, 2),
        },
        "conflicts_detected": conflicts,
    }


@router.post("/simulate/underground-parking")
def simulate_underground_parking(scenario: UndergroundParkingScenario):
    """
    Sandbox Simulation: Construct underground parking level.
    Checks subsurface utility line intersections and existing underground assets.
    """
    conn = get_db()
    utils = conn.execute("SELECT * FROM utilities WHERE status='active'").fetchall()
    conflicts = []
    affected_utilities = []

    for u in utils:
        u_dict = dict(u)
        u_depth = u_dict.get("depth_m", 2.5)
        if u_dict.get("geometry"):
            try:
                coords = json.loads(u_dict["geometry"]).get("coordinates", [])
                intersects, desc = check_utility_building_intersection(
                    coords, u_depth, scenario.footprint_coordinates,
                    scenario.depth_min_z, scenario.depth_max_z
                )
                if intersects:
                    conflicts.append({
                        "type": "Subsurface Utility Intersection",
                        "utility_id": u_dict["id"],
                        "asset_id": u_dict["asset_id"],
                        "utility_type": u_dict["utility_type"],
                        "utility_depth": f"-{u_depth}m",
                        "details": desc
                    })
                    affected_utilities.append(u_dict["asset_id"])
            except Exception:
                pass

    conn.close()

    # Metric volume
    area_sqm, h_m, vol_cbm = calculate_metric_area_and_volume(
        scenario.footprint_coordinates, scenario.depth_min_z, scenario.depth_max_z
    )

    return {
        "status": "success",
        "scenario": "Underground Parking Simulation",
        "parcel_id": scenario.parcel_id,
        "depth_range": f"{scenario.depth_min_z}m to {scenario.depth_max_z}m",
        "area_sqm": area_sqm,
        "capacity_volume_cbm": vol_cbm,
        "affected_utilities": affected_utilities,
        "conflicts_detected": conflicts
    }


@router.post("/simulate/new-utility")
def simulate_new_utility(scenario: NewUtilityScenario):
    """
    Infrastructure Planning Simulation: Lay a new proposed subsurface utility pipeline.
    Checks affected parcels, buildings, and property volumes along the proposed corridor.
    """
    conn = get_db()
    parcels = [dict(p) for p in conn.execute("SELECT * FROM parcels WHERE status='active'").fetchall()]
    properties = [dict(pr) for pr in conn.execute("SELECT * FROM properties WHERE status='active'").fetchall()]
    conn.close()

    affected_parcels = []
    affected_properties = []

    for p in parcels:
        if p.get("coordinates"):
            try:
                p_coords = json.loads(p["coordinates"])
                intersects, desc = check_utility_building_intersection(
                    scenario.line_coordinates, scenario.depth_m, p_coords, -10.0, 10.0
                )
                if intersects:
                    affected_parcels.append({"parcel_id": p["id"], "parcel_number": p["parcel_number"], "land_use": p.get("land_use")})
            except Exception:
                pass

    for pr in properties:
        if pr.get("geometry_2d"):
            try:
                pr_coords = json.loads(pr["geometry_2d"])
                intersects, desc = check_utility_building_intersection(
                    scenario.line_coordinates, scenario.depth_m, pr_coords, pr.get("min_z", -5), pr.get("max_z", 15)
                )
                if intersects:
                    affected_properties.append({"property_id": pr["id"], "unit_number": pr.get("unit_number"), "type": pr.get("property_type")})
            except Exception:
                pass

    return {
        "status": "success",
        "scenario": "Proposed Utility Corridor Planning",
        "utility_type": scenario.utility_type,
        "proposed_depth_m": scenario.depth_m,
        "affected_parcels_count": len(affected_parcels),
        "affected_parcels": affected_parcels,
        "affected_properties_count": len(affected_properties),
        "affected_properties": affected_properties
    }
