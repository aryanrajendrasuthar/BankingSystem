from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session
from app.api.deps import get_current_admin, get_current_user
from app.core.database import get_db
from app.crud.account import (
    create_account,
    deposit,
    get_account,
    get_all_accounts,
    get_transactions,
    get_user_accounts,
    transfer,
    withdraw,
)
from app.models.account import TransactionType
from app.models.user import User
from app.schemas.account import (
    AccountCreate,
    AccountOut,
    DepositRequest,
    TransactionOut,
    TransactionPage,
    TransferRequest,
    WithdrawRequest,
)

router = APIRouter(prefix="/accounts", tags=["accounts"])
limiter = Limiter(key_func=get_remote_address)


@router.post("/", response_model=AccountOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
def create_new_account(
    request: Request,
    data: AccountCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = get_user_accounts(db, current_user.id)
    same_type = [a for a in existing if a.account_type == data.account_type]
    if len(same_type) >= 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum 3 {data.account_type.value} accounts allowed",
        )
    return create_account(db, current_user.id, data)


@router.get("/", response_model=list[AccountOut])
@limiter.limit("30/minute")
def list_my_accounts(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_user_accounts(db, current_user.id)


@router.get("/all", response_model=list[AccountOut])
@limiter.limit("30/minute")
def list_all_accounts(
    request: Request,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    return get_all_accounts(db, skip=skip, limit=limit)


@router.get("/{account_id}", response_model=AccountOut)
@limiter.limit("30/minute")
def get_account_detail(
    request: Request,
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.user import UserRole
    account = get_account(db, account_id)
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    if current_user.role != UserRole.admin and account.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your account")
    return account


@router.post("/{account_id}/deposit", response_model=TransactionOut)
@limiter.limit("20/minute")
def deposit_funds(
    request: Request,
    account_id: int,
    body: DepositRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return deposit(db, account_id, current_user.id, body.amount, body.description)


@router.post("/{account_id}/withdraw", response_model=TransactionOut)
@limiter.limit("20/minute")
def withdraw_funds(
    request: Request,
    account_id: int,
    body: WithdrawRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return withdraw(db, account_id, current_user.id, body.amount, body.description)


@router.post("/{account_id}/transfer", response_model=TransactionOut)
@limiter.limit("20/minute")
def transfer_funds(
    request: Request,
    account_id: int,
    body: TransferRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    out_txn, _ = transfer(db, account_id, current_user.id, body.to_account_number, body.amount, body.description)
    return out_txn


@router.get("/{account_id}/transactions", response_model=TransactionPage)
@limiter.limit("30/minute")
def list_transactions(
    request: Request,
    account_id: int,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    transaction_type: TransactionType | None = Query(default=None),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.user import UserRole
    account = get_account(db, account_id)
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    if current_user.role != UserRole.admin and account.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your account")

    total, items = get_transactions(
        db, account_id,
        page=page,
        page_size=page_size,
        transaction_type=transaction_type,
        date_from=date_from,
        date_to=date_to,
    )
    return TransactionPage(total=total, page=page, page_size=page_size, items=items)
