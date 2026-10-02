from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# --- USER & AUTH ---
class UserBase(BaseModel):
    username: str
    full_name: str
    role: str

class UserCreate(UserBase):
    pass

class UserResponse(UserBase):
    id: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class DemoLoginRequest(BaseModel):
    role: str = Field(..., description="Instructor, Commander, Recon Officer, Field Unit, Communications Officer")
    display_name: Optional[str] = None

# --- SCENARIO ---
class ScenarioBase(BaseModel):
    code: str
    name: str
    description: str
    difficulty: str = "Intermediate"
    duration_minutes: int = 15
    environment_data: Dict[str, Any] = {}
    communication_rules: Dict[str, Any] = {}
    information_rules: Dict[str, Any] = {}
    initial_conditions: Dict[str, Any] = {}
    timed_events: List[Dict[str, Any]] = []
    objectives: List[str] = []
    evaluation_criteria: List[str] = []

class ScenarioCreate(ScenarioBase):
    pass

class ScenarioResponse(ScenarioBase):
    id: str
    is_template: bool
    created_at: datetime

    class Config:
        from_attributes = True

# --- PARTICIPANT ---
class ParticipantResponse(BaseModel):
    id: str
    exercise_id: str
    user_id: Optional[str] = None
    role: str
    display_name: str
    status: str
    is_simulated: bool
    joined_at: datetime
    last_seen: datetime

    class Config:
        from_attributes = True

# --- EXERCISE ---
class ExerciseCreate(BaseModel):
    scenario_id: str
    is_demo: bool = False
    custom_code: Optional[str] = None

class ExerciseResponse(BaseModel):
    id: str
    code: str
    scenario_id: str
    status: str
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    elapsed_seconds: int = 0
    comms_reliability: float = 1.0
    message_delay_sec: float = 0.0
    dropout_rate: float = 0.0
    active_disruptions: List[str] = []
    is_demo: bool = False
    created_at: datetime

    class Config:
        from_attributes = True

class ExerciseDetailResponse(ExerciseResponse):
    scenario: Optional[ScenarioResponse] = None
    participants: List[ParticipantResponse] = []

# --- COMMUNICATION ---
class MessageSendRequest(BaseModel):
    recipient_role: str = "ALL"
    content: str

class CommunicationEventResponse(BaseModel):
    id: str
    exercise_id: str
    sender_id: Optional[str] = None
    sender_name: str
    sender_role: str
    recipient_role: str
    original_content: str
    delivered_content: Optional[str] = None
    status: str
    delay_seconds: float
    sent_at: datetime
    delivered_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- INFORMATION REPORT ---
class ReportCreate(BaseModel):
    source_name: str
    visible_to_role: str = "ALL"
    title: str
    observation: str
    sector: str = "Sector Alpha"
    confidence_level: int = 70
    verification_status: str = "UNCONFIRMED"
    coordinate_x: float = 50.0
    coordinate_y: float = 50.0

class ReportResponse(BaseModel):
    id: str
    exercise_id: str
    source_name: str
    visible_to_role: str
    title: str
    observation: str
    sector: str
    confidence_level: int
    freshness_seconds: int
    verification_status: str
    coordinate_x: float
    coordinate_y: float
    timestamp: datetime

    class Config:
        from_attributes = True

# --- DECISION ---
class DecisionCreate(BaseModel):
    decision_type: str = Field(..., description="HOLD, REPOSITION, REQUEST_VERIFICATION, CHANGE_ROUTE, ESCALATE, MAINTAIN_PLAN")
    action_target: str = "All Units"
    rationale: str
    confidence_score: int = Field(default=75, ge=0, le=100)

class DecisionResponse(BaseModel):
    id: str
    exercise_id: str
    participant_id: Optional[str] = None
    participant_role: str
    decision_type: str
    action_target: str
    rationale: str
    confidence_score: int
    response_time_seconds: float
    created_at: datetime

    class Config:
        from_attributes = True

# --- EVENT INJECTION ---
class EventInjectRequest(BaseModel):
    event_type: str = Field(..., description="COMMS_DELAY, DROPOUT, CONFLICT, FEED_OFFLINE, NETWORK_DEGRADE, RECOVERY, CUSTOM")
    target_role: str = "ALL"
    title: str
    description: str
    delay_seconds: Optional[float] = 0.0
    dropout_probability: Optional[float] = 0.0
    reliability_impact: Optional[float] = 0.0
    duration_seconds: Optional[int] = 60
    sector: Optional[str] = None

class ScenarioEventResponse(BaseModel):
    id: str
    exercise_id: str
    event_type: str
    target_role: str
    title: str
    description: str
    payload: Dict[str, Any]
    scheduled_second: int
    triggered: bool
    triggered_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- AFTER ACTION REVIEW ---
class AARReportResponse(BaseModel):
    id: str
    exercise_id: str
    executive_summary: str
    timeline_data: List[Dict[str, Any]]
    individual_metrics: Dict[str, Any]
    team_metrics: Dict[str, Any]
    decision_quality_metrics: Dict[str, Any]
    resilience_metrics: Dict[str, Any]
    ai_analysis: Dict[str, Any]
    decisions: List[Dict[str, Any]] = []
    exercise_metadata: Dict[str, Any] = {}
    generated_at: datetime

    class Config:
        from_attributes = True

# --- AI GENERATION ---
class AIScenarioRequest(BaseModel):
    objective: str
    difficulty: str = "Intermediate"
    duration_minutes: int = 15
    desired_disruptions: List[str] = ["Communication Delay", "Conflicting Reports"]

class AIAARRequest(BaseModel):
    exercise_id: str
