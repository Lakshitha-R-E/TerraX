import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  fetchBuildings, fetchFloors, fetchProperties, fetchULPINs
} from '../services/api';
import type { Building, Floor, Property, ULPIN } from '../types';
import {
  Layers, Building2, Box, ArrowUpDown, Key, CheckCircle,
  AlertTriangle, ShieldCheck, ChevronRight, Printer, RefreshCw
} from 'lucide-react';
import clsx from 'clsx';

export default function VerticalPropertyView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [selectedFloor, setSelectedFloor] = useState<Floor | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [ulpins, setUlpins] = useState<ULPIN[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInitialData = () => {
    setLoading(true);
    setError(null);
    Promise.all([fetchBuildings(), fetchULPINs()])
      .then(([bList, ulList]) => {
        const safeB = Array.isArray(bList) ? bList : [];
        const safeU = Array.isArray(ulList) ? ulList : [];
        setBuildings(safeB);
        setUlpins(safeU);
        if (safeB.length > 0) {
          const targetBldId = searchParams.get('buildingId');
          const matched = targetBldId ? safeB.find(b => b.id === targetBldId) : null;
          setSelectedBuilding(matched || safeB[0]);
        }
      })
      .catch(err => {
        console.error('Failed to load vertical view buildings:', err);
        setError(err?.response?.data?.detail || 'Failed to load building data.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadInitialData();
  }, [searchParams]);

  useEffect(() => {
    if (selectedBuilding) {
      Promise.all([
        fetchFloors(selectedBuilding.id),
        fetchProperties({ building_id: selectedBuilding.id })
      ]).then(([fl, pr]) => {
        const safeFl = Array.isArray(fl) ? fl : [];
        const safePr = Array.isArray(pr) ? pr : [];
        setFloors(safeFl);
        setProperties(safePr);
        
        const targetPropId = searchParams.get('propertyId');
        const matchedProp = targetPropId ? safePr.find(p => p.id === targetPropId) : null;
        
        if (matchedProp) {
          setSelectedProperty(matchedProp);
          const matchedFloor = fl.find(f => f.id === matchedProp.floor_id);
          if (matchedFloor) setSelectedFloor(matchedFloor);
          else if (fl.length > 0) setSelectedFloor(fl[0]);
        } else {
          if (fl.length > 0) setSelectedFloor(fl[0]);
          if (pr.length > 0) setSelectedProperty(pr[0]);
        }
      }).catch(err => {
        console.error('Failed to load floors/properties for building:', err);
      });
    }
  }, [selectedBuilding]);

  const unitsOnSelectedFloor = properties.filter(p => {
    if (!selectedFloor) return false;
    return p.floor_id === selectedFloor.id || (
      p.min_z >= selectedFloor.elevation_min && p.max_z <= selectedFloor.elevation_max + 0.1
    );
  });

  const getUlpin = (propId: string) => {
    const u = ulpins.find(x => x.property_id === propId);
    return u?.ulpin_code || 'Not Assigned';
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 space-y-3">
        <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Loading building elevation models...</p>
      </div>
    );
  }

  if (error || buildings.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 space-y-3">
        <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <p className="text-sm text-slate-800 font-semibold">{error || 'No building records available.'}</p>
        <button onClick={loadInitialData} className="btn-primary text-xs flex items-center gap-1">
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      {/* Top Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Vertical Property Mapping View</h1>
            <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded uppercase">Cross-Sectional Cadastre</span>
          </div>
          <p className="text-xs text-slate-500">
            Cross-sectional vertical parcel delineation showing multi-storey cadastre units and subterranean levels
          </p>
        </div>

        {/* Building Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600 font-semibold">Target Structure:</span>
          <select
            value={selectedBuilding?.id || ''}
            onChange={e => {
              const b = (buildings || []).find(x => x.id === e.target.value);
              if (b) setSelectedBuilding(b);
            }}
            className="form-select text-xs w-60 font-medium"
          >
            {(buildings || []).map(b => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.total_floors} Floors)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 overflow-hidden">
        {/* Left: Building Elevation Cross-Section Diagram */}
        <div className="lg:col-span-5 card p-4 flex flex-col overflow-hidden">
          <div className="card-header flex items-center justify-between">
            <span>Architectural Elevation Diagram</span>
            <span className="text-[10px] text-blue-600 font-mono">
              Height: {((selectedBuilding?.total_floors || 5) * (selectedBuilding?.floor_height || 3)).toFixed(1)}m
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-2 flex flex-col justify-end">
            {/* Airspace Indicator */}
            <div className="p-2 border border-dashed border-purple-300 bg-purple-50 rounded text-center">
              <span className="text-[10px] text-purple-700 uppercase font-bold">
                Air-Space Right of Way (Above Roof Extent)
              </span>
            </div>

            {/* Reverse floors so top floor is at top */}
            {[...(floors || [])].reverse().map(floor => {
              const isSelected = selectedFloor?.id === floor.id;
              const floorUnits = (properties || []).filter(p =>
                p.floor_id === floor.id || (p.min_z >= floor.elevation_min && p.max_z <= floor.elevation_max + 0.1)
              );

              return (
                <div
                  key={floor.id}
                  onClick={() => setSelectedFloor(floor)}
                  className={clsx(
                    'p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between',
                    isSelected
                      ? 'border-blue-600 bg-blue-50/70 shadow-xs ring-1 ring-blue-500/30'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={clsx(
                      'w-7 h-7 rounded flex items-center justify-center font-bold text-xs',
                      isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                    )}>
                      F{floor.floor_number}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{floor.floor_label}</p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        Relative Elevation: +{floor.elevation_min}m to +{floor.elevation_max}m
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-blue-700 font-mono font-bold">
                      {floorUnits.length} Units
                    </span>
                    <ChevronRight className={clsx('w-4 h-4', isSelected ? 'text-blue-600' : 'text-slate-400')} />
                  </div>
                </div>
              );
            })}

            {/* Ground Elevation Datum Line */}
            <div className="flex items-center gap-2 py-1">
              <div className="flex-1 h-0.5 bg-emerald-600" />
              <span className="text-[10px] font-mono text-emerald-700 font-bold uppercase">
                Ground Datum Elevation 0.0m MSL
              </span>
              <div className="flex-1 h-0.5 bg-emerald-600" />
            </div>

            {/* Subsurface Level */}
            <div className="p-2.5 rounded-lg border border-slate-300 bg-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-200/70 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded bg-slate-700 flex items-center justify-center font-bold text-xs text-white font-mono">
                  -B1
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Basement & Subterranean Strata</p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Elevation: -5.0m to -2.5m (Underground Parking & Utilities)
                  </p>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200 font-mono font-bold">
                8 Spots
              </span>
            </div>
          </div>
        </div>

        {/* Right: Floor Units & 3D Volumetric Extent Details */}
        <div className="lg:col-span-7 flex flex-col gap-4 overflow-hidden">
          {/* Units Grid on Selected Floor */}
          <div className="card p-4 flex-1 flex flex-col overflow-hidden">
            <div className="card-header flex items-center justify-between">
              <span>Units Registered on {selectedFloor?.floor_label || 'Floor'}</span>
              <span className="text-[10px] text-slate-500">
                Level Z: +{selectedFloor?.elevation_min}m → +{selectedFloor?.elevation_max}m
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto pr-1">
              {unitsOnSelectedFloor.length === 0 ? (
                <div className="col-span-2 text-center py-8 text-slate-400 text-xs">
                  No units currently mapped on this level.
                </div>
              ) : (
                (unitsOnSelectedFloor || []).map(unit => {
                  const isUnitSelected = selectedProperty?.id === unit.id;
                  const ulpinCode = getUlpin(unit.id);

                  return (
                    <div
                      key={unit.id}
                      onClick={() => setSelectedProperty(unit)}
                      className={clsx(
                        'p-3 rounded-lg border cursor-pointer transition-all',
                        isUnitSelected
                          ? 'border-blue-600 bg-blue-50/70 shadow-xs ring-1 ring-blue-500/30'
                          : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                      )}
                    >
                      <div className="flex items-start justify-between mb-1.5">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{unit.unit_number}</h4>
                          <span className="text-[10px] text-slate-500">{unit.property_type}</span>
                        </div>
                        <span className="badge-valid text-[9px]">Verified 3D</span>
                      </div>

                      <div className="space-y-1 text-[11px] font-mono bg-white p-2 rounded border border-slate-200 mt-2">
                        <div className="flex justify-between text-slate-600">
                          <span>Volume:</span>
                          <span className="text-emerald-700 font-bold">{unit.volume_cbm} m³</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Z-Extent:</span>
                          <span className="text-blue-700 font-semibold">+{unit.min_z}m to +{unit.max_z}m</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Floor Area:</span>
                          <span className="text-slate-800">{unit.area_sqm} m²</span>
                        </div>
                      </div>

                      <div className="mt-2 text-[10px] text-blue-800 font-mono truncate font-bold">
                        {ulpinCode}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Selected Property Volumetric Inspector */}
          {selectedProperty && (
            <div className="card p-4">
              <div className="card-header flex items-center justify-between">
                <span>Volumetric Cadastral Dossier — {selectedProperty.unit_number}</span>
                <button
                  onClick={() => navigate(`/dossier?id=${selectedProperty.id}`)}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold"
                >
                  <Printer className="w-3.5 h-3.5" /> Printable Dossier
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mt-1">
                <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                  <span className="text-slate-500 text-[10px] block">3D ULPIN</span>
                  <span className="font-mono text-blue-900 font-bold break-all text-[11px]">
                    {getUlpin(selectedProperty.id)}
                  </span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                  <span className="text-slate-500 text-[10px] block">Bounding Box Extent</span>
                  <span className="font-mono text-blue-700 font-bold text-[11px]">
                    Z: [{selectedProperty.min_z}m, {selectedProperty.max_z}m]
                  </span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                  <span className="text-slate-500 text-[10px] block">Volumetric Capacity</span>
                  <span className="font-mono text-emerald-700 font-bold text-[11px]">
                    {selectedProperty.volume_cbm} m³
                  </span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                  <span className="text-slate-500 text-[10px] block">Data Reliability</span>
                  <span className="font-mono text-emerald-700 font-bold text-[11px]">
                    {selectedProperty.confidence}% LiDAR Verified
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
