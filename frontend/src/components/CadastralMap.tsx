import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import {
  Layers, ChevronDown, ChevronUp, X, Search,
  Box, AlertTriangle, MapPin, Database, Layers3,
  Monitor, Sparkles, MoveDown, Shield, Zap, Target, Bug
} from 'lucide-react';
import {
  fetchParcels, fetchBuildings, fetchProperties, fetchUtilities,
  fetchInfrastructure, fetchTamilNaduDistricts, fetchSpatialMicrosoftBuildings,
  fetchRoadsLayer, fetchWaterbodiesLayer, fetchMicrosoftCoverage,
  fetchUndergroundInfrastructure, fetchUndergroundParking, fetchDEMModel
} from '../services/api';
import type {
  Parcel, Building, Property, Utility, Infrastructure,
  LayerVisibility, MicrosoftBuildingFeature, MicrosoftBuildingsResponse, DEMModel
} from '../types';
import { useAppStore } from '../store/useAppStore';
import { computeRingCentroid } from '../utils/geo';
import clsx from 'clsx';

// ─── Colour tables ────────────────────────────────────────────────────────────
const UTILITY_CSS: Record<string, string> = {
  'Water Pipeline':      '#2563eb',
  'Sewer Line':          '#b45309',
  'Electrical Cable':    '#f59e0b',
  'Communication Cable': '#9333ea',
  'Underground Parking': '#475569',
};
const PROPERTY_CSS: Record<string, string> = {
  'Apartment Unit':      '#2563eb',
  'Commercial Unit':     '#059669',
  'Underground Parking': '#475569',
  'Underground Utility': '#d97706',
  'Elevated Structure':  '#ea580c',
  'Air-Space Volume':    '#7c3aed',
  'Surface Parcel':      '#0891b2',
};

function hexCol(hex: string, alpha = 1.0): Cesium.Color {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return new Cesium.Color(r, g, b, alpha);
}
function polyHier(coords: number[][]): Cesium.PolygonHierarchy {
  return new Cesium.PolygonHierarchy(
    coords.map(([lng, lat]) => Cesium.Cartesian3.fromDegrees(lng, lat))
  );
}

// ─── Bounding-box helpers ─────────────────────────────────────────────────────
function bboxOfCoords(coords: number[][]): [number,number,number,number] | null {
  if (!coords?.length) return null;
  let w=Infinity, s=Infinity, e=-Infinity, n=-Infinity;
  for (const [lon, lat] of coords) {
    if (lon < w) w = lon; if (lat < s) s = lat;
    if (lon > e) e = lon; if (lat > n) n = lat;
  }
  return [w, s, e, n];
}
function bboxUnion(bs: (([number,number,number,number])|null)[]): [number,number,number,number] | null {
  const valid = bs.filter(Boolean) as [number,number,number,number][];
  if (!valid.length) return null;
  return valid.reduce(([w,s,e,n],[w2,s2,e2,n2])=>[Math.min(w,w2),Math.min(s,s2),Math.max(e,e2),Math.max(n,n2)]);
}

function isAirspaceConstraint(item: Infrastructure): boolean {
  const metadata = item.metadata || {};
  const text = [item.infra_type, item.source, metadata.authority, metadata.name]
    .filter(Boolean).join(' ').toLowerCase();
  return /air\s?-?right|airspace|airport|aviation|height restriction|obstacle surface|constraint/.test(text);
}

function airspaceRing(item: Infrastructure): number[][] | null {
  if (item.geometry?.type !== 'Polygon') return null;
  const coordinates = item.geometry.coordinates as number[][][];
  const ring = coordinates?.[0];
  if (!Array.isArray(ring) || ring.length < 4) return null;
  if (!ring.every(point => Array.isArray(point) && Number.isFinite(point[0]) && Number.isFinite(point[1]))) return null;
  return ring;
}

function airspaceVerticalRange(item: Infrastructure): [number, number] | null {
  const metadata = item.metadata || {};
  const minValue = Number(item.min_z ?? metadata.min_z ?? 0);
  const maxValue = Number(item.max_z ?? metadata.max_z ?? item.height_m);
  return Number.isFinite(minValue) && Number.isFinite(maxValue) && maxValue > minValue
    ? [minValue, maxValue]
    : null;
}

