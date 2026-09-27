import React, { useState, useEffect } from 'react';
import { fetchUtilities, fetchParcels } from '../services/api';
import type { Utility, Parcel } from '../types';
import {
  ArrowDown, ShieldAlert, AlertTriangle, CheckCircle, Info,
  Filter, Layers, Eye, RefreshCw
} from 'lucide-react';
import clsx from 'clsx';

export default function UndergroundView() {
  const [utilities, setUtilities] = useState<Utility[]>([]);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [selectedUtility, setSelectedUtility] = useState<Utility | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterParcel, setFilterParcel] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    setError(null);
    Promise.all([fetchUtilities(), fetchParcels()])
      .then(([uList, pList]) => {
        setUtilities(uList);
        if (uList.length > 0) setSelectedUtility(uList[0]);
        setParcels(pList);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load underground utilities:', err);
        setError('Failed to load subsurface infrastructure data.');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredUtilities = utilities.filter(u => {
    const matchesType = filterType === 'all' || u.utility_type === filterType;
    const matchesParcel = filterParcel === 'all' || u.parcel_id === filterParcel;
    return matchesType && matchesParcel;
  });

  const getUtilityColor = (type: string) => {
    switch (type) {
      case 'Water Pipeline': return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'Sewer Line': return 'text-amber-800 bg-amber-50 border-amber-200';
      case 'Electrical Cable': return 'text-yellow-800 bg-yellow-50 border-yellow-200';
      case 'Communication Cable': return 'text-purple-700 bg-purple-50 border-purple-200';
      case 'Underground Parking': return 'text-slate-700 bg-slate-100 border-slate-200';
      default: return 'text-slate-700 bg-slate-100 border-slate-200';
    }
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Subsurface & Underground Infrastructure</h1>
            <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded uppercase">Subsurface Sub-terrain Cadastre</span>
          </div>
          <p className="text-xs text-slate-500">
            Mapping subsurface property rights, underground parking facilities, and utility easement networks
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="form-select text-xs w-48"
          >
            <option value="all">All Subsurface Types</option>
            <option value="Water Pipeline">Water Pipeline</option>
            <option value="Sewer Line">Sewer Line</option>
            <option value="Electrical Cable">Electrical Cable</option>
            <option value="Communication Cable">Communication Cable</option>
            <option value="Underground Parking">Underground Parking</option>
          </select>

          <select
            value={filterParcel}
            onChange={e => setFilterParcel(e.target.value)}
            className="form-select text-xs w-44"
          >
            <option value="all">All Parcels</option>
            {parcels.map(p => (
              <option key={p.id} value={p.id}>{p.parcel_number}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between text-xs text-red-700">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-1 px-2.5 py-1 bg-white border border-red-300 rounded font-medium text-red-800 hover:bg-red-50 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
            <span>Loading subsurface infrastructure…</span>
          </div>
        </div>
      ) : (
        /* Main Grid */
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 overflow-hidden">
        {/* Left: Interactive Depth Cutaway Diagram */}
        <div className="lg:col-span-6 card p-4 flex flex-col overflow-hidden">
          <div className="card-header flex items-center justify-between">
            <span>Subsurface Geological Cutaway (0m to -6m)</span>
            <span className="text-[10px] text-amber-700 font-mono">Depth Axis (Z &lt; 0)</span>
          </div>

          <div className="flex-1 relative bg-gradient-to-b from-slate-50 via-slate-100 to-amber-50 rounded border border-slate-200 p-4 flex flex-col justify-between overflow-hidden">
            {/* Ground Level Datum */}
            <div className="border-b-2 border-emerald-600 pb-1 flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 font-mono">Ground Surface Elevation 0.0m MSL (Datum)</span>
              <span className="text-[10px] text-slate-500 font-mono">Urban Soil Stratum</span>
            </div>

            {/* Depth Markers and Assets */}
            <div className="flex-1 relative my-2 flex flex-col justify-around">
              {/* -0.8m Telecom */}
              <div
                onClick={() => {
                  const u = utilities.find(x => x.utility_type === 'Communication Cable');
                  if (u) setSelectedUtility(u);
                }}
                className="relative flex items-center gap-3 p-2 bg-white/90 border border-purple-200 rounded-lg cursor-pointer hover:bg-purple-50 transition-all shadow-xs"
              >
                <div className="w-12 text-right text-[10px] font-mono text-purple-700 font-bold">-0.8m</div>
                <div className="flex-1">
                  <span className="text-xs font-bold text-purple-900">High-Density Optical Fiber Conduit</span>
                  <span className="text-[10px] text-purple-600 block font-mono">CC-2024-001 • 10Gbps Municipal Backbone</span>
                </div>
                <span className="badge-valid text-[9px]">Normal Clearance</span>
              </div>

              {/* -1.0m Electrical HT */}
              <div
                onClick={() => {
                  const u = utilities.find(x => x.utility_type === 'Electrical Cable');
                  if (u) setSelectedUtility(u);
                }}
                className="relative flex items-center gap-3 p-2 bg-white/90 border border-yellow-200 rounded-lg cursor-pointer hover:bg-yellow-50 transition-all shadow-xs"
              >
                <div className="w-12 text-right text-[10px] font-mono text-yellow-700 font-bold">-1.0m</div>
                <div className="flex-1">
                  <span className="text-xs font-bold text-yellow-900">11kV High-Tension Underground Cable</span>
                  <span className="text-[10px] text-yellow-700 block font-mono">EC-2024-001 • Commercial Feeder Grid</span>
                </div>
                <span className="badge-warning text-[9px]">Proximity Alert</span>
              </div>

              {/* -2.5m Water Supply */}
              <div
                onClick={() => {
                  const u = utilities.find(x => x.utility_type === 'Water Pipeline');
                  if (u) setSelectedUtility(u);
                }}
                className="relative flex items-center gap-3 p-2 bg-white/90 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-50 transition-all shadow-xs"
              >
                <div className="w-12 text-right text-[10px] font-mono text-blue-700 font-bold">-2.5m</div>
                <div className="flex-1">
                  <span className="text-xs font-bold text-blue-900">Potable Water Main Trunk Line (200mm PVC)</span>
                  <span className="text-[10px] text-blue-600 block font-mono">WP-2024-001 • CMWSSB Municipal Grid</span>
                </div>
                <span className="badge-valid text-[9px]">Clear Easement</span>
              </div>

              {/* -3.5m Trunk Sewer */}
              <div
                onClick={() => {
                  const u = utilities.find(x => x.utility_type === 'Sewer Line');
                  if (u) setSelectedUtility(u);
                }}
                className="relative flex items-center gap-3 p-2 bg-white/90 border border-amber-200 rounded-lg cursor-pointer hover:bg-amber-50 transition-all shadow-xs"
              >
                <div className="w-12 text-right text-[10px] font-mono text-amber-700 font-bold">-3.5m</div>
                <div className="flex-1">
                  <span className="text-xs font-bold text-amber-900">Trunk Sewer Pipeline (300mm Concrete)</span>
                  <span className="text-[10px] text-amber-700 block font-mono">SL-2024-001 • Gravity Discharge Channel</span>
                </div>
                <span className="badge-valid text-[9px]">Clear Easement</span>
              </div>

              {/* -5.0m Underground Parking Strata */}
              <div
                onClick={() => {
                  const u = utilities.find(x => x.utility_type === 'Underground Parking');
                  if (u) setSelectedUtility(u);
                }}
                className="relative flex items-center gap-3 p-2 bg-slate-200/80 border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-200 transition-all shadow-xs"
              >
                <div className="w-12 text-right text-[10px] font-mono text-slate-700 font-bold">-5.0m</div>
                <div className="flex-1">
                  <span className="text-xs font-bold text-slate-900">Subterranean Parking Facility (Marina Heights)</span>
                  <span className="text-[10px] text-slate-600 block font-mono">UGP-B004-001 • Multi-Vehicle Volumetric Cell</span>
                </div>
                <span className="badge-demo text-[9px]">Private Right</span>
              </div>
            </div>

            {/* Depth Base Indicator */}
            <div className="pt-2 border-t border-slate-200 flex justify-between text-[10px] text-slate-500 font-mono">
              <span>Deep Strata (Bedrock / Grout Zone)</span>
              <span>Elevation: -6.0m Sub-surface</span>
            </div>
          </div>
        </div>

        {/* Right: Subsurface Cadastral Registry */}
        <div className="lg:col-span-6 flex flex-col gap-4 overflow-hidden">
          {/* Table of Subsurface Assets */}
          <div className="card p-4 flex-1 flex flex-col overflow-hidden">
            <div className="card-header flex items-center justify-between">
              <span>Subterranean Assets Register ({filteredUtilities.length})</span>
              <span className="text-[10px] text-slate-500">Click to inspect spatial buffer</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredUtilities.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 text-xs">
                  <Info className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="font-semibold text-slate-600">No Subsurface Assets Found</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Try adjusting the filter criteria or selected parcel.</p>
                </div>
              ) : (
                filteredUtilities.map(util => {
                const isSelected = selectedUtility?.id === util.id;
                return (
                  <div
                    key={util.id}
                    onClick={() => setSelectedUtility(util)}
                    className={clsx(
                      'p-2.5 rounded-lg border cursor-pointer transition-all',
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 shadow-xs ring-1 ring-blue-500/30'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    )}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-slate-900">{util.asset_id}</span>
                        <span className={clsx('text-[10px] px-2 py-0.5 rounded border font-medium', getUtilityColor(util.utility_type))}>
                          {util.utility_type}
                        </span>
                      </div>
                      {util.conflict_status === 'conflict' ? (
                        <span className="badge-conflict text-[9px]">Right-of-Way Conflict</span>
                      ) : util.conflict_status === 'warning' ? (
                        <span className="badge-warning text-[9px]">Buffer Proximity</span>
                      ) : (
                        <span className="badge-valid text-[9px]">Verified Clearance</span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[11px] font-mono bg-slate-50 p-2 rounded border border-slate-200">
                      <div>
                        <span className="text-slate-500 text-[10px] block">Depth</span>
                        <span className="text-amber-700 font-bold">-{util.depth_m}m</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">Parcel Ref</span>
                        <span className="text-slate-800">{util.parcel_id}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">Span/Length</span>
                        <span className="text-slate-800">{util.length_m ? `${util.length_m}m` : 'Volumetric'}</span>
                      </div>
                    </div>
                  </div>
                );
              }))}
            </div>
          </div>

          {/* Selected Asset Inspection Card */}
          {selectedUtility && (
            <div className="card p-4">
              <div className="card-header flex items-center justify-between">
                <span>Underground Cadastral Specification — {selectedUtility.asset_id}</span>
                <span className="text-[10px] text-amber-700 font-mono">Easement Protocol</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mt-1">
                <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                  <span className="text-slate-500 text-[10px] block">Classification</span>
                  <span className="font-semibold text-slate-800 text-[11px]">{selectedUtility.utility_type}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                  <span className="text-slate-500 text-[10px] block">Depth Below Ground</span>
                  <span className="font-mono text-amber-700 font-bold text-[11px]">-{selectedUtility.depth_m} meters</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                  <span className="text-slate-500 text-[10px] block">Base Parcel</span>
                  <span className="font-mono text-slate-800 font-semibold text-[11px]">{selectedUtility.parcel_id}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                  <span className="text-slate-500 text-[10px] block">Status</span>
                  <span className={clsx(
                    'font-mono font-bold text-[11px]',
                    selectedUtility.conflict_status === 'conflict' ? 'text-red-600' :
                    selectedUtility.conflict_status === 'warning' ? 'text-amber-700' : 'text-emerald-700'
                  )}>
                    {selectedUtility.conflict_status.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
