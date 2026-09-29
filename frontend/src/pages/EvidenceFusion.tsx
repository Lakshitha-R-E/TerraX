import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Database, ShieldCheck, RefreshCw } from 'lucide-react';
import { fetchBuildings, fetchParcels, fetchProperties, fetchUtilities } from '../services/api';
import type { Building, Parcel, Property, Utility } from '../types';

type EvidenceState = 'consistent' | 'warning' | 'inconsistent';
type EvidenceRow = { label: string; detail: string; state: EvidenceState };

export default function EvidenceFusion() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [utilities, setUtilities] = useState<Utility[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    setError(null);
    Promise.all([fetchProperties(), fetchParcels(), fetchBuildings(), fetchUtilities()])
      .then(([propertyList, parcelList, buildingList, utilityList]) => {
        const safeProps = Array.isArray(propertyList) ? propertyList : [];
        setProperties(safeProps);
        setParcels(Array.isArray(parcelList) ? parcelList : []);
        setBuildings(Array.isArray(buildingList) ? buildingList : []);
        setUtilities(Array.isArray(utilityList) ? utilityList : []);
        const targetId = searchParams.get('property');
        const initial = targetId && safeProps.find(p => p.id === targetId)
          ? targetId
          : safeProps[0]?.id ?? '';
        setSelectedId(initial);
      })
      .catch(err => {
        console.error('Failed to load Evidence Fusion data:', err);
        setError(err?.response?.data?.detail || 'Failed to load cadastral layers.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, [searchParams]);

  const safeProperties = Array.isArray(properties) ? properties : [];
  const property = safeProperties.find(item => item.id === selectedId) ?? safeProperties[0];

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 space-y-3">
        <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Cross-referencing multi-source evidence...</p>
      </div>
    );
  }

  if (error || properties.length === 0 || !property) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 space-y-3">
        <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <p className="text-sm text-slate-800 font-semibold">{error || 'No property records found to run evidence fusion.'}</p>
        <div className="flex gap-2">
          <button onClick={loadData} className="btn-primary text-xs flex items-center gap-1">
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
          <button onClick={() => navigate('/create-property')} className="btn-secondary text-xs">
            Create Property
          </button>
        </div>
      </div>
    );
  }

  const parcel = parcels.find(item => item.id === property.parcel_id);
  const building = buildings.find(item => item.id === property.building_id);
  const relatedUtility = utilities.find(item => item.parcel_id === property.parcel_id && item.conflict_status !== 'none');
  const rows: EvidenceRow[] = [
    { label: 'Parcel geometry', detail: parcel ? `${parcel.parcel_number} · ${parcel.area_sqm} m² registered` : 'Parcel record unavailable', state: parcel ? 'consistent' : 'inconsistent' },
    { label: 'Building footprint', detail: building ? `${building.name} · ${building.total_floors} floors` : 'Surface property or footprint unavailable', state: property.building_id && !building ? 'inconsistent' : 'consistent' },
    { label: 'Floor data', detail: property.floor_id ? 'Linked floor record and vertical bounds available' : 'Ground-level property', state: 'consistent' },
    { label: 'Elevation / DEM', detail: `${property.min_z} m to ${property.max_z} m property extent`, state: property.max_z > property.min_z ? 'consistent' : 'inconsistent' },
    { label: 'Infrastructure overlap', detail: relatedUtility ? `${relatedUtility.asset_id} reports ${relatedUtility.conflict_status}` : 'No parcel utility conflict reported', state: relatedUtility?.conflict_status === 'conflict' ? 'inconsistent' : relatedUtility ? 'warning' : 'consistent' },
  ];
  const inconsistent = rows.filter(row => row.state === 'inconsistent').length;
  const warnings = rows.filter(row => row.state === 'warning').length;
  const confidence = Math.max(0, Math.round(100 - inconsistent * 22 - warnings * 10));
  const status: EvidenceState = inconsistent > 0 ? 'inconsistent' : warnings > 0 ? 'warning' : 'consistent';

  return <div className="h-full overflow-y-auto p-6 space-y-5">
    <header className="flex flex-col md:flex-row md:items-end justify-between gap-3"><div><div className="flex items-center gap-2"><h1 className="text-xl font-bold text-slate-900">Spatial Evidence Fusion</h1><span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded uppercase">Spatial Consistency Engine</span></div><p className="text-xs text-slate-500 mt-1">Geometric cross-checking of spatial evidence layers (footprints, DEM, parcels). Does not constitute legal title verification.</p></div><select value={property.id} onChange={event => setSelectedId(event.target.value)} className="form-select md:w-72">{(properties || []).map(item => <option key={item.id} value={item.id}>{item.unit_number} · {item.property_type}</option>)}</select></header>
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
      <section className="xl:col-span-2 card"><div className="flex items-center justify-between border-b border-slate-200 pb-3"><div><p className="card-header mb-1">Evidence sources</p><p className="font-semibold text-slate-900">{property.id}</p></div><Database className="w-5 h-5 text-blue-600" /></div><div className="divide-y divide-slate-100">{rows.map(row => <div key={row.label} className="flex items-start gap-3 py-3"><StatusIcon state={row.state} /><div><p className="text-xs font-semibold text-slate-800">{row.label}</p><p className="text-[11px] text-slate-500 mt-0.5">{row.detail}</p></div><span className={`ml-auto text-[10px] font-bold uppercase ${row.state === 'consistent' ? 'text-emerald-700' : row.state === 'warning' ? 'text-amber-700' : 'text-red-700'}`}>{row.state}</span></div>)}</div></section>
      <aside className="card h-fit"><p className="card-header">Fusion result</p><div className="flex items-center justify-between"><span className="text-3xl font-bold text-slate-900">{confidence}%</span><span className={status === 'consistent' ? 'badge-valid' : status === 'warning' ? 'badge-warning' : 'badge-conflict'}>{status}</span></div><div className="h-2 bg-slate-100 rounded mt-3 overflow-hidden"><div className={`h-full ${status === 'consistent' ? 'bg-emerald-500' : status === 'warning' ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${confidence}%` }} /></div><div className="mt-5 space-y-2 text-xs"><p className="font-semibold text-slate-800">Detected checks</p><p className="text-slate-500">{inconsistent} inconsistency · {warnings} warning</p><p className="text-[11px] text-slate-500 leading-relaxed">Confidence is computed from the available study-area datasets and rules shown here.</p></div></aside>
    </div>
  </div>;
}

function StatusIcon({ state }: { state: EvidenceState }) { return state === 'consistent' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5" /> : state === 'warning' ? <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" /> : <ShieldCheck className="w-4 h-4 text-red-600 mt-0.5" />; }
