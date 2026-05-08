# Banking System

A full-stack banking application with secure JWT authentication, multi-account management, and real-time balance tracking.

**Stack:** Python 3.11 · FastAPI · PostgreSQL · SQLAlchemy 2.0 · Alembic · React 18 · TypeScript · Vite · Tailwind CSS · Recharts

---

## Features

- JWT authentication with access + refresh token rotation
- Role-based access control (user / admin)
- Multiple accounts per user (Checking / Savings, max 3 each)
- Deposit, Withdraw, Transfer (atomic transactions)
- Paginated and filterable transaction history
- Balance history chart (Recharts)
- Rate limiting via slowapi
- Fully Dockerized with docker-compose

---

## Quick Start (Docker)

```bash
docker-compose up --build
```

| Service  | URL                   |
|----------|-----------------------|
| Frontend | http://localhost      |
| Backend  | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |

The backend automatically runs Alembic migrations on startup.

---

## Local Development

### Prerequisites

- Python 3.11
- Node.js 20+
- PostgreSQL 16

### Backend

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env`:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/banking_db
SECRET_KEY=your-super-secret-key-change-in-production-min-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
```

Run migrations and start the server:

```bash
alembic upgrade head
uvicorn app.main:app --reload
```

API available at `http://localhost:8000` · Docs at `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App available at `http://localhost:5173` (proxies API calls to `:8000`).

---

## Project Structure

```
banking-system/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic/
│   │   └── versions/0001_initial_schema.py
│   └── app/
│       ├── main.py
│       ├── core/          # config, database, security
│       ├── models/        # SQLAlchemy ORM models
│       ├── schemas/       # Pydantic v2 schemas
│       ├── crud/          # database operations
│       └── api/
│           ├── deps.py    # auth dependencies
│           └── routes/    # auth, accounts, users
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    └── src/
        ├── pages/         # Login, Register, Dashboard
        ├── components/    # AccountCard, TransactionTable, BalanceChart, ActionModal
        ├── services/      # Axios client with token refresh
        └── types/         # TypeScript interfaces
```

---

## API Reference

### Authentication

All protected endpoints require `Authorization: Bearer <access_token>`.

#### POST /auth/register
Register a new user. Rate limit: 10/min.

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "full_name": "Jane Doe"
}
```

**Response `201`:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "full_name": "Jane Doe",
  "role": "user",
  "is_active": true
}
```

---

#### POST /auth/login
Authenticate and receive tokens. Rate limit: 10/min.

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response `200`:**
```json
{
  "access_token": "<jwt>",
  "refresh_token": "<jwt>",
  "token_type": "bearer"
}
```

---

#### POST /auth/refresh
Exchange a refresh token for new tokens. Rate limit: 20/min.

**Request body:**
```json
{
  "refresh_token": "<jwt>"
}
```

**Response `200`:** Same shape as `/auth/login`.

---

### Accounts

#### POST /accounts/
Create a new account. Rate limit: 10/min.

**Request body:**
```json
{
  "account_type": "checking"
}
```

`account_type`: `"checking"` or `"savings"`. Limits: **1 checking**, **2 savings** per user. Close an existing account to open a new one of the same type.

**Response `201`:**
```json
{
  "id": 1,
  "account_number": "123456789012",
  "account_type": "checking",
  "balance": "0.00",
  "is_active": true,
  "created_at": "2024-01-01T00:00:00"
}
```

---

#### GET /accounts/
List all accounts belonging to the current user. Rate limit: 30/min.

**Response `200`:** Array of account objects.

---

#### GET /accounts/all *(admin only)*
List all accounts across all users. Rate limit: 30/min.

Query params: `skip` (default 0), `limit` (default 100).

---

#### GET /accounts/{account_id}
Get account details. Admin can view any account; users see only their own. Rate limit: 30/min.

---

#### POST /accounts/{account_id}/deposit
Deposit funds. Rate limit: 20/min.

**Request body:**
```json
{
  "amount": 500.00,
  "description": "Initial deposit"
}
```

`amount`: 0.01 – 1,000,000.00 (rounded to 2 decimal places).

