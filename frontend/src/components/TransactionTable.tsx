import type { Transaction, TransactionType } from "../types";

interface Props {
  transactions: Transaction[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  filterType: string;
  onFilterType: (t: string) => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

const typeConfig: Record<
  TransactionType,
  { label: string; color: string; sign: string; icon: string }
> = {
  deposit:      { label: "Deposit",       color: "text-emerald-600", sign: "+", icon: "↓" },
  withdrawal:   { label: "Withdrawal",    color: "text-red-500",     sign: "-", icon: "↑" },
  transfer_in:  { label: "Transfer In",   color: "text-emerald-600", sign: "+", icon: "⇥" },
  transfer_out: { label: "Transfer Out",  color: "text-red-500",     sign: "-", icon: "⇤" },
};

const FILTERS = [
  { value: "", label: "All" },
  { value: "deposit", label: "Deposits" },
  { value: "withdrawal", label: "Withdrawals" },
  { value: "transfer_in", label: "Transfers In" },
  { value: "transfer_out", label: "Transfers Out" },
];

export default function TransactionTable({
  transactions,
  total,
  page,
  pageSize,
  onPageChange,
  filterType,
  onFilterType,
}: Props) {
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => { onFilterType(f.value); onPageChange(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filterType === f.value
                ? "bg-slate-900 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">No transactions yet.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left">
                <th className="px-4 py-3 font-medium text-slate-500">Type</th>
                <th className="px-4 py-3 font-medium text-slate-500">Description</th>
                <th className="px-4 py-3 font-medium text-slate-500 text-right">Amount</th>
                <th className="px-4 py-3 font-medium text-slate-500 text-right">Balance After</th>
                <th className="px-4 py-3 font-medium text-slate-500">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {transactions.map((txn) => {
                const cfg = typeConfig[txn.transaction_type];
                return (
                  <tr key={txn.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs">
                          {cfg.icon}
                        </span>
                        <span className={`font-medium ${cfg.color}`}>{cfg.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-[180px] truncate">
                      {txn.description || "—"}
                    </td>
                    <td className={`px-4 py-3 font-semibold tabular-nums text-right ${cfg.color}`}>
                      {cfg.sign}{fmt(txn.amount)}
                    </td>
                    <td className="px-4 py-3 text-slate-700 tabular-nums text-right">
                      {fmt(txn.balance_after)}
                    </td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                      {new Date(txn.created_at).toLocaleDateString("en-US", {
                        month: "short", day: "numeric", year: "numeric",
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
          <span>
            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
          </span>
          <div className="flex gap-1">
            <button
              disabled={page === 1}
              onClick={() => onPageChange(page - 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition"
            >
              ←
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition"
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
