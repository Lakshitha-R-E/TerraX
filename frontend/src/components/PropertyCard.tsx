import React from 'react';
import type { Property } from '../types';
import { Layers, Box, ArrowUpDown } from 'lucide-react';
import clsx from 'clsx';

interface Props {
  property: Property;
  onSelect?: (p: Property) => void;
  isSelected?: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  'Apartment Unit': 'text-blue-400 bg-blue-900/30 border-blue-700/40',
  'Commercial Unit': 'text-emerald-400 bg-emerald-900/30 border-emerald-700/40',
  'Surface Parcel': 'text-cyan-400 bg-cyan-900/30 border-cyan-700/40',
  'Underground Parking': 'text-slate-400 bg-slate-800 border-slate-700',
  'Underground Utility': 'text-amber-400 bg-amber-900/30 border-amber-700/40',
  'Elevated Structure': 'text-orange-400 bg-orange-900/30 border-orange-700/40',
  'Air-Space Volume': 'text-purple-400 bg-purple-900/30 border-purple-700/40',
};

export default function PropertyCard({ property, onSelect, isSelected }: Props) {
  const height = property.max_z - property.min_z;
  const isUnderground = property.min_z < 0;

  return (
    <div
      onClick={() => onSelect && onSelect(property)}
      className={clsx(
        'card transition-all cursor-pointer hover:border-gov-500/70 relative overflow-hidden',
        isSelected ? 'border-gov-500 bg-dark-850 shadow-md ring-1 ring-gov-500/30' : 'hover:bg-dark-850/50'
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-slate-100">{property.unit_number}</h4>
            {isUnderground && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 font-medium">Subsurface</span>
            )}
          </div>
          <p className="text-[11px] text-slate-400">{property.id}</p>
        </div>
        <span className={clsx('text-[10px] px-2 py-0.5 rounded border font-medium', TYPE_COLORS[property.property_type] || 'text-slate-400 border-slate-700')}>
          {property.property_type}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px] mb-3 bg-dark-900/60 p-2 rounded border border-dark-700/60">
        <div className="flex items-center gap-1.5 text-slate-300">
          <ArrowUpDown className="w-3 h-3 text-gov-400 flex-shrink-0" />
          <span>{property.min_z}m to {property.max_z}m ({height.toFixed(1)}m)</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-300">
          <Box className="w-3 h-3 text-emerald-400 flex-shrink-0" />
          <span>{property.volume_cbm} m³</span>
        </div>
        <div className="text-slate-400">
          Building: <span className="text-slate-200 font-mono">{property.building_id || '—'}</span>
        </div>
        <div className="text-slate-400">
          Area: <span className="text-slate-200">{property.area_sqm} m²</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px]">
        <span className="text-slate-500">Data Confidence</span>
        <div className="flex items-center gap-2">
          <div className="w-16 bg-dark-700 rounded-full h-1.5 overflow-hidden">
            <div
              className={clsx(
                'h-full rounded-full',
                property.confidence >= 80 ? 'bg-emerald-500' : property.confidence >= 70 ? 'bg-amber-500' : 'bg-red-500'
              )}
              style={{ width: `${Math.min(100, property.confidence)}%` }}
            />
          </div>
          <span className="font-mono text-slate-300">{property.confidence.toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
}
