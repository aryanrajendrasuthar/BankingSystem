import axios from "axios";
import type { Account, TokenResponse, TransactionPage, User } from "../types";

const api = axios.create({ baseURL: "/" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401 && !err.config._retry) {
      err.config._retry = true;
      try {
        const refresh = localStorage.getItem("refresh_token");
        if (!refresh) throw new Error("No refresh token");
        const { data } = await axios.post<TokenResponse>("/auth/refresh", {
          refresh_token: refresh,
        });
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("refresh_token", data.refresh_token);
        err.config.headers.Authorization = `Bearer ${data.access_token}`;
        return api(err.config);
      } catch {
        localStorage.clear();
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

/* Auth */
export const authApi = {
  register: (email: string, full_name: string, password: string) =>
    api.post<User>("/auth/register", { email, full_name, password }),

  login: (email: string, password: string) =>
    api.post<TokenResponse>("/auth/login", { email, password }),
};

/* Users */
export const userApi = {
  me: () => api.get<User>("/users/me"),
  updateProfile: (full_name: string) => api.patch<User>("/users/me", { full_name }),
  changePassword: (current_password: string, new_password: string) =>
    api.post("/users/me/password", { current_password, new_password }),
};

/* Accounts */
export const accountApi = {
  list: () => api.get<Account[]>("/accounts/"),

  create: (account_type: "checking" | "savings") =>
    api.post<Account>("/accounts/", { account_type }),

  get: (id: number) => api.get<Account>(`/accounts/${id}`),

  deposit: (id: number, amount: number, description?: string) =>
    api.post(`/accounts/${id}/deposit`, { amount, description }),

  withdraw: (id: number, amount: number, description?: string) =>
    api.post(`/accounts/${id}/withdraw`, { amount, description }),

  transfer: (id: number, to_account_number: string, amount: number, description?: string) =>
    api.post(`/accounts/${id}/transfer`, { to_account_number, amount, description }),

  transactions: (
    id: number,
    page = 1,
    page_size = 20,
    transaction_type?: string,
    date_from?: string,
    date_to?: string
  ) =>
    api.get<TransactionPage>(`/accounts/${id}/transactions`, {
      params: { page, page_size, transaction_type, date_from, date_to },
    }),

  close: (id: number) => api.delete(`/accounts/${id}`),

  statement: async (id: number, accountNumber: string) => {
    const res = await api.get(`/accounts/${id}/statement`, { responseType: "blob" });
    const url = URL.createObjectURL(new Blob([res.data], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `statement_${accountNumber}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
