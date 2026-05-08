import type { User } from "../types";

interface Props {
  user: User;
  onLogout: () => void;
}

export default function Navbar({ user, onLogout }: Props) {
  return (
    <header className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center font-bold text-slate-900 text-sm">
          B
        </div>
        <span className="font-semibold text-lg tracking-tight">BankApp</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-slate-400 text-sm hidden sm:block">
          {user.full_name}
          {user.role === "admin" && (
            <span className="ml-2 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-xs font-medium">
              Admin
            </span>
          )}
        </span>
        <button
          onClick={onLogout}
          className="text-sm text-slate-400 hover:text-white transition px-3 py-1.5 rounded-lg hover:bg-slate-700"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
