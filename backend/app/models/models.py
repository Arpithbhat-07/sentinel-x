import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

def utc_now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    username = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, nullable=False)  # Instructor, Commander, Recon Officer, Field Unit, Communications Officer
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)

class Scenario(Base):
    __tablename__ = "scenarios"

    id = Column(String, primary_key=True, default=generate_uuid)
    code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    difficulty = Column(String, default="Intermediate")  # Beginner, Intermediate, Advanced
    duration_minutes = Column(Integer, default=15)
    
    # Structural details stored as structured JSON
    environment_data = Column(JSON, default=dict)       # sectors, terrain, synthetic landmarks, zones
    communication_rules = Column(JSON, default=dict)    # initial reliability, latency, dropouts
    information_rules = Column(JSON, default=dict)      # intel sources, default confidences
    initial_conditions = Column(JSON, default=dict)     # initial unit placements, status
    timed_events = Column(JSON, default=list)           # scheduled injection events
    objectives = Column(JSON, default=list)             # operational objectives
    evaluation_criteria = Column(JSON, default=list)    # metrics/criteria
    
    is_template = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utc_now)

    exercises = relationship("Exercise", back_populates="scenario")

class Exercise(Base):
    __tablename__ = "exercises"

    id = Column(String, primary_key=True, default=generate_uuid)
    code = Column(String, unique=True, index=True, nullable=False)  # e.g., SNTL-4821
    scenario_id = Column(String, ForeignKey("scenarios.id"), nullable=False)
    status = Column(String, default="PENDING")  # PENDING, RUNNING, PAUSED, COMPLETED
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    elapsed_seconds = Column(Integer, default=0)
    
    # Real-time communication degradation parameters
    comms_reliability = Column(Float, default=1.0)       # 0.0 to 1.0 (100%)
    message_delay_sec = Column(Float, default=0.0)       # seconds of latency
    dropout_rate = Column(Float, default=0.0)            # 0.0 to 1.0
    active_disruptions = Column(JSON, default=list)      # active active alerts/effects
    is_demo = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utc_now)

    scenario = relationship("Scenario", back_populates="exercises")
    participants = relationship("Participant", back_populates="exercise", cascade="all, delete-orphan")
    events = relationship("ScenarioEvent", back_populates="exercise", cascade="all, delete-orphan")
    comms = relationship("CommunicationEvent", back_populates="exercise", cascade="all, delete-orphan")
    reports = relationship("InformationReport", back_populates="exercise", cascade="all, delete-orphan")
    decisions = relationship("Decision", back_populates="exercise", cascade="all, delete-orphan")
    logs = relationship("ExerciseLog", back_populates="exercise", cascade="all, delete-orphan")
    aar = relationship("AARReport", back_populates="exercise", uselist=False, cascade="all, delete-orphan")

