from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, JSONResponse
import os
import logging
from logging_config import logger

router = APIRouter()

# Serve .well-known/assetlinks.json
@router.get("/.well-known/assetlinks.json")
def get_assetlinks():
    """Serves the assetlinks.json file for Android App Links and TWA verification."""
    # We look for the file in backend/static/assetlinks.json
    # This file must be placed there by the admin or CI/CD process.
    file_path = os.path.join("static", "assetlinks.json")

    if os.path.exists(file_path):
        return FileResponse(file_path, media_type="application/json")
    else:
        logger.warning(f"assetlinks.json requested but not found at {file_path}")
        # Return 404 but with a helpful message or empty array if preferred?
        # TWA expects valid JSON or 404.
        raise HTTPException(status_code=404, detail="assetlinks.json not found on server")
