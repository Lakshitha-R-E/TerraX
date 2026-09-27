"""
rights.py — Vertical & Underground Property Rights API — SIH26011.

Supports:
- Surface Right, Building Right, Floor Right, Unit Right, Vertical Volume Right, Underground Right, Airspace / Spatial Right
- Spatial extent (Z-range + horizontal polygon)
- Rights evidence & source tracking
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from models.database import get_db
import json
from datetime import datetime
import uuid

router = APIRouter()


class RightsCreateRequest(BaseModel):
    property_id: Optional[str] = None
    parcel_id: Optional[str] = None
    right_type: str  # 'Surface Right', 'Building Right', 'Floor Right', 'Unit Right', 'Vertical Volume Right', 'Underground Right', 'Airspace / Spatial Right'
    holder_ref: str = "Registered Rights Holder"
    start_z: float = 0.0
    end_z: float = 12.0
    spatial_extent: Optional[List[List[float]]] = None
    source: str = "State Land Records Registry"
    evidence_ref: Optional[str] = "Title Deed #2026-CHN-901"
    effective_from: Optional[str] = None
    effective_to: Optional[str] = None
    is_demo: int = 0


@router.get("")
def get_rights(property_id: Optional[str] = Query(None), parcel_id: Optional[str] = Query(None)):
    """Returns vertical, surface, underground, and airspace property rights records."""
    conn = get_db()
    if property_id:
        rows = conn.execute("SELECT * FROM rights WHERE property_id=?", (property_id,)).fetchall()
    elif parcel_id:
        rows = conn.execute("SELECT * FROM rights WHERE parcel_id=?", (parcel_id,)).fetchall()
    else:
        rows = conn.execute("SELECT * FROM rights").fetchall()
    conn.close()

    results = []
    for r in rows:
        d = dict(r)
        if d.get("spatial_extent"):
            try:
                d["spatial_extent"] = json.loads(d["spatial_extent"])
            except Exception:
                pass
        results.append(d)
    return results


@router.post("")
def create_rights(req: RightsCreateRequest):
    """Registers a spatial ownership right for surface, vertical, underground, or airspace volume."""
    rights_id = f"RGT-{uuid.uuid4().hex[:8].upper()}"
    now = datetime.now().isoformat()
    eff_from = req.effective_from or now
    spatial_str = json.dumps(req.spatial_extent) if req.spatial_extent else None

    conn = get_db()
    try:
        conn.execute("""
            INSERT INTO rights (
                id, property_id, parcel_id, right_type, holder_ref, start_z, end_z,
                spatial_extent, source, evidence_ref, effective_from, effective_to, status, is_demo, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
        """, (
            rights_id, req.property_id, req.parcel_id, req.right_type,
            req.holder_ref, req.start_z, req.end_z, spatial_str,
            req.source, req.evidence_ref, eff_from, req.effective_to, req.is_demo, now
        ))

        # Insert into dedicated rights_volumes table if spatial extent provided
        if req.spatial_extent:
            vol_id = f"RVOL-{rights_id}"
            conn.execute("""
                INSERT INTO rights_volumes (id, right_id, property_id, volume_geojson, min_z, max_z, volume_cbm, created_at)
                VALUES (?, ?, ?, ?, ?, ?, 0.0, ?)
            """, (vol_id, rights_id, req.property_id or "PROP", spatial_str, req.start_z, req.end_z, now))

        conn.commit()
    finally:
        conn.close()

    return {
        "status": "success",
        "id": rights_id,
        "right_type": req.right_type,
        "holder_ref": req.holder_ref,
        "z_range": f"{req.start_z}m to {req.end_z}m",
        "source": req.source,
        "is_demo": req.is_demo
    }
