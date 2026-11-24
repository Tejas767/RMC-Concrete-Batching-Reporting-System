"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PlayCircle,
  SlidersHorizontal,
  Users,
  Truck,
  FileSpreadsheet,
  Receipt,
  History,
  LogOut,
  Activity,
  HardHat,
  ChevronRight,
  ShieldCheck,
  Clock,
  Sparkles,
} from "lucide-react";
import { useSession } from "@/hooks/useSession";

export const NAVIGATION_GROUPS = [
  {
    group: "OPERATIONS",
    items: [
      {
        id: "ENTRY",
        label: "Batch Entry",
        badge: "Live",
        icon: PlayCircle,
        title: "Batch Entry Console",
        subtitle: "Real-time concrete dosing & production docket recording",
      },
      {
        id: "EDIT",
        label: "Mix Design",
        icon: SlidersHorizontal,
        title: "Mix Design Matrix",
        subtitle: "Grade-wise ingredient proportions & differential settings",
      },
    ],
  },
  {
    group: "FLEET & REGISTRY",
    items: [
      {
        id: "CUSTOMERS",
        label: "Customer Directory",
        icon: Users,
        title: "Customer Directory",
        subtitle: "Manage registered buyers, sites, and contact records",
      },
      {
        id: "VEHICLE",
        label: "Transit Mixers",
        icon: Truck,
        title: "Transit Mixer Fleet",
        subtitle: "Manage transit vehicles, truck capacity, and drivers",
      },
    ],
  },
  {
    group: "REPORTS & RECORDS",
    items: [
      {
        id: "REPORT",
        label: "Autographic Report",
        icon: FileSpreadsheet,
        title: "Autographic Batch Report",
        subtitle: "Batch-wise load curves, ingredient weights & print preview",
      },
      {
        id: "BILLING",
        label: "Billing & Challan",
        icon: Receipt,
        title: "Dispatch Challan & Tax Invoicing",
        subtitle: "Commercial delivery challans, GST invoices, and dispatch receipts",
      },
      {
        id: "HISTORY",
        label: "Batch History",
        icon: History,
        title: "Production History Archives",
        subtitle: "Historical batch records, date range filters & CSV exports",
      },
    ],
  },
];

