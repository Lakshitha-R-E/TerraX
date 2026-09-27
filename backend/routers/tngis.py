"""
tngis.py — Router for TNGIS Official Real Government GIS Integration — SIH26011.

Endpoints:
- GET /api/tngis/catalog — Discovered TNGIS OGC API Catalog
- GET /api/tngis/collections — Discovered collections
- GET /api/tngis/layers — Active Tamil Nadu GIS layers
- GET /api/tngis/layer/{collection_id} — Specific layer metadata
- GET /api/tngis/layer/{collection_id}/items — Proxied and cached GeoJSON items
- POST /api/tngis/refresh — Refreshes cache
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any
from services.tngis_service import (
    get_tngis_catalog, get_tngis_collections, get_tngis_layers,
    get_tngis_layer_details, get_tngis_layer_items, clear_tngis_cache
)

router = APIRouter()


@router.get("/status")
def api_get_tngis_status():
    """Returns status of TNGIS government GIS service integration."""
    return {
        "status": "online",
        "service": "TNGIS Official OGC API",
        "provider": "Tamil Nadu Geographic Information System",
        "data_status": "REAL_GOVERNMENT",
        "base_url": "https://www.tngis.org/api/search"
    }


@router.get("/catalog")
def api_get_tngis_catalog():
    """Returns official TNGIS OGC API catalog metadata."""
    return get_tngis_catalog()


@router.get("/collections")
def api_get_tngis_collections():
    """Returns available OGC API collections from TNGIS."""
    return get_tngis_collections()


@router.get("/layers")
def api_get_tngis_layers():
    """Returns official Tamil Nadu government GIS layers."""
    return get_tngis_layers()


@router.get("/layer/{collection_id}")
def api_get_tngis_layer_details(collection_id: str):
    """Returns metadata for a specific TNGIS collection or item."""
    return get_tngis_layer_details(collection_id)


@router.get("/layer/{collection_id}/items")
def api_get_tngis_layer_items(collection_id: str, limit: int = Query(50, ge=1, le=500)):
    """Proxies and caches layer features for visualization."""
    return get_tngis_layer_items(collection_id, limit=limit)


@router.post("/refresh")
def api_refresh_tngis():
    """Flushes cache and refetches latest metadata from TNGIS."""
    return clear_tngis_cache()
