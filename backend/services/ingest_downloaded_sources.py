"""Materialize the downloaded Chennai source extracts into clipped GeoJSON.

The generated files are source layers only. They are intentionally separate
from the prototype/demo layers used by the seeded cadastral database.
"""
import csv
import gzip
import json
import os
import xml.etree.ElementTree as ET


DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))
SOURCE_DIR = os.path.join(DATA_DIR, "sources")
BBOX = (80.2525, 13.0025, 80.2635, 13.0145)


def in_bbox(coordinate):
    longitude, latitude = coordinate
    return BBOX[0] <= longitude <= BBOX[2] and BBOX[1] <= latitude <= BBOX[3]


def write_json(path, value):
    with open(path, "w", encoding="utf-8") as output:
        json.dump(value, output, indent=2)


def clip_microsoft_buildings():
    index_path = os.path.join(SOURCE_DIR, "microsoft-dataset-links.csv")
    tile_path = os.path.join(SOURCE_DIR, "india-quadkey-123312212.csv.gz")
    with open(index_path, newline="", encoding="utf-8") as index_file:
        tile_url = next(
            row["Url"] for row in csv.DictReader(index_file)
            if row["Location"] == "India" and row["QuadKey"] == "123312212"
        )

    features = []
    with gzip.open(tile_path, "rt", encoding="utf-8") as tile_file:
        for line in tile_file:
            feature = json.loads(line)
            coordinates = feature["geometry"]["coordinates"]
            polygon = coordinates[0]
            if any(in_bbox(point) for point in polygon):
                feature["properties"]["source_url"] = tile_url
                features.append(feature)

    output = {
        "type": "FeatureCollection",
        "metadata": {
            "source": "Microsoft Global ML Building Footprints",
            "source_url": tile_url,
            "region": "Chennai, Tamil Nadu (Adyar demo bbox)",
            "bbox": BBOX,
            "crs": "EPSG:4326",
            "license": "CDLA Permissive 2.0",
            "feature_count": len(features),
        },
        "features": features,
    }
    path = os.path.join(DATA_DIR, "buildings.microsoft.adyar.geojson")
    write_json(path, output)
    print(f"Microsoft buildings: {len(features)} features -> {path}")


def convert_osm():
    root = ET.parse(os.path.join(SOURCE_DIR, "chennai-adyar-osm.osm")).getroot()
    nodes = {
        node.attrib["id"]: [float(node.attrib["lon"]), float(node.attrib["lat"])]
        for node in root.findall("node")
    }
    features = []
    for way in root.findall("way"):
        tags = {tag.attrib["k"]: tag.attrib["v"] for tag in way.findall("tag")}
        layer = "road" if "highway" in tags else "water" if (
            "waterway" in tags or tags.get("natural") == "water"
        ) else "building" if "building" in tags else None
        if layer is None:
            continue
        coordinates = [nodes[ref.attrib["ref"]] for ref in way.findall("nd") if ref.attrib["ref"] in nodes]
        if len(coordinates) < 2 or not any(in_bbox(point) for point in coordinates):
            continue
        closed = coordinates[0] == coordinates[-1]
        geometry_type = "Polygon" if layer in ("building", "water") and closed else "LineString"
        geometry = {"type": geometry_type, "coordinates": [coordinates] if geometry_type == "Polygon" else coordinates}
        properties = {"osm_id": way.attrib["id"], "layer": layer, **tags}
        features.append({"type": "Feature", "properties": properties, "geometry": geometry})

    output = {
        "type": "FeatureCollection",
        "metadata": {
            "source": "OpenStreetMap Contributors",
            "source_url": "https://api.openstreetmap.org/api/0.6/map?bbox=80.2525,13.0025,80.2635,13.0145",
            "region": "Chennai, Tamil Nadu (Adyar demo bbox)",
            "bbox": BBOX,
            "crs": "EPSG:4326",
            "license": "ODbL 1.0",
            "feature_count": len(features),
        },
        "features": features,
    }
    path = os.path.join(DATA_DIR, "osm.adyar.geojson")
    write_json(path, output)
    print(f"OSM context: {len(features)} features -> {path}")


if __name__ == "__main__":
    clip_microsoft_buildings()
    convert_osm()