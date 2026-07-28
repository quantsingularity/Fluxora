from datetime import timedelta
from typing import Annotated, Any

from app.core.security import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    get_current_active_user,
    verify_password,
)
from app.crud.user import create_user, delete_user, get_user_by_email, update_user
from app.db.dependencies import get_db
from app.schemas.user import (
    ProfileUpdateResponse,
    Token,
    TokenRefresh,
    User,
    UserCreate,
    UserProfileUpdate,
    UserUpdate,
)
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/token", response_model=Token)
def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Session = Depends(get_db),
) -> Any:
    user = get_user_by_email(db, email=form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account",
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(data={"sub": user.email})
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


@router.post("/refresh", response_model=Token)
def refresh_access_token(
    body: TokenRefresh,
    db: Session = Depends(get_db),
) -> Any:
    """Exchange a refresh token for a new access/refresh token pair."""
    token_data = decode_refresh_token(body.refresh_token)
    user = get_user_by_email(db, email=token_data.email)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    new_refresh_token = create_refresh_token(data={"sub": user.email})
    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
    }


@router.post("/register", response_model=User, status_code=status.HTTP_201_CREATED)
def register_user(user: UserCreate, db: Session = Depends(get_db)) -> Any:
    """Register a new user account."""
    db_user = get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    new_user = create_user(db=db, user=user)
    return new_user


@router.get("/me", response_model=User)
def read_current_user(
    current_user: Annotated[Any, Depends(get_current_active_user)],
) -> Any:
    """Return the currently authenticated user's profile."""
    return current_user


@router.patch("/me", response_model=ProfileUpdateResponse)
def update_current_user(
    profile: UserProfileUpdate,
    current_user: Annotated[Any, Depends(get_current_active_user)],
    db: Session = Depends(get_db),
) -> Any:
    """
    Update the current user's own email and/or password.

    Missing endpoint fix: ``app.crud.user.update_user`` has always fully
    supported this (including password re-hashing), but no route ever
    exposed it — account settings were read-only from the API's
    perspective. Deliberately uses ``UserProfileUpdate`` rather than the
    admin-facing ``UserUpdate`` so a user can never flip their own
    ``is_active`` flag.

    Bug fix: access/refresh tokens are keyed on email (the JWT ``sub``
    claim). Successfully changing the email here would otherwise silently
    invalidate the caller's current token on their very next request —
    indistinguishable from being logged out right after saving. When the
    email changes, a fresh token pair for the new email is issued in the
    same response so the session carries on uninterrupted.
    """
    update_data = profile.model_dump(exclude_unset=True)
    if not update_data:
        return {"user": current_user}

    email_changed = (
        "email" in update_data and update_data["email"] != current_user.email
    )
    if email_changed:
        existing = get_user_by_email(db, email=update_data["email"])
        if existing is not None:
            raise HTTPException(status_code=400, detail="Email already registered")

    updated = update_user(
        db, user_id=current_user.id, user_update=UserUpdate(**update_data)
    )
    if updated is None:
        raise HTTPException(status_code=404, detail="User not found")

    response: dict = {"user": updated}
    if email_changed:
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        response["access_token"] = create_access_token(
            data={"sub": updated.email}, expires_delta=access_token_expires
        )
        response["refresh_token"] = create_refresh_token(data={"sub": updated.email})
        response["token_type"] = "bearer"
    return response


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_current_user(
    current_user: Annotated[Any, Depends(get_current_active_user)],
    db: Session = Depends(get_db),
) -> None:
    """
    Permanently delete the current user's own account and all of their
    energy data records (cascades via the ORM relationship).

    Missing endpoint fix: ``app.crud.user.delete_user`` existed and was
    covered by CRUD-layer tests, but was never reachable through the API.
    """
    deleted = delete_user(db, user_id=current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="User not found")
