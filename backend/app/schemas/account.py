from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, field_validator
from app.models.account import AccountType, TransactionType


class AccountCreate(BaseModel):
    account_type: AccountType


class AccountOut(BaseModel):
    id: int
    account_number: str
    account_type: AccountType
    balance: Decimal
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class DepositRequest(BaseModel):
    amount: Decimal
    description: str | None = None

    @field_validator("amount")
    @classmethod
    def amount_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Amount must be greater than zero")
        if v > Decimal("1000000"):
            raise ValueError("Amount exceeds maximum single transaction limit")
        return round(v, 2)


class WithdrawRequest(BaseModel):
    amount: Decimal
    description: str | None = None

    @field_validator("amount")
    @classmethod
    def amount_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Amount must be greater than zero")
        if v > Decimal("1000000"):
            raise ValueError("Amount exceeds maximum single transaction limit")
        return round(v, 2)


class TransferRequest(BaseModel):
    to_account_number: str
    amount: Decimal
    description: str | None = None

    @field_validator("amount")
    @classmethod
    def amount_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Amount must be greater than zero")
        if v > Decimal("1000000"):
            raise ValueError("Amount exceeds maximum single transaction limit")
        return round(v, 2)


class TransactionOut(BaseModel):
    id: int
    account_id: int
    related_account_id: int | None
    transaction_type: TransactionType
    amount: Decimal
    balance_after: Decimal
    description: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class TransactionPage(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[TransactionOut]
