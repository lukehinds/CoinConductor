from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db.database import get_db
from app.models.users import User
from app.schemas.users import User as UserSchema, UserUpdate
from app.utils.auth import get_current_active_user, get_password_hash

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me/", response_model=UserSchema)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user

@router.put("/me/", response_model=UserSchema)
async def update_user(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    # Update user fields if provided
    if user_update.email is not None:
        # Check if email already exists
        db_user = db.query(User).filter(User.email == user_update.email).first()
        if db_user and db_user.id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )
        current_user.email = user_update.email
    
    if user_update.username is not None:
        # Check if username already exists
        db_user = db.query(User).filter(User.username == user_update.username).first()
        if db_user and db_user.id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already registered",
            )
        current_user.username = user_update.username
    
    if user_update.password is not None:
        current_user.hashed_password = get_password_hash(user_update.password)
    
    db.commit()
    db.refresh(current_user)
    return current_user

@router.delete("/me/", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    db.delete(current_user)
    db.commit()
    return {"detail": "User deleted successfully"}