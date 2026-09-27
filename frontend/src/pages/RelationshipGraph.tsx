import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchProperties, fetchRelationshipsGraph } from '../services/api';
import type { Property, RelationshipGraph as RelGraphType, GraphNode } from '../types';
import {
  Share2, Box, Building2, MapPin, Layers, Key,
  ArrowDown, ShieldCheck, Info
} from 'lucide-react';
import clsx from 'clsx';

export default function RelationshipGraph() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryPropertyId = searchParams.get('property');
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropId, setSelectedPropId] = useState<string>(queryPropertyId || '');
  const [graphData, setGraphData] = useState<RelGraphType>({ nodes: [], edges: [] });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  useEffect(() => {
    fetchProperties().then(pList => {
      setProperties(pList);
      if (pList.length > 0) {
        const target = pList.find(p => p.id === queryPropertyId) || pList.find(p => p.id === 'PROP-DEMO-003') || pList[0];
        setSelectedPropId(target.id);
        if (target.id !== queryPropertyId) setSearchParams({ property: target.id }, { replace: true });
      }
    });
  }, [queryPropertyId, setSearchParams]);

  useEffect(() => {
    if (selectedPropId) {
      setGraphData({ nodes: [], edges: [] });
      setSelectedNode(null);
      fetchRelationshipsGraph(selectedPropId)
        .then((data: any) => {
          const transformedNodes: GraphNode[] = (data.nodes || []).map((n: any) => ({
            id: n.id,
            label: n.label,
            type: n.type === 'Property Unit' ? 'property' : n.type === 'Building' ? 'building' : n.type === 'Surface Parcel' ? 'parcel' : n.type === '3D ULPIN' ? 'ulpin' : n.type === 'Subsurface Utility' ? 'utility' : 'floor',
            data: n.details || { subtitle: n.type, elevation: n.holder || '' }
          }));
          setGraphData({ nodes: transformedNodes, edges: data.edges || [] });
          if (transformedNodes.length > 0) setSelectedNode(transformedNodes[0]);
        });
    }
  }, [selectedPropId]);

  const handlePropertyChange = (propertyId: string) => {
    setSelectedPropId(propertyId);
    setSearchParams({ property: propertyId });
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'property': return <Box className="w-4 h-4 text-blue-600" />;
      case 'building': return <Building2 className="w-4 h-4 text-emerald-600" />;
      case 'parcel': return <MapPin className="w-4 h-4 text-cyan-600" />;
      case 'floor': return <Layers className="w-4 h-4 text-purple-600" />;
      case 'ulpin': return <Key className="w-4 h-4 text-blue-800" />;
      case 'utility': return <ArrowDown className="w-4 h-4 text-amber-600" />;
      default: return <Share2 className="w-4 h-4 text-slate-500" />;
    }
  };

  const getNodeBorder = (type: string) => {
    switch (type) {
      case 'property': return 'border-blue-300 bg-blue-50/70 text-blue-900';
      case 'building': return 'border-emerald-300 bg-emerald-50/70 text-emerald-900';
      case 'parcel': return 'border-cyan-300 bg-cyan-50/70 text-cyan-900';
      case 'floor': return 'border-purple-300 bg-purple-50/70 text-purple-900';
      case 'ulpin': return 'border-indigo-300 bg-indigo-50/70 text-indigo-900';
      case 'utility': return 'border-amber-300 bg-amber-50/70 text-amber-900';
      default: return 'border-slate-200 bg-white text-slate-800';
    }
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">3D Property Relationship Graph</h1>
            <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded uppercase">Spatial Relationships</span>
          </div>
          <p className="text-xs text-slate-500">
            Hierarchical relationships connecting parcels, structures, levels, units, ULPINs and spatial rights.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600 font-semibold">Focal Unit:</span>
          <select
            value={selectedPropId}
            onChange={e => handlePropertyChange(e.target.value)}
            className="form-select text-xs w-64 font-medium"
          >
            {properties.map(p => (
              <option key={p.id} value={p.id}>
                {p.unit_number} - {p.id}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Graph Viewer */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 overflow-hidden">
        {/* Visual Graph Canvas */}
        <div className="lg:col-span-8 card p-4 flex flex-col relative overflow-hidden">
          <div className="card-header flex items-center justify-between">
            <span>Volumetric Relationship Topology</span>
            <span className="text-[10px] text-slate-500">Interactive Entity Network</span>
          </div>

          <div className="flex-1 min-h-0 relative bg-slate-50 rounded-lg border border-slate-200 p-6 pt-8 pb-12 flex flex-col items-stretch justify-start overflow-y-auto overflow-x-hidden">
            {/* Hierarchical Flow Visualization */}
            <div className="w-full max-w-xl mx-auto space-y-3.5 pt-2 pb-8">
              {/* Level 1: 2D Land Parcel */}
              {graphData.nodes.filter(n => n.type === 'parcel').map(node => (
                <div
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  className={clsx(
                    'p-3 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between shadow-xs',
                    getNodeBorder(node.type),
                    selectedNode?.id === node.id && 'ring-2 ring-cyan-500 font-bold'
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    {getNodeIcon(node.type)}
                    <div>
                      <span className="font-bold">{node.label}</span>
                      <span className="text-[10px] text-slate-500 block font-mono">
                        Base Cadastral Parcel • {node.data?.area as string || ''}
                      </span>
                    </div>
                  </div>
                  <span className="badge-valid text-[9px]">Root Cadastre</span>
                </div>
              ))}

              <div className="w-0.5 h-3 bg-slate-300 mx-auto" />

              {/* Level 2: Building Structure */}
              {graphData.nodes.filter(n => n.type === 'building').map(node => (
                <div
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  className={clsx(
                    'p-3 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between shadow-xs',
                    getNodeBorder(node.type),
                    selectedNode?.id === node.id && 'ring-2 ring-emerald-500 font-bold'
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    {getNodeIcon(node.type)}
                    <div>
                      <span className="font-bold">{node.label}</span>
                      <span className="text-[10px] text-slate-500 block font-mono">
                        {node.data?.subtitle as string} • {node.data?.type as string}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-white text-emerald-800 border border-emerald-200 font-medium">
                    Physical Shell
                  </span>
                </div>
              ))}

              <div className="w-0.5 h-3 bg-slate-300 mx-auto" />

              {/* Level 3: Floor Level */}
              {graphData.nodes.filter(n => n.type === 'floor').map(node => (
                <div
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  className={clsx(
                    'p-3 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between shadow-xs',
                    getNodeBorder(node.type),
                    selectedNode?.id === node.id && 'ring-2 ring-purple-500 font-bold'
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    {getNodeIcon(node.type)}
                    <div>
                      <span className="font-bold">{node.label}</span>
                      <span className="text-[10px] text-slate-500 block font-mono">
                        {node.data?.subtitle as string}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-white text-purple-800 border border-purple-200 font-medium">
                    Z-Elevation Slice
                  </span>
                </div>
              ))}

              <div className="w-0.5 h-3 bg-slate-300 mx-auto" />

              {/* Level 4: Unit & ULPIN */}
              <div className="grid grid-cols-2 gap-3">
                {graphData.nodes.filter(n => n.type === 'property').map(node => (
                  <div
                    key={node.id}
                    onClick={() => setSelectedNode(node)}
                    className={clsx(
                      'p-3 rounded-lg border text-xs cursor-pointer transition-all shadow-xs',
                      getNodeBorder(node.type),
                      selectedNode?.id === node.id && 'ring-2 ring-blue-500 font-bold'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {getNodeIcon(node.type)}
                      <span className="font-bold">{node.label}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block font-mono">{node.data?.elevation as string}</span>
                    <span className="text-[10px] text-blue-700 font-semibold block mt-0.5">{node.data?.subtitle as string}</span>
                  </div>
                ))}

                {graphData.nodes.filter(n => n.type === 'ulpin').map(node => (
                  <div
                    key={node.id}
                    onClick={() => setSelectedNode(node)}
                    className={clsx(
                      'p-3 rounded-lg border text-xs cursor-pointer transition-all shadow-xs',
                      getNodeBorder(node.type),
                      selectedNode?.id === node.id && 'ring-2 ring-blue-700 font-bold'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {getNodeIcon(node.type)}
                      <span className="font-bold">3D ULPIN</span>
                    </div>
                    <span className="text-[10px] text-blue-800 font-mono font-bold block truncate">
                      {node.label}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Spatial Property Identifier</span>
                  </div>
                ))}
              </div>

              <div className="w-0.5 h-3 bg-slate-300 mx-auto" />

              {/* Level 5: Co-existing Subsurface Utilities */}
              <div className="border border-slate-200 bg-white p-3 rounded-lg space-y-2 shadow-xs">
                <span className="text-[10px] text-slate-600 uppercase font-bold block">
                  Associated Parcel Subsurface Utilities & Servitudes
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {graphData.nodes.filter(n => n.type === 'utility').slice(0, 4).map(node => (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNode(node)}
                      className={clsx(
                        'p-2 rounded border text-xs cursor-pointer transition-all flex items-center gap-2',
                        getNodeBorder(node.type),
                        selectedNode?.id === node.id && 'ring-2 ring-amber-500 font-bold'
                      )}
                    >
                      {getNodeIcon(node.type)}
                      <div className="min-w-0 flex-1">
                        <span className="font-bold block truncate">{node.label}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{node.data?.subtitle as string}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Selected Node Inspector */}
        <div className="lg:col-span-4 card p-4 flex flex-col">
          <div className="card-header flex items-center justify-between">
            <span>Topology Node Inspector</span>
            <span className="text-[10px] text-blue-600 font-mono uppercase">{selectedNode?.type || 'Node'}</span>
          </div>

          {!selectedNode ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
              Click any node in the graph to view legal/spatial relationships
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-3">
                <div className="w-9 h-9 rounded bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 shadow-xs">
                  {getNodeIcon(selectedNode.type)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{selectedNode.label}</h3>
                  <span className="text-[10px] text-slate-500 font-mono uppercase">
                    ID: {selectedNode.id}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold text-slate-700 uppercase block">Node Metadata Attributes</span>
                <div className="space-y-1 font-mono text-[11px]">
                  {Object.entries(selectedNode.data || {}).map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b border-slate-200/80 pb-1">
                      <span className="text-slate-500 capitalize">{k}:</span>
                      <span className="text-slate-900 font-bold">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded text-[11px] text-slate-700 space-y-1">
                <span className="font-bold text-blue-900 block">Cadastral Principle:</span>
                <p>
                  In a 3D cadastre, an individual volumetric unit holds topological relationships upward into airspace,
                  downward into soil easements, and shares physical structure with adjacent vertical parcels.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
