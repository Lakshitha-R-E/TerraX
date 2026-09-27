"""
buildings.py — Multi-Storey Buildings API for 3D ULPIN System — SIH26011.

Supports:
- Building Footprints, Ground Elevation, Building Height, Floor Count
- Height Source Tracking ('Microsoft', 'LiDAR', 'DSM-DEM', 'Imported', 'Unavailable')
- Linked Floors, Units, and 3D Volumes
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from models.database import get_db
from services.spatial_utils import calculate_metric_area_and_volume, validate_2d_geometry
from services.index_tn_buildings import DISTRICTS
import json
import os
import sqlite3
import uuid
from datetime import datetime

router = APIRouter()
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
MICROSOFT_DB_PATH = os.path.join(DATA_DIR, "tn_buildings.sqlite")
MICROSOFT_SOURCE_URL = "https://github.com/microsoft/GlobalMLBuildingFootprints"


class BuildingCreateRequest(BaseModel):
    parcel_id: str
    building_number: str
    name: str
    total_floors: int = 1
    building_type: str = "Residential Apartment"
    ground_elevation: float = 0.0
    height_m: Optional[float] = None
    height_source: str = "Imported"  # 'Microsoft', 'LiDAR', 'DSM-DEM', 'Imported', 'Unavailable'
    floor_height: float = 3.0
    footprint: List[List[float]]


@router.get("")
def get_buildings(parcel_id: Optional[str] = Query(None)):
    """Returns buildings with height source metadata."""
    conn = get_db()
    if parcel_id:
        rows = conn.execute("SELECT * FROM buildings WHERE parcel_id=? AND status='active'", (parcel_id,)).fetchall()
    else:
        rows = conn.execute("SELECT * FROM buildings WHERE status='active'").fetchall()
    conn.close()

    results = []
    for r in rows:
        d = dict(r)
        if d.get("footprint"):
            try:
                d["footprint"] = json.loads(d["footprint"])
            except Exception:
                pass
        results.append(d)
    return results


def _microsoft_feature(row: sqlite3.Row) -> Dict[str, Any]:
    item = dict(row)
    return {
        "type": "Feature",
        "id": item["id"],
        "properties": {
            "id": item["id"],
            "district": item.get("district_name"),
            "height": item.get("height", -1),
            "confidence": item.get("confidence", -1),
            "ground_elevation": item.get("ground_elevation", 0),
            "area_sqm": item.get("area_sqm", 0),
            "longitude": item.get("centroid_lon"),
            "latitude": item.get("centroid_lat"),
            "source": item.get("source"),
            "license": item.get("license"),
            "source_url": MICROSOFT_SOURCE_URL,
            "matched_parcel_id": None,
        },
        "geometry": json.loads(item["geometry_json"]),
    }


def _microsoft_rows(min_lon: float, min_lat: float, max_lon: float, max_lat: float, district_id: Optional[str], limit: int):
    if not os.path.exists(MICROSOFT_DB_PATH):
        raise HTTPException(status_code=503, detail="Microsoft building footprint index is unavailable")
    conn = sqlite3.connect(MICROSOFT_DB_PATH, timeout=15)
    conn.row_factory = sqlite3.Row
    query = """SELECT * FROM buildings
        WHERE max_lon >= ? AND min_lon <= ? AND max_lat >= ? AND min_lat <= ?"""
    params: List[Any] = [min_lon, max_lon, min_lat, max_lat]
    if district_id and district_id != "all":
        query += " AND district_id = ?"
        params.append(district_id)
    query += " ORDER BY ((centroid_lon - ?) * (centroid_lon - ?) + (centroid_lat - ?) * (centroid_lat - ?)) LIMIT ?"
    center_lon, center_lat = (min_lon + max_lon) / 2, (min_lat + max_lat) / 2
    params.extend([center_lon, center_lon, center_lat, center_lat, max(1, min(limit, 3000))])
    try:
        rows = conn.execute(query, params).fetchall()
    finally:
        conn.close()
    return rows


def _microsoft_metadata(min_lon: float, min_lat: float, max_lon: float, max_lat: float, feature_count: int) -> Dict[str, Any]:
    bounds = {"min_lon": min_lon, "min_lat": min_lat, "max_lon": max_lon, "max_lat": max_lat}
    return {
        "source": "Microsoft Global ML Building Footprints",
        "license": "CDLA Permissive 2.0",
        "region": "Tamil Nadu, India",
        "crs": "EPSG:4326",
        "study_bbox": bounds,
        "computed_bbox": bounds,
        "total_features": 485261,
        "valid_features": 485261,
        "rejected_features": 0,
        "data_type": "Real building footprint polygons",
        "ownership_info": "Building footprints only; no ownership attributes",
        "height_note": "Building height is unavailable when height=-1 in the source dataset",
        "source_url": MICROSOFT_SOURCE_URL,
        "quality": {
            "total_features": 485261,
            "valid_features": 485261,
            "rejected_features": 0,
            "study_bbox": bounds,
            "computed_bbox": bounds,
            "returned_features": feature_count,
        },
    }


@router.get("/microsoft/districts")
def get_microsoft_districts():
    conn = sqlite3.connect(MICROSOFT_DB_PATH, timeout=15)
    try:
        covered = {row[0] for row in conn.execute("SELECT DISTINCT district_id FROM buildings")}
    finally:
        conn.close()
    districts = [{**district, "has_coverage": district["id"] in covered} for district in DISTRICTS]
    return {"districts": districts}


@router.get("/microsoft/coverage")
def get_microsoft_coverage():
    conn = sqlite3.connect(MICROSOFT_DB_PATH, timeout=15)
    try:
        total = conn.execute("SELECT COUNT(*) FROM buildings").fetchone()[0]
        covered = {row[0] for row in conn.execute("SELECT DISTINCT district_id FROM buildings")}
    finally:
        conn.close()
    return {
        "source": "Microsoft Global ML Building Footprints",
        "total_indexed_buildings": total,
        "districts": [{**district, "has_coverage": district["id"] in covered} for district in DISTRICTS],
        "crs": "EPSG:4326",
        "license": "CDLA Permissive 2.0",
    }


@router.get("/microsoft/stats")
def get_microsoft_stats():
    return _microsoft_metadata(80.14, 12.83, 80.33, 13.24, 0)


@router.get("/microsoft/spatial")
def get_spatial_microsoft_buildings(
    min_lon: float = Query(..., ge=-180, le=180),
    min_lat: float = Query(..., ge=-90, le=90),
    max_lon: float = Query(..., ge=-180, le=180),
    max_lat: float = Query(..., ge=-90, le=90),
    district_id: Optional[str] = Query(None),
    limit: int = Query(600, ge=1, le=3000),
):
    if min_lon >= max_lon or min_lat >= max_lat:
        raise HTTPException(status_code=422, detail="Spatial bounds must have positive width and height")
    rows = _microsoft_rows(min_lon, min_lat, max_lon, max_lat, district_id, limit)
    features = [_microsoft_feature(row) for row in rows]
    return {
        "type": "FeatureCollection",
        "metadata": _microsoft_metadata(min_lon, min_lat, max_lon, max_lat, len(features)),
        "features": features,
    }


@router.get("/microsoft")
def get_microsoft_buildings(limit: int = Query(1200, ge=1, le=3000), district_id: str = Query("chennai")):
    district = next((item for item in DISTRICTS if item["id"] == district_id), DISTRICTS[0])
    min_lon, min_lat, max_lon, max_lat = district["bbox"]
    rows = _microsoft_rows(min_lon, min_lat, max_lon, max_lat, district["id"], limit)
    features = [_microsoft_feature(row) for row in rows]
    return {
        "type": "FeatureCollection",
        "metadata": _microsoft_metadata(min_lon, min_lat, max_lon, max_lat, len(features)),
        "features": features,
    }


@router.get("/{building_id}")
def get_building_details(building_id: str):
    """Returns building details, height source, ground elevation, floors, and property units."""
    conn = get_db()
    building = conn.execute("SELECT * FROM buildings WHERE id=?", (building_id,)).fetchone()
    if not building:
        conn.close()
        raise HTTPException(status_code=404, detail="Building not found")

    b_dict = dict(building)
    if b_dict.get("footprint"):
        try:
            b_dict["footprint"] = json.loads(b_dict["footprint"])
        except Exception:
            pass

    # Fetch linked floors
    floors = conn.execute("SELECT * FROM floors WHERE building_id=? ORDER BY floor_number ASC", (building_id,)).fetchall()
    fl_list = [dict(f) for f in floors]

    # Fetch linked property units
    props = conn.execute("SELECT * FROM properties WHERE building_id=?", (building_id,)).fetchall()
    pr_list = [dict(p) for p in props]

    conn.close()

    return {
        "building": b_dict,
        "floors_count": len(fl_list),
        "floors": fl_list,
        "property_units": pr_list,
        "height_source": b_dict.get("height_source", "Unavailable"),
        "last_updated": b_dict.get("updated_at")
    }


@router.post("")
def create_building(data: BuildingCreateRequest):
    """Creates a building record with footprint validation and height source attribution."""
    is_valid, reason = validate_2d_geometry(data.footprint)
    if not is_valid:
        raise HTTPException(status_code=400, detail=f"Invalid Building Footprint: {reason}")

    # Calculate centroid
    lats = [pt[1] for pt in data.footprint]
    lngs = [pt[0] for pt in data.footprint]
    c_lat = sum(lats) / len(lats)
    c_lng = sum(lngs) / len(lngs)

    bld_id = f"B-{uuid.uuid4().hex[:6].upper()}"
    now = datetime.now().isoformat()

    h_m = data.height_m if data.height_m is not None else (data.total_floors * data.floor_height)
    h_src = data.height_source if data.height_m is not None else "Unavailable"

    conn = get_db()
    conn.execute("""
        INSERT INTO buildings (
            id, parcel_id, building_number, name, total_floors, building_type,
            ground_elevation, height_m, height_source, floor_height, footprint,
            centroid_lat, centroid_lng, min_z, max_z, crs, source_name,
            data_status, geometry_status, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.0, ?, 'EPSG:4326', 'Project Cadastral Engine', 'Imported', 'VALID', 'active', ?, ?)
    """, (
        bld_id, data.parcel_id, data.building_number, data.name,
        data.total_floors, data.building_type, data.ground_elevation,
        h_m, h_src, data.floor_height, json.dumps(data.footprint),
        c_lat, c_lng, h_m, now, now
    ))

    # Automatically generate Floor records
    for fn in range(1, data.total_floors + 1):
        fl_id = f"{bld_id}-FL{fn:02d}"
        z_min = round((fn - 1) * data.floor_height, 2)
        z_max = round(fn * data.floor_height, 2)
        conn.execute("""
            INSERT INTO floors (id, building_id, floor_number, floor_label, elevation_min, elevation_max, floor_area, height_m, evidence_source, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 250.0, ?, 'HEIGHT-DERIVED ESTIMATE', 'active', ?)
        """, (fl_id, bld_id, fn, f"Floor {fn}", z_min, z_max, data.floor_height, now))

    conn.commit()
    conn.close()

    return {
        "status": "success",
        "id": bld_id,
        "name": data.name,
        "height_m": h_m,
        "height_source": h_src,
        "floors_generated": data.total_floors
    }
