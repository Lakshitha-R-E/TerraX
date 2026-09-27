/**
 * geo/index.ts — Geospatial utility functions for the 3D ULPIN System frontend.
 *
 * CRS Note:
 *   All datasets in this project use EPSG:4326 (WGS84 geographic).
 *   GeoJSON coordinates are in [longitude, latitude] order per RFC 7946.
 *   Cesium.Cartesian3.fromDegrees(longitude, latitude, height) expects the
 *   same [longitude, latitude] order — no swapping or reprojection is needed.
 *
 * ⚠ Do NOT add arbitrary coordinate offsets or manual "fixes" to coordinates.
 *   If coordinates are wrong, the source dataset or CRS detection must be fixed.
 */
import * as Cesium from 'cesium';

// ─── Study Area Bounding Box ──────────────────────────────────────────────────
// Derived from buildings.microsoft.adyar.geojson metadata bbox.
// Adyar / Chennai demo sector, EPSG:4326.
export const STUDY_BBOX = {
  minLon: 80.2525,
  minLat: 13.0025,
  maxLon: 80.2635,
  maxLat: 13.0145,
} as const;

export const TAMIL_NADU_BBOX = {
  minLon: 76.20,
  minLat: 8.08,
  maxLon: 80.35,
  maxLat: 13.50,
} as const;

export type BBox = { minLon: number; minLat: number; maxLon: number; maxLat: number };

// ─── Prototype Height Assumption ──────────────────────────────────────────────
// The Microsoft Adyar dataset has height = -1.0 for all features
// (height data not provided in this dataset version).
// We apply a prototype assumption for visual rendering only.
export const MS_PROTOTYPE_HEIGHT_M = 10.0;  // ~3 residential floors
export const MS_PROTOTYPE_GROUND_ELEVATION_M = 6.0; // Adyar mean ~6m amsl
export const HEIGHT_SOURCE_LABEL = 'prototype_assumption';

// ─── Coordinate Validation ────────────────────────────────────────────────────

export function isValidLon(lon: unknown): lon is number {
  return typeof lon === 'number' && isFinite(lon) && lon >= -180 && lon <= 180;
}

export function isValidLat(lat: unknown): lat is number {
  return typeof lat === 'number' && isFinite(lat) && lat >= -90 && lat <= 90;
}

export function isWithinBBox(lon: number, lat: number, bbox: BBox = STUDY_BBOX): boolean {
  return lon >= bbox.minLon && lon <= bbox.maxLon &&
         lat >= bbox.minLat && lat <= bbox.maxLat;
}

// ─── GeoJSON Feature Validation ───────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

function validateRing(ring: unknown[]): ValidationResult {
  if (!Array.isArray(ring) || ring.length < 4) {
    return { valid: false, reason: `Ring has fewer than 4 coordinate pairs (got ${Array.isArray(ring) ? ring.length : 'not an array'})` };
  }
  for (let i = 0; i < ring.length; i++) {
    const coord = ring[i];
    if (!Array.isArray(coord) || coord.length < 2) {
      return { valid: false, reason: `Coordinate at index ${i} is malformed` };
    }
    const [lon, lat] = coord as number[];
    if (!isValidLon(lon)) {
      return { valid: false, reason: `Invalid longitude at index ${i}: ${lon}` };
    }
    if (!isValidLat(lat)) {
      return { valid: false, reason: `Invalid latitude at index ${i}: ${lat}` };
    }
  }
  return { valid: true };
}

export function validateGeoJSONFeature(feature: { geometry?: { type: string; coordinates: any } }): ValidationResult {
  if (!feature?.geometry) {
    return { valid: false, reason: 'Missing geometry' };
  }
  const { type, coordinates } = feature.geometry;
  if (type === 'Polygon') {
    const rings = coordinates as unknown[][];
    if (!rings || rings.length === 0) return { valid: false, reason: 'Empty polygon coordinates' };
    return validateRing(rings[0]);
  } else if (type === 'MultiPolygon') {
    const polys = coordinates as unknown[][][];
    if (!polys || polys.length === 0) return { valid: false, reason: 'Empty MultiPolygon' };
    let anyValid = false;
    for (const poly of polys) {
      if (poly && poly[0] && validateRing(poly[0]).valid) {
        anyValid = true;
        break;
      }
    }
    if (!anyValid) return { valid: false, reason: 'All sub-polygons are degenerate' };
    return { valid: true };
  }
  return { valid: false, reason: `Unsupported geometry type: ${type}` };
}

