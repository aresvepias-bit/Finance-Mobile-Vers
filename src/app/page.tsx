"use client";

import React, { useState, useEffect } from "react";
import { useAppState } from "@/hooks/useAppState";
import {
  LayoutDashboard,
  PlusCircle,
  Wallet,
  PieChart,
  ShoppingBag,
  Calendar,
  Package,
  PiggyBank,
  Settings,
  LogOut,
  RefreshCw,
  Landmark,
  Split,
  Eye,
  EyeOff,
  Lock,
  User as UserIcon,
  Menu,
  X,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  FileText,
} from "lucide-react";

// Import Views
import { DashboardView } from "@/components/DashboardView";
import { ReportView } from "@/components/ReportView";
import { TransactionForm } from "@/components/TransactionForm";
import { BanksView } from "@/components/BanksView";
import { PortfolioView } from "@/components/PortfolioView";
import { EcommerceView } from "@/components/EcommerceView";
import { SubscriptionView } from "@/components/SubscriptionView";
import { InventoryView } from "@/components/InventoryView";
import { BudgetView } from "@/components/BudgetView";
import { ConfigView } from "@/components/ConfigView";
import { InstallmentView } from "@/components/InstallmentView";
import { PocketView } from "@/components/PocketView";
import { CustomConfirmAlert } from "@/components/ui/CustomConfirmAlert";