**Response `200`:** Transaction object.

---

#### POST /accounts/{account_id}/withdraw
Withdraw funds. Rate limit: 20/min. Returns `400` if insufficient balance.

**Request body:** Same shape as deposit.

---

#### POST /accounts/{account_id}/transfer
Transfer funds to another account by account number. Rate limit: 20/min.

**Request body:**
```json
{
  "to_account_number": "987654321098",
  "amount": 200.00,
  "description": "Rent payment"
}
```

Returns the outgoing transaction. Transfer is atomic — both balance updates commit together or neither does.

---

#### DELETE /accounts/{account_id}
Close (deactivate) an account. Rate limit: 10/min. Returns `204 No Content`.

The account balance must be exactly **$0.00** before closing. Withdraw or transfer all funds first. Closed accounts are hidden from listings and cannot receive deposits or transfers.

---

#### GET /accounts/{account_id}/statement
Download full transaction history as a CSV file. Rate limit: 10/min.

**Query params:** `date_from`, `date_to` (ISO 8601, optional)

**Response:** `text/csv` file download with columns: Date, Type, Amount, Balance After, Description.

---

#### GET /accounts/{account_id}/transactions
Paginated transaction history. Rate limit: 30/min.

**Query params:**

| Param              | Type    | Default | Description                          |
|--------------------|---------|---------|--------------------------------------|
| `page`             | int     | 1       | Page number (≥ 1)                    |
| `page_size`        | int     | 20      | Results per page (1–100)             |
| `transaction_type` | string  | —       | `deposit`, `withdrawal`, `transfer`  |
| `date_from`        | datetime| —       | ISO 8601 filter start                |
| `date_to`          | datetime| —       | ISO 8601 filter end                  |

**Response `200`:**
```json
{
  "total": 42,
  "page": 1,
  "page_size": 20,
  "items": [
    {
      "id": 1,
      "account_id": 1,
      "related_account_id": null,
      "transaction_type": "deposit",
      "amount": "500.00",
      "balance_after": "500.00",
      "description": "Initial deposit",
      "created_at": "2024-01-01T00:00:00"
    }
  ]
}
```

---

### Users

#### GET /users/me
Get the current authenticated user. Rate limit: 30/min.

#### PATCH /users/me
Update display name. Rate limit: 20/min.

**Request body:**
```json
{ "full_name": "Jane Smith" }
```

**Response `200`:** Updated user object.

---

#### POST /users/me/password
Change password. Rate limit: 10/min. Returns `204 No Content`.

**Request body:**
```json
{
  "current_password": "oldpassword",
  "new_password": "newpassword123"
}
```

Returns `400` if `current_password` is incorrect. `new_password` must be ≥ 8 characters.

---

#### GET /users/ *(admin only)*
List all users. Query params: `skip`, `limit`. Rate limit: 30/min.

---

## Rate Limits

| Endpoint group         | Limit      |
|------------------------|------------|
| POST /auth/register    | 10 / min   |
| POST /auth/login       | 10 / min   |
| POST /auth/refresh     | 20 / min   |
| POST /accounts/ (create)        | 10 / min   |
| DELETE /accounts/{id}           | 10 / min   |
| GET /accounts/{id}/statement    | 10 / min   |
| Deposit / Withdraw / Transfer   | 20 / min   |
| PATCH /users/me                 | 20 / min   |
| POST /users/me/password         | 10 / min   |
| GET endpoints                   | 30 / min   |
| Global default                  | 200 / min  |

Exceeding a limit returns `HTTP 429 Too Many Requests`.

---

## Environment Variables

| Variable                    | Default                                    | Description                     |
|-----------------------------|--------------------------------------------|---------------------------------|
| `DATABASE_URL`              | `postgresql://postgres:password@localhost:5432/banking_db` | PostgreSQL connection string |
| `SECRET_KEY`                | *(must be set)*                            | JWT signing secret (min 32 chars) |
| `ALGORITHM`                 | `HS256`                                    | JWT algorithm                   |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30`                                     | Access token lifetime           |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7`                                        | Refresh token lifetime          |
