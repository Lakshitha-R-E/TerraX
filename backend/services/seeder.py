"""
Demo data seeder for 3D ULPIN System.
⚠ PROTOTYPE / DEMONSTRATION DATASET — Not real property data.
Location: Adyar, Chennai, Tamil Nadu (approximate demo coordinates)
"""
import sqlite3
import json
import uuid
import os
import sys
from datetime import datetime, timedelta

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

try:
    from models.database import DB_PATH, get_db
except Exception:
    DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "cadastral.db")
    def get_db():
        conn = sqlite3.connect(DB_PATH, timeout=60.0)
        conn.row_factory = sqlite3.Row
        return conn

# Demo coordinate base — Adyar, Chennai
BASE_LAT = 13.0067
BASE_LNG = 80.2571


def seed_all():
    conn = get_db()
    c = conn.cursor()

    # ─── PARCELS ─────────────────────────────────────────────────────────────
    parcels = [
        {
            "id": "P001", "parcel_number": "TN-CHN-ADY-P001",
            "district": "Chennai", "state": "Tamil Nadu",
            "area_sqm": 2400.0, "land_use": "Residential",
            "centroid_lat": BASE_LAT, "centroid_lng": BASE_LNG,
            "coordinates": json.dumps([
                [80.2565, 13.0070], [80.2575, 13.0070],
                [80.2575, 13.0064], [80.2565, 13.0064], [80.2565, 13.0070]
            ]),
        },
        {
            "id": "P002", "parcel_number": "TN-CHN-ADY-P002",
            "district": "Chennai", "state": "Tamil Nadu",
            "area_sqm": 1800.0, "land_use": "Commercial",
            "centroid_lat": BASE_LAT + 0.002, "centroid_lng": BASE_LNG + 0.002,
            "coordinates": json.dumps([
                [80.2577, 13.0080], [80.2585, 13.0080],
                [80.2585, 13.0073], [80.2577, 13.0073], [80.2577, 13.0080]
            ]),
        },
        {
            "id": "P003", "parcel_number": "TN-CHN-ADY-P003",
            "district": "Chennai", "state": "Tamil Nadu",
            "area_sqm": 3200.0, "land_use": "Mixed-Use",
            "centroid_lat": BASE_LAT - 0.003, "centroid_lng": BASE_LNG + 0.003,
            "coordinates": json.dumps([
                [80.2574, 13.0040], [80.2586, 13.0040],
                [80.2586, 13.0030], [80.2574, 13.0030], [80.2574, 13.0040]
            ]),
        },
        {
            "id": "P004", "parcel_number": "TN-CHN-ADY-P004",
            "district": "Chennai", "state": "Tamil Nadu",
            "area_sqm": 1500.0, "land_use": "Residential",
            "centroid_lat": BASE_LAT + 0.005, "centroid_lng": BASE_LNG - 0.003,
            "coordinates": json.dumps([
                [80.2540, 13.0115], [80.2550, 13.0115],
                [80.2550, 13.0108], [80.2540, 13.0108], [80.2540, 13.0115]
            ]),
        },
        {
            "id": "P005", "parcel_number": "TN-CHN-ADY-P005",
            "district": "Chennai", "state": "Tamil Nadu",
            "area_sqm": 2800.0, "land_use": "Infrastructure",
            "centroid_lat": BASE_LAT + 0.007, "centroid_lng": BASE_LNG + 0.005,
            "coordinates": json.dumps([
                [80.2598, 13.0130], [80.2610, 13.0130],
                [80.2610, 13.0120], [80.2598, 13.0120], [80.2598, 13.0130]
            ]),
        },
    ]

    now = datetime.now().isoformat()
    for p in parcels:
        c.execute("""
            INSERT OR IGNORE INTO parcels (id,parcel_number,district,state,area_sqm,
            land_use,coordinates,centroid_lat,centroid_lng,status,created_at,updated_at)
            VALUES (:id,:parcel_number,:district,:state,:area_sqm,
            :land_use,:coordinates,:centroid_lat,:centroid_lng,'active',:now,:now)
        """, {**p, "now": now})

    # ─── BUILDINGS ────────────────────────────────────────────────────────────
    buildings = [
        {
            "id": "B001", "parcel_id": "P001", "building_number": "BLD-001",
            "name": "Adyar Towers Block A", "total_floors": 5,
            "building_type": "Residential Apartment",
            "ground_elevation": 0.0, "floor_height": 3.0,
            "centroid_lat": BASE_LAT, "centroid_lng": BASE_LNG,
            "footprint": json.dumps([
                [80.2566, 13.0069], [80.2572, 13.0069],
                [80.2572, 13.0065], [80.2566, 13.0065], [80.2566, 13.0069]
            ]),
        },
        {
            "id": "B002", "parcel_id": "P001", "building_number": "BLD-002",
            "name": "Adyar Towers Block B", "total_floors": 3,
            "building_type": "Residential Apartment",
            "ground_elevation": 0.0, "floor_height": 3.0,
            "centroid_lat": BASE_LAT - 0.0003, "centroid_lng": BASE_LNG + 0.0007,
            "footprint": json.dumps([
                [80.2573, 13.0068], [80.2574, 13.0068],
                [80.2574, 13.0065], [80.2573, 13.0065], [80.2573, 13.0068]
            ]),
        },
        {
            "id": "B003", "parcel_id": "P002", "building_number": "BLD-003",
            "name": "Adyar Commercial Plaza", "total_floors": 7,
            "building_type": "Commercial",
            "ground_elevation": 0.0, "floor_height": 4.0,
            "centroid_lat": BASE_LAT + 0.002, "centroid_lng": BASE_LNG + 0.002,
            "footprint": json.dumps([
                [80.2578, 13.0079], [80.2584, 13.0079],
                [80.2584, 13.0074], [80.2578, 13.0074], [80.2578, 13.0079]
            ]),
        },
        {
            "id": "B004", "parcel_id": "P003", "building_number": "BLD-004",
            "name": "Marina Heights", "total_floors": 10,
            "building_type": "Mixed-Use",
            "ground_elevation": 0.0, "floor_height": 3.5,
            "centroid_lat": BASE_LAT - 0.003, "centroid_lng": BASE_LNG + 0.003,
            "footprint": json.dumps([
                [80.2575, 13.0038], [80.2584, 13.0038],
                [80.2584, 13.0032], [80.2575, 13.0032], [80.2575, 13.0038]
            ]),
        },
        {
            "id": "B005", "parcel_id": "P004", "building_number": "BLD-005",
            "name": "Velachery Villa Complex", "total_floors": 4,
            "building_type": "Residential",
            "ground_elevation": 0.0, "floor_height": 3.0,
            "centroid_lat": BASE_LAT + 0.005, "centroid_lng": BASE_LNG - 0.003,
            "footprint": json.dumps([
                [80.2541, 13.0114], [80.2548, 13.0114],
                [80.2548, 13.0109], [80.2541, 13.0109], [80.2541, 13.0114]
            ]),
        },
    ]

    for b in buildings:
        c.execute("""
            INSERT OR IGNORE INTO buildings (id,parcel_id,building_number,name,total_floors,
            building_type,ground_elevation,floor_height,footprint,centroid_lat,centroid_lng,
            status,created_at,updated_at)
            VALUES (:id,:parcel_id,:building_number,:name,:total_floors,
            :building_type,:ground_elevation,:floor_height,:footprint,:centroid_lat,:centroid_lng,
            'active',:now,:now)
        """, {**b, "now": now})

    # ─── FLOORS ───────────────────────────────────────────────────────────────
    floors = []
    floor_configs = {
        "B001": (5, 3.0), "B002": (3, 3.0),
        "B003": (7, 4.0), "B004": (10, 3.5), "B005": (4, 3.0),
    }
    for bldg_id, (total, fh) in floor_configs.items():
        for fn in range(1, total + 1):
            floors.append({
                "id": f"{bldg_id}-FL{fn:02d}",
                "building_id": bldg_id,
                "floor_number": fn,
                "floor_label": f"Floor {fn}",
                "elevation_min": round((fn - 1) * fh, 2),
                "elevation_max": round(fn * fh, 2),
                "floor_area": 350.0 if bldg_id in ("B001", "B003", "B004") else 250.0,
                "status": "active",
            })

    for f in floors:
        c.execute("""
            INSERT OR IGNORE INTO floors (id,building_id,floor_number,floor_label,
            elevation_min,elevation_max,floor_area,status)
            VALUES (:id,:building_id,:floor_number,:floor_label,
            :elevation_min,:elevation_max,:floor_area,:status)
        """, f)

    # ─── PROPERTIES ───────────────────────────────────────────────────────────
    # Building B001 — Residential, 5 floors, 4 units per floor = 20 units
    properties = []
    unit_types = ["Apartment Unit", "Commercial Unit", "Apartment Unit", "Apartment Unit"]
    unit_areas = [118.4, 95.0, 125.0, 105.6]

    for fn in range(1, 6):
        fh = 3.0
        z_min = (fn - 1) * fh
        z_max = fn * fh
        for un in range(1, 5):
            pid = f"PROP-B001-F{fn:02d}-U{un:02d}"
            properties.append({
                "id": pid,
                "parcel_id": "P001", "building_id": "B001",
                "floor_id": f"B001-FL{fn:02d}",
                "unit_number": f"A-{fn}{un:02d}",
                "property_type": unit_types[un - 1],
                "owner_ref": f"OWNER-REF-{pid}",
                "area_sqm": unit_areas[un - 1],
                "volume_cbm": round(unit_areas[un - 1] * fh, 2),
                "min_z": z_min, "max_z": z_max,
                "centroid_lat": BASE_LAT + (un * 0.00002),
                "centroid_lng": BASE_LNG + (fn * 0.00002),
                "geometry_2d": json.dumps([
                    [80.2566 + (un - 1) * 0.0002, 13.0069 - (un - 1) * 0.0001],
                    [80.2567 + (un - 1) * 0.0002, 13.0069 - (un - 1) * 0.0001],
                    [80.2567 + (un - 1) * 0.0002, 13.0067 - (un - 1) * 0.0001],
                    [80.2566 + (un - 1) * 0.0002, 13.0067 - (un - 1) * 0.0001],
                    [80.2566 + (un - 1) * 0.0002, 13.0069 - (un - 1) * 0.0001],
                ]),
                "geometry_3d": json.dumps({
                    "type": "Box3D",
                    "min_z": z_min, "max_z": z_max,
                    "floor_number": fn, "unit": un,
                }),
                "confidence": 88.0 + fn * 1.5,
                "status": "active",
            })

    # Building B003 — Commercial, 7 floors, 3 units per floor
    for fn in range(1, 8):
        fh = 4.0
        z_min = (fn - 1) * fh
        z_max = fn * fh
        for un in range(1, 4):
            pid = f"PROP-B003-F{fn:02d}-U{un:02d}"
            properties.append({
                "id": pid,
                "parcel_id": "P002", "building_id": "B003",
                "floor_id": f"B003-FL{fn:02d}",
                "unit_number": f"C-{fn}{un:02d}",
                "property_type": "Commercial Unit",
                "owner_ref": f"COMM-OWNER-{pid}",
                "area_sqm": 185.0 + un * 20,
                "volume_cbm": round((185.0 + un * 20) * fh, 2),
                "min_z": z_min, "max_z": z_max,
                "centroid_lat": BASE_LAT + 0.002 + (un * 0.00003),
                "centroid_lng": BASE_LNG + 0.002 + (fn * 0.00003),
                "geometry_2d": json.dumps([
                    [80.2578 + un * 0.0002, 13.0079 - un * 0.0001],
                    [80.2580 + un * 0.0002, 13.0079 - un * 0.0001],
                    [80.2580 + un * 0.0002, 13.0077 - un * 0.0001],
                    [80.2578 + un * 0.0002, 13.0077 - un * 0.0001],
                    [80.2578 + un * 0.0002, 13.0079 - un * 0.0001],
                ]),
                "geometry_3d": json.dumps({
                    "type": "Box3D",
                    "min_z": z_min, "max_z": z_max,
                    "floor_number": fn, "unit": un,
                }),
                "confidence": 75.0 + fn * 2,
                "status": "active",
            })

    # Building B004 — Underground Parking (negative Z)
    for spot in range(1, 9):
        pid = f"PROP-B004-UG-PK{spot:02d}"
        properties.append({
            "id": pid,
            "parcel_id": "P003", "building_id": "B004",
            "floor_id": None,
            "unit_number": f"UG-PK{spot:02d}",
            "property_type": "Underground Parking",
            "owner_ref": f"PARKING-REF-{spot}",
            "area_sqm": 25.0,
            "volume_cbm": 62.5,
            "min_z": -5.0, "max_z": -2.5,
            "centroid_lat": BASE_LAT - 0.003 + spot * 0.00005,
            "centroid_lng": BASE_LNG + 0.003,
            "geometry_2d": json.dumps([
                [80.2576 + spot * 0.0001, 13.0037],
                [80.2577 + spot * 0.0001, 13.0037],
                [80.2577 + spot * 0.0001, 13.0035],
                [80.2576 + spot * 0.0001, 13.0035],
                [80.2576 + spot * 0.0001, 13.0037],
            ]),
            "geometry_3d": json.dumps({
                "type": "Box3D", "min_z": -5.0, "max_z": -2.5,
                "floor_number": -1, "unit": spot,
            }),
            "confidence": 72.0,
            "status": "active",
        })

    # Air-space volume
    properties.append({
        "id": "PROP-B005-AS-001",
        "parcel_id": "P005", "building_id": None, "floor_id": None,
        "unit_number": "AS-001",
        "property_type": "Air-Space Volume",
        "owner_ref": "TNRAIL-AIRSPACE-001",
        "area_sqm": 1200.0, "volume_cbm": 7200.0,
        "min_z": 8.0, "max_z": 14.0,
        "centroid_lat": BASE_LAT + 0.007, "centroid_lng": BASE_LNG + 0.005,
        "geometry_2d": json.dumps([
            [80.2599, 13.0129], [80.2608, 13.0129],
            [80.2608, 13.0121], [80.2599, 13.0121], [80.2599, 13.0129]
        ]),
        "geometry_3d": json.dumps({"type": "Box3D", "min_z": 8.0, "max_z": 14.0}),
        "confidence": 65.0, "status": "active",
    })

    for prop in properties:
        c.execute("""
            INSERT OR IGNORE INTO properties (id,parcel_id,building_id,floor_id,unit_number,
            property_type,owner_ref,area_sqm,volume_cbm,min_z,max_z,centroid_lat,centroid_lng,
            geometry_2d,geometry_3d,confidence,status,created_at,updated_at)
            VALUES (:id,:parcel_id,:building_id,:floor_id,:unit_number,
            :property_type,:owner_ref,:area_sqm,:volume_cbm,:min_z,:max_z,
            :centroid_lat,:centroid_lng,:geometry_2d,:geometry_3d,
            :confidence,:status,:now,:now)
        """, {**prop, "now": now})

    # ─── ULPINs ───────────────────────────────────────────────────────────────
    # Generate ULPINs for first 20 B001 properties
    for prop in properties[:20]:
        pid = prop["id"]
        parts = pid.replace("PROP-", "").split("-")
        building = parts[0]
        floor_ref = parts[1] if len(parts) > 1 else "F00"
        unit_ref = parts[2] if len(parts) > 2 else "U00"
        ulpin_code = f"3D-ULPIN-TN-CHN-{prop['parcel_id']}-{building}-{floor_ref}-{unit_ref}"
        c.execute("""
            INSERT OR IGNORE INTO ulpins (id,property_id,ulpin_code,state_code,district_code,
            parcel_ref,building_ref,floor_ref,unit_ref,property_type,min_z,max_z,generated_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (
            f"ULPIN-{pid}", pid, ulpin_code, "TN", "CHN",
            prop["parcel_id"], prop.get("building_id", ""), floor_ref, unit_ref,
            prop["property_type"], prop["min_z"], prop["max_z"], now
        ))

    # ─── UTILITIES ────────────────────────────────────────────────────────────
    utilities = [
        {
            "id": "UTL-W001", "parcel_id": "P001",
            "utility_type": "Water Pipeline",
            "asset_id": "WP-CMWSSB-ADY-001", "depth_m": 2.5, "length_m": 45.0,
            "geometry": json.dumps({"type": "LineString", "coordinates": [
                [80.2565, 13.0068], [80.2575, 13.0068]
            ]}),
            "status": "active", "conflict_status": "none",
            "metadata": json.dumps({"diameter_mm": 200, "material": "PVC", "pressure": "medium", "operator": "CMWSSB - Chennai Water Board"}),
        },
        {
            "id": "UTL-W-CBE01", "parcel_id": "P-CBE01",
            "utility_type": "Water Pipeline",
            "asset_id": "WP-TWAD-CBE-001", "depth_m": 2.8, "length_m": 120.0,
            "geometry": json.dumps({"type": "LineString", "coordinates": [
                [76.9550, 11.0180], [76.9620, 11.0180]
            ]}),
            "status": "active", "conflict_status": "none",
            "metadata": json.dumps({"diameter_mm": 400, "material": "DI", "operator": "TWAD Board - Pillur Scheme"}),
        },
        {
            "id": "UTL-S-MDU01", "parcel_id": "P-MDU01",
            "utility_type": "Sewer Line",
            "asset_id": "SL-MDU-CORP-001", "depth_m": 3.2, "length_m": 150.0,
            "geometry": json.dumps({"type": "LineString", "coordinates": [
                [78.1180, 9.9250], [78.1250, 9.9250]
            ]}),
            "status": "active", "conflict_status": "none",
            "metadata": json.dumps({"diameter_mm": 350, "material": "RCC", "operator": "Madurai Municipal Corporation"}),
        },
        {
            "id": "UTL-S001", "parcel_id": "P001",
            "utility_type": "Sewer Line",
            "asset_id": "SL-2024-001", "depth_m": 3.5, "length_m": 50.0,
            "geometry": json.dumps({"type": "LineString", "coordinates": [

                [80.2565, 13.0066], [80.2575, 13.0066]
            ]}),
            "status": "active", "conflict_status": "none",
            "metadata": json.dumps({"diameter_mm": 300, "material": "Concrete"}),
        },
        {
            "id": "UTL-E001", "parcel_id": "P002",
            "utility_type": "Electrical Cable",
            "asset_id": "EC-2024-001", "depth_m": 1.0, "length_m": 60.0,
            "geometry": json.dumps({"type": "LineString", "coordinates": [
                [80.2577, 13.0076], [80.2585, 13.0076]
            ]}),
            "status": "active", "conflict_status": "warning",
            "metadata": json.dumps({"voltage_kv": 11, "type": "HT Cable"}),
        },
        {
            "id": "UTL-C001", "parcel_id": "P003",
            "utility_type": "Communication Cable",
            "asset_id": "CC-2024-001", "depth_m": 0.8, "length_m": 80.0,
            "geometry": json.dumps({"type": "LineString", "coordinates": [
                [80.2574, 13.0035], [80.2586, 13.0035]
            ]}),
            "status": "active", "conflict_status": "none",
            "metadata": json.dumps({"type": "Fiber Optic", "bandwidth": "10Gbps"}),
        },
        {
            "id": "UTL-UGP001", "parcel_id": "P003",
            "utility_type": "Underground Parking",
            "asset_id": "UGP-B004-001", "depth_m": 5.0, "length_m": None,
            "geometry": json.dumps({"type": "Polygon", "coordinates": [[
                [80.2575, 13.0038], [80.2584, 13.0038],
                [80.2584, 13.0032], [80.2575, 13.0032], [80.2575, 13.0038]
            ]]}),
            "status": "active", "conflict_status": "none",
            "metadata": json.dumps({"capacity": 8, "levels": 1, "type": "Underground Parking"}),
        },
        {
            "id": "UTL-W002", "parcel_id": "P004",
            "utility_type": "Water Pipeline",
            "asset_id": "WP-2024-002", "depth_m": 3.0, "length_m": 35.0,
            "geometry": json.dumps({"type": "LineString", "coordinates": [
                [80.2540, 13.0112], [80.2550, 13.0112]
            ]}),
            "status": "active", "conflict_status": "conflict",
            "metadata": json.dumps({"diameter_mm": 150, "material": "DI", "note": "Intersects property boundary"}),
        },
    ]

    for u in utilities:
        c.execute("""
            INSERT OR IGNORE INTO utilities (id,parcel_id,utility_type,asset_id,depth_m,
            length_m,geometry,status,conflict_status,metadata)
            VALUES (:id,:parcel_id,:utility_type,:asset_id,:depth_m,
            :length_m,:geometry,:status,:conflict_status,:metadata)
        """, u)

    # ─── INFRASTRUCTURE (Elevated & Airspace Constraints) ──────────────────────
    infra = [
        {
            "id": "INF-EL001", "parcel_id": "P005",
            "infra_type": "Metro Rail Corridor",
            "asset_id": "MRTS-L2-ADY-001", "height_m": 8.0, "length_m": 280.0,
            "geometry": json.dumps({"type": "LineString", "coordinates": [
                [80.2596, 13.0125], [80.2612, 13.0125]
            ]}),
            "status": "active", "conflict_status": "none",
            "metadata": json.dumps({
                "authority": "CMRL (Demo)", "line": "Line 2",
                "start": "Adyar (Demo)", "end": "Velachery (Demo)",
                "clearance_m": 5.5
            }),
        },
        {
            "id": "INF-AS-MAA01", "parcel_id": "P-AIR-MAA",
            "infra_type": "Airport Airspace Constraint Surface",
            "asset_id": "AAI-MAA-OLS-001", "height_m": 45.0, "length_m": 1200.0,
            "geometry": json.dumps({"type": "Polygon", "coordinates": [[
                [80.1650, 12.9950], [80.1800, 12.9950],
                [80.1800, 12.9850], [80.1650, 12.9850], [80.1650, 12.9950]
            ]]}),
            "status": "active", "conflict_status": "warning",
            "metadata": json.dumps({
                "authority": "Airports Authority of India (AAI)", "zone": "MAA Runway 07/25 OLS Approach Surface",
                "min_z": 15.0, "max_z": 60.0
            }),
        },
        {
            "id": "INF-AS-CJB01", "parcel_id": "P-AIR-CJB",
            "infra_type": "Airport Airspace Constraint Surface",
            "asset_id": "AAI-CJB-OLS-001", "height_m": 55.0, "length_m": 1000.0,
            "geometry": json.dumps({"type": "Polygon", "coordinates": [[
                [77.0350, 11.0350], [77.0480, 11.0350],
                [77.0480, 11.0250], [77.0350, 11.0250], [77.0350, 11.0350]
            ]]}),
            "status": "active", "conflict_status": "none",
            "metadata": json.dumps({
                "authority": "Airports Authority of India (AAI)", "zone": "Coimbatore Airport Obstacle Surface Zone",
                "min_z": 20.0, "max_z": 75.0
            }),
        },

        {
            "id": "INF-EL002", "parcel_id": "P002",
            "infra_type": "Elevated Road",
            "asset_id": "NHAI-BR-CHN-001", "height_m": 5.5, "length_m": 150.0,
            "geometry": json.dumps({"type": "LineString", "coordinates": [
                [80.2576, 13.0077], [80.2586, 13.0077]
            ]}),
            "status": "active", "conflict_status": "warning",
            "metadata": json.dumps({
                "authority": "NHAI (Demo)", "width_m": 8.0,
                "note": "Proximity to commercial property"
            }),
        },
    ]

    for inf in infra:
        c.execute("""
            INSERT OR IGNORE INTO infrastructure (id,parcel_id,infra_type,asset_id,height_m,
            length_m,geometry,status,conflict_status,metadata)
            VALUES (:id,:parcel_id,:infra_type,:asset_id,:height_m,
            :length_m,:geometry,:status,:conflict_status,:metadata)
        """, inf)

    # ─── VALIDATION RESULTS ───────────────────────────────────────────────────
    validations = [
        {
            "id": "VAL-001",
            "property_id": "PROP-B001-F03-U02",
            "validation_type": "Vertical Overlap",
            "severity": "conflict",
            "message": "Property volume overlaps adjacent unit vertically",
            "details": json.dumps({
                "conflicting_property": "PROP-B001-F03-U03",
                "overlap_m": 0.5,
                "z_range": "9.0m – 9.5m"
            }),
            "suggested_action": "Review and adjust upper elevation boundary",
            "resolved": 0,
        },
        {
            "id": "VAL-002",
            "property_id": "PROP-B003-F02-U01",
            "validation_type": "Outside Parcel Boundary",
            "severity": "warning",
            "message": "Property geometry marginally exceeds parcel boundary",
            "details": json.dumps({"excess_sqm": 2.3, "direction": "North"}),
            "suggested_action": "Adjust property boundary to fit within parcel",
            "resolved": 0,
        },
        {
            "id": "VAL-003",
            "property_id": "PROP-B004-UG-PK01",
            "validation_type": "Utility Intersection",
            "severity": "warning",
            "message": "Underground parking volume intersects water pipeline UTL-W001",
            "details": json.dumps({
                "utility_id": "UTL-W001",
                "intersection_type": "3D Volume Overlap",
                "depth": "-2.5m to -3.5m"
            }),
            "suggested_action": "Verify with utility authority; adjust parking level if needed",
            "resolved": 0,
        },
        {
            "id": "VAL-004",
            "property_id": "PROP-B001-F05-U03",
            "validation_type": "Data Confidence",
            "severity": "warning",
            "message": "Property confidence below 80% threshold — floor plan data unverified",
            "details": json.dumps({"confidence": 68.5, "missing_source": "GNSS Survey"}),
            "suggested_action": "Conduct GNSS field survey to improve confidence",
            "resolved": 0,
        },
        {
            "id": "VAL-005",
            "property_id": "PROP-B003-F06-U02",
            "validation_type": "Invalid Z Range",
            "severity": "conflict",
            "message": "max_z elevation equals min_z — zero-height property volume",
            "details": json.dumps({"min_z": 24.0, "max_z": 24.0, "computed_height": 0.0}),
            "suggested_action": "Reassign floor height and recalculate property volume",
            "resolved": 1,
        },
        {
            "id": "VAL-006",
            "property_id": "PROP-B001-F01-U01",
            "validation_type": "Topology Valid",
            "severity": "valid",
            "message": "All spatial checks passed",
            "details": json.dumps({"checks": ["overlap", "boundary", "z_range", "utility"], "passed": 4}),
            "suggested_action": None,
            "resolved": 1,
        },
    ]

    for v in validations:
        c.execute("""
            INSERT OR IGNORE INTO validation_results (id,property_id,validation_type,severity,
            message,details,suggested_action,resolved,created_at)
            VALUES (:id,:property_id,:validation_type,:severity,
            :message,:details,:suggested_action,:resolved,:now)
        """, {**v, "now": now})

    # ─── PROPERTY VERSIONS ────────────────────────────────────────────────────
    base_prop = next(p for p in properties if p["id"] == "PROP-B001-F03-U01")
    versions = [
        {
            "id": "VER-001", "property_id": "PROP-B001-F03-U01",
            "version_number": 1, "changed_by": "surveyor_01",
            "change_type": "created",
            "old_data": json.dumps({}),
            "new_data": json.dumps({"status": "2D parcel only", "year": 2024}),
            "change_note": "Initial 2D parcel record created",
            "changed_at": (datetime.now() - timedelta(days=730)).isoformat(),
        },
        {
            "id": "VER-002", "property_id": "PROP-B001-F03-U01",
            "version_number": 2, "changed_by": "system_import",
            "change_type": "building_added",
            "old_data": json.dumps({"min_z": 0, "max_z": 0}),
            "new_data": json.dumps({"min_z": 0, "max_z": 15.0, "floors": 5}),
            "change_note": "Building B001 added from drone survey",
            "changed_at": (datetime.now() - timedelta(days=365)).isoformat(),
        },
        {
            "id": "VER-003", "property_id": "PROP-B001-F03-U01",
            "version_number": 3, "changed_by": "surveyor_02",
            "change_type": "floor_segmented",
            "old_data": json.dumps({"floors": 5, "units": 0}),
            "new_data": json.dumps({"floors": 5, "units": 20, "property_type": "Apartment Unit"}),
            "change_note": "Floor segmentation applied — 20 units identified",
            "changed_at": (datetime.now() - timedelta(days=180)).isoformat(),
        },
        {
            "id": "VER-004", "property_id": "PROP-B001-F03-U01",
            "version_number": 4, "changed_by": "admin_01",
            "change_type": "ulpin_generated",
            "old_data": json.dumps({"ulpin": None}),
            "new_data": json.dumps({"ulpin": "3D-ULPIN-TN-CHN-P001-B001-F03-U01"}),
            "change_note": "Prototype 3D ULPIN generated and assigned",
            "changed_at": (datetime.now() - timedelta(days=30)).isoformat(),
        },
        {
            "id": "VER-005", "property_id": "PROP-B001-F03-U01",
            "version_number": 5, "changed_by": "surveyor_01",
            "change_type": "geometry_updated",
            "old_data": json.dumps({"area_sqm": 115.0}),
            "new_data": json.dumps({"area_sqm": 118.4}),
            "change_note": "Area updated after LiDAR re-measurement",
            "changed_at": (datetime.now() - timedelta(days=7)).isoformat(),
        },
    ]

    for v in versions:
        c.execute("""
            INSERT OR IGNORE INTO property_versions (id,property_id,version_number,changed_by,
            change_type,old_data,new_data,change_note,changed_at)
            VALUES (:id,:property_id,:version_number,:changed_by,
            :change_type,:old_data,:new_data,:change_note,:changed_at)
        """, v)

    # ─── DATA SOURCES ─────────────────────────────────────────────────────────
    data_sources = [
        {
            "id": "DS-001", "name": "Microsoft Global ML Building Footprints",
            "source_type": "Vector Polygons", "format": "GeoJSON",
            "status": "Available", "coverage": "Statewide Tamil Nadu",
            "last_updated": "2026-09", "is_demo": 0,
            "metadata": json.dumps({"source": "Microsoft ML Footprints", "license": "CDLA Permissive 2.0", "crs": "EPSG:4326"}),
        },
        {
            "id": "DS-002", "name": "OpenStreetMap Roads & Waterways",
            "source_type": "Vector Network", "format": "GeoJSON/PBF",
            "status": "Available", "coverage": "Tamil Nadu Districts",
            "last_updated": "2026-08", "is_demo": 0,
            "metadata": json.dumps({"source": "OpenStreetMap Contributors", "license": "ODbL", "crs": "EPSG:4326"}),
        },
        {
            "id": "DS-003", "name": "Cartosat-1 DEM Ground Elevation",
            "source_type": "Raster DEM", "format": "GeoTIFF/Grid",
            "status": "Available", "coverage": "Tamil Nadu Region",
            "last_updated": "2025-12", "is_demo": 0,
            "metadata": json.dumps({"source": "Bhuvan / NRSC / ISRO", "resolution_m": 2.5, "vertical_accuracy_m": 1.5}),
        },
        {
            "id": "DS-004", "name": "State Cadastral Survey Layer",
            "source_type": "Cadastral Vector", "format": "GeoJSON",
            "status": "Available", "coverage": "Cadastral Wards",
            "last_updated": "2026-06", "is_demo": 0,
            "metadata": json.dumps({"source": "Authorized Cadastral Survey", "crs": "EPSG:4326"}),
        },
        {
            "id": "DS-005", "name": "Underground Utility Network GIS",
            "source_type": "Subsurface Vector", "format": "GeoJSON",
            "status": "Available", "coverage": "Subsurface Corridors",
            "last_updated": "2026-05", "is_demo": 0,
            "metadata": json.dumps({"source": "Municipal Utility Authority", "utilities": 6}),
        },
        {
            "id": "DS-006", "name": "Elevated Transit Corridor GIS",
            "source_type": "Infrastructure Vector", "format": "GeoJSON",
            "status": "Available", "coverage": "Metro / Transit Routes",
            "last_updated": "2026-04", "is_demo": 0,
            "metadata": json.dumps({"source": "Metro Rail Infrastructure Agency", "clearance_m": 5.5}),
        },
    ]

    for ds in data_sources:
        c.execute("""
            INSERT OR IGNORE INTO data_sources (id,name,source_type,format,status,coverage,
            last_updated,is_demo,metadata)
            VALUES (:id,:name,:source_type,:format,:status,:coverage,
            :last_updated,:is_demo,:metadata)
        """, ds)

    try:
        conn.commit()
        print(f"[OK] Demo data seeded: {len(parcels)} parcels, {len(buildings)} buildings, "
            f"{len(floors)} floors, {len(properties)} properties")
    except Exception as e:
        print(f"[WARN] Seeding error or already seeded: {e}")
    finally:
        conn.close()


def ensure_property_history():
    """Backfill property-specific baseline history and the primary Adyar timeline."""
    try:
        conn = get_db()
        properties = conn.execute("SELECT * FROM properties WHERE status='active'").fetchall()
    except Exception as e:
        print(f"[WARN] Property history query error: {e}")
        return

    for prop_row in properties:
        prop = dict(prop_row)
        existing = conn.execute(
            "SELECT 1 FROM property_versions WHERE property_id=? LIMIT 1", (prop["id"],)
        ).fetchone()
        if existing:
            continue
        now = prop.get("created_at") or datetime.now().isoformat()
        snapshot = {
            "property_id": prop["id"],
            "unit_number": prop.get("unit_number"),
            "property_type": prop.get("property_type"),
            "parcel_id": prop.get("parcel_id"),
            "building_id": prop.get("building_id"),
            "floor_id": prop.get("floor_id"),
            "min_z": prop.get("min_z"),
            "max_z": prop.get("max_z"),
            "area_sqm": prop.get("area_sqm"),
            "volume_cbm": prop.get("volume_cbm"),
        }
        conn.execute(
            """INSERT INTO property_versions (
                id, property_id, version_number, changed_by, change_type,
                old_data, new_data, geometry_2d, min_z, max_z, area_sqm,
                volume_cbm, change_note, changed_at
            ) VALUES (?, ?, 1, 'system_import', 'property_created', ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                f"VER-{prop['id']}-1", prop["id"], json.dumps({}),
                json.dumps(snapshot), prop.get("geometry_2d"), prop.get("min_z"),
                prop.get("max_z"), prop.get("area_sqm"), prop.get("volume_cbm"),
                f"Property {prop.get('unit_number') or prop['id']} created with its registered 3D extent",
                now,
            ),
        )

    primary = conn.execute(
        "SELECT * FROM properties WHERE id='PROP-DEMO-003' AND status='active'"
    ).fetchone()
    if primary:
        prop = dict(primary)
        building_row = conn.execute(
            "SELECT * FROM buildings WHERE id=?", (prop.get("building_id"),)
        ).fetchone()
        floor_row = conn.execute(
            "SELECT * FROM floors WHERE id=?", (prop.get("floor_id"),)
        ).fetchone()
        ulpin_row = conn.execute(
            "SELECT * FROM ulpins WHERE property_id=?", (prop["id"],)
        ).fetchone()
        evidence_count = conn.execute(
            "SELECT COUNT(*) FROM evidence WHERE property_id=?", (prop["id"],)
        ).fetchone()[0]
        validation_count = conn.execute(
            "SELECT COUNT(*) FROM validation_results WHERE property_id=?", (prop["id"],)
        ).fetchone()[0]
        building = dict(building_row) if building_row else {}
        floor = dict(floor_row) if floor_row else {}
        ulpin = dict(ulpin_row) if ulpin_row else {}
        actual = {
            "property_id": prop["id"],
            "unit_number": prop.get("unit_number"),
            "property_type": prop.get("property_type"),
            "building_id": prop.get("building_id"),
            "floor_id": prop.get("floor_id"),
            "min_z": prop.get("min_z"),
            "max_z": prop.get("max_z"),
            "area_sqm": prop.get("area_sqm"),
            "volume_cbm": prop.get("volume_cbm"),
        }
        first = conn.execute(
            "SELECT id FROM property_versions WHERE property_id=? AND version_number=1",
            (prop["id"],),
        ).fetchone()
        if first:
            conn.execute(
                """UPDATE property_versions SET changed_by='Survey Registry',
                    change_type='property_created', old_data=?, new_data=?,
                    geometry_2d=?, min_z=?, max_z=?, area_sqm=?, volume_cbm=?,
                    change_note=?, changed_at='2024-03-18T09:00:00' WHERE id=?""",
                (
                    json.dumps({}), json.dumps(actual), prop.get("geometry_2d"),
                    prop.get("min_z"), prop.get("max_z"), prop.get("area_sqm"),
                    prop.get("volume_cbm"),
                    f"Property {prop.get('unit_number')} created from its linked parcel and 3D footprint",
                    first["id"],
                ),
            )

        versions = [
            (
                2, "building_changed", "2025-02-10T10:30:00",
                "Building information updated",
                {"building_id": prop.get("building_id")},
                {"building_id": prop.get("building_id"), "building_name": building.get("name"), "total_floors": building.get("total_floors"), "height_m": building.get("height_m")},
            ),
            (
                3, "floor_added", "2025-07-22T14:15:00",
                "Floor and unit structure linked",
                {"floor_id": None, "unit_number": prop.get("unit_number")},
                {"floor_id": prop.get("floor_id"), "floor_number": floor.get("floor_number"), "unit_number": prop.get("unit_number"), "elevation_min": floor.get("elevation_min"), "elevation_max": floor.get("elevation_max")},
            ),
            (
                4, "volume_updated", "2026-01-19T11:00:00",
                "3D property volume recalculated",
                {"min_z": prop.get("min_z"), "max_z": prop.get("max_z")},
                {"min_z": prop.get("min_z"), "max_z": prop.get("max_z"), "area_sqm": prop.get("area_sqm"), "volume_cbm": prop.get("volume_cbm")},
            ),
            (
                5, "ulpin_generated", "2026-03-12T09:45:00",
                "ULPIN property identity linked",
                {"ulpin_code": None},
                {"ulpin_code": ulpin.get("ulpin_code"), "ulpin_id": ulpin.get("id"), "property_id": prop["id"]},
            ),
            (
                6, "validation_evidence_updated", "2026-06-04T16:20:00",
                "Validation and evidence records updated",
                {"evidence_records": 0, "validation_records": 0},
                {"evidence_records": evidence_count, "validation_records": validation_count, "geometry_status": prop.get("geometry_status")},
            ),
        ]
        for number, change_type, changed_at, note, old_data, new_data in versions:
            conn.execute(
                """INSERT OR IGNORE INTO property_versions (
                    id, property_id, version_number, changed_by, change_type,
                    old_data, new_data, geometry_2d, min_z, max_z, area_sqm,
                    volume_cbm, change_note, changed_at
                ) VALUES (?, ?, ?, 'TerraX Registry', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    f"VER-{prop['id']}-{number}", prop["id"], number, change_type,
                    json.dumps(old_data), json.dumps(new_data), prop.get("geometry_2d"),
                    prop.get("min_z"), prop.get("max_z"), prop.get("area_sqm"),
                    prop.get("volume_cbm"), note, changed_at,
                ),
            )

    try:
        conn.commit()
    except Exception as e:
        print(f"[WARN] Property history backfill issue: {e}")
    finally:
        conn.close()


if __name__ == "__main__":
    from models.database import init_db
    init_db()
    seed_all()
    ensure_property_history()