class Participant(Base):
    __tablename__ = "participants"

    id = Column(String, primary_key=True, default=generate_uuid)
    exercise_id = Column(String, ForeignKey("exercises.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    role = Column(String, nullable=False)
    display_name = Column(String, nullable=False)
    status = Column(String, default="READY")  # READY, CONNECTED, DISCONNECTED
    is_simulated = Column(Boolean, default=False)  # True if bot agent in demo
    joined_at = Column(DateTime, default=utc_now)
    last_seen = Column(DateTime, default=utc_now)

    exercise = relationship("Exercise", back_populates="participants")

class ScenarioEvent(Base):
    __tablename__ = "scenario_events"

    id = Column(String, primary_key=True, default=generate_uuid)
    exercise_id = Column(String, ForeignKey("exercises.id"), nullable=False)
    event_type = Column(String, nullable=False)  # COMMS_DELAY, DROPOUT, CONFLICT, FEED_OFFLINE, NETWORK_DEGRADE, RECOVERY
    target_role = Column(String, default="ALL")  # ALL or specific role
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    payload = Column(JSON, default=dict)
    scheduled_second = Column(Integer, default=0)
    triggered = Column(Boolean, default=False)
    triggered_at = Column(DateTime, nullable=True)

    exercise = relationship("Exercise", back_populates="events")

class CommunicationEvent(Base):
    __tablename__ = "communication_events"

    id = Column(String, primary_key=True, default=generate_uuid)
    exercise_id = Column(String, ForeignKey("exercises.id"), nullable=False)
    sender_id = Column(String, nullable=True)
    sender_name = Column(String, nullable=False)
    sender_role = Column(String, nullable=False)
    recipient_role = Column(String, default="ALL")
    original_content = Column(Text, nullable=False)
    delivered_content = Column(Text, nullable=True)
    status = Column(String, default="DELIVERED")  # DELIVERED, DELAYED, DROPPED, CORRUPTED
    delay_seconds = Column(Float, default=0.0)
    sent_at = Column(DateTime, default=utc_now)
    delivered_at = Column(DateTime, nullable=True)

    exercise = relationship("Exercise", back_populates="comms")

class InformationReport(Base):
    __tablename__ = "information_reports"

    id = Column(String, primary_key=True, default=generate_uuid)
    exercise_id = Column(String, ForeignKey("exercises.id"), nullable=False)
    source_name = Column(String, nullable=False)  # e.g. Recon Team 1, Field Sensor Array, HQ Dispatch
    visible_to_role = Column(String, default="ALL")  # Role visibility constraint
    title = Column(String, nullable=False)
    observation = Column(Text, nullable=False)
    sector = Column(String, default="Sector Alpha")
    confidence_level = Column(Integer, default=70)  # 0 to 100%
    freshness_seconds = Column(Integer, default=0)
    verification_status = Column(String, default="UNCONFIRMED")  # UNCONFIRMED, VERIFIED, CONFLICTING
    coordinate_x = Column(Float, default=50.0)  # 0-100 on synthetic map grid
    coordinate_y = Column(Float, default=50.0)
    timestamp = Column(DateTime, default=utc_now)

    exercise = relationship("Exercise", back_populates="reports")

class Decision(Base):
    __tablename__ = "decisions"

    id = Column(String, primary_key=True, default=generate_uuid)
    exercise_id = Column(String, ForeignKey("exercises.id"), nullable=False)
    participant_id = Column(String, nullable=True)
    participant_role = Column(String, nullable=False)
    decision_type = Column(String, nullable=False)  # HOLD, REPOSITION, REQUEST_VERIFICATION, CHANGE_ROUTE, ESCALATE, MAINTAIN_PLAN
    action_target = Column(String, default="All Units")
    rationale = Column(Text, nullable=False)
    confidence_score = Column(Integer, default=70)  # 0 to 100%
    response_time_seconds = Column(Float, default=0.0)
    created_at = Column(DateTime, default=utc_now)

    exercise = relationship("Exercise", back_populates="decisions")

class ExerciseLog(Base):
    __tablename__ = "exercise_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    exercise_id = Column(String, ForeignKey("exercises.id"), nullable=False)
    actor_role = Column(String, default="SYSTEM")
    event_type = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime, default=utc_now)

    exercise = relationship("Exercise", back_populates="logs")

class AARReport(Base):
    __tablename__ = "aar_reports"

    id = Column(String, primary_key=True, default=generate_uuid)
    exercise_id = Column(String, ForeignKey("exercises.id"), nullable=False, unique=True)
    executive_summary = Column(Text, nullable=False)
    timeline_data = Column(JSON, default=list)
    individual_metrics = Column(JSON, default=dict)
    team_metrics = Column(JSON, default=dict)
    decision_quality_metrics = Column(JSON, default=dict)
    resilience_metrics = Column(JSON, default=dict)
    ai_analysis = Column(JSON, default=dict)
    generated_at = Column(DateTime, default=utc_now)

    exercise = relationship("Exercise", back_populates="aar")
