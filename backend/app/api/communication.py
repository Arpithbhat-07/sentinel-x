from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.utils import get_exercise_or_404
from app.models.models import Exercise, CommunicationEvent, ExerciseLog, InformationReport
from app.schemas.schemas import MessageSendRequest, CommunicationEventResponse, ReportCreate, ReportResponse
from app.services.communication_service import process_and_dispatch_message
from app.websocket.manager import ws_manager

router = APIRouter(prefix="/exercises/{exercise_id}", tags=["communication"])

@router.get("/messages", response_model=List[CommunicationEventResponse])
def get_messages(exercise_id: str, role: Optional[str] = None, db: Session = Depends(get_db)):
    exercise = get_exercise_or_404(exercise_id, db)
    query = db.query(CommunicationEvent).filter(CommunicationEvent.exercise_id == exercise.id)
    if role and role != "Instructor":
        # Trainees only see messages sent to ALL, or sent to their role, or sent by themselves
        query = query.filter(
            (CommunicationEvent.recipient_role == "ALL") |
            (CommunicationEvent.recipient_role == role) |
            (CommunicationEvent.sender_role == role)
        )
    return query.order_by(CommunicationEvent.sent_at.asc()).all()

@router.post("/messages", response_model=CommunicationEventResponse)
async def send_message(
    exercise_id: str,
    payload: MessageSendRequest,
    sender_role: str,
    sender_name: str,
    sender_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    exercise = get_exercise_or_404(exercise_id, db)
    comm_dict = await process_and_dispatch_message(
        exercise=exercise,
        sender_id=sender_id,
        sender_name=sender_name,
        sender_role=sender_role,
        recipient_role=payload.recipient_role,
        content=payload.content,
        db=db
    )
    # Return database entity
    return db.query(CommunicationEvent).filter(CommunicationEvent.id == comm_dict["id"]).first()

@router.get("/reports", response_model=List[ReportResponse])
def get_reports(exercise_id: str, role: Optional[str] = None, db: Session = Depends(get_db)):
    exercise = get_exercise_or_404(exercise_id, db)
    query = db.query(InformationReport).filter(InformationReport.exercise_id == exercise.id)
    if role and role != "Instructor":
        query = query.filter(
            (InformationReport.visible_to_role == "ALL") |
            (InformationReport.visible_to_role == role)
        )
    return query.order_by(InformationReport.timestamp.asc()).all()

@router.post("/reports", response_model=ReportResponse)
async def create_report(
    exercise_id: str,
    payload: ReportCreate,
    creator_role: str,
    db: Session = Depends(get_db)
):
    exercise = get_exercise_or_404(exercise_id, db)

    report = InformationReport(
        exercise_id=exercise.id,
        source_name=payload.source_name,
        visible_to_role=payload.visible_to_role,
        title=payload.title,
        observation=payload.observation,
        sector=payload.sector,
        confidence_level=payload.confidence_level,
        verification_status=payload.verification_status,
        coordinate_x=payload.coordinate_x,
        coordinate_y=payload.coordinate_y
    )
    db.add(report)

    log = ExerciseLog(
        exercise_id=exercise.id,
        actor_role=creator_role,
        event_type="REPORT_CREATED",
        message=f"Intel Report submitted: {payload.title} ({payload.confidence_level}% conf)",
        metadata_json={
            "source": payload.source_name,
            "sector": payload.sector,
            "confidence": payload.confidence_level
        }
    )
    db.add(log)
    db.commit()
    db.refresh(report)

    # Deliver to intended role(s)
    await ws_manager.send_to_role(exercise.id, payload.visible_to_role, {
        "type": "REPORT_RECEIVED",
        "id": report.id,
        "source_name": report.source_name,
        "title": report.title,
        "observation": report.observation,
        "sector": report.sector,
        "confidence_level": report.confidence_level,
        "verification_status": report.verification_status,
        "coordinate_x": report.coordinate_x,
        "coordinate_y": report.coordinate_y,
        "timestamp": report.timestamp.isoformat()
    })

    return report
