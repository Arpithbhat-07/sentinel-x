import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import json
import uuid
from datetime import datetime, timezone
from typing import Optional
from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.models.models import Scenario, User, Exercise, Decision, ScenarioEvent, ExerciseLog, Participant
from app.simulation.templates import SCENARIO_TEMPLATES
from app.websocket.manager import ws_manager, normalize_role
from app.services.communication_service import process_and_dispatch_message
from app.simulation.engine import exercise_engine

from app.api.auth import router as auth_router, DEFAULT_DEMO_USERS
from app.api.scenarios import router as scenarios_router
from app.api.exercises import router as exercises_router
from app.api.decisions import router as decisions_router
from app.api.events import router as events_router
from app.api.aar import router as aar_router
from app.api.ai import router as ai_router
from app.api.communication import router as comms_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("sentinel_x")

def seed_database():
    """Seeds default scenarios and standard demo users if database is empty."""
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    try:
        # Seed scenarios
        for template in SCENARIO_TEMPLATES:
            existing = db.query(Scenario).filter(Scenario.code == template["code"]).first()
            if not existing:
                scen = Scenario(
                    code=template["code"],
                    name=template["name"],
                    description=template["description"],
                    difficulty=template["difficulty"],
                    duration_minutes=template["duration_minutes"],
                    environment_data=template.get("environment_data", {}),
                    communication_rules=template.get("communication_rules", {}),
                    information_rules=template.get("information_rules", {}),
                    initial_conditions=template.get("initial_conditions", {}),
                    timed_events=template.get("timed_events", []),
                    objectives=template.get("objectives", []),
                    evaluation_criteria=template.get("evaluation_criteria", []),
                    is_template=True
                )
                db.add(scen)
                logger.info(f"Seeded scenario template: {template['name']}")

        # Seed default users
        for u in DEFAULT_DEMO_USERS:
            existing_user = db.query(User).filter(User.username == u["username"]).first()
            if not existing_user:
                new_u = User(
                    username=u["username"],
                    full_name=u["full_name"],
                    role=u["role"],
                    is_active=True
                )
                db.add(new_u)

        db.commit()
    except Exception as e:
        logger.error(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.PROJECT_NAME} v{settings.VERSION}...")
    seed_database()
    yield
    logger.info(f"Shutting down {settings.PROJECT_NAME}...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.PROJECT_DESCRIPTION,
    version=settings.VERSION,
    lifespan=lifespan
)

# CORS Middleware
# Allows localhost, custom domains from CORS_ORIGINS/FRONTEND_URL, and Vercel preview/production deployments
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth_router, prefix=settings.API_PREFIX)
app.include_router(scenarios_router, prefix=settings.API_PREFIX)
app.include_router(exercises_router, prefix=settings.API_PREFIX)
app.include_router(decisions_router, prefix=settings.API_PREFIX)
app.include_router(events_router, prefix=settings.API_PREFIX)
app.include_router(aar_router, prefix=settings.API_PREFIX)
app.include_router(ai_router, prefix=settings.API_PREFIX)
app.include_router(comms_router, prefix=settings.API_PREFIX)

@app.get("/")
def root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "description": settings.PROJECT_DESCRIPTION,
        "version": settings.VERSION,
        "health": "/health",
        "docs": "/docs"
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "ai_provider": settings.AI_PROVIDER
    }

@app.get("/health/database")
def health_database():
    db: Session = SessionLocal()
    try:
        scenario_count = db.query(Scenario).count()
        return {
            "status": "healthy",
            "database": "connected",
            "scenarios_available": scenario_count
        }
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}
    finally:
        db.close()

@app.get("/health/websocket")
def health_websocket():
    total_active_rooms = len(ws_manager.active_rooms)
    total_connections = sum(len(conns) for conns in ws_manager.active_rooms.values())
    return {
        "status": "healthy",
        "active_rooms": total_active_rooms,
        "total_connected_clients": total_connections
    }

