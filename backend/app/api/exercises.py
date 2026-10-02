import random
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.utils import get_exercise_or_404
from app.models.models import Exercise, Scenario, Participant, ScenarioEvent, ExerciseLog, User
from app.schemas.schemas import ExerciseCreate, ExerciseResponse, ExerciseDetailResponse, ParticipantResponse
from app.simulation.engine import exercise_engine
from app.websocket.manager import ws_manager

router = APIRouter(prefix="/exercises", tags=["exercises"])

def generate_exercise_code():
    chars = "ABCDEFGHJKLMNPQRSTUVWXYZ"
    nums = "23456789"
    prefix = "".join(random.choices(chars, k=4))
    suffix = "".join(random.choices(nums, k=4))
    return f"{prefix}-{suffix}"

@router.get("", response_model=List[ExerciseResponse])
def get_exercises(db: Session = Depends(get_db)):
    return db.query(Exercise).order_by(Exercise.created_at.desc()).all()

@router.get("/active-count")
def get_counts(db: Session = Depends(get_db)):
    active = db.query(Exercise).filter(Exercise.status == "RUNNING").count()
    completed = db.query(Exercise).filter(Exercise.status == "COMPLETED").count()
    scenarios = db.query(Scenario).count()
    trainees = db.query(Participant).count()
    return {
        "active_exercises": active,
        "completed_exercises": completed,
        "total_scenarios": scenarios,
        "total_trainees": trainees
    }

@router.get("/{exercise_id}", response_model=ExerciseDetailResponse)
def get_exercise(exercise_id: str, db: Session = Depends(get_db)):
    exercise = db.query(Exercise).filter(
        (Exercise.id == exercise_id) | (Exercise.code == exercise_id)
    ).first()
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")
    return exercise