// ─── Centroid Computation ─────────────────────────────────────────────────────

export function computeRingCentroid(ring: number[][]): [number, number] {
  if (!ring.length) return [STUDY_BBOX.minLon, STUDY_BBOX.minLat];
  const lons = ring.map(c => c[0]).filter(isValidLon);
  const lats = ring.map(c => c[1]).filter(isValidLat);
  if (!lons.length) return [STUDY_BBOX.minLon, STUDY_BBOX.minLat];
  return [
    lons.reduce((a, b) => a + b, 0) / lons.length,
    lats.reduce((a, b) => a + b, 0) / lats.length,
  ];
}

// ─── Cesium Polygon Hierarchy Builders ───────────────────────────────────────

/**
 * Convert a GeoJSON Polygon exterior ring [longitude, latitude] pairs
 * into a Cesium PolygonHierarchy.
 *
 * Input format: [[lon, lat], [lon, lat], ...]  (EPSG:4326, no swap needed)
 */
export function polygonToCesium(
  ring: number[][],
  heightM = 0
): Cesium.PolygonHierarchy {
  const positions = ring.map(([lon, lat]) =>
    Cesium.Cartesian3.fromDegrees(lon, lat, heightM)
  );
  return new Cesium.PolygonHierarchy(positions);
}

/**
 * Convert a GeoJSON MultiPolygon into an array of Cesium PolygonHierarchies.
 * Each sub-polygon becomes its own hierarchy (rendered as separate entities).
 */
export function multipolygonToCesium(
  polygons: number[][][],
  heightM = 0
): Cesium.PolygonHierarchy[] {
  return polygons
    .map(poly => poly[0])  // exterior ring of each polygon
    .filter(ring => Array.isArray(ring) && ring.length >= 4)
    .map(ring => polygonToCesium(ring as unknown as number[][], heightM));
}

/**
 * Build Cesium polygon hierarchy from a GeoJSON feature.
 * Handles both Polygon and MultiPolygon.
 * Returns an array (MultiPolygon may yield multiple hierarchies).
 */
export function featureToHierarchies(
  feature: { geometry?: { type: string; coordinates: any } },
  heightM = 0
): Cesium.PolygonHierarchy[] {
  const geom = feature.geometry;
  if (!geom) return [];

  if (geom.type === 'Polygon') {
    const rings = geom.coordinates as number[][][];
    if (!rings?.[0] || rings[0].length < 4) return [];
    return [polygonToCesium(rings[0], heightM)];
  }

  if (geom.type === 'MultiPolygon') {
    const polys = geom.coordinates as number[][][][];
    return multipolygonToCesium(polys as unknown as number[][][], heightM);
  }

  return [];
}

// ─── Bounding Box Utility ─────────────────────────────────────────────────────

export function computeStudyAreaBBox(features: { geometry?: { type: string; coordinates: any } }[]): BBox {
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
  let found = false;

  const scan = (ring: unknown[]) => {
    for (const coord of ring) {
      if (Array.isArray(coord) && coord.length >= 2) {
        const [lon, lat] = coord as number[];
        if (isValidLon(lon) && isValidLat(lat)) {
          minLon = Math.min(minLon, lon);
          minLat = Math.min(minLat, lat);
          maxLon = Math.max(maxLon, lon);
          maxLat = Math.max(maxLat, lat);
          found = true;
        }
      }
    }
  };

  for (const f of features) {
    const geom = f.geometry;
    if (!geom) continue;
    if (geom.type === 'Polygon') {
      const rings = geom.coordinates as unknown[][];
      if (rings?.[0]) scan(rings[0]);
    } else if (geom.type === 'MultiPolygon') {
      const polys = geom.coordinates as unknown[][][];
      polys.forEach(poly => { if (poly?.[0]) scan(poly[0]); });
    }
  }

  return found
    ? { minLon, minLat, maxLon, maxLat }
    : STUDY_BBOX;
}
