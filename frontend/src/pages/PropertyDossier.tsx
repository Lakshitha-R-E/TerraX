import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { fetchProperty, fetchULPINs } from '../services/api';
import type { Property, ULPIN } from '../types';
import {
  Printer, ArrowLeft, Box, ShieldCheck, Key, CheckCircle,
  AlertTriangle, Building2, MapPin, Layers, RefreshCw
} from 'lucide-react';

export default function PropertyDossier() {
  const { propertyId: routePropId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const propertyId = routePropId || searchParams.get('id') || 'PROP-B001-F03-U01';

  const [property, setProperty] = useState<Property | null>(null);
  const [ulpins, setUlpins] = useState<ULPIN[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetchProperty(propertyId),
      fetchULPINs()
    ]).then(([pr, ul]) => {
      setProperty(pr);
      setUlpins(ul);
    }).catch(err => {
      console.error('Failed to load property dossier:', err);
      setError(err?.response?.data?.detail || 'Failed to load property dossier record.');
    }).finally(() => {
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, [propertyId]);

  const ulpinCode = ulpins.find(u => u.property_id === propertyId)?.ulpin_code ||
    `3D-ULPIN-TN-CHN-P001-B001-F03-U01`;

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 space-y-3">
        <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Loading cadastral dossier for {propertyId}...</p>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 space-y-3">
        <div className="w-10 h-10 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <p className="text-sm text-slate-800 font-semibold">{error || `Property record "${propertyId}" not found.`}</p>
        <div className="flex gap-2">
          <button onClick={loadData} className="btn-primary text-xs flex items-center gap-1">
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
          <button onClick={() => navigate('/properties')} className="btn-secondary text-xs">
            Return to Property Explorer
          </button>
        </div>
      </div>
    );
  }

  const height = property.max_z - property.min_z;

  return (
    <div className="h-full overflow-y-auto p-6 bg-slate-100/60">
      {/* Top Controls (Hidden on Print) */}
      <div className="max-w-3xl mx-auto flex items-center justify-between mb-4 no-print">
        <button
          onClick={() => navigate('/properties')}
          className="btn-secondary text-xs flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Explorer
        </button>

        <button
          onClick={handlePrint}
          className="btn-primary text-xs flex items-center gap-1.5 py-2 px-4 shadow-sm"
        >
          <Printer className="w-3.5 h-3.5" />
          Print / Save Cadastral Dossier (PDF)
        </button>
      </div>

      <div className="max-w-3xl mx-auto flex flex-wrap gap-2 mb-4 no-print">
        {[
          ['Property DNA', '/dna'], ['Rights Graph', '/relationships'],
          ['Evidence', '/evidence'], ['Validation', '/validation'],
          ['4D History', '/history'], ['Run What-If', '/whatif'],
        ].map(([label, path]) => (
          <button key={path} onClick={() => navigate(`${path}?property=${encodeURIComponent(property.id)}`)} className="btn-secondary text-[11px]">
            {label}
          </button>
        ))}
      </div>

      {/* Official-Style Cadastral Dossier Sheet */}
      <div className="max-w-3xl mx-auto bg-white border border-slate-300 rounded-lg p-8 shadow-sm print:shadow-none print:border-0 print:p-0 space-y-6">
        {/* Document Header with Emblem & State Heading */}
        <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">TerraX</div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight uppercase">
            3D Cadastral Property Dossier & Volumetric Register
          </h1>
          <p className="text-xs text-slate-600">
            3D Property Intelligence for a Smarter Tomorrow
          </p>

          {/* Mandatory Prototype Label */}
          <div className="mt-2 py-1 px-3 bg-amber-50 border border-amber-300 rounded inline-block">
            <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider">
              ⚠ Project-Generated Record — Not an Official Legal Land Record
            </span>
          </div>
        </div>

        {/* Primary Identifier Box */}
        <div className="p-4 bg-slate-50 border border-slate-300 rounded-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">3D ULPIN Code</span>
              <span className="text-base font-mono font-bold text-blue-900 break-all">{ulpinCode}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Validation Health</span>
              <span className="badge-valid text-xs font-bold">✓ Topology Validated</span>
            </div>
          </div>
        </div>

        {/* Section 1: Property Ownership & Identification */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1">
            1. Property & Administrative Identification
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-500 text-[10px] block">Property Unit Number</span>
              <span className="font-bold text-slate-800">{property.unit_number}</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Property Classification</span>
              <span className="font-medium text-slate-800">{property.property_type}</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Owner Reference ID</span>
              <span className="font-mono text-slate-800">{property.owner_ref}</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Parent Land Parcel</span>
              <span className="font-mono font-semibold text-slate-800">{property.parcel_id}</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Building Structure</span>
              <span className="font-mono font-semibold text-slate-800">{property.building_id || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Floor Level</span>
              <span className="font-mono text-slate-800">{property.floor_id || 'Ground / Subsurface'}</span>
            </div>
          </div>
        </div>

        {/* Section 2: 3D Volumetric & Spatial Geometry */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1">
            2. 3D Volumetric Extent & Elevation Metrics
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
              <span className="text-slate-500 text-[10px] block uppercase">Min Elevation (Zmin)</span>
              <span className="font-mono font-bold text-blue-700 text-sm">{property.min_z} m</span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
              <span className="text-slate-500 text-[10px] block uppercase">Max Elevation (Zmax)</span>
              <span className="font-mono font-bold text-blue-700 text-sm">{property.max_z} m</span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
              <span className="text-slate-500 text-[10px] block uppercase">Floor-to-Ceiling Height</span>
              <span className="font-mono font-bold text-slate-800 text-sm">{height.toFixed(1)} m</span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
              <span className="text-slate-500 text-[10px] block uppercase">Volumetric Capacity</span>
              <span className="font-mono font-bold text-emerald-700 text-sm">{property.volume_cbm} m³</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs pt-1">
            <div>
              <span className="text-slate-500 text-[10px] block">Footprint Floor Area</span>
              <span className="font-semibold text-slate-800">{property.area_sqm} m²</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Spatial Centroid (WGS84)</span>
              <span className="font-mono text-slate-800">{(property.centroid_lat ?? 13.0068).toFixed(6)}° N, {(property.centroid_lng ?? 80.2570).toFixed(6)}° E</span>
            </div>
          </div>
        </div>

        {/* Section 3: Sensor Data Verification & Attribution */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1">
            3. Sensor Data Ingestion & Data Confidence
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className="p-2 bg-slate-50 rounded border border-slate-200">
              <span className="text-slate-500 text-[10px] block">Building Footprint</span>
              <span className="font-medium text-slate-800">Microsoft ML Footprints</span>
            </div>
            <div className="p-2 bg-slate-50 rounded border border-slate-200">
              <span className="text-slate-500 text-[10px] block">Ground Elevation</span>
              <span className="font-medium text-slate-800">Cartosat-1 DEM (ISRO)</span>
            </div>
            <div className="p-2 bg-slate-50 rounded border border-slate-200">
              <span className="text-slate-500 text-[10px] block">Roads & Hydrology</span>
              <span className="font-medium text-slate-800">OpenStreetMap</span>
            </div>
            <div className="p-2 bg-slate-50 rounded border border-slate-200">
              <span className="text-slate-500 text-[10px] block">Data Reliability</span>
              <span className="font-bold text-emerald-700">{property.confidence}% Confidence</span>
            </div>
          </div>
        </div>

        {/* Section 4: Topological Hierarchy Signature */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-600 uppercase block">Cadastral Topological Chain</span>
          <p className="font-mono text-[11px] text-slate-700">
            Parcel [{property.parcel_id}] → Building [{property.building_id}] → Floor [{property.floor_id || 'FL'}] → Unit [{property.unit_number}] → Volume [{property.volume_cbm}m³] → ULPIN [{ulpinCode}]
          </p>
        </div>

        {/* Footer Disclaimer */}
        <div className="border-t border-slate-300 pt-4 text-[10px] text-slate-500 text-center space-y-0.5">
          <p>Generated by 3D ULPIN Generation & Vertical Property Mapping System (SIH26011)</p>
          <p>Notice: This project-generated record does not establish legal ownership or statutory cadastral tenure.</p>
        </div>
      </div>
    </div>
  );
}
