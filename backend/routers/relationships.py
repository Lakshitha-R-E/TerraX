"""
relationships.py — Dynamic 3D Rights Graph & Property DNA API — SIH26011.

Supports:
- Dynamic 3D Rights Graph dynamically built from live database entity relations
- Property DNA digital fingerprint generated from real spatial geometry hashes, evidence, rights, and history
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any
from models.database import get_db
from services.spatial_utils import generate_geometry_hash
import json

router = APIRouter()


@router.get("/graph")
def get_rights_graph(property_id: Optional[str] = Query(None)):
    """
    Generates dynamic 3D Rights Graph nodes and edges directly from database records.
    Graph topology: Parcel -> Building -> Floor -> Unit / Property -> ULPIN -> Rights -> Utilities / Airspace / Evidence.
    Does NOT use hard-coded static nodes.
    """
    conn = get_db()

    # Query active database entities
    if property_id:
        properties = conn.execute("SELECT * FROM properties WHERE id=?", (property_id,)).fetchall()
    else:
        properties = conn.execute("SELECT * FROM properties LIMIT 25").fetchall()

    nodes = []
    edges = []
    seen_nodes = set()

    for prop in properties:
        p_dict = dict(prop)
        pid = p_dict["id"]

        # Property node
        if pid not in seen_nodes:
            nodes.append({
                "id": pid,
                "label": f"Unit {p_dict.get('unit_number') or pid}",
                "type": "Property Unit",
                "details": {
                    "property_type": p_dict.get("property_type"),
                    "area_sqm": p_dict.get("area_sqm"),
                    "volume_cbm": p_dict.get("volume_cbm"),
                    "min_z": p_dict.get("min_z"),
                    "max_z": p_dict.get("max_z"),
                    "owner": p_dict.get("owner_ref")
                }
            })
            seen_nodes.add(pid)

        # Parcel parent node
        parcel_id = p_dict.get("parcel_id")
        if parcel_id:
            if parcel_id not in seen_nodes:
                p_row = conn.execute("SELECT * FROM parcels WHERE id=?", (parcel_id,)).fetchone()
                p_no = dict(p_row).get("parcel_number") if p_row else parcel_id
                nodes.append({"id": parcel_id, "label": p_no, "type": "Surface Parcel"})
                seen_nodes.add(parcel_id)
            edges.append({"source": parcel_id, "target": pid, "label": "CONTAINS"})

        # Building parent node
        bld_id = p_dict.get("building_id")
        if bld_id:
            if bld_id not in seen_nodes:
                b_row = conn.execute("SELECT * FROM buildings WHERE id=?", (bld_id,)).fetchone()
                b_name = dict(b_row).get("name") if b_row else bld_id
                nodes.append({"id": bld_id, "label": b_name, "type": "Building"})
                seen_nodes.add(bld_id)
            edges.append({"source": bld_id, "target": pid, "label": "LOCATED_IN"})

        # ULPIN child node
        ulpin = conn.execute("SELECT * FROM ulpins WHERE property_id=?", (pid,)).fetchone()
        if ulpin:
            u_code = dict(ulpin)["ulpin_code"]
            u_id = dict(ulpin)["id"]
            if u_id not in seen_nodes:
                nodes.append({"id": u_id, "label": u_code, "type": "3D ULPIN"})
                seen_nodes.add(u_id)
            edges.append({"source": pid, "target": u_id, "label": "IDENTIFIED_BY"})

        # Rights child nodes
        rights = conn.execute("SELECT * FROM rights WHERE property_id=? OR parcel_id=?", (pid, parcel_id or "")).fetchall()
        for r in rights:
            r_dict = dict(r)
            rid = r_dict["id"]
            if rid not in seen_nodes:
                nodes.append({"id": rid, "label": r_dict["right_type"], "type": "Spatial Right", "holder": r_dict.get("holder_ref")})
                seen_nodes.add(rid)
            edges.append({"source": pid, "target": rid, "label": "SUBJECT_TO_RIGHT"})

        # Utility intersection links
        utils = conn.execute("SELECT * FROM utilities WHERE parcel_id=?", (parcel_id or "",)).fetchall()
        for u in utils:
            u_dict = dict(u)
            uid = u_dict["id"]
            if uid not in seen_nodes:
                nodes.append({"id": uid, "label": f"{u_dict['utility_type']} (-{u_dict.get('depth_m')}m)", "type": "Subsurface Utility"})
                seen_nodes.add(uid)
            edges.append({"source": parcel_id or pid, "target": uid, "label": "SUBSURFACE_SERVICED_BY"})

    conn.close()

    return {"nodes": nodes, "edges": edges, "total_nodes": len(nodes), "total_edges": len(edges)}


@router.get("/dna/{property_id}")
def get_property_dna(property_id: str):
    """
    Generates dynamic Property DNA digital fingerprint from actual database data.
    """
    conn = get_db()
    prop = conn.execute("SELECT * FROM properties WHERE id=?", (property_id,)).fetchone()
    if not prop:
        conn.close()
        raise HTTPException(status_code=404, detail="Property unit not found")

    p_dict = dict(prop)

    # Geometry coordinates
    coords = []
    if p_dict.get("geometry_2d"):
        try:
            coords = json.loads(p_dict["geometry_2d"])
        except Exception:
            pass

    # Geometry hashes
    footprint_hash = generate_geometry_hash(coords, 0, 0) if coords else "No footprint hash"
    volume_hash = generate_geometry_hash(coords, p_dict.get("min_z", 0), p_dict.get("max_z", 0)) if coords else "No volume hash"

    # Linked ULPIN
    ulpin = conn.execute("SELECT * FROM ulpins WHERE property_id=?", (property_id,)).fetchone()
    ulpin_code = dict(ulpin).get("ulpin_code") if ulpin else "No ULPIN generated"

    # Linked Rights
    rights = conn.execute("SELECT * FROM rights WHERE property_id=?", (property_id,)).fetchall()
    rights_list = [dict(r)["right_type"] for r in rights]

    # Available Evidence
    ev_rows = conn.execute("SELECT * FROM evidence WHERE property_id=?", (property_id,)).fetchall()
    evidence_list = [dict(e)["source_name"] for e in ev_rows]

    missing_evidence = []
    for req_ev in ["Microsoft Footprints", "LiDAR Survey", "GNSS Survey", "Floor Plan"]:
        if not any(req_ev.lower() in e.lower() for e in evidence_list):
            missing_evidence.append(f"Missing {req_ev}")

    # Validation Status
    val_conflicts = conn.execute("SELECT COUNT(*) FROM validation_results WHERE property_id=? AND severity='conflict' AND resolved=0", (property_id,)).fetchone()[0]
    val_status = "CONFLICT" if val_conflicts > 0 else p_dict.get("geometry_status", "VALID")

    # Latest Version
    v_row = conn.execute("SELECT MAX(version_number) FROM property_versions WHERE property_id=?", (property_id,)).fetchone()
    ver_no = v_row[0] if v_row and v_row[0] else 1

    conn.close()

    return {
        "property_id": property_id,
        "ulpin": ulpin_code,
        "parcel_id": p_dict.get("parcel_id"),
        "building_id": p_dict.get("building_id"),
        "unit_number": p_dict.get("unit_number"),
        "property_type": p_dict.get("property_type"),
        "2d_footprint_hash": footprint_hash,
        "3d_volume_hash": volume_hash,
        "min_z": p_dict.get("min_z"),
        "max_z": p_dict.get("max_z"),
        "height_m": p_dict.get("height_m"),
        "area_sqm": p_dict.get("area_sqm"),
        "volume_cbm": p_dict.get("volume_cbm"),
        "data_source": p_dict.get("source_name", "Project Cadastral Engine"),
        "rights": rights_list if rights_list else ["No registered rights recorded"],
        "evidence_fusion": {
            "matched_sources": evidence_list,
            "missing_evidence": missing_evidence
        },
        "validation_state": val_status,
        "version": ver_no,
        "last_updated": p_dict.get("updated_at") or p_dict.get("created_at")
    }
