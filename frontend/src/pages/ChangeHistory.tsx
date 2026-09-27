import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchProperties, fetchHistory } from '../services/api';
import type { Property, PropertyVersion } from '../types';
import { User, CheckCircle, ArrowLeftRight, RefreshCw, AlertTriangle, Info } from 'lucide-react';
import clsx from 'clsx';

export default function ChangeHistory() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryProp = searchParams.get('property');

  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(queryProp || '');
  const [versions, setVersions] = useState<PropertyVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<PropertyVersion | null>(null);

  const [loadingProps, setLoadingProps] = useState(true);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProperties = () => {
    setLoadingProps(true);
    setError(null);
    fetchProperties()
      .then(pList => {
        setProperties(pList);
        setLoadingProps(false);
        if (pList.length > 0) {
          const match = queryProp ? pList.find(p => p.id === queryProp) : null;
          const defaultProp = match || pList.find(p => p.id === 'PROP-DEMO-003') || pList[0];
          setSelectedPropertyId(defaultProp.id);
          if (defaultProp.id !== queryProp) setSearchParams({ property: defaultProp.id }, { replace: true });
        }
      })
      .catch(err => {
        console.error('Failed to fetch properties:', err);
        setError('Failed to load property registry.');
        setLoadingProps(false);
      });
  };

  useEffect(() => {
    loadProperties();
  }, [queryProp, setSearchParams]);

  useEffect(() => {
    if (!selectedPropertyId) return;
    let active = true;
    setVersions([]);
    setSelectedVersion(null);
    setLoadingVersions(true);
    setError(null);
    fetchHistory(selectedPropertyId)
      .then(vList => {
        if (!active) return;
        const safeVersions = Array.isArray(vList) ? vList : [];
        setVersions(safeVersions);
        if (safeVersions.length > 0) setSelectedVersion(safeVersions[safeVersions.length - 1]);
      })
      .catch(err => {
        console.error('Failed to fetch history:', err);
        if (!active) return;
        setVersions([]);
        setSelectedVersion(null);
        setError(err?.response?.data?.detail || 'Failed to load property history.');
      })
      .finally(() => {
        if (active) setLoadingVersions(false);
      });
    return () => { active = false; };
  }, [selectedPropertyId]);

  const handlePropertyChange = (propertyId: string) => {
    setSelectedPropertyId(propertyId);
    setSearchParams({ property: propertyId });
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">4D Property History</h1>
            <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded uppercase">Property + Time</span>
          </div>
          <p className="text-xs text-slate-500">
            Chronological changes recorded for the selected 3D property.
          </p>
          {selectedPropertyId && <p className="text-[10px] text-slate-500 font-mono mt-1">Property ID: {selectedPropertyId}</p>}
        </div>

        {/* Property Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600 font-semibold">Property:</span>
          {loadingProps ? (
            <span className="text-xs text-slate-400 font-mono">Loading properties...</span>
          ) : (
            <select
              value={selectedPropertyId}
              onChange={e => handlePropertyChange(e.target.value)}
              className="form-select text-xs w-64 font-medium"
            >
              {properties.map(p => (
                <option key={p.id} value={p.id}>
                  {p.unit_number} - {p.id}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between text-xs text-red-700">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadProperties}
            className="flex items-center gap-1 px-2.5 py-1 bg-white border border-red-300 rounded font-medium text-red-800 hover:bg-red-50 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 overflow-hidden">
        {/* Left: Timeline Feed */}
        <div className="lg:col-span-5 card p-4 flex flex-col overflow-hidden">
          <div className="card-header flex items-center justify-between">
            <span>Cadastral Evolution Timeline</span>
            <span className="text-[10px] text-blue-600 font-mono">{versions.length} versions</span>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-4 relative">
            {loadingVersions ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                <span>Loading timeline…</span>
              </div>
            ) : versions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 text-xs">
                <Info className="w-8 h-8 text-slate-300 mb-2" />
                <p className="font-semibold text-slate-600">No history recorded for this property</p>
              </div>
            ) : (
              <>
                {/* Timeline Vertical Spine */}
                <div className="absolute left-6 top-3 bottom-3 w-0.5 bg-slate-200 -z-0" />

            {versions.map(ver => {
              const isSelected = selectedVersion?.id === ver.id;
              return (
                <button
                  type="button"
                  key={ver.id}
                  onClick={() => setSelectedVersion(ver)}
                  aria-pressed={isSelected}
                  className="relative z-10 w-full flex items-start gap-3 cursor-pointer group text-left"
                >
                  {/* Step Node */}
                  <div className={clsx(
                    'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all',
                    isSelected
                      ? 'bg-blue-600 border-blue-400 text-white shadow-xs'
                      : 'bg-white border-slate-300 text-slate-500 group-hover:border-slate-500'
                  )}>
                    {ver.version_number}
                  </div>

                  {/* Card content */}
                  <div className={clsx(
                    'flex-1 p-3 rounded-lg border transition-all text-xs',
                    isSelected
                      ? 'border-blue-600 bg-blue-50/60 shadow-xs ring-1 ring-blue-500/30'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  )}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900">Version {ver.version_number}</span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {ver.changed_at ? new Date(ver.changed_at).toLocaleDateString() : 'Date unavailable'}
                      </span>
                    </div>
                    <p className="text-blue-900 font-semibold">{ver.change_note || ver.change_type}</p>
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-500">
                      <User className="w-3 h-3" />
                      <span>{ver.changed_by || 'Unknown'}</span>
                      <span>•</span>
                      <span className="capitalize">{(ver.change_type || 'change').replaceAll('_', ' ')}</span>
                    </div>
                  </div>
                </button>
              );
            })}
              </>
            )}
          </div>
        </div>

        {/* Right: Comparative Diff & State Inspector */}
        <div className="lg:col-span-7 card p-4 flex flex-col overflow-y-auto">
          <div className="card-header flex items-center justify-between">
            <span>Comparative Version State Inspector</span>
            <span className="text-[10px] text-slate-500 font-mono">
              Version {selectedVersion?.version_number || '-'}
            </span>
          </div>

          {!selectedVersion ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
              Select a version milestone to view comparative delta
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{selectedVersion.change_note || selectedVersion.change_type}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Recorded on {selectedVersion.changed_at ? new Date(selectedVersion.changed_at).toLocaleString() : 'Date unavailable'} by {selectedVersion.changed_by || 'Unknown'}
                  </p>
                </div>
                <span className="badge-valid capitalize">{(selectedVersion.change_type || 'change').replaceAll('_', ' ')}</span>
              </div>

              {/* Side by side state diff */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Previous State */}
                <div className="card bg-slate-50 p-3 border-slate-200">
                  <div className="card-header text-amber-800 flex items-center gap-1.5 font-bold">
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    <span>Previous Value</span>
                  </div>
                  <pre className="text-[11px] font-mono text-slate-700 bg-white p-2.5 rounded border border-slate-200 overflow-x-auto whitespace-pre-wrap">
                    {Object.keys(selectedVersion.old_data || {}).length === 0
                      ? '// Baseline initialization (No prior geometry recorded)'
                      : JSON.stringify(selectedVersion.old_data, null, 2)}
                  </pre>
                </div>

                {/* New State */}
                <div className="card bg-slate-50 p-3 border-slate-200">
                  <div className="card-header text-emerald-800 flex items-center gap-1.5 font-bold">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>New Value</span>
                  </div>
                  <pre className="text-[11px] font-mono text-emerald-900 bg-white p-2.5 rounded border border-slate-200 overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(selectedVersion.new_data, null, 2)}
                  </pre>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
