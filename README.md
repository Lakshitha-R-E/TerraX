# 3D ULPIN Generation and Vertical Property Mapping System
### Smart India Hackathon 2026 | Problem Statement ID: SIH26011
**Theme:** Smart Automation | **Category:** Software

---

## 📌 Executive Summary

Conventional cadastral systems represent land rights strictly as **2D surface parcels**. In modern urban agglomerations, ownership rights, civic infrastructure, and financial claims extend vertically upwards into **multi-storey complexes and air-rights**, and downwards into **subterranean parking, metro networks, and utility easements**.

This prototype demonstrates an automated end-to-end framework enabling the fundamental cadastral transition:
```
2D LAND PARCEL → BUILDING FOOTPRINT → FLOOR LEVELS → PROPERTY UNITS → 3D PROPERTY VOLUME → TOPOLOGY VALIDATION → 3D ULPIN → 3D CADASTRAL RECORD
```

> **⚠ Prototype Notice:** All datasets (Chennai/Adyar demo area), coordinates, and generated 3D ULPINs represent an architectural demonstration prototype and are not claimed as official Government of India records.

---

## 🏛️ System Architecture

### Frontend
- **Framework:** React 18, TypeScript, Vite
- **3D Geospatial Engine:** CesiumJS with custom WGS84 volumetric extrusions and camera positioning
- **Styling:** Tailwind CSS with professional dark government GIS theme
- **Analytics & Graphs:** Recharts, interactive hierarchical node graph topology
- **State Management:** Zustand, React Router v6

### Backend
- **Engine:** FastAPI (Python 3.10+) RESTful services
- **Spatial Database:** SQLite with JSON volumetric descriptors
- **Topology Engine:** 3D intersection testing, clearance validation, vertical encroachment checking
- **Identifiers:** Prototype 3D Spatial Property Identifier (`3D-ULPIN-TN-CHN-P{parcel}-B{building}-F{floor}-U{unit}`)

---

## 🚀 Key Modules & Capabilities

1. **Executive Dashboard (`/`)**
   - Live metrics: Total parcels, buildings, volumetric properties, vertical units, subterranean assets, active conflicts.
   - Cadastral transition pipeline visualization (2D to 3D volumetric cadastre).
   - Property type distribution charts and automated topology health pie charts.
   - Live spatial activity ledger and mini-map preview.

2. **3D Cadastral Map (`/map`)**
   - Real-time 3D web map using CesiumJS.
   - Dynamic 3D extrusions with floor-wise coloring and vertical transparency.
   - Multi-layer toggle controls: Parcels, Buildings, Floors, Property Units, Underground Utilities, Underground Parking, Elevated Structures, Air-Space Volumes.
   - Interactive vertical floor slider (filters and highlights specific floors in 3D).
   - Entity picking: click any volumetric unit to inspect 3D coordinates, elevation range (min Z, max Z), volume ($m^3$), confidence, and ULPIN.

3. **3D Property Explorer (`/properties`)**
   - Tabular registry of all 50 property units across 5 demo parcels and buildings.
   - Multi-parameter filtering by property type, building ID, and text search.
   - Slide-in Volumetric Dossier panel with Overview, 3D Geometry, and Version History tabs.
   - JSON export for data interoperability.

4. **3D ULPIN Generator (`/ulpin`)**
   - Guided 5-step wizard:
     1. Select land parcel (State, District, Parcel ID)
     2. Select building structure
     3. Select floor level and unit number
     4. Set spatial centroid and vertical range ($Z_{min}$ to $Z_{max}$)
     5. Generate unique prototype 3D ULPIN
   - Validates that $Z_{max} > Z_{min}$ and detects duplicate codes.

5. **Vertical Property View (`/vertical`)**
   - Architectural cross-section elevation model.
   - Visual floor stack from subterranean level (-B1) up to roof air-space rights.
   - Level-by-level inspection of units and 3D volumetric descriptors.

6. **Subsurface & Underground Infrastructure (`/underground`)**
   - Subterranean cutaway diagram from 0.0m datum down to -6.0m bedrock strata.
   - Multi-utility mapping: Potable water pipelines, trunk sewers, 11kV electrical HT cables, optical fiber telecom lines, and underground parking volumes.
   - Right-of-way buffer proximity alerts and easement clearance status.