# --- WEBSOCKET ENDPOINT ---
@app.websocket("/ws/exercises/{exercise_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    exercise_id: str,
    role: str = Query("Observer"),
    participant_id: str = Query("guest"),
    display_name: str = Query("Participant"),
    client_id: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None)
):
    # Canonicalize room ID: resolve to primary exercise.id so code and UUID map to the same room
    canonical_id = exercise_id
    effective_client_id = client_id or f"client-{uuid.uuid4().hex[:6]}"
    
    db: Session = SessionLocal()
    try:
        ex = db.query(Exercise).filter((Exercise.id == exercise_id) | (Exercise.code == exercise_id)).first()
        if ex:
            canonical_id = ex.id
    except Exception as e:
        logger.warning(f"Error querying exercise for WS: {e}")
    finally:
        db.close()

    # 1. Connect client and register session
    await ws_manager.connect(
        websocket=websocket,
        exercise_id=canonical_id,
        role=role,
        participant_id=participant_id,
        display_name=display_name,
        client_id=effective_client_id,
        user_id=user_id
    )

    # 2. Immediately send authoritative STATE_SNAPSHOT
    db = SessionLocal()
    try:
        await ws_manager.send_state_snapshot(websocket, canonical_id, role, db)
    except Exception as e:
        logger.error(f"Error sending initial state snapshot: {e}")
    finally:
        db.close()

    # 3. Real-time command loop
    try:
        while True:
            raw_data = await websocket.receive_text()
            if not raw_data:
                continue

            try:
                msg = json.loads(raw_data)
            except Exception:
                continue

            msg_type = msg.get("type", "").upper()
            payload = msg.get("payload", {})

            # PING / HEARTBEAT
            if msg_type in ["PING", "HEARTBEAT"]:
                await ws_manager.send_to_client(websocket, {"type": "PONG"})
                continue

            # GET_SNAPSHOT
            if msg_type == "GET_SNAPSHOT":
                db = SessionLocal()
                try:
                    await ws_manager.send_state_snapshot(websocket, canonical_id, role, db)
                finally:
                    db.close()
                continue

            # REAL-TIME MESSAGING: CHAT_MESSAGE / SEND_MESSAGE
            if msg_type in ["CHAT_MESSAGE", "SEND_MESSAGE"]:
                recip_role = payload.get("recipient", payload.get("recipient_role", "ALL"))
                content = payload.get("message", payload.get("content", "")).strip()
                if not content:
                    continue

                db = SessionLocal()
                try:
                    ex = db.query(Exercise).filter(Exercise.id == canonical_id).first()
                    if ex:
                        await process_and_dispatch_message(
                            exercise=ex,
                            sender_id=participant_id,
                            sender_name=display_name,
                            sender_role=role,
                            recipient_role=recip_role,
                            content=content,
                            db=db,
                            sender_client_id=effective_client_id
                        )
                except Exception as e:
                    logger.error(f"Error processing WS chat message: {e}", exc_info=True)
                    await ws_manager.send_to_client(websocket, {
                        "type": "ERROR",
                        "message": f"Failed to deliver message: {str(e)}"
                    })
                finally:
                    db.close()
                continue

            # REAL-TIME DECISION: SUBMIT_DECISION
            if msg_type == "SUBMIT_DECISION":
                dec_type = payload.get("decision_type", "HOLD")
                action_target = payload.get("action_target", "Sector Bravo")
                rationale = payload.get("rationale", "").strip()
                conf_score = int(payload.get("confidence_score", 75))

                if not rationale or len(rationale) < 8:
                    await ws_manager.send_to_client(websocket, {
                        "type": "ERROR",
                        "message": "Substantive operational rationale required (minimum 8 characters)"
                    })
                    continue

                db = SessionLocal()
                try:
                    ex = db.query(Exercise).filter(Exercise.id == canonical_id).first()
                    if ex:
                        dec = Decision(
                            exercise_id=ex.id,
                            participant_id=participant_id,
                            participant_role=role,
                            decision_type=dec_type,
                            action_target=action_target,
                            rationale=rationale,
                            confidence_score=conf_score,
                            response_time_seconds=float(ex.elapsed_seconds)
                        )
                        db.add(dec)
                        db.commit()
                        db.refresh(dec)

                        log = ExerciseLog(
                            exercise_id=ex.id,
                            actor_role=role,
                            event_type="DECISION_SUBMITTED",
                            message=f"DECISION: {dec_type} by {role} ({conf_score}% conf). Rationale: {rationale[:80]}",
                            metadata_json={
                                "decision_type": dec_type,
                                "action_target": action_target,
                                "confidence_score": conf_score,
                                "rationale": rationale,
                                "elapsed_seconds": ex.elapsed_seconds
                            }
                        )
                        db.add(log)
                        db.commit()

                        # Broadcast decision to all participants and instructor
                        await ws_manager.broadcast(canonical_id, {
                            "type": "DECISION_LOGGED",
                            "id": dec.id,
                            "participant_role": dec.participant_role,
                            "decision_type": dec.decision_type,
                            "action_target": dec.action_target,
                            "rationale": dec.rationale,
                            "confidence_score": dec.confidence_score,
                            "response_time_seconds": dec.response_time_seconds,
                            "created_at": dec.created_at.isoformat()
                        })
                except Exception as e:
                    logger.error(f"Error handling WS decision: {e}")
                finally:
                    db.close()
                continue

            # REAL-TIME INSTRUCTOR INJECTION: INJECT_EVENT
            if msg_type in ["INJECT_EVENT", "INJECT_DISRUPTION"]:
                # Security: Only instructors can inject disruptions
                if normalize_role(role) != "INSTRUCTOR":
                    await ws_manager.send_to_client(websocket, {
                        "type": "ERROR",
                        "message": "Unauthorized: Only instructors can inject disruptions"
                    })
                    continue

                evt_type = payload.get("event", payload.get("event_type", "COMMS_DELAY"))
                db = SessionLocal()
                try:
                    ex = db.query(Exercise).filter(Exercise.id == canonical_id).first()
                    if ex:
                        evt_params = {
                            "delay": float(payload.get("delay_seconds", payload.get("delay", 12.0))),
                            "dropout": float(payload.get("dropout_probability", payload.get("dropout", 0.40))),
                            "reliability": 1.0 - float(payload.get("reliability_impact", 0.42)),
                            "duration": int(payload.get("duration_seconds", 60)),
                            "sector": payload.get("sector", "Sector Bravo")
                        }
                        evt = ScenarioEvent(
                            exercise_id=ex.id,
                            event_type=evt_type,
                            target_role=payload.get("target_role", "ALL"),
                            title=payload.get("title", f"Injected Disruption: {evt_type}"),
                            description=payload.get("description", "Instructor injected disruption"),
                            payload=evt_params,
                            scheduled_second=ex.elapsed_seconds,
                            triggered=True,
                            triggered_at=datetime.now(timezone.utc)
                        )
                        db.add(evt)
                        db.commit()
                        db.refresh(evt)

                        await exercise_engine._apply_event(db, ex, evt)
                        db.commit()
                except Exception as e:
                    logger.error(f"Error handling WS injection: {e}")
                finally:
                    db.close()
                continue

    except WebSocketDisconnect:
        leaving = ws_manager.disconnect(websocket, canonical_id)
        if leaving:
            await ws_manager.broadcast(canonical_id, {
                "type": "PARTICIPANT_LEFT",
                "participant": {
                    "client_id": leaving["client_id"],
                    "participant_id": leaving["participant_id"],
                    "role": leaving["role"],
                    "display_name": leaving["display_name"],
                    "status": "DISCONNECTED"
                },
                "online_participants": ws_manager.get_online_participants(canonical_id)
            })

