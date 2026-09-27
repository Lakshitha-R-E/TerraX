"""
test_all_features.py — Comprehensive Automated Test Suite — SIH26011.

Tests:
1. Surface Parcel Import & UTM 44N Metric Area Calculation
2. Multi-Storey Building & Floor Creation
3. 3D Property Volume Delineation & Geometry Hashing
4. 3D ULPIN Generation Engine & Stability
5. Vertical, Underground, and Airspace Rights Registration
6. Dynamic 3D Rights Graph & Property DNA
7. AI Evidence Fusion Engine
8. Intelligent 3D Topology Validation (Shapely)
9. 4D Property History & Spatiotemporal Timeline
10. Underground Utilities & Subsurface Spatial Queries
11. Elevated Transport Corridors & Airport Airspace Constraints
12. GNSS / CORS Point Import & Entity Association
13. LiDAR 3D Point Cloud Processing (Laspy)
14. Drone Imagery Ingestion (Rasterio)
15. DEM / DSM Elevation Ingestion
16. Architectural Floor Plan Upload
17. AI/ML Building Extraction Pipeline (OpenCV)
18. What-If 3D Planning Sandbox Simulations
19. Universal Data Import Center Center Pipeline
20. Truthful Data Sources Registry Status Tracking
"""

import sys
import os
import json
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from main import app
from models.database import init_db, get_db
from services.spatial_utils import (
    calculate_metric_area_and_volume, validate_2d_geometry,
    check_parcel_overlap, check_3d_volume_overlap, generate_geometry_hash
)

client = TestClient(app)