@router.post("", response_model=ExerciseDetailResponse)
def create_exercise(payload: ExerciseCreate, db: Session = Depends(get_db)):
    scenario = db.query(Scenario).filter(Scenario.id == payload.scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")

    code = payload.custom_code or generate_exercise_code()
    # Check uniqueness
    while db.query(Exercise).filter(Exercise.code == code).first():
        code = generate_exercise_code()

    comms_rules = scenario.communication_rules or {}
    exercise = Exercise(
        code=code,
        scenario_id=scenario.id,
        status="PENDING",
        comms_reliability=float(comms_rules.get("initial_reliability", 1.0)),
        message_delay_sec=float(comms_rules.get("initial_latency_sec", 0.0)),
        dropout_rate=float(comms_rules.get("initial_dropout_rate", 0.0)),
        is_demo=payload.is_demo,
        active_disruptions=[]
    )
    db.add(exercise)
    db.commit()
    db.refresh(exercise)

    # Populate scheduled events from scenario
    for evt_data in (scenario.timed_events or []):
        scen_evt = ScenarioEvent(
            exercise_id=exercise.id,
            event_type=evt_data.get("event_type", "CUSTOM"),
            target_role=evt_data.get("target_role", "ALL"),
            title=evt_data.get("title", "Timed Event"),
            description=evt_data.get("description", ""),
            payload=evt_data.get("payload", {}),
            scheduled_second=int(evt_data.get("scheduled_second", 0)),
            triggered=False
        )
        db.add(scen_evt)

    # If demo, populate default simulated participant agents
    if payload.is_demo:
        roles = [
            ("Commander", "Col. V. Rao (Mission Commander)"),
            ("Recon Officer", "Lt. Sharma (Ghost Eye-1)"),
            ("Field Unit", "Maj. K. Singh (Vanguard-3)"),
            ("Communications Officer", "Capt. D. Nair (Relay Hub-6)")
        ]
        for role_name, disp_name in roles:
            part = Participant(
                exercise_id=exercise.id,
                role=role_name,
                display_name=disp_name,
                status="READY",
                is_simulated=True
            )
            db.add(part)

    log = ExerciseLog(
        exercise_id=exercise.id,
        actor_role="SYSTEM",
        event_type="EXERCISE_CREATED",
        message=f"Exercise {exercise.code} created for scenario '{scenario.name}'"
    )
    db.add(log)
    db.commit()
    db.refresh(exercise)
    return exercise

@router.post("/demo", response_model=ExerciseDetailResponse)
def start_demo_exercise(db: Session = Depends(get_db)):
    """One-click demo creation for SIH demonstration."""
    # Find or use the first scenario
    scenario = db.query(Scenario).filter(Scenario.code == "SCEN-01-SIGNAL-LOSS").first()
    if not scenario:
        scenario = db.query(Scenario).first()
    if not scenario:
        raise HTTPException(status_code=400, detail="No scenario available to start demo")

    code = "SNTL-4821"
    # If an existing exercise with SNTL-4821 is active, we can reset or reuse it
    existing = db.query(Exercise).filter(Exercise.code == code).first()
    if existing:
        exercise_engine.stop_exercise(existing.id)
        db.delete(existing)
        db.commit()

    create_payload = ExerciseCreate(
        scenario_id=scenario.id,
        is_demo=True,
        custom_code=code
    )
    return create_exercise(create_payload, db)

@router.post("/{exercise_id}/start")
async def start_exercise(exercise_id: str, db: Session = Depends(get_db)):
    exercise = get_exercise_or_404(exercise_id, db)

    exercise.status = "RUNNING"
    if not exercise.start_time:
        exercise.start_time = datetime.now(timezone.utc)
    
    log = ExerciseLog(
        exercise_id=exercise.id,
        actor_role="INSTRUCTOR",
        event_type="EXERCISE_STARTED",
        message=f"Exercise {exercise.code} started by Instructor"
    )
    db.add(log)
    db.commit()

    exercise_engine.start_exercise(exercise.id)
    await ws_manager.broadcast(exercise.id, {
        "type": "EXERCISE_STATUS_CHANGED",
        "status": "RUNNING",
        "exercise_id": exercise.id,
        "code": exercise.code
    })

    return {"status": "RUNNING", "id": exercise.id}

@router.post("/{exercise_id}/pause")
async def pause_exercise(exercise_id: str, db: Session = Depends(get_db)):
    exercise = get_exercise_or_404(exercise_id, db)

    exercise.status = "PAUSED"
    exercise_engine.pause_exercise(exercise.id)
    db.commit()

    await ws_manager.broadcast(exercise.id, {
        "type": "EXERCISE_STATUS_CHANGED",
        "status": "PAUSED",
        "exercise_id": exercise.id
    })
    return {"status": "PAUSED"}

@router.post("/{exercise_id}/resume")
async def resume_exercise(exercise_id: str, db: Session = Depends(get_db)):
    exercise = get_exercise_or_404(exercise_id, db)

    exercise.status = "RUNNING"
    exercise_engine.start_exercise(exercise.id)
    db.commit()

    await ws_manager.broadcast(exercise.id, {
        "type": "EXERCISE_STATUS_CHANGED",
        "status": "RUNNING",
        "exercise_id": exercise.id
    })
    return {"status": "RUNNING"}

@router.post("/{exercise_id}/end")
async def end_exercise(exercise_id: str, db: Session = Depends(get_db)):
    exercise = get_exercise_or_404(exercise_id, db)

    exercise.status = "COMPLETED"
    exercise.end_time = datetime.now(timezone.utc)
    exercise_engine.stop_exercise(exercise.id)
    
    log = ExerciseLog(
        exercise_id=exercise.id,
        actor_role="INSTRUCTOR",
        event_type="EXERCISE_COMPLETED",
        message=f"Exercise {exercise.code} completed. Final elapsed time: {exercise.elapsed_seconds}s"
    )
    db.add(log)
    db.commit()

    await ws_manager.broadcast(exercise.id, {
        "type": "EXERCISE_STATUS_CHANGED",
        "status": "COMPLETED",
        "exercise_id": exercise.id
    })
    return {"status": "COMPLETED"}

@router.post("/{exercise_id}/join", response_model=ParticipantResponse)
async def join_exercise(
    exercise_id: str,
    role: str,
    display_name: str,
    user_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    exercise = db.query(Exercise).filter(
        (Exercise.id == exercise_id) | (Exercise.code == exercise_id)
    ).first()
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")

    # Find existing participant by role or user
    part = db.query(Participant).filter(
        Participant.exercise_id == exercise.id,
        Participant.role == role
    ).first()

    if not part:
        part = Participant(
            exercise_id=exercise.id,
            user_id=user_id,
            role=role,
            display_name=display_name,
            status="CONNECTED",
            is_simulated=False
        )
        db.add(part)
    else:
        part.status = "CONNECTED"
        part.display_name = display_name
        part.is_simulated = False
        part.last_seen = datetime.now(timezone.utc)

    db.commit()
    db.refresh(part)
    return part
