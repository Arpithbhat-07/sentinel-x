import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, Optional, List
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.models import Exercise, ScenarioEvent, ExerciseLog, InformationReport
from app.websocket.manager import ws_manager
from app.simulation.degradation import DegradationEngine
from app.simulation.demo_bot import DemoBotRunner

logger = logging.getLogger("sentinel_x.engine")

class ExerciseEngine:
    """Manages active simulation loop, event scheduler, and state updates."""

    def __init__(self):
        self.running_tasks: Dict[str, asyncio.Task] = {}
        self.bot_runners: Dict[str, DemoBotRunner] = {}
        self.degradation = DegradationEngine()

    def start_exercise(self, exercise_id: str):
        if exercise_id in self.running_tasks and not self.running_tasks[exercise_id].done():
            logger.info(f"Exercise {exercise_id} is already running.")
            return
        
        self.running_tasks[exercise_id] = asyncio.create_task(self._simulation_loop(exercise_id))
        logger.info(f"Started simulation loop for exercise {exercise_id}")

    def pause_exercise(self, exercise_id: str):
        if exercise_id in self.running_tasks:
            self.running_tasks[exercise_id].cancel()
            del self.running_tasks[exercise_id]
            logger.info(f"Paused simulation loop for exercise {exercise_id}")

    def stop_exercise(self, exercise_id: str):
        self.pause_exercise(exercise_id)
        if exercise_id in self.bot_runners:
            del self.bot_runners[exercise_id]
        logger.info(f"Stopped exercise {exercise_id}")

    async def _simulation_loop(self, exercise_id: str):
        try:
            while True:
                await asyncio.sleep(1.0)
                db: Session = SessionLocal()
                try:
                    exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
                    if not exercise or exercise.status != "RUNNING":
                        logger.info(f"Exercise {exercise_id} not in RUNNING state; stopping loop.")
                        break

                    exercise.elapsed_seconds += 1
                    elapsed = exercise.elapsed_seconds

                    # Check demo bot execution
                    if exercise.is_demo:
                        if exercise_id not in self.bot_runners:
                            self.bot_runners[exercise_id] = DemoBotRunner(
                                exercise_id, SessionLocal, ws_manager, self.degradation
                            )
                        await self.bot_runners[exercise_id].check_and_execute(
                            elapsed, exercise.comms_reliability, exercise.message_delay_sec, exercise.dropout_rate
                        )

                    # Check timed scenario events
                    pending_events = db.query(ScenarioEvent).filter(
                        ScenarioEvent.exercise_id == exercise_id,
                        ScenarioEvent.triggered == False,
                        ScenarioEvent.scheduled_second <= elapsed
                    ).all()

                    for evt in pending_events:
                        evt.triggered = True
                        evt.triggered_at = datetime.now(timezone.utc)
                        await self._apply_event(db, exercise, evt)

                    db.commit()

                    # Broadcast tick every second
                    await ws_manager.broadcast(exercise_id, {
                        "type": "TICK",
                        "elapsed_seconds": elapsed,
                        "comms_reliability": exercise.comms_reliability,
                        "message_delay_sec": exercise.message_delay_sec,
                        "dropout_rate": exercise.dropout_rate,
                        "active_disruptions": exercise.active_disruptions or []
                    })

                finally:
                    db.close()

        except asyncio.CancelledError:
            logger.info(f"Simulation loop task for {exercise_id} was cancelled.")
        except Exception as e:
            logger.error(f"Error in simulation loop for {exercise_id}: {e}", exc_info=True)

    async def _apply_event(self, db: Session, exercise: Exercise, evt: ScenarioEvent):
        """Applies a scheduled or injected disruption to the simulation state."""
        evt_type = evt.event_type
        payload = evt.payload or {}
        disruptions = list(exercise.active_disruptions or [])

        if evt_type == "COMMS_DELAY":
            delay = float(payload.get("delay", 10.0))
            rel = float(payload.get("reliability", 0.50))
            drop = float(payload.get("dropout", 0.0))
            exercise.message_delay_sec = delay
            exercise.comms_reliability = rel
            exercise.dropout_rate = drop
            disruptions.append(f"High Latency ({int(delay)}s)")

        elif evt_type == "DROPOUT":
            drop = float(payload.get("dropout", 0.60))
            rel = float(payload.get("reliability", 0.30))
            exercise.dropout_rate = drop
            exercise.comms_reliability = rel
            disruptions.append(f"Severe Packet Dropout ({int(drop*100)}%)")

        elif evt_type == "CONFLICT":
            # Inject a conflicting report into the database
            sector = payload.get("sector", payload.get("conflict_sector", "Sector Bravo"))
            conf_data = self.degradation.generate_conflicting_report("Activity suspected", sector)
            now_ts = datetime.now(timezone.utc)
            
            report = InformationReport(
                exercise_id=exercise.id,
                source_name=payload.get("source", "Telemetry Cross-Feed"),
                visible_to_role=evt.target_role or "ALL",
                title=conf_data["title"],
                observation=conf_data["observation"],
                sector=sector,
                confidence_level=conf_data["confidence_level"],
                verification_status="CONFLICTING",
                coordinate_x=payload.get("coord_x", 65.0),
                coordinate_y=payload.get("coord_y", 35.0),
                timestamp=now_ts
            )
            db.add(report)
            db.flush()
            disruptions.append(f"Conflicting Intel ({sector})")

            await ws_manager.send_to_role(exercise.id, evt.target_role or "ALL", {
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
                "timestamp": now_ts.isoformat()
            })

        elif evt_type == "FEED_OFFLINE":
            disruptions.append("Surveillance Sensor Offline")
            exercise.comms_reliability = max(0.2, exercise.comms_reliability - 0.25)

        elif evt_type == "NETWORK_DEGRADE":
            rel = float(payload.get("reliability", 0.45))
            delay = float(payload.get("delay", 8.0))
            exercise.comms_reliability = rel
            exercise.message_delay_sec = delay
            disruptions.append("Multi-Domain EW Jamming")

        elif evt_type == "RECOVERY":
            exercise.comms_reliability = 0.90
            exercise.message_delay_sec = 1.0
            exercise.dropout_rate = 0.05
            disruptions = [d for d in disruptions if "Dropout" not in d and "Latency" not in d]
            disruptions.append("Secondary Link Restored")

        exercise.active_disruptions = list(set(disruptions))

        log = ExerciseLog(
            exercise_id=exercise.id,
            actor_role="INSTRUCTOR" if evt.target_role == "INJECTED" else "SYSTEM",
            event_type=f"DISRUPTION_{evt_type}",
            message=f"{evt.title}: {evt.description}",
            metadata_json=payload
        )
        db.add(log)

        # Broadcast event alert to room
        await ws_manager.broadcast(exercise.id, {
            "type": "DISRUPTION_TRIGGERED",
            "event_type": evt_type,
            "title": evt.title,
            "description": evt.description,
            "payload": payload,
            "comms_reliability": exercise.comms_reliability,
            "message_delay_sec": exercise.message_delay_sec,
            "dropout_rate": exercise.dropout_rate,
            "active_disruptions": exercise.active_disruptions
        })

exercise_engine = ExerciseEngine()
