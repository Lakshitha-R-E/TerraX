"""
ulpins.py — 3D ULPIN Generation Engine API — SIH26011.

Generates stable, unique 3D ULPIN / Project Spatial Property Identifiers.
Format: 3D-ULPIN-{STATE}-{DISTRICT}-{PARCEL}-{BUILDING}-{FLOOR}-{UNIT}-{SPATIAL_HASH}
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from models.database import get_db
from services.spatial_utils import generate_geometry_hash
from datetime import datetime
import json
import uuid

router = APIRouter()


class ULPINGenerateInput(BaseModel):
    state: str = "Tamil Nadu"
    district: str = "Chennai"
    parcel_id: str
    building_id: str
    floor: int
    unit: int
    property_type: str = "Apartment Unit"
    min_z: float
    max_z: float
    footprint_coordinates: Optional[list] = None


@router.get("")
def get_ulpins():
    """Returns generated 3D ULPIN identifiers."""
    conn = get_db()
    rows = conn.execute("SELECT * FROM ulpins").fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.get("/{ulpin_code}")
def get_ulpin(ulpin_code: str):
    """Returns details for a specific 3D ULPIN identifier."""
    conn = get_db()
    row = conn.execute("SELECT * FROM ulpins WHERE ulpin_code=?", (ulpin_code,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="3D ULPIN not found")
    return dict(row)


@router.post("/generate")
def generate_ulpin(data: ULPINGenerateInput):
    """
    Generates a deterministic, stable 3D ULPIN Spatial Property Identifier.
    Guarantees that refreshing the page or re-querying the same property returns the exact same stable ULPIN.
    """
    # Standard 2/3-letter codes for common Indian states/districts used in this prototype;
    # falls back to naive slicing for anything not in the map so the endpoint still works generically.
    STATE_CODES = {"tamil nadu": "TN"}
    DISTRICT_CODES = {"chennai": "CHN"}
    state_short = STATE_CODES.get((data.state or "").strip().lower(), (data.state[:2] if data.state else "TN").upper())
    dist_short = DISTRICT_CODES.get((data.district or "").strip().lower(), (data.district[:3] if data.district else "CHN").upper())
    floor_str = f"F{data.floor:02d}"
    unit_str = f"U{data.unit:02d}"

    # Generate spatial hash from vertical bounds + footprint if available
    coords = data.footprint_coordinates or [[80.2566, 13.0069], [80.2572, 13.0069], [80.2572, 13.0065], [80.2566, 13.0065], [80.2566, 13.0069]]
    geom_hash = generate_geometry_hash(coords, data.min_z, data.max_z)

    # Stable ULPIN format
    ulpin_code = f"3D-ULPIN-{state_short}-{dist_short}-{data.parcel_id}-{data.building_id}-{floor_str}-{unit_str}-{geom_hash[:6]}"

    conn = get_db()
    existing = conn.execute("SELECT * FROM ulpins WHERE ulpin_code=?", (ulpin_code,)).fetchone()
    now = datetime.now().isoformat()

    if existing:
        conn.close()
        return dict(existing)

    # Find or link property
    prop = conn.execute("""
        SELECT * FROM properties
        WHERE parcel_id=? AND building_id=? AND unit_number LIKE ?
    """, (data.parcel_id, data.building_id, f"%{data.unit}%")).fetchone()

    if prop:
        property_id = prop["id"]
    else:
        property_id = f"PROP-{data.building_id}-{floor_str}-{unit_str}"

    ulpin_id = f"ULPIN-{uuid.uuid4().hex[:8].upper()}"
    conn.execute("""
        INSERT OR REPLACE INTO ulpins (
            id, property_id, ulpin_code, state_code, district_code,
            parcel_ref, building_ref, floor_ref, unit_ref, property_type,
            min_z, max_z, spatial_hash, version, generated_at, generated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, '3D ULPIN Project Engine')
    """, (
        ulpin_id, property_id, ulpin_code, state_short, dist_short,
        data.parcel_id, data.building_id, floor_str, unit_str,
        data.property_type, data.min_z, data.max_z, geom_hash, now
    ))
    conn.commit()
    conn.close()

    return {
        "status": "success",
        "id": ulpin_id,
        "property_id": property_id,
        "ulpin_code": ulpin_code,
        "identifier_type": "3D ULPIN / Project Spatial Property Identifier",
        "state_code": state_short,
        "district_code": dist_short,
        "parcel_ref": data.parcel_id,
        "building_ref": data.building_id,
        "floor_ref": floor_str,
        "unit_ref": unit_str,
        "property_type": data.property_type,
        "min_z": data.min_z,
        "max_z": data.max_z,
        "spatial_hash": geom_hash,
        "generated_at": now
    }
