import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from fastapi import WebSocket
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.models import Exercise, Participant, CommunicationEvent, InformationReport, Decision, ScenarioEvent

logger = logging.getLogger("sentinel_x.ws")

def normalize_role(role: str) -> str:
    """Normalizes role strings for strict equality matching."""
    if not role:
        return "OBSERVER"
    r = role.strip().upper().replace(" ", "_")
    if r in ["RECON", "RECON_OFFICER"]:
        return "RECON"
    if r in ["FIELD", "FIELD_UNIT"]:
        return "FIELD_UNIT"
    if r in ["COMMS", "COMMS_OFFICER", "COMMUNICATIONS_OFFICER"]:
        return "COMMS_OFFICER"
    if r in ["COMMANDER"]:
        return "COMMANDER"
    if r in ["INSTRUCTOR"]:
        return "INSTRUCTOR"
    if r in ["ALL"]:
        return "ALL"
    return r

class ConnectionManager:
    """
    Authoritative WebSocket Connection & Multi-Client Session Manager.
    Enforces room scoping, role-based information asymmetry, event ordering,
    and server-side delayed message delivery queues.
    """

    def __init__(self):
        # Maps canonical exercise_id -> list of active client dicts
        self.active_rooms: Dict[str, List[Dict[str, Any]]] = {}
        # Monotonically increasing event sequence counter per exercise room
        self.sequence_counters: Dict[str, int] = {}
        # Active delayed delivery tasks: comm_id -> asyncio.Task
        self.delayed_tasks: Dict[str, asyncio.Task] = {}

    def _next_seq(self, exercise_id: str) -> int:
        curr = self.sequence_counters.get(exercise_id, 0) + 1
        self.sequence_counters[exercise_id] = curr
        return curr

    def _format_event(self, exercise_id: str, message: dict) -> dict:
        """Injects event ordering metadata: event_id, sequence_number, timestamp."""
        enriched = dict(message)
        if "event_id" not in enriched:
            enriched["event_id"] = str(uuid.uuid4())
        if "sequence_number" not in enriched:
            enriched["sequence_number"] = self._next_seq(exercise_id)
        if "exercise_id" not in enriched:
            enriched["exercise_id"] = exercise_id
        if "timestamp" not in enriched:
            enriched["timestamp"] = datetime.now(timezone.utc).isoformat()
        return enriched

    async def connect(
        self,
        websocket: WebSocket,
        exercise_id: str,
        role: str,
        participant_id: str,
        display_name: str,
        client_id: str,
        user_id: Optional[str] = None
    ):
        await websocket.accept()
        if exercise_id not in self.active_rooms:
            self.active_rooms[exercise_id] = []
            self.sequence_counters[exercise_id] = 0

        # Close existing socket for same client_id if reconnecting (tab refresh or duplicate socket)
        existing_idx = None
        for i, conn in enumerate(self.active_rooms[exercise_id]):
            if conn["client_id"] == client_id:
                existing_idx = i
                try:
                    await conn["ws"].close(code=1000, reason="Replaced by new connection")
                except Exception:
                    pass
                break

        conn_info = {
            "ws": websocket,
            "client_id": client_id,
            "user_id": user_id or participant_id,
            "participant_id": participant_id,
            "role": role,
            "display_name": display_name,
            "connected_at": datetime.now(timezone.utc).isoformat()
        }

        if existing_idx is not None:
            self.active_rooms[exercise_id][existing_idx] = conn_info
            logger.info(f"Reconnected client: {display_name} ({role}, {client_id}) in {exercise_id}")
        else:
            self.active_rooms[exercise_id].append(conn_info)
            logger.info(f"Connected client: {display_name} ({role}, {client_id}) in {exercise_id}")

        # Send CONNECTION_ESTABLISHED to this client
        await self.send_to_client(websocket, {
            "type": "CONNECTION_ESTABLISHED",
            "client_id": client_id,
            "role": role,
            "exercise_id": exercise_id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })

        # Broadcast PARTICIPANT_JOINED to all participants in the exercise
        await self.broadcast(exercise_id, {
            "type": "PARTICIPANT_JOINED",
            "participant": {
                "client_id": client_id,
                "participant_id": participant_id,
                "role": role,
                "display_name": display_name,
                "status": "CONNECTED"
            },
            "online_participants": self.get_online_participants(exercise_id)
        })

    def disconnect(self, websocket: WebSocket, exercise_id: str) -> Optional[Dict[str, Any]]:
        if exercise_id in self.active_rooms:
            leaving = None
            for conn in self.active_rooms[exercise_id]:
                if conn["ws"] == websocket:
                    leaving = conn
                    break
            if leaving:
                self.active_rooms[exercise_id].remove(leaving)
                logger.info(f"Disconnected client: {leaving['display_name']} ({leaving['role']}) from {exercise_id}")
                return leaving
        return None

    def get_online_participants(self, exercise_id: str) -> List[Dict[str, Any]]:
        if exercise_id not in self.active_rooms:
            return []
        return [
            {
                "client_id": c["client_id"],
                "participant_id": c["participant_id"],
                "role": c["role"],
                "display_name": c["display_name"]
            }
            for c in self.active_rooms[exercise_id]
        ]

    async def send_to_client(self, websocket: WebSocket, message: dict):
        """Sends a JSON payload directly to a specific connected client."""
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.warning(f"Failed to send direct message to client: {e}")

    async def broadcast(self, exercise_id: str, message: dict, exclude_client_id: Optional[str] = None):
        """Broadcasts a payload to all connected clients in the exercise room."""
        if exercise_id not in self.active_rooms:
            return

        payload = self._format_event(exercise_id, message)
        payload_text = json.dumps(payload)
        dead = []

        for conn in self.active_rooms[exercise_id]:
            if exclude_client_id and conn["client_id"] == exclude_client_id:
                continue
            try:
                await conn["ws"].send_text(payload_text)
            except Exception as e:
                logger.warning(f"Error broadcasting to client {conn['client_id']} ({conn['role']}): {e}")
                dead.append(conn)

        for d in dead:
            if d in self.active_rooms[exercise_id]:
                self.active_rooms[exercise_id].remove(d)

    async def send_to_role(
        self,
        exercise_id: str,
        target_role: str,
        message: dict,
        exclude_client_id: Optional[str] = None,
        sender_client_id: Optional[str] = None
    ):
        """
        Sends message only to eligible recipients based on target role.
        Enforces Information Asymmetry:
        - Instructors always receive all operational feeds.
        - Trainees receive if recipient is ALL, or their role matches target_role, or they were sender.
        """
        if exercise_id not in self.active_rooms:
            return

        payload = self._format_event(exercise_id, message)
        payload_text = json.dumps(payload)
        target_norm = normalize_role(target_role)
        dead = []

        for conn in self.active_rooms[exercise_id]:
            if exclude_client_id and conn["client_id"] == exclude_client_id:
                continue

            conn_role_norm = normalize_role(conn["role"])
            is_recipient = (
                target_norm == "ALL" or
                conn_role_norm == target_norm or
                conn_role_norm == "INSTRUCTOR" or
                (sender_client_id and conn["client_id"] == sender_client_id)
            )

            if is_recipient:
                try:
                    await conn["ws"].send_text(payload_text)
                except Exception as e:
                    logger.warning(f"Error sending role message to {conn['client_id']}: {e}")
                    dead.append(conn)

        for d in dead:
            if d in self.active_rooms[exercise_id]:
                self.active_rooms[exercise_id].remove(d)

    async def send_state_snapshot(self, websocket: WebSocket, exercise_id: str, role: str, db: Session):
        """
        Compiles and sends an immediate authoritative state snapshot to a newly connected client.
        Enforces role-based information filtering at the server level.
        """
        exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
        if not exercise:
            return

        # Fetch recent messages (role-filtered for trainees)
        msg_query = db.query(CommunicationEvent).filter(CommunicationEvent.exercise_id == exercise_id)
        role_norm = normalize_role(role)
        if role_norm != "INSTRUCTOR":
            msg_query = msg_query.filter(
                (CommunicationEvent.recipient_role == "ALL") |
                (CommunicationEvent.recipient_role == role) |
                (CommunicationEvent.sender_role == role)
            )
        recent_messages = [
            {
                "id": m.id,
                "sender_name": m.sender_name,
                "sender_role": m.sender_role,
                "recipient_role": m.recipient_role,
                "content": m.delivered_content or m.original_content,
                "status": m.status,
                "delay_seconds": m.delay_seconds,
                "sent_at": m.sent_at.isoformat() if m.sent_at else None,
                "delivered_at": m.delivered_at.isoformat() if m.delivered_at else None
            }
            for m in msg_query.order_by(CommunicationEvent.sent_at.asc()).limit(50).all()
        ]

        # Fetch reports (role-filtered for trainees)
        rep_query = db.query(InformationReport).filter(InformationReport.exercise_id == exercise_id)
        if role_norm != "INSTRUCTOR":
            rep_query = rep_query.filter(
                (InformationReport.visible_to_role == "ALL") |
                (InformationReport.visible_to_role == role)
            )
        recent_reports = [
            {
                "id": r.id,
                "source_name": r.source_name,
                "title": r.title,
                "observation": r.observation,
                "sector": r.sector,
                "confidence_level": r.confidence_level,
                "verification_status": r.verification_status,
                "coordinate_x": r.coordinate_x,
                "coordinate_y": r.coordinate_y,
                "timestamp": r.timestamp.isoformat() if r.timestamp else None
            }
            for r in rep_query.order_by(InformationReport.timestamp.asc()).limit(50).all()
        ]

        # Fetch recent decisions
        dec_query = db.query(Decision).filter(Decision.exercise_id == exercise_id).order_by(Decision.created_at.asc()).all()
        recent_decisions = [
            {
                "id": d.id,
                "participant_role": d.participant_role,
                "decision_type": d.decision_type,
                "action_target": d.action_target,
                "rationale": d.rationale,
                "confidence_score": d.confidence_score,
                "response_time_seconds": d.response_time_seconds,
                "created_at": d.created_at.isoformat() if d.created_at else None
            }
            for d in dec_query
        ]

        # Fetch active triggered events
        evt_query = db.query(ScenarioEvent).filter(
            ScenarioEvent.exercise_id == exercise_id,
            ScenarioEvent.triggered == True
        ).all()
        active_events = [
            {
                "id": e.id,
                "event_type": e.event_type,
                "title": e.title,
                "description": e.description,
                "target_role": e.target_role,
                "scheduled_second": e.scheduled_second,
                "payload": e.payload
            }
            for e in evt_query
        ]

        # Fetch participants in this exercise
        participants = db.query(Participant).filter(Participant.exercise_id == exercise_id).all()
        part_list = [
            {
                "id": p.id,
                "role": p.role,
                "display_name": p.display_name,
                "status": p.status,
                "is_simulated": p.is_simulated
            }
            for p in participants
        ]

        snapshot = {
            "type": "STATE_SNAPSHOT",
            "exercise": {
                "id": exercise.id,
                "code": exercise.code,
                "status": exercise.status,
                "elapsed_seconds": exercise.elapsed_seconds,
                "comms_reliability": exercise.comms_reliability,
                "message_delay_sec": exercise.message_delay_sec,
                "dropout_rate": exercise.dropout_rate,
                "active_disruptions": exercise.active_disruptions or []
            },
            "communication": {
                "reliability": exercise.comms_reliability,
                "delay_sec": exercise.message_delay_sec,
                "dropout_rate": exercise.dropout_rate,
                "status": "DEGRADED" if exercise.comms_reliability < 0.8 else "STABLE"
            },
            "participants": part_list,
            "online_participants": self.get_online_participants(exercise_id),
            "recent_messages": recent_messages,
            "recent_reports": recent_reports,
            "decisions": recent_decisions,
            "active_events": active_events
        }

        await self.send_to_client(websocket, self._format_event(exercise_id, snapshot))

    def schedule_delayed_delivery(
        self,
        exercise_id: str,
        comm_id: str,
        delay_sec: float,
        target_role: str,
        delivery_payload: dict
    ):
        """Schedules a server-side delayed delivery task to execute after delay_sec."""
        task = asyncio.create_task(
            self._delayed_delivery_worker(exercise_id, comm_id, delay_sec, target_role, delivery_payload)
        )
        self.delayed_tasks[comm_id] = task

    async def _delayed_delivery_worker(
        self,
        exercise_id: str,
        comm_id: str,
        delay_sec: float,
        target_role: str,
        delivery_payload: dict
    ):
        try:
            await asyncio.sleep(delay_sec)
            
            # Update database record: delivered_at
            db: Session = SessionLocal()
            try:
                comm = db.query(CommunicationEvent).filter(CommunicationEvent.id == comm_id).first()
                if comm:
                    comm.delivered_at = datetime.now(timezone.utc)
                    db.commit()
            except Exception as e:
                logger.error(f"Error updating delivered_at for comm {comm_id}: {e}")
            finally:
                db.close()

            # Now deliver the message to the intended recipient role
            delivery_payload["status"] = "DELIVERED"
            delivery_payload["delivered_at"] = datetime.now(timezone.utc).isoformat()
            
            # Broadcast MESSAGE_DELIVERED / MESSAGE_RECEIVED to recipient
            await self.send_to_role(exercise_id, target_role, delivery_payload)
            
            # Notify Instructor of completed delayed delivery
            await self.send_to_role(exercise_id, "INSTRUCTOR", {
                "type": "MESSAGE_DELIVERED",
                "id": comm_id,
                "sender_role": delivery_payload.get("sender_role"),
                "recipient_role": target_role,
                "content": delivery_payload.get("content"),
                "status": "DELIVERED",
                "delay_seconds": delay_sec,
                "delivered_at": delivery_payload["delivered_at"]
            })

        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Error delivering delayed message {comm_id}: {e}")
        finally:
            if comm_id in self.delayed_tasks:
                del self.delayed_tasks[comm_id]

ws_manager = ConnectionManager()
