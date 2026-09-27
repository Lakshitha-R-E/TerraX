import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchValidationResults, runValidation, resolveValidation } from '../services/api';
import type { ValidationResult } from '../types';
import {
  ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle, RefreshCw,
  Check, Info, Box
} from 'lucide-react';
import clsx from 'clsx';

export default function ValidationCenter() {
  const [searchParams] = useSearchParams();
  const propertyFilter = searchParams.get('property');
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const data = await fetchValidationResults();
      setResults(data);
    } catch (e: any) {
      console.error(e);
      setErrorMessage(e?.response?.data?.detail || 'Failed to load validation results from cadastre database.');
    } finally {
      setLoading(false);
    }
  };

  const handleRunValidation = async () => {
    setRunning(true);
    setActionSuccess('');
    setErrorMessage('');
    try {
      const res = await runValidation();
      await loadResults();
      setActionSuccess(`Spatial validation pipeline finished. ${res.new_issues_detected ?? 0} new issues detected.`);
    } catch (e: any) {
      console.error(e);
      setErrorMessage(e?.response?.data?.detail || 'Validation run failed.');
    } finally {
      setRunning(false);
    }
  };

  const handleResolve = async (id: string) => {
    setErrorMessage('');
    try {
      const res = await resolveValidation(id);
      setResults(prev => prev.map(item => item.id === id ? { ...item, resolved: 1 } : item));
      if (res.recalculated) {
        const r = res.recalculated;
        setActionSuccess(
          `Vertical boundary corrected — ${r.unit_number} geometry updated from ` +
          `[${r.old_min_z}m, ${r.old_max_z}m] to [${r.new_min_z}m, ${r.new_max_z}m]. ` +
          `Run Topology Validation again to confirm no overlap.`
        );
      } else {
        setActionSuccess('Issue marked resolved.');
      }
    } catch (e: any) {
      console.error(e);
      setErrorMessage(e?.response?.data?.detail || 'Failed to resolve validation issue.');
    }
  };

  const filteredResults = results.filter(r => {
    if (propertyFilter && r.property_id !== propertyFilter) return false;
    if (severityFilter === 'all') return true;
    return r.severity === severityFilter;
  });

  const conflictsCount = filteredResults.filter(r => r.severity === 'conflict' && !r.resolved).length;
  const warningsCount = filteredResults.filter(r => r.severity === 'warning' && !r.resolved).length;
  const resolvedCount = filteredResults.filter(r => r.resolved === 1).length;

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">3D Cadastral Validation Center</h1>
            <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded uppercase">Spatial Topology Engine</span>
          </div>
          <p className="text-xs text-slate-500">
            Intelligent spatial rules checking vertical overlaps, parcel containment, elevation limits, and underground collisions
          </p>
          {propertyFilter && <p className="text-[10px] text-slate-500 font-mono mt-1">Property filter: {propertyFilter}</p>}
        </div>

        <button
          onClick={handleRunValidation}
          disabled={running}
          className="btn-primary flex items-center gap-1.5 text-xs py-1.5"
        >
          <RefreshCw className={clsx('w-3.5 h-3.5', running && 'animate-spin')} />
          {running ? 'Validating 3D Topology...' : 'Run Topology Validation'}
        </button>
      </div>

      {actionSuccess && (
        <div className="mb-4 p-2.5 rounded bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800 animate-in fade-in">
          <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 p-2.5 rounded bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-800 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-600" />
          <span>{errorMessage}</span>
          <button onClick={loadResults} className="ml-auto underline font-semibold cursor-pointer">Retry</button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <div className="card p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-red-100 border border-red-200 flex items-center justify-center text-red-600">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold">Active Conflicts</span>
            <p className="text-lg font-bold text-red-600">{conflictsCount}</p>
          </div>
        </div>

        <div className="card p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-600">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold">Zoning Warnings</span>
            <p className="text-lg font-bold text-amber-700">{warningsCount}</p>
          </div>
        </div>

        <div className="card p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold">Resolved Checks</span>
            <p className="text-lg font-bold text-emerald-700">{resolvedCount}</p>
          </div>
        </div>

        <div className="card p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-600">
            <Box className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold">Total Rules Tested</span>
            <p className="text-lg font-bold text-blue-700">{filteredResults.length}</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
        <div className="flex gap-2">
          {['all', 'conflict', 'warning', 'valid'].map(sev => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={clsx(
                'px-3 py-1 rounded text-xs font-medium capitalize transition-colors',
                severityFilter === sev
                  ? 'bg-blue-600 text-white font-bold'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              )}
            >
              {sev === 'all' ? 'All Issues' : `${sev}s`}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-500">
          Showing {filteredResults.length} validation records
        </span>
      </div>

      {/* Results List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {loading ? (
          <div className="card text-center py-12 text-slate-500 text-xs">
            <RefreshCw className="w-5 h-5 text-blue-600 animate-spin mx-auto mb-2" />
            Loading validation rules from database...
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="card text-center py-12 text-slate-400 text-xs">
            No validation issues matching this property and selected filter.
          </div>
        ) : (
          filteredResults.map(item => {
            const isResolved = item.resolved === 1;

            return (
              <div
                key={item.id}
                className={clsx(
                  'card p-4 transition-all relative overflow-hidden',
                  item.severity === 'conflict' && !isResolved && 'border-red-300 bg-red-50/40',
                  item.severity === 'warning' && !isResolved && 'border-amber-300 bg-amber-50/40',
                  item.severity === 'valid' && 'border-emerald-300 bg-emerald-50/40',
                  isResolved && 'opacity-60 border-slate-200'
                )}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    {item.severity === 'conflict' ? (
                      <span className="badge-conflict font-bold">✕ CONFLICT</span>
                    ) : item.severity === 'warning' ? (
                      <span className="badge-warning font-bold">⚠ WARNING</span>
                    ) : (
                      <span className="badge-valid font-bold">✓ VALID</span>
                    )}

                    <span className="font-mono text-xs font-bold text-slate-900">{item.id}</span>
                    <span className="text-xs text-slate-600 font-medium">— {item.validation_type}</span>
                    {item.property_id && (
                      <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800">
                        {item.property_id}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isResolved ? (
                      <span className="text-[11px] text-emerald-700 flex items-center gap-1 font-bold">
                        <Check className="w-3.5 h-3.5" /> Resolved
                      </span>
                    ) : (
                      <button
                        onClick={() => handleResolve(item.id)}
                        className="btn-secondary text-xs py-1 px-3 flex items-center gap-1.5"
                      >
                        <Check className="w-3 h-3 text-emerald-600" />
                        Mark Resolved
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs font-medium text-slate-800 mb-2">{item.message}</p>

                {/* Details breakdown */}
                {item.details && Object.keys(item.details).length > 0 && (
                  <div className="bg-white p-2.5 rounded border border-slate-200 text-[11px] font-mono grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                    {Object.entries(item.details).map(([k, v]) => (
                      <div key={k}>
                        <span className="text-slate-500 block text-[10px] uppercase">{k.replace('_', ' ')}</span>
                        <span className="text-slate-800 truncate block font-bold">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {item.suggested_action && (
                  <div className="text-[11px] text-blue-800 flex items-start gap-1.5 bg-blue-50/70 p-2 rounded border border-blue-200">
                    <Info className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span><strong>Suggested Action:</strong> {item.suggested_action}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
