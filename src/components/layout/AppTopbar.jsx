"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Menu,
  Clock,
  Printer,
  AlertTriangle,
  Radio,
  FileText,
  Calendar,
  Sparkles,
} from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { NAVIGATION_GROUPS } from "./AppSidebar";

export function AppTopbar({ activeTab, onOpenMobile, onPrint }) {
  const { user } = useSession();
  const [timeStr, setTimeStr] = useState("");
  const [dateStr, setDateStr] = useState("");

  // Live Digital Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
      setDateStr(
        now.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Find current tab details
  let currentItem = {
    title: "Batching Console",
    subtitle: "Real-time Ready Mix Concrete Control System",
  };

  for (const group of NAVIGATION_GROUPS) {
    const found = group.items.find((item) => item.id === activeTab);
    if (found) {
      currentItem = found;
      break;
    }
  }

  const daysRemaining = user?.daysRemaining ?? null;
  const showWarning = daysRemaining !== null && daysRemaining <= 7;

  return (
    <header className="print:hidden sticky top-0 z-20 bg-white/85 backdrop-blur-md border-b border-stone-200/90 shadow-xs">
      <div className="px-4 md:px-8 py-3.5 flex items-center justify-between gap-4">
        {/* Left: Mobile Menu Button + Active View Title */}
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          <button
            onClick={onOpenMobile}
            className="lg:hidden flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-stone-300 bg-stone-100/80 text-stone-700 hover:bg-stone-200 transition-colors shadow-xs"
            aria-label="Open Navigation Menu"
          >
            <Menu size={20} />
          </button>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base md:text-lg font-bold text-stone-900 tracking-tight truncate">
                {currentItem.title}
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </div>
            <p className="hidden md:block text-xs text-stone-500 font-medium truncate">
              {currentItem.subtitle}
            </p>
          </div>
        </div>

        {/* Right: Clock & Quick Utilities */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {/* Print Quick Action on Report/Billing */}
          {(activeTab === "REPORT" || activeTab === "BILLING") && onPrint && (
            <button
              onClick={onPrint}
              className="flex items-center gap-1.5 rounded-lg bg-stone-900 text-white hover:bg-stone-800 px-3.5 py-1.5 text-xs font-semibold shadow-xs transition-colors"
            >
              <Printer size={14} />
              <span className="hidden sm:inline">Print Document</span>
            </button>
          )}

          {/* Live Clock Widget */}
          <div className="hidden sm:flex items-center gap-2 bg-stone-100/90 border border-stone-200/90 rounded-xl px-3 py-1.5 shadow-2xs">
            <Clock size={14} className="text-[#0f3d3e]" />
            <div className="flex flex-col text-right font-mono">
              <span className="text-xs font-bold text-stone-800 leading-none">
                {timeStr || "--:--:--"}
              </span>
              <span className="text-[10px] text-stone-500 font-sans leading-none mt-0.5">
                {dateStr}
              </span>
            </div>
          </div>

          {/* Days Remaining Pill */}
          {daysRemaining !== null && (
            <div
              className={[
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold shadow-xs",
                daysRemaining <= 5
                  ? "bg-red-50 border-red-200 text-red-700"
                  : daysRemaining <= 15
                  ? "bg-amber-50 border-amber-200 text-amber-700"
                  : "bg-emerald-50 border-emerald-200 text-emerald-800",
              ].join(" ")}
            >
              <span
                className={[
                  "h-1.5 w-1.5 rounded-full animate-pulse",
                  daysRemaining <= 5
                    ? "bg-red-500"
                    : daysRemaining <= 15
                    ? "bg-amber-500"
                    : "bg-emerald-500",
                ].join(" ")}
              />
              <span className="text-[11px]">
                {daysRemaining === 0 ? "Expired" : `${daysRemaining}d Left`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Subscription Warning Strip if expiring soon */}
      {showWarning && (
        <div
          className={[
            "px-4 py-1.5 text-xs font-semibold border-t flex items-center justify-between",
            daysRemaining === 0
              ? "bg-red-50 border-red-200 text-red-800"
              : "bg-amber-50 border-amber-200 text-amber-900",
          ].join(" ")}
        >
          <div className="flex items-center gap-2 mx-auto">
            <AlertTriangle size={14} className="shrink-0" />
            <span>
              {daysRemaining === 0
                ? "Subscription has expired. Access will be limited soon. Contact system administrator."
                : `Account subscription expiring in ${daysRemaining} day${
                    daysRemaining === 1 ? "" : "s"
                  }. Please renew with admin.`}
            </span>
          </div>
        </div>
      )}
    </header>
  );
}
