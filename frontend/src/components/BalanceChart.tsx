import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { Transaction } from "../types";

interface Props {
  transactions: Transaction[];
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

export default function BalanceChart({ transactions }: Props) {
  // Build running balance timeline from oldest → newest
  const sorted = [...transactions].reverse();
  const data = sorted.map((t) => ({
    date: new Date(t.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    balance: Number(t.balance_after),
  }));

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-36 text-slate-400 text-sm">
        No data yet — make a transaction to see your balance chart.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 5, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => fmt(v)}
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          width={70}
        />
        <Tooltip
          formatter={(v) => [fmt(Number(v)), "Balance"]}
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
          }}
        />
        <Line
          type="monotone"
          dataKey="balance"
          stroke="#0f172a"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: "#0f172a" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
