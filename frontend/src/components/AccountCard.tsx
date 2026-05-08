import type { Account } from "../types";

interface Props {
  account: Account;
  selected: boolean;
  onSelect: () => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

export default function AccountCard({ account, selected, onSelect }: Props) {
  const isChecking = account.account_type === "checking";

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-2xl p-5 border-2 transition-all ${
        selected
          ? "border-slate-900 bg-slate-900 text-white shadow-lg"
          : "border-slate-200 bg-white hover:border-slate-300 text-slate-900"
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider ${
            selected
              ? isChecking
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-blue-400/20 text-blue-300"
              : isChecking
              ? "bg-emerald-100 text-emerald-700"
              : "bg-blue-100 text-blue-700"
          }`}
        >
          {account.account_type}
        </span>
        <span className={`text-xs font-mono ${selected ? "text-slate-400" : "text-slate-400"}`}>
          ••• {account.account_number.slice(-4)}
        </span>
      </div>

      <div>
        <p className={`text-xs mb-1 ${selected ? "text-slate-400" : "text-slate-500"}`}>
          Current balance
        </p>
        <p className={`text-2xl font-bold tabular-nums ${selected ? "text-white" : "text-slate-900"}`}>
          {fmt(account.balance)}
        </p>
      </div>
    </button>
  );
}
