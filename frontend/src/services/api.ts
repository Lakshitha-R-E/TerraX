import axios from 'axios';
import type {
  Parcel, Building, Floor, Property, ULPIN, Utility, Infrastructure,
  ValidationResult, PropertyVersion, DataSource, RelationshipGraph,
  Stats, WhatIfResult, ULPINGenerateRequest, Activity, DEMModel
} from '../types';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

api.interceptors.response.use(
  response => response,
  error => {
    const message = error?.response?.data?.detail || error.message || 'API request failed';
    console.error(`[API Error] ${error?.config?.method?.toUpperCase()} ${error?.config?.url}:`, message);
    return Promise.reject(error);
  }
);

function normalizeArray<T>(data: any, key?: string): T[] {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  if (key && Array.isArray(data[key])) return data[key];
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.items)) return data.items;
  return [];
}

// ─── Stats & Activity ─────────────────────────────────────────────────────────
export const fetchStats = (): Promise<Stats> =>
  api.get('/stats').then(r => r.data);

export const fetchActivity = (): Promise<{ activities: Activity[] }> =>
  api.get('/activity').then(r => {
    const d = r.data;
    if (Array.isArray(d)) return { activities: d };
    return { activities: normalizeArray<Activity>(d?.activities) };
  });

// ─── Parcels ──────────────────────────────────────────────────────────────────
export const fetchParcels = (district?: string): Promise<Parcel[]> =>
  api.get('/parcels', { params: district ? { district } : {} }).then(r => normalizeArray<Parcel>(r.data, 'parcels'));

export const fetchParcel = (id: string): Promise<any> =>
  api.get(`/parcels/${id}`).then(r => r.data);

export const createParcel = (data: any): Promise<any> =>
  api.post('/parcels', data).then(r => r.data);

// ─── Buildings ────────────────────────────────────────────────────────────────
export const fetchBuildings = (parcelId?: string): Promise<Building[]> =>
  api.get('/buildings', { params: parcelId ? { parcel_id: parcelId } : {} }).then(r => normalizeArray<Building>(r.data, 'buildings'));

export const fetchBuilding = (id: string): Promise<any> =>
  api.get(`/buildings/${id}`).then(r => r.data);

export const createBuilding = (data: any): Promise<any> =>
  api.post('/buildings', data).then(r => r.data);

export const fetchMicrosoftBuildings = (): Promise<import('../types').MicrosoftBuildingsResponse> =>
  api.get('/buildings/microsoft').then(r => {
    const d = r.data || {};
    return { ...d, features: normalizeArray(d.features) };
  });

export const fetchSpatialMicrosoftBuildings = (
  minLon: number, minLat: number, maxLon: number, maxLat: number, districtId?: string, limit = 600
): Promise<import('../types').MicrosoftBuildingsResponse> =>
  api.get('/buildings/microsoft/spatial', {
    params: { min_lon: minLon, min_lat: minLat, max_lon: maxLon, max_lat: maxLat, district_id: districtId, limit }
  }).then(r => {
    const d = r.data || {};
    return { ...d, features: normalizeArray(d.features) };
  });

export const fetchTamilNaduDistricts = (): Promise<{
  districts: Array<{ id: string; name: string; centroid: [number, number]; bbox: [number, number, number, number]; description: string }>;
}> => api.get('/buildings/microsoft/districts').then(r => {
  const d = r.data;
  return { districts: Array.isArray(d) ? d : normalizeArray<any>(d?.districts) };
});

export const fetchMicrosoftBuildingStats = (): Promise<import('../types').DataQualityStats> =>
  api.get('/buildings/microsoft/stats').then(r => r.data);

export const fetchMicrosoftCoverage = (): Promise<any> =>
  api.get('/buildings/microsoft/coverage').then(r => r.data);

// ── TNGIS Government GIS ────────────────────────────────────────────────────
export const fetchTNGISCollections = (): Promise<any> =>
  api.get('/tngis/collections').then(r => r.data);

export const fetchTNGISItems = (collectionId?: string): Promise<any> =>
  api.get('/tngis/items', { params: collectionId ? { collection_id: collectionId } : {} }).then(r => r.data);

export const fetchTNGISStatus = (): Promise<any> =>
  api.get('/tngis/status').then(r => r.data);

// ── Bhuvan / NRSC ────────────────────────────────────────────────────────────
export const fetchBhuvanStatus = (): Promise<any> =>
  api.get('/bhuvan/status').then(r => r.data);

