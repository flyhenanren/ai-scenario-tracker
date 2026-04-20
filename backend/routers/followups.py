from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, date

from backend.database import get_db
from backend.models import Scenario, FollowUp
from backend.schemas import FollowUpCreate, FollowUpResponse, FollowUpListResponse

router = APIRouter(prefix="/api", tags=["followups"])


@router.get("/scenarios/{scene_id}/followups", response_model=FollowUpListResponse)
def list_followups(scene_id: int, db: Session = Depends(get_db)):
    scenario = db.query(Scenario).filter(Scenario.id == scene_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="场景不存在")

    followups = db.query(FollowUp).filter(
        FollowUp.scene_id == scene_id
    ).order_by(FollowUp.followup_date.desc()).all()

    return FollowUpListResponse(followups=followups, total=len(followups))


@router.post("/scenarios/{scene_id}/followups", response_model=FollowUpResponse, status_code=201)
def create_followup(scene_id: int, followup_data: FollowUpCreate, db: Session = Depends(get_db)):
    scenario = db.query(Scenario).filter(Scenario.id == scene_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="场景不存在")

    # Get next round number
    last_followup = db.query(FollowUp).filter(
        FollowUp.scene_id == scene_id
    ).order_by(FollowUp.followup_round.desc()).first()

    next_round = (last_followup.followup_round + 1) if last_followup else 1

    # Update scenario's last_followup_date
    scenario.last_followup_date = datetime.now()
    scenario.maturity_level = followup_data.maturity_level
    scenario.lifecycle_status = followup_data.lifecycle_status
    if followup_data.category:
        scenario.category = followup_data.category
    if followup_data.next_followup_date:
        scenario.next_followup_date = followup_data.next_followup_date

    followup = FollowUp(
        scene_id=scene_id,
        scene_code=scenario.scene_code,
        followup_round=next_round,
        **followup_data.model_dump(exclude={"followup_round"})
    )

    db.add(followup)
    db.commit()
    db.refresh(followup)
    return followup


@router.get("/followups/overdue", response_model=List[dict])
def get_overdue_followups(db: Session = Depends(get_db)):
    """获取需要跟进的场景列表（下次跟进时间已到或超期）"""
    today = date.today()

    scenarios = db.query(Scenario).filter(
        Scenario.next_followup_date <= today,
        Scenario.lifecycle_status.notin_(["已完成", "已废弃"])
    ).all()

    result = []
    for s in scenarios:
        days_overdue = (today - s.next_followup_date).days if s.next_followup_date else 0

        last_followup = db.query(FollowUp).filter(
            FollowUp.scene_id == s.id
        ).order_by(FollowUp.followup_date.desc()).first()

        result.append({
            "id": s.id,
            "scene_code": s.scene_code,
            "name": s.name,
            "source_dept": s.source_dept,
            "lifecycle_status": s.lifecycle_status,
            "maturity_level": s.maturity_level,
            "category": s.category,
            "next_followup_date": s.next_followup_date,
            "last_followup_date": s.last_followup_date,
            "days_overdue": days_overdue,
            "last_followup_round": last_followup.followup_round if last_followup else 0,
            "last_progress_summary": last_followup.progress_summary if last_followup else None
        })

    result.sort(key=lambda x: x["days_overdue"], reverse=True)
    return result
