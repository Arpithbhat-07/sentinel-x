import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models.models import Exercise, CommunicationEvent, ExerciseLog
from app.simulation.degradation import DegradationEngine
from app.websocket.manager import ws_manager

logger = logging.getLogger("sentinel_x.comms")

async def process_and_dispatch_message(
    exercise: Exercise,
    sender_id: Optional[str],
    sender_name: str,
    sender_role: str,
    recipient_role: str,
    content: str,
    db: Session,
    sender_client_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Authoritative server-side messaging pipeline.
    Runs text through DegradationEngine and executes genuine real-time delivery:
    - DELIVERED: Instant delivery to recipient role.
    - CORRUPTED: Text masked with [...LOST...] and delivered to recipient.
    - DELAYED: Placed in server asyncio delay queue; delivered when timer expires.
    - DROPPED: Silently withheld from recipient; failure alert sent to sender and logged.
    """
    # Run through degradation engine
    status, delivered_text, delay_sec = DegradationEngine.process_message(
        content,
        exercise.comms_reliability,
        exercise.message_delay_sec,
        exercise.dropout_rate
    )

    comm = CommunicationEvent(
        exercise_id=exercise.id,
        sender_id=sender_id,
        sender_name=sender_name,
        sender_role=sender_role,
        recipient_role=recipient_role,
        original_content=content,
        delivered_content=delivered_text if status != "DROPPED" else None,
        status=status,
        delay_seconds=delay_sec,
        sent_at=datetime.now(timezone.utc),
        delivered_at=datetime.now(timezone.utc) if status in ["DELIVERED", "CORRUPTED"] else None
    )
    db.add(comm)

    log = ExerciseLog(
        exercise_id=exercise.id,
        actor_role=sender_role,
        event_type=f"MESSAGE_{status}",
        message=f"[{sender_role} -> {recipient_role}] Status: {status}. {content[:60]}",
        metadata_json={
            "status": status,
            "delay_seconds": delay_sec,
            "recipient_role": recipient_role,
            "sender_role": sender_role
        }
    )
    db.add(log)
    db.commit()
    db.refresh(comm)

    # Deliver payload
    delivery_payload = {
        "type": "MESSAGE_RECEIVED",
        "id": comm.id,
        "sender_name": sender_name,
        "sender_role": sender_role,
        "recipient_role": recipient_role,
        "content": delivered_text,
        "status": status,
        "delay_seconds": delay_sec,
        "sent_at": comm.sent_at.isoformat() if comm.sent_at else None
    }

    if status == "DROPPED":
        # 1. Inform sender of transmission failure
        await ws_manager.send_to_role(exercise.id, sender_role, {
            "type": "MESSAGE_DROPPED",
            "id": comm.id,
            "sender_role": sender_role,
            "recipient_role": recipient_role,
            "original_content": content,
            "status": "DROPPED",
            "error": "TRANSMISSION FAILED (PACKET DROPPED)"
        })

        # 2. Inform instructor for live stream monitoring
        await ws_manager.send_to_role(exercise.id, "INSTRUCTOR", {
            "type": "MESSAGE_DROPPED",
            "id": comm.id,
            "sender_role": sender_role,
            "recipient_role": recipient_role,
            "original_content": content,
            "status": "DROPPED"
        })

    elif status == "DELAYED":
        # 1. Inform sender that transmission is buffered/delayed
        delayed_notification = {
            "type": "MESSAGE_DELAYED",
            "id": comm.id,
            "sender_role": sender_role,
            "recipient_role": recipient_role,
            "content": delivered_text,
            "status": "DELAYED",
            "delay_seconds": delay_sec,
            "eta_seconds": delay_sec
        }
        await ws_manager.send_to_role(exercise.id, sender_role, delayed_notification)

        # 2. Inform instructor of queued transmission with ETA
        await ws_manager.send_to_role(exercise.id, "INSTRUCTOR", delayed_notification)

        # 3. Schedule actual server delayed delivery
        ws_manager.schedule_delayed_delivery(
            exercise.id,
            comm.id,
            delay_sec,
            recipient_role,
            delivery_payload
        )

    else: # "DELIVERED" or "CORRUPTED"
        # Immediate delivery to recipient role (and Instructor via role routing)
        await ws_manager.send_to_role(exercise.id, recipient_role, delivery_payload)
        
        # Notify sender
        await ws_manager.send_to_role(exercise.id, sender_role, {
            "type": "MESSAGE_SENT",
            "id": comm.id,
            "status": status,
            "recipient_role": recipient_role
        })

    return {
        "id": comm.id,
        "exercise_id": exercise.id,
        "sender_id": sender_id,
        "sender_name": sender_name,
        "sender_role": sender_role,
        "recipient_role": recipient_role,
        "original_content": content,
        "delivered_content": comm.delivered_content,
        "status": comm.status,
        "delay_seconds": comm.delay_seconds,
        "sent_at": comm.sent_at.isoformat() if comm.sent_at else None,
        "delivered_at": comm.delivered_at.isoformat() if comm.delivered_at else None
    }
