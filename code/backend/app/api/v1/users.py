from typing import Annotated, Any, List

from app.core.security import get_current_superuser
from app.crud.user import (
    activate_user,
    deactivate_user,
    delete_user,
    get_user,
    get_users,
    update_user,
)
from app.db.dependencies import get_db
from app.schemas.user import User, UserUpdate
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

# ---------------------------------------------------------------------------
# Missing endpoints fix: app/crud/user.py has always fully implemented
# get_users / update_user / delete_user / activate_user / deactivate_user,
# each covered by its own CRUD-layer test, but until now nothing in
# app/api ever exposed them over HTTP. Every route below is restricted to
# superusers via the existing get_current_superuser dependency (already
# used nowhere else in the codebase despite being fully implemented).
# ---------------------------------------------------------------------------

router = APIRouter(
    prefix="/users", tags=["users"], dependencies=[Depends(get_current_superuser)]
)


@router.get("/", response_model=List[User])
def list_users(
    db: Annotated[Session, Depends(get_db)],
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=1000),
) -> Any:
    """List all user accounts. Superusers only."""
    return get_users(db, skip=skip, limit=limit)


@router.get("/{user_id}", response_model=User)
def get_user_by_id(user_id: int, db: Annotated[Session, Depends(get_db)]) -> Any:
    """Retrieve a single user account by ID. Superusers only."""
    user = get_user(db, user_id=user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.patch("/{user_id}", response_model=User)
def update_user_by_id(
    user_id: int,
    payload: UserUpdate,
    db: Annotated[Session, Depends(get_db)],
) -> Any:
    """
    Update any user's email, password, or active status. Superusers only.

    Unlike ``PATCH /v1/auth/me``, this accepts the full ``UserUpdate``
    schema (including ``is_active``) since the caller is already known to
    be an administrator.
    """
    updated = update_user(db, user_id=user_id, user_update=payload)
    if updated is None:
        raise HTTPException(status_code=404, detail="User not found")
    return updated


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user_by_id(
    user_id: int,
    current_user: Annotated[User, Depends(get_current_superuser)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    """Delete any user account (and their energy data). Superusers only."""
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Use DELETE /v1/auth/me to delete your own account.",
        )
    deleted = delete_user(db, user_id=user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="User not found")


@router.post("/{user_id}/activate", response_model=User)
def activate_user_by_id(user_id: int, db: Annotated[Session, Depends(get_db)]) -> Any:
    """Reactivate a deactivated user account. Superusers only."""
    user = activate_user(db, user_id=user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("/{user_id}/deactivate", response_model=User)
def deactivate_user_by_id(
    user_id: int,
    current_user: Annotated[User, Depends(get_current_superuser)],
    db: Annotated[Session, Depends(get_db)],
) -> Any:
    """Deactivate a user account, blocking further logins. Superusers only."""
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own account.",
        )
    user = deactivate_user(db, user_id=user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user
