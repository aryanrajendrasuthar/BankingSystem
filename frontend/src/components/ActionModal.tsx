import { useState, type FormEvent } from "react";
import { accountApi } from "../services/api";
import type { Account } from "../types";

type Action = "deposit" | "withdraw" | "transfer";

interface Props {
  action: Action;
  account: Account;
  accounts: Account[];
  onClose: () => void;
  onSuccess: () => void;
}

const titles: Record<Action, string> = {
  deposit: "Deposit Funds",
  withdraw: "Withdraw Funds",
  transfer: "Transfer Funds",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

export default function ActionModal({ action, account, accounts, onClose, onSuccess }: Props) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [toAccount, setToAccount] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const otherAccounts = accounts.filter((a) => a.id !== account.id);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) { setError("Enter a valid amount."); return; }
    if (action === "transfer" && !toAccount) { setError("Select a destination account."); return; }

    setLoading(true);
    try {
      if (action === "deposit") await accountApi.deposit(account.id, numAmount, description || undefined);
      if (action === "withdraw") await accountApi.withdraw(account.id, numAmount, description || undefined);
      if (action === "transfer") await accountApi.transfer(account.id, toAccount, numAmount, description || undefined);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Transaction failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-slate-900">{titles[action]}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>

        <div className="mb-5 p-3 bg-slate-50 rounded-lg text-sm text-slate-600">
          <span className="font-medium capitalize">{account.account_type}</span> ••• {account.account_number.slice(-4)}
          <span className="float-right font-semibold text-slate-900">{fmt(account.balance)}</span>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount (USD)</label>
            <input
              type="number"
              required
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition"
              placeholder="0.00"
            />
          </div>

          {action === "transfer" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Destination account number
              </label>
              <input
                type="text"
                required
                value={toAccount}
                onChange={(e) => setToAccount(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition font-mono"
                placeholder="12-digit account number"
              />
              {otherAccounts.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-slate-500 mb-1">Your other accounts:</p>
                  {otherAccounts.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setToAccount(a.account_number)}
                      className="mr-2 mb-1 text-xs px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono transition"
                    >
                      {a.account_number} ({a.account_type})
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Description <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition"
              placeholder="e.g. Rent payment"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-700 disabled:opacity-60 transition"
            >
              {loading ? "Processing…" : "Confirm"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
