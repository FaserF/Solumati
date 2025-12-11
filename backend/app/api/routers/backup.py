from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse, Response
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Dict, Any
import json
import logging
from datetime import datetime

# Local modules
from app.core.database import get_db, Base
from app.api.dependencies import require_admin
from app.db import models, schemas
from app.services.utils import get_setting, save_setting

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/backup", tags=["admin"])

# --- Helper: Serialize/Deserialize ---

def serialize_model(instance):
    """Converts a SQLAlchemy model instance to a dictionary."""
    data = {}
    for column in instance.__table__.columns:
        val = getattr(instance, column.name)
        if isinstance(val, datetime):
            data[column.name] = val.isoformat()
        else:
            data[column.name] = val
    return data

def get_model_class(tablename):
    """Finds the model class by tablename."""
    for mapper in Base.registry.mappers:
        if mapper.mapped_table.name == tablename:
            return mapper.class_
    return None

# --- Endpoints ---

@router.get("/settings/export")
def export_settings(db: Session = Depends(get_db), current_admin: models.User = Depends(require_admin)):
    """Exports all system settings as JSON."""
    settings = db.query(models.SystemSetting).all()
    export_data = {
        "export_type": "settings",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0",
        "data": [serialize_model(s) for s in settings]
    }

    # Create file response
    json_str = json.dumps(export_data, indent=2)
    filename = f"solumati_settings_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"

    return Response(
        content=json_str,
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.post("/settings/import")
async def import_settings(file: UploadFile = File(...), db: Session = Depends(get_db), current_admin: models.User = Depends(require_admin)):
    """Imports system settings from JSON."""
    try:
        content = await file.read()
        data = json.loads(content)

        if data.get("export_type") != "settings":
            raise HTTPException(400, "Invalid file type. Expected settings export.")

        settings_list = data.get("data", [])
        count = 0

        for item in settings_list:
            key = item.get("key")
            value = item.get("value")
            if key:
                save_setting(db, key, json.loads(value) if isinstance(value, str) and (value.startswith('{') or value.startswith('[')) else value)
                count += 1

        logger.info(f"Admin {current_admin.username} imported {count} settings.")
        return {"status": "success", "imported_count": count}

    except json.JSONDecodeError:
        raise HTTPException(400, "Invalid JSON file.")
    except Exception as e:
        logger.error(f"Import failed: {e}")
        raise HTTPException(500, f"Import failed: {str(e)}")


@router.get("/database/export")
def export_database(db: Session = Depends(get_db), current_admin: models.User = Depends(require_admin)):
    """
    Exports ALL database tables to a JSON structure.
    This is a logical backup suitable for migration between instances.
    """
    export_data = {
        "export_type": "full_database",
        "timestamp": datetime.utcnow().isoformat(),
        "tables": {}
    }

    # Iterate over all registered models in Base
    # Order matters for foreign keys? For restoring we might need to disable FK checks or sort.
    # For now, we dump everything and handle order on import (or rely on deferred constraints if Postgres).
    # Simple strategy: disable integrity checks during import.

    for mapper in Base.registry.mappers:
        model = mapper.class_
        tablename = mapper.mapped_table.name

        # Skip some logs if needed? No, user asked for full migration.

        rows = db.query(model).all()
        export_data["tables"][tablename] = [serialize_model(row) for row in rows]

    json_str = json.dumps(export_data, indent=2) # Might be large, better to stream? valid for reasonable usage.
    filename = f"solumati_full_backup_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"

    return Response(
        content=json_str,
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.post("/database/import")
async def import_database(file: UploadFile = File(...), db: Session = Depends(get_db), current_admin: models.User = Depends(require_admin)):
    """
    Imports a full database backup.
    WARNING: This wipes existing data or merges?
    Strategy: "Server Migration" implies replacing data.
    Safest is to truncate tables and insert.
    """
    try:
        content = await file.read()
        data = json.loads(content)

        if data.get("export_type") != "full_database":
            raise HTTPException(400, "Invalid file type. Expected full_database export.")

        tables_data = data.get("tables", {})

        # Order of restoration to respect Foreign Keys:
        # 1. Users (referenced by many)
        # 2. LinkedAccounts, Reports, Messages, Notifications
        # SystemSettings is independent.

        # Actually, best generic way: Disable FK checks.
        is_sqlite = 'sqlite' in str(db.get_bind().url)
        is_postgres = 'postgresql' in str(db.get_bind().url)

        try:
            if is_sqlite:
                db.execute(text("PRAGMA foreign_keys = OFF;"))
            elif is_postgres:
                # This requires superuser or specific permissions, might fail on some cloud DBs.
                # Alternative: Delete contents in reverse order of dependency?
                db.execute(text("SET session_replication_role = 'replica';"))

            # Truncate Phase? Or Merge?
            # "Server Migration" usually means "Make this server look like the old one".
            # So we should probably clear existing data to avoid ID conflicts.

            # Simple approach: clear all known tables.
            # We iterate in reverse dependency order ideally, but with FKs off it doesn't matter for deletion.

            # Deletion List (Manual implementation of dependency order to be safe)
            tables_to_clear = [
               "reports", "messages", "notifications", "linked_accounts", "users", "system_settings"
            ]

            # Or use metadata sorted tables
            for table in reversed(Base.metadata.sorted_tables):
                 db.execute(text(f"DELETE FROM {table.name}"))

            # Insert Phase
            for tablename, rows in tables_data.items():
                model = get_model_class(tablename)
                if not model:
                     logger.warning(f"Skipping unknown table in backup: {tablename}")
                     continue

                for row_data in rows:
                    # Fix DateTime strings back to objects
                    for col in model.__table__.columns:
                        if isinstance(col.type, (schemas.DateTime, models.DateTime)) and row_data.get(col.name):
                             # Basic ISO parsing
                             try:
                                 row_data[col.name] = datetime.fromisoformat(row_data[col.name])
                             except:
                                 pass # Keep as string if fail? SQLAlchemy might handle it.

                    obj = model(**row_data)
                    db.add(obj)

            db.commit()

            # Fix sequences in Postgres (Important for ID auto-increment)
            if is_postgres:
                 for table in Base.metadata.sorted_tables:
                     if table.primary_key:
                         pk_col = list(table.primary_key.columns)[0].name
                         seq_fix = f"SELECT setval(pg_get_serial_sequence('{table.name}', '{pk_col}'), COALESCE(MAX({pk_col}), 1)) FROM {table.name};"
                         try:
                             db.execute(text(seq_fix))
                         except Exception as e:
                             logger.warning(f"Could not reset sequence for {table.name}: {e}")

        finally:
             if is_sqlite:
                 db.execute(text("PRAGMA foreign_keys = ON;"))
             elif is_postgres:
                 db.execute(text("SET session_replication_role = 'origin';"))

        logger.info(f"Admin {current_admin.username} restored database from backup.")
        return {"status": "success", "message": "Database restored successfully."}

    except json.JSONDecodeError:
        raise HTTPException(400, "Invalid JSON file.")
    except Exception as e:
        db.rollback()
        logger.error(f"Restore failed: {e}")
        raise HTTPException(500, f"Restore failed: {str(e)}")
