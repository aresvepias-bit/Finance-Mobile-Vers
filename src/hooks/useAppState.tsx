"use client";

import React, { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";
import { apiService, ApiResult } from "@/lib/services/api";
import { formatRupiah, MASKED_AMOUNT } from "@/lib/format";
import type { InstallmentRecord } from "@/lib/installments";
import type { PocketRecord } from "@/lib/pockets";
import type { IncomePlan } from "@/lib/projection";

const HIDE_NUMBERS_KEY = "pf_hide_numbers";

export type ToastType = "success" | "error" | "info";
export interface Toast {
  id: number;
  type: ToastType;
  title: string;
  message: string;
}

const DEFAULT_TOAST_TITLE: Record<ToastType, string> = {
  success: "Berhasil",
  error: "Gagal",
  info: "Info",
};
const MAX_TOASTS = 4;

export interface AppState {
  user: { username: string; role: string } | null;
  categories: any[];
  banks: any[];
  transactions: any[];
  fixedCosts: any[];
  deposits: any[];
  cryptos: any[];
  ecomPlatforms: any[];
  ecommerce: any[];
  inventory: any[];
  subscriptions: any[];
  installments: InstallmentRecord[];
  pockets: PocketRecord[];
  settings: { incomePlan?: IncomePlan };
  budgets: any[];
  loading: boolean;
  syncing: boolean;
  error: string | null;
}

interface AppStateContextType extends AppState {
  refreshData: () => Promise<void>;
  login: (username: string, pin: string) => Promise<ApiResult>;
  logout: () => Promise<void>;
  updateProfile: (username?: string, pin?: string) => Promise<ApiResult>;
  
  // Mutations
  addCategory: (name: string, type: string, parentId?: string) => Promise<ApiResult>;
  updateCategory: (id: string, name: string) => Promise<ApiResult>;
  deleteCategory: (id: string) => Promise<ApiResult>;
  
  addBank: (name: string, accountNumber: string, initialBalance: number, accountType: string, walletName?: string) => Promise<ApiResult>;
  updateBank: (data: { id: string; name?: string; accountNumber?: string; walletName?: string }) => Promise<ApiResult>;

  // Dompet / buku terpisah (dikelompokkan dari rekening)
  wallets: string[];
  walletFilter: string; // "all" atau nama dompet
  setWalletFilter: (wallet: string) => void;
  deleteBank: (id: string) => Promise<ApiResult>;
  
  addTransaction: (data: any) => Promise<ApiResult>;
  updateTransaction: (data: any) => Promise<ApiResult>;
  deleteTransaction: (id: string) => Promise<ApiResult>;
  
  saveBudget: (month: string, categoryId: string, limit: number, note?: string) => Promise<ApiResult>;
  deleteBudget: (id: string) => Promise<ApiResult>;
  copyBudgets: (sourceMonth: string, targetMonth: string) => Promise<ApiResult>;
  
  addFixedCost: (name: string, amount: number, categoryId: string) => Promise<ApiResult>;
  deleteFixedCost: (id: string) => Promise<ApiResult>;
  
  addDeposit: (data: any) => Promise<ApiResult>;
  updateDepositStatus: (id: string, status: string) => Promise<ApiResult>;
  deleteDeposit: (id: string) => Promise<ApiResult>;
  
  addCrypto: (name: string, quantity: number, valueIdr: number) => Promise<ApiResult>;
  updateCrypto: (id: string, name: string, quantity: number, valueIdr: number) => Promise<ApiResult>;
  deleteCrypto: (id: string) => Promise<ApiResult>;
  
  addEcomPlatform: (platform: string, storeName?: string) => Promise<ApiResult>;
  deleteEcomPlatform: (id: string) => Promise<ApiResult>;
  
  addEcomTransaction: (data: any) => Promise<ApiResult>;
  deleteEcomTransaction: (id: string) => Promise<ApiResult>;
  
  addInventoryItem: (data: any) => Promise<ApiResult>;
  updateInventoryItem: (data: any) => Promise<ApiResult>;
  deleteInventoryItem: (id: string) => Promise<ApiResult>;
  
  addSubscription: (data: any) => Promise<ApiResult>;

  saveSetting: (key: string, value: unknown) => Promise<ApiResult>;
  savePocket: (data: Record<string, unknown>) => Promise<ApiResult>;
  deletePocket: (id: string) => Promise<ApiResult>;
  addPocketEntry: (data: { pocketId: string; type: "deposit" | "withdraw"; amount: number; date?: string; note?: string }) => Promise<ApiResult>;
  deletePocketEntry: (id: string) => Promise<ApiResult>;
  allocatePockets: (data: { month: string; date?: string; allocations: { pocketId: string; amount: number }[] }) => Promise<ApiResult>;

  saveInstallment: (data: Record<string, unknown>) => Promise<ApiResult>;
  deleteInstallment: (id: string) => Promise<ApiResult>;
  payInstallment: (data: { id: string; date?: string; bankId?: string; amount?: number }) => Promise<ApiResult>;
  undoInstallmentPayment: (paymentId: string) => Promise<ApiResult>;
  updateSubscription: (data: any) => Promise<ApiResult>;
  deleteSubscription: (id: string) => Promise<ApiResult>;
  
  confirmState: {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    type?: "warning" | "danger" | "info";
  };
  // Notifikasi toast (bisa bertumpuk)
  toasts: Toast[];
  showConfirm: (message: string, onConfirm: () => void, options?: { title?: string; type?: "warning" | "danger" | "info" }) => void;
  showAlert: (message: string, type?: ToastType, title?: string) => void;
  dismissToast: (id: number) => void;

  // Mode privasi: sembunyikan semua nominal uang
  hideNumbers: boolean;
  toggleHideNumbers: () => void;
  /** Format Rupiah; menampilkan "Rp ••••••" saat mode privasi aktif */
  formatRp: (amount: number) => string;
}

const defaultState: AppState = {
  user: null,
  categories: [],
  banks: [],
  transactions: [],
  fixedCosts: [],
  deposits: [],
  cryptos: [],
  ecomPlatforms: [],
  ecommerce: [],
  inventory: [],
  subscriptions: [],
  installments: [],
  pockets: [],
  settings: {},
  budgets: [],
  loading: true,
  syncing: false,
  error: null,
};

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(defaultState);

  // Pilihan sembunyikan angka diingat per browser
  const [hideNumbers, setHideNumbers] = useState(() => {
    try {
      return typeof window !== "undefined" && localStorage.getItem(HIDE_NUMBERS_KEY) === "1";
    } catch {
      return false;
    }
  });

  const toggleHideNumbers = useCallback(() => {
    setHideNumbers((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(HIDE_NUMBERS_KEY, next ? "1" : "0");
      } catch {
        // storage tidak tersedia (mode privat, dll) - cukup berlaku di sesi ini
      }
      return next;
    });
  }, []);

  const formatRp = useCallback(
    (amount: number) => (hideNumbers ? MASKED_AMOUNT : formatRupiah(amount)),
    [hideNumbers]
  );

  // Custom Confirm & Alert dialog states
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    type?: "warning" | "danger" | "info";
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    onCancel: () => {},
    type: "warning",
  });

  const [toasts, setToasts] = useState<Toast[]>([]);

  // Filter dompet untuk Dashboard & Laporan
  const [walletFilter, setWalletFilter] = useState("all");
  const wallets = [...new Set(["Pribadi", ...state.banks.map((b) => b.wallet_name || "Pribadi")])];
  const activeWallet = walletFilter === "all" || wallets.includes(walletFilter) ? walletFilter : "all";
  const toastIdRef = useRef(0);

  const showConfirm = (message: string, onConfirmCallback: () => void, options?: { title?: string; type?: "warning" | "danger" | "info" }) => {
    setConfirmState({
      isOpen: true,
      title: options?.title || "Konfirmasi Tindakan",
      message,
      onConfirm: () => {
        onConfirmCallback();
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
      },
      onCancel: () => {
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
      },
      type: options?.type || "warning",
    });
  };

  const showAlert = (message: string, type: ToastType = "success", title?: string) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, type, message, title: title || DEFAULT_TOAST_TITLE[type] }].slice(-MAX_TOASTS));
  };

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const refreshData = useCallback(async () => {
    setState((s) => ({ ...s, syncing: true }));
    try {
      const res = await apiService.loadBatchData();
      if (res.status === "success" && res.data) {
        setState((s) => ({
          ...s,
          ...res.data,
          syncing: false,
          error: null,
        }));
      } else {
        setState((s) => ({ ...s, syncing: false, error: res.message || "Failed to load data" }));
      }
    } catch (e: any) {
      setState((s) => ({ ...s, syncing: false, error: e.message || "Network error" }));
    }
  }, []);

  // Validate session on mount
  useEffect(() => {
    async function initSession() {
      try {
        const sessionRes = await apiService.getSession();
        if (sessionRes.status === "success" && (sessionRes as any).username) {
          setState((s) => ({
            ...s,
            user: { username: (sessionRes as any).username, role: (sessionRes as any).role || "admin" },
          }));
          await refreshData();
        }
      } catch (err) {
        // Not logged in or expired
      } finally {
        setState((s) => ({ ...s, loading: false }));
      }
    }
    initSession();
  }, [refreshData]);

  const login = async (username: string, pin: string): Promise<ApiResult> => {
    setState((s) => ({ ...s, syncing: true }));
    const res = await apiService.login(username, pin);
    if (res.status === "success") {
      setState((s) => ({
        ...s,
        user: { username, role: (res as any).role || "admin" },
        syncing: false,
      }));
      await refreshData();
    } else {
      setState((s) => ({ ...s, syncing: false }));
    }
    return res;
  };

  const logout = async () => {
    setState((s) => ({ ...s, syncing: true }));
    await apiService.logout();
    setState(() => ({
      ...defaultState,
      loading: false,
    }));
  };

  const updateProfile = async (username?: string, pin?: string): Promise<ApiResult> => {
    setState((s) => ({ ...s, syncing: true }));
    const res = await apiService.updateProfile(username, pin);
    if (res.status === "success" && username) {
      setState((s) => ({
        ...s,
        user: s.user ? { ...s.user, username } : null,
        syncing: false,
      }));
    } else {
      setState((s) => ({ ...s, syncing: false }));
    }
    return res;
  };

  // Helper function to execute state updates and trigger background syncs
  const executeMutation = async (
    apiCall: () => Promise<ApiResult>
  ): Promise<ApiResult> => {
    setState((s) => ({ ...s, syncing: true }));
    const result = await apiCall();
    if (result.status === "success") {
      await refreshData();
    } else {
      setState((s) => ({ ...s, syncing: false }));
    }
    return result;
  };

  // Category mutations
  const addCategory = (name: string, type: string, parentId?: string) =>
    executeMutation(() => apiService.addCategory(name, type, parentId));

  const updateCategory = (id: string, name: string) =>
    executeMutation(() => apiService.updateCategory(id, name));

  const deleteCategory = (id: string) =>
    executeMutation(() => apiService.deleteCategory(id));

  // Bank mutations
  const addBank = (name: string, accountNumber: string, initialBalance: number, accountType: string, walletName?: string) =>
    executeMutation(() => apiService.addBank(name, accountNumber, initialBalance, accountType, walletName));
  const updateBank = (data: { id: string; name?: string; accountNumber?: string; walletName?: string }) =>
    executeMutation(() => apiService.updateBank(data));

  const deleteBank = (id: string) =>
    executeMutation(() => apiService.deleteBank(id));

  // Transaction mutations
  const addTransaction = (data: any) =>
    executeMutation(() => apiService.addTransaction(data));

  const updateTransaction = (data: any) =>
    executeMutation(() => apiService.updateTransaction(data));

  const deleteTransaction = (id: string) =>
    executeMutation(() => apiService.deleteTransaction(id));

  // Budget mutations
  const saveBudget = (month: string, categoryId: string, limit: number, note?: string) =>
    executeMutation(() => apiService.saveBudget(month, categoryId, limit, note));

  const deleteBudget = (id: string) =>
    executeMutation(() => apiService.deleteBudget(id));

  const copyBudgets = (sourceMonth: string, targetMonth: string) =>
    executeMutation(() => apiService.copyBudgets(sourceMonth, targetMonth));

  // Fixed Cost mutations
  const addFixedCost = (name: string, amount: number, categoryId: string) =>
    executeMutation(() => apiService.addFixedCost(name, amount, categoryId));

  const deleteFixedCost = (id: string) =>
    executeMutation(() => apiService.deleteFixedCost(id));

  // Deposit mutations
  const addDeposit = (data: any) =>
    executeMutation(() => apiService.addDeposit(data));

  const updateDepositStatus = (id: string, status: string) =>
    executeMutation(() => apiService.updateDepositStatus(id, status));

  const deleteDeposit = (id: string) =>
    executeMutation(() => apiService.deleteDeposit(id));

  // Crypto mutations
  const addCrypto = (name: string, quantity: number, valueIdr: number) =>
    executeMutation(() => apiService.addCrypto(name, quantity, valueIdr));

  const updateCrypto = (id: string, name: string, quantity: number, valueIdr: number) =>
    executeMutation(() => apiService.updateCrypto(id, name, quantity, valueIdr));

  const deleteCrypto = (id: string) =>
    executeMutation(() => apiService.deleteCrypto(id));

  // Ecommerce Platform mutations
  const addEcomPlatform = (platform: string, storeName?: string) =>
    executeMutation(() => apiService.addEcomPlatform(platform, storeName));

  const deleteEcomPlatform = (id: string) =>
    executeMutation(() => apiService.deleteEcomPlatform(id));

  // Ecommerce Transaction mutations
  const addEcomTransaction = (data: any) =>
    executeMutation(() => apiService.addEcomTransaction(data));

  const deleteEcomTransaction = (id: string) =>
    executeMutation(() => apiService.deleteEcomTransaction(id));

  // Inventory mutations
  const addInventoryItem = (data: any) =>
    executeMutation(() => apiService.addInventoryItem(data));

  const updateInventoryItem = (data: any) =>
    executeMutation(() => apiService.updateInventoryItem(data));

  const deleteInventoryItem = (id: string) =>
    executeMutation(() => apiService.deleteInventoryItem(id));

  // Subscription mutations
  const addSubscription = (data: any) =>
    executeMutation(() => apiService.addSubscription(data));

  const saveSetting = (key: string, value: unknown) => executeMutation(() => apiService.saveSetting(key, value));

  // Pocket (pos alokasi) mutations
  const savePocket = (data: Record<string, unknown>) => executeMutation(() => apiService.savePocket(data));
  const deletePocket = (id: string) => executeMutation(() => apiService.deletePocket(id));
  const addPocketEntry = (data: { pocketId: string; type: "deposit" | "withdraw"; amount: number; date?: string; note?: string }) =>
    executeMutation(() => apiService.addPocketEntry(data));
  const deletePocketEntry = (id: string) => executeMutation(() => apiService.deletePocketEntry(id));
  const allocatePockets = (data: { month: string; date?: string; allocations: { pocketId: string; amount: number }[] }) =>
    executeMutation(() => apiService.allocatePockets(data));

  // Installment (cicilan) mutations
  const saveInstallment = (data: Record<string, unknown>) =>
    executeMutation(() => apiService.saveInstallment(data));
  const deleteInstallment = (id: string) => executeMutation(() => apiService.deleteInstallment(id));
  const payInstallment = (data: { id: string; date?: string; bankId?: string; amount?: number }) =>
    executeMutation(() => apiService.payInstallment(data));
  const undoInstallmentPayment = (paymentId: string) =>
    executeMutation(() => apiService.undoInstallmentPayment(paymentId));

  const updateSubscription = (data: any) =>
    executeMutation(() => apiService.updateSubscription(data));

  const deleteSubscription = (id: string) =>
    executeMutation(() => apiService.deleteSubscription(id));

  return (
    <AppStateContext.Provider
      value={{
        ...state,
        hideNumbers,
        toggleHideNumbers,
        formatRp,
        refreshData,
        login,
        logout,
        updateProfile,
        addCategory,
        updateCategory,
        deleteCategory,
        addBank,
        updateBank,
        wallets,
        walletFilter: activeWallet,
        setWalletFilter,
        deleteBank,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        saveBudget,
        deleteBudget,
        copyBudgets,
        confirmState,
        toasts,
        showConfirm,
        showAlert,
        dismissToast,
        addFixedCost,
        deleteFixedCost,
        addDeposit,
        updateDepositStatus,
        deleteDeposit,
        addCrypto,
        updateCrypto,
        deleteCrypto,
        addEcomPlatform,
        deleteEcomPlatform,
        addEcomTransaction,
        deleteEcomTransaction,
        addInventoryItem,
        updateInventoryItem,
        deleteInventoryItem,
        addSubscription,
        saveSetting,
        savePocket,
        deletePocket,
        addPocketEntry,
        deletePocketEntry,
        allocatePockets,
        saveInstallment,
        deleteInstallment,
        payInstallment,
        undoInstallmentPayment,
        updateSubscription,
        deleteSubscription,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error("useAppState must be used within an AppStateProvider");
  }
  return context;
}

/**
 * Data yang sudah disaring sesuai dompet aktif (Dashboard & Laporan).
 * Dompet = kelompok rekening; transaksi ikut rekeningnya.
 */
export function useWalletScope() {
  const { walletFilter, banks, transactions, subscriptions, installments, deposits, cryptos, ecommerce } = useAppState();
  return React.useMemo(() => {
    if (walletFilter === "all") {
      return { walletFilter, banks, transactions, subscriptions, installments, deposits, cryptos, ecommerce };
    }
    const ids = new Set(banks.filter((b) => (b.wallet_name || "Pribadi") === walletFilter).map((b) => b.id));
    return {
      walletFilter,
      banks: banks.filter((b) => ids.has(b.id)),
      transactions: transactions.filter((t) => ids.has(t.bankId ?? t.bank)),
      subscriptions: subscriptions.filter((s) => ids.has(s.bank_id)),
      installments: installments.filter((i) => ids.has(i.bank_id)),
      deposits: deposits.filter((d) => ids.has(d.bank_id)),
      // Kripto tidak terikat rekening: dianggap milik dompet Pribadi
      cryptos: walletFilter === "Pribadi" ? cryptos : [],
      ecommerce: ecommerce.filter((e) => ids.has(e.bank_id)),
    };
  }, [walletFilter, banks, transactions, subscriptions, installments, deposits, cryptos, ecommerce]);
}
