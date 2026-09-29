import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Fingerprint, MapPin, Layers, Box, ShieldCheck, RefreshCw, AlertTriangle } from 'lucide-react';
import { fetchProperties, fetchULPINs } from '../services/api';
import type { Property, ULPIN } from '../types';

async function createFingerprint(property: Property): Promise<string> {
  const payload = JSON.stringify({
    parcel_id: property.parcel_id,
    building_id: property.building_id,
    floor_id: property.floor_id,
    unit_id: property.unit_number,
    geometry: property.geometry_2d,
    min_z: property.min_z,
    max_z: property.max_z,
    property_type: property.property_type,
  });
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
  const hex = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}`;
}

export default function PropertyDNA() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [ulpins, setUlpins] = useState<ULPIN[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [fingerprint, setFingerprint] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    setError(null);
    Promise.all([fetchProperties(), fetchULPINs()])
      .then(([propertyList, ulpinList]) => {
        const safeProps = Array.isArray(propertyList) ? propertyList : [];
        setProperties(safeProps);
        setUlpins(Array.isArray(ulpinList) ? ulpinList : []);
        const targetId = searchParams.get('property');
        const initial = targetId && safeProps.find(p => p.id === targetId)
          ? targetId
          : safeProps[0]?.id ?? '';
        setSelectedId(initial);
      })
      .catch(err => {
        console.error('Failed to load Property DNA data:', err);
        setError(err?.response?.data?.detail || 'Failed to load property records.');
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
  const ulpin = (Array.isArray(ulpins) ? ulpins : []).find(item => item.property_id === property?.id)?.ulpin_code;
  const height = property ? property.max_z - property.min_z : 0;

  useEffect(() => {
    if (property) createFingerprint(property).then(setFingerprint);
  }, [property]);

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 space-y-3">
        <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Computing spatial property identity...</p>
      </div>
    );
  }

  if (error || properties.length === 0 || !property) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 space-y-3">
        <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <p className="text-sm text-slate-800 font-semibold">{error || 'No property records available to generate Property DNA.'}</p>
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

  return (
    <div className="h-full overflow-y-auto p-6 space-y-5">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><h1 className="text-xl font-bold text-slate-900">Property DNA</h1><span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded uppercase">Digital Spatial Signature</span></div>
          <p className="text-xs text-slate-500 mt-1">A deterministic identity assembled from the selected property record and its 3D extent.</p>
        </div>
        <select value={property.id} onChange={event => setSelectedId(event.target.value)} className="form-select md:w-72">
          {(properties || []).map(item => <option key={item.id} value={item.id}>{item.unit_number} · {item.property_type}</option>)}
        </select>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <section className="xl:col-span-2 card">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
            <div className="w-10 h-10 rounded bg-blue-50 border border-blue-200 flex items-center justify-center"><Fingerprint className="w-5 h-5 text-blue-600" /></div>
            <div><p className="card-header mb-1">Property Spatial DNA Signature</p><p className="font-mono text-lg font-bold text-blue-900 tracking-wide">{fingerprint || 'Computing...'}</p></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-xs">
            <Info label="Property ID" value={property.id} />
            <Info label="3D ULPIN Code" value={ulpin ?? 'Not generated'} mono />
            <Info label="Property Type" value={property.property_type} />
            <Info label="Status" value="Validated cadastre record" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
            <IdentityBlock icon={<MapPin className="w-4 h-4" />} title="Spatial Identity" rows={[['Latitude', `${property.centroid_lat}`], ['Longitude', `${property.centroid_lng}`], ['Ground / Min Z', `${property.min_z} m`]]} />
            <IdentityBlock icon={<Layers className="w-4 h-4" />} title="Vertical Identity" rows={[['Min Z', `${property.min_z} m`], ['Max Z', `${property.max_z} m`], ['Height', `${height.toFixed(1)} m`]]} />
            <IdentityBlock icon={<Box className="w-4 h-4" />} title="Physical Identity" rows={[['Area', `${property.area_sqm} m²`], ['Volume', `${property.volume_cbm} m³`], ['Confidence', `${property.confidence.toFixed(0)}%`]]} />
            <IdentityBlock icon={<ShieldCheck className="w-4 h-4" />} title="Structural Identity" rows={[['Parcel', property.parcel_id], ['Building', property.building_id ?? 'Surface'], ['Floor', property.floor_id ?? 'Ground']]} />
          </div>
        </section>
        <aside className="card h-fit">
          <p className="card-header">Evidence used to form this DNA</p>
          <div className="space-y-2 text-xs">
            {['Parcel geometry', 'Building relationship', 'Floor relationship', '2D property geometry', 'Vertical Z extent', 'Property classification'].map(item => <div key={item} className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded"><ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />{item}</div>)}
          </div>
          <p className="text-[11px] text-slate-500 mt-4 leading-relaxed">This TerraX fingerprint is an identity aid, not a legal identifier, and does not prove ownership.</p>
        </aside>
      </div>
    </div>
  );
}

function Info({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="p-3 bg-slate-50 border border-slate-200 rounded"><p className="text-[10px] uppercase text-slate-500 font-semibold">{label}</p><p className={`mt-1 font-semibold text-slate-800 break-words ${mono ? 'font-mono text-[11px]' : ''}`}>{value}</p></div>;
}

function IdentityBlock({ icon, title, rows }: { icon: React.ReactNode; title: string; rows: string[][] }) {
  return <div className="border border-slate-200 rounded p-3"><div className="flex items-center gap-2 text-xs font-bold text-slate-800 mb-2">{icon}{title}</div>{rows.map(([label, value]) => <div key={label} className="flex justify-between gap-3 py-1.5 border-t border-slate-100 text-xs"><span className="text-slate-500">{label}</span><span className="font-mono font-semibold text-slate-800 text-right">{value}</span></div>)}</div>;
}
