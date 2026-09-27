"""
properties.py — 3D Property Units & Volumetric Cadastre API for 3D ULPIN System — SIH26011.

Supports:
- Surface Volume, Above-Ground Volume, Underground Volume, Airspace Volume
- Projected Metric Area (sqm) and Volume (cbm) in EPSG:32644 (UTM 44N)
- Shapely 3D Volume Overlap Checks
- Automatic Property Versioning / Audit History
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from models.database import get_db
from services.spatial_utils import (
    calculate_metric_area_and_volume, validate_2d_geometry,
    check_3d_volume_overlap, generate_geometry_hash
)
import json
import uuid
from datetime import datetime

router = APIRouter()


class PropertyCreateRequest(BaseModel):
    parcel_id: Optional[str] = "P001"
    building_id: Optional[str] = "B001"
    floor_id: Optional[str] = None
    unit_number: str
    property_type: str = "Apartment Unit"  # 'Apartment Unit', 'Commercial Unit', 'Surface Parcel', 'Underground Parking', 'Air-Space Volume'
    owner_ref: str = "Registered Owner"
    min_z: float = 0.0
    max_z: float = 3.0
    area_sqm: Optional[float] = None
    volume_cbm: Optional[float] = None
    centroid_lat: Optional[float] = None
    centroid_lng: Optional[float] = None
    confidence: Optional[float] = 92.0
    geometry_2d: Optional[List[List[float]]] = None



@router.get("")
def get_properties(
    parcel_id: Optional[str] = Query(None),
    building_id: Optional[str] = Query(None),
    floor_id: Optional[str] = Query(None),
    property_type: Optional[str] = Query(None)
):
    """Returns 3D property units and volumetric cadastre records."""
    conn = get_db()
    query = "SELECT * FROM properties WHERE status='active'"
    params = []

    if parcel_id:
        query += " AND parcel_id=?"
        params.append(parcel_id)
    if building_id:
        query += " AND building_id=?"
        params.append(building_id)
    if floor_id:
        query += " AND floor_id=?"
        params.append(floor_id)
    if property_type:
        query += " AND property_type=?"
        params.append(property_type)

    rows = conn.execute(query, params).fetchall()
    conn.close()

    results = []
    for r in rows:
        d = dict(r)
        if d.get("geometry_2d"):
            try:
                d["geometry_2d"] = json.loads(d["geometry_2d"])
            except Exception:
                pass
        if d.get("geometry_3d"):
            try:
                d["geometry_3d"] = json.loads(d["geometry_3d"])
            except Exception:
                pass
        results.append(d)
    return results


@router.get("/{property_id}")
def get_property_details(property_id: str):
    """Returns detailed property information, linked ULPIN, rights, evidence, versions, and validation results."""
    conn = get_db()
    prop = conn.execute("SELECT * FROM properties WHERE id=?", (property_id,)).fetchone()
    if not prop:
        conn.close()
        raise HTTPException(status_code=404, detail="Property unit not found")

    p_dict = dict(prop)
    for key in ("geometry_2d", "geometry_3d"):
        if p_dict.get(key):
            try:
                p_dict[key] = json.loads(p_dict[key])
            except Exception:
                pass

    # ULPIN
    ulpin = conn.execute("SELECT * FROM ulpins WHERE property_id=?", (property_id,)).fetchone()
    u_dict = dict(ulpin) if ulpin else None

    # Rights
    rights = conn.execute("SELECT * FROM rights WHERE property_id=?", (property_id,)).fetchall()

    # Evidence
    evidence = conn.execute("SELECT * FROM evidence WHERE property_id=?", (property_id,)).fetchall()

    # Property Versions / Audit Trail
    versions = conn.execute("SELECT * FROM property_versions WHERE property_id=? ORDER BY version_number ASC", (property_id,)).fetchall()

    # Validations
    validations = conn.execute("SELECT * FROM validation_results WHERE property_id=?", (property_id,)).fetchall()

    conn.close()

    return {
        "property": p_dict,
        "ulpin": u_dict,
        "rights": [dict(r) for r in rights],
        "evidence": [dict(e) for e in evidence],
        "history_versions": [dict(v) for v in versions],
        "validation_issues": [dict(v) for v in validations]
    }


@router.post("")
def create_property(data: PropertyCreateRequest):
    """
    Creates a 3D Property Volume with Shapely UTM 44N metric area & volume calculations,
    3D overlap check, property DNA geometry hashing, and initial 4D history snapshot.
    """
    conn = get_db()
    now = datetime.now().isoformat()

    try:
        # Determine 2D geometry if not provided
        geom_2d = data.geometry_2d
        c_lat = data.centroid_lat if data.centroid_lat is not None else 13.0068
        c_lng = data.centroid_lng if data.centroid_lng is not None else 80.2570

        if not geom_2d or len(geom_2d) < 3:
            # Try to inherit footprint from building or parcel
            bld = None
            if data.building_id:
                bld = conn.execute("SELECT footprint, centroid_lat, centroid_lng FROM buildings WHERE id=?", (data.building_id,)).fetchone()
            if bld and bld["footprint"]:
                try:
                    b_fp = json.loads(bld["footprint"])
                    if isinstance(b_fp, list) and len(b_fp) >= 3:
                        geom_2d = b_fp
                        if bld["centroid_lat"]: c_lat = float(bld["centroid_lat"])
                        if bld["centroid_lng"]: c_lng = float(bld["centroid_lng"])
                except Exception:
                    pass

            if not geom_2d:
                # Generate footprint polygon around centroid
                dlat = 0.00012
                dlng = 0.00012
                geom_2d = [
                    [round(c_lng - dlng, 6), round(c_lat - dlat, 6)],
                    [round(c_lng + dlng, 6), round(c_lat - dlat, 6)],
                    [round(c_lng + dlng, 6), round(c_lat + dlat, 6)],
                    [round(c_lng - dlng, 6), round(c_lat + dlat, 6)],
                    [round(c_lng - dlng, 6), round(c_lat - dlat, 6)],
                ]

        # Validate or compute metric area and volume
        is_valid, reason = validate_2d_geometry(geom_2d)
        if is_valid:
            area_sqm, height_m, volume_cbm = calculate_metric_area_and_volume(
                geom_2d, data.min_z, data.max_z
            )
        else:
            height_m = max(0.0, data.max_z - data.min_z)
            area_sqm = data.area_sqm if data.area_sqm and data.area_sqm > 0 else 115.0
            volume_cbm = data.volume_cbm if data.volume_cbm and data.volume_cbm > 0 else round(area_sqm * height_m, 2)

        if data.area_sqm and data.area_sqm > 0:
            area_sqm = data.area_sqm
        if data.volume_cbm and data.volume_cbm > 0:
            volume_cbm = data.volume_cbm

        prop_id = f"PROP-{uuid.uuid4().hex[:8].upper()}"
        geom_hash = generate_geometry_hash(geom_2d, data.min_z, data.max_z)

        # 3D Overlap validation against existing properties
        existing = conn.execute("SELECT id, unit_number, min_z, max_z, geometry_2d FROM properties WHERE status='active'").fetchall()
        conflicts = []
        for ep in existing:
            if ep["geometry_2d"]:
                try:
                    e_coords = json.loads(ep["geometry_2d"])
                    has_ov, h_sqm, v_m = check_3d_volume_overlap(
                        geom_2d, data.min_z, data.max_z,
                        e_coords, ep["min_z"], ep["max_z"]
                    )
                    if has_ov:
                        conflicts.append({
                            "conflicting_property": ep["id"],
                            "conflicting_unit": ep["unit_number"],
                            "horizontal_overlap_sqm": h_sqm,
                            "vertical_overlap_m": v_m
                        })
                except Exception:
                    pass

        geom_status = "CONFLICT (3D Overlap)" if conflicts else "VALID"

        geom_3d = {
            "type": "PolyhedralVolume",
            "min_z": data.min_z,
            "max_z": data.max_z,
            "height_m": height_m,
            "area_sqm": area_sqm,
            "volume_cbm": volume_cbm,
            "geometry_hash": geom_hash
        }

        conn.execute("""
            INSERT INTO properties (
                id, parcel_id, building_id, floor_id, unit_number, property_type,
                owner_ref, area_sqm, volume_cbm, min_z, max_z, height_m,
                centroid_lat, centroid_lng, geometry_2d, geometry_3d, crs,
                source_name, confidence, data_status, geometry_status, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'EPSG:4326', 'Project Volumetric Cadastre', ?, 'Active', ?, 'active', ?, ?)
        """, (
            prop_id, data.parcel_id, data.building_id, data.floor_id,
            data.unit_number, data.property_type, data.owner_ref,
            area_sqm, volume_cbm, data.min_z, data.max_z, height_m,
            c_lat, c_lng, json.dumps(geom_2d), json.dumps(geom_3d),
            data.confidence or 92.0, geom_status, now, now
        ))

        # Dedicated Property Volume record
        vol_type = "Underground Volume" if data.min_z < 0 else "Airspace Volume" if data.property_type == "Air-Space Volume" else "Above-Ground Volume"
        conn.execute("""
            INSERT INTO property_volumes (id, property_id, volume_type, footprint, min_z, max_z, area_sqm, volume_cbm, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            f"VOL-{prop_id}", prop_id, vol_type, json.dumps(geom_2d),
            data.min_z, data.max_z, area_sqm, volume_cbm, now
        ))

        # Initial 4D History version record
        conn.execute("""
            INSERT INTO property_versions (
                id, property_id, version_number, changed_by, change_type,
                old_data, new_data, geometry_2d, min_z, max_z, area_sqm, volume_cbm, change_note, changed_at
            ) VALUES (?, ?, 1, 'surveyor', 'property_created', ?, ?, ?, ?, ?, ?, ?, 'Initial 3D Property Volume registered', ?)
        """, (
            f"VER-{prop_id}-1", prop_id,
            json.dumps({}),
            json.dumps({"unit_number": data.unit_number, "property_type": data.property_type, "owner": data.owner_ref}),
            json.dumps(geom_2d), data.min_z, data.max_z, area_sqm, volume_cbm, now
        ))

        # Create linked 3D ULPIN record (use INSERT OR REPLACE to support idempotent creation)
        ulpin_code = f"3D-ULPIN-TN-CHN-{data.parcel_id or 'P001'}-{data.building_id or 'B001'}-{data.unit_number}"
        conn.execute("""
            INSERT OR REPLACE INTO ulpins (
                id, property_id, ulpin_code, state_code, district_code,
                parcel_ref, building_ref, floor_ref, unit_ref, property_type,
                min_z, max_z, generated_at, generated_by, spatial_hash, version
            ) VALUES (?, ?, ?, 'TN', 'CHN', ?, ?, ?, ?, ?, ?, ?, ?, '3D Volumetric Cadastre Engine', ?, 1)
        """, (
            f"ULP-{prop_id}", prop_id, ulpin_code,
            data.parcel_id or 'P001', data.building_id or 'B001', data.floor_id or 'FL01',
            data.unit_number, data.property_type, data.min_z, data.max_z, now,
            geom_hash[:16],
        ))

        # Log conflict if overlap detected
        if conflicts:
            conn.execute("""
                INSERT INTO validation_results (
                    id, property_id, validation_type, severity, message, details, suggested_action, resolved, created_at
                ) VALUES (?, ?, '3D Volume Overlap', 'conflict', ?, ?, 'Adjust vertical min_z/max_z or horizontal footprint boundary', 0, ?)
            """, (
                f"VAL-3D-{uuid.uuid4().hex[:6].upper()}", prop_id,
                f"Property unit {data.unit_number} overlaps in 3D volume with {len(conflicts)} property unit(s)",
                json.dumps({"conflicts": conflicts}),
                now
            ))

        conn.commit()
    finally:
        conn.close()

    return {
        "status": "success",
        "id": prop_id,
        "parcel_id": data.parcel_id,
        "building_id": data.building_id,
        "floor_id": data.floor_id,
        "unit_number": data.unit_number,
        "property_type": data.property_type,
        "owner_ref": data.owner_ref,
        "area_sqm": area_sqm,
        "volume_cbm": volume_cbm,
        "min_z": data.min_z,
        "max_z": data.max_z,
        "height_m": height_m,
        "centroid_lat": c_lat,
        "centroid_lng": c_lng,
        "confidence": data.confidence or 92.0,
        "geometry_2d": geom_2d,
        "geometry_3d": geom_3d,
        "geometry_hash": geom_hash,
        "geometry_status": geom_status,
        "conflicts_detected": conflicts,
        "ulpin_code": ulpin_code
    }
