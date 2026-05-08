from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session
from app.api.deps import get_current_user, get_current_admin
from app.core.database import get_db
from app.crud.user import change_password, get_all_users, update_user
from app.models.user import User
from app.schemas.user import PasswordChange, UserOut, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])
limiter = Limiter(key_func=get_remote_address)


@router.get("/me", response_model=UserOut)
@limiter.limit("30/minute")
def get_me(request: Request, current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserOut)
@limiter.limit("20/minute")
def update_me(
    request: Request,
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return update_user(db, current_user, data)


@router.post("/me/password", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("10/minute")
def change_my_password(
    request: Request,
    body: PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not change_password(db, current_user, body.current_password, body.new_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")


@router.get("/", response_model=list[UserOut])
@limiter.limit("30/minute")
def list_users(
    request: Request,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    return get_all_users(db, skip=skip, limit=limit)
