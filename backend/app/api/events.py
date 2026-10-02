from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.utils import get_exercise_or_404
from app.models.models import Exercise, ScenarioEvent, ExerciseLog, InformationReport
from app.schemas.schemas import EventInjectRequest, ScenarioEventResponse
from app.simulation.engine import exercise_engine
from app.websocket.manager import ws_manager

router = APIRouter(prefix="/exercises/{exercise_id}/events", tags=["events"])

@router.get("", response_model=List[ScenarioEventResponse])
def get_exercise_events(exercise_id: str, db: Session = Depends(get_db)):
    exercise = get_exercise_or_404(exercise_id, db)
    return db.query(ScenarioEvent).filter(ScenarioEvent.exercise_id == exercise.id).order_by(ScenarioEvent.scheduled_second.asc()).all()

@router.get("/logs")
def get_exercise_logs(exercise_id: str, limit: int = 100, db: Session = Depends(get_db)):
    exercise = get_exercise_or_404(exercise_id, db)
    logs = db.query(ExerciseLog).filter(ExerciseLog.exercise_id == exercise.id).order_by(ExerciseLog.created_at.desc()).limit(limit).all()
    return [
        {
            "id": l.id,
            "exercise_id": l.exercise_id,
            "actor_role": l.actor_role,
            "event_type": l.event_type,
            "message": l.message,
            "metadata": l.metadata_json,
            "created_at": l.created_at.isoformat()
        }
        for l in reversed(logs)
    ]

@router.post("/inject", response_model=ScenarioEventResponse)
async def inject_event(
    exercise_id: str,
    payload: EventInjectRequest,
    db: Session = Depends(get_db)
):
    """Allows instructor to inject disruptions or scenario changes in real-time."""
    exercise = get_exercise_or_404(exercise_id, db)

    payload_dict = {
        "delay": payload.delay_seconds or 0.0,
        "dropout": payload.dropout_probability or 0.0,
        "reliability": 1.0 - (payload.reliability_impact or 0.0),
        "duration": payload.duration_seconds or 60,
        "sector": payload.sector or "Sector Bravo"
    }

    evt = ScenarioEvent(
        exercise_id=exercise.id,
        event_type=payload.event_type,
        target_role=payload.target_role,
        title=payload.title,
        description=payload.description,
        payload=payload_dict,
        scheduled_second=exercise.elapsed_seconds,
        triggered=True,
        triggered_at=datetime.now(timezone.utc)
    )
    db.add(evt)
    db.commit()
    db.refresh(evt)

    # Immediately apply event through exercise engine
    await exercise_engine._apply_event(db, exercise, evt)
    db.commit()

    return evt
