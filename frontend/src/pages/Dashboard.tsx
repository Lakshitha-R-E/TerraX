import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchStats, fetchActivity, fetchProperties, runValidation
} from '../services/api';
import type { Stats, Activity } from '../types';
import {
  Layers, Building2, Box, ArrowDown, ShieldAlert, Key,
  MapPin, CheckCircle, AlertTriangle, ArrowRight, RefreshCw,
  TrendingUp, PlusCircle, Database, Check
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [propertyTypeData, setPropertyTypeData] = useState<Array<{ name: string; count: number; fill: string }>>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [s, a, properties] = await Promise.all([
        fetchStats(),
        fetchActivity(),
        fetchProperties(),
      ]);
      setStats(s);
      setActivities(Array.isArray(a?.activities) ? a.activities : (Array.isArray(a) ? (a as any) : []));
      const colors: Record<string, string> = {
        'Apartment Unit': '#2563eb',
        'Commercial Unit': '#059669',
        'Underground Parking': '#475569',
        'Underground Utility': '#d97706',
        'Elevated Structure': '#ea580c',
        'Air-Space Volume': '#7c3aed',
        'Surface Parcel': '#0891b2',
      };
      const safeProperties = Array.isArray(properties) ? properties : [];
      const counts = safeProperties.reduce<Record<string, number>>((result, property) => {
        if (property && property.property_type) {
          result[property.property_type] = (result[property.property_type] || 0) + 1;
        }
        return result;
      }, {});
      setPropertyTypeData(Object.entries(counts).map(([name, count]) => ({ name, count, fill: colors[name] || '#64748b' })));
    } catch (e) {
      console.error('Failed to load dashboard data', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRunValidation = async () => {
    setValidating(true);
    try {
      await runValidation();
      await loadDashboardData();
    } catch (e) {
      console.error('Validation run failed', e);
    } finally {
      setValidating(false);
    }
  };

  const validationPieData = [
    { name: 'Valid', value: Math.max((stats?.properties || 25) - (stats?.validation_conflicts || 0), 0), color: '#10b981' },
    { name: 'Conflicts', value: stats?.validation_conflicts || 0, color: '#ef4444' },
  ];

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white border border-slate-200 p-5 rounded-lg shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-slate-900">Welcome to TerraX</h1>
            <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">3D Property Intelligence Platform</span>
          </div>
          <p className="text-xs text-slate-500">
            3D Property Intelligence for a Smarter Tomorrow
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/map')}
            className="btn-primary flex items-center gap-1.5 text-xs"
          >
            <Layers className="w-3.5 h-3.5" />
            Launch 3D Map
          </button>
          <button
            onClick={() => navigate('/create-property')}
            className="btn-secondary flex items-center gap-1.5 text-xs text-blue-700 font-semibold"
          >
            <PlusCircle className="w-3.5 h-3.5 text-blue-600" />
            Create Property
          </button>
          <button
            onClick={handleRunValidation}
            disabled={validating}
            className="btn-secondary flex items-center gap-1.5 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${validating ? 'animate-spin' : ''}`} />
            Run Validation
          </button>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div onClick={() => navigate('/map')} className="stat-card cursor-pointer hover:border-cyan-400 hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Land Parcels</span>
            <MapPin className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{stats?.parcels ?? 5}</div>
          <span className="text-[10px] text-slate-500 mt-1">2D Base Polygons</span>
        </div>

        <div onClick={() => navigate('/map')} className="stat-card cursor-pointer hover:border-blue-400 hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Buildings</span>
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{stats?.buildings ?? 5}</div>
          <span className="text-[10px] text-slate-500 mt-1">Study-area Buildings</span>
        </div>

        <div onClick={() => navigate('/properties')} className="stat-card cursor-pointer hover:border-emerald-400 hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">3D Properties</span>
            <Box className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{stats?.properties ?? 50}</div>
          <span className="text-[10px] text-slate-500 mt-1">Volumetric Volumes</span>
        </div>

        <div onClick={() => navigate('/vertical')} className="stat-card cursor-pointer hover:border-purple-400 hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">3D ULPINs</span>
            <Layers className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{stats?.ulpins_generated ?? 41}</div>
          <span className="text-[10px] text-slate-500 mt-1">Multi-Storey Cadastre</span>
        </div>

        <div onClick={() => navigate('/underground')} className="stat-card cursor-pointer hover:border-amber-400 hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Subsurface</span>
            <ArrowDown className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{(stats?.utilities || 0) + (stats?.underground_structures || 0)}</div>
          <span className="text-[10px] text-slate-500 mt-1">Utilities + Parking</span>
        </div>

        <div onClick={() => navigate('/validation')} className="stat-card cursor-pointer hover:border-red-400 hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Validation Issues</span>
            <ShieldAlert className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-red-600 mt-2">
            {stats?.validation_conflicts ?? 0}
          </div>
          <span className="text-[10px] text-red-700 font-medium mt-1">{stats?.validation_conflicts ?? 0} Conflicts</span>
        </div>
      </div>

      {/* Cadastral Transition Pipeline Banner */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <span>Cadastral Evolution Pipeline: 2D Land Parcel to 3D Volumetric Cadastre</span>
          <span className="text-[10px] text-blue-600 font-mono">Transition Pipeline</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-7 gap-2 text-center text-xs mt-1">
          <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
            <div className="w-5 h-5 mx-auto mb-1 rounded-full bg-cyan-100 text-cyan-800 flex items-center justify-center font-bold text-[10px]">1</div>
            <div className="font-semibold text-slate-800">2D Parcel</div>
            <div className="text-[10px] text-slate-500">Surface Boundary</div>
          </div>
          <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
            <div className="w-5 h-5 mx-auto mb-1 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-[10px]">2</div>
            <div className="font-semibold text-slate-800">Building Footprint</div>
            <div className="text-[10px] text-slate-500">Microsoft ML Geometry</div>
          </div>
          <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
            <div className="w-5 h-5 mx-auto mb-1 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-[10px]">3</div>
            <div className="font-semibold text-slate-800">Floors (Levels)</div>
            <div className="text-[10px] text-slate-500">Z-Height Slices</div>
          </div>
          <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
            <div className="w-5 h-5 mx-auto mb-1 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-[10px]">4</div>
            <div className="font-semibold text-slate-800">Property Units</div>
            <div className="text-[10px] text-slate-500">CAD Floor Plans</div>
          </div>
          <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
            <div className="w-5 h-5 mx-auto mb-1 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px]">5</div>
            <div className="font-semibold text-slate-800">3D Volume</div>
            <div className="text-[10px] text-slate-500">Spatial Extrusion</div>
          </div>
          <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
            <div className="w-5 h-5 mx-auto mb-1 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-[10px]">6</div>
            <div className="font-semibold text-slate-800">Validation</div>
            <div className="text-[10px] text-slate-500">Topology Collision</div>
          </div>
          <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
            <div className="w-5 h-5 mx-auto mb-1 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-[10px]">7</div>
            <div className="font-semibold text-slate-800">3D ULPIN</div>
            <div className="text-[10px] text-slate-500">Multi-Storey Register</div>
          </div>
        </div>
      </div>

      {/* Data Provenance */}
      <div className="card">
        <div className="card-header">Data Provenance — Source Classification</div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-1">
          <div className="text-center p-2 bg-emerald-50 rounded border border-emerald-200">
            <span className="text-[10px] font-bold text-emerald-700">REAL_OPEN</span>
            <p className="text-xs font-bold mt-1">{stats?.ms_footprints_index?.toLocaleString() ?? 0}</p>
            <p className="text-[10px] text-slate-500">MS Buildings</p>
          </div>
          <div className="text-center p-2 bg-blue-50 rounded border border-blue-200">
            <span className="text-[10px] font-bold text-blue-700">REAL_GOVERNMENT</span>
            <p className="text-xs font-bold mt-1">2</p>
            <p className="text-[10px] text-slate-500">TNGIS + Bhuvan</p>
          </div>
          <div className="text-center p-2 bg-amber-50 rounded border border-amber-200">
            <span className="text-[10px] font-bold text-amber-700">PROJECT DATASET</span>
            <p className="text-xs font-bold mt-1">{(stats?.parcels ?? 0) + (stats?.buildings ?? 0) + (stats?.properties ?? 0)}</p>
            <p className="text-[10px] text-slate-500">Parcels + Buildings + Units</p>
          </div>
          <div className="text-center p-2 bg-purple-50 rounded border border-purple-200">
            <span className="text-[10px] font-bold text-purple-700">DERIVED</span>
            <p className="text-xs font-bold mt-1">{(stats?.dem_datasets ?? 0) + (stats?.dsm_datasets ?? 0)}</p>
            <p className="text-[10px] text-slate-500">DEM/DSM Elevation</p>
          </div>
          <div className="text-center p-2 bg-slate-50 rounded border border-slate-200">
            <span className="text-[10px] font-bold text-slate-700">NOT_AVAILABLE</span>
            <p className="text-xs font-bold mt-1">2</p>
            <p className="text-[10px] text-slate-500">SOI CORS + Title Registry</p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <span>Property Distribution by Volumetric Type</span>
            <span className="text-[10px] text-slate-500">{stats?.properties ?? 0} Total Entities</span>
          </div>
          <div className="h-60 mt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={propertyTypeData} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', fontSize: '12px' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {propertyTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <span>3D Topology Validation Health</span>
            <span className="text-[10px] text-slate-500">Automated Spatial Rules</span>
          </div>
          <div className="h-60 mt-1 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={validationPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {validationPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', fontSize: '12px' }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(val) => <span className="text-xs text-slate-700 font-medium">{val}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Open Geospatial Data Attributions & Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Open Data Sources Card */}
        <div className="lg:col-span-2 card">
          <div className="card-header flex items-center justify-between">
            <span>Integrated Open Geospatial Data Layers (Chennai Sector)</span>
            <button
              onClick={() => navigate('/datasources')}
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-semibold"
            >
              Registry <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-1">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold text-blue-700 uppercase block">Microsoft Global ML</span>
              <p className="text-xs font-bold text-slate-900">Building Footprints</p>
              <p className="text-[11px] text-slate-500">
                Satellite AI extracted building polygons for the Adyar study area.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold text-emerald-700 uppercase block">OpenStreetMap</span>
              <p className="text-xs font-bold text-slate-900">Roads & Waterways</p>
              <p className="text-[11px] text-slate-500">
                Primary corridors (Sardar Patel Rd, LB Rd) and Adyar river channel.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold text-indigo-700 uppercase block">Bhuvan / ISRO</span>
              <p className="text-xs font-bold text-slate-900">Cartosat-1 DEM</p>
              <p className="text-[11px] text-slate-500">
                Processed ground elevation datum (6.2m MSL baseline).
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold text-green-700 uppercase block">TNGIS GOVERNMENT</span>
              <p className="text-xs font-bold text-slate-900">Tamil Nadu GIS Portal</p>
              <p className="text-[11px] text-slate-500">
                TNGIS Official OGC API + Bhuvan/NRSC DEM. Connected.
              </p>
            </div>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="card flex flex-col">
          <div className="card-header flex items-center justify-between">
            <span>Cadastral Activity Log</span>
            <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 max-h-[190px] pr-1">
            {activities.map((act, i) => (
              <div key={i} className="flex items-start gap-2.5 text-xs p-2 rounded bg-slate-50 border border-slate-200">
                <div className="w-5 h-5 rounded bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {act.type === 'conflict' ? (
                    <AlertTriangle className="w-3 h-3 text-red-600" />
                  ) : act.type === 'ulpin_generated' ? (
                    <Key className="w-3 h-3 text-blue-600" />
                  ) : (
                    <CheckCircle className="w-3 h-3 text-emerald-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-800 font-medium truncate">{act.message}</p>
                  <span className="text-[10px] text-slate-400">{act.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
