# Chennai source data

Study-area bounding box: `80.2525,13.0025,80.2635,13.0145` (west, south, east, north), EPSG:4326.

## Downloaded

- `india-quadkey-123312212.csv.gz` is the Microsoft Global ML Building Footprints India tile that covers the Adyar study area. It is clipped by `services/ingest_downloaded_sources.py` into `../buildings.microsoft.adyar.geojson`. License: CDLA Permissive 2.0.
- `chennai-adyar-osm.osm` is the official OpenStreetMap API bbox extract. It is converted by the importer into `../osm.adyar.geojson`. License: ODbL 1.0; attribution: OpenStreetMap Contributors.
- `microsoft-dataset-links.csv` is the Microsoft tile index used to resolve the building tile URL.

## Bhuvan / ISRO

Cartosat-1 DEM and Bhuvan reference imagery remain a manual portal download step for this environment:

- DEM portal: https://bhuvan-app3.nrsc.gov.in/data/download/
- Bhuvan resources: https://bhuvan-app1.nrsc.gov.in/2dresources/
- Public WMS endpoint: https://bhuvan-vec1.nrsc.gov.in/bhuvan/gwc/service/wms/

The portal is interactive and the tested unauthenticated WMS request did not return a stable image here. The existing `dem.json` is therefore still a prototype point grid and must not be described as a downloaded Cartosat-1 raster. Replace it only after downloading and checking the selected Bhuvan tile's metadata, datum, resolution, and license.

The existing `backend/data/*.geojson` layers used by the seeded database are prototype/demo layers. The downloaded source outputs are intentionally separate until they are reviewed and mapped to cadastral records.