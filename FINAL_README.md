# 3D ULPIN Generation and Vertical Property Mapping System - Combined Prototype

This archive combines the main `ps2` project with the latest supplied ULPIN patch set.

## Included
- React/Vite/Cesium frontend source
- FastAPI backend
- SQLite cadastral database
- Existing spatial/GIS datasets
- Latest patched ULPIN, property, validation, and API code
- Clean dependency manifests

## Primary demo
Adyar Towers Block A -> Floor 3 -> U-301 / Flat 301 -> 3D ULPIN -> validation -> underground infrastructure -> property dossier.

The supplied demo database contains the intentional U-301/U-302 vertical-overlap scenario for validation demonstration.

## Run on Windows
1. Open a terminal in this project folder.
2. Backend:
   ```bat
   cd backend
   python -m pip install -r requirements.txt
   python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```
3. In a second terminal:
   ```bat
   cd frontend
   npm install
   npm run dev
   ```
4. Open the Vite URL shown in the terminal.

## Notes
- `node_modules` and generated `dist` files are intentionally not included. Run `npm install` to recreate them.
- The database and data files are included.
- Prototype/demo records are labelled as demonstration data where applicable. The generated 3D ULPIN format is a project prototype identifier, not an assertion of an official government-issued identifier.

## Verification performed while assembling this archive
- Python backend source successfully passed `compileall` syntax compilation.
- TypeScript compilation (`tsc -b`) completed before the Vite bundling step.
- Full backend startup could not be completed in this environment because the environment did not have the optional `laspy` dependency installed.
- The included `requirements.txt` contains the required backend dependency.
- The bundled environment's Vite native optional dependency was incomplete, so the final archive intentionally relies on a fresh `npm install` rather than shipping the existing `node_modules` directory.