export const fetchBhuvanLayers = (): Promise<any> =>
  api.get('/bhuvan/layers').then(r => r.data);

export const fetchBhuvanDEMStatus = (): Promise<any> =>
  api.get('/bhuvan/dem/status').then(r => r.data);

export const fetchCORSStatus = (): Promise<any> =>
  api.get('/cors/status').then(r => r.data);

export const fetchOwnershipStatus = (): Promise<any> =>
  api.get('/ownership/status').then(r => r.data);

// ─── Floors ───────────────────────────────────────────────────────────────────
export const fetchFloors = (buildingId?: string): Promise<Floor[]> =>
  api.get('/floors', { params: buildingId ? { building_id: buildingId } : {} }).then(r => normalizeArray<Floor>(r.data, 'floors'));

export const createFloor = (data: any): Promise<any> =>
  api.post('/floors', data).then(r => r.data);

// ─── Properties ───────────────────────────────────────────────────────────────
export const fetchProperties = (params?: {
  parcel_id?: string;
  building_id?: string;
  floor_id?: string;
  property_type?: string;
}): Promise<Property[]> =>
  api.get('/properties', { params }).then(r => normalizeArray<Property>(r.data, 'properties'));

export const fetchProperty = (id: string): Promise<any> =>
  api.get(`/properties/${id}`).then(r => r.data);

export const createProperty = (data: Partial<Property>): Promise<Property> =>
  api.post('/properties', data).then(r => r.data);

// ─── ULPINs ───────────────────────────────────────────────────────────────────
export const fetchULPINs = (): Promise<ULPIN[]> =>
  api.get('/ulpins').then(r => normalizeArray<ULPIN>(r.data, 'ulpins'));

export const fetchULPIN = (code: string): Promise<ULPIN> =>
  api.get(`/ulpins/${code}`).then(r => r.data);

export const generateULPIN = (req: ULPINGenerateRequest): Promise<ULPIN & { ulpin_code: string }> =>
  api.post('/ulpins/generate', req).then(r => r.data);

// ─── Rights ───────────────────────────────────────────────────────────────────
export const fetchRights = (propertyId?: string, parcelId?: string): Promise<any[]> =>
  api.get('/rights', { params: { property_id: propertyId, parcel_id: parcelId } }).then(r => normalizeArray<any>(r.data, 'rights'));

export const createRights = (data: any): Promise<any> =>
  api.post('/rights', data).then(r => r.data);

// ─── Utilities ────────────────────────────────────────────────────────────────
export const fetchUtilities = (parcelId?: string, utilityType?: string): Promise<Utility[]> =>
  api.get('/utilities', { params: { parcel_id: parcelId, utility_type: utilityType } }).then(r => normalizeArray<Utility>(r.data, 'utilities'));

export const fetchUtilityAffectedProperties = (utilityId: string): Promise<any> =>
  api.get(`/utilities/${utilityId}/affected-properties`).then(r => r.data);

export const fetchParcelUtilities = (parcelId: string): Promise<any> =>
  api.get(`/utilities/parcel/${parcelId}`).then(r => r.data);

// ─── Infrastructure ───────────────────────────────────────────────────────────
export const fetchInfrastructure = (): Promise<Infrastructure[]> =>
  api.get('/infrastructure').then(r => normalizeArray<Infrastructure>(r.data, 'infrastructure'));

export const fetchUndergroundInfrastructure = (): Promise<Utility[]> =>
  api.get('/infrastructure/underground').then(r => {
    const list = normalizeArray<Utility>(r.data, 'underground_infrastructure');
    return list.length > 0 ? list : normalizeArray<Utility>(r.data, 'utilities');
  });

export const fetchAirspaceRights = (): Promise<{
  airspace_volumes: Property[];
  aeronautical_constraints: Infrastructure[];
}> => api.get('/infrastructure/airspace').then(r => {
  const d = r.data || {};
  return {
    airspace_volumes: normalizeArray<Property>(d.airspace_volumes),
    aeronautical_constraints: normalizeArray<Infrastructure>(d.aeronautical_constraints)
  };
});

export const fetchElevatedInfrastructure = (): Promise<Infrastructure[]> =>
  api.get('/infrastructure/elevated').then(r => {
    const list = normalizeArray<Infrastructure>(r.data, 'elevated_infrastructure');
    return list.length > 0 ? list : normalizeArray<Infrastructure>(r.data, 'infrastructure');
  });