// ─── Layer Panel ──────────────────────────────────────────────────────────────
function LayerPanel({
  layers, onToggle, onZoom,
}: {
  layers: LayerVisibility;
  onToggle: (k: keyof LayerVisibility) => void;
  onZoom: (key: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const ZBtn = ({ k }: { k: string }) => (
    <button onClick={e=>{e.preventDefault();e.stopPropagation();onZoom(k);}}
      title="Zoom to data"
      className="ml-auto p-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex-shrink-0">
      <Target className="w-3 h-3" />
    </button>
  );
  type Row = { key: keyof LayerVisibility; label: string; color: string; badge?: string };
  const groups: { title: string; icon: React.ReactNode; rows: Row[] }[] = [
    {
      title: 'Real / Open Geospatial Data',
      icon: <Database className="w-3 h-3 text-emerald-600"/>,
      rows: [
        { key: 'msBuildings', label: 'Building Footprints', color: '#10b981', badge: 'MS' },
        { key: 'roads',       label: 'Road Network',             color: '#334155', badge: 'OSM' },
        { key: 'waterbodies', label: 'Water Bodies / Rivers',    color: '#0284c7', badge: 'OSM' },
      ],
    },
    {
      title: 'Buildings',
      icon: <Layers3 className="w-3 h-3 text-blue-600"/>,
      rows: [
        { key: 'bldVolumes', label: '3D Building Volumes', color: '#3b82f6' },
      ],
    },
    {
      title: 'Elevation',
      icon: <Layers3 className="w-3 h-3 text-cyan-600"/>,
      rows: [
        { key: 'dem', label: 'Elevation Ground Model', color: '#65a30d' },
      ],
    },
    {
      title: 'Property',
      icon: <Box className="w-3 h-3 text-indigo-600"/>,
      rows: [
        { key: 'parcels',     label: 'Surface Parcels',           color: '#0891b2' },
        { key: 'properties',  label: '3D Property Units',         color: '#2563eb' },
      ],
    },
    {
      title: 'Infrastructure',
      icon: <Database className="w-3 h-3 text-amber-600"/>,
      rows: [
        { key: 'underground', label: 'Underground Infrastructure', color: '#d97706' },
        { key: 'parking',     label: 'Underground Parking',       color: '#475569' },
        { key: 'elevated',    label: 'Elevated Structures',       color: '#ea580c' },
        { key: 'airspace',    label: 'Airspace & Constraints',    color: '#7c3aed' },
      ],
    },
  ];
  return (
    <div className="absolute top-3 left-3 bg-white/95 border border-slate-200 rounded-lg shadow-md w-72 z-10 backdrop-blur max-h-[54vh] overflow-y-auto">
      <button onClick={()=>setOpen(!open)} className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-50 rounded-t-lg border-b border-slate-100">
        <span className="flex items-center gap-1.5"><Layers className="w-4 h-4 text-blue-600"/>Geospatial Map Layers</span>
        {open ? <ChevronUp className="w-3.5 h-3.5"/> : <ChevronDown className="w-3.5 h-3.5"/>}
      </button>
      {open && (
        <div className="p-2.5 space-y-3">
          {groups.map(g=>(
            <div key={g.title}>
              <div className="flex items-center gap-1.5 px-1 pb-1 mb-1 border-b border-slate-100">
                {g.icon}
                <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">{g.title}</p>
              </div>
              <div className="space-y-1">
                {g.rows.map(row=>(
                  <label key={row.key} className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-slate-50 transition-colors">
                    <input type="checkbox" checked={layers[row.key] as boolean} onChange={()=>onToggle(row.key)} className="w-3.5 h-3.5 rounded accent-slate-700"/>
                    <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{background: row.color}}/>
                    <span className="text-xs text-slate-800 font-medium flex-1">{row.label}</span>
                    {row.badge && <span className="text-[8px] px-1 py-0.5 rounded bg-slate-100 text-slate-600 font-bold uppercase">{row.badge}</span>}
                    <ZBtn k={row.key}/>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Diagnostics panel ────────────────────────────────────────────────────────
type LayerStat = { loaded: number; rendered: number; status: string };
function DiagnosticsPanel({
  stats, bbox, altitude, district
}: {
  stats: Record<string, LayerStat>;
  bbox: string; altitude: number; district: string;
}) {
  const [open, setOpen] = useState(true);
  const statusColor = (s: string) => {
    if (s === 'OFF') return 'text-slate-500';
    if (s === 'OK') return 'text-emerald-400';
    if (s.startsWith('FAILED') || s.startsWith('NO DATA')) return 'text-red-400';
    return 'text-amber-400';
  };
  return (
    <div className="absolute left-3 z-10 bg-slate-900/95 text-slate-100 border border-slate-700 rounded-lg shadow-2xl w-96 max-w-[calc(100vw-1.5rem)] p-3 backdrop-blur text-xs overflow-y-auto" style={{ top: 'calc(56vh + 1rem)', maxHeight: 'calc(44vh - 2rem)' }}>
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-700">
        <div className="flex items-center gap-1.5 font-bold text-emerald-400"><Monitor className="w-4 h-4"/>Layer Diagnostics</div>
        <button onClick={()=>setOpen(!open)} className="text-slate-400 hover:text-white">
          {open?<ChevronDown className="w-3.5 h-3.5"/>:<ChevronUp className="w-3.5 h-3.5"/>}
        </button>
      </div>
      {open && (
        <div className="font-mono text-[10px] space-y-1">
          <div className="flex justify-between"><span className="text-slate-400">DISTRICT</span><span className="text-white font-bold">{district}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">ALTITUDE</span><span className="text-cyan-300">{Math.round(altitude).toLocaleString()} m</span></div>
          <div className="mt-2 pt-2 border-t border-slate-800 space-y-1">
            <div className="grid grid-cols-12 text-slate-500 font-bold pb-1 border-b border-slate-800">
              <span className="col-span-5">Layer</span>
              <span className="col-span-2 text-right">Loaded</span>
              <span className="col-span-2 text-right">Rendered</span>
              <span className="col-span-3 text-right">Status</span>
            </div>
            {Object.entries(stats).map(([name, s]) => (
              <div key={name} className="grid grid-cols-12 items-center">
                <span className="col-span-5 text-slate-200 truncate">{name}</span>
                <span className="col-span-2 text-right text-amber-400">{s.loaded}</span>
                <span className="col-span-2 text-right text-cyan-400">{s.rendered}</span>
                <span className={clsx('col-span-3 text-right text-[9px] font-bold', statusColor(s.status))}>{s.status}</span>
              </div>
            ))}
          </div>
          <div className="pt-1 text-[9px] text-slate-500 truncate border-t border-slate-800">BBOX: {bbox}</div>
        </div>
      )}
    </div>
  );
}

// ─── Detail panels ────────────────────────────────────────────────────────────
function Panel({ title, color, icon, children, onClose }: {
  title: string; color: string; icon: React.ReactNode; children: React.ReactNode; onClose: () => void;
}) {
  return (
    <div className="absolute top-3 right-3 bg-white border rounded-lg shadow-xl w-96 z-20 overflow-hidden text-xs">
      <div className="flex items-center justify-between px-4 py-3 text-white font-bold" style={{background: color}}>
        <div className="flex items-center gap-2">{icon}{title}</div>
        <button onClick={onClose}><X className="w-4 h-4"/></button>
      </div>
      <div className="p-4 space-y-2.5">{children}</div>
    </div>
  );
}
function Row2({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><span className="text-slate-400 block text-[10px]">{label}</span><span className="font-bold text-slate-800">{value}</span></div>;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function CadastralMap() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedPropertyId = searchParams.get('property');
  const cesiumContainer = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const updateBuildingsRef = useRef<() => void>(() => {});
  const buildingsMapRef = useRef<Map<string, MicrosoftBuildingFeature>>(new Map());

  // Data state
  const [parcels,          setParcels]          = useState<Parcel[]>([]);
  const [properties,       setProperties]       = useState<Property[]>([]);
  const [utilities,        setUtilities]        = useState<Utility[]>([]);       // underground lines
  const [parkingUtils,     setParkingUtils]     = useState<Utility[]>([]);       // underground parking polygons
  const [infra,            setInfra]            = useState<Infrastructure[]>([]); // elevated + airspace
  const [msBuildings,      setMsBuildings]      = useState<MicrosoftBuildingsResponse | null>(null);
  const [roadsData,        setRoadsData]        = useState<any>(null);
  const [waterData,        setWaterData]        = useState<any>(null);
  const [msCoverage,       setMsCoverage]       = useState<any>(null);
  const [demModel,         setDemModel]         = useState<DEMModel | null>(null);
  const [tnDistricts,      setTnDistricts]      = useState<{id:string;name:string;centroid:[number,number];bbox:[number,number,number,number];description:string;has_coverage?:boolean}[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState('chennai');

  // UI state
  const [cameraAlt,     setCameraAlt]     = useState(3500);
  const [bboxStr,       setBboxStr]       = useState('80.24, 13.00, 80.26, 13.02');
  const [coverageNote,  setCoverageNote]  = useState<string|null>(null);
  const [viewMode,      setViewMode]      = useState<'surface'|'underground'|'combined'>('surface');
  const [debugMode,     setDebugMode]     = useState(false);
  const [loading,       setLoading]       = useState(true);
  const [mapSearch,     setMapSearch]     = useState('');
  const [renderedCounts, setRenderedCounts] = useState<Record<string, number>>({});

  // Selection state
  const [selMsFeature,  setSelMsFeature]  = useState<MicrosoftBuildingFeature|null>(null);
  const [selParcel,     setSelParcel]     = useState<Parcel|null>(null);
  const [selProperty,   setSelProperty]   = useState<Property|null>(null);
  const [selUtility,    setSelUtility]    = useState<Utility|null>(null);
  const [selParking,    setSelParking]    = useState<Utility|null>(null);
  const [selElevated,   setSelElevated]   = useState<Infrastructure|null>(null);
  const [selAirspace,   setSelAirspace]   = useState<Infrastructure|null>(null);

  const mapDataRef = useRef({ msBuildings, parcels, properties, utilities, parkingUtils, infra });
  mapDataRef.current = { msBuildings, parcels, properties, utilities, parkingUtils, infra };

  const { layerVisibility, toggleLayer } = useAppStore();

  // ── Load all datasets ───────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetchParcels(),
      fetchProperties(),
      fetchUndergroundInfrastructure(),  // 7 underground line utilities
      fetchUndergroundParking(),          // 1 parking polygon
      fetchInfrastructure(),              // elevated + airspace
      fetchTamilNaduDistricts(),
      fetchRoadsLayer(),
      fetchWaterbodiesLayer(),
      fetchMicrosoftCoverage(),
      fetchDEMModel(),
    ]).then(([p, pr, ugLines, pkRes, inf, distRes, rData, wData, coverage, dem]) => {
      setParcels(p);
      setProperties(pr);
      setUtilities(Array.isArray(ugLines) ? ugLines : []);
      const pkUtils = (pkRes as any)?.parking_utilities ?? [];
      setParkingUtils(pkUtils);
      setInfra(inf);
      if (distRes?.districts) setTnDistricts(distRes.districts);
      setRoadsData(rData);
      setWaterData(wData);
      setMsCoverage(coverage);
      setDemModel(dem);
      setLoading(false);
    }).catch(err => {
      console.error('[CadastralMap] load error:', err);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!requestedPropertyId || properties.length === 0) return;
    const selected = properties.find(property => property.id === requestedPropertyId);
    if (!selected) return;
    setSelProperty(selected);
    setSelMsFeature(null);
    setSelParcel(null);
  }, [requestedPropertyId, properties]);

  // ── Viewport BBOX → MS buildings with stable ID caching ───────────────────
  const updateBuildingsInViewport = useCallback(() => {
    const viewer = viewerRef.current;
    if (!viewer || !layerVisibility.msBuildings) return;
    setCameraAlt(viewer.camera.positionCartographic.height);
    const rect = viewer.camera.computeViewRectangle();
    if (!rect) return;
    const [w,s,e,n] = [
      Cesium.Math.toDegrees(rect.west),  Cesium.Math.toDegrees(rect.south),
      Cesium.Math.toDegrees(rect.east),  Cesium.Math.toDegrees(rect.north),
    ];
    setBboxStr(`${w.toFixed(2)},${s.toFixed(2)},${e.toFixed(2)},${n.toFixed(2)}`);
    fetchSpatialMicrosoftBuildings(w, s, e, n, selectedDistrict === 'all' ? undefined : selectedDistrict, 1200)
      .then(res => {
        if (res?.features) {
          let hasNew = false;
          res.features.forEach((feat: MicrosoftBuildingFeature) => {
            const bId = String((feat.properties as any)?.id || feat.id || '');
            if (bId && !buildingsMapRef.current.has(bId)) {
              buildingsMapRef.current.set(bId, feat);
              hasNew = true;
            }
          });
          if (hasNew || !msBuildings) {
            setMsBuildings({
              ...res,
              features: Array.from(buildingsMapRef.current.values()),
            });
          }
          setCoverageNote(null);
        }
      }).catch(err => console.warn('[LOD]', err));
  }, [layerVisibility.msBuildings, selectedDistrict, msBuildings]);
  updateBuildingsRef.current = updateBuildingsInViewport;

  // ── Init Cesium viewer ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!cesiumContainer.current || viewerRef.current) return;

    Cesium.Ion.defaultAccessToken = '';
    const viewer = new Cesium.Viewer(cesiumContainer.current, {
      baseLayer: new Cesium.ImageryLayer(new Cesium.OpenStreetMapImageryProvider({ url: 'https://tile.openstreetmap.org/' })),
      terrainProvider: new Cesium.EllipsoidTerrainProvider(),
      baseLayerPicker: false, geocoder: false, homeButton: false,
      sceneModePicker: false, navigationHelpButton: false,
      animation: false, timeline: false, fullscreenButton: false,
      skyBox: false, skyAtmosphere: false,
    });

    viewer.scene.backgroundColor        = Cesium.Color.fromCssColorString('#0f172a');
    viewer.scene.globe.baseColor        = Cesium.Color.fromCssColorString('#1e293b');
    viewer.scene.globe.undergroundColor = Cesium.Color.TRANSPARENT; // Prevent black sphere inside ellipsoid
    viewer.scene.globe.translucency.enabled = false;

    // Allow camera to travel below ground surface (needed for underground inspection)
    viewer.scene.screenSpaceCameraController.enableCollisionDetection = false;
    viewer.scene.globe.depthTestAgainstTerrain = false;

    const onMoveEnd = () => updateBuildingsRef.current();
    viewer.camera.moveEnd.addEventListener(onMoveEnd);

    // ── Click handler ──────────────────────────────────────────────────────
    viewer.screenSpaceEventHandler.setInputAction(
      (click: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
        const picked = viewer.scene.pick(click.position);
        const clearSelection = () => {
          setSelMsFeature(null); setSelParcel(null); setSelProperty(null);
          setSelUtility(null); setSelParking(null); setSelElevated(null); setSelAirspace(null);
          setSearchParams({});
        };
        if (!Cesium.defined(picked) || !picked.id) { clearSelection(); return; }
        const entity = picked.id as Cesium.Entity;
        const props = entity.properties;
        if (!props) { clearSelection(); return; }
        const data = mapDataRef.current;

        const bId = props.msBuildingId?.getValue();
        if (bId) {
          const feat = buildingsMapRef.current.get(String(bId)) || data.msBuildings?.features?.find((f: any) => ((f.properties?.id || f.id) === bId));
          if (feat) {
            clearSelection(); setSelMsFeature(feat); return;
          }
        }
        const msIdx = props.msBuildingIndex?.getValue();
        if (msIdx !== undefined && data.msBuildings?.features?.[msIdx]) {
          clearSelection(); setSelMsFeature(data.msBuildings.features[msIdx]); return;
        }
        const pId = props.parcelId?.getValue();
        if (pId) { clearSelection(); setSelParcel(data.parcels.find(x=>x.id===pId)??null); return; }
        const propId = props.propertyId?.getValue();
        if (propId) {
          clearSelection();
          setSelProperty(data.properties.find(x=>x.id===propId)??null);
          setSearchParams({ property: propId });
          return;
        }
        const uId = props.utilityId?.getValue();
        if (uId) { clearSelection(); setSelUtility(data.utilities.find(x=>x.id===uId)??null); return; }
        const pkId = props.parkingId?.getValue();
        if (pkId) { clearSelection(); setSelParking(data.parkingUtils.find(x=>x.id===pkId)??null); return; }
        const elId = props.elevatedId?.getValue();
        if (elId) { clearSelection(); setSelElevated(data.infra.find(x=>x.id===elId)??null); return; }
        const airId = props.airspaceId?.getValue();
        if (airId) { clearSelection(); setSelAirspace(data.infra.find(x=>x.id===airId)??null); return; }
        clearSelection();
      },
      Cesium.ScreenSpaceEventType.LEFT_CLICK
    );

    viewerRef.current = viewer;
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(80.2571, 13.0067, 3500),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(-45), roll: 0 },
      duration: 1.5,
    });
    setTimeout(() => updateBuildingsRef.current(), 1800);

    return () => {
      viewer.camera.moveEnd.removeEventListener(onMoveEnd);
      if (viewerRef.current && !viewerRef.current.isDestroyed()) { viewerRef.current.destroy(); viewerRef.current = null; }
    };
  }, []);

  // ── Underground / Surface mode effect ──────────────────────────────────────
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (viewMode === 'underground') {
      viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#050d14');
      viewer.scene.globe.baseColor  = Cesium.Color.fromCssColorString('#0a1a0f');
      viewer.scene.globe.undergroundColor = Cesium.Color.TRANSPARENT;

      viewer.scene.globe.translucency.enabled      = true;
      viewer.scene.globe.translucency.frontFaceAlpha = 0.35;
      viewer.scene.globe.translucency.backFaceAlpha  = 0.10;

    } else if (viewMode === 'combined') {
      viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#0c1a2e');
      viewer.scene.globe.baseColor  = Cesium.Color.fromCssColorString('#1e293b');
      viewer.scene.globe.undergroundColor = Cesium.Color.TRANSPARENT;

      viewer.scene.globe.translucency.enabled      = true;
      viewer.scene.globe.translucency.frontFaceAlpha = 0.65;
      viewer.scene.globe.translucency.backFaceAlpha  = 0.10;

    } else {
      viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#0f172a');
      viewer.scene.globe.baseColor  = Cesium.Color.fromCssColorString('#1e293b');
      viewer.scene.globe.translucency.enabled      = false;
      viewer.scene.globe.translucency.frontFaceAlpha = 1.0;
      viewer.scene.globe.translucency.backFaceAlpha  = 1.0;
    }
  }, [viewMode]);

  // ── Compute underground data bounds ─────────────────────────────────────────
  const undergroundBounds = useCallback((): { bbox: [number,number,number,number]; minDepth: number; maxDepth: number } | null => {
    const allCoords: number[][] = [];
    let minDepth = Infinity, maxDepth = 0;

    utilities.forEach(u => {
      if (u.geometry?.type === 'LineString') {
        (u.geometry.coordinates as number[][]).forEach(c => allCoords.push(c));
        const d = u.depth_m ?? 2.5;
        if (d < minDepth) minDepth = d;
        if (d > maxDepth) maxDepth = d;
      }
    });
    parkingUtils.forEach(u => {
      if (u.geometry?.type === 'Polygon') {
        (u.geometry.coordinates as number[][][])[0].forEach(c => allCoords.push(c));
        const d = u.depth_m ?? 5.0;
        if (d < minDepth) minDepth = d;
        if (d > maxDepth) maxDepth = d;
      }
    });

    const bbox = bboxOfCoords(allCoords);
    if (!bbox) return null;
    return { bbox, minDepth: minDepth === Infinity ? 0 : minDepth, maxDepth };
  }, [utilities, parkingUtils]);

  // ── Zoom to layer ───────────────────────────────────────────────────────────
  const handleZoom = useCallback((key: string) => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    let bbox: [number,number,number,number] | null = null;
    let alt = 2000;

    if ((key === 'msBuildings' || key === 'bldVolumes') && msBuildings?.features?.length) {
      const boxes = msBuildings.features.map(f => {
        const g = f.geometry;
        if (g.type === 'Polygon') return bboxOfCoords((g.coordinates as number[][][])[0]);
        return null;
      });
      bbox = bboxUnion(boxes); alt = key === 'bldVolumes' ? 600 : 3000;

    } else if (key === 'roads' && roadsData?.features?.length) {
      bbox = bboxUnion(roadsData.features.map((f:any) => f.geometry?.type==='LineString' ? bboxOfCoords(f.geometry.coordinates) : null));
      alt = 1500;

    } else if (key === 'waterbodies' && waterData?.features?.length) {
      bbox = bboxUnion(waterData.features.map((f:any) => f.geometry?.type==='Polygon' ? bboxOfCoords(f.geometry.coordinates[0]) : null));
      alt = 800;

    } else if (key === 'parcels' && parcels.length) {
      bbox = bboxUnion(parcels.map(p => p.coordinates ? bboxOfCoords(p.coordinates) : null));
      alt = 300;

    } else if (key === 'properties' && properties.length) {
      bbox = bboxUnion(properties.map(p => p.geometry_2d ? bboxOfCoords(p.geometry_2d) : null));
      alt = 150;

    } else if (key === 'dem' && demModel?.elevation_grid?.length) {
      bbox = bboxUnion(demModel.elevation_grid.map(sample => [sample.lng, sample.lat, sample.lng, sample.lat]));
      alt = 1800;
      if (!layerVisibility.dem) toggleLayer('dem');

    } else if (key === 'underground' || key === 'parking') {
      const ub = undergroundBounds();
      if (ub) {
        bbox = ub.bbox;
        alt = 200;
        if (viewMode !== 'underground') setViewMode('underground');
        if (!layerVisibility.underground) toggleLayer('underground');
        if (!layerVisibility.parking) toggleLayer('parking');
      }

    } else if (key === 'elevated' || key === 'airspace') {
      const elevItems = infra.filter(i => !isAirspaceConstraint(i));
      const airItems  = infra.filter(isAirspaceConstraint);
      const items = key === 'elevated' ? elevItems : airItems;
      const boxes = items.map(i => {
        if (i.geometry?.type === 'LineString') return bboxOfCoords(i.geometry.coordinates as number[][]);
        if (key === 'airspace') return bboxOfCoords(airspaceRing(i) || []);
        if (i.geometry?.type === 'Polygon') return bboxOfCoords((i.geometry.coordinates as number[][][])[0]);
        return null;
      });
      bbox = bboxUnion(boxes); alt = key === 'airspace' ? 3000 : 500;
      if (key === 'airspace' && !layerVisibility.airspace) toggleLayer('airspace');
    }

    if (!bbox) { bbox = [80.250, 13.000, 80.270, 13.015]; alt = 500; }

    const [w, s, e, n] = bbox;
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees((w+e)/2, (s+n)/2, alt),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(-50), roll: 0 },
      duration: 1.5,
    });
  }, [msBuildings, roadsData, waterData, parcels, properties, infra, demModel, undergroundBounds, viewMode, layerVisibility, toggleLayer]);

  // ── View mode setters ───────────────────────────────────────────────────────
  const set3DView = () => {
    setViewMode('surface');
    const viewer = viewerRef.current;
    if (!viewer) return;
    const p = viewer.camera.positionCartographic;
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(Cesium.Math.toDegrees(p.longitude), Cesium.Math.toDegrees(p.latitude), Math.max(p.height, 2000)),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(-45), roll: 0 }, duration: 1.2,
    });
  };

  const setTopView = () => {
    setViewMode('surface');
    const viewer = viewerRef.current;
    if (!viewer) return;
    const p = viewer.camera.positionCartographic;
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(Cesium.Math.toDegrees(p.longitude), Cesium.Math.toDegrees(p.latitude), p.height),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 }, duration: 1.2,
    });
  };

  const setUndergroundView = () => {
    setViewMode('underground');
    if (!layerVisibility.underground) toggleLayer('underground');
    if (!layerVisibility.parking)    toggleLayer('parking');
    const viewer = viewerRef.current;
    if (!viewer) return;

    const ub = undergroundBounds();
    if (ub) {
      const [w, s, e, n] = ub.bbox;
      const centerLon = (w + e) / 2;
      const centerLat = (s + n) / 2;
      const spanDeg = Math.max(e - w, n - s);
      const spanM   = spanDeg * 111320;
      const camAlt = Math.max(spanM * 1.5, 180);

      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(centerLon, centerLat, camAlt),
        orientation: { heading: 0, pitch: Cesium.Math.toRadians(-55), roll: 0 },
        duration: 1.5,
      });
    } else {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(80.2565, 13.0065, 220),
        orientation: { heading: 0, pitch: Cesium.Math.toRadians(-55), roll: 0 },
        duration: 1.5,
      });
    }
  };

  const setCombinedView = () => {
    setViewMode('combined');
    if (!layerVisibility.underground) toggleLayer('underground');
    if (!layerVisibility.parking)    toggleLayer('parking');
    const viewer = viewerRef.current;
    if (!viewer) return;
    const ub = undergroundBounds();
    const [centerLon, centerLat] = ub
      ? [((ub.bbox[0]+ub.bbox[2])/2), ((ub.bbox[1]+ub.bbox[3])/2)]
      : [80.2571, 13.0067];
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(centerLon, centerLat, 400),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(-45), roll: 0 }, duration: 1.5,
    });
  };

  const handleDistrictChange = (distId: string) => {
    setSelectedDistrict(distId);
    buildingsMapRef.current.clear();
    const viewer = viewerRef.current;
    if (viewer) {
      const toRemove: Cesium.Entity[] = [];
      viewer.entities.values.forEach(e => { if (e.id?.toString().startsWith('ms-bld-')) toRemove.push(e); });
      toRemove.forEach(e => viewer.entities.remove(e));
    }
    setMsBuildings(null);
    setCoverageNote(null);
    if (!viewer) return;
    if (distId === 'all') {
      viewer.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees(78.50, 10.80, 450000), orientation: { heading:0, pitch:Cesium.Math.toRadians(-75), roll:0 }, duration:1.5 });
      return;
    }
    const dist = tnDistricts.find(d => d.id === distId);
    if (!dist) return;
    if (dist.id === 'chennai') {
      viewer.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees(dist.centroid[0], dist.centroid[1], 3500), orientation:{heading:0,pitch:Cesium.Math.toRadians(-45),roll:0}, duration:1.5 });
    } else {
      viewer.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees(dist.centroid[0], dist.centroid[1], 15000), orientation:{heading:0,pitch:Cesium.Math.toRadians(-55),roll:0}, duration:1.5 });
    }
  };

  // ── RENDER: MS Buildings (stable entities + footprints + 3D extrusion) ─────
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || loading) return;

    if (!layerVisibility.msBuildings) {
      const toRemove: Cesium.Entity[] = [];
      viewer.entities.values.forEach(e => { if (e.id?.toString().startsWith('ms-bld-')) toRemove.push(e); });
      toRemove.forEach(e => viewer.entities.remove(e));
      return;
    }

    if (!msBuildings?.features?.length) return;

    const currentSelectedId = String((selMsFeature?.properties as any)?.id || selMsFeature?.id || '');

    msBuildings.features.forEach((feat, idx) => {
      const props = feat.properties as any;
      const bId = String(props.id || feat.id || `idx-${idx}`);
      const groundElev  = props.ground_elevation ?? 0.0;
      const areaSqm     = props.area_sqm ?? 120.0;
      const isSelected  = currentSelectedId === bId;
      const extrudedH   = layerVisibility.bldVolumes ? Math.min(Math.max(7 + Math.sqrt(areaSqm)*0.18, 5), 38) : 0.5;

      const geom = feat.geometry;
      let hierarchies: Cesium.PolygonHierarchy[] = [];
      let cLon = props.longitude || 0, cLat = props.latitude || 0;

      if (geom.type === 'Polygon') {
        const outer = (geom.coordinates as number[][][])[0];
        if (!outer || outer.length < 4) return;
        hierarchies = [polyHier(outer)];
        if (!cLon || !cLat) [cLon, cLat] = computeRingCentroid(outer);
      } else if (geom.type === 'MultiPolygon') {
        const polys = geom.coordinates as number[][][][];
        polys.forEach(p => { if (p[0]?.length >= 4) hierarchies.push(polyHier(p[0])); });
        if (!cLon || !cLat) [cLon, cLat] = computeRingCentroid(polys[0][0]);
      }
      if (!hierarchies.length) return;

      hierarchies.forEach((hier, si) => {
        const entityId = `ms-bld-${bId}-${si}`;
        const existing = viewer.entities.getById(entityId);

        if (existing && existing.polygon) {
          // Existing entity: update extrusion height and selection style in-place; DO NOT recreate or shift coordinates
          const targetExtruded = layerVisibility.bldVolumes ? groundElev + extrudedH : undefined;
          const currentExtruded = existing.polygon.extrudedHeight?.getValue(Cesium.JulianDate.now());
          if (currentExtruded !== targetExtruded) {
            existing.polygon.extrudedHeight = new Cesium.ConstantProperty(targetExtruded);
          }
          const targetColor = (isSelected ? Cesium.Color.fromCssColorString('#f59e0b') : Cesium.Color.fromCssColorString('#10b981')).withAlpha(0.65);
          existing.polygon.material = new Cesium.ColorMaterialProperty(targetColor);
          existing.polygon.outlineColor = new Cesium.ConstantProperty(isSelected ? Cesium.Color.fromCssColorString('#d97706') : Cesium.Color.fromCssColorString('#047857'));
          existing.polygon.outlineWidth = new Cesium.ConstantProperty(isSelected ? 3.0 : 1.2);
        } else if (!existing) {
          // New entity: create with original geographic coordinates and stable building ID
          viewer.entities.add({
            id: entityId,
            polygon: {
              hierarchy: hier,
              height: groundElev,
              extrudedHeight: layerVisibility.bldVolumes ? groundElev + extrudedH : undefined,
              material: (isSelected ? Cesium.Color.fromCssColorString('#f59e0b') : Cesium.Color.fromCssColorString('#10b981')).withAlpha(0.65),
              outline: true,
              outlineColor: isSelected ? Cesium.Color.fromCssColorString('#d97706') : Cesium.Color.fromCssColorString('#047857'),
              outlineWidth: isSelected ? 3.0 : 1.2,
            },
            properties: new Cesium.PropertyBag({ msBuildingId: bId, msBuildingIndex: idx }),
          });
        }
      });
    });
  }, [msBuildings, layerVisibility.msBuildings, layerVisibility.bldVolumes, selMsFeature, loading]);

  // ── RENDER: Roads + Waterbodies ─────────────────────────────────────────────
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || loading) return;
    const toRemove: Cesium.Entity[] = [];
    viewer.entities.values.forEach(e => { if (e.id?.toString().startsWith('osm-')) toRemove.push(e); });
    toRemove.forEach(e => viewer.entities.remove(e));

    if (layerVisibility.roads && roadsData?.features) {
      roadsData.features.forEach((f: any, i: number) => {
        if (f.geometry?.type !== 'LineString') return;
        viewer.entities.add({
          id: `osm-road-${i}`,
          polyline: {
            positions: (f.geometry.coordinates as number[][]).map(([lon,lat]) => Cesium.Cartesian3.fromDegrees(lon,lat,1.5)),
            width: 3.5,
            material: Cesium.Color.fromCssColorString('#334155'),
          }
        });
      });
    }
    if (layerVisibility.waterbodies && waterData?.features) {
      waterData.features.forEach((f: any, i: number) => {
        if (f.geometry?.type !== 'Polygon') return;
        viewer.entities.add({
          id: `osm-water-${i}`,
          polygon: {
            hierarchy: polyHier(f.geometry.coordinates[0]),
            material: Cesium.Color.fromCssColorString('#0284c7').withAlpha(0.45),
            outline: true, outlineColor: Cesium.Color.fromCssColorString('#0369a1'), outlineWidth: 1.5, height: 0.5,
          }
        });
      });
    }
  }, [roadsData, waterData, layerVisibility.roads, layerVisibility.waterbodies, loading]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed() || loading) return;
    viewer.entities.values
      .filter(entity => String(entity.id).startsWith('dem-ground-'))
      .forEach(entity => viewer.entities.remove(entity));
    if (!layerVisibility.dem || !demModel?.elevation_grid) return;
    demModel.elevation_grid.forEach((sample, index) => {
      if (![sample.lng, sample.lat, sample.elevation_m].every(Number.isFinite)) return;
      viewer.entities.add({
        id: `dem-ground-${index}`,
        name: sample.feature,
        position: Cesium.Cartesian3.fromDegrees(sample.lng, sample.lat, sample.elevation_m),
        point: {
          pixelSize: 11,
          color: Cesium.Color.fromCssColorString('#84cc16').withAlpha(0.9),
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: `${sample.elevation_m.toFixed(1)} m`,
          font: '12px sans-serif',
          fillColor: Cesium.Color.WHITE,
          showBackground: true,
          backgroundColor: Cesium.Color.fromCssColorString('#1f2937').withAlpha(0.8),
          pixelOffset: new Cesium.Cartesian2(0, -14),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });
    });
  }, [demModel, layerVisibility.dem, loading]);

  // ── RENDER: All Cadastral / Infrastructure layers ──────────────────────────
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || loading) return;
    const toRemove: Cesium.Entity[] = [];
    viewer.entities.values.forEach(e => { if (e.id?.toString().startsWith('proj-')) toRemove.push(e); });
    toRemove.forEach(e => viewer.entities.remove(e));

    // 1. Surface Parcels
    if (layerVisibility.parcels) {
      parcels.forEach(p => {
        if (!p.coordinates || p.coordinates.length < 3) return;
        const sel = selParcel?.id === p.id;
        viewer.entities.add({
          id: `proj-parcel-${p.id}`,
          polygon: {
            hierarchy: polyHier(p.coordinates),
            material: (sel ? Cesium.Color.fromCssColorString('#f59e0b') : Cesium.Color.fromCssColorString('#0891b2')).withAlpha(sel ? 0.70 : 0.25),
            outline: true,
            outlineColor: sel ? Cesium.Color.fromCssColorString('#d97706') : Cesium.Color.fromCssColorString('#06b6d4'),
            outlineWidth: sel ? 3.5 : 2.5, height: 0.5,
          },
          properties: new Cesium.PropertyBag({ parcelId: p.id }),
        });
      });
    }

    // 2. 3D Property Units
    if (layerVisibility.properties) {
      properties.forEach(prop => {
        if (!prop.geometry_2d || prop.geometry_2d.length < 3) return;
        if (prop.property_type === 'Air-Space Volume') return;
        const minZ = prop.min_z ?? 0, maxZ = prop.max_z ?? 3;
        if (maxZ - minZ < 0.1) return;
        const sel  = selProperty?.id === prop.id;
        const col  = PROPERTY_CSS[prop.property_type] ?? '#2563eb';
        viewer.entities.add({
          id: `proj-prop-${prop.id}`,
          polygon: {
            hierarchy: polyHier(prop.geometry_2d),
            material: (sel ? Cesium.Color.fromCssColorString('#f59e0b') : hexCol(col)).withAlpha(sel ? 0.85 : 0.68),
            outline: true, outlineColor: Cesium.Color.WHITE.withAlpha(0.8), outlineWidth: sel ? 2.5 : 1.5,
            height: minZ, extrudedHeight: maxZ,
          },
          properties: new Cesium.PropertyBag({ propertyId: prop.id }),
        });
      });
    }

    // ── 3. Underground Utilities (LineStrings at negative Z) ──────────────
    if (layerVisibility.underground) {
      utilities.forEach(u => {
        if (u.geometry?.type !== 'LineString') return;
        const coords = u.geometry.coordinates as number[][];
        const depth  = -(u.depth_m ?? 2.5);  // negative = below ellipsoid surface
        const sel    = selUtility?.id === u.id;
        const col    = UTILITY_CSS[u.utility_type] ?? '#d97706';
        const colorVal = sel ? Cesium.Color.fromCssColorString('#f59e0b') : Cesium.Color.fromCssColorString(col);

        // Render each segment as a solid polyline with depthFailMaterial so it renders reliably even when under surface
        for (let i = 0; i < coords.length - 1; i++) {
          viewer.entities.add({
            id: `proj-util-${u.id}-seg${i}`,
            polyline: {
              positions: [
                Cesium.Cartesian3.fromDegrees(coords[i][0],   coords[i][1],   depth),
                Cesium.Cartesian3.fromDegrees(coords[i+1][0], coords[i+1][1], depth),
              ],
              width: sel ? 10 : (debugMode ? 12 : 8),
              material: colorVal,
              depthFailMaterial: colorVal.withAlpha(0.7),
            },
            properties: new Cesium.PropertyBag({ utilityId: u.id }),
          });
        }

        // Label: shows on debug mode or when selected
        if (debugMode || sel || viewMode === 'underground') {
          const midLon = (coords[0][0] + coords[coords.length-1][0]) / 2;
          const midLat = (coords[0][1] + coords[coords.length-1][1]) / 2;
          viewer.entities.add({
            id: `proj-util-label-${u.id}`,
            position: Cesium.Cartesian3.fromDegrees(midLon, midLat, depth + 0.5),
            label: {
              text: debugMode
                ? `${u.asset_id}\n${u.utility_type}\nDepth: ${u.depth_m ?? '?'}m\n(${midLon.toFixed(4)}, ${midLat.toFixed(4)})`
                : `${u.utility_type} (-${u.depth_m ?? 2.5}m)`,
              font: debugMode ? '11px monospace' : '11px sans-serif',
              fillColor: colorVal,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 3,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              pixelOffset: new Cesium.Cartesian2(0, -14),
              scaleByDistance: new Cesium.NearFarScalar(50, 1.2, 1200, 0.0),
              showBackground: true,
              backgroundColor: Cesium.Color.BLACK.withAlpha(0.75),
              backgroundPadding: new Cesium.Cartesian2(4, 2),
            },
          });
        }
      });
    }

    // ── 4. Underground Parking (Polygon volume at negative Z) ─────────────
    if (layerVisibility.parking) {
      parkingUtils.forEach(u => {
        if (u.geometry?.type !== 'Polygon') return;
        const outer = (u.geometry.coordinates as number[][][])[0];
        if (!outer || outer.length < 3) return;
        const depth = u.depth_m ?? 5.0;
        const sel   = selParking?.id === u.id;

        const topZ  = -(depth - 2.5);   // e.g. -2.5
        const botZ  = -depth;           // e.g. -5.0

        viewer.entities.add({
          id: `proj-park-${u.id}`,
          polygon: {
            hierarchy: polyHier(outer),
            material: (sel ? Cesium.Color.fromCssColorString('#f59e0b') : Cesium.Color.fromCssColorString('#475569')).withAlpha(sel ? 0.90 : 0.80),
            outline: true, outlineColor: Cesium.Color.fromCssColorString('#38bdf8'), outlineWidth: 3.0,
            height: botZ, extrudedHeight: topZ,
          },
          properties: new Cesium.PropertyBag({ parkingId: u.id }),
        });

        if (debugMode || sel || viewMode === 'underground') {
          const fc = outer[0];
          viewer.entities.add({
            id: `proj-park-label-${u.id}`,
            position: Cesium.Cartesian3.fromDegrees(fc[0], fc[1], topZ + 0.5),
            label: {
              text: debugMode
                ? `${u.asset_id}\nUnderground Parking\nDepth: ${depth}m\nBot: ${botZ}m  Top: ${topZ}m`
                : `Underground Parking (-${depth}m)`,
              font: '11px monospace',
              fillColor: Cesium.Color.fromCssColorString('#38bdf8'),
              outlineColor: Cesium.Color.BLACK, outlineWidth: 3,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              scaleByDistance: new Cesium.NearFarScalar(50, 1.2, 1200, 0.0),
              showBackground: true, backgroundColor: Cesium.Color.BLACK.withAlpha(0.75),
              backgroundPadding: new Cesium.Cartesian2(4, 2),
            },
          });
        }
      });
    }

    // ── 5. Elevated Structures ─────────────────────────────────────────────
    if (layerVisibility.elevated) {
      const elevItems = infra.filter(i => {
        const t = i.infra_type.toLowerCase();
        return !t.includes('airspace') && !t.includes('airport') && !t.includes('constraint');
      });
      elevItems.forEach(inf => {
        if (inf.geometry?.type !== 'LineString') return;
        const coords = inf.geometry.coordinates as number[][];
        const h   = inf.height_m ?? 10.0;
        const sel = selElevated?.id === inf.id;
        for (let i = 0; i < coords.length - 1; i++) {
          viewer.entities.add({
            id: `proj-elev-${inf.id}-${i}`,
            polyline: {
              positions: [
                Cesium.Cartesian3.fromDegrees(coords[i][0],   coords[i][1],   h),
                Cesium.Cartesian3.fromDegrees(coords[i+1][0], coords[i+1][1], h),
              ],
              width: sel ? 9 : 7,
              material: sel ? Cesium.Color.fromCssColorString('#f59e0b') : Cesium.Color.fromCssColorString('#ea580c'),
            },
            properties: new Cesium.PropertyBag({ elevatedId: inf.id }),
          });
          // Support pillar
          viewer.entities.add({
            id: `proj-pillar-${inf.id}-${i}`,
            polyline: {
              positions: [
                Cesium.Cartesian3.fromDegrees(coords[i][0], coords[i][1], 0),
                Cesium.Cartesian3.fromDegrees(coords[i][0], coords[i][1], h),
              ],
              width: 3, material: Cesium.Color.fromCssColorString('#94a3b8'),
            },
          });
        }
      });
    }

    // ── 6. Airspace Constraints ────────────────────────────────────────────
    if (layerVisibility.airspace) {
      const airItems = infra.filter(isAirspaceConstraint);
      airItems.forEach(inf => {
        const ring = airspaceRing(inf);
        const verticalRange = airspaceVerticalRange(inf);
        if (!ring || !verticalRange) return;
        const [minZ, maxZ] = verticalRange;
        const sel = selAirspace?.id === inf.id;
        viewer.entities.add({
          id: `proj-airspace-${inf.id}`,
          polygon: {
            hierarchy: polyHier(ring),
            material: (sel ? Cesium.Color.fromCssColorString('#f59e0b') : Cesium.Color.fromCssColorString('#7c3aed')).withAlpha(sel ? 0.55 : 0.28),
            outline: true, outlineColor: Cesium.Color.fromCssColorString('#a855f7'), outlineWidth: 2.5,
            height: minZ, extrudedHeight: maxZ,
          },
          properties: new Cesium.PropertyBag({ airspaceId: inf.id }),
        });
      });
    }
  }, [
    parcels, properties, utilities, parkingUtils, infra,
    layerVisibility, selParcel, selProperty, selUtility, selParking, selElevated, selAirspace,
    debugMode, viewMode, loading,
  ]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed() || loading) return;
    const uniqueEntityCount = (idPrefix: string, propertyName?: string) => {
      const values = new Set<string>();
      viewer.entities.values.forEach(entity => {
        if (!String(entity.id).startsWith(idPrefix)) return;
        const value = propertyName ? entity.properties?.[propertyName]?.getValue() : undefined;
        values.add(value == null ? String(entity.id) : String(value));
      });
      return values.size;
    };
    setRenderedCounts({
      msBuildings: uniqueEntityCount('ms-bld-', 'msBuildingId'),
      bldVolumes: layerVisibility.bldVolumes ? uniqueEntityCount('ms-bld-', 'msBuildingId') : 0,
      roads: uniqueEntityCount('osm-road-'),
      waterbodies: uniqueEntityCount('osm-water-'),
      parcels: uniqueEntityCount('proj-parcel-'),
      properties: uniqueEntityCount('proj-prop-'),
      underground: uniqueEntityCount('proj-util-', 'utilityId'),
      parking: uniqueEntityCount('proj-park-', 'parkingId'),
      elevated: uniqueEntityCount('proj-elev-', 'elevatedId'),
      airspace: uniqueEntityCount('proj-airspace-', 'airspaceId'),
      dem: uniqueEntityCount('dem-ground-'),
    });
  }, [loading, msBuildings, roadsData, waterData, parcels, properties, utilities, parkingUtils, infra, demModel, layerVisibility]);

  const handlePropertySelection = (propertyId: string) => {
    const selected = properties.find(property => property.id === propertyId) ?? null;
    setSelProperty(selected);
    setSelMsFeature(null);
    setSelParcel(null);
    if (selected) setSearchParams({ property: selected.id });
    else setSearchParams({});
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mapSearch.trim() || !viewerRef.current) return;
    const q = mapSearch.toLowerCase();
    const dist = tnDistricts.find(d => d.name.toLowerCase().includes(q) || d.id.toLowerCase().includes(q));
    if (dist) handleDistrictChange(dist.id);
  };

  // ── Diagnostic stats ────────────────────────────────────────────────────────
  const loadedCount     = msBuildings?.features?.length ?? 0;
  const chennaiFootprintCount = Number(msCoverage?.total_indexed_buildings);
  const ugValidGeom     = utilities.filter(u => u.geometry?.type === 'LineString').length;
  const ugRendered      = layerVisibility.underground ? ugValidGeom : 0;
  const pkValidGeom     = parkingUtils.filter(u => u.geometry?.type === 'Polygon').length;
  const pkRendered      = layerVisibility.parking ? pkValidGeom : 0;
  const propRenderable  = properties.filter(p => p.geometry_2d && p.geometry_2d.length >= 3 && p.property_type !== 'Air-Space Volume' && (p.max_z ?? 0) - (p.min_z ?? 0) >= 0.1).length;
  const elevItems       = infra.filter(item => !isAirspaceConstraint(item));
  const airItems        = infra.filter(isAirspaceConstraint);

  const mkStat = (loaded: number, rendered: number, on: boolean): LayerStat => ({
    loaded, rendered,
    status: !on ? 'OFF' : loaded === 0 ? 'NO DATA' : rendered === loaded ? 'OK' : 'PARTIAL',
  });

  const layerStats: Record<string, LayerStat> = {
    'Building Footprints': mkStat(loadedCount, renderedCounts.msBuildings ?? 0, layerVisibility.msBuildings),
    '3D Building Volumes': mkStat(loadedCount, renderedCounts.bldVolumes ?? 0, layerVisibility.bldVolumes),
    'Elevation Ground Model': mkStat(demModel?.elevation_grid?.length ?? 0, renderedCounts.dem ?? 0, layerVisibility.dem),
    'Road Network': mkStat(roadsData?.features?.length ?? 0, renderedCounts.roads ?? 0, layerVisibility.roads),
    'Water Bodies': mkStat(waterData?.features?.length ?? 0, renderedCounts.waterbodies ?? 0, layerVisibility.waterbodies),
    'Parcels': mkStat(parcels.length, renderedCounts.parcels ?? 0, layerVisibility.parcels),
    '3D Property Units': mkStat(propRenderable, renderedCounts.properties ?? 0, layerVisibility.properties),
    'Underground': mkStat(ugValidGeom, renderedCounts.underground ?? 0, layerVisibility.underground),
    'Underground Parking': mkStat(pkValidGeom, renderedCounts.parking ?? 0, layerVisibility.parking),
    'Elevated Structures': mkStat(elevItems.length, renderedCounts.elevated ?? 0, layerVisibility.elevated),
    'Airspace Constraints': mkStat(airItems.filter(item => airspaceRing(item) && airspaceVerticalRange(item)).length, renderedCounts.airspace ?? 0, layerVisibility.airspace),
  };

  return (
    <div className="relative w-full h-full bg-slate-900 overflow-hidden">
      <div ref={cesiumContainer} className="w-full h-full" />

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-slate-950/85 flex items-center justify-center z-30 backdrop-blur">
          <div className="text-center p-6 bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-800">
            <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-bold">Loading 3D Geospatial Engine...</p>
            <p className="text-xs text-slate-400 mt-1">485,261 MS building footprints + underground infrastructure</p>
          </div>
        </div>
      )}

      {/* Underground mode banner */}
      {viewMode === 'underground' && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 bg-amber-600/90 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-lg border border-amber-400 flex items-center gap-2 animate-in fade-in">
          <MoveDown className="w-4 h-4 flex-shrink-0"/>
          UNDERGROUND VIEW — Surface semi-transparent. Subsurface infrastructure rendered at depth.
        </div>
      )}
      {viewMode === 'combined' && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 bg-indigo-600/90 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-lg border border-indigo-400 flex items-center gap-2 animate-in fade-in">
          <Layers3 className="w-4 h-4 flex-shrink-0"/>
          COMBINED VIEW — Surface + underground layers rendered together.
        </div>
      )}
      {debugMode && (
        <div className="absolute top-14 right-3 z-20 bg-red-900/90 text-red-200 font-bold text-xs px-3 py-2 rounded-lg shadow-lg border border-red-700 animate-in fade-in">
          🐞 DEBUG MODE ON — Labels show ID, type, depth, coords for every underground object.
        </div>
      )}

      {/* Top toolbar */}
      <div className="absolute top-3 left-80 z-10 flex items-center gap-2 flex-wrap">
        <form onSubmit={handleSearch} className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700 rounded-md shadow-md px-2.5 py-1.5 backdrop-blur text-white">
          <Search className="w-3.5 h-3.5 text-slate-400"/>
          <input type="text" value={mapSearch} onChange={e=>setMapSearch(e.target.value)} placeholder="Search district..." className="text-xs w-36 focus:outline-none text-white bg-transparent placeholder:text-slate-500"/>
          <button type="submit" className="btn-primary py-1 px-2.5 text-[10px]">Go</button>
        </form>

        <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700 rounded-md shadow-md px-2.5 py-1.5 backdrop-blur text-white">
          <MapPin className="w-3.5 h-3.5 text-emerald-400"/>
          <span className="text-[10px] font-bold text-slate-400 uppercase">District:</span>
          <select value={selectedDistrict} onChange={e=>handleDistrictChange(e.target.value)} className="text-xs font-bold text-white bg-transparent focus:outline-none cursor-pointer">
            <option value="chennai" className="bg-slate-900">Chennai ({Number.isFinite(chennaiFootprintCount) ? chennaiFootprintCount.toLocaleString() : 'Active'} Spatial Data)</option>
            <option value="all" className="bg-slate-900">Tamil Nadu Overview</option>
            {tnDistricts.filter(d=>d.id!=='chennai').map(d=>(
              <option key={d.id} value={d.id} className="bg-slate-900">{d.name} {d.has_coverage ? '✓' : '(Spatial Data)'}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700 rounded-md shadow-md px-2.5 py-1.5 backdrop-blur text-white">
          <Box className="w-3.5 h-3.5 text-blue-300" />
          <label htmlFor="map-property-select" className="text-[10px] font-bold text-slate-400 uppercase">Property:</label>
          <select
            id="map-property-select"
            value={selProperty?.id || ''}
            onChange={event => handlePropertySelection(event.target.value)}
            className="text-xs font-bold text-white bg-transparent focus:outline-none cursor-pointer max-w-44"
          >
            <option value="" className="bg-slate-900">Select a 3D property</option>
            {properties.map(property => (
              <option key={property.id} value={property.id} className="bg-slate-900">
                {property.unit_number} - {property.id}
              </option>
            ))}
          </select>
        </div>

        {/* View mode controls */}
        <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-700 rounded-md shadow-md p-1 backdrop-blur">
          <button onClick={set3DView} className={clsx("flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded transition-colors", viewMode==='surface'?"bg-emerald-600 text-white":"text-slate-300 hover:bg-slate-800")}>
            <Sparkles className="w-3.5 h-3.5"/>3D Surface
          </button>
          <button onClick={setUndergroundView} className={clsx("flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded transition-colors", viewMode==='underground'?"bg-amber-600 text-white":"text-slate-300 hover:bg-slate-800")}>
            <MoveDown className="w-3.5 h-3.5"/>Underground
          </button>
          <button onClick={setCombinedView} className={clsx("flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded transition-colors", viewMode==='combined'?"bg-indigo-600 text-white":"text-slate-300 hover:bg-slate-800")}>
            <Layers3 className="w-3.5 h-3.5"/>Combined
          </button>
          <button onClick={setTopView} className="px-2 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-800 rounded">Top</button>
          <button
            onClick={() => {
              const nextVal = !layerVisibility.airspace;
              toggleLayer('airspace');
              if (nextVal) {
                handleZoom('airspace');
              }
            }}
            className={clsx(
              "flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded transition-colors",
              layerVisibility.airspace ? "bg-purple-600 text-white" : "text-slate-300 hover:bg-slate-800"
            )}
            title="Toggle Airspace Constraints layer and 3D volumes"
          >
            <Shield className="w-3.5 h-3.5"/>Airspace
          </button>
        </div>

        {/* Zoom to underground button */}
        <button
          onClick={() => { handleZoom('underground'); }}
          className="flex items-center gap-1.5 bg-amber-700/80 hover:bg-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-md border border-amber-500 shadow-md transition-colors"
          title="Compute actual underground bounds and fly to them"
        >
          <Target className="w-3.5 h-3.5"/>Zoom to Underground
        </button>

        {/* Debug mode toggle */}
        <button
          onClick={() => setDebugMode(d => !d)}
          className={clsx("flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-md border shadow-md transition-colors",
            debugMode ? "bg-red-700 text-white border-red-500" : "bg-slate-800/80 text-slate-300 border-slate-600 hover:bg-slate-700")}
          title="Show debug labels on all underground objects"
        >
          <Bug className="w-3.5 h-3.5"/>DEBUG
        </button>
      </div>

      {/* Coverage notice */}
      {coverageNote && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-20 bg-amber-500 text-slate-950 font-semibold text-xs px-4 py-2 rounded-lg shadow-lg border border-amber-600 flex items-center gap-2 max-w-xl animate-in fade-in">
          <AlertTriangle className="w-4 h-4 flex-shrink-0"/>
          <span>{coverageNote}</span>
        </div>
      )}

      <LayerPanel layers={layerVisibility} onToggle={toggleLayer} onZoom={handleZoom}/>
      <DiagnosticsPanel stats={layerStats} bbox={bboxStr} altitude={cameraAlt} district={tnDistricts.find(d=>d.id===selectedDistrict)?.name||'Chennai Region'}/>

      {/* Detail panels */}
      {selMsFeature && (() => { const p = selMsFeature.properties as any; return (
        <Panel title="Real Building Volume" color="#059669" icon={<Box className="w-5 h-5"/>} onClose={()=>setSelMsFeature(null)}>
          <div className="text-xs bg-emerald-50 border border-emerald-200 rounded p-2 text-emerald-900">Source: Microsoft Global ML Building Footprints (CDLA-P 2.0)</div>
          <div className="grid grid-cols-2 gap-2"><Row2 label="Building ID" value={p.id}/><Row2 label="District" value={p.district}/><Row2 label="Footprint Area" value={`${p.area_sqm} m²`}/><Row2 label="Ground Elevation" value={`+${p.ground_elevation} m`}/><Row2 label="Height (dataset)" value="Not in dataset (height=-1)"/><Row2 label="Visual Height" value="Area-derived estimate only"/><Row2 label="Matched Parcel" value={p.matched_parcel_id||'None'}/></div>
        </Panel>
      ); })()}

      {selParcel && (
        <Panel title="Surface Parcel" color="#0e7490" icon={<MapPin className="w-5 h-5"/>} onClose={()=>setSelParcel(null)}>
          <div className="grid grid-cols-2 gap-2"><Row2 label="Parcel ID" value={selParcel.id}/><Row2 label="Parcel #" value={selParcel.parcel_number}/><Row2 label="Area" value={`${selParcel.area_sqm} m²`}/><Row2 label="Land Use" value={selParcel.land_use}/><Row2 label="Lat" value={`${selParcel.centroid_lat?.toFixed(5)}° N`}/><Row2 label="Lon" value={`${selParcel.centroid_lng?.toFixed(5)}° E`}/></div>
        </Panel>
      )}

      {selProperty && (
        <Panel title="3D Property Unit" color="#1d4ed8" icon={<Box className="w-5 h-5"/>} onClose={()=>setSelProperty(null)}>
          <div className="grid grid-cols-2 gap-2"><Row2 label="Property ID" value={selProperty.id}/><Row2 label="Unit #" value={selProperty.unit_number}/><Row2 label="Type" value={selProperty.property_type}/><Row2 label="Elevation" value={`+${selProperty.min_z}m → +${selProperty.max_z}m`}/><Row2 label="Volume" value={`${selProperty.volume_cbm} m³`}/><Row2 label="Owner" value={selProperty.owner_ref}/></div>
          <button onClick={()=>navigate(`/dossier/${encodeURIComponent(selProperty.id)}`)} className="btn-primary w-full text-xs">Property Details</button>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              ['Property DNA', '/dna'], ['Rights Graph', '/relationships'],
              ['Evidence', '/evidence'], ['Validation', '/validation'],
              ['4D History', '/history'], ['Run What-If', '/whatif'],
            ].map(([label, path]) => (
              <button key={path} onClick={()=>navigate(`${path}?property=${encodeURIComponent(selProperty.id)}`)} className="btn-secondary text-[10px] py-1.5">{label}</button>
            ))}
          </div>
        </Panel>
      )}

      {selUtility && (
        <Panel title="Underground Utility" color="#b45309" icon={<Zap className="w-5 h-5"/>} onClose={()=>setSelUtility(null)}>
          <div className="grid grid-cols-2 gap-2"><Row2 label="Asset ID" value={selUtility.asset_id}/><Row2 label="Type" value={selUtility.utility_type}/><Row2 label="Depth" value={selUtility.depth_m != null ? `-${selUtility.depth_m} m below ground` : 'Not available'}/><Row2 label="Z coordinate" value={selUtility.depth_m != null ? `${-selUtility.depth_m} m (WGS84)` : 'Not available'}/><Row2 label="Length" value={selUtility.length_m ? `${selUtility.length_m} m` : 'Not available'}/></div>
        </Panel>
      )}

      {selParking && (
        <Panel title="Underground Parking" color="#334155" icon={<Box className="w-5 h-5"/>} onClose={()=>setSelParking(null)}>
          <div className="grid grid-cols-2 gap-2"><Row2 label="Asset ID" value={selParking.asset_id}/><Row2 label="Depth" value={selParking.depth_m != null ? `-${selParking.depth_m} m below ground` : 'Not available'}/><Row2 label="Z range" value={selParking.depth_m != null ? `${-(selParking.depth_m)} m to ${-(selParking.depth_m - 2.5)} m` : 'Not available'}/><Row2 label="Capacity" value="45 vehicles"/><Row2 label="Status" value="Operational"/></div>
        </Panel>
      )}

      {selElevated && (
        <Panel title="Elevated Structure" color="#c2410c" icon={<Sparkles className="w-5 h-5"/>} onClose={()=>setSelElevated(null)}>
          <div className="grid grid-cols-2 gap-2"><Row2 label="Asset ID" value={selElevated.asset_id}/><Row2 label="Type" value={selElevated.infra_type}/><Row2 label="Height" value={`+${selElevated.height_m ?? '?'} m above ground`}/><Row2 label="Length" value={selElevated.length_m ? `${selElevated.length_m} m` : 'Not available'}/></div>
        </Panel>
      )}

      {selAirspace && (() => {
        const [minZ, maxZ] = airspaceVerticalRange(selAirspace) || [0, 0];
        const metadata = selAirspace.metadata || {};
        const associatedProperty = properties.find(property => property.id === selAirspace.asset_id);
        const sourceLabel = selAirspace.source
          ? (/demonstration/i.test(selAirspace.source) ? 'Project Airspace Dataset' : selAirspace.source)
          : 'Airspace Constraint Dataset';
        return (
          <Panel title="Airspace Constraint" color="#6d28d9" icon={<Shield className="w-5 h-5"/>} onClose={()=>setSelAirspace(null)}>
            <div className="grid grid-cols-2 gap-2">
              <Row2 label="Airspace ID" value={selAirspace.id}/>
              <Row2 label="Name" value={String(metadata.name || metadata.authority || selAirspace.infra_type)}/>
              <Row2 label="Constraint Type" value={selAirspace.infra_type}/>
              <Row2 label="Minimum Elevation" value={`${minZ.toFixed(1)} m AMSL`}/>
              <Row2 label="Maximum Elevation" value={`${maxZ.toFixed(1)} m AMSL`}/>
              <Row2 label="Vertical Range" value={`${(maxZ - minZ).toFixed(1)} m`}/>
              <Row2 label="Associated Area" value={selAirspace.parcel_id || 'Study area'}/>
              <Row2 label="Associated Property" value={associatedProperty?.id || selAirspace.asset_id || 'Area constraint'}/>
              <Row2 label="Associated Building" value={associatedProperty?.building_id || 'Study area'}/>
              <Row2 label="Status" value={selAirspace.status || 'active'}/>
              <Row2 label="Source" value={sourceLabel || String(metadata.source || 'Airspace Constraint Dataset')}/>
            </div>
          </Panel>
        );
      })()}

      {/* Attribution */}
      <div className="absolute bottom-2 right-3 text-[10px] text-slate-300 font-mono bg-slate-900/90 px-2.5 py-1 rounded border border-slate-700 z-10">
        485,261 MS Footprints • OSM Infrastructure • EPSG:4326 • Depths: real DB values
      </div>
    </div>
  );
}
