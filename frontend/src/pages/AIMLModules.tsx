import React, { useState } from 'react';
import {
  runBuildingExtraction, runFloorSegmentation, runVerticalDelineation
} from '../services/api';
import {
  Cpu, Building2, Layers, Box, CheckCircle, Play,
  Sparkles, RefreshCw, Calculator, Info
} from 'lucide-react';
import clsx from 'clsx';

export default function AIMLModules() {
  const [activeModule, setActiveModule] = useState<'extraction' | 'segmentation' | 'delineation'>('extraction');

  // 1. Extraction State
  const [extractionThreshold, setExtractionThreshold] = useState(0.75);
  const [extractionResult, setExtractionResult] = useState<any>(null);
  const [extracting, setExtracting] = useState(false);

  // 2. Segmentation State
  const [buildingHeight, setBuildingHeight] = useState(15.0);
  const [floorHeight, setFloorHeight] = useState(3.0);
  const [groundElevation, setGroundElevation] = useState(6.2);
  const [segmentationResult, setSegmentationResult] = useState<any>(null);
  const [segmenting, setSegmenting] = useState(false);

  // 3. Delineation State
  const [delinMinZ, setDelinMinZ] = useState(6.0);
  const [delinMaxZ, setDelinMaxZ] = useState(9.0);
  const [delineationResult, setDelineationResult] = useState<any>(null);
  const [delineating, setDelineating] = useState(false);

  const handleExtract = async () => {
    setExtracting(true);
    try {
      const res = await runBuildingExtraction({ threshold: extractionThreshold });
      setExtractionResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setExtracting(false);
    }
  };

  const handleSegment = async () => {
    setSegmenting(true);
    try {
      const res = await runFloorSegmentation({
        building_height_m: buildingHeight,
        floor_height_m: floorHeight,
        ground_elevation_m: groundElevation
      });
      setSegmentationResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setSegmenting(false);
    }
  };

  const handleDelineate = async () => {
    setDelineating(true);
    try {
      const res = await runVerticalDelineation({
        footprint_coordinates: [
          [80.2566, 13.0069], [80.2572, 13.0069],
          [80.2572, 13.0065], [80.2566, 13.0065],
          [80.2566, 13.0069]
        ],
        min_z: delinMinZ,
        max_z: delinMaxZ
      });
      setDelineationResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setDelineating(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">AI/ML Geospatial Processing</h1>
            <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded uppercase">Geometric Algorithmic Engine</span>
          </div>
          <p className="text-xs text-slate-500">
            Automated feature extraction, vertical floor segmentation analysis, and volumetric parcel delineation
          </p>
        </div>

      </div>

      {/* Module Selector Tabs */}
      <div className="flex border-b border-slate-200 mb-6 gap-2">
        <button
          onClick={() => setActiveModule('extraction')}
          className={clsx('tab-btn flex items-center gap-1.5', activeModule === 'extraction' && 'active')}
        >
          <Building2 className="w-3.5 h-3.5" />
          A. Building Footprint Extraction
        </button>
        <button
          onClick={() => setActiveModule('segmentation')}
          className={clsx('tab-btn flex items-center gap-1.5', activeModule === 'segmentation' && 'active')}
        >
          <Layers className="w-3.5 h-3.5" />
          B. Floor Level Segmentation
        </button>
        <button
          onClick={() => setActiveModule('delineation')}
          className={clsx('tab-btn flex items-center gap-1.5', activeModule === 'delineation' && 'active')}
        >
          <Box className="w-3.5 h-3.5" />
          C. Vertical Parcel Delineation
        </button>
      </div>

      {(() => {
        const workflow = {
          extraction: ['Building / spatial imagery', 'Footprint boundary analysis', 'Building footprint'],
          segmentation: ['Building height / floor height', 'Vertical segmentation', 'Floor levels'],
          delineation: ['2D footprint + elevation range', '3D spatial delineation', 'Property volume'],
        }[activeModule];
        return <div className="max-w-4xl mx-auto w-full grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5 text-xs">
          {(['INPUT', 'PROCESSING', 'OUTPUT'] as const).map((label, index) => (
            <div key={label} className="border-l-2 border-blue-500 bg-white px-3 py-2">
              <span className="text-[10px] font-bold tracking-wide text-slate-500">{label}</span>
              <p className="mt-1 font-semibold text-slate-800">{workflow[index]}</p>
            </div>
          ))}
        </div>;
      })()}

      {/* Module Content */}
      <div className="max-w-4xl mx-auto">
        {/* MODULE A: BUILDING FOOTPRINT EXTRACTION */}
        {activeModule === 'extraction' && (
          <div className="space-y-6">
            <div className="card space-y-4">
              <div className="card-header flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>Building Extraction Configuration</span>
                  <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded border border-amber-300">
                    Rule-Based Algorithm
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">OpenCV Contour Delineation</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="form-label font-semibold">Sensor Imagery Reference</label>
                  <input
                    type="text"
                    disabled
                    value="Chennai Adyar Study Area (RGB Orthophoto)"
                    className="form-input bg-slate-50 text-slate-600"
                  />
                </div>
                <div>
                  <label className="form-label font-semibold">Confidence Threshold ({extractionThreshold * 100}%)</label>
                  <input
                    type="range"
                    min="0.5"
                    max="0.95"
                    step="0.05"
                    value={extractionThreshold}
                    onChange={e => setExtractionThreshold(parseFloat(e.target.value))}
                    className="w-full mt-2 accent-blue-600 cursor-pointer"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleExtract}
                    disabled={extracting}
                    className="btn-primary w-full flex items-center justify-center gap-2 py-2"
                  >
                    {extracting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    Extract Building Footprints
                  </button>
                </div>
              </div>
            </div>

            {extractionResult && (
              <div className="card space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-800">
                      Detected Polygons ({extractionResult.extracted_features_count} Structures Extracted)
                    </h4>
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded border border-amber-300">
                      Rule-Based Algorithm
                    </span>
                  </div>
                  <span className="badge-valid">Extraction Completed</span>
                </div>

                {extractionResult.disclaimer && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 text-amber-700 flex-shrink-0 mt-0.5" />
                    <span><strong>Methodology ({extractionResult.method_type}):</strong> {extractionResult.disclaimer}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {extractionResult.features.map((feat: any) => (
                    <div key={feat.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900">{feat.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">
                          {(feat.confidence * 100).toFixed(0)}% Confidence
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
                        <div>
                          <span className="text-slate-500 text-[10px] block">Area</span>
                          <span className="font-bold text-slate-800">{feat.area_sqm} m²</span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block">Perimeter</span>
                          <span className="text-slate-800">{feat.perimeter_m} m</span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block">Vertices</span>
                          <span className="text-slate-800">{feat.vertices_count} pts</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODULE B: FLOOR LEVEL SEGMENTATION */}
        {activeModule === 'segmentation' && (
          <div className="space-y-6">
            <div className="card space-y-4">
              <div className="card-header flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>Floor Segmentation Analysis</span>
                  <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded border border-amber-300">
                    Rule-Based Algorithm
                  </span>
                </div>
                <span className="text-[10px] text-blue-600 font-mono">Formula: Floors = Building Height / Floor Height</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="form-label font-semibold">Building Height ($m$)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={buildingHeight}
                    onChange={e => setBuildingHeight(parseFloat(e.target.value) || 0)}
                    className="form-input font-mono"
                  />
                </div>
                <div>
                  <label className="form-label font-semibold">Configurable Floor Height ($m$)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={floorHeight}
                    onChange={e => setFloorHeight(parseFloat(e.target.value) || 0)}
                    className="form-input font-mono"
                  />
                </div>
                <div>
                  <label className="form-label font-semibold">Ground Datum Elevation ($m$ MSL)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={groundElevation}
                    onChange={e => setGroundElevation(parseFloat(e.target.value) || 0)}
                    className="form-input font-mono"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleSegment}
                    disabled={segmenting}
                    className="btn-primary w-full flex items-center justify-center gap-2 py-2"
                  >
                    {segmenting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
                    Segment Floors
                  </button>
                </div>
              </div>
            </div>

            {segmentationResult && (
              <div className="card space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-800">
                        Segmentation Breakdown ({segmentationResult.calculated_floors_count} Levels Derived)
                      </h4>
                      <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded border border-amber-300">
                        Rule-Based Algorithm
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                      {segmentationResult.formula}
                    </span>
                  </div>
                  <span className="badge-valid">Calculated Successfully</span>
                </div>

                {segmentationResult.disclaimer && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 text-amber-700 flex-shrink-0 mt-0.5" />
                    <span><strong>Methodology ({segmentationResult.method_type}):</strong> {segmentationResult.disclaimer}</span>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Level Label</th>
                        <th className="py-2.5 px-3">Relative Z-Range ($m$)</th>
                        <th className="py-2.5 px-3">Story Height ($m$)</th>
                        <th className="py-2.5 px-3">Absolute MSL Elevation ($m$)</th>
                        <th className="py-2.5 px-3">Estimated Cadastral Units</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-slate-800">
                      {segmentationResult.levels.map((lvl: any) => (
                        <tr key={lvl.floor_number} className="hover:bg-slate-50/80">
                          <td className="py-2 px-3 font-sans font-bold text-blue-700">{lvl.label}</td>
                          <td className="py-2 px-3">+{lvl.elevation_min}m to +{lvl.elevation_max}m</td>
                          <td className="py-2 px-3">{lvl.floor_height} m</td>
                          <td className="py-2 px-3">{lvl.absolute_elevation_msl} m MSL</td>
                          <td className="py-2 px-3">{lvl.estimated_units} Units</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODULE C: VERTICAL PARCEL DELINEATION */}
        {activeModule === 'delineation' && (
          <div className="space-y-6">
            <div className="card space-y-4">
              <div className="card-header flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>Vertical Parcel Delineation</span>
                  <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded border border-amber-300">
                    Rule-Based Algorithm
                  </span>
                </div>
                <span className="text-[10px] text-blue-600 font-mono">2D Footprint + Z-Extent &rarr; 3D Volume</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="form-label font-semibold">Lower Elevation Zmin (m)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={delinMinZ}
                    onChange={e => setDelinMinZ(parseFloat(e.target.value) || 0)}
                    className="form-input font-mono"
                  />
                </div>
                <div>
                  <label className="form-label font-semibold">Upper Elevation Zmax (m)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={delinMaxZ}
                    onChange={e => setDelinMaxZ(parseFloat(e.target.value) || 0)}
                    className="form-input font-mono"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleDelineate}
                    disabled={delineating}
                    className="btn-primary w-full flex items-center justify-center gap-2 py-2"
                  >
                    {delineating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Box className="w-4 h-4" />}
                    Compute 3D Volume
                  </button>
                </div>
              </div>
            </div>

            {delineationResult && (
              <div className="card space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-800">Volumetric Cadastral Formulation</h4>
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded border border-amber-300">
                      Rule-Based Algorithm
                    </span>
                  </div>
                  <span className="badge-valid">Calculated Successfully</span>
                </div>

                {delineationResult.disclaimer && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 text-amber-700 flex-shrink-0 mt-0.5" />
                    <span><strong>Methodology ({delineationResult.method_type}):</strong> {delineationResult.disclaimer}</span>
                  </div>
                )}

                <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-lg">
                  <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block mb-1">
                    Cadastral Geometry Spec
                  </span>
                  <p className="font-mono text-xs font-bold text-blue-900">
                    {delineationResult.formula || `Volume = Area × Height = ${delineationResult.footprint_area_sqm} m² × ${delineationResult.height_m} m = ${delineationResult.volumetric_capacity_cbm} m³`}
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                    <span className="text-slate-500 text-[10px] block uppercase">Vertical Height</span>
                    <span className="font-bold text-slate-800 text-sm block mt-0.5">{delineationResult.height_m} m</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                    <span className="text-slate-500 text-[10px] block uppercase">Footprint Area</span>
                    <span className="font-bold text-slate-800 text-sm block mt-0.5">{delineationResult.footprint_area_sqm} m²</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                    <span className="text-slate-500 text-[10px] block uppercase">3D Volume</span>
                    <span className="font-bold text-blue-600 text-sm block mt-0.5">{delineationResult.volumetric_capacity_cbm} m³</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                    <span className="text-slate-500 text-[10px] block uppercase">Geometry Type</span>
                    <span className="font-semibold text-slate-800 block mt-0.5">Polyhedral Volume</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
