import { create } from 'zustand';
import type { Property, Parcel, Building, LayerVisibility } from '../types';

interface AppState {
  // Selected entities
  selectedProperty: Property | null;
  selectedParcel: Parcel | null;
  selectedBuilding: Building | null;
  selectedFloor: number | null;
  
  // Map state
  layerVisibility: LayerVisibility;
  showUnderground: boolean;
  
  // UI state
  sidebarOpen: boolean;
  activeTab: string;
  searchQuery: string;
  userRole: 'Admin' | 'Surveyor' | 'Authority Viewer';
  
  // Actions
  setSelectedProperty: (p: Property | null) => void;
  setSelectedParcel: (p: Parcel | null) => void;
  setSelectedBuilding: (b: Building | null) => void;
  setSelectedFloor: (f: number | null) => void;
  toggleLayer: (layer: keyof LayerVisibility) => void;
  toggleUnderground: () => void;
  setSidebarOpen: (open: boolean) => void;
  setActiveTab: (tab: string) => void;
  setSearchQuery: (q: string) => void;
  setUserRole: (role: 'Admin' | 'Surveyor' | 'Authority Viewer') => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedProperty: null,
  selectedParcel: null,
  selectedBuilding: null,
  selectedFloor: null,
  
  layerVisibility: {
    msBuildings: true,   // Real Microsoft ML building footprints — ON by default
    roads: true,         // Real OpenStreetMap Roads — ON by default
    waterbodies: true,   // Real OpenStreetMap Water Bodies — ON by default
    bldVolumes: true,    // Derived 3D Building Volumes — ON by default
    terrain: true,       // Elevation / Terrain Model — ON by default
    parcels: true,       // Project Surface Parcels
    buildings: false,    // Prototype Cadastral Buildings (OFF by default to avoid overlap)
    floors: true,
    properties: true,    // Project 3D Property Units
    underground: false,  // Subsurface Underground Infrastructure
    parking: false,      // Subsurface Underground Parking
    elevated: true,      // Elevated Structures & Corridors
    airspace: false,     // Airspace Rights
    dem: false,
  },
  showUnderground: false,
  sidebarOpen: true,
  activeTab: 'overview',
  searchQuery: '',
  userRole: 'Admin',
  
  setSelectedProperty: (p) => set({ selectedProperty: p }),
  setSelectedParcel: (p) => set({ selectedParcel: p }),
  setSelectedBuilding: (b) => set({ selectedBuilding: b }),
  setSelectedFloor: (f) => set({ selectedFloor: f }),
  toggleLayer: (layer) => set(state => ({
    layerVisibility: { ...state.layerVisibility, [layer]: !state.layerVisibility[layer] }
  })),
  toggleUnderground: () => set(state => ({ showUnderground: !state.showUnderground })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setUserRole: (role) => set({ userRole: role }),
}));
