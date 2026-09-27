import React, { useEffect, useRef, useState } from 'react';
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import TileLayer from 'ol/layer/Tile.js';
import VectorLayer from 'ol/layer/Vector.js';
import OSM from 'ol/source/OSM.js';
import VectorSource from 'ol/source/Vector.js';
import Feature from 'ol/Feature.js';
import Polygon from 'ol/geom/Polygon.js';
import LineString from 'ol/geom/LineString.js';
import Point from 'ol/geom/Point.js';
import { fromLonLat } from 'ol/proj.js';

import Style from 'ol/style/Style.js';
import Fill from 'ol/style/Fill.js';
import Stroke from 'ol/style/Stroke.js';
import CircleStyle from 'ol/style/Circle.js';
import Text from 'ol/style/Text.js';

import {
  fetchParcels,
  fetchBuildings,
  fetchProperties,
  fetchUtilities,
} from '../services/api';

import type {
  Parcel,
  Building,
  Property,
  Utility,
} from '../types';

import 'ol/ol.css';

const CHENNAI_CENTER = [80.2571, 13.0067];

function polygonFeature(
  coordinates: number[][],
  properties: Record<string, unknown>
) {
  const transformed = coordinates.map(([lng, lat]) =>
    fromLonLat([lng, lat])
  );

  return new Feature({
    geometry: new Polygon([transformed]),
    ...properties,
  });
}

