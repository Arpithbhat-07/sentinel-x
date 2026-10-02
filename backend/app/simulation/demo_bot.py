import asyncio
import logging
import random
from datetime import datetime, timezone
from typing import Dict, Any, List

logger = logging.getLogger("sentinel_x.demo_bot")

# Predictable, narrative-driven SIH demonstration timeline (2-4 minutes)
DEMO_SCRIPT_TIMELINE: List[Dict[str, Any]] = [
    {
        "second": 10,
        "role": "Recon Officer",
        "actor": "Lt. Sharma (Ghost Eye-1)",
        "action": "SEND_MESSAGE",
        "recipient": "Commander",
        "content": "Overwatch, Recon Ghost Eye-1 on station at Ridge 7. Initiating wide-area thermal sweep of Sector Bravo."
    },
    {
        "second": 22,
        "role": "Recon Officer",
        "actor": "Lt. Sharma (Ghost Eye-1)",
        "action": "CREATE_REPORT",
        "report": {
            "source_name": "Ghost Eye-1 Thermal",
            "visible_to_role": "ALL",
            "title": "Unidentified Thermal Cluster",
            "observation": "Sector Bravo: Multiple heat signatures detected traversing southern tree line. Confidence: 68%.",
            "sector": "Sector Bravo",
            "confidence_level": 68,
            "verification_status": "UNCONFIRMED",
            "coordinate_x": 68.0,
            "coordinate_y": 35.0
        }
    },
    {
        "second": 36,
        "role": "Commander",
        "actor": "Col. V. Rao (Mission Commander)",
        "action": "SEND_MESSAGE",
        "recipient": "ALL",
        "content": "Acknowledged Ghost Eye-1. Vanguard-3 hold at Checkpoint Orion until initial reconnaissance is verified."
    },
    {
        "second": 48,
        "role": "Field Unit",
        "actor": "Maj. K. Singh (Vanguard-3)",
        "action": "CREATE_REPORT",
        "report": {
            "source_name": "Vanguard-3 Ground Patrol",
            "visible_to_role": "ALL",
            "title": "Ground Visual Sweep: Sector Bravo Clear",
            "observation": "Direct visual confirmation at Bravo southern tree line shows no active signatures. Area clear. Confidence: 92%.",
            "sector": "Sector Bravo",
            "confidence_level": 92,
            "verification_status": "CONFLICTING",
            "coordinate_x": 62.0,
            "coordinate_y": 36.0
        }
    },
    {
        "second": 62,
        "role": "Commander",
        "actor": "Col. V. Rao (Mission Commander)",
        "action": "MAKE_DECISION",
        "decision": {
            "decision_type": "REQUEST_VERIFICATION",
            "action_target": "Sector Bravo Perimeter",
            "rationale": "Direct contradiction between Recon thermal detection (68%) and Ground visual confirmation (92%). Holding vanguard at Checkpoint Orion pending cross-verification.",
            "confidence_score": 80
        }
    },
    {
        "second": 80,
        "role": "Communications Officer",
        "actor": "Capt. D. Nair (Relay Hub-6)",
        "action": "SEND_MESSAGE",
        "recipient": "ALL",
        "content": "WARNING: Directional RF atmospheric jamming intensifying. Packet loss currently 25%, message delay ~12s."
    },
    {
        "second": 100,
        "role": "Field Unit",
        "actor": "Maj. K. Singh (Vanguard-3)",
        "action": "SEND_MESSAGE",
        "recipient": "Commander",
        "content": "Overwatch, Vanguard-3 holding position at Orion. Visual contact remains negative in Bravo."
    },
    {
        "second": 125,
        "role": "Communications Officer",
        "actor": "Capt. D. Nair (Relay Hub-6)",
        "action": "SEND_MESSAGE",
        "recipient": "ALL",
        "content": "ALERT: Severe electronic countermeasures detected across UHF channels. Primary carrier link degraded."
    },
    {
        "second": 155,
        "role": "Communications Officer",
        "actor": "Capt. D. Nair (Relay Hub-6)",
        "action": "SEND_MESSAGE",
        "recipient": "Commander",
        "content": "Overwatch, secondary directional microwave link online. Primary telemetry restored to 85% carrier stability."
    },
    {
        "second": 180,
        "role": "Commander",
        "actor": "Col. V. Rao (Mission Commander)",
        "action": "MAKE_DECISION",
        "decision": {
            "decision_type": "CHANGE_ROUTE",
            "action_target": "Sector Delta Corridor via Ridge 7",
            "rationale": "Sector Bravo remains ambiguous due to contradictory telemetry. Bypassing Bravo entirely and routing Vanguard-3 through western defile toward Objective Apex.",
            "confidence_score": 88
        }
    }
]

