from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.api.dependencies import get_current_user_from_header
from app.db import models
from app.services.demo_service import demo_service

router = APIRouter(prefix="/demo", tags=["demo"])

class DemoStatus(BaseModel):
    active_mode: Optional[str]
    is_running: bool

class DemoError(BaseModel):
    id: int
    title: str
    details: str
    timestamp: str
    fatal: bool
    github_issue_link: str

@router.post("/start")
async def start_demo(
    mode: str = Query(..., regex="^(local|persistent)$"),
    current_user: models.User = Depends(get_current_user_from_header)
):
    if not current_user.is_superuser and current_user.role != "admin":
         raise HTTPException(status_code=403, detail="Only Admins can start Demo Mode")

    await demo_service.start_demo(mode)
    return {"status": "started", "mode": mode}

@router.post("/stop")
async def stop_demo(
    current_user: models.User = Depends(get_current_user_from_header)
):
    if not current_user.is_superuser and current_user.role != "admin":
         raise HTTPException(status_code=403, detail="Only Admins can stop Demo Mode")

    demo_service.stop_demo()
    return {"status": "stopped"}

@router.get("/status", response_model=DemoStatus)
async def get_demo_status():
    return {
        "active_mode": demo_service.active_mode,
        "is_running": demo_service.task is not None
    }

@router.get("/errors", response_model=List[DemoError])
async def get_demo_errors(
    current_user: models.User = Depends(get_current_user_from_header)
):
    return demo_service.get_errors()

@router.delete("/errors")
async def clear_errors(
    current_user: models.User = Depends(get_current_user_from_header)
):
     demo_service.clear_errors()
     return {"status": "cleared"}