export default function Page() {
  const {
    user,
    loading,
    syncing,
    error,
    login,
    logout,
    refreshData,
    hideNumbers,
    toggleHideNumbers,
  } = useAppState();

  const [activeTab, setActiveTab] = useState("dashboard");
  const [usernameInput, setUsernameInput] = useState("admin");
  const [pinInput, setPinInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Tab definitions
  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "report", label: "Laporan Kategori", icon: FileText },
    { id: "input", label: "Catat Transaksi", icon: PlusCircle },
    { id: "bank", label: "Rekening Bank", icon: Wallet },
    { id: "portfolio", label: "Portofolio Aset", icon: PieChart },
    { id: "ecommerce", label: "E-Commerce", icon: ShoppingBag },
    { id: "subscription", label: "Tagihan Langganan", icon: Calendar },
    { id: "installment", label: "Cicilan & Hutang", icon: Landmark },
    { id: "pocket", label: "Pos Alokasi", icon: Split },
    { id: "inventory", label: "Inventaris Barang", icon: Package },
    { id: "budget", label: "Anggaran Kategori", icon: PiggyBank },
    { id: "configuration", label: "Pengaturan & Kategori", icon: Settings },
  ];

  // Auto-clear login error on input change
  useEffect(() => {
    if (loginError) setLoginError("");
  }, [usernameInput, pinInput]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput || !pinInput) {
      setLoginError("Username dan PIN wajib diisi!");
      return;
    }
    if (pinInput.length !== 6) {
      setLoginError("PIN harus terdiri dari 6 digit angka!");
      return;
    }

    setIsSubmittingLogin(true);
    try {
      const res = await login(usernameInput, pinInput);
      if (res.status !== "success") {
        setLoginError(res.message || "PIN salah!");
      }
    } catch (err) {
      setLoginError("Terjadi kesalahan koneksi database.");
    } finally {
      setIsSubmittingLogin(false);
    }
  };

  // Loading Screen
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white font-sans">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <Wallet className="absolute w-6 h-6 text-emerald-400" />
        </div>
        <p className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-400 animate-pulse">
          Memuat Smart Wallet...
        </p>
      </div>
    );
  }

  // Auth Screen (PIN Lock)
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 font-sans relative overflow-hidden px-4">
        {/* Animated Background Gradients */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl animate-pulse duration-[8s]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-600/20 rounded-full blur-3xl animate-pulse duration-[12s]" />

        <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10">
          <div className="text-center space-y-2 mb-8">
            <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg shadow-emerald-500/30">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Smart Wallet</h1>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
              Personal Finance Manager
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Username
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <UserIcon className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="Masukkan username"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-inner"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  PIN Keamanan (6 Digit)
                </label>
                <input
                  type="password"
                  maxLength={6}
                  required
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••••"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl px-4 py-3 text-center text-xl tracking-[0.75em] font-black text-emerald-400 placeholder-slate-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-inner"
                />
              </div>
            </div>

            {loginError && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs px-4 py-3 rounded-2xl font-bold flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmittingLogin}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-2xl py-3.5 font-bold text-sm shadow-lg shadow-emerald-500/25 transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-55 disabled:cursor-not-allowed"
            >
              {isSubmittingLogin ? "Memproses..." : "Masuk Ke Dashboard"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Active View Renderer
  const renderActiveView = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardView onSwitchTab={(tab) => setActiveTab(tab)} />;
      case "report":
        return <ReportView />;
      case "input":
        return <TransactionForm />;
      case "bank":
        return <BanksView />;
      case "portfolio":
        return <PortfolioView />;
      case "ecommerce":
        return <EcommerceView />;
      case "subscription":
        return <SubscriptionView />;
      case "installment":
        return <InstallmentView />;
      case "pocket":
        return <PocketView />;
      case "inventory":
        return <InventoryView />;
      case "budget":
        return <BudgetView />;
      case "configuration":
        return <ConfigView />;
      default:
        return <DashboardView onSwitchTab={(tab) => setActiveTab(tab)} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50/50 font-sans text-slate-800">
      {/* SIDEBAR — Desktop */}
      <aside className={`hidden lg:flex flex-col bg-slate-900 border-r border-slate-800 text-slate-400 shrink-0 select-none transition-all duration-300 ease-in-out ${isSidebarCollapsed ? "w-20" : "w-72"}`}>
        {/* Brand */}
        <div className={`p-4 border-b border-slate-800 flex items-center justify-between ${isSidebarCollapsed ? "flex-col gap-4 py-6" : ""}`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-md shadow-emerald-500/20 text-white animate-float">
              <Wallet className="w-5 h-5" />
            </div>
            {!isSidebarCollapsed && (
              <div className="animate-scale-in">
                <h2 className="text-base font-black text-white tracking-tight">Smart Wallet</h2>
              </div>
            )}
          </div>

          <div className={`flex items-center gap-1.5 ${isSidebarCollapsed ? "flex-col" : ""}`}>
            {/* Sync indicator */}
            <button
              onClick={() => refreshData()}
              disabled={syncing}
              className={`p-1.5 rounded-lg border border-slate-800 hover:border-slate-700 hover:bg-slate-800 text-slate-500 hover:text-white transition-all ${
                syncing ? "animate-spin text-emerald-400" : ""
              }`}
              title="Sinkronisasi Data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            {/* Sembunyikan / tampilkan nominal */}
            <button
              onClick={toggleHideNumbers}
              className={`p-1.5 rounded-lg border transition-all ${
                hideNumbers
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                  : "border-slate-800 hover:border-slate-700 hover:bg-slate-800 text-slate-500 hover:text-white"
              }`}
              title={hideNumbers ? "Tampilkan nominal" : "Sembunyikan nominal"}
              aria-pressed={hideNumbers}
            >
              {hideNumbers ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>

            {/* Collapse toggle button */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-1.5 rounded-lg border border-slate-800 hover:border-slate-700 hover:bg-slate-800 text-slate-500 hover:text-white transition-all"
              title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isSidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center rounded-xl text-xs font-bold transition-all duration-200 group relative ${
                  isSidebarCollapsed ? "justify-center p-3" : "gap-3.5 px-4 py-3"
                } ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                    : "hover:bg-slate-800 hover:text-white hover:scale-[1.02] active:scale-[0.98]"
                }`}
                title={isSidebarCollapsed ? tab.label : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? "text-white" : "text-slate-400 group-hover:text-white"}`} />
                {!isSidebarCollapsed && <span className="animate-scale-in">{tab.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* User profile & Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/20">
          <div className={`flex items-center justify-between ${isSidebarCollapsed ? "flex-col gap-4" : "px-2"}`}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <UserIcon className="w-3.5 h-3.5" />
              </div>
              {!isSidebarCollapsed && (
                <div className="text-left leading-none animate-scale-in">
                  <p className="text-xs font-bold text-white truncate max-w-[120px]">
                    {user.username}
                  </p>
                  <span className="text-[8px] uppercase tracking-wider text-slate-500 font-bold">
                    {user.role}
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={() => logout()}
              className="p-1.5 rounded-lg border border-slate-800 hover:border-rose-800/40 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-all hover:scale-105 active:scale-95"
              title="Keluar"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* MOBILE HEADER & MOBILE MENU */}
      <div className="lg:hidden fixed top-0 inset-x-0 h-16 bg-slate-900 border-b border-slate-800 text-white z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg text-white">
            <Wallet className="w-4 h-4" />
          </div>
          <span className="text-sm font-black tracking-tight">Smart Wallet</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refreshData()}
            disabled={syncing}
            className={`p-2 rounded-lg border border-slate-800 bg-slate-950/40 ${
              syncing ? "text-emerald-400" : "text-slate-400"
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={toggleHideNumbers}
            className={`p-2 rounded-lg border ${
              hideNumbers
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                : "border-slate-800 bg-slate-950/40 text-slate-400 hover:text-white"
            }`}
            title={hideNumbers ? "Tampilkan nominal" : "Sembunyikan nominal"}
            aria-pressed={hideNumbers}
          >
            {hideNumbers ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg border border-slate-800 bg-slate-950/40 text-slate-400 hover:text-white"
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-45 pt-16 flex flex-col justify-between">
          <div className="flex-1 px-4 py-6 overflow-y-auto space-y-1 bg-slate-900 text-slate-400">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                    isActive ? "bg-emerald-600 text-white shadow-md" : "hover:bg-slate-800"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="bg-slate-950 p-4 border-t border-slate-800 flex items-center justify-between text-slate-400">
            <div className="flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-emerald-400" />
              <div className="text-left">
                <p className="text-xs font-bold text-white leading-tight">{user.username}</p>
                <span className="text-[8px] uppercase tracking-wider text-slate-500">{user.role}</span>
              </div>
            </div>
            <button
              onClick={() => {
                logout();
                setIsMobileMenuOpen(false);
              }}
              className="flex items-center gap-2 text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg"
            >
              <LogOut className="w-3.5 h-3.5" /> Keluar
            </button>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-h-screen pt-16 lg:pt-0 overflow-x-hidden">
        {/* Custom Confirmation & Alert Dialog Overlay */}
        <CustomConfirmAlert />

        {/* Global Error Banner */}
        {error && (
          <div className="bg-rose-500 text-white text-xs font-bold px-6 py-3 flex justify-between items-center animate-pulse">
            <span>⚠️ {error}</span>
            <button
              onClick={() => refreshData()}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded border border-white/10 uppercase tracking-widest font-black text-[9px]"
            >
              Ulangi Sync
            </button>
          </div>
        )}

        {/* View Content Wrapper */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
          {/* Active View */}
          <div key={activeTab} className="animate-fade-in-up">
            {renderActiveView()}
          </div>
        </div>


      </main>
    </div>
  );
}
