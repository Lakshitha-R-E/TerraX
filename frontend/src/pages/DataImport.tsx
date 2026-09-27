import React, { useState } from 'react';
import { importSpatialData } from '../services/api';
import {
  UploadCloud, FileText, CheckCircle, AlertTriangle, Database,
  Layers, MapPin, Box, ArrowRight, RefreshCw
} from 'lucide-react';
import clsx from 'clsx';

export default function DataImport() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [layerType, setLayerType] = useState<string>('properties');
  const [dataFormat, setDataFormat] = useState<string>('geojson');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setError('');
      setResult(null);
      if (file.name.endsWith('.csv')) {
        setDataFormat('csv');
      } else if (file.name.endsWith('.geojson') || file.name.endsWith('.json')) {
        setDataFormat('geojson');
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select a file to import.');
      return;
    }

    setUploading(true);
    setError('');
    setResult(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('layer_type', layerType);
    formData.append('data_format', dataFormat);

    try {
      const res = await importSpatialData(formData);
      setResult(res);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.detail || 'Import failed. Please check file format.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Spatial Data Ingestion & Import</h1>
            <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded uppercase">Spatial Data Ingestion</span>
          </div>
          <p className="text-xs text-slate-500">
            Import GeoJSON parcels/buildings, LiDAR CSV coordinates, and 3D volumetric records into the cadastral database
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Upload Form Card */}
        <form onSubmit={handleUpload} className="card space-y-5">
          <div className="card-header flex items-center justify-between">
            <span>Import Configuration</span>
            <span className="text-[10px] text-slate-400 font-mono">EPSG:4326 Compatible</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label font-semibold">Target Cadastral Layer</label>
              <select
                value={layerType}
                onChange={e => setLayerType(e.target.value)}
                className="form-select"
              >
                <option value="parcels">Land Parcels (2D Polygons)</option>
                <option value="buildings">Building Footprints (Microsoft ML / OSM)</option>
                <option value="properties">3D Property Units (Volumetric Extrusions)</option>
                <option value="utilities">Subsurface Utilities (LineStrings / Conduits)</option>
              </select>
            </div>

            <div>
              <label className="form-label font-semibold">Data Format</label>
              <select
                value={dataFormat}
                onChange={e => setDataFormat(e.target.value)}
                className="form-select"
              >
                <option value="geojson">GeoJSON / JSON (.geojson, .json)</option>
                <option value="csv">Spatial Coordinates CSV (.csv)</option>
              </select>
            </div>
          </div>

          {/* File Dropzone Area */}
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
            <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">Choose GeoJSON or CSV file</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Supports polygon boundaries, elevation attributes, and point-cloud centroids
            </p>
            <input
              type="file"
              accept=".geojson,.json,.csv"
              onChange={handleFileChange}
              className="mt-3 text-xs text-slate-500 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end">
            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="btn-primary flex items-center gap-1.5 py-2 px-4"
            >
              {uploading ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Ingesting Data...</>
              ) : (
                <><UploadCloud className="w-4 h-4" /> Import and Add to Cadastre</>
              )}
            </button>
          </div>
        </form>

        {/* Ingestion Results & Validation Dossier */}
        {result && (
          <div className="card space-y-4 animate-in fade-in">
            <div className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-emerald-900">Spatial Ingestion Complete</h4>
                <p className="text-xs text-emerald-700 mt-0.5">{result.message}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                <span className="text-slate-500 text-[10px] block uppercase">File Ingested</span>
                <span className="font-semibold text-slate-800 truncate block mt-0.5">{result.filename}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                <span className="text-slate-500 text-[10px] block uppercase">Features Imported</span>
                <span className="font-bold text-blue-600 text-sm block mt-0.5">{result.features_imported}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                <span className="text-slate-500 text-[10px] block uppercase">Geometry Types</span>
                <span className="font-semibold text-slate-800 block mt-0.5">{result.geometry_types?.join(', ') || 'N/A'}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                <span className="text-slate-500 text-[10px] block uppercase">Format</span>
                <span className="font-mono text-slate-800 uppercase block mt-0.5">{result.format}</span>
              </div>
            </div>

            {result.bounding_box && (
              <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs space-y-1.5">
                <span className="text-[10px] font-semibold text-slate-600 uppercase block">Computed Spatial Bounding Box</span>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 font-mono text-[11px] text-slate-700">
                  <div>Min Lat: {result.bounding_box.min_lat}°</div>
                  <div>Max Lat: {result.bounding_box.max_lat}°</div>
                  <div>Min Lng: {result.bounding_box.min_lng}°</div>
                  <div>Max Lng: {result.bounding_box.max_lng}°</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