7. **3D Validation Center (`/validation`)**
   - Automated spatial topology engine detecting:
     - Vertical overlaps between multi-storey units (e.g., Unit A-302 vs A-303)
     - Zero-height or inverted elevation envelopes ($Z_{max} \le Z_{min}$)
     - Low data confidence thresholds (< 70%)
     - Subsurface utility right-of-way intersections
   - One-click "Run Topology Validation" and "Mark Resolved" workflows with remediation instructions.

8. **3D What-If Planning Simulator (`/whatif`)**
   - Interactive spatial sandbox for urban planning authorities.
   - Simulate adding vertical floor levels or new property volumes.
   - Tests clearance against elevated metro rail corridors and municipal height zoning limits.
   - Isolated simulation engine that protects the permanent cadastral database.

9. **Time-Based Property Versioning (`/history`)**
   - Full chronological audit trail of property transformations:
     - 2024: 2D Land Parcel
     - 2025: Building Footprint Ingestion (Drone Survey)
     - 2026: Multi-Storey Floor Segmentation
     - 2026: 3D ULPIN Issuance
     - 2026: LiDAR Volumetric Re-measurement
   - Side-by-side comparative state diff inspector.

10. **3D Relationship Graph (`/relationships`)**
    - Relational cadastral network: `Parcel → Building → Floor → Unit → 3D Volume → ULPIN → Subsurface Utilities`.
    - Interactive node selection with attribute inspection.

11. **Data Sources Registry (`/datasources`)**
    - Multi-sensor ingestion inventory: GIS Parcels (GeoJSON), LiDAR Point Clouds (LAS/LAZ), Building CAD Floor Plans (DXF), DEM/DSM (GeoTIFF), Drone Orthophotos, GNSS/CORS Observations, and Utility GIS Layers.

---

## 🏃 Quick Start Instructions

### Prerequisites
- Node.js (v18+) & npm
- Python (v3.10+)

### 1. Launch Backend
```bash
# In the project root directory
run_backend.bat
# Or manually:
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
API Documentation will be live at: `http://localhost:8000/docs`

### 2. Launch Frontend
```bash
# In another terminal in the project root directory
run_frontend.bat
# Or manually:
cd frontend
npm run dev
```
Web application will be live at: `http://localhost:5173`

---

## 🎬 5-Minute Demonstration Flow for Judges

1. **Dashboard (0:00 - 1:00)**
   - Highlight the 6 real-time metrics (Parcels, Buildings, 3D Properties, Vertical Units, Subsurface Assets, Conflicts).
   - Point out the Cadastral Transition Pipeline diagram showing 2D $\to$ 3D evolution.
   - Show property distribution and topology health analytics.

2. **3D Cadastral Map (1:00 - 2:00)**
   - Navigate to `/map`.
   - Interact with the 3D scene (zoom, tilt, rotate around Chennai Adyar demo buildings).
   - Use the Layer Control panel to toggle elevated metro corridors, underground utilities, and parcels.
   - Use the Floor Slider at the bottom to filter specifically to Floor 3, showing transparency on other floors.
   - Click a property (e.g. Unit A-302) to inspect its 3D volume, elevation range (+9.0m to +12.0m), and prototype ULPIN.

3. **Vertical View & Cross-Section (2:00 - 2:45)**
   - Navigate to `/vertical`.
   - Select "Adyar Towers Block A".
   - Click Floor 3 in the cross-section stack and inspect the 4 apartment units mapped to that level.

4. **Subsurface & Underground Infrastructure (2:45 - 3:30)**
   - Navigate to `/underground`.
   - Review the geological depth cutaway showing water, sewer, power cables, and underground parking.
   - Point out the proximity warning on the 11kV electrical cable.

5. **3D ULPIN Generator (3:30 - 4:15)**
   - Navigate to `/ulpin`.
   - Select Parcel P001, Building B001, Floor 4, Unit 2.
   - Review spatial coordinates and vertical range (+9m to +12m).
   - Click "Generate ULPIN" $\to$ see instant issuance of `3D-ULPIN-TN-CHN-P001-B001-F04-U02`.

6. **Validation Center & What-If Planning (4:15 - 5:00)**
   - Navigate to `/validation` $\to$ show active vertical overlap conflict and click "Mark Resolved".
   - Navigate to `/whatif` $\to$ test adding Floor 8 to check clearance with the elevated metro corridor.
   - Open `/history` to demonstrate the chronological evolution from 2D parcel to 3D cadastre.
