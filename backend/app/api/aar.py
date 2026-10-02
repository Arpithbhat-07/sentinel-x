from datetime import datetime, timezone
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.utils import get_exercise_or_404
from app.models.models import Exercise, Decision, CommunicationEvent, ScenarioEvent, ExerciseLog, AARReport
from app.schemas.schemas import AARReportResponse
from app.ai.provider import ai_service
from app.simulation.degradation import DegradationEngine
from app.services.pdf_service import generate_aar_pdf

router = APIRouter(prefix="/exercises/{exercise_id}/aar", tags=["aar"])

@router.get("", response_model=AARReportResponse)
def get_aar(exercise_id: str, db: Session = Depends(get_db)):
    exercise = db.query(Exercise).filter(
        (Exercise.id == exercise_id) | (Exercise.code == exercise_id)
    ).first()
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")

    aar = db.query(AARReport).filter(AARReport.exercise_id == exercise.id).first()
    if not aar:
        return generate_aar(exercise.id, db)

    decisions = db.query(Decision).filter(Decision.exercise_id == exercise.id).order_by(Decision.created_at.asc()).all()
    aar.decisions = [
        {
            "id": d.id,
            "role": d.participant_role,
            "type": d.decision_type,
            "target": d.action_target,
            "confidence": d.confidence_score,
            "rationale": d.rationale,
            "response_time_seconds": d.response_time_seconds,
            "timestamp": d.created_at.isoformat()
        }
        for d in decisions
    ]
    aar.exercise_metadata = {
        "code": exercise.code,
        "scenario_name": exercise.scenario.name if exercise.scenario else "Operation Sentinel",
        "duration_seconds": exercise.elapsed_seconds,
        "status": exercise.status,
        "participants_count": len(exercise.participants) if exercise.participants else 4
    }
    return aar

