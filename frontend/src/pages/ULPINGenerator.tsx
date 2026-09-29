import React, { useState, useEffect } from 'react';
import { Key, CheckCircle, AlertTriangle, ArrowRight, Loader2, Copy } from 'lucide-react';
import { fetchParcels, fetchBuildings, fetchFloors, generateULPIN } from '../services/api';
import type { Parcel, Building, Floor, ULPIN } from '../types';

const STEPS = ['Parcel', 'Building', 'Floor & Unit', 'Spatial Data', 'Generate'];

const PROPERTY_TYPES = [
  'Apartment Unit', 'Commercial Unit', 'Surface Parcel',
  'Underground Parking', 'Underground Utility', 'Elevated Structure', 'Air-Space Volume',
];

export default function ULPINGenerator() {
  const [step, setStep] = useState(0);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<(ULPIN & { ulpin_code: string }) | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    state: 'Tamil Nadu',
    district: 'Chennai',
    parcel_id: '',
    building_id: '',
    floor: 1,
    unit: 1,
    property_type: 'Apartment Unit',
    min_z: 0,
    max_z: 3,
    centroid_lat: 13.0067,
    centroid_lng: 80.2571,
  });

  useEffect(() => {
    fetchParcels().then(p => setParcels(Array.isArray(p) ? p : []));
  }, []);

  useEffect(() => {
    if (form.parcel_id) {
      fetchBuildings(form.parcel_id).then(b => setBuildings(Array.isArray(b) ? b : []));
    } else {
      setBuildings([]);
    }
    setForm(f => ({ ...f, building_id: '' }));
  }, [form.parcel_id]);

  useEffect(() => {
    if (form.building_id) {
      fetchFloors(form.building_id).then(fl => {
        const safeFloors = Array.isArray(fl) ? fl : [];
        setFloors(safeFloors);
        const safeBuildings = Array.isArray(buildings) ? buildings : [];
        const bldg = safeBuildings.find(b => b.id === form.building_id);
        if (bldg) {
          setForm(f => ({
            ...f,
            centroid_lat: bldg.centroid_lat,
            centroid_lng: bldg.centroid_lng,
          }));
        }
      });
    } else {
      setFloors([]);
    }
  }, [form.building_id, buildings]);

  useEffect(() => {
    const safeFloors = Array.isArray(floors) ? floors : [];
    const fl = safeFloors.find(f => f.floor_number === form.floor);
    if (fl) {
      setForm(f => ({ ...f, min_z: fl.elevation_min, max_z: fl.elevation_max }));
    }
  }, [form.floor, floors]);

  const set = (key: string, val: string | number) =>
    setForm(f => ({ ...f, [key]: val }));

  const canProceed = () => {
    if (step === 0) return !!form.parcel_id;
    if (step === 1) return !!form.building_id;
    if (step === 2) return form.floor > 0 && form.unit > 0;
    if (step === 3) return form.max_z > form.min_z;
    return true;
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      const res = await generateULPIN(form);
      setResult(res);
      setStep(4);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Generation failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (result) {
      navigator.clipboard.writeText(result.ulpin_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const reset = () => {
    setStep(0);
    setResult(null);
    setError('');
    setForm({
      state: 'Tamil Nadu', district: 'Chennai',
      parcel_id: '', building_id: '', floor: 1, unit: 1,
      property_type: 'Apartment Unit', min_z: 0, max_z: 3,
      centroid_lat: 13.0067, centroid_lng: 80.2571,
    });
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded bg-blue-100 border border-blue-200 flex items-center justify-center shadow-xs">
          <Key className="w-4 h-4 text-blue-700" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Structured 3D ULPIN Generator</h1>
          <p className="text-xs text-slate-500">
            Standardized 3D Spatial Property Identifier Engine for vertical property units & volumetric cadastre
          </p>
        </div>
        <div className="ml-auto text-[10px] bg-blue-100 text-blue-800 font-bold px-2.5 py-1 rounded uppercase">Structured 3D Identifier</div>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Progress Steps Bar */}
        <div className="flex items-center justify-between bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className="flex flex-col items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  i < step ? 'bg-emerald-600 text-white' :
                  i === step ? 'bg-blue-600 text-white shadow-xs' :
                  'bg-slate-100 text-slate-400'
                }`}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span className={`text-[10px] mt-1 font-medium ${i === step ? 'text-blue-700 font-bold' : 'text-slate-500'}`}>{s}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${i < step ? 'bg-emerald-600' : 'bg-slate-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Card Body */}
        <div className="card space-y-4">
          {/* Step 0: Parcel */}
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Step 1 — Administrative Parcel Selection</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label font-semibold">State</label>
                  <input className="form-input" value={form.state} onChange={e => set('state', e.target.value)} />
                </div>
                <div>
                  <label className="form-label font-semibold">District</label>
                  <input className="form-input" value={form.district} onChange={e => set('district', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="form-label font-semibold">Land Parcel (2D Base)</label>
                <select className="form-select" value={form.parcel_id} onChange={e => set('parcel_id', e.target.value)}>
                  <option value="">— Select Base Parcel —</option>
                  {(parcels || []).map(p => (
                    <option key={p.id} value={p.id}>{p.parcel_number} ({p.land_use})</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Step 1: Building */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Step 2 — Building Footprint Selection</h2>
              {(!buildings || buildings.length === 0) ? (
                <p className="text-xs text-slate-500">No building structures registered in parcel {form.parcel_id}.</p>
              ) : (
                <div className="grid gap-2">
                  {(buildings || []).map(b => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => set('building_id', b.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                        form.building_id === b.id
                          ? 'border-blue-600 bg-blue-50/60 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-700">
                        {b.total_floors}F
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-slate-900">{b.name}</p>
                        <p className="text-[11px] text-slate-500">{b.building_type} • {b.total_floors} floors • {b.building_number}</p>
                      </div>
                      {form.building_id === b.id && <CheckCircle className="w-4 h-4 text-blue-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Floor & Unit */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Step 3 — Floor Level & Unit Specification</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label font-semibold">Floor Level</label>
                  <select className="form-select" value={form.floor} onChange={e => set('floor', parseInt(e.target.value))}>
                    {(floors || []).map(f => (
                      <option key={f.floor_number} value={f.floor_number}>{f.floor_label} (+{f.elevation_min}m to +{f.elevation_max}m)</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label font-semibold">Unit Number</label>
                  <input type="number" min="1" max="99" className="form-input" value={form.unit}
                    onChange={e => set('unit', parseInt(e.target.value))} />
                </div>
              </div>
              <div>
                <label className="form-label font-semibold">Property Classification</label>
                <select className="form-select" value={form.property_type} onChange={e => set('property_type', e.target.value)}>
                  {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Step 3: Spatial Data */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Step 4 — Spatial Coordinates & Vertical Bounds</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label font-semibold">Centroid Latitude (°N)</label>
                  <input type="number" step="0.00001" className="form-input font-mono" value={form.centroid_lat}
                    onChange={e => set('centroid_lat', parseFloat(e.target.value))} />
                </div>
                <div>
                  <label className="form-label font-semibold">Centroid Longitude (°E)</label>
                  <input type="number" step="0.00001" className="form-input font-mono" value={form.centroid_lng}
                    onChange={e => set('centroid_lng', parseFloat(e.target.value))} />
                </div>
                <div>
                  <label className="form-label font-semibold">Lower Elevation Zmin (m)</label>
                  <input type="number" step="0.1" className="form-input font-mono" value={form.min_z}
                    onChange={e => set('min_z', parseFloat(e.target.value))} />
                </div>
                <div>
                  <label className="form-label font-semibold">Upper Elevation Zmax (m)</label>
                  <input type="number" step="0.1" className="form-input font-mono" value={form.max_z}
                    onChange={e => set('max_z', parseFloat(e.target.value))} />
                </div>
              </div>
              {form.max_z <= form.min_z && (
                <div className="p-2.5 rounded bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  Maximum elevation must be strictly greater than minimum elevation.
                </div>
              )}
            </div>
          )}

          {/* Step 4: Result */}
          {step === 4 && result && (
            <div className="space-y-4 text-center py-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-700">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">3D ULPIN Successfully Generated</h2>
                <p className="text-[11px] text-slate-500">Volumetric Cadastre Identifier</p>
              </div>

              <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-4">
                <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1">Standardized 3D ULPIN Code</p>
                <p className="text-base font-mono font-bold text-blue-950 break-all">{result.ulpin_code}</p>
                <button
                  onClick={copyToClipboard}
                  className="mt-2.5 flex items-center gap-1 mx-auto text-xs text-blue-600 hover:text-blue-800 font-semibold"
                >
                  <Copy className="w-3.5 h-3.5" /> {copied ? 'Copied to Clipboard!' : 'Copy Identifier'}
                </button>
              </div>

              {/* Mandatory Prototype Label */}
              <div className="p-2 bg-amber-50 border border-amber-200 rounded text-center">
                <span className="text-[10px] font-bold text-amber-900 uppercase">
                  Project-generated identifier — Not an Official Government ULPIN Format
                </span>
              </div>

              <button onClick={reset} className="btn-secondary w-full text-xs py-2 mt-2">
                Generate Another ULPIN
              </button>
            </div>
          )}

          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Wizard Navigation */}
          {step < 4 && (
            <div className="flex gap-3 pt-3 border-t border-slate-200">
              {step > 0 && (
                <button type="button" onClick={() => setStep(s => s - 1)} className="btn-secondary flex-1">
                  Back
                </button>
              )}
              {step < 3 ? (
                <button
                  type="button"
                  onClick={() => setStep(s => s + 1)}
                  disabled={!canProceed()}
                  className="btn-primary flex-1 flex items-center justify-center gap-1.5"
                >
                  Next <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={generating || !canProceed()}
                  className="btn-primary flex-1 flex items-center justify-center gap-1.5"
                >
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
                  Generate 3D ULPIN
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
