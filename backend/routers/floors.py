"""
floors.py — Building Floor Levels API for 3D ULPIN System — SIH26011.
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from models.database import get_db
from datetime import datetime

router = APIRouter()


class FloorCreateRequest(BaseModel):
    building_id: str
    floor_number: int
    floor_label: str
    elevation_min: float
    elevation_max: float
    floor_area: float = 250.0
    evidence_source: str = "HEIGHT-DERIVED ESTIMATE"  # 'LiDAR', 'DSM', 'Floor Plan', 'HEIGHT-DERIVED ESTIMATE'


@router.get("")
def get_floors(building_id: Optional[str] = Query(None)):
    """Returns floors for a building with vertical elevation ranges and evidence source."""
    conn = get_db()
    if building_id:
        rows = conn.execute("SELECT * FROM floors WHERE building_id=? AND status='active' ORDER BY floor_number ASC", (building_id,)).fetchall()
    else:
        rows = conn.execute("SELECT * FROM floors WHERE status='active' ORDER BY building_id, floor_number ASC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.post("")
def create_floor(data: FloorCreateRequest):
    """Creates a floor level within a building."""
    fl_id = f"{data.building_id}-FL{data.floor_number:02d}"
    height = round(data.elevation_max - data.elevation_min, 2)
    now = datetime.now().isoformat()

    conn = get_db()
    conn.execute("""
        INSERT OR REPLACE INTO floors (
            id, building_id, floor_number, floor_label, elevation_min, elevation_max,
            floor_area, height_m, evidence_source, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
    """, (
        fl_id, data.building_id, data.floor_number, data.floor_label,
        data.elevation_min, data.elevation_max, data.floor_area,
        height, data.evidence_source, now
    ))
    conn.commit()
    conn.close()

    return {"status": "success", "id": fl_id, "building_id": data.building_id, "elevation_range": f"{data.elevation_min}m - {data.elevation_max}m"}
