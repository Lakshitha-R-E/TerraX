"""
Database setup and models for 3D ULPIN System — SIH26011.
Supports complete 3D Cadastral Framework with spatial metadata, versioning, evidence fusion, and rights graph.
"""
import sqlite3
import json
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "cadastral.db")


def get_db():
    conn = sqlite3.connect(DB_PATH, timeout=60.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA busy_timeout = 30000")
    return conn


def _migrate_columns(conn):
    """Safely adds missing spatial metadata columns to existing tables."""
    c = conn.cursor()

    migrations = [
        # parcels
        ("parcels", "source_type", "TEXT DEFAULT 'Cadastral Vector'"),
        ("parcels", "source_name", "TEXT DEFAULT 'State Cadastral Survey'"),
        ("parcels", "crs", "TEXT DEFAULT 'EPSG:4326'"),
        ("parcels", "min_z", "REAL DEFAULT 0.0"),
        ("parcels", "max_z", "REAL DEFAULT 0.0"),
        ("parcels", "source_id", "TEXT"),
        ("parcels", "source_url", "TEXT"),
        ("parcels", "license", "TEXT DEFAULT 'Official Cadastral Data'"),
        ("parcels", "acquisition_date", "TEXT"),
        ("parcels", "processing_date", "TEXT"),
        ("parcels", "accuracy_m", "REAL DEFAULT 0.1"),
        ("parcels", "confidence", "REAL DEFAULT 95.0"),
        ("parcels", "data_status", "TEXT DEFAULT 'Imported'"),
        ("parcels", "geometry_status", "TEXT DEFAULT 'VALID'"),

        # buildings
        ("buildings", "source_type", "TEXT DEFAULT 'Vector Polygons'"),
        ("buildings", "source_name", "TEXT DEFAULT 'Microsoft ML Footprints'"),
        ("buildings", "height_source", "TEXT DEFAULT 'Unavailable'"),
        ("buildings", "height_m", "REAL DEFAULT 12.0"),
        ("buildings", "min_z", "REAL DEFAULT 0.0"),
        ("buildings", "max_z", "REAL DEFAULT 12.0"),
        ("buildings", "crs", "TEXT DEFAULT 'EPSG:4326'"),
        ("buildings", "source_id", "TEXT"),
        ("buildings", "license", "TEXT DEFAULT 'CDLA-Permissive-2.0'"),
        ("buildings", "acquisition_date", "TEXT"),
        ("buildings", "processing_date", "TEXT"),
        ("buildings", "accuracy_m", "REAL"),
        ("buildings", "confidence", "REAL DEFAULT 85.0"),
        ("buildings", "data_status", "TEXT DEFAULT 'Imported'"),
        ("buildings", "geometry_status", "TEXT DEFAULT 'VALID'"),

        # floors
        ("floors", "height_m", "REAL DEFAULT 3.0"),
        ("floors", "evidence_source", "TEXT DEFAULT 'HEIGHT-DERIVED ESTIMATE'"),
        ("floors", "confidence", "REAL DEFAULT 80.0"),
        ("floors", "created_at", "TEXT"),

        # properties
        ("properties", "source_type", "TEXT DEFAULT 'Volumetric Cadastre'"),
        ("properties", "source_name", "TEXT DEFAULT 'Project Cadastral Engine'"),
        ("properties", "height_m", "REAL DEFAULT 3.0"),
        ("properties", "crs", "TEXT DEFAULT 'EPSG:4326'"),
        ("properties", "source_id", "TEXT"),
        ("properties", "license", "TEXT"),
        ("properties", "acquisition_date", "TEXT"),
        ("properties", "processing_date", "TEXT"),
        ("properties", "accuracy_m", "REAL"),
        ("properties", "confidence", "REAL DEFAULT 85.0"),
        ("properties", "data_status", "TEXT DEFAULT 'Imported'"),
        ("properties", "geometry_status", "TEXT DEFAULT 'VALID'"),

        # ulpins
        ("ulpins", "spatial_hash", "TEXT"),
        ("ulpins", "version", "INTEGER DEFAULT 1"),

        # evidence
        ("evidence", "building_id", "TEXT"),
        ("evidence", "parcel_id", "TEXT"),
        ("evidence", "created_at", "TEXT"),

        # rights
        ("rights", "parcel_id", "TEXT"),
        ("rights", "effective_from", "TEXT"),
        ("rights", "effective_to", "TEXT"),
        ("rights", "is_demo", "INTEGER DEFAULT 0"),
        ("rights", "created_at", "TEXT"),
        ("rights", "evidence_ref", "TEXT"),

        # gnss
        ("gnss_points", "parcel_id", "TEXT"),
        ("gnss_points", "building_id", "TEXT"),

        # utilities
        ("utilities", "min_z", "REAL"),
        ("utilities", "max_z", "REAL"),
        ("utilities", "crs", "TEXT DEFAULT 'EPSG:4326'"),
        ("utilities", "source", "TEXT DEFAULT 'Municipal Utility GIS'"),

        # infrastructure
        ("infrastructure", "crs", "TEXT DEFAULT 'EPSG:4326'"),
        ("infrastructure", "source", "TEXT DEFAULT 'Infrastructure GIS'"),

        # validation_results
        ("validation_results", "parcel_id", "TEXT"),
        ("validation_results", "building_id", "TEXT"),
        ("validation_results", "utility_id", "TEXT"),
        ("validation_results", "resolution_reason", "TEXT"),

        # property_versions
        ("property_versions", "geometry_2d", "TEXT"),
        ("property_versions", "min_z", "REAL"),
        ("property_versions", "max_z", "REAL"),
        ("property_versions", "area_sqm", "REAL"),
        ("property_versions", "volume_cbm", "REAL"),

        # lidar_datasets
        ("lidar_datasets", "filename", "TEXT"),
        ("lidar_datasets", "file_path", "TEXT"),
        ("lidar_datasets", "ground_points_count", "INTEGER DEFAULT 0"),
        ("lidar_datasets", "non_ground_points_count", "INTEGER DEFAULT 0"),
        ("lidar_datasets", "point_density_sqm", "REAL"),
        ("lidar_datasets", "min_z", "REAL"),
        ("lidar_datasets", "max_z", "REAL"),
        ("lidar_datasets", "mean_z", "REAL"),
        ("lidar_datasets", "bbox", "TEXT"),
        ("lidar_datasets", "source_name", "TEXT DEFAULT 'LiDAR Airborne Survey'"),
        ("lidar_datasets", "license", "TEXT DEFAULT 'Project Open License'"),
        ("lidar_datasets", "processing_log", "TEXT"),
        ("lidar_datasets", "created_at", "TEXT"),

        # drone_datasets
        ("drone_datasets", "filename", "TEXT"),
        ("drone_datasets", "file_path", "TEXT"),
        ("drone_datasets", "ground_sampling_distance_cm", "REAL"),
        ("drone_datasets", "camera_info", "TEXT"),
        ("drone_datasets", "source_name", "TEXT DEFAULT 'Drone Survey Flight'"),
        ("drone_datasets", "license", "TEXT DEFAULT 'Project Open License'"),
        ("drone_datasets", "processing_log", "TEXT"),
        ("drone_datasets", "created_at", "TEXT"),

        # dem_datasets
        ("dem_datasets", "filename", "TEXT"),
        ("dem_datasets", "file_path", "TEXT"),
        ("dem_datasets", "vertical_units", "TEXT DEFAULT 'Meters'"),
        ("dem_datasets", "bbox", "TEXT"),
        ("dem_datasets", "min_elevation", "REAL"),
        ("dem_datasets", "max_elevation", "REAL"),
        ("dem_datasets", "status", "TEXT DEFAULT 'Imported'"),
        ("dem_datasets", "created_at", "TEXT"),

        # dsm_datasets
        ("dsm_datasets", "filename", "TEXT"),
        ("dsm_datasets", "file_path", "TEXT"),
        ("dsm_datasets", "vertical_units", "TEXT DEFAULT 'Meters'"),
        ("dsm_datasets", "bbox", "TEXT"),
        ("dsm_datasets", "min_elevation", "REAL"),
        ("dsm_datasets", "max_elevation", "REAL"),
        ("dsm_datasets", "status", "TEXT DEFAULT 'Imported'"),
        ("dsm_datasets", "created_at", "TEXT"),

        # floor_plans
        ("floor_plans", "filename", "TEXT"),
        ("floor_plans", "file_path", "TEXT"),
        ("floor_plans", "status", "TEXT DEFAULT 'Processed'"),
        ("floor_plans", "created_at", "TEXT"),

        # gnss_points
        ("gnss_points", "source", "TEXT DEFAULT 'CORS Network Survey'"),

        # data_sources
        ("data_sources", "records_count", "INTEGER DEFAULT 0"),
        ("data_sources", "url_reference", "TEXT"),
        ("data_sources", "license", "TEXT"),
        ("data_sources", "acquisition_date", "TEXT"),
        ("data_sources", "processing_date", "TEXT"),
        ("data_sources", "crs", "TEXT DEFAULT 'EPSG:4326'"),
        ("data_sources", "accuracy_m", "REAL"),

        # utilities & infrastructure
        ("utilities", "created_at", "TEXT"),
        ("infrastructure", "created_at", "TEXT"),

        # relationships
        ("relationships", "created_at", "TEXT"),
    ]

    for table, col, col_type in migrations:
        try:
            c.execute(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}")
        except sqlite3.OperationalError:
            pass  # Column already exists

    conn.commit()


def init_db():
    conn = get_db()
    conn.execute("PRAGMA journal_mode=WAL")
    c = conn.cursor()

    c.executescript("""
    -- 1. Users
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT,
        role TEXT DEFAULT 'surveyor',
        organization TEXT,
        created_at TEXT
    );

    -- 2. Data Sources Registry (Truthful Source Registry)
    CREATE TABLE IF NOT EXISTS data_sources (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        source_type TEXT NOT NULL,
        format TEXT NOT NULL,
        status TEXT NOT NULL,         -- 'Available', 'Imported', 'Processed', 'Derived', 'Partial', 'Import Required'
        coverage TEXT,
        url_reference TEXT,
        license TEXT,
        acquisition_date TEXT,
        processing_date TEXT,
        crs TEXT DEFAULT 'EPSG:4326',
        accuracy_m REAL,
        records_count INTEGER DEFAULT 0,
        is_demo INTEGER DEFAULT 0,
        metadata TEXT
    );

    -- 3. Surface Land Parcels
    CREATE TABLE IF NOT EXISTS parcels (
        id TEXT PRIMARY KEY,
        parcel_number TEXT NOT NULL UNIQUE,
        district TEXT NOT NULL,
        state TEXT NOT NULL,
        area_sqm REAL,
        land_use TEXT,
        coordinates TEXT NOT NULL,       -- JSON polygon WGS84 coords
        centroid_lat REAL,
        centroid_lng REAL,
        min_z REAL DEFAULT 0.0,
        max_z REAL DEFAULT 0.0,
        crs TEXT DEFAULT 'EPSG:4326',
        source_id TEXT,
        source_name TEXT DEFAULT 'State Cadastral Survey',
        source_type TEXT DEFAULT 'Cadastral Vector',
        source_url TEXT,
        license TEXT DEFAULT 'Official Cadastral Data',
        acquisition_date TEXT,
        processing_date TEXT,
        accuracy_m REAL DEFAULT 0.1,
        confidence REAL DEFAULT 95.0,
        data_status TEXT DEFAULT 'Imported',
        geometry_status TEXT DEFAULT 'VALID',
        status TEXT DEFAULT 'active',
        created_at TEXT,
        updated_at TEXT
    );

    -- 4. Buildings
    CREATE TABLE IF NOT EXISTS buildings (
        id TEXT PRIMARY KEY,
        parcel_id TEXT,
        building_number TEXT NOT NULL,
        name TEXT,
        total_floors INTEGER DEFAULT 1,
        building_type TEXT DEFAULT 'Residential',
        ground_elevation REAL DEFAULT 0.0,
        height_m REAL DEFAULT 12.0,
        height_source TEXT DEFAULT 'Unavailable', -- 'Microsoft', 'LiDAR', 'DSM-DEM', 'Imported', 'Unavailable'
        floor_height REAL DEFAULT 3.0,
        footprint TEXT NOT NULL,                  -- JSON polygon coords
        centroid_lat REAL,
        centroid_lng REAL,
        min_z REAL DEFAULT 0.0,
        max_z REAL DEFAULT 12.0,
        crs TEXT DEFAULT 'EPSG:4326',
        source_id TEXT,
        source_name TEXT DEFAULT 'Microsoft ML Footprints',
        source_type TEXT DEFAULT 'Vector Polygons',
        license TEXT DEFAULT 'CDLA-Permissive-2.0',
        acquisition_date TEXT,
        processing_date TEXT,
        accuracy_m REAL,
        confidence REAL DEFAULT 85.0,
        data_status TEXT DEFAULT 'Imported',
        geometry_status TEXT DEFAULT 'VALID',
        status TEXT DEFAULT 'active',
        created_at TEXT,
        updated_at TEXT,
        FOREIGN KEY (parcel_id) REFERENCES parcels(id)
    );

    -- 5. Floors
    CREATE TABLE IF NOT EXISTS floors (
        id TEXT PRIMARY KEY,
        building_id TEXT NOT NULL,
        floor_number INTEGER NOT NULL,
        floor_label TEXT,
        elevation_min REAL NOT NULL,
        elevation_max REAL NOT NULL,
        floor_area REAL,
        height_m REAL DEFAULT 3.0,
        evidence_source TEXT DEFAULT 'HEIGHT-DERIVED ESTIMATE', -- 'LiDAR', 'DSM', 'Floor Plan', 'HEIGHT-DERIVED ESTIMATE'
        confidence REAL DEFAULT 80.0,
        status TEXT DEFAULT 'active',
        created_at TEXT,
        FOREIGN KEY (building_id) REFERENCES buildings(id)
    );

    -- 6. Property Units & 3D Volumes
    CREATE TABLE IF NOT EXISTS properties (
        id TEXT PRIMARY KEY,
        parcel_id TEXT,
        building_id TEXT,
        floor_id TEXT,
        unit_number TEXT,
        property_type TEXT DEFAULT 'Apartment Unit', -- 'Apartment Unit', 'Commercial Unit', 'Surface Parcel', 'Underground Parking', 'Air-Space Volume'
        owner_ref TEXT,
        area_sqm REAL,
        volume_cbm REAL,
        min_z REAL DEFAULT 0.0,
        max_z REAL DEFAULT 3.0,
        height_m REAL DEFAULT 3.0,
        centroid_lat REAL,
        centroid_lng REAL,
        geometry_2d TEXT,       -- JSON polygon
        geometry_3d TEXT,       -- JSON volumetric descriptor
        crs TEXT DEFAULT 'EPSG:4326',
        source_id TEXT,
        source_name TEXT DEFAULT 'Project Cadastral Engine',
        source_type TEXT DEFAULT 'Volumetric Cadastre',
        license TEXT,
        acquisition_date TEXT,
        processing_date TEXT,
        accuracy_m REAL,
        confidence REAL DEFAULT 85.0,
        data_status TEXT DEFAULT 'Imported',
        geometry_status TEXT DEFAULT 'VALID',
        status TEXT DEFAULT 'active',
        created_at TEXT,
        updated_at TEXT,
        FOREIGN KEY (parcel_id) REFERENCES parcels(id),
        FOREIGN KEY (building_id) REFERENCES buildings(id),
        FOREIGN KEY (floor_id) REFERENCES floors(id)
    );

    -- 7. Dedicated Property Volumes entity
    CREATE TABLE IF NOT EXISTS property_volumes (
        id TEXT PRIMARY KEY,
        property_id TEXT NOT NULL,
        volume_type TEXT NOT NULL, -- 'Surface Volume', 'Above-Ground Volume', 'Underground Volume', 'Airspace Volume'
        footprint TEXT NOT NULL,
        min_z REAL NOT NULL,
        max_z REAL NOT NULL,
        area_sqm REAL NOT NULL,
        volume_cbm REAL NOT NULL,
        crs TEXT DEFAULT 'EPSG:4326',
        confidence REAL DEFAULT 85.0,
        created_at TEXT,
        FOREIGN KEY (property_id) REFERENCES properties(id)
    );

    -- 8. 3D ULPINs
    CREATE TABLE IF NOT EXISTS ulpins (
        id TEXT PRIMARY KEY,
        property_id TEXT NOT NULL UNIQUE,
        ulpin_code TEXT NOT NULL UNIQUE,
        state_code TEXT NOT NULL,
        district_code TEXT NOT NULL,
        parcel_ref TEXT,
        building_ref TEXT,
        floor_ref TEXT,
        unit_ref TEXT,
        property_type TEXT,
        min_z REAL,
        max_z REAL,
        spatial_hash TEXT,
        version INTEGER DEFAULT 1,
        generated_at TEXT,
        generated_by TEXT DEFAULT '3D ULPIN Project Engine',
        FOREIGN KEY (property_id) REFERENCES properties(id)
    );

    -- 9. Vertical & Volumetric Ownership Rights
    CREATE TABLE IF NOT EXISTS rights (
        id TEXT PRIMARY KEY,
        property_id TEXT,
        parcel_id TEXT,
        right_type TEXT NOT NULL, -- 'Surface Right', 'Building Right', 'Floor Right', 'Unit Right', 'Vertical Volume Right', 'Underground Right', 'Airspace / Spatial Right'
        holder_ref TEXT,
        start_z REAL DEFAULT 0.0,
        end_z REAL DEFAULT 12.0,
        spatial_extent TEXT,      -- JSON spatial polygon / volume
        source TEXT DEFAULT 'Imported Rights Record',
        evidence_ref TEXT,
        effective_from TEXT,
        effective_to TEXT,
        status TEXT DEFAULT 'active',
        is_demo INTEGER DEFAULT 0,
        created_at TEXT
    );

    -- 10. Rights Volumes
    CREATE TABLE IF NOT EXISTS rights_volumes (
        id TEXT PRIMARY KEY,
        right_id TEXT NOT NULL,
        property_id TEXT NOT NULL,
        volume_geojson TEXT NOT NULL,
        min_z REAL NOT NULL,
        max_z REAL NOT NULL,
        volume_cbm REAL,
        created_at TEXT,
        FOREIGN KEY (right_id) REFERENCES rights(id)
    );

    -- 11. Underground Utilities
    CREATE TABLE IF NOT EXISTS utilities (
        id TEXT PRIMARY KEY,
        parcel_id TEXT,
        utility_type TEXT NOT NULL, -- 'Water Pipeline', 'Sewer Line', 'Electrical Cable', 'Communication Cable', 'Underground Parking'
        asset_id TEXT NOT NULL,
        depth_m REAL NOT NULL,
        min_z REAL,
        max_z REAL,
        length_m REAL,
        geometry TEXT NOT NULL,      -- JSON LineString or Polygon
        crs TEXT DEFAULT 'EPSG:4326',
        source TEXT DEFAULT 'Municipal Utility GIS',
        status TEXT DEFAULT 'active',
        conflict_status TEXT DEFAULT 'none',
        metadata TEXT,
        created_at TEXT
    );

    -- 12. Underground Structures
    CREATE TABLE IF NOT EXISTS underground_structures (
        id TEXT PRIMARY KEY,
        parcel_id TEXT,
        building_id TEXT,
        structure_type TEXT NOT NULL, -- 'Underground Parking', 'Basement Level', 'Subsurface Vault', 'Metro Tunnel'
        name TEXT,
        depth_m REAL NOT NULL,
        min_z REAL NOT NULL,
        max_z REAL NOT NULL,
        geometry TEXT NOT NULL,       -- JSON polygon
        status TEXT DEFAULT 'active',
        source TEXT DEFAULT 'Underground Survey',
        created_at TEXT
    );

    -- 13. Elevated Structures
    CREATE TABLE IF NOT EXISTS elevated_structures (
        id TEXT PRIMARY KEY,
        parcel_id TEXT,
        infra_type TEXT NOT NULL, -- 'Metro Rail Corridor', 'Elevated Road', 'Flyover', 'Pedestrian Skywalk'
        asset_id TEXT NOT NULL,
        height_m REAL NOT NULL,
        min_z REAL NOT NULL,
        max_z REAL NOT NULL,
        length_m REAL,
        geometry TEXT NOT NULL,   -- JSON LineString or Polygon
        crs TEXT DEFAULT 'EPSG:4326',
        source TEXT DEFAULT 'Metro Rail Infrastructure Agency',
        status TEXT DEFAULT 'active',
        conflict_status TEXT DEFAULT 'none',
        metadata TEXT,
        created_at TEXT
    );

    -- 14. Infrastructure (Legacy/Combined Entity)
    CREATE TABLE IF NOT EXISTS infrastructure (
        id TEXT PRIMARY KEY,
        parcel_id TEXT,
        infra_type TEXT NOT NULL,
        asset_id TEXT NOT NULL,
        height_m REAL,
        length_m REAL,
        geometry TEXT NOT NULL,
        crs TEXT DEFAULT 'EPSG:4326',
        source TEXT DEFAULT 'Infrastructure GIS',
        status TEXT DEFAULT 'active',
        conflict_status TEXT DEFAULT 'none',
        metadata TEXT,
        created_at TEXT
    );

    -- 15. Airspace Constraints & Spatial Air-Rights
    CREATE TABLE IF NOT EXISTS airspace_constraints (
        id TEXT PRIMARY KEY,
        parcel_id TEXT,
        property_id TEXT,
        constraint_type TEXT NOT NULL, -- 'Aviation Obstacle Surface', 'Building Height Restriction', 'Property Air-Right Volume'
        authority TEXT,
        min_z REAL NOT NULL,
        max_z REAL NOT NULL,
        geometry TEXT NOT NULL,         -- JSON Polygon
        crs TEXT DEFAULT 'EPSG:4326',
        source TEXT DEFAULT 'Airports Authority of India (AAI)',
        status TEXT DEFAULT 'active',
        created_at TEXT
    );

    -- 16. Drone Datasets
    CREATE TABLE IF NOT EXISTS drone_datasets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        filename TEXT,
        file_path TEXT,
        acquisition_date TEXT,
        resolution_cm REAL,
        ground_sampling_distance_cm REAL,
        camera_info TEXT,
        crs TEXT DEFAULT 'EPSG:4326',
        bbox TEXT,                     -- JSON array [w,s,e,n]
        features_extracted INTEGER DEFAULT 0,
        source_name TEXT DEFAULT 'Drone Survey Flight',
        license TEXT DEFAULT 'Project Open License',
        status TEXT DEFAULT 'Imported', -- 'Uploaded', 'Processing', 'Processed', 'Failed'
        processing_log TEXT,
        created_at TEXT
    );

    -- 17. LiDAR Datasets
    CREATE TABLE IF NOT EXISTS lidar_datasets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        filename TEXT,
        file_path TEXT,
        point_count INTEGER DEFAULT 0,
        ground_points_count INTEGER DEFAULT 0,
        non_ground_points_count INTEGER DEFAULT 0,
        point_density_sqm REAL,
        min_z REAL,
        max_z REAL,
        mean_z REAL,
        format TEXT DEFAULT 'LAS',
        crs TEXT DEFAULT 'EPSG:4326',
        bbox TEXT,                     -- JSON array [w,s,e,n]
        building_heights_extracted INTEGER DEFAULT 0,
        source_name TEXT DEFAULT 'LiDAR Airborne Survey',
        license TEXT DEFAULT 'Project Open License',
        status TEXT DEFAULT 'Imported', -- 'Uploaded', 'Classified', 'Processed', 'Failed'
        processing_log TEXT,
        created_at TEXT
    );

    -- 18. DEM Datasets (Ground Elevation)
    CREATE TABLE IF NOT EXISTS dem_datasets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        filename TEXT,
        file_path TEXT,
        source TEXT DEFAULT 'Cartosat-1 DEM',
        resolution_m REAL DEFAULT 2.5,
        vertical_units TEXT DEFAULT 'Meters',
        crs TEXT DEFAULT 'EPSG:4326',
        bbox TEXT,
        min_elevation REAL,
        max_elevation REAL,
        coverage TEXT DEFAULT 'Tamil Nadu Region',
        datum TEXT DEFAULT 'EGM96',
        status TEXT DEFAULT 'Imported',
        created_at TEXT
    );

    -- 19. DSM Datasets (Surface Elevation)
    CREATE TABLE IF NOT EXISTS dsm_datasets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        filename TEXT,
        file_path TEXT,
        source TEXT DEFAULT 'Airborne DSM',
        resolution_m REAL DEFAULT 1.0,
        vertical_units TEXT DEFAULT 'Meters',
        crs TEXT DEFAULT 'EPSG:4326',
        bbox TEXT,
        min_elevation REAL,
        max_elevation REAL,
        coverage TEXT DEFAULT 'Urban Sector',
        status TEXT DEFAULT 'Imported',
        created_at TEXT
    );

    -- 20. Floor Plans
    CREATE TABLE IF NOT EXISTS floor_plans (
        id TEXT PRIMARY KEY,
        building_id TEXT,
        floor_number INTEGER,
        filename TEXT,
        file_path TEXT,
        format TEXT,                   -- 'PDF', 'PNG', 'GeoJSON', 'DXF'
        vector_geometry TEXT,          -- JSON room/unit geometry
        source TEXT DEFAULT 'Archived Building Plan',
        status TEXT DEFAULT 'Processed',
        created_at TEXT,
        FOREIGN KEY (building_id) REFERENCES buildings(id)
    );

    -- 21. GNSS / CORS Points
    CREATE TABLE IF NOT EXISTS gnss_points (
        id TEXT PRIMARY KEY,
        station_id TEXT,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        height_m REAL NOT NULL,
        accuracy_m REAL DEFAULT 0.02,
        crs TEXT DEFAULT 'EPSG:4326',
        source TEXT DEFAULT 'CORS Network Survey',
        parcel_id TEXT,
        building_id TEXT,
        timestamp TEXT,
        status TEXT DEFAULT 'active'
    );

    -- 22. Evidence Records & Fusion
    CREATE TABLE IF NOT EXISTS evidence (
        id TEXT PRIMARY KEY,
        property_id TEXT,
        building_id TEXT,
        parcel_id TEXT,
        evidence_type TEXT NOT NULL,   -- 'Footprint Match', 'LiDAR Elevation', 'Drone Orthophoto', 'GNSS Coordinate', 'DEM Elevation'
        source_name TEXT NOT NULL,     -- 'Microsoft', 'OSM', 'LiDAR', 'Drone', 'GNSS', 'DEM', 'Floor Plan'
        match_status TEXT NOT NULL,    -- 'MATCH', 'PARTIAL', 'CONFLICT', 'MISSING', 'NOT APPLICABLE'
        difference_m REAL DEFAULT 0.0,
        confidence REAL DEFAULT 90.0,
        details TEXT,                  -- JSON details
        timestamp TEXT,
        created_at TEXT
    );

    -- 23. Graph Relationships
    CREATE TABLE IF NOT EXISTS relationships (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,    -- 'Parcel', 'Building', 'Floor', 'Unit', 'Property', 'ULPIN', 'Right'
        entity_id TEXT NOT NULL,
        related_type TEXT NOT NULL,   -- 'Building', 'Floor', 'Unit', 'Property', 'ULPIN', 'Right', 'Utility', 'Evidence', 'Conflict'
        related_id TEXT NOT NULL,
        relationship_type TEXT NOT NULL, -- 'CONTAINS', 'PART_OF', 'ASSIGNED_TO', 'INTERSECTS', 'BORDERED_BY', 'EVIDENCE_FOR'
        metadata TEXT,
        created_at TEXT
    );

    -- 24. Topology Validation Results & Conflicts
    CREATE TABLE IF NOT EXISTS validation_results (
        id TEXT PRIMARY KEY,
        property_id TEXT,
        parcel_id TEXT,
        building_id TEXT,
        utility_id TEXT,
        validation_type TEXT NOT NULL, -- 'Self-Intersection', 'Parcel Overlap', 'Parcel Gap', 'Building Outside Parcel', 'Floor Outside Building', 'Unit Outside Floor', '3D Volume Overlap', 'Invalid Z', 'Utility Intersection', 'Airspace Conflict'
        severity TEXT NOT NULL,         -- 'valid', 'warning', 'conflict', 'unresolved', 'resolved'
        message TEXT NOT NULL,
        details TEXT,                  -- JSON with conflicting geometries and metric measures
        suggested_action TEXT,
        resolved INTEGER DEFAULT 0,
        resolution_reason TEXT,
        created_at TEXT
    );

    -- 25. Conflict Records
    CREATE TABLE IF NOT EXISTS conflict_records (
        id TEXT PRIMARY KEY,
        conflict_type TEXT NOT NULL,
        primary_entity_type TEXT NOT NULL,
        primary_entity_id TEXT NOT NULL,
        secondary_entity_type TEXT NOT NULL,
        secondary_entity_id TEXT NOT NULL,
        severity TEXT DEFAULT 'conflict',
        geometry_intersection TEXT,    -- JSON geometry of conflict zone
        description TEXT,
        status TEXT DEFAULT 'UNRESOLVED', -- 'UNRESOLVED', 'RESOLVED', 'IGNORED'
        created_at TEXT
    );

    -- 26. 4D History & Property Versions
    CREATE TABLE IF NOT EXISTS property_versions (
        id TEXT PRIMARY KEY,
        property_id TEXT NOT NULL,
        version_number INTEGER NOT NULL,
        changed_by TEXT,
        change_type TEXT NOT NULL,     -- 'property_created', 'building_changed', 'floor_added', 'unit_changed', 'boundary_changed', 'height_changed', 'rights_changed', 'ulpin_generated', 'conflict_resolved'
        old_data TEXT,                 -- JSON snapshot
        new_data TEXT,                 -- JSON snapshot
        geometry_2d TEXT,              -- JSON geometry snapshot
        min_z REAL,
        max_z REAL,
        area_sqm REAL,
        volume_cbm REAL,
        change_note TEXT,
        changed_at TEXT,
        FOREIGN KEY (property_id) REFERENCES properties(id)
    );

    -- 27. Change Events (Audit Trail)
    CREATE TABLE IF NOT EXISTS change_events (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        action TEXT NOT NULL,
        performed_by TEXT DEFAULT 'system',
        details TEXT,
        timestamp TEXT
    );

    -- 28. AI/ML Jobs Log
    CREATE TABLE IF NOT EXISTS ai_ml_jobs (
        id TEXT PRIMARY KEY,
        job_type TEXT NOT NULL,       -- 'building_extraction', 'floor_segmentation', 'vertical_delineation', 'evidence_fusion'
        model_name TEXT,
        model_version TEXT,
        status TEXT DEFAULT 'completed',
        input_parameters TEXT,
        result_summary TEXT,
        created_at TEXT
    );

    -- 29. Data Import Jobs
    CREATE TABLE IF NOT EXISTS data_import_jobs (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        file_format TEXT NOT NULL,
        layer_type TEXT NOT NULL,
        records_count INTEGER DEFAULT 0,
        crs TEXT DEFAULT 'EPSG:4326',
        status TEXT DEFAULT 'completed',
        logs TEXT,
        created_at TEXT
    );

    -- 30. Processing Jobs
    CREATE TABLE IF NOT EXISTS processing_jobs (
        id TEXT PRIMARY KEY,
        task_name TEXT NOT NULL,
        status TEXT DEFAULT 'completed',
        progress_pct REAL DEFAULT 100.0,
        logs TEXT,
        created_at TEXT
    );
    """)

    _migrate_columns(conn)
    conn.commit()
    conn.close()


if __name__ == "__main__":
    init_db()
    print("[OK] Upgraded 3D Cadastral database schema successfully.")