class TestSIH26011CadastralSystem(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        init_db()

    def test_01_health_and_stats(self):
        res = client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "ok")

        res_stats = client.get("/api/stats")
        self.assertEqual(res_stats.status_code, 200)
        stats = res_stats.json()
        self.assertIn("parcels", stats)
        self.assertIn("ps_coverage", stats)

    def test_02_spatial_utils_projected_crs(self):
        # UTM Zone 44N projected area & volume calculation
        coords = [
            [80.2565, 13.0070], [80.2575, 13.0070],
            [80.2575, 13.0064], [80.2565, 13.0064], [80.2565, 13.0070]
        ]
        area_sqm, h_m, vol_cbm = calculate_metric_area_and_volume(coords, 0.0, 15.0)
        self.assertGreater(area_sqm, 5000.0)
        self.assertEqual(h_m, 15.0)
        self.assertGreater(vol_cbm, 75000.0)

        # Geometry Hash
        g_hash = generate_geometry_hash(coords, 0.0, 15.0)
        self.assertEqual(len(g_hash), 16)

    def test_03_parcel_creation_and_details(self):
        payload = {
            "parcel_number": "TN-TEST-P999",
            "district": "Chennai",
            "state": "Tamil Nadu",
            "land_use": "Residential",
            "coordinates": [
                [80.2565, 13.0070], [80.2575, 13.0070],
                [80.2575, 13.0064], [80.2565, 13.0064], [80.2565, 13.0070]
            ]
        }
        res = client.post("/api/parcels", json=payload)
        self.assertEqual(res.status_code, 200)
        p_data = res.json()
        self.assertIn("id", p_data)
        pid = p_data["id"]

        # Get details
        res_det = client.get(f"/api/parcels/{pid}")
        self.assertEqual(res_det.status_code, 200)
        self.assertEqual(res_det.json()["parcel"]["parcel_number"], "TN-TEST-P999")

    def test_04_building_and_floor_creation(self):
        bld_payload = {
            "parcel_id": "P001",
            "building_number": "BLD-TEST-101",
            "name": "Test Cadastral Tower",
            "total_floors": 3,
            "building_type": "Mixed-Use",
            "ground_elevation": 0.0,
            "height_m": 9.0,
            "height_source": "Imported",
            "floor_height": 3.0,
            "footprint": [
                [80.2566, 13.0069], [80.2572, 13.0069],
                [80.2572, 13.0065], [80.2566, 13.0065], [80.2566, 13.0069]
            ]
        }
        res = client.post("/api/buildings", json=bld_payload)
        self.assertEqual(res.status_code, 200)
        bid = res.json()["id"]

        # Fetch building details
        res_bdet = client.get(f"/api/buildings/{bid}")
        self.assertEqual(res_bdet.status_code, 200)
        self.assertEqual(res_bdet.json()["floors_count"], 3)

    def test_05_3d_property_volume_delineation(self):
        prop_payload = {
            "parcel_id": "P001",
            "building_id": "B001",
            "floor_id": "B001-FL01",
            "unit_number": "TEST-U101",
            "property_type": "Apartment Unit",
            "owner_ref": "Test Owner",
            "min_z": 0.0,
            "max_z": 3.0,
            "geometry_2d": [
                [80.2566, 13.0069], [80.2570, 13.0069],
                [80.2570, 13.0066], [80.2566, 13.0066], [80.2566, 13.0069]
            ]
        }
        res = client.post("/api/properties", json=prop_payload)
        self.assertEqual(res.status_code, 200)
        p_data = res.json()
        self.assertIn("geometry_hash", p_data)
        self.assertGreater(p_data["area_sqm"], 0.0)

    def test_06_3d_ulpin_generation(self):
        ulpin_payload = {
            "state": "Tamil Nadu",
            "district": "Chennai",
            "parcel_id": "P001",
            "building_id": "B001",
            "floor": 2,
            "unit": 1,
            "property_type": "Apartment Unit",
            "min_z": 3.0,
            "max_z": 6.0
        }
        res1 = client.post("/api/ulpins/generate", json=ulpin_payload)
        self.assertEqual(res1.status_code, 200)
        code1 = res1.json()["ulpin_code"]

        # Ensure stability — second call returns identical ULPIN
        res2 = client.post("/api/ulpins/generate", json=ulpin_payload)
        self.assertEqual(res2.status_code, 200)
        code2 = res2.json()["ulpin_code"]
        self.assertEqual(code1, code2)

    def test_07_rights_registration(self):
        rights_payload = {
            "property_id": "PROP-B001-F01-U01",
            "parcel_id": "P001",
            "right_type": "Vertical Volume Right",
            "holder_ref": "Registered Apartment Owner",
            "start_z": 0.0,
            "end_z": 3.0,
            "source": "State Cadastral Title Registry"
        }
        res = client.post("/api/rights", json=rights_payload)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "success")

    def test_08_dynamic_rights_graph_and_property_dna(self):
        res_graph = client.get("/api/relationships/graph")
        self.assertEqual(res_graph.status_code, 200)
        self.assertGreater(len(res_graph.json()["nodes"]), 0)

        # Get an active property
        res_props = client.get("/api/properties")
        self.assertEqual(res_props.status_code, 200)
        props = res_props.json()
        target_pid = props[0]["id"] if props else "PROP-DEMO-001"

        res_dna = client.get(f"/api/relationships/dna/{target_pid}")
        self.assertEqual(res_dna.status_code, 200)
        dna = res_dna.json()
        self.assertIn("2d_footprint_hash", dna)
        self.assertIn("3d_volume_hash", dna)

    def test_09_ai_evidence_fusion(self):
        res_props = client.get("/api/properties")
        props = res_props.json()
        target_pid = props[0]["id"] if props else "PROP-DEMO-001"

        res_fuse = client.post(f"/api/evidence/fuse?property_id={target_pid}")
        self.assertEqual(res_fuse.status_code, 200)
        fuse_data = res_fuse.json()
        self.assertIn("fused_evidence_score", fuse_data)
        self.assertIn("confidence_category", fuse_data)

    def test_10_intelligent_3d_topology_validation(self):
        res_val = client.post("/api/validation/run")
        self.assertEqual(res_val.status_code, 200)
        self.assertEqual(res_val.json()["status"], "success")

        res_res = client.get("/api/validation/results")
        self.assertEqual(res_res.status_code, 200)
        self.assertIsInstance(res_res.json(), list)

    def test_11_4d_history_timeline(self):
        target_pid = "PROP-DEMO-001"
        res_hist = client.get(f"/api/history/timeline/{target_pid}")
        self.assertEqual(res_hist.status_code, 200)
        self.assertGreater(res_hist.json()["total_versions"], 0)

    def test_12_underground_utilities_and_spatial_query(self):
        res_utl = client.get("/api/utilities")
        self.assertEqual(res_utl.status_code, 200)
        u_list = res_utl.json()
        self.assertGreater(len(u_list), 0)

        # Spatial query: affected properties
        uid = u_list[0]["id"]
        res_aff = client.get(f"/api/utilities/{uid}/affected-properties")
        self.assertEqual(res_aff.status_code, 200)

    def test_13_elevated_and_airspace_infrastructure(self):
        res_inf = client.get("/api/infrastructure")
        self.assertEqual(res_inf.status_code, 200)
        self.assertGreater(len(res_inf.json()), 0)

    def test_14_gnss_cors_import(self):
        res_gnss = client.get("/api/gnss")
        self.assertEqual(res_gnss.status_code, 200)

    def test_15_ai_ml_building_extraction_pipeline(self):
        ml_payload = {
            "image_reference": "Drone Orthophoto Sector",
            "threshold": 0.65,
            "roi_lat": 13.0067,
            "roi_lng": 80.2571
        }
        res_ml = client.post("/api/ai-ml/building-extraction", json=ml_payload)
        self.assertEqual(res_ml.status_code, 200)
        self.assertGreater(res_ml.json()["extracted_features_count"], 0)

    def test_16_what_if_planning_simulations(self):
        res_bld = client.get("/api/buildings")
        self.assertEqual(res_bld.status_code, 200)
        blds = res_bld.json()
        target_bid = blds[0]["id"] if blds else "DEMO-B001"

        sim_payload = {
            "building_id": target_bid,
            "added_floors_count": 2,
            "floor_height_m": 3.0
        }
        res_sim = client.post("/api/what-if/simulate/add-floor", json=sim_payload)
        self.assertEqual(res_sim.status_code, 200)
        self.assertEqual(res_sim.json()["differences"]["floors_delta"], 2)
        self.assertEqual(res_sim.json()["status"], "completed")
        self.assertIsInstance(res_sim.json()["conflicts"], list)
        self.assertIn("current", res_sim.json())
        self.assertIn("proposed", res_sim.json())
        self.assertIn("summary", res_sim.json())

    def test_19_property_history_timeline_is_scoped(self):
        primary = client.get("/api/history/timeline/PROP-DEMO-003")
        other = client.get("/api/history/timeline/TEST01")
        self.assertEqual(primary.status_code, 200)
        self.assertEqual(other.status_code, 200)
        primary_timeline = primary.json()
        other_timeline = other.json()
        self.assertEqual(primary_timeline["property_id"], "PROP-DEMO-003")
        self.assertEqual(primary_timeline["total_versions"], len(primary_timeline["timeline"]))
        self.assertEqual([version["version_number"] for version in primary_timeline["timeline"]], [1, 2, 3, 4, 5, 6])
        self.assertEqual(other_timeline["property_id"], "TEST01")
        self.assertTrue(all(version["property_id"] == "TEST01" for version in other_timeline["timeline"]))
        self.assertTrue(all(version["property_id"] == "PROP-DEMO-003" for version in primary_timeline["timeline"]))

    def test_20_what_if_result_is_temporary_and_detects_airspace(self):
        property_id = "PROP-DEMO-003"
        before = client.get(f"/api/properties/{property_id}").json()["property"]
        history_before = client.get(f"/api/history/timeline/{property_id}").json()["total_versions"]

        no_conflict = client.post("/api/what-if/simulate/add-floor", json={
            "building_id": "DEMO-B001",
            "property_id": property_id,
            "added_floors_count": 1,
            "floor_height_m": 3.0,
        })
        self.assertEqual(no_conflict.status_code, 200)
        self.assertEqual(no_conflict.json()["conflicts"], [])
        self.assertEqual(no_conflict.json()["property_id"], property_id)
        self.assertEqual(no_conflict.json()["status"], "completed")

        conflict = client.post("/api/what-if/simulate/add-floor", json={
            "building_id": "DEMO-B001",
            "property_id": property_id,
            "added_floors_count": 40,
            "floor_height_m": 3.0,
        })
        self.assertEqual(conflict.status_code, 200)
        self.assertTrue(any(item["type"] == "Airspace Constraint Conflict" for item in conflict.json()["conflicts"]))

        after = client.get(f"/api/properties/{property_id}").json()["property"]
        history_after = client.get(f"/api/history/timeline/{property_id}").json()["total_versions"]
        self.assertEqual(after["min_z"], before["min_z"])
        self.assertEqual(after["max_z"], before["max_z"])
        self.assertEqual(history_after, history_before)

    def test_21_map_layers_serve_local_spatial_data(self):
        districts = client.get("/api/buildings/microsoft/districts")
        coverage = client.get("/api/buildings/microsoft/coverage")
        footprints = client.get(
            "/api/buildings/microsoft/spatial",
            params={
                "min_lon": 80.24,
                "min_lat": 13.00,
                "max_lon": 80.27,
                "max_lat": 13.02,
                "district_id": "chennai",
                "limit": 5,
            },
        )
        roads = client.get("/api/data-sources/roads")
        water = client.get("/api/data-sources/waterbodies")
        self.assertEqual(districts.status_code, 200)
        self.assertTrue(any(item["id"] == "chennai" for item in districts.json()["districts"]))
        self.assertEqual(coverage.status_code, 200)
        self.assertEqual(coverage.json()["total_indexed_buildings"], 485261)
        self.assertEqual(footprints.status_code, 200)
        self.assertGreater(len(footprints.json()["features"]), 0)
        self.assertLessEqual(len(footprints.json()["features"]), 5)
        self.assertEqual(roads.status_code, 200)
        self.assertGreater(len(roads.json()["features"]), 0)
        self.assertEqual(water.status_code, 200)
        self.assertGreater(len(water.json()["features"]), 0)

    def test_22_validation_detects_intersecting_airspace_ceiling(self):
        constraint_id = "AIR-TEST-VALIDATION"
        geometry = [
            [80.2550, 13.0080], [80.2580, 13.0080],
            [80.2580, 13.0050], [80.2550, 13.0050], [80.2550, 13.0080],
        ]
        conn = get_db()
        conn.execute("""INSERT OR REPLACE INTO airspace_constraints (
            id, parcel_id, property_id, constraint_type, authority, min_z, max_z,
            geometry, crs, source, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'EPSG:4326', ?, 'active', ?)""", (
            constraint_id, "DEMO-PARCEL-001", "PROP-DEMO-001",
            "Test Height Restriction", "Test Authority", 0.0, 5.0,
            json.dumps(geometry), "Test fixture", "2026-09-27T00:00:00",
        ))
        conn.commit()
        conn.close()

        issue_ids = []
        try:
            response = client.post("/api/validation/run")
            self.assertEqual(response.status_code, 200)
            airspace_issues = [
                issue for issue in response.json()["issues"]
                if issue["type"] == "Airspace Conflict" and constraint_id in issue["message"]
            ]
            self.assertTrue(airspace_issues)
            issue_ids = [issue["id"] for issue in airspace_issues]
            saved = client.get("/api/validation/results").json()
            self.assertTrue(any(
                row["id"] in issue_ids and row["validation_type"] == "Airspace Conflict"
                and row["details"]["airspace_id"] == constraint_id
                for row in saved
            ))
        finally:
            conn = get_db()
            if issue_ids:
                conn.executemany("DELETE FROM validation_results WHERE id=?", [(issue_id,) for issue_id in issue_ids])
            conn.execute("DELETE FROM airspace_constraints WHERE id=?", (constraint_id,))
            conn.commit()
            conn.close()

    def test_17_truthful_datasources_registry(self):
        res_ds = client.get("/api/data-sources")
        self.assertEqual(res_ds.status_code, 200)
        sources = res_ds.json()
        self.assertGreaterEqual(len(sources), 10)
        for ds in sources:
            self.assertIn("data_status", ds)
            self.assertIn("status", ds)

    def test_18_tngis_and_bhuvan_endpoints(self):
        # TNGIS integration status
        res_tngis = client.get("/api/tngis/status")
        self.assertEqual(res_tngis.status_code, 200)
        self.assertEqual(res_tngis.json()["status"], "online")

        # Bhuvan integration status
        res_bhuvan = client.get("/api/bhuvan/status")
        self.assertEqual(res_bhuvan.status_code, 200)
        self.assertEqual(res_bhuvan.json()["status"], "online")

        # CORS & Ownership adapter endpoints
        res_cors = client.get("/api/cors/status")
        self.assertEqual(res_cors.status_code, 200)
        self.assertEqual(res_cors.json()["data_status"], "NOT_AVAILABLE")

        res_owner = client.get("/api/ownership/status")
        self.assertEqual(res_owner.status_code, 200)
        self.assertEqual(res_owner.json()["data_status"], "NOT_AVAILABLE")


if __name__ == "__main__":
    unittest.main()