class DemoBotRunner:
    """Executes scheduled synthetic actions for an active demo exercise."""

    def __init__(self, exercise_id: str, db_factory, ws_manager, degradation_engine):
        self.exercise_id = exercise_id
        self.db_factory = db_factory
        self.ws_manager = ws_manager
        self.degradation = degradation_engine
        self.executed_indices = set()
        # Seed random generator for determinism in demo mode
        random.seed(42)

    async def check_and_execute(self, elapsed_sec: int, comms_reliability: float, delay_sec: float, dropout_rate: float):
        for idx, item in enumerate(DEMO_SCRIPT_TIMELINE):
            if idx not in self.executed_indices and elapsed_sec >= item["second"]:
                self.executed_indices.add(idx)
                try:
                    await self._execute_item(item, comms_reliability, delay_sec, dropout_rate)
                except Exception as e:
                    logger.error(f"Error executing demo step {idx}: {e}")

    async def _execute_item(self, item: Dict[str, Any], reliability: float, delay: float, dropout: float):
        from app.models.models import CommunicationEvent, InformationReport, Decision, ExerciseLog

        db = self.db_factory()
        try:
            action_type = item["action"]

            if action_type == "SEND_MESSAGE":
                status, delivered_text, actual_delay = self.degradation.process_message(
                    item["content"], reliability, delay, dropout
                )
                
                comm_evt = CommunicationEvent(
                    exercise_id=self.exercise_id,
                    sender_name=item["actor"],
                    sender_role=item["role"],
                    recipient_role=item["recipient"],
                    original_content=item["content"],
                    delivered_content=delivered_text,
                    status=status,
                    delay_seconds=actual_delay,
                    delivered_at=datetime.now(timezone.utc)
                )
                db.add(comm_evt)
                
                log = ExerciseLog(
                    exercise_id=self.exercise_id,
                    actor_role=item["role"],
                    event_type=f"MESSAGE_{status}",
                    message=f"[{item['role']}] {delivered_text[:60]}...",
                    metadata_json={"recipient": item["recipient"], "delay": actual_delay, "status": status}
                )
                db.add(log)
                db.commit()

                await self.ws_manager.send_to_role(self.exercise_id, item["recipient"], {
                    "type": "MESSAGE_RECEIVED",
                    "id": comm_evt.id,
                    "sender_name": item["actor"],
                    "sender_role": item["role"],
                    "recipient_role": item["recipient"],
                    "content": delivered_text,
                    "status": status,
                    "delay_seconds": actual_delay,
                    "sent_at": comm_evt.sent_at.isoformat()
                })

            elif action_type == "CREATE_REPORT":
                rep_data = item["report"]
                report = InformationReport(
                    exercise_id=self.exercise_id,
                    source_name=rep_data["source_name"],
                    visible_to_role=rep_data.get("visible_to_role", "ALL"),
                    title=rep_data["title"],
                    observation=rep_data["observation"],
                    sector=rep_data["sector"],
                    confidence_level=rep_data["confidence_level"],
                    verification_status=rep_data["verification_status"],
                    coordinate_x=rep_data.get("coordinate_x", 50.0),
                    coordinate_y=rep_data.get("coordinate_y", 50.0)
                )
                db.add(report)

                log = ExerciseLog(
                    exercise_id=self.exercise_id,
                    actor_role=item["role"],
                    event_type="REPORT_CREATED",
                    message=f"Intel Report: {rep_data['title']} (Confidence: {rep_data['confidence_level']}%)",
                    metadata_json=rep_data
                )
                db.add(log)
                db.commit()

                await self.ws_manager.send_to_role(self.exercise_id, rep_data.get("visible_to_role", "ALL"), {
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

            elif action_type == "MAKE_DECISION":
                dec_data = item["decision"]
                decision = Decision(
                    exercise_id=self.exercise_id,
                    participant_role=item["role"],
                    decision_type=dec_data["decision_type"],
                    action_target=dec_data["action_target"],
                    rationale=dec_data["rationale"],
                    confidence_score=dec_data["confidence_score"],
                    response_time_seconds=float(item["second"])
                )
                db.add(decision)

                log = ExerciseLog(
                    exercise_id=self.exercise_id,
                    actor_role=item["role"],
                    event_type="DECISION_SUBMITTED",
                    message=f"COMMAND DECISION: {dec_data['decision_type']} - {dec_data['action_target']}",
                    metadata_json=dec_data
                )
                db.add(log)
                db.commit()

                await self.ws_manager.broadcast(self.exercise_id, {
                    "type": "DECISION_LOGGED",
                    "id": decision.id,
                    "participant_role": decision.participant_role,
                    "decision_type": decision.decision_type,
                    "action_target": decision.action_target,
                    "rationale": decision.rationale,
                    "confidence_score": decision.confidence_score,
                    "created_at": decision.created_at.isoformat()
                })

        finally:
            db.close()