@router.post("/generate", response_model=AARReportResponse)
def generate_aar(exercise_id: str, db: Session = Depends(get_db)):
    exercise = db.query(Exercise).filter(
        (Exercise.id == exercise_id) | (Exercise.code == exercise_id)
    ).first()
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")

    decisions = db.query(Decision).filter(Decision.exercise_id == exercise.id).order_by(Decision.created_at.asc()).all()
    comms = db.query(CommunicationEvent).filter(CommunicationEvent.exercise_id == exercise.id).all()
    events = db.query(ScenarioEvent).filter(ScenarioEvent.exercise_id == exercise.id).all()
    logs = db.query(ExerciseLog).filter(ExerciseLog.exercise_id == exercise.id).all()

    # Calculate Individual Metrics per role
    roles = ["Commander", "Recon Officer", "Field Unit", "Communications Officer"]
    individual_metrics = {}
    for r in roles:
        role_decs = [d for d in decisions if d.participant_role == r]
        role_comms = [c for c in comms if c.sender_role == r]
        avg_resp = (sum(d.response_time_seconds for d in role_decs) / len(role_decs)) if role_decs else 0.0
        avg_conf = (sum(d.confidence_score for d in role_decs) / len(role_decs)) if role_decs else 0.0
        
        individual_metrics[r] = {
            "decisions_count": len(role_decs),
            "messages_sent": len(role_comms),
            "average_response_time_sec": round(avg_resp, 1),
            "average_confidence": round(avg_conf, 1),
            "decision_types": [d.decision_type for d in role_decs],
            "verification_requests": sum(1 for d in role_decs if d.decision_type == "REQUEST_VERIFICATION"),
            "compliance_rating": "HIGH" if len(role_comms) > 2 else "MODERATE"
        }

    # Calculate Communication Resilience Metrics
    total_msgs = len(comms)
    delivered = sum(1 for c in comms if c.status == "DELIVERED")
    dropped = sum(1 for c in comms if c.status == "DROPOUT" or c.status == "DROPPED")
    delayed = sum(1 for c in comms if c.status == "DELAYED")
    corrupted = sum(1 for c in comms if c.status == "CORRUPTED")
    avg_latency = (sum(c.delay_seconds for c in comms) / total_msgs) if total_msgs > 0 else 0.0

    resilience_summary = DegradationEngine.calculate_metrics_summary(
        total_msgs, delivered, dropped, delayed, corrupted, avg_latency
    )

    # Team Coordination Indicators
    coordination_metrics = {
        "total_coordination_messages": total_msgs,
        "inter_role_exchange_density": round(total_msgs / max(1, len(roles)), 1),
        "adaptation_score_percent": round(max(40.0, min(95.0, 100 - (dropped * 8) + (len(decisions) * 5))), 1),
        "information_sharing_frequency": "OPTIMAL" if total_msgs > 5 else "CONSERVATIVE"
    }

    # Decision Quality Observable Indicators (Behavioral, non-subjective)
    verification_count = sum(1 for d in decisions if d.decision_type == "REQUEST_VERIFICATION")
    hold_count = sum(1 for d in decisions if d.decision_type == "HOLD")
    route_change_count = sum(1 for d in decisions if d.decision_type == "CHANGE_ROUTE")
    
    decision_quality_metrics = {
        "total_decisions": len(decisions),
        "verification_discipline_rate": round((verification_count / max(1, len(decisions))) * 100, 1),
        "prudent_holds_count": hold_count,
        "adaptive_route_modifications": route_change_count,
        "average_rationale_length_words": round(
            sum(len(d.rationale.split()) for d in decisions) / max(1, len(decisions)), 1
        ),
        "uncertainty_awareness_index": "STRONG" if verification_count >= 1 else "STANDARD"
    }

    # Timeline points
    timeline = []
    for l in logs:
        timeline.append({
            "timestamp": l.created_at.isoformat(),
            "actor": l.actor_role,
            "type": l.event_type,
            "title": l.message[:90],
            "metadata": l.metadata_json
        })

    # AI Analysis (Synchronous or deterministic fallback)
    meta = {
        "scenario_id": exercise.scenario_id,
        "exercise_code": exercise.code,
        "elapsed_seconds": exercise.elapsed_seconds,
        "disruptions_logged": exercise.active_disruptions
    }
    
    # We call fallback directly or generate via ai_service
    dec_dicts = [
        {"role": d.participant_role, "type": d.decision_type, "target": d.action_target, "conf": d.confidence_score, "rationale": d.rationale}
        for d in decisions
    ]
    comm_dicts = [
        {"sender": c.sender_role, "status": c.status, "delay": c.delay_seconds}
        for c in comms
    ]
    evt_dicts = [
        {"type": e.event_type, "title": e.title}
        for e in events
    ]

    # Generate fallback or live AI analysis
    ai_analysis_data = ai_service._fallback_aar_analysis(
        meta, dec_dicts, comm_dicts, evt_dicts, resilience_summary
    )

    exec_summary = ai_analysis_data.get("executive_summary", (
        f"Exercise {exercise.code} completed across {exercise.elapsed_seconds}s with "
        f"{len(decisions)} recorded command decisions and {total_msgs} communications."
    ))

    # Save or update AAR report in database
    aar = db.query(AARReport).filter(AARReport.exercise_id == exercise.id).first()
    if not aar:
        aar = AARReport(
            exercise_id=exercise.id,
            executive_summary=exec_summary,
            timeline_data=timeline,
            individual_metrics=individual_metrics,
            team_metrics=coordination_metrics,
            decision_quality_metrics=decision_quality_metrics,
            resilience_metrics=resilience_summary,
            ai_analysis=ai_analysis_data,
            generated_at=datetime.now(timezone.utc)
        )
        db.add(aar)
    else:
        aar.executive_summary = exec_summary
        aar.timeline_data = timeline
        aar.individual_metrics = individual_metrics
        aar.team_metrics = coordination_metrics
        aar.decision_quality_metrics = decision_quality_metrics
        aar.resilience_metrics = resilience_summary
        aar.ai_analysis = ai_analysis_data
        aar.generated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(aar)

    # Attach dynamic decision timeline and exercise metadata
    aar.decisions = [
        {
            "id": d.id,
            "role": d.participant_role,
            "type": d.decision_type,
            "target": d.action_target,
            "confidence": d.confidence_score,
            "rationale": d.rationale,
            "response_time_seconds": d.response_time_seconds,
            "timestamp": d.created_at.isoformat()
        }
        for d in decisions
    ]
    aar.exercise_metadata = {
        "code": exercise.code,
        "scenario_name": exercise.scenario.name if exercise.scenario else "Operation Sentinel",
        "duration_seconds": exercise.elapsed_seconds,
        "status": exercise.status,
        "participants_count": len(exercise.participants) if exercise.participants else 4
    }
    return aar

@router.get("/pdf")
def get_aar_pdf(exercise_id: str, db: Session = Depends(get_db)):
    """Generates and serves a downloadable, styled defense-grade PDF After Action Review."""
    exercise = get_exercise_or_404(exercise_id, db)
    aar_resp = get_aar(exercise.id, db)

    aar_dict = {
        "metrics_summary": aar_resp.resilience_metrics or {},
        "decision_quality_metrics": aar_resp.decision_quality_metrics or {},
        "ai_analysis": aar_resp.ai_analysis or {},
        "executive_summary": aar_resp.executive_summary or ""
    }
    metadata = {
        "code": exercise.code,
        "scenario_name": exercise.scenario.name if exercise.scenario else "Operation Sentinel",
        "duration_seconds": exercise.elapsed_seconds,
        "status": exercise.status
    }
    decisions = getattr(aar_resp, "decisions", []) or []

    pdf_bytes = generate_aar_pdf(aar_dict, metadata, decisions)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=sentinel_x_aar_{exercise.code}.pdf"
        }
    )

