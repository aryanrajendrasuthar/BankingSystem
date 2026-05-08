import random
import string
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from fastapi import HTTPException, status
from app.models.account import Account, AccountType, Transaction, TransactionType
from app.schemas.account import AccountCreate


def _generate_account_number(db: Session) -> str:
    while True:
        number = "".join(random.choices(string.digits, k=12))
        exists = db.query(Account).filter(Account.account_number == number).first()
        if not exists:
            return number


def create_account(db: Session, user_id: int, data: AccountCreate) -> Account:
    account = Account(
        account_number=_generate_account_number(db),
        account_type=data.account_type,
        balance=Decimal("0.00"),
        owner_id=user_id,
        created_at=datetime.now(timezone.utc),
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


def get_account(db: Session, account_id: int) -> Account | None:
    return db.query(Account).filter(Account.id == account_id).first()


def get_account_by_number(db: Session, account_number: str) -> Account | None:
    return db.query(Account).filter(Account.account_number == account_number).first()


def get_user_accounts(db: Session, user_id: int) -> list[Account]:
    return db.query(Account).filter(Account.owner_id == user_id, Account.is_active == True).all()


def get_all_accounts(db: Session, skip: int = 0, limit: int = 100) -> list[Account]:
    return db.query(Account).offset(skip).limit(limit).all()


def _require_account_owned(db: Session, account_id: int, user_id: int) -> Account:
    account = get_account(db, account_id)
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    if account.owner_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your account")
    if not account.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account is inactive")
    return account


def deposit(db: Session, account_id: int, user_id: int, amount: Decimal, description: str | None) -> Transaction:
    account = _require_account_owned(db, account_id, user_id)
    try:
        account.balance += amount
        txn = Transaction(
            account_id=account.id,
            transaction_type=TransactionType.deposit,
            amount=amount,
            balance_after=account.balance,
            description=description or "Deposit",
            created_at=datetime.now(timezone.utc),
        )
        db.add(txn)
        db.commit()
        db.refresh(txn)
        return txn
    except Exception:
        db.rollback()
        raise


def withdraw(db: Session, account_id: int, user_id: int, amount: Decimal, description: str | None) -> Transaction:
    account = _require_account_owned(db, account_id, user_id)
    if account.balance < amount:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient funds")
    try:
        account.balance -= amount
        txn = Transaction(
            account_id=account.id,
            transaction_type=TransactionType.withdrawal,
            amount=amount,
            balance_after=account.balance,
            description=description or "Withdrawal",
            created_at=datetime.now(timezone.utc),
        )
        db.add(txn)
        db.commit()
        db.refresh(txn)
        return txn
    except Exception:
        db.rollback()
        raise


def transfer(
    db: Session,
    from_account_id: int,
    user_id: int,
    to_account_number: str,
    amount: Decimal,
    description: str | None,
) -> tuple[Transaction, Transaction]:
    from_account = _require_account_owned(db, from_account_id, user_id)

    to_account = get_account_by_number(db, to_account_number)
    if not to_account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Destination account not found")
    if not to_account.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Destination account is inactive")
    if from_account.id == to_account.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot transfer to the same account")
    if from_account.balance < amount:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient funds")

    try:
        from_account.balance -= amount
        to_account.balance += amount

        now = datetime.now(timezone.utc)
        desc = description or f"Transfer to {to_account.account_number}"

        out_txn = Transaction(
            account_id=from_account.id,
            related_account_id=to_account.id,
            transaction_type=TransactionType.transfer_out,
            amount=amount,
            balance_after=from_account.balance,
            description=desc,
            created_at=now,
        )
        in_txn = Transaction(
            account_id=to_account.id,
            related_account_id=from_account.id,
            transaction_type=TransactionType.transfer_in,
            amount=amount,
            balance_after=to_account.balance,
            description=description or f"Transfer from {from_account.account_number}",
            created_at=now,
        )
        db.add(out_txn)
        db.add(in_txn)
        db.commit()
        db.refresh(out_txn)
        db.refresh(in_txn)
        return out_txn, in_txn
    except HTTPException:
        raise
    except Exception:
        db.rollback()
        raise


def close_account(db: Session, account_id: int, user_id: int) -> Account:
    account = _require_account_owned(db, account_id, user_id)
    if account.balance != Decimal("0.00"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Balance must be zero to close account. Current balance: {account.balance}",
        )
    account.is_active = False
    db.commit()
    db.refresh(account)
    return account


def get_transactions(
    db: Session,
    account_id: int,
    page: int = 1,
    page_size: int = 20,
    transaction_type: TransactionType | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
) -> tuple[int, list[Transaction]]:
    query = db.query(Transaction).filter(Transaction.account_id == account_id)

    if transaction_type:
        query = query.filter(Transaction.transaction_type == transaction_type)
    if date_from:
        query = query.filter(Transaction.created_at >= date_from)
    if date_to:
        query = query.filter(Transaction.created_at <= date_to)

    total = query.count()
    items = (
        query.order_by(Transaction.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return total, items
