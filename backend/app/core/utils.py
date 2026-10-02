from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.models import Exercise

def get_exercise_or_404(exercise_id_or_code: str, db: Session) -> Exercise:
    """Resolves an exercise by its UUID or room code (e.g., SNTL-4821)."""
    ex = db.query(Exercise).filter(
        (Exercise.id == exercise_id_or_code) | (Exercise.code == exercise_id_or_code)
    ).first()
    if not ex:
        raise HTTPException(status_code=404, detail=f"Exercise '{exercise_id_or_code}' not found")
    return ex
