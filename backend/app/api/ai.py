from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Exercise, Decision, CommunicationEvent, ScenarioEvent, ExerciseLog, Scenario
from app.schemas.schemas import AIScenarioRequest, AIAARRequest, ScenarioResponse
from app.ai.provider import ai_service

router = APIRouter(prefix="/ai", tags=["ai"])

@router.post("/scenario/generate", response_model=ScenarioResponse)
async def generate_scenario_ai(payload: AIScenarioRequest, db: Session = Depends(get_db)):
    """Generates a structured scenario using AI with instant fallback validation."""
    scen_data = await ai_service.generate_scenario(
        objective=payload.objective,
        difficulty=payload.difficulty,
        duration_minutes=payload.duration_minutes,
        desired_disruptions=payload.desired_disruptions
    )

    # Save to database
    scenario = Scenario(
        code=scen_data.get("code", "SCEN-AI-GEN"),
        name=scen_data.get("name", "AI Generated Scenario"),
        description=scen_data.get("description", "Generated training scenario."),
        difficulty=scen_data.get("difficulty", payload.difficulty),
        duration_minutes=scen_data.get("duration_minutes", payload.duration_minutes),
        environment_data=scen_data.get("environment_data", {}),
        communication_rules=scen_data.get("communication_rules", {}),
        information_rules=scen_data.get("information_rules", {}),
        initial_conditions=scen_data.get("initial_conditions", {}),
        timed_events=scen_data.get("timed_events", []),
        objectives=scen_data.get("objectives", [payload.objective]),
        evaluation_criteria=scen_data.get("evaluation_criteria", []),
        is_template=False
    )
    db.add(scenario)
    db.commit()
    db.refresh(scenario)
    return scenario

@router.post("/aar/analyze")
async def analyze_aar_ai(payload: AIAARRequest, db: Session = Depends(get_db)):
    exercise = db.query(Exercise).filter(Exercise.id == payload.exercise_id).first()
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")

    decisions = db.query(Decision).filter(Decision.exercise_id == exercise.id).all()
    comms = db.query(CommunicationEvent).filter(CommunicationEvent.exercise_id == exercise.id).all()
    events = db.query(ScenarioEvent).filter(ScenarioEvent.exercise_id == exercise.id).all()

    meta = {
        "code": exercise.code,
        "elapsed_seconds": exercise.elapsed_seconds,
        "status": exercise.status
    }
    dec_dicts = [{"role": d.participant_role, "type": d.decision_type, "target": d.action_target, "rationale": d.rationale} for d in decisions]
    comm_dicts = [{"role": c.sender_role, "status": c.status, "delay": c.delay_seconds} for c in comms]
    evt_dicts = [{"type": e.event_type, "title": e.title} for e in events]
    metrics = {"comms_reliability": exercise.comms_reliability, "dropout_rate": exercise.dropout_rate}

    analysis = await ai_service.generate_aar_analysis(meta, dec_dicts, comm_dicts, evt_dicts, metrics)
    return analysis
