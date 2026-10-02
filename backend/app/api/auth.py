from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import User
from app.schemas.schemas import DemoLoginRequest, UserResponse
from typing import List

router = APIRouter(prefix="/auth", tags=["auth"])

DEFAULT_DEMO_USERS = [
    {"username": "instructor_admin", "full_name": "Instructor Cdr. K. Saxena", "role": "Instructor"},
    {"username": "cdr_overwatch", "full_name": "Col. V. Rao (Commander)", "role": "Commander"},
    {"username": "recon_falcon", "full_name": "Lt. Sharma (Recon Lead)", "role": "Recon Officer"},
    {"username": "field_vanguard", "full_name": "Maj. K. Singh (Vanguard-3)", "role": "Field Unit"},
    {"username": "comms_grid", "full_name": "Capt. D. Nair (Comms Grid)", "role": "Communications Officer"},
]

@router.post("/login", response_model=UserResponse)
def login(request: DemoLoginRequest, db: Session = Depends(get_db)):
    """One-click demo login / role switcher."""
    role = request.role
    display_name = request.display_name
    
    # Check if a user with this role already exists
    user = db.query(User).filter(User.role == role).first()
    if not user:
        # Create user
        default_info = next((u for u in DEFAULT_DEMO_USERS if u["role"] == role), None)
        username = f"{role.lower().replace(' ', '_')}_{hash(role) % 1000}"
        name = display_name or (default_info["full_name"] if default_info else f"{role} User")
        
        user = User(
            username=username,
            full_name=name,
            role=role,
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    elif display_name and display_name != user.full_name:
        user.full_name = display_name
        db.commit()
        db.refresh(user)
        
    return user

@router.get("/users", response_model=List[UserResponse])
def get_users(db: Session = Depends(get_db)):
    return db.query(User).all()
