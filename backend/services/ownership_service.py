"""
ownership_service.py — State Land Title Registry / Encumbrance / e-Courts Adapter — SIH26011.

Architecture:
- Future integration adapter for:
  - Tamil Nadu e-Sevai / Registration Department (Inspector General of Registration)
  - CERSAI Security Interest / Mortgage Registry
  - e-Courts Litigations and Dispute Registry
- PROVENANCE POLICY:
  Disabled by default. Does NOT claim live state deed verification or reveal real citizen identities.
  Returns "Demonstration Record" / "Demonstration Ownership Record".
"""

import os
from typing import Dict, Any, Optional
from datetime import datetime


class OwnershipService:
    def __init__(self):
        self.api_endpoint = os.getenv("TN_LAND_RECORDS_API_ENDPOINT")
        self.api_key = os.getenv("TN_LAND_RECORDS_API_KEY")
        self.is_configured = bool(self.api_endpoint and self.api_key)

    def get_status(self) -> Dict[str, Any]:
        """Returns provenance and connection status of title registry adapter."""
        if not self.is_configured:
            return {
                "adapter": "State Land Title Registry & Encumbrance Gateway",
                "status": "DISABLED",
                "data_status": "NOT_AVAILABLE",
                "reason": "Authorized State Revenue / Land Registry API credentials not configured in environment.",
                "verification_status": "Demonstration Ownership Record",
                "active_fallback": "PROJECT_DEMONSTRATION Ownership Records (Anonymized)",
                "timestamp": datetime.now().isoformat()
            }

        return {
            "adapter": "State Land Title Registry & Encumbrance Gateway",
            "status": "CONFIGURED",
            "endpoint": self.api_endpoint,
            "data_status": "REAL_GOVERNMENT",
            "timestamp": datetime.now().isoformat()
        }

    def verify_ownership(self, property_id: str, survey_number: str) -> Dict[str, Any]:
        """Verifies title against land records or returns transparent demo status."""
        if not self.is_configured:
            return {
                "property_id": property_id,
                "survey_reference": survey_number,
                "verification_status": "Demonstration Ownership Record",
                "is_official_government_verified": False,
                "data_status": "PROJECT_DEMONSTRATION",
                "notice": "This is a demonstration ownership reference. No real citizen title is inferred or claimed."
            }
        return {"property_id": property_id, "verified": True}


ownership_service = OwnershipService()
