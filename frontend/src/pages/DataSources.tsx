import React, { useState, useEffect } from 'react';
import { fetchDataSources, refreshDataSources } from '../services/api';
import type { DataSource } from '../types';
import {
  Database, Layers, HardDrive, FileText, Info, RefreshCw, MapPin, Activity, Shield, Link as LinkIcon
} from 'lucide-react';

const sourceIcon = (type: string) => {
  if (type.includes('Point Cloud')) return <Layers className="w-4 h-4 text-purple-500" />;
  if (type.includes('Raster')) return <HardDrive className="w-4 h-4 text-emerald-500" />;
  if (type.includes('CAD')) return <FileText className="w-4 h-4 text-amber-500" />;
  return <Database className="w-4 h-4 text-blue-500" />;
};

const getBadgeStyle = (dataStatus: string) => {
  switch (dataStatus) {
    case 'REAL_OPEN': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'REAL_GOVERNMENT': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'PROJECT_DEMONSTRATION': return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'DERIVED': return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'NOT_AVAILABLE': return 'bg-slate-100 text-slate-800 border-slate-200';
    default: return 'bg-slate-100 text-slate-800 border-slate-200';
  }
};

const getProvenanceLabel = (dataStatus: string) => ({
  REAL_OPEN: 'OPEN DATA',
  REAL_GOVERNMENT: 'GOVERNMENT SOURCE',
  PROJECT_DEMONSTRATION: 'PROJECT DATASET',
  DERIVED: 'DERIVED DATA',
  NOT_AVAILABLE: 'CONNECTION REQUIRED',
  REAL_IMPORTED: 'IMPORTED SOURCE',
} as Record<string, string>)[dataStatus] || 'SOURCE';

export default function DataSources() {
  const [sources, setSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');
  const [refreshing, setRefreshing] = useState(false);

  const load = () => {
    setLoading(true);
    fetchDataSources().then(data => {
      setSources(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshDataSources();
      await load();
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filteredSources = filter === 'ALL' ? sources : sources.filter(s => s.data_status === filter);

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden bg-white">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-800">Data Sources</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            TerraX registry showing which data sources are verified, derived, project-generated, or unavailable.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
            <Info className="w-3.5 h-3.5" />
            <span>Source provenance and data status</span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh Sources'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilter('ALL')}
          className={`px-3 py-1.5 text-xs font-medium rounded-full border ${filter === 'ALL' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
        >
          All Sources
        </button>
        <button
          onClick={() => setFilter('REAL_OPEN')}
          className={`px-3 py-1.5 text-xs font-medium rounded-full border ${filter === 'REAL_OPEN' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'}`}
        >
          Real (Open Data)
        </button>
        <button
          onClick={() => setFilter('REAL_GOVERNMENT')}
          className={`px-3 py-1.5 text-xs font-medium rounded-full border ${filter === 'REAL_GOVERNMENT' ? 'bg-blue-600 text-white border-blue-600' : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'}`}
        >
          Real (Government)
        </button>
        <button
          onClick={() => setFilter('DERIVED')}
          className={`px-3 py-1.5 text-xs font-medium rounded-full border ${filter === 'DERIVED' ? 'bg-purple-600 text-white border-purple-600' : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'}`}
        >
          Derived
        </button>
        <button
          onClick={() => setFilter('PROJECT_DEMONSTRATION')}
          className={`px-3 py-1.5 text-xs font-medium rounded-full border ${filter === 'PROJECT_DEMONSTRATION' ? 'bg-amber-500 text-white border-amber-500' : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'}`}
        >
          Project Datasets
        </button>
        <button
          onClick={() => setFilter('NOT_AVAILABLE')}
          className={`px-3 py-1.5 text-xs font-medium rounded-full border ${filter === 'NOT_AVAILABLE' ? 'bg-slate-600 text-white border-slate-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
        >
          Connection Required
        </button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto pr-2 pb-6">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="text-sm text-slate-400">Loading data sources...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSources.map((src) => (
              <div key={src.source_id} className="bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-shadow flex flex-col p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
                      {sourceIcon(src.source_type)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 text-sm">{src.source_name}</h3>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <span>{src.source_type}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <span className={`inline-flex px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${getBadgeStyle(src.data_status)}`}>
                    {getProvenanceLabel(src.data_status)}
                  </span>
                </div>

                <div className="space-y-2 mb-4 flex-1">
                  <div className="flex items-start gap-2 text-xs">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                    <span className="text-slate-600">
                      <span className="font-medium">Coverage:</span> {src.region || 'N/A'}
                    </span>
                  </div>

                  <div className="flex items-start gap-2 text-xs">
                    <Layers className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                    <span className="text-slate-600"><span className="font-medium">Format:</span> {src.geometry_type || src.source_type}</span>
                  </div>

                  <div className="flex items-start gap-2 text-xs">
                    <LinkIcon className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                    <span className="text-slate-600">
                      <span className="font-medium">Source:</span> {src.source_url ? new URL(src.source_url).hostname : 'TerraX project dataset'}
                    </span>
                  </div>
                  
                  <div className="flex items-start gap-2 text-xs">
                    <Activity className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                    <span className="text-slate-600">
                      <span className="font-medium">Status:</span> {src.status || 'Unknown'}
                    </span>
                  </div>
                  
                  <div className="flex items-start gap-2 text-xs">
                    <Database className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                    <span className="text-slate-600">
                      <span className="font-medium">Features:</span> {src.feature_count !== null ? src.feature_count.toLocaleString() : 'N/A'}
                    </span>
                  </div>
                  
                  <div className="flex items-start gap-2 text-xs">
                    <Shield className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                    <span className="text-slate-600">
                      <span className="font-medium">License:</span> {src.license || 'N/A'}
                    </span>
                  </div>
                  
                  {src.notes && (
                    <div className="flex items-start gap-2 text-xs mt-2 pt-2 border-t border-slate-100">
                      <Info className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-500 italic">{src.notes}</span>
                    </div>
                  )}
                </div>

                {src.source_url && (
                  <div className="mt-auto pt-3 border-t border-slate-100">
                    <a 
                      href={src.source_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                      View Source
                    </a>
                  </div>
                )}
              </div>
            ))}
            
            {filteredSources.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-500 text-sm border-2 border-dashed border-slate-200 rounded-lg">
                No data sources found matching this filter.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