export function AppSidebar({ activeTab, onTabChange, isMobile = false, onCloseMobile }) {
  const { user, signOut } = useSession();

  const daysRemaining = user?.daysRemaining ?? null;
  const isExpiringSoon = daysRemaining !== null && daysRemaining <= 7;
  const isExpired = daysRemaining !== null && daysRemaining === 0;

  const handleSelectTab = (id) => {
    onTabChange(id);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const displayName = user?.displayName || user?.username || "Operator";
  const userInitial = displayName.charAt(0).toUpperCase();

  return (
    <aside
      className={[
        "flex flex-col h-full bg-[#0C1E20] text-slate-200 select-none",
        "border-r border-[#1B3538] shadow-2xl relative z-30",
        isMobile ? "w-72 max-w-[85vw]" : "w-64 lg:w-72",
      ].join(" ")}
    >
      {/* ── Brand Header ──────────────────────────────────────────────── */}
      <div className="p-5 pb-4 border-b border-[#1B3538]/80 bg-gradient-to-b from-[#102729] to-[#0C1E20]">
        <div className="flex items-center gap-3">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#f1b24a] to-[#d89728] shadow-lg shadow-[#f1b24a]/20 border border-[#f1b24a]/40 text-[#0C1E20]">
            <HardHat size={22} className="stroke-[2.2]" />
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-[#0C1E20]">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            </span>
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black tracking-wider text-white uppercase font-sans">
                RMC BATCH PRO
              </span>
            </div>
            <span className="text-[10px] font-semibold tracking-widest uppercase text-emerald-400/90 flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              SYSTEM ONLINE
            </span>
          </div>
        </div>

        {/* Plant / Company Sub-Badge */}
        <div className="mt-3.5 flex items-center justify-between rounded-lg bg-[#142D30]/90 px-3 py-1.5 border border-[#1E3F42] text-[11px]">
          <span className="text-slate-400 font-medium">Plant Console</span>
          <span className="font-mono text-[#f1b24a] font-semibold text-[11px] truncate max-w-[120px]">
            {user?.plantSN ? `SN: ${user.plantSN}` : "ONLINE • STETTER"}
          </span>
        </div>
      </div>

      {/* ── Navigation Menu ───────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-none">
        {NAVIGATION_GROUPS.map((group) => (
          <div key={group.group} className="space-y-1">
            <p className="px-3 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
              {group.group}
            </p>
            <div className="space-y-1 pt-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectTab(item.id)}
                    className={[
                      "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 group relative",
                      isActive
                        ? "bg-gradient-to-r from-[#174144] to-[#123336] text-white shadow-md border border-[#23585C]"
                        : "text-slate-300 hover:text-white hover:bg-[#142F32]/60 border border-transparent",
                    ].join(" ")}
                  >
                    {/* Active Left Indicator Bar */}
                    {isActive && (
                      <motion.div
                        layoutId={isMobile ? "mobileActiveIndicator" : "activeIndicator"}
                        className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-[#f1b24a]"
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    )}

                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={[
                          "flex h-7 w-7 items-center justify-center rounded-lg transition-colors shrink-0",
                          isActive
                            ? "bg-[#f1b24a] text-[#0C1E20] shadow-sm font-bold"
                            : "bg-[#142D30] text-slate-300 group-hover:text-[#f1b24a] group-hover:bg-[#1A3A3D]",
                        ].join(" ")}
                      >
                        <Icon size={15} />
                      </div>
                      <span className="truncate text-[13px]">{item.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.badge && (
                        <span
                          className={[
                            "text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider",
                            isActive
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-[#1A3B3E] text-slate-400 group-hover:text-emerald-400",
                          ].join(" ")}
                        >
                          {item.badge}
                        </span>
                      )}
                      <ChevronRight
                        size={14}
                        className={[
                          "transition-transform duration-200",
                          isActive
                            ? "text-[#f1b24a] translate-x-0.5"
                            : "text-slate-500 opacity-0 group-hover:opacity-100 group-hover:text-slate-300",
                        ].join(" ")}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Subscription Status Widget ─────────────────────────────────── */}
      <div className="px-3 pb-3">
        <div
          className={[
            "rounded-xl p-3 border transition-all text-xs",
            isExpired
              ? "bg-red-950/40 border-red-800/60 text-red-200"
              : isExpiringSoon
              ? "bg-amber-950/30 border-amber-700/50 text-amber-200"
              : "bg-[#11292C] border-[#1C3E42] text-slate-300",
          ].join(" ")}
        >
          <div className="flex items-center justify-between font-semibold">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <ShieldCheck size={12} className="text-[#f1b24a]" />
              License Status
            </span>
            {daysRemaining !== null && (
              <span
                className={[
                  "text-[10px] font-bold px-2 py-0.5 rounded-full",
                  isExpired
                    ? "bg-red-500/20 text-red-400 border border-red-500/30"
                    : isExpiringSoon
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
                ].join(" ")}
              >
                {isExpired ? "EXPIRED" : `${daysRemaining} Days`}
              </span>
            )}
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
            <span>Operator Tier</span>
            <span className="text-slate-200 font-medium">Standard Active</span>
          </div>
        </div>
      </div>

      {/* ── User Profile & Sign Out Footer ────────────────────────────── */}
      <div className="p-3 border-t border-[#1B3538] bg-[#0A1A1B]">
        <div className="flex items-center justify-between gap-2 bg-[#122A2D] p-2 rounded-xl border border-[#1E3F43]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#1C464A] to-[#123134] text-[#f1b24a] font-bold text-xs border border-[#2B5E63] shadow-sm">
              {userInitial}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[13px] font-bold text-white truncate leading-tight">
                {displayName}
              </span>
              <span className="text-[10px] font-medium text-emerald-400/90 leading-tight">
                Plant Operator
              </span>
            </div>
          </div>

          <button
            onClick={signOut}
            title="Sign Out"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-950/40 text-red-400 hover:bg-red-900/60 hover:text-red-200 border border-red-800/40 transition-colors shadow-sm"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
