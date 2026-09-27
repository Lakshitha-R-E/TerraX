import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { fetchProperties, fetchBuildings, simulateWhatIf } from '../services/api';
import type { Property, Building, WhatIfResult } from '../types';
import {
  GitBranch, Play, AlertTriangle, CheckCircle, ShieldAlert,
  Info, Box, Layers, ArrowUp, RefreshCw
} from 'lucide-react';
import clsx from 'clsx';

function validScenarioGeometry(result: WhatIfResult) {
  const ring = result.current?.footprint;
  const current = result.current;
  const proposed = result.proposed;
  return Array.isArray(ring) && ring.length >= 3 && ring.every(point =>
    Array.isArray(point) && point.length >= 2 && Number.isFinite(point[0]) && Number.isFinite(point[1])
  ) && current && proposed && Number.isFinite(current.min_z) && Number.isFinite(current.max_z) &&
    Number.isFinite(proposed.min_z) && Number.isFinite(proposed.max_z);
}

function ScenarioViewer({ result, onError }: { result: WhatIfResult | null; onError: (message: string | null) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;
    try {
      const viewer = new Cesium.Viewer(containerRef.current, {
        baseLayer: new Cesium.ImageryLayer(new Cesium.OpenStreetMapImageryProvider({ url: 'https://tile.openstreetmap.org/' })),
        terrainProvider: new Cesium.EllipsoidTerrainProvider(),
        baseLayerPicker: false, geocoder: false, homeButton: false,
        sceneModePicker: false, navigationHelpButton: false,
        animation: false, timeline: false, fullscreenButton: false,
      });
      viewerRef.current = viewer;
      viewer.scene.globe.depthTestAgainstTerrain = false;
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(80.2571, 13.0067, 1800),
        orientation: { heading: 0, pitch: Cesium.Math.toRadians(-45), roll: 0 },
        duration: 0,
      });
    } catch (error) {
      console.error('[TerraX What-If] Cesium initialization failed:', error);
      onError('The 3D viewer could not be initialized. Retry the analysis or return to the map.');
    }
    return () => {
      const viewer = viewerRef.current;
      if (viewer && !viewer.isDestroyed()) viewer.destroy();
      viewerRef.current = null;
    };
  }, [onError]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed() || !result) return;
    try {
      viewer.entities.values
        .filter(entity => typeof entity.id === 'string' && entity.id.startsWith('terrax-scenario-'))
        .forEach(entity => viewer.entities.remove(entity));

      if (!validScenarioGeometry(result)) {
        onError('The scenario returned incomplete coordinates or bounds. The 3D viewer is active.');
        return;
      }
      onError(null);

      const positions = result.current.footprint.flatMap(point => [point[0], point[1]]);
      const current = result.current;
      const proposed = result.proposed;
      const conflictColor = result.has_conflict ? Cesium.Color.RED : Cesium.Color.ORANGE;

      viewer.entities.add({
        id: 'terrax-scenario-current',
        name: 'Current property',
        polygon: {
          hierarchy: Cesium.Cartesian3.fromDegreesArray(positions),
          height: current.min_z,
          extrudedHeight: current.max_z,
          material: Cesium.Color.CYAN.withAlpha(0.48),
          outline: true,
          outlineColor: Cesium.Color.WHITE,
        },
      });

      viewer.entities.add({
        id: 'terrax-scenario-proposed',
        name: result.has_conflict ? 'Proposed floor conflict' : 'Proposed floor',
        polygon: {
          hierarchy: Cesium.Cartesian3.fromDegreesArray(positions),
          height: current.max_z,
          extrudedHeight: proposed.max_z,
          material: conflictColor.withAlpha(0.82),
          outline: true,
          outlineColor: conflictColor,
        },
      });

      if (positions.length >= 2) {
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(positions[0], positions[1], Math.max(300, (proposed.max_z || 30) + 250)),
          orientation: { heading: 0, pitch: Cesium.Math.toRadians(-45), roll: 0 },
          duration: 1.2,
        });
      }
    } catch (e: any) {
      console.error('[TerraX What-If] Viewer entity addition error:', e);
      onError('Scenario volume geometry preview could not be rendered in 3D viewer.');
    }
  }, [result, onError]);

  return (
    <div className="relative h-64 lg:h-full min-h-64 overflow-hidden rounded border border-slate-700 bg-slate-950">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="absolute left-2 top-2 z-10 flex gap-2 text-[10px] font-semibold">
        <span className="bg-slate-950/85 text-cyan-200 px-2 py-1 rounded">CURRENT PROPERTY</span>
        <span className="bg-slate-950/85 text-orange-200 px-2 py-1 rounded">PROPOSED FLOOR</span>
      </div>
      {!result && <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none"><span className="bg-slate-950/80 px-3 py-2 text-xs text-white rounded">Run an analysis to display the property volume.</span></div>}
    </div>
  );
}

