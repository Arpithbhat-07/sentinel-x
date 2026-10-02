from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.utils import get_exercise_or_404
from app.models.models import Exercise, Decision, ExerciseLog, Participant
from app.schemas.schemas import DecisionCreate, DecisionResponse
from app.websocket.manager import ws_manager

router = APIRouter(prefix="/exercises/{exercise_id}/decisions", tags=["decisions"])

@router.get("", response_model=List[DecisionResponse])
def get_decisions(exercise_id: str, db: Session = Depends(get_db)):
    exercise = get_exercise_or_404(exercise_id, db)
    return db.query(Decision).filter(Decision.exercise_id == exercise.id).order_by(Decision.created_at.asc()).all()

@router.post("", response_model=DecisionResponse)
async def submit_decision(
    exercise_id: str,
    payload: DecisionCreate,
    participant_role: str,
    participant_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    exercise = get_exercise_or_404(exercise_id, db)

    # Validate rationale
    if not payload.rationale or len(payload.rationale.strip()) < 8:
        raise HTTPException(status_code=400, detail="Substantive operational rationale required (minimum 8 characters)")

    decision = Decision(
        exercise_id=exercise.id,
        participant_id=participant_id,
        participant_role=participant_role,
        decision_type=payload.decision_type,
        action_target=payload.action_target,
        rationale=payload.rationale.strip(),
        confidence_score=payload.confidence_score,
        response_time_seconds=float(exercise.elapsed_seconds)
    )
    db.add(decision)

    log = ExerciseLog(
        exercise_id=exercise.id,
        actor_role=participant_role,
        event_type="DECISION_SUBMITTED",
        message=f"DECISION: {payload.decision_type} by {participant_role} ({payload.confidence_score}% conf). Rationale: {payload.rationale[:80]}...",
        metadata_json={
            "decision_type": payload.decision_type,
            "action_target": payload.action_target,
            "confidence_score": payload.confidence_score,
            "rationale": payload.rationale,
            "elapsed_seconds": exercise.elapsed_seconds
        }
    )
    db.add(log)
    db.commit()
    db.refresh(decision)

    # Broadcast decision to all room participants and instructor
    dec_payload = {
        "type": "DECISION_LOGGED",
        "id": decision.id,
        "participant_role": decision.participant_role,
        "decision_type": decision.decision_type,
        "action_target": decision.action_target,
        "rationale": decision.rationale,
        "confidence_score": decision.confidence_score,
        "response_time_seconds": decision.response_time_seconds,
        "created_at": decision.created_at.isoformat()
    }
    await ws_manager.broadcast(exercise.id, dec_payload)

    return decision
