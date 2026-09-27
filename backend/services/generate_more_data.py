"""
Populates remaining data files in data/ and updates seeder to load directly from data/
"""
import json
import os
import sys

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")

# 6. utilities.geojson
utilities_geojson = {
    "type": "FeatureCollection",
    "metadata": {
        "source": "Prototype / Demonstration Subsurface Dataset",
        "description": "Subterranean utility infrastructure network with depth profiles."
    },
    "features": [
        {
            "type": "Feature",
            "properties": {
                "id": "UTL-W001",
                "parcel_id": "P001",
                "utility_type": "Water Pipeline",
                "asset_id": "WP-2024-001",
                "depth_m": 2.5,
                "length_m": 45.0,
                "status": "active",
                "conflict_status": "none",
                "metadata": {"diameter_mm": 200, "material": "PVC", "pressure": "medium"}
            },
            "geometry": {
                "type": "LineString",
                "coordinates": [[80.2565, 13.0068], [80.2575, 13.0068]]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "id": "UTL-S001",
                "parcel_id": "P001",
                "utility_type": "Sewer Line",
                "asset_id": "SL-2024-001",
                "depth_m": 3.5,
                "length_m": 50.0,
                "status": "active",
                "conflict_status": "none",
                "metadata": {"diameter_mm": 300, "material": "Concrete"}
            },
            "geometry": {
                "type": "LineString",
                "coordinates": [[80.2565, 13.0066], [80.2575, 13.0066]]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "id": "UTL-E001",
                "parcel_id": "P002",
                "utility_type": "Electrical Cable",
                "asset_id": "EC-2024-001",
                "depth_m": 1.0,
                "length_m": 60.0,
                "status": "active",
                "conflict_status": "warning",
                "metadata": {"voltage_kv": 11, "type": "HT Feeder Cable"}
            },
            "geometry": {
                "type": "LineString",
                "coordinates": [[80.2577, 13.0076], [80.2585, 13.0076]]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "id": "UTL-C001",
                "parcel_id": "P003",
                "utility_type": "Communication Cable",
                "asset_id": "CC-2024-001",
                "depth_m": 0.8,
                "length_m": 80.0,
                "status": "active",
                "conflict_status": "none",
                "metadata": {"type": "Optical Fiber", "bandwidth": "10Gbps"}
            },
            "geometry": {
                "type": "LineString",
                "coordinates": [[80.2574, 13.0035], [80.2586, 13.0035]]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "id": "UTL-W002",
                "parcel_id": "P004",
                "utility_type": "Water Pipeline",
                "asset_id": "WP-2024-002",
                "depth_m": 3.0,
                "length_m": 35.0,
                "status": "active",
                "conflict_status": "conflict",
                "metadata": {"diameter_mm": 150, "material": "DI", "note": "Intersects property boundary"}
            },
            "geometry": {
                "type": "LineString",
                "coordinates": [[80.2540, 13.0112], [80.2550, 13.0112]]
            }
        }
    ]
}

# 7. elevated_structures.geojson
elevated_geojson = {
    "type": "FeatureCollection",
    "metadata": {
        "source": "Prototype Elevated Infrastructure Layer",
        "description": "Above-ground transport infrastructure with vertical clearances."
    },
    "features": [
        {
            "type": "Feature",
            "properties": {
                "id": "INF-EL001",
                "parcel_id": "P005",
                "infra_type": "Metro Rail Corridor",
                "asset_id": "MRTS-L2-ADY-001",
                "height_m": 8.0,
                "length_m": 280.0,
                "status": "active",
                "conflict_status": "none",
                "metadata": {"authority": "CMRL (Demo)", "clearance_m": 5.5, "line": "Line 2"}
            },
            "geometry": {
                "type": "LineString",
                "coordinates": [[80.2596, 13.0125], [80.2612, 13.0125]]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "id": "INF-EL002",
                "parcel_id": "P002",
                "infra_type": "Elevated Road",
                "asset_id": "NHAI-BR-CHN-001",
                "height_m": 5.5,
                "length_m": 150.0,
                "status": "active",
                "conflict_status": "warning",
                "metadata": {"authority": "NHAI (Demo)", "width_m": 8.0}
            },
            "geometry": {
                "type": "LineString",
                "coordinates": [[80.2576, 13.0077], [80.2586, 13.0077]]
            }
        }
    ]
}

# 8. airspace.geojson
airspace_geojson = {
    "type": "FeatureCollection",
    "metadata": {
        "source": "Prototype Air-Space Right of Way",
        "description": "Volumetric air-rights parcels above physical structures."
    },
    "features": [
        {
            "type": "Feature",
            "properties": {
                "id": "PROP-B005-AS-001",
                "parcel_id": "P005",
                "unit_number": "AS-001",
                "property_type": "Air-Space Volume",
                "min_z": 8.0,
                "max_z": 14.0,
                "area_sqm": 1200.0,
                "volume_cbm": 7200.0
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [80.2599, 13.0129], [80.2608, 13.0129],
                    [80.2608, 13.0121], [80.2599, 13.0121],
                    [80.2599, 13.0129]
                ]]
            }
        }
    ]
}

more_files = {
    "utilities.geojson": utilities_geojson,
    "elevated_structures.geojson": elevated_geojson,
    "airspace.geojson": airspace_geojson
}

for fname, content in more_files.items():
    p = os.path.join(DATA_DIR, fname)
    with open(p, "w", encoding="utf-8") as f:
        json.dump(content, f, indent=2)
    print(f"Written: {fname}")

print("All GeoJSON layers generated.")
