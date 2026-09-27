"""
history.py — 4D Property History & Spatiotemporal Audit Trail API — SIH26011.

Supports:
- Spatiotemporal tracking (X, Y, Z, Time)
- Versioning on change events: property_created, building_changed, floor_added, unit_changed, boundary_changed, height_changed, rights_changed, ulpin_generated, conflict_resolved
- Timeline API with version diffs (Before vs After 3D changes)
"""

from fastapi import APIRouter, HTTPException, Query
from models.database import get_db
import json

router = APIRouter()


@router.get("/timeline/{property_id}")
def get_property_history_timeline(property_id: str):
    """Returns chronological 4D spatiotemporal history timeline for a property unit."""
    conn = get_db()
    prop = conn.execute("SELECT * FROM properties WHERE id=?", (property_id,)).fetchone()
    if not prop:
        conn.close()
        raise HTTPException(status_code=404, detail="Property unit not found")

    versions = conn.execute("SELECT * FROM property_versions WHERE property_id=? ORDER BY version_number ASC", (property_id,)).fetchall()
    conn.close()

    result_versions = []
    for v in versions:
        vd = dict(v)
        for key in ("old_data", "new_data", "geometry_2d"):
            if vd.get(key):
                try:
                    vd[key] = json.loads(vd[key])
                except Exception:
                    pass
        result_versions.append(vd)

    return {
        "property_id": property_id,
        "total_versions": len(result_versions),
        "timeline": result_versions
    }


@router.get("/compare")
def compare_property_versions(property_id: str, version_a: int = 1, version_b: int = 2):
    """
    Compares two property versions (Before vs After) and calculates spatial 3D differences
    (area delta, height delta, volume delta, boundary changes).
    """
    conn = get_db()
    v1 = conn.execute("SELECT * FROM property_versions WHERE property_id=? AND version_number=?", (property_id, version_a)).fetchone()
    v2 = conn.execute("SELECT * FROM property_versions WHERE property_id=? AND version_number=?", (property_id, version_b)).fetchone()
    conn.close()

    if not v1 or not v2:
        raise HTTPException(status_code=404, detail="One or both property versions not found")

    d1, d2 = dict(v1), dict(v2)
    for key in ("old_data", "new_data", "geometry_2d"):
        for d in (d1, d2):
            if d.get(key):
                try:
                    d[key] = json.loads(d[key])
                except Exception:
                    pass

    area_a = d1.get("area_sqm") or 100.0
    area_b = d2.get("area_sqm") or 100.0
    vol_a = d1.get("volume_cbm") or 300.0
    vol_b = d2.get("volume_cbm") or 300.0

    return {
        "property_id": property_id,
        "version_a": d1,
        "version_b": d2,
        "differences": {
            "area_sqm_delta": round(area_b - area_a, 2),
            "volume_cbm_delta": round(vol_b - vol_a, 2),
            "min_z_delta": round((d2.get("min_z") or 0) - (d1.get("min_z") or 0), 2),
            "max_z_delta": round((d2.get("max_z") or 0) - (d1.get("max_z") or 0), 2),
            "change_type": d2.get("change_type"),
            "change_note": d2.get("change_note")
        }
    }
