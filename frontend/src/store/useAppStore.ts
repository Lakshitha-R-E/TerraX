import { create } from 'zustand';
import type { Property, Parcel, Building, LayerVisibility, AuthUser, UserRole, LoginCredentials } from '../types';
import { authenticate, loadAuthSession, saveAuthSession, clearAuthSession } from '../services/auth';

interface AppState {
  // Auth state
  isAuthenticated: boolean;
  currentUser: AuthUser | null;
  userRole: UserRole;

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
  
  // Actions
  login: (credentials: LoginCredentials, rememberMe: boolean) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  setSelectedProperty: (p: Property | null) => void;
  setSelectedParcel: (p: Parcel | null) => void;
  setSelectedBuilding: (b: Building | null) => void;
  setSelectedFloor: (f: number | null) => void;
  toggleLayer: (layer: keyof LayerVisibility) => void;
  toggleUnderground: () => void;
  setSidebarOpen: (open: boolean) => void;
  setActiveTab: (tab: string) => void;
  setSearchQuery: (q: string) => void;
  setUserRole: (role: UserRole) => void;
}

const initialSession = loadAuthSession();

export const useAppStore = create<AppState>((set, get) => ({
  // Initial Auth from stored session
  isAuthenticated: !!initialSession,
  currentUser: initialSession,
  userRole: initialSession?.role || 'Admin',

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

  login: async (credentials: LoginCredentials, rememberMe: boolean) => {
    const result = await authenticate(credentials);
    if (result.success && result.user) {
      saveAuthSession(result.user, rememberMe);
      set({
        isAuthenticated: true,
        currentUser: result.user,
        userRole: result.user.role,
      });
      return { success: true };
    }
    return { success: false, error: result.error || 'Authentication failed' };
  },

  logout: () => {
    clearAuthSession();
    set({
      isAuthenticated: false,
      currentUser: null,
      selectedProperty: null,
      selectedParcel: null,
      selectedBuilding: null,
      selectedFloor: null,
    });
  },
  
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
  setUserRole: (role) => {
    const { currentUser } = get();
    if (currentUser) {
      const updatedUser: AuthUser = { ...currentUser, role };
      set({ userRole: role, currentUser: updatedUser });
      // update persisted session if currently logged in
      const session = loadAuthSession();
      if (session) {
        saveAuthSession(updatedUser, true);
      }
    } else {
      set({ userRole: role });
    }
  },
}));
