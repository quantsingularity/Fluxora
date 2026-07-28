from typing import Optional

from pydantic import BaseModel, EmailStr, field_validator

_MIN_PASSWORD_LENGTH = 8


class UserBase(BaseModel):
    email: EmailStr


class UserCreate(UserBase):
    password: str

    @field_validator("password")
    @classmethod
    def password_must_meet_minimum_length(cls, v: str) -> str:
        if len(v) < _MIN_PASSWORD_LENGTH:
            raise ValueError(
                f"Password must be at least {_MIN_PASSWORD_LENGTH} characters long."
            )
        return v


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None

    @field_validator("password")
    @classmethod
    def password_must_meet_minimum_length(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) < _MIN_PASSWORD_LENGTH:
            raise ValueError(
                f"Password must be at least {_MIN_PASSWORD_LENGTH} characters long."
            )
        return v


class UserProfileUpdate(BaseModel):
    """Self-service profile update — deliberately excludes ``is_active``
    and ``is_superuser``, which only admin-facing endpoints may change."""

    email: Optional[EmailStr] = None
    password: Optional[str] = None

    @field_validator("password")
    @classmethod
    def password_must_meet_minimum_length(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) < _MIN_PASSWORD_LENGTH:
            raise ValueError(
                f"Password must be at least {_MIN_PASSWORD_LENGTH} characters long."
            )
        return v


class User(UserBase):
    id: int
    is_active: bool
    is_superuser: bool

    model_config = {"from_attributes": True}


class ProfileUpdateResponse(BaseModel):
    """Response for ``PATCH /v1/auth/me``.

    Access/refresh tokens are only populated when the update changed the
    user's email. JWTs here are keyed on email (the ``sub`` claim), so
    changing it makes the caller's existing access token immediately
    unresolvable — without reissuing fresh tokens in the same response,
    the very next authenticated request after a successful email change
    would silently 401 and look like the user had been logged out.
    """

    user: User
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_type: Optional[str] = None


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str


class TokenRefresh(BaseModel):
    refresh_token: str


class TokenData(BaseModel):
    email: Optional[str] = None
