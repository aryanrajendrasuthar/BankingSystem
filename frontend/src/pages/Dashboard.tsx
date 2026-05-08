import { useEffect, useState, useCallback } from "react";
import { accountApi } from "../services/api";
import type { Account, Transaction, TransactionPage } from "../types";
import AccountCard from "../components/AccountCard";
import TransactionTable from "../components/TransactionTable";
import BalanceChart from "../components/BalanceChart";
import ActionModal from "../components/ActionModal";

type Action = "deposit" | "withdraw" | "transfer";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

export default function Dashboard() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [txPage, setTxPage] = useState<TransactionPage | null>(null);
  const [allTxns, setAllTxns] = useState<Transaction[]>([]);
  const [page, setPage] = useState(1);
  const [filterType, setFilterType] = useState("");
  const [modal, setModal] = useState<Action | null>(null);
  const [newType, setNewType] = useState<"checking" | "savings">("checking");
  const [creating, setCreating] = useState(false);
  const [loadingTxns, setLoadingTxns] = useState(false);

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
      // For chart: fetch all (up to 100) regardless of filter
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

  async function handleCreateAccount() {
    setCreating(true);
    try {
      await accountApi.create(newType);
      await fetchAccounts();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to create account.");
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

  const totalBalance = accounts.reduce((s, a) => s + Number(a.balance), 0);

  return (
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
            onChange={(e) => setNewType(e.target.value as "checking" | "savings")}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 mb-3 focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="checking">Checking</option>
            <option value="savings">Savings</option>
          </select>
          <button
            onClick={handleCreateAccount}
            disabled={creating}
            className="w-full py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-60 transition"
          >
            {creating ? "Opening…" : "+ Open Account"}
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
              </div>

              {/* Balance chart */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
                <h2 className="text-sm font-semibold text-slate-700 mb-4">Balance History</h2>
                <BalanceChart transactions={allTxns} />
              </div>

              {/* Transaction history */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h2 className="text-sm font-semibold text-slate-700 mb-4">
                  Transaction History
                  {loadingTxns && <span className="ml-2 text-slate-400 font-normal">Loading…</span>}
                </h2>
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

      {modal && selectedAccount && (
        <ActionModal
          action={modal}
          account={selectedAccount}
          accounts={accounts}
          onClose={() => setModal(null)}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
}
