"""
bhuvan.py — Router for Bhuvan / NRSC (ISRO) Real Government Geospatial Integration — SIH26011.

Endpoints:
- GET /api/bhuvan/layers — All registered Bhuvan geospatial layers
- GET /api/bhuvan/dem/status — CartoDEM status, metadata, and service health
- GET /api/bhuvan/imagery/status — High-res satellite imagery status and tile template
- GET /api/bhuvan/thematic/layers — Bhuvan thematic layers (LULC, waterbodies)
"""

from fastapi import APIRouter
from services.bhuvan_service import (
    get_bhuvan_layers, get_bhuvan_dem_status,
    get_bhuvan_imagery_status, get_bhuvan_thematic_layers,
    check_bhuvan_service_health, BHUVAN_OFFICIAL_LAYERS
)

router = APIRouter()


@router.get("/status")
def api_get_bhuvan_status():
    """Returns overall status of Bhuvan / NRSC ISRO geospatial service integration."""
    return {
        "status": "online",
        "service": "Bhuvan / NRSC (ISRO)",
        "provider": "National Remote Sensing Centre / ISRO",
        "data_status": "REAL_GOVERNMENT",
        "layers_available": len(BHUVAN_OFFICIAL_LAYERS)
    }


@router.get("/layers")
def api_get_bhuvan_layers():
    """Returns official Bhuvan / NRSC (ISRO) spatial layers."""
    return get_bhuvan_layers()


@router.get("/dem/status")
def api_get_bhuvan_dem_status():
    """Returns CartoDEM elevation dataset status, metadata, and server health."""
    return get_bhuvan_dem_status()


@router.get("/imagery/status")
def api_get_bhuvan_imagery_status():
    """Returns Bhuvan high-resolution satellite imagery service parameters."""
    return get_bhuvan_imagery_status()


@router.get("/thematic/layers")
def api_get_bhuvan_thematic_layers():
    """Returns Bhuvan thematic spatial layers (LULC, waterbodies)."""
    return get_bhuvan_thematic_layers()


@router.get("/health")
def api_get_bhuvan_health():
    """Live connectivity and latency check for NRSC Bhuvan gateways."""
    return check_bhuvan_service_health()
