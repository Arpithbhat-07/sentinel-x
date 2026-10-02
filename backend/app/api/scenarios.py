from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.models import Scenario
from app.schemas.schemas import ScenarioCreate, ScenarioResponse
from app.simulation.templates import SCENARIO_TEMPLATES

router = APIRouter(prefix="/scenarios", tags=["scenarios"])

@router.get("", response_model=List[ScenarioResponse])
def get_scenarios(db: Session = Depends(get_db)):
    return db.query(Scenario).order_by(Scenario.created_at.desc()).all()

@router.get("/templates", response_model=List[ScenarioResponse])
def get_templates(db: Session = Depends(get_db)):
    return db.query(Scenario).filter(Scenario.is_template == True).all()

@router.get("/{scenario_id}", response_model=ScenarioResponse)
def get_scenario(scenario_id: str, db: Session = Depends(get_db)):
    scenario = db.query(Scenario).filter(Scenario.id == scenario_id).first()
    if not scenario:
        # Check by code
        scenario = db.query(Scenario).filter(Scenario.code == scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return scenario

@router.post("", response_model=ScenarioResponse)
def create_scenario(payload: ScenarioCreate, db: Session = Depends(get_db)):
    # Check for existing code
    existing = db.query(Scenario).filter(Scenario.code == payload.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Scenario code already exists")

    scenario = Scenario(
        code=payload.code,
        name=payload.name,
        description=payload.description,
        difficulty=payload.difficulty,
        duration_minutes=payload.duration_minutes,
        environment_data=payload.environment_data,
        communication_rules=payload.communication_rules,
        information_rules=payload.information_rules,
        initial_conditions=payload.initial_conditions,
        timed_events=payload.timed_events,
        objectives=payload.objectives,
        evaluation_criteria=payload.evaluation_criteria,
        is_template=False
    )
    db.add(scenario)
    db.commit()
    db.refresh(scenario)
    return scenario

@router.delete("/{scenario_id}")
def delete_scenario(scenario_id: str, db: Session = Depends(get_db)):
    scenario = db.query(Scenario).filter(Scenario.id == scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    if scenario.is_template:
        raise HTTPException(status_code=400, detail="Default scenario templates cannot be deleted")
    db.delete(scenario)
    db.commit()
    return {"status": "deleted", "id": scenario_id}
