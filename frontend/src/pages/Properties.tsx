import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  fetchProperties, fetchParcels, fetchBuildings, fetchULPINs, fetchHistory
} from '../services/api';
import type { Property, Parcel, Building, ULPIN, PropertyVersion } from '../types';
import {
  Search, Filter, Download, Box, X, Printer,
  History, Info, CheckCircle, AlertTriangle, Layers, PlusCircle, RefreshCw
} from 'lucide-react';
import clsx from 'clsx';

export default function Properties() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [properties, setProperties] = useState<Property[]>([]);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [ulpins, setUlpins] = useState<ULPIN[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [propertyHistory, setPropertyHistory] = useState<PropertyVersion[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'geometry' | 'history'>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('all');

  const loadProperties = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetchProperties(),
      fetchParcels(),
      fetchBuildings(),
      fetchULPINs()
    ]).then(([pr, pa, bu, ul]) => {
      setProperties(pr);
      setParcels(pa);
      setBuildings(bu);
      setUlpins(ul);
    }).catch(err => {
      console.error('Failed to load property data:', err);
      setError(err?.response?.data?.detail || 'Failed to load property cadastre records.');
    }).finally(() => {
      setLoading(false);
    });
  };

  useEffect(() => {
    loadProperties();
  }, []);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) setSearchQuery(q);
  }, [searchParams]);

  const handleSelectProperty = async (prop: Property) => {
    setSelectedProperty(prop);
    setActiveTab('overview');
    try {
      const hist = await fetchHistory(prop.id);
      setPropertyHistory(hist);
    } catch {
      setPropertyHistory([]);
    }
  };

  const filteredProperties = properties.filter(p => {
    const matchesSearch =
      !searchQuery ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.unit_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.property_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.building_id && p.building_id.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = selectedType === 'all' || p.property_type === selectedType;
    const matchesBuilding = selectedBuildingId === 'all' || p.building_id === selectedBuildingId;

    return matchesSearch && matchesType && matchesBuilding;
  });

  const getUlpinForProp = (propId: string) => {
    const u = ulpins.find(x => x.property_id === propId);
    return u?.ulpin_code || 'Not Assigned';
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredProperties, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `3d_properties_cadastre_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportGeoJSON = () => {
    const geojson = {
      type: "FeatureCollection",
      metadata: {
        title: "3D Cadastral Volumetric Properties",
        exported_at: new Date().toISOString(),
        disclaimer: "Project-Generated Record — Not a Legal Land Record"
      },
      features: filteredProperties.map(p => ({
        type: "Feature",
        id: p.id,
        properties: {
          id: p.id,
          unit_number: p.unit_number,
          property_type: p.property_type,
          parcel_id: p.parcel_id,
          building_id: p.building_id,
          min_z: p.min_z,
          max_z: p.max_z,
          height_m: p.max_z - p.min_z,
          area_sqm: p.area_sqm,
          volume_cbm: p.volume_cbm,
          confidence: p.confidence,
          ulpin: getUlpinForProp(p.id)
        },
        geometry: {
          type: "Polygon",
          coordinates: p.geometry_2d || []
        }
      }))
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(geojson, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `3d_properties_cadastre_${new Date().toISOString().slice(0, 10)}.geojson`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">3D Property Explorer</h1>
            <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded uppercase">Volumetric Cadastral Register</span>
          </div>
          <p className="text-xs text-slate-500">
            Cadastral registry of multi-storey apartment units, commercial properties, and subterranean volumes
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/create-property')}
            className="btn-primary flex items-center gap-1.5 text-xs py-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Create Property
          </button>
          <button
            onClick={handleExportGeoJSON}
            className="btn-secondary flex items-center gap-1.5 text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Export GeoJSON
          </button>
          <button
            onClick={handleExportJSON}
            className="btn-secondary flex items-center gap-1.5 text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Export JSON
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white border border-slate-200 p-3 rounded-lg mb-4 shadow-xs">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by Unit Number, Property ID, Type..."
            className="form-input pl-8 text-xs"
          />
        </div>

        <div>
          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="form-select text-xs"
          >
            <option value="all">All Property Types</option>
            <option value="Apartment Unit">Apartment Unit</option>
            <option value="Commercial Unit">Commercial Unit</option>
            <option value="Underground Parking">Underground Parking</option>
            <option value="Air-Space Volume">Air-Space Volume</option>
          </select>
        </div>

        <div>
          <select
            value={selectedBuildingId}
            onChange={e => setSelectedBuildingId(e.target.value)}
            className="form-select text-xs"
          >
            <option value="all">All Buildings</option>
            {buildings.map(b => (
              <option key={b.id} value={b.id}>{b.name} ({b.building_number})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table + Slide-in Panel */}
      <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
        {/* Table Container */}
        <div className="flex-1 card p-0 flex flex-col overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span>Showing <strong className="text-slate-900">{filteredProperties.length}</strong> 3D cadastral property records</span>
            <span className="text-[11px] text-slate-500">Click any row to inspect volumetric details</span>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-600 sticky top-0 border-b border-slate-200 z-10 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Unit Number</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Building</th>
                  <th className="py-2.5 px-3">Vertical Extent</th>
                  <th className="py-2.5 px-3">Area</th>
                  <th className="py-2.5 px-3">Volume</th>
                  <th className="py-2.5 px-3">3D ULPIN</th>
                  <th className="py-2.5 px-3">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      <RefreshCw className="w-5 h-5 text-blue-600 animate-spin mx-auto mb-2" />
                      <span className="text-xs">Loading 3D properties from cadastre database...</span>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-red-600 space-y-2">
                      <AlertTriangle className="w-5 h-5 text-red-600 mx-auto mb-1" />
                      <p className="text-xs font-semibold">{error}</p>
                      <button onClick={loadProperties} className="btn-secondary text-xs inline-flex items-center gap-1 mx-auto">
                        <RefreshCw className="w-3.5 h-3.5" /> Retry
                      </button>
                    </td>
                  </tr>
                ) : filteredProperties.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                      No property records match your current filters or search query.
                    </td>
                  </tr>
                ) : (
                  filteredProperties.map(prop => {
                    const isSelected = selectedProperty?.id === prop.id;
                    const ulpinCode = getUlpinForProp(prop.id);
                    return (
                      <tr
                        key={prop.id}
                        onClick={() => handleSelectProperty(prop)}
                        className={clsx(
                          'cursor-pointer transition-colors hover:bg-slate-50',
                          isSelected && 'bg-blue-50/70 font-medium'
                        )}
                      >
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">{prop.unit_number}</td>
                        <td className="py-2 px-3">
                          <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700">
                            {prop.property_type}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-600">{prop.building_id || '—'}</td>
                        <td className="py-2 px-3 font-mono text-blue-700 font-semibold">
                          +{prop.min_z}m to +{prop.max_z}m
                        </td>
                        <td className="py-2 px-3">{prop.area_sqm} m²</td>
                        <td className="py-2 px-3 font-mono font-bold text-emerald-700">{prop.volume_cbm} m³</td>
                        <td className="py-2 px-3 font-mono text-[11px] text-blue-800">
                          {ulpinCode !== 'Not Assigned' ? ulpinCode : <span className="text-slate-400 italic">Unassigned</span>}
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1.5">
                            <div className="w-12 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-emerald-500"
                                style={{ width: `${prop.confidence}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-slate-600 font-bold">{prop.confidence.toFixed(0)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Slide-in Details Panel */}
        {selectedProperty && (
          <div className="w-96 card p-4 flex flex-col h-full overflow-hidden bg-white border-slate-200 shadow-lg animate-in slide-in-from-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Box className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Unit {selectedProperty.unit_number}</h3>
              </div>
              <button
                onClick={() => setSelectedProperty(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 mt-2">
              <button
                onClick={() => setActiveTab('overview')}
                className={clsx('tab-btn text-xs', activeTab === 'overview' && 'active')}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('geometry')}
                className={clsx('tab-btn text-xs', activeTab === 'geometry' && 'active')}
              >
                3D Volume
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={clsx('tab-btn text-xs', activeTab === 'history' && 'active')}
              >
                History ({propertyHistory.length})
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto py-3 space-y-3">
              {activeTab === 'overview' && (
                <div className="space-y-3 text-xs">
                  <div className="bg-blue-50/70 p-3 rounded border border-blue-200 space-y-1">
                    <p className="text-[10px] font-bold text-blue-700 uppercase">3D ULPIN Code</p>
                    <p className="font-mono text-blue-900 font-bold break-all">
                      {getUlpinForProp(selectedProperty.id)}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-slate-50 rounded border border-slate-200">
                      <span className="text-slate-500 text-[10px]">Property ID</span>
                      <p className="font-mono text-slate-800 font-bold mt-0.5">{selectedProperty.id}</p>
                    </div>
                    <div className="p-2 bg-slate-50 rounded border border-slate-200">
                      <span className="text-slate-500 text-[10px]">Classification</span>
                      <p className="text-slate-800 font-medium mt-0.5">{selectedProperty.property_type}</p>
                    </div>
                    <div className="p-2 bg-slate-50 rounded border border-slate-200">
                      <span className="text-slate-500 text-[10px]">Parcel ID</span>
                      <p className="font-mono text-slate-800 font-bold mt-0.5">{selectedProperty.parcel_id}</p>
                    </div>
                    <div className="p-2 bg-slate-50 rounded border border-slate-200">
                      <span className="text-slate-500 text-[10px]">Building ID</span>
                      <p className="font-mono text-slate-800 font-bold mt-0.5">{selectedProperty.building_id || '—'}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2 pt-2">
                    <button
                      onClick={() => navigate(`/dossier?id=${selectedProperty.id}`)}
                      className="btn-primary w-full flex items-center justify-center gap-1.5 text-xs py-2"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      View Printable Dossier
                    </button>
                    <button
                      onClick={() => navigate(selectedProperty.building_id ? `/vertical?buildingId=${selectedProperty.building_id}&propertyId=${selectedProperty.id}` : '/vertical')}
                      className="btn-secondary w-full flex items-center justify-center gap-1.5 text-xs py-2"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      Inspect in Vertical View
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'geometry' && (
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-2">
                    <span className="text-[10px] font-bold text-slate-700 uppercase">Volumetric Spatial Metrics</span>
                    <div className="grid grid-cols-2 gap-2 mt-2 font-mono">
                      <div>
                        <span className="text-slate-500 text-[10px] block">Lower Z (Min Elevation)</span>
                        <p className="text-slate-800 font-bold text-sm">+{selectedProperty.min_z} m</p>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">Upper Z (Max Elevation)</span>
                        <p className="text-slate-800 font-bold text-sm">+{selectedProperty.max_z} m</p>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">Vertical Height</span>
                        <p className="text-blue-700 font-bold text-sm">
                          {((selectedProperty.max_z ?? 0) - (selectedProperty.min_z ?? 0)).toFixed(1)} m
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">3D Volume</span>
                        <p className="text-emerald-700 font-bold text-sm">
                          {selectedProperty.volume_cbm ?? 0} m³
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-700 uppercase block">Spatial Centroid (WGS84)</span>
                    <p className="font-mono text-slate-700 mt-1">
                      Lat: {(selectedProperty.centroid_lat ?? 13.0068).toFixed(6)}° N<br />
                      Lng: {(selectedProperty.centroid_lng ?? 80.2570).toFixed(6)}° E
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'history' && (
                <div className="space-y-2.5 text-xs">
                  {propertyHistory.length === 0 ? (
                    <p className="text-slate-500 text-center py-4">No version history records found.</p>
                  ) : (
                    propertyHistory.map(v => (
                      <div key={v.id} className="p-2.5 bg-slate-50 rounded border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-900">Version v{v.version_number}</span>
                          <span className="text-[10px] text-slate-500">{v.changed_at.slice(0, 10)}</span>
                        </div>
                        <p className="text-blue-700 font-medium">{v.change_note}</p>
                        <span className="text-[10px] text-slate-500">Author: {v.changed_by}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
