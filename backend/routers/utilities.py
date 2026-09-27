"""
utilities.py — Underground Utilities & Subsurface Inventory API — SIH26011.

Supports:
- Water Pipeline, Sewer Line, Electrical Cable, Communication Cable, Underground Parking
- Depth (depth_m), Z-coordinates (min_z, max_z), LineString & Polygon geometries
- Spatial queries: "What properties are affected by this utility?", "What utilities are inside this parcel?"
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from models.database import get_db
from services.spatial_utils import check_utility_building_intersection, create_shapely_polygon
from shapely.geometry import LineString, shape
import json
import uuid
from datetime import datetime

router = APIRouter()


class UtilityCreateRequest(BaseModel):
    parcel_id: Optional[str] = None
    utility_type: str  # 'Water Pipeline', 'Sewer Line', 'Electrical Cable', 'Communication Cable', 'Underground Parking'
    asset_id: str
    depth_m: float
    length_m: Optional[float] = None
    geometry: List[Any]  # LineString coords [[lng, lat], ...] or Polygon ring
    metadata: Optional[Dict[str, Any]] = None


@router.get("")
def get_utilities(utility_type: Optional[str] = Query(None), parcel_id: Optional[str] = Query(None)):
    """Returns underground utilities with depth and conflict status."""
    conn = get_db()
    query = "SELECT * FROM utilities WHERE status='active'"
    params = []

    if utility_type:
        query += " AND utility_type=?"
        params.append(utility_type)
    if parcel_id:
        query += " AND parcel_id=?"
        params.append(parcel_id)

    rows = conn.execute(query, params).fetchall()
    conn.close()

    results = []
    for r in rows:
        d = dict(r)
        if d.get("geometry"):
            try:
                d["geometry"] = json.loads(d["geometry"])
            except Exception:
                pass
        if d.get("metadata"):
            try:
                d["metadata"] = json.loads(d["metadata"])
            except Exception:
                pass
        results.append(d)
    return results


@router.get("/{utility_id}/affected-properties")
def get_utility_affected_properties(utility_id: str):
    """
    Spatial Query: "What properties are affected by this utility?"
    Checks 3D horizontal intersection and depth proximity between utility line and property volumes.
    """
    conn = get_db()
    util = conn.execute("SELECT * FROM utilities WHERE id=?", (utility_id,)).fetchone()
    if not util:
        conn.close()
        raise HTTPException(status_code=404, detail="Utility not found")

    u_dict = dict(util)
    u_depth = u_dict.get("depth_m", 2.5)
    u_geom = json.loads(u_dict["geometry"]) if isinstance(u_dict["geometry"], str) else u_dict["geometry"]

    coords = u_geom.get("coordinates", []) if isinstance(u_geom, dict) else u_geom

    props = conn.execute("SELECT * FROM properties WHERE status='active'").fetchall()
    affected = []

    for p in props:
        p_dict = dict(p)
        if p_dict.get("geometry_2d"):
            try:
                b_coords = json.loads(p_dict["geometry_2d"])
                intersects, msg = check_utility_building_intersection(
                    coords, u_depth, b_coords, p_dict.get("min_z", -5), p_dict.get("max_z", 15)
                )
                if intersects:
                    affected.append({
                        "property_id": p_dict["id"],
                        "unit_number": p_dict.get("unit_number"),
                        "property_type": p_dict.get("property_type"),
                        "min_z": p_dict.get("min_z"),
                        "max_z": p_dict.get("max_z"),
                        "intersection_details": msg
                    })
            except Exception:
                pass

    conn.close()
    return {"utility_id": utility_id, "asset_id": u_dict["asset_id"], "affected_properties_count": len(affected), "affected_properties": affected}


@router.get("/parcel/{parcel_id}")
def get_parcel_utilities(parcel_id: str):
    """
    Spatial Query: "What utilities are inside this parcel?"
    """
    conn = get_db()
    rows = conn.execute("SELECT * FROM utilities WHERE parcel_id=? AND status='active'", (parcel_id,)).fetchall()
    conn.close()

    results = []
    for r in rows:
        d = dict(r)
        if d.get("geometry"):
            try:
                d["geometry"] = json.loads(d["geometry"])
            except Exception:
                pass
        results.append(d)
    return {"parcel_id": parcel_id, "utilities_count": len(results), "utilities": results}


@router.post("")
def create_utility(data: UtilityCreateRequest):
    """Registers an underground utility line or subsurface parking volume."""
    u_id = f"UTL-{uuid.uuid4().hex[:6].upper()}"
    now = datetime.now().isoformat()
    z_val = -abs(data.depth_m)

    geom_dict = {
        "type": "Polygon" if data.utility_type == "Underground Parking" else "LineString",
        "coordinates": data.geometry
    }

    conn = get_db()
    conn.execute("""
        INSERT INTO utilities (
            id, parcel_id, utility_type, asset_id, depth_m, min_z, max_z, length_m,
            geometry, crs, source, status, conflict_status, metadata, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'EPSG:4326', 'Municipal Utility GIS', 'active', 'none', ?, ?)
    """, (
        u_id, data.parcel_id, data.utility_type, data.asset_id,
        data.depth_m, z_val - 1.0, z_val, data.length_m,
        json.dumps(geom_dict), json.dumps(data.metadata or {}), now
    ))
    conn.commit()
    conn.close()

    return {"status": "success", "id": u_id, "asset_id": data.asset_id, "depth_m": data.depth_m, "z_coordinate": z_val}
