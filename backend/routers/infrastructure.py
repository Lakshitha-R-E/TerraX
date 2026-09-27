"""
infrastructure.py — Elevated Transport Corridors & Airspace Constraints API — SIH26011.

Supports:
- Elevated Transport Corridors (Metro Rail Corridor, Flyover, Elevated Road)
- Airport Airspace Constraint Surfaces (AAI Obstacle Limitation Surfaces)
- Property Air-Rights Volumetric Spaces
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from models.database import get_db
import json
import uuid
from datetime import datetime

router = APIRouter()


def _decode_geometry(value):
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except (TypeError, json.JSONDecodeError):
            return None
    if isinstance(value, dict) and value.get("type") and value.get("coordinates") is not None:
        return value
    if isinstance(value, list) and value:
        coordinates = value
        if isinstance(value[0], list) and len(value[0]) >= 2 and all(isinstance(v, (int, float)) for v in value[0][:2]):
            coordinates = [value]
        return {"type": "Polygon", "coordinates": coordinates}
    return None


def _decode_rows(rows):
    results = []
    for row in rows:
        item = dict(row)
        item["geometry"] = _decode_geometry(item.get("geometry"))
        if item.get("metadata"):
            try:
                item["metadata"] = json.loads(item["metadata"])
            except (TypeError, json.JSONDecodeError):
                pass
        results.append(item)
    return results


class InfraCreateRequest(BaseModel):
    parcel_id: Optional[str] = None
    infra_type: str  # 'Metro Rail Corridor', 'Elevated Road', 'Airport Airspace Constraint Surface', 'Property Air-Right Volume'
    asset_id: str
    height_m: float
    min_z: float = 0.0
    max_z: float = 45.0
    length_m: Optional[float] = None
    geometry: List[Any]  # LineString or Polygon coords
    metadata: Optional[Dict[str, Any]] = None


@router.get("")
def get_infrastructure(infra_type: Optional[str] = Query(None)):
    """Returns elevated structures and airspace constraint volumes."""
    conn = get_db()
    type_str = str(infra_type) if infra_type is not None and not hasattr(infra_type, 'default') else None
    if type_str:
        rows = conn.execute("SELECT * FROM infrastructure WHERE infra_type=? AND status='active'", (type_str,)).fetchall()
    else:
        rows = conn.execute("SELECT * FROM infrastructure WHERE status='active'").fetchall()
    constraints = conn.execute(
        "SELECT * FROM airspace_constraints WHERE status='active'"
    ).fetchall() if not type_str or any(term in type_str.lower() for term in ("airspace", "constraint", "airport")) else []
    conn.close()

    results = _decode_rows(rows)
    seen_geometry = {json.dumps(item.get("geometry"), sort_keys=True) for item in results}
    for row in constraints:
        item = dict(row)
        geometry = _decode_geometry(item.get("geometry"))
        if not geometry or (type_str and type_str.lower() not in item["constraint_type"].lower()):
            continue
        geometry_key = json.dumps(geometry, sort_keys=True)
        if geometry_key in seen_geometry:
            continue
        seen_geometry.add(geometry_key)
        results.append({
            "id": item["id"],
            "parcel_id": item.get("parcel_id"),
            "infra_type": item["constraint_type"],
            "asset_id": item.get("property_id") or item["id"],
            "height_m": item["max_z"],
            "min_z": item["min_z"],
            "max_z": item["max_z"],
            "length_m": None,
            "geometry": geometry,
            "crs": item.get("crs", "EPSG:4326"),
            "source": item.get("source"),
            "status": item["status"],
            "metadata": {"authority": item.get("authority"), "source": item.get("source")},
        })
    return results


@router.get("/underground")
def get_underground_infrastructure():
    """Returns active underground utility lines, excluding parking volumes."""
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM utilities WHERE status='active' AND utility_type != 'Underground Parking'"
    ).fetchall()
    conn.close()
    return _decode_rows(rows)


@router.get("/parking")
def get_underground_parking():
    """Returns underground parking utilities and modeled property volumes."""
    conn = get_db()
    utilities = conn.execute(
        "SELECT * FROM utilities WHERE status='active' AND utility_type='Underground Parking'"
    ).fetchall()
    properties = conn.execute(
        "SELECT * FROM properties WHERE status='active' AND property_type='Underground Parking'"
    ).fetchall()
    conn.close()
    parking_properties = []
    for row in properties:
        item = dict(row)
        item["geometry_2d"] = _decode_geometry(item.get("geometry_2d"))
        parking_properties.append(item)
    return {"parking_utilities": _decode_rows(utilities), "parking_properties": parking_properties}


@router.get("/airspace")
def get_airspace_rights():
    """Returns modeled airspace volumes and aeronautical constraints separately."""
    conn = get_db()
    properties = conn.execute(
        "SELECT * FROM properties WHERE status='active' AND property_type='Air-Space Volume'"
    ).fetchall()
    constraints = conn.execute(
        "SELECT * FROM airspace_constraints WHERE status='active'"
    ).fetchall()
    conn.close()
    volumes = []
    for row in properties:
        item = dict(row)
        item["geometry_2d"] = _decode_geometry(item.get("geometry_2d"))
        volumes.append(item)
    return {"airspace_volumes": volumes, "aeronautical_constraints": _decode_rows(constraints)}


@router.get("/elevated")
def get_elevated_infrastructure():
    """Returns active elevated infrastructure records."""
    conn = get_db()
    rows = conn.execute("SELECT * FROM infrastructure WHERE status='active'").fetchall()
    conn.close()
    return [
        item for item in _decode_rows(rows)
        if not any(term in item["infra_type"].lower() for term in ("airspace", "airport", "constraint"))
    ]


@router.post("")
def create_infrastructure(data: InfraCreateRequest):
    """Registers an elevated transport corridor or airspace constraint volume."""
    inf_id = f"INF-{uuid.uuid4().hex[:6].upper()}"
    now = datetime.now().isoformat()

    geom_dict = {
        "type": "Polygon" if "airspace" in data.infra_type.lower() or "surface" in data.infra_type.lower() else "LineString",
        "coordinates": data.geometry
    }

    conn = get_db()
    conn.execute("""
        INSERT INTO infrastructure (
            id, parcel_id, infra_type, asset_id, height_m, length_m,
            geometry, crs, source, status, conflict_status, metadata, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'EPSG:4326', 'Infrastructure GIS', 'active', 'none', ?, ?)
    """, (
        inf_id, data.parcel_id, data.infra_type, data.asset_id,
        data.height_m, data.length_m, json.dumps(geom_dict),
        json.dumps(data.metadata or {}), now
    ))

    # Also log in dedicated table
    if "airspace" in data.infra_type.lower() or "constraint" in data.infra_type.lower():
        conn.execute("""
            INSERT INTO airspace_constraints (id, parcel_id, constraint_type, authority, min_z, max_z, geometry, source, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
        """, (
            f"AIR-{inf_id}", data.parcel_id, data.infra_type,
            (data.metadata or {}).get("authority", "Airports Authority of India (AAI)"),
            data.min_z, data.max_z, json.dumps(geom_dict), "AAI Obstacle Limitation Surface", now
        ))
    else:
        conn.execute("""
            INSERT INTO elevated_structures (id, parcel_id, infra_type, asset_id, height_m, min_z, max_z, length_m, geometry, source, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Metro Rail Authority', 'active', ?)
        """, (
            f"ELV-{inf_id}", data.parcel_id, data.infra_type, data.asset_id,
            data.height_m, data.height_m, data.height_m + 5.0, data.length_m, json.dumps(geom_dict), now
        ))

    conn.commit()
    conn.close()

    return {"status": "success", "id": inf_id, "asset_id": data.asset_id, "height_m": data.height_m}
