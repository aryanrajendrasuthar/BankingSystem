import { useEffect, useState, useCallback } from "react";
import { accountApi } from "../services/api";
import type { Account, Transaction, TransactionPage, User } from "../types";
import AccountCard from "../components/AccountCard";
import TransactionTable from "../components/TransactionTable";
import BalanceChart from "../components/BalanceChart";
import ActionModal from "../components/ActionModal";
import ProfileModal from "../components/ProfileModal";
import Navbar from "../components/Navbar";

type Action = "deposit" | "withdraw" | "transfer";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

function getMonthSummary(transactions: Transaction[]) {
  const now = new Date();
  const thisMonth = transactions.filter((t) => {
    const d = new Date(t.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const income = thisMonth
    .filter((t) => t.transaction_type === "deposit" || t.transaction_type === "transfer_in")
    .reduce((s, t) => s + Number(t.amount), 0);
  const expenses = thisMonth
    .filter((t) => t.transaction_type === "withdrawal" || t.transaction_type === "transfer_out")
    .reduce((s, t) => s + Number(t.amount), 0);
  return { income, expenses };
}

interface Props {
  user: User;
  onUserUpdated: (u: User) => void;
  onLogout: () => void;
}

export default function Dashboard({ user, onUserUpdated, onLogout }: Props) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [txPage, setTxPage] = useState<TransactionPage | null>(null);
  const [allTxns, setAllTxns] = useState<Transaction[]>([]);
  const [page, setPage] = useState(1);
  const [filterType, setFilterType] = useState("");
  const [modal, setModal] = useState<Action | null>(null);
  const [newType, setNewType] = useState<"checking" | "savings">("checking");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [loadingTxns, setLoadingTxns] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [closeConfirm, setCloseConfirm] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState("");
  const [exportingCsv, setExportingCsv] = useState(false);

  const selectedAccount = accounts.find((a) => a.id === selectedId) ?? null;

  const fetchAccounts = useCallback(async () => {
    const { data } = await accountApi.list();
    setAccounts(data);
    if (data.length > 0 && !selectedId) setSelectedId(data[0].id);
  }, [selectedId]);

  const fetchTransactions = useCallback(async () => {
    if (!selectedId) return;
    setLoadingTxns(true);
    try {
      const { data } = await accountApi.transactions(selectedId, page, 20, filterType || undefined);
      setTxPage(data);
      if (page === 1 && !filterType) {
        const { data: all } = await accountApi.transactions(selectedId, 1, 100);
        setAllTxns(all.items);
      }
    } finally {
      setLoadingTxns(false);
    }
  }, [selectedId, page, filterType]);

  useEffect(() => { fetchAccounts(); }, []);
  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const LIMITS: Record<"checking" | "savings", number> = { checking: 1, savings: 2 };
  const checkingCount = accounts.filter((a) => a.account_type === "checking").length;
  const savingsCount = accounts.filter((a) => a.account_type === "savings").length;
  const atLimit = newType === "checking" ? checkingCount >= 1 : savingsCount >= 2;

  async function handleCreateAccount() {
    setCreateError("");
    if (atLimit) {
      const max = LIMITS[newType];
      setCreateError(`You already have ${max} ${newType} account${max > 1 ? "s" : ""} (the maximum). Close one to open a new one.`);
      return;
    }
    setCreating(true);
    try {
      await accountApi.create(newType);
      await fetchAccounts();
    } catch (err: any) {
      setCreateError(err.response?.data?.detail || "Failed to create account.");
    } finally {
      setCreating(false);
    }
  }

  function handleModalSuccess() {
    fetchAccounts();
    setPage(1);
    setFilterType("");
    fetchTransactions();
  }

  async function handleCloseAccount() {
    if (!selectedAccount) return;
    setCloseError("");
    setClosing(true);
    try {
      await accountApi.close(selectedAccount.id);
      setCloseConfirm(false);
      const remaining = accounts.filter((a) => a.id !== selectedAccount.id);
      setAccounts(remaining);
      setSelectedId(remaining.length > 0 ? remaining[0].id : null);
      setTxPage(null);
      setAllTxns([]);
    } catch (err: any) {
      setCloseError(err.response?.data?.detail || "Failed to close account.");
    } finally {
      setClosing(false);
    }
  }

  async function handleExportCsv() {
    if (!selectedAccount) return;
    setExportingCsv(true);
    try {
      await accountApi.statement(selectedAccount.id, selectedAccount.account_number);
    } catch {
      alert("Failed to export statement.");
    } finally {
      setExportingCsv(false);
    }
  }

  const totalBalance = accounts.reduce((s, a) => s + Number(a.balance), 0);
  const { income, expenses } = getMonthSummary(allTxns);

  return (
    <>
      <Navbar user={user} onLogout={onLogout} onOpenProfile={() => setShowProfile(true)} />
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Summary banner */}
        <div className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2 bg-slate-900 text-white rounded-2xl p-6">
            <p className="text-slate-400 text-sm mb-1">Total balance across all accounts</p>
            <p className="text-4xl font-bold tabular-nums">{fmt(totalBalance)}</p>
            <p className="text-slate-400 text-sm mt-2">{accounts.length} account{accounts.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-slate-200 flex flex-col justify-between">
            <p className="text-slate-500 text-sm font-medium mb-3">Open new account</p>
            <select
              value={newType}
              onChange={(e) => { setNewType(e.target.value as "checking" | "savings"); setCreateError(""); }}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 mb-1 focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="checking">Checking (max 1)</option>
              <option value="savings">Savings (max 2)</option>
            </select>
            <p className="text-xs text-slate-400 mb-3">
              {newType === "checking" ? `${checkingCount}/1 used` : `${savingsCount}/2 used`}
            </p>
            {createError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{createError}</p>
            )}
            <button
              onClick={handleCreateAccount}
              disabled={creating || atLimit}
              className="w-full py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition"
            >
              {creating ? "Opening…" : atLimit ? "Limit Reached" : "+ Open Account"}
            </button>
          </div>
        </div>

        {accounts.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <p className="text-lg font-medium mb-2">No accounts yet</p>
            <p className="text-sm">Open your first account above to get started.</p>
          </div>
        ) : (
          <>
            {/* Account cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {accounts.map((acc) => (
                <AccountCard
                  key={acc.id}
                  account={acc}
                  selected={acc.id === selectedId}
                  onSelect={() => { setSelectedId(acc.id); setPage(1); setFilterType(""); }}
                />
              ))}
            </div>

            {selectedAccount && (
              <>
                {/* Quick actions */}
                <div className="flex gap-3 mb-8 flex-wrap">
                  {(["deposit", "withdraw", "transfer"] as Action[]).map((a) => (
                    <button
                      key={a}
                      onClick={() => setModal(a)}
                      className="px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:border-slate-400 hover:bg-slate-50 capitalize transition"
                    >
                      {a}
                    </button>
                  ))}
                  <button
                    onClick={() => { setCloseError(""); setCloseConfirm(true); }}
                    className="px-5 py-2.5 rounded-xl bg-white border border-red-200 text-red-500 text-sm font-medium hover:border-red-400 hover:bg-red-50 transition ml-auto"
                  >
                    Close Account
                  </button>
                </div>

                {/* This month summary */}
                {allTxns.length > 0 && (
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-white rounded-2xl border border-slate-200 p-4">
                      <p className="text-xs text-slate-400 mb-1">This month — In</p>
                      <p className="text-lg font-bold text-emerald-600 tabular-nums">{fmt(income)}</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200 p-4">
                      <p className="text-xs text-slate-400 mb-1">This month — Out</p>
                      <p className="text-lg font-bold text-red-500 tabular-nums">{fmt(expenses)}</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200 p-4">
                      <p className="text-xs text-slate-400 mb-1">Net</p>
                      <p className={`text-lg font-bold tabular-nums ${income - expenses >= 0 ? "text-slate-900" : "text-red-500"}`}>
                        {fmt(income - expenses)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Balance chart */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
                  <h2 className="text-sm font-semibold text-slate-700 mb-4">Balance History</h2>
                  <BalanceChart transactions={allTxns} />
                </div>

                {/* Transaction history */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-slate-700">
                      Transaction History
                      {loadingTxns && <span className="ml-2 text-slate-400 font-normal">Loading…</span>}
                    </h2>
                    <button
                      onClick={handleExportCsv}
                      disabled={exportingCsv}
                      className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-60 transition"
                    >
                      {exportingCsv ? "Exporting…" : "↓ Export CSV"}
                    </button>
                  </div>
                  {txPage && (
                    <TransactionTable
                      transactions={txPage.items}
                      total={txPage.total}
                      page={page}
                      pageSize={txPage.page_size}
                      onPageChange={(p) => setPage(p)}
                      filterType={filterType}
                      onFilterType={setFilterType}
                    />
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {modal && selectedAccount && (
        <ActionModal
          action={modal}
          account={selectedAccount}
          accounts={accounts}
          onClose={() => setModal(null)}
          onSuccess={handleModalSuccess}
        />
      )}

      {showProfile && (
        <ProfileModal
          user={user}
          onClose={() => setShowProfile(false)}
          onUpdated={(u) => { onUserUpdated(u); }}
        />
      )}

      {/* Close account confirmation modal */}
      {closeConfirm && selectedAccount && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Close Account</h2>
            <p className="text-slate-500 text-sm mb-1">
              <span className="font-medium capitalize">{selectedAccount.account_type}</span> ••• {selectedAccount.account_number.slice(-4)}
            </p>
            <p className="text-slate-500 text-sm mb-4">
              Balance: <span className="font-semibold text-slate-900">{fmt(Number(selectedAccount.balance))}</span>
            </p>
            {Number(selectedAccount.balance) !== 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm mb-4">
                Balance must be <strong>$0.00</strong> to close this account. Please withdraw or transfer all funds first.
              </div>
            ) : (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4">
                This action is permanent and cannot be undone.
              </div>
            )}
            {closeError && (
              <p className="text-sm text-red-600 mb-3">{closeError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setCloseConfirm(false)}
                className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCloseAccount}
                disabled={closing || Number(selectedAccount.balance) !== 0}
                className="flex-1 py-2.5 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition"
              >
                {closing ? "Closing…" : "Close Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