export default function CadastralMap2D() {
  const mapElement = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);

  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [utilities, setUtilities] = useState<Utility[]>([]);

  const [showParcels, setShowParcels] = useState(true);
  const [showBuildings, setShowBuildings] = useState(true);
  const [showProperties, setShowProperties] = useState(true);
  const [showUtilities, setShowUtilities] = useState(false);

  const [search, setSearch] = useState('');

  const parcelSource = useRef(new VectorSource());
  const buildingSource = useRef(new VectorSource());
  const propertySource = useRef(new VectorSource());
  const utilitySource = useRef(new VectorSource());

  /*
   * Load backend data
   */
  useEffect(() => {
    const loadData = async () => {
      try {
        const [
          parcelData,
          buildingData,
          propertyData,
          utilityData,
        ] = await Promise.all([
          fetchParcels(),
          fetchBuildings(),
          fetchProperties(),
          fetchUtilities(),
        ]);

        setParcels(parcelData);
        setBuildings(buildingData);
        setProperties(propertyData);
        setUtilities(utilityData);
      } catch (error) {
        console.error('2D map data loading failed:', error);
      }
    };

    loadData();
  }, []);

  /*
   * Create map
   */
  useEffect(() => {
    if (!mapElement.current || mapRef.current) return;

    const baseLayer = new TileLayer({
      source: new OSM(),
    });

    const parcelLayer = new VectorLayer({
      source: parcelSource.current,
      visible: true,
      style: new Style({
        fill: new Fill({
          color: 'rgba(8, 145, 178, 0.12)',
        }),
        stroke: new Stroke({
          color: '#0891b2',
          width: 2,
        }),
      }),
    });

    const buildingLayer = new VectorLayer({
      source: buildingSource.current,
      visible: true,
      style: feature =>
        new Style({
          fill: new Fill({
            color: 'rgba(100, 116, 139, 0.35)',
          }),
          stroke: new Stroke({
            color: '#475569',
            width: 1.5,
          }),
          text: new Text({
            text: String(feature.get('name') || ''),
            font: '12px sans-serif',
            fill: new Fill({
              color: '#111827',
            }),
            stroke: new Stroke({
              color: '#ffffff',
              width: 3,
            }),
          }),
        }),
    });

    const propertyLayer = new VectorLayer({
      source: propertySource.current,
      visible: true,
      style: new Style({
        fill: new Fill({
          color: 'rgba(37, 99, 235, 0.30)',
        }),
        stroke: new Stroke({
          color: '#2563eb',
          width: 2,
        }),
      }),
    });

    const utilityLayer = new VectorLayer({
      source: utilitySource.current,
      visible: false,
      style: new Style({
        stroke: new Stroke({
          color: '#d97706',
          width: 3,
        }),
      }),
    });

    const map = new Map({
      target: mapElement.current,
      layers: [
        baseLayer,
        parcelLayer,
        buildingLayer,
        propertyLayer,
        utilityLayer,
      ],
      view: new View({
        center: fromLonLat(CHENNAI_CENTER),
        zoom: 16,
        minZoom: 5,
        maxZoom: 22,
      }),
    });

    /*
     * Property click
     */
    map.on('singleclick', event => {
      map.forEachFeatureAtPixel(event.pixel, feature => {
        const propertyId = feature.get('propertyId');

        if (propertyId) {
          const property = properties.find(
            p => p.id === propertyId
          );

          if (property) {
            alert(
              `Property: ${property.unit_number}\n` +
              `Type: ${property.property_type}\n` +
              `Area: ${property.area_sqm} m²\n` +
              `Volume: ${property.volume_cbm} m³\n` +
              `Elevation: ${property.min_z}m - ${property.max_z}m`
            );
          }
        }

        return true;
      });
    });

    mapRef.current = map;

    return () => {
      map.setTarget(undefined);
      mapRef.current = null;
    };
  }, [properties]);

  /*
   * Add parcel features
   */
  useEffect(() => {
    parcelSource.current.clear();

    parcels.forEach(parcel => {
      if (!parcel.coordinates || parcel.coordinates.length < 3) {
        return;
      }

      parcelSource.current.addFeature(
        polygonFeature(parcel.coordinates, {
          parcelId: parcel.id,
          parcelNumber: parcel.parcel_number,
        })
      );
    });
  }, [parcels]);

  /*
   * Add building features
   */
  useEffect(() => {
    buildingSource.current.clear();

    buildings.forEach(building => {
      if (!building.footprint || building.footprint.length < 3) {
        return;
      }

      buildingSource.current.addFeature(
        polygonFeature(building.footprint, {
          buildingId: building.id,
          name: building.name,
        })
      );
    });
  }, [buildings]);

  /*
   * Add property features
   */
  useEffect(() => {
    propertySource.current.clear();

    properties.forEach(property => {
      if (
        !property.geometry_2d ||
        property.geometry_2d.length < 3
      ) {
        return;
      }

      propertySource.current.addFeature(
        polygonFeature(property.geometry_2d, {
          propertyId: property.id,
          unitNumber: property.unit_number,
        })
      );
    });
  }, [properties]);

  /*
   * Add utility lines
   */
  useEffect(() => {
    utilitySource.current.clear();

    utilities.forEach(utility => {
      if (
        !utility.geometry ||
        utility.geometry.type !== 'LineString'
      ) {
        return;
      }

      const coordinates =
        utility.geometry.coordinates as number[][];

      const transformed = coordinates.map(([lng, lat]) =>
        fromLonLat([lng, lat])
      );

      utilitySource.current.addFeature(
        new Feature({
          geometry: new LineString(transformed),
          utilityId: utility.id,
          utilityType: utility.utility_type,
        })
      );
    });
  }, [utilities]);

  /*
   * Layer visibility
   */
  useEffect(() => {
    const layers = mapRef.current?.getLayers().getArray();

    if (!layers || layers.length < 5) return;

    layers[1].setVisible(showParcels);
    layers[2].setVisible(showBuildings);
    layers[3].setVisible(showProperties);
    layers[4].setVisible(showUtilities);
  }, [
    showParcels,
    showBuildings,
    showProperties,
    showUtilities,
  ]);

  /*
   * Search
   */
  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();

    const query = search.trim().toLowerCase();

    if (!query || !mapRef.current) return;

    const property = properties.find(
      p =>
        p.id.toLowerCase().includes(query) ||
        p.unit_number.toLowerCase().includes(query) ||
        p.parcel_id.toLowerCase().includes(query) ||
        (p.building_id || '').toLowerCase().includes(query)
    );

    if (property) {
      mapRef.current.getView().animate({
        center: fromLonLat([
          property.centroid_lng,
          property.centroid_lat,
        ]),
        zoom: 20,
        duration: 1000,
      });

      return;
    }

    const building = buildings.find(
      b =>
        b.id.toLowerCase().includes(query) ||
        b.name.toLowerCase().includes(query) ||
        b.building_number.toLowerCase().includes(query)
    );

    if (building) {
      mapRef.current.getView().animate({
        center: fromLonLat([
          building.centroid_lng,
          building.centroid_lat,
        ]),
        zoom: 20,
        duration: 1000,
      });

      return;
    }

    const parcel = parcels.find(
      p =>
        p.id.toLowerCase().includes(query) ||
        p.parcel_number.toLowerCase().includes(query)
    );

    if (parcel) {
      mapRef.current.getView().animate({
        center: fromLonLat([
          parcel.centroid_lng,
          parcel.centroid_lat,
        ]),
        zoom: 19,
        duration: 1000,
      });

      return;
    }

    alert('No matching property, building or parcel found.');
  };

  /*
   * Reset
   */
  const resetMap = () => {
    mapRef.current?.getView().animate({
      center: fromLonLat(CHENNAI_CENTER),
      zoom: 16,
      duration: 800,
    });
  };

  return (
    <div className="relative w-full h-full bg-slate-100">
      <div
        ref={mapElement}
        className="absolute inset-0"
      />

      {/* Search */}
      <form
        onSubmit={handleSearch}
        className="absolute top-3 left-3 z-20 flex items-center bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden"
      >
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search property / building / parcel..."
          className="w-80 px-4 py-2.5 text-sm outline-none"
        />

        <button
          type="submit"
          className="px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold"
        >
          Search
        </button>
      </form>

      {/* Layers */}
      <div className="absolute top-20 left-3 z-20 bg-white rounded-lg shadow-lg border border-slate-200 p-3 w-56">
        <p className="text-xs font-bold text-slate-700 mb-2">
          MAP LAYERS
        </p>

        <label className="flex gap-2 items-center text-xs mb-2">
          <input
            type="checkbox"
            checked={showParcels}
            onChange={e => setShowParcels(e.target.checked)}
          />
          Land Parcels
        </label>

        <label className="flex gap-2 items-center text-xs mb-2">
          <input
            type="checkbox"
            checked={showBuildings}
            onChange={e => setShowBuildings(e.target.checked)}
          />
          Buildings
        </label>

        <label className="flex gap-2 items-center text-xs mb-2">
          <input
            type="checkbox"
            checked={showProperties}
            onChange={e => setShowProperties(e.target.checked)}
          />
          Property Units
        </label>

        <label className="flex gap-2 items-center text-xs">
          <input
            type="checkbox"
            checked={showUtilities}
            onChange={e => setShowUtilities(e.target.checked)}
          />
          Underground Utilities
        </label>
      </div>

      {/* Reset */}
      <button
        type="button"
        onClick={resetMap}
        className="absolute bottom-5 right-5 z-20 bg-white px-4 py-2 rounded-lg shadow-lg border border-slate-200 text-xs font-semibold"
      >
        Reset View
      </button>

      {/* Attribution */}
      <div className="absolute bottom-2 left-3 z-20 bg-white/90 px-2 py-1 rounded text-[10px] text-slate-600">
        © OpenStreetMap contributors
      </div>
    </div>
  );
}