export const fetchUndergroundParking = (): Promise<{
  parking_utilities: Utility[];
  parking_properties: Property[];
}> => api.get('/infrastructure/parking').then(r => {
  const d = r.data || {};
  return {
    parking_utilities: normalizeArray<Utility>(d.parking_utilities),
    parking_properties: normalizeArray<Property>(d.parking_properties)
  };
});

// ─── GNSS ─────────────────────────────────────────────────────────────────────
export const fetchGNSSPoints = (stationId?: string): Promise<any[]> =>
  api.get('/gnss', { params: stationId ? { station_id: stationId } : {} }).then(r => normalizeArray<any>(r.data, 'points'));

export const uploadGNSSPoints = (formData: FormData): Promise<any> =>
  api.post('/gnss/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);

// ─── Drone & LiDAR & DEM/DSM ──────────────────────────────────────────────────
export const fetchDroneDatasets = (): Promise<any[]> =>
  api.get('/drone').then(r => normalizeArray<any>(r.data, 'datasets'));

export const uploadDroneDataset = (formData: FormData): Promise<any> =>
  api.post('/drone/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);

export const fetchLiDARDatasets = (): Promise<any[]> =>
  api.get('/lidar').then(r => normalizeArray<any>(r.data, 'datasets'));

export const uploadLiDARDataset = (formData: FormData): Promise<any> =>
  api.post('/lidar/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);

export const fetchDEMDatasets = (): Promise<any[]> =>
  api.get('/dem').then(r => normalizeArray<any>(r.data, 'datasets'));

export const fetchDEMModel = (): Promise<DEMModel> =>
  api.get('/dem/model').then(r => r.data);

export const uploadDEMDataset = (formData: FormData): Promise<any> =>
  api.post('/dem/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);

export const fetchDSMDatasets = (): Promise<any[]> =>
  api.get('/dsm').then(r => normalizeArray<any>(r.data, 'datasets'));

export const uploadDSMDataset = (formData: FormData): Promise<any> =>
  api.post('/dsm/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);

// ─── Floor Plans ──────────────────────────────────────────────────────────────
export const fetchFloorPlans = (buildingId?: string): Promise<any[]> =>
  api.get('/floor-plans', { params: buildingId ? { building_id: buildingId } : {} }).then(r => normalizeArray<any>(r.data, 'floor_plans'));

export const uploadFloorPlan = (formData: FormData): Promise<any> =>
  api.post('/floor-plans/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);

// ─── Validation ───────────────────────────────────────────────────────────────
export const fetchValidationResults = (severity?: string, resolved?: number): Promise<ValidationResult[]> =>
  api.get('/validation/results', { params: { severity, resolved } }).then(r => normalizeArray<ValidationResult>(r.data, 'results'));

export const runValidation = (): Promise<{ status: string; new_issues_detected: number; issues?: any[] }> =>
  api.post('/validation/run').then(r => r.data);

export const resolveValidation = (id: string, reason?: string): Promise<{
  status: string;
  resolved: number;
  reason: string;
  recalculated?: {
    property_id: string;
    unit_number: string;
    old_min_z: number;
    old_max_z: number;
    new_min_z: number;
    new_max_z: number;
  } | null;
}> =>
  api.patch(`/validation/results/${id}/resolve`, { resolution_reason: reason || "Resolved by surveyor" }).then(r => r.data);

// ─── History ──────────────────────────────────────────────────────────────────
export const fetchHistoryTimeline = (propertyId: string): Promise<{ property_id: string; total_versions: number; timeline: PropertyVersion[] }> =>
  api.get(`/history/timeline/${propertyId}`).then(r => {
    const d = r.data || {};
    const timeline = Array.isArray(d) ? d : normalizeArray<PropertyVersion>(d.timeline, 'versions');
    return {
      property_id: d.property_id || propertyId,
      total_versions: typeof d.total_versions === 'number' ? d.total_versions : timeline.length,
      timeline
    };
  });

export const comparePropertyVersions = (propertyId: string, vA: number, vB: number): Promise<any> =>
  api.get('/history/compare', { params: { property_id: propertyId, version_a: vA, version_b: vB } }).then(r => r.data);

// ─── Data Sources ─────────────────────────────────────────────────────────────
export const fetchDataSources = (): Promise<DataSource[]> =>
  api.get('/data-sources').then(r => {
    const list = normalizeArray<DataSource>(r.data, 'data_sources');
    return list.length > 0 ? list : normalizeArray<DataSource>(r.data, 'sources');
  });

export const refreshDataSources = (): Promise<{ message: string }> =>
  api.post('/data-sources/refresh').then(r => r.data);

export const fetchRoadsLayer = (): Promise<any> =>
  api.get('/data-sources/roads').then(r => r.data);

export const fetchWaterbodiesLayer = (): Promise<any> =>
  api.get('/data-sources/waterbodies').then(r => r.data);

// ─── Relationships & DNA ──────────────────────────────────────────────────────
export const fetchRelationshipsGraph = (propertyId?: string): Promise<RelationshipGraph> =>
  api.get('/relationships/graph', { params: propertyId ? { property_id: propertyId } : {} }).then(r => {
    const d = r.data || {};
    const nodes = normalizeArray<any>(d.nodes);
    const edges = normalizeArray<any>(d.edges);
    return {
      nodes,
      edges,
      total_nodes: typeof d.total_nodes === 'number' ? d.total_nodes : nodes.length,
      total_edges: typeof d.total_edges === 'number' ? d.total_edges : edges.length
    };
  });

export const fetchPropertyDNA = (propertyId: string): Promise<any> =>
  api.get(`/relationships/dna/${propertyId}`).then(r => r.data);

// ─── Evidence Fusion ──────────────────────────────────────────────────────────
export const fetchEvidenceRecords = (propertyId?: string): Promise<any[]> =>
  api.get('/evidence', { params: propertyId ? { property_id: propertyId } : {} }).then(r => normalizeArray<any>(r.data, 'evidence'));

export const fuseEvidence = (propertyId: string): Promise<any> =>
  api.post('/evidence/fuse', null, { params: { property_id: propertyId } }).then(r => r.data);

// ─── What-If ──────────────────────────────────────────────────────────────────
export const simulateAddFloor = (data: { building_id: string; added_floors_count?: number; floor_height_m?: number }): Promise<any> =>
  api.post('/what-if/simulate/add-floor', data).then(r => r.data);

export const simulateUndergroundParking = (data: { parcel_id: string; depth_min_z?: number; depth_max_z?: number; footprint_coordinates: number[][] }): Promise<any> =>
  api.post('/what-if/simulate/underground-parking', data).then(r => r.data);

export const simulateNewUtility = (data: { utility_type?: string; depth_m?: number; line_coordinates: number[][] }): Promise<any> =>
  api.post('/what-if/simulate/new-utility', data).then(r => r.data);

// ─── Data Import ──────────────────────────────────────────────────────────────
export const importSpatialData = (formData: FormData): Promise<{
  status: string;
  job_id: string;
  filename: string;
  format: string;
  layer_type: string;
  features_imported: number;
  geometry_types: string[];
  bounding_box: Record<string, number> | null;
  logs: string[];
  message: string;
}> =>
  api.post('/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data);

// ─── AI / ML Modules ──────────────────────────────────────────────────────────
export const runBuildingExtraction = (params: {
  image_reference?: string;
  threshold?: number;
  roi_lat?: number;
  roi_lng?: number;
}): Promise<any> =>
  api.post('/ai-ml/building-extraction', params).then(r => r.data);

export const runFloorSegmentation = (params: {
  building_id?: string;
  building_height_m: number;
  floor_height_m: number;
  ground_elevation_m?: number;
  evidence_type?: string;
}): Promise<any> =>
  api.post('/ai-ml/floor-segmentation', params).then(r => r.data);

export const runVerticalDelineation = (params: {
  footprint_coordinates: number[][];
  min_z: number;
  max_z: number;
}): Promise<any> =>
  api.post('/ai-ml/vertical-delineation', params).then(r => r.data);

// ─── Backward Compatibility Aliases ──────────────────────────────────────────
export const fetchHistory = (propertyId: string): Promise<PropertyVersion[]> =>
  fetchHistoryTimeline(propertyId).then(response => Array.isArray(response.timeline) ? response.timeline : []);
export const fetchRelationships = fetchRelationshipsGraph;
export const simulateWhatIf = (params: { building_id: string; property_id?: string; added_floors_count?: number; floor_height_m?: number }): Promise<WhatIfResult> =>
  simulateAddFloor(params);

