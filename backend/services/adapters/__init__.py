"""
Normalized Geospatial Source Adapters — SIH26011.

Normalized flow:
SOURCE -> ADAPTER -> NORMALIZED GEOSPATIAL SCHEMA -> VALIDATION -> DATABASE -> PROCESSING -> 3D VISUALIZATION
"""

from typing import Dict, Any, List, Optional
from datetime import datetime


class BaseGeospatialAdapter:
    """Base class for all multi-source geospatial data adapters."""

    def __init__(self, source_name: str, data_status: str, source_type: str):
        self.source_name = source_name
        self.data_status = data_status  # REAL_OPEN, REAL_GOVERNMENT, REAL_IMPORTED, DERIVED, PROJECT_DEMONSTRATION, NOT_AVAILABLE
        self.source_type = source_type

    def get_metadata(self) -> Dict[str, Any]:
        return {
            "source_name": self.source_name,
            "data_status": self.data_status,
            "source_type": self.source_type,
            "timestamp": datetime.now().isoformat()
        }

    def fetch(self, **kwargs) -> Any:
        raise NotImplementedError


class TNGISAdapter(BaseGeospatialAdapter):
    def __init__(self):
        super().__init__("TNGIS Official OGC Services", "REAL_GOVERNMENT", "OGC Feature API")

    def fetch(self, collection_id: str, limit: int = 50):
        from services.tngis_service import get_tngis_layer_items
        return get_tngis_layer_items(collection_id, limit)


class BhuvanAdapter(BaseGeospatialAdapter):
    def __init__(self):
        super().__init__("Bhuvan / NRSC (ISRO)", "REAL_GOVERNMENT", "OGC WMS / WMTS")

    def fetch(self):
        from services.bhuvan_service import get_bhuvan_layers
        return get_bhuvan_layers()


class OSMAdapter(BaseGeospatialAdapter):
    def __init__(self):
        super().__init__("OpenStreetMap Contributors", "REAL_OPEN", "Vector Geometries")

    def fetch(self):
        return {"layers": ["roads", "waterways", "bridges", "mapped_infrastructure"]}


class MicrosoftBuildingAdapter(BaseGeospatialAdapter):
    def __init__(self):
        super().__init__("Microsoft Global ML Building Footprints", "REAL_OPEN", "Vector Polygons")

    def fetch(self, bbox: List[float], limit: int = 600):
        from services.index_tn_buildings import query_buildings_spatial
        if len(bbox) == 4:
            return query_buildings_spatial(bbox[0], bbox[1], bbox[2], bbox[3], limit=limit)
        return []


class CORSAdapter(BaseGeospatialAdapter):
    def __init__(self):
        super().__init__("Survey of India CORS Network", "NOT_AVAILABLE", "NTRIP RTCM3 Stream")

    def fetch(self):
        from services.cors_service import cors_service
        return cors_service.get_status()


class CadastralAdapter(BaseGeospatialAdapter):
    def __init__(self):
        super().__init__("Project Demonstration Cadastral Dataset", "PROJECT_DEMONSTRATION", "Cadastral Parcels")


class OwnershipAdapter(BaseGeospatialAdapter):
    def __init__(self):
        super().__init__("Project Demonstration Ownership Registry", "PROJECT_DEMONSTRATION", "Title Deed Records")


class LiDARAdapter(BaseGeospatialAdapter):
    def __init__(self):
        super().__init__("Project Demonstration LiDAR Dataset", "PROJECT_DEMONSTRATION", "LAS 1.2 Point Cloud")


class DroneAdapter(BaseGeospatialAdapter):
    def __init__(self):
        super().__init__("Project Demonstration Drone Dataset", "PROJECT_DEMONSTRATION", "GeoTIFF Orthophoto")


class FloorPlanAdapter(BaseGeospatialAdapter):
    def __init__(self):
        super().__init__("Project Demonstration Floor Plan", "PROJECT_DEMONSTRATION", "Vector Architectural CAD")


class UtilityAdapter(BaseGeospatialAdapter):
    def __init__(self):
        super().__init__("Project Demonstration Utility Dataset", "PROJECT_DEMONSTRATION", "Subsurface Vector Network")