export default function WhatIfPlanning() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryPropertyId = searchParams.get('property');
  const [properties, setProperties] = useState<Property[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(queryPropertyId || '');
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');
  const [newFloorNumber, setNewFloorNumber] = useState<number>(4);
  const [floorHeight, setFloorHeight] = useState<number>(3);

  const [loadingData, setLoadingData] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<WhatIfResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewerError, setViewerError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([fetchProperties(), fetchBuildings()]).then(([propertyList, buildingList]) => {
      if (!active) return;
      setProperties(propertyList);
      setBuildings(buildingList);
      const selected = propertyList.find(property => property.id === queryPropertyId) ||
        propertyList.find(property => property.id === 'PROP-DEMO-003') || propertyList[0];
      if (selected) {
        setSelectedPropertyId(selected.id);
        setSelectedBuildingId(selected.building_id || '');
        setFloorHeight(buildingList.find(building => building.id === selected.building_id)?.floor_height || 3);
        setNewFloorNumber((buildingList.find(building => building.id === selected.building_id)?.total_floors || 3) + 1);
        if (selected.id !== queryPropertyId) setSearchParams({ property: selected.id }, { replace: true });
      }
    }).catch(loadError => {
      console.error('[TerraX What-If] Failed to load property and building data:', loadError);
      if (active) setError(loadError?.response?.data?.detail || 'Property and building records could not be loaded.');
    }).finally(() => {
      if (active) setLoadingData(false);
    });
    return () => { active = false; };
  }, [queryPropertyId, setSearchParams]);

  const selectedProperty = properties.find(property => property.id === selectedPropertyId);
  const selectedBuildingObj = buildings.find(building => building.id === selectedBuildingId);

  useEffect(() => {
    setSimulationResult(null);
    setError(null);
    if (selectedProperty) {
      const linkedBuilding = buildings.find(building => building.id === selectedProperty.building_id);
      setSelectedBuildingId(linkedBuilding?.id || '');
      if (linkedBuilding) {
        setFloorHeight(linkedBuilding.floor_height || 3);
        setNewFloorNumber((linkedBuilding.total_floors || 1) + 1);
      }
    }
  }, [selectedPropertyId, selectedProperty, buildings]);

  const handleSimulate = async () => {
    if (!selectedProperty || !selectedBuildingObj) {
      setError('Select a property linked to an available building before running the analysis.');
      return;
    }
    const addedFloors = newFloorNumber - selectedBuildingObj.total_floors;
    if (!Number.isFinite(addedFloors) || addedFloors < 1 || !Number.isFinite(floorHeight) || floorHeight <= 0) {
      setError('The proposed floor number and floor height must be valid positive values above the current building floors.');
      return;
    }
    setSimulating(true);
    setError(null);
    setViewerError(null);
    try {
      const res = await simulateWhatIf({
        building_id: selectedBuildingId,
        property_id: selectedProperty.id,
        added_floors_count: addedFloors,
        floor_height_m: floorHeight,
      });
      if (!res || !Array.isArray(res.conflicts) || !res.current || !res.proposed || !res.simulated_volume) {
        throw new Error('The What-If response is missing required scenario data.');
      }
      setSimulationResult(res);
    } catch (requestError: any) {
      console.error('[TerraX What-If] Analysis request failed:', requestError);
      setError(requestError?.response?.data?.detail || requestError?.message || 'The What-If analysis failed.');
    } finally {
      setSimulating(false);
    }
  };

  const handlePropertyChange = (propertyId: string) => {
    setSelectedPropertyId(propertyId);
    setSearchParams({ property: propertyId });
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">3D Conflict Analysis</h1>
            <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded uppercase">Temporary Scenario</span>
          </div>
          <p className="text-xs text-slate-500">
            Compare the selected property's current volume with a proposed floor without changing the cadastral record.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
          <Info className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Scenario changes remain temporary until explicitly applied.</span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 overflow-hidden">
        {/* Left: Simulation Parameter Controls */}
        <div className="lg:col-span-5 card p-4 flex flex-col overflow-y-auto">
          <div className="card-header flex items-center justify-between">
            <span>Simulation Parameters</span>
            <span className="text-[10px] text-blue-600 font-mono">Volumetric Proposal</span>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="form-label font-semibold">Selected Property</label>
              <select value={selectedPropertyId} onChange={e => handlePropertyChange(e.target.value)} className="form-select text-xs" disabled={loadingData}>
                {properties.map(property => <option key={property.id} value={property.id}>{property.unit_number} - {property.id}</option>)}
              </select>
              {selectedProperty && <p className="text-[10px] text-slate-500 mt-1">Parcel {selectedProperty.parcel_id} / Building {selectedProperty.building_id || 'not linked'} / Floor {selectedProperty.floor_id || 'not linked'}</p>}
            </div>

            <div>
              <label className="form-label font-semibold">Linked Building</label>
              <div className="form-input text-xs text-slate-700 bg-slate-50">{selectedBuildingObj ? `${selectedBuildingObj.name} (${selectedBuildingObj.id})` : 'No linked building available'}</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label font-semibold">Proposed Floor Number</label>
                <input type="number" min={(selectedBuildingObj?.total_floors || 0) + 1} max="100" value={newFloorNumber} onChange={e => setNewFloorNumber(Number(e.target.value))} className="form-input text-xs font-mono" />
              </div>
              <div>
                <label className="form-label font-semibold">Floor Height (m)</label>
                <input type="number" min="0.1" step="0.1" value={floorHeight} onChange={e => setFloorHeight(Number(e.target.value))} className="form-input text-xs font-mono" />
              </div>
            </div>

            {selectedBuildingObj && <div className="p-3 bg-slate-50 border border-slate-200 rounded text-[11px] space-y-1">
              <p>Current: {selectedBuildingObj.total_floors} floors / {(selectedBuildingObj.total_floors * floorHeight).toFixed(1)} m</p>
              <p>Proposed: {newFloorNumber} floors / {(newFloorNumber * floorHeight).toFixed(1)} m</p>
            </div>}

            {error && <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded text-red-800 space-y-2">
              <p className="font-bold">What-If Analysis Failed</p>
              <p>{error}</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={handleSimulate} className="btn-secondary text-[11px]">Retry</button>
                {selectedProperty && <button type="button" onClick={() => navigate(`/dossier/${selectedProperty.id}`)} className="btn-secondary text-[11px]">Return to Property</button>}
                <button type="button" onClick={() => navigate('/map')} className="btn-secondary text-[11px]">Back to Map</button>
              </div>
            </div>}

            <button
              onClick={handleSimulate}
              disabled={simulating}
              className="btn-primary w-full flex items-center justify-center gap-2 text-xs py-2 mt-2"
            >
              {simulating ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Running 3D conflict analysis...</>
              ) : (
                <><Play className="w-4 h-4" /> Run 3D What-If Conflict Analysis</>
              )}
            </button>
            {loadingData && <p className="text-center text-slate-500">Loading property and building records...</p>}
          </div>
        </div>

        <div className="lg:col-span-7 min-h-0 grid grid-rows-[minmax(16rem,1fr)_minmax(12rem,0.9fr)] gap-3 overflow-hidden">
          <ScenarioViewer result={simulationResult} onError={setViewerError} />
          <div className="card p-4 min-h-0 overflow-y-auto">
            <div className="card-header flex items-center justify-between">
              <span>Conflict Analysis</span>
              <span className="text-[10px] text-slate-500">{simulationResult?.scenario_id || 'Awaiting scenario'}</span>
            </div>
            {selectedProperty && <p className="text-[10px] text-slate-500 font-mono mb-2">Property {selectedProperty.id} · Linked building {selectedBuildingId || 'unavailable'}</p>}
            {simulating ? (
              <div className="flex items-center justify-center gap-2 py-6 text-xs text-slate-500"><RefreshCw className="w-4 h-4 animate-spin" />Preparing spatial scenario...</div>
            ) : viewerError ? (
              <div role="alert" className="my-2 p-3 border border-amber-200 bg-amber-50 text-amber-900 rounded text-xs">{viewerError}</div>
            ) : simulationResult ? (
              <div className="space-y-3 text-xs">
                <div className={clsx('p-3 border rounded flex items-center gap-2', simulationResult.has_conflict ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800')}>
                  {simulationResult.has_conflict ? <ShieldAlert className="w-4 h-4 flex-shrink-0" /> : <CheckCircle className="w-4 h-4 flex-shrink-0" />}
                  <span className="font-semibold">{simulationResult.has_conflict ? 'Conflict Analysis' : 'No Spatial Conflicts Detected'}</span>
                </div>
                {simulationResult.conflicts.some(conflict => conflict.type.toLowerCase().includes('airspace')) ? (
                  <p className="text-[11px] text-red-700 font-bold flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                    Airspace Conflict
                  </p>
                ) : (
                  <p className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    No Airspace Conflict Detected
                  </p>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    ['Current Building Height', `${simulationResult.current.height_m.toFixed(1)} m`],
                    ['Proposed Building Height', `${simulationResult.proposed.height_m.toFixed(1)} m`],
                    ['Current Building Volume', `${simulationResult.current.volume_cbm.toFixed(1)} m³`],
                    ['Proposed Building Volume', `${simulationResult.proposed.volume_cbm.toFixed(1)} m³`],
                    ['Vertical Range', `${simulationResult.current.min_z.toFixed(1)} to ${simulationResult.proposed.max_z.toFixed(1)} m`],
                    ['Height Difference', `${simulationResult.summary.height_difference_m.toFixed(1)} m`],
                    ['Volume Difference', `${simulationResult.summary.volume_difference_cbm.toFixed(1)} m³`],
                    ['Validation Summary', `${simulationResult.summary.conflict_count} conflicts / ${simulationResult.summary.warning_count} warnings`],
                  ].map(([label, value]) => <div key={label} className="p-2 bg-slate-50 border border-slate-200 rounded"><span className="block text-[10px] uppercase text-slate-500">{label}</span><strong className="font-mono">{value}</strong></div>)}
                </div>
                {simulationResult.conflicts.length === 0 ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded font-medium flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>No Spatial Conflicts Detected</span>
                  </div>
                ) : simulationResult.conflicts.map((conflict, index) => (
                  <div key={`${conflict.affected_entity || conflict.type}-${index}`} className={clsx('p-3 border rounded space-y-1', conflict.severity === 'conflict' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-amber-50 border-amber-200 text-amber-800')}>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-bold"><AlertTriangle className="w-3.5 h-3.5" />{conflict.type}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white border uppercase">{conflict.severity}</span>
                    </div>
                    <p className="text-xs text-slate-800">{conflict.description || conflict.message}</p>
                    <div className="grid grid-cols-2 gap-1 pt-1 font-mono text-[10px] text-slate-600 border-t border-slate-200/60 mt-1">
                      <div>Conflict Type: <span className="font-bold text-slate-800">{conflict.type}</span></div>
                      <div>Affected Entity: <span className="font-bold text-slate-800">{conflict.affected_entity || 'Spatial Constraint'}</span></div>
                      <div>Current Value: <span className="font-bold text-slate-800">{simulationResult.current.height_m.toFixed(1)}m (Z: {simulationResult.current.max_z.toFixed(1)}m)</span></div>
                      <div>Proposed Value: <span className="font-bold text-red-700">{simulationResult.proposed.height_m.toFixed(1)}m (Z: {simulationResult.proposed.max_z.toFixed(1)}m)</span></div>
                    </div>
                  </div>
                ))}
                {selectedProperty && <div className="flex flex-wrap gap-2 pt-1">
                  <button type="button" onClick={() => navigate(`/dossier/${selectedProperty.id}`)} className="btn-secondary text-[11px]">Return to Property</button>
                  <button type="button" onClick={() => navigate(`/history?property=${encodeURIComponent(selectedProperty.id)}`)} className="btn-secondary text-[11px]">View History</button>
                  <button type="button" onClick={() => navigate('/map')} className="btn-secondary text-[11px]">Back to Map</button>
                </div>}
              </div>
            ) : (
              <div className="py-5 text-center text-xs text-slate-500">Choose a property and run the analysis. The 3D viewer remains active while results load.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
