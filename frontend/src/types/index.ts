// ⚠ PROTOTYPE / DEMO — Type definitions for 3D ULPIN System

export interface Parcel {
  id: string;
  parcel_number: string;
  district: string;
  state: string;
  area_sqm: number;
  land_use: string;
  coordinates: number[][];
  centroid_lat: number;
  centroid_lng: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Building {
  id: string;
  parcel_id: string;
  building_number: string;
  name: string;
  total_floors: number;
  building_type: string;
  ground_elevation: number;
  floor_height: number;
  footprint: number[][];
  centroid_lat: number;
  centroid_lng: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Floor {
  id: string;
  building_id: string;
  floor_number: number;
  floor_label: string;
  elevation_min: number;
  elevation_max: number;
  floor_area: number;
  status: string;
}

export interface Property {
  id: string;
  parcel_id: string;
  building_id: string | null;
  floor_id: string | null;
  unit_number: string;
  property_type: PropertyType;
  owner_ref: string;
  area_sqm: number;
  volume_cbm: number;
  min_z: number;
  max_z: number;
  centroid_lat: number;
  centroid_lng: number;
  geometry_2d: number[][];
  geometry_3d: Geometry3D;
  confidence: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export type PropertyType =
  | 'Apartment Unit'
  | 'Commercial Unit'
  | 'Surface Parcel'
  | 'Underground Parking'
  | 'Underground Utility'
  | 'Elevated Structure'
  | 'Air-Space Volume';

export interface Geometry3D {
  type: string;
  min_z: number;
  max_z: number;
  floor_number?: number;
  unit?: number;
}

export interface ULPIN {
  id: string;
  property_id: string;
  ulpin_code: string;
  state_code: string;
  district_code: string;
  parcel_ref: string;
  building_ref: string;
  floor_ref: string;
  unit_ref: string;
  property_type: string;
  min_z: number;
  max_z: number;
  generated_at: string;
  generated_by: string;
}

export interface Utility {
  id: string;
  parcel_id: string;
  utility_type: string;
  asset_id: string;
  depth_m: number;
  length_m: number | null;
  geometry: GeoJSONGeometry;
  status: string;
  conflict_status: 'none' | 'warning' | 'conflict';
  metadata: Record<string, unknown>;
}

export interface Infrastructure {
  id: string;
  parcel_id: string;
  infra_type: string;
  asset_id: string;
  height_m: number;
  min_z?: number;
  max_z?: number;
  length_m: number;
  geometry: GeoJSONGeometry;
  status: string;
  conflict_status: 'none' | 'warning' | 'conflict';
  metadata: Record<string, unknown>;
  source?: string;
}

export interface DEMModel {
  source: string;
  satellite?: string;
  sensor?: string;
  spatial_resolution_m: number;
  vertical_accuracy_m?: number;
  datum?: string;
  region?: string;
  elevation_grid: Array<{
    lat: number;
    lng: number;
    elevation_m: number;
    feature: string;
  }>;
}

export interface GeoJSONGeometry {
  type: 'Point' | 'LineString' | 'Polygon' | 'MultiPolygon';
  coordinates: unknown;
}

export type ValidationSeverity = 'valid' | 'warning' | 'conflict';

export interface ValidationResult {
  id: string;
  property_id: string;
  validation_type: string;
  severity: ValidationSeverity;
  message: string;
  details: Record<string, unknown>;
  suggested_action: string | null;
  resolved: number;
  created_at: string;
}

export interface PropertyVersion {
  id: string;
  property_id: string;
  version_number: number;
  changed_by: string;
  change_type: string;
  old_data: Record<string, unknown>;
  new_data: Record<string, unknown>;
  change_note: string;
  changed_at: string;
}

export interface DataSource {
  source_id: string;
  source_name: string;
  source_type: string;
  geometry_type: string | null;
  source_url: string | null;
  region: string | null;
  data_status: 'REAL_OPEN' | 'REAL_GOVERNMENT' | 'PROJECT_DEMONSTRATION' | 'DERIVED' | 'NOT_AVAILABLE';
  badge: string;
  status: string;
  feature_count: number | null;
  license: string | null;
  notes: string | null;
}

export interface RelationshipGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'property' | 'building' | 'parcel' | 'floor' | 'ulpin' | 'utility' | 'infrastructure';
  data: Record<string, unknown>;
}

export interface GraphEdge {
  source: string;
  target: string;
  label: string;
}

export interface Stats {
  ms_footprints_index: number;
  osm_roads: number;
  osm_water: number;
  parcels: number;
  buildings: number;
  floors: number;
  properties: number;
  ulpins_generated: number;
  rights: number;
  gnss_points: number;
  utilities: number;
  infrastructure: number;
  airspace_constraints: number;
  underground_structures: number;
  floor_plans: number;
  evidence_records: number;
  validation_conflicts: number;
  history_snapshots: number;
  relationships: number;
  lidar_datasets: number;
  drone_datasets: number;
  dem_datasets: number;
  dsm_datasets: number;
  ps_coverage: Record<string, boolean>;
}

export interface WhatIfResult {
  scenario_id: string;
  property_id: string | null;
  status: string;
  building_id: string;
  building_name: string | null;
  current: {
    property_id: string | null;
    building_id: string;
    floors: number;
    height_m: number;
    min_z: number;
    max_z: number;
    area_sqm: number;
    volume_cbm: number;
    footprint: number[][];
  };
  proposed: {
    property_id: string | null;
    building_id: string;
    floors: number;
    height_m: number;
    min_z: number;
    max_z: number;
    area_sqm: number;
    volume_cbm: number;
    footprint: number[][];
  };
  summary: {
    conflict_count: number;
    warning_count: number;
    height_difference_m: number;
    volume_difference_cbm: number;
  };
  has_conflict: boolean;
  conflicts: Array<{ type: string; message: string; description: string; severity: string; affected_entity?: string }>;
  simulated_volume: Record<string, unknown>;
  message: string;
}

export interface ULPINGenerateRequest {
  state: string;
  district: string;
  parcel_id: string;
  building_id: string;
  floor: number;
  unit: number;
  property_type: string;
  min_z: number;
  max_z: number;
  centroid_lat?: number;
  centroid_lng?: number;
}

export interface Activity {
  type: string;
  message: string;
  time: string;
  icon: string;
}

export interface LayerVisibility {
  msBuildings: boolean;   // Real Microsoft ML building footprints
  roads: boolean;         // Real OpenStreetMap Roads
  waterbodies: boolean;   // Real OpenStreetMap Water Bodies
  bldVolumes: boolean;    // Derived 3D Building Volumes
  terrain: boolean;       // Elevation / Terrain Model
  parcels: boolean;       // Project Surface Parcels
  buildings: boolean;     // Prototype Cadastral Buildings (SQLite)
  floors: boolean;
  properties: boolean;    // Project 3D Property Units
  underground: boolean;   // Subsurface Underground Infrastructure
  parking: boolean;       // Subsurface Underground Parking
  elevated: boolean;      // Elevated Structures & Corridors
  airspace: boolean;      // Airspace Rights & Spatial Constraints
  dem: boolean;
}

// ─── Microsoft Building Footprints ────────────────────────────────────────────

/** Properties on a single Microsoft ML building footprint feature. */
export interface MicrosoftBuildingProperties {
  /** Building height in metres, or -1 if not provided by the dataset. */
  height: number;
  /** ML detection confidence, or -1 if not provided. */
  confidence: number;
  source_url?: string;
  /** Flag set by backend validation — true = passes all checks. */
  _valid?: boolean;
  /** Reason for rejection if _valid is false. */
  _reject_reason?: string | null;
}

/** A single GeoJSON Feature from the Microsoft building footprints dataset. */
export interface MicrosoftBuildingFeature {
  type: 'Feature';
  id?: string;
  properties: MicrosoftBuildingProperties;
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
}

/** Quality statistics returned with the Microsoft buildings endpoint. */
export interface DataQualityStats {
  source: string;
  license: string;
  region: string;
  crs: string;
  study_bbox: { min_lon: number; min_lat: number; max_lon: number; max_lat: number };
  computed_bbox: { min_lon: number; min_lat: number; max_lon: number; max_lat: number };
  total_features: number;
  valid_features: number;
  rejected_features: number;
  data_type: string;
  ownership_info: string;
  height_note: string;
}

/** Full response from GET /api/buildings/microsoft */
export interface MicrosoftBuildingsResponse {
  type: 'FeatureCollection';
  metadata: DataQualityStats & {
    source_url: string;
    quality: {
      total_features: number;
      valid_features: number;
      rejected_features: number;
      study_bbox: DataQualityStats['study_bbox'];
      computed_bbox: DataQualityStats['computed_bbox'];
    };
  };
  features: MicrosoftBuildingFeature[];
}

// ─── Authentication Types ───────────────────────────────────────────────────
export type UserRole = 'Admin' | 'Surveyor' | 'Authority Viewer';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department: string;
  badgeNumber?: string;
  avatar?: string;
  token?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  role: UserRole;
}

export interface AuthResponse {
  success: boolean;
  user?: AuthUser;
  token?: string;
  error?: string;
}

