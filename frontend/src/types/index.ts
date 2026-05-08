export type UserRole = "user" | "admin";
export type AccountType = "checking" | "savings";
export type TransactionType = "deposit" | "withdrawal" | "transfer_in" | "transfer_out";

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface Account {
  id: number;
  account_number: string;
  account_type: AccountType;
  balance: number;
  is_active: boolean;
  created_at: string;
}

export interface Transaction {
  id: number;
  account_id: number;
  related_account_id: number | null;
  transaction_type: TransactionType;
  amount: number;
  balance_after: number;
  description: string | null;
  created_at: string;
}

export interface TransactionPage {
  total: number;
  page: number;
  page_size: number;
  items: Transaction[];
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}
