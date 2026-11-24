"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { AppSidebar } from "./AppSidebar";
import { AppTopbar } from "./AppTopbar";

export function DashboardLayout({ activeTab, onTabChange, onPrint, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F6F4EF] flex flex-col lg:flex-row print:block print:bg-white print:p-0 print:m-0 print:min-h-0 text-slate-800 antialiased font-sans">
      {/* ── Desktop Permanent Sidebar ───────────────────────────────────── */}
      <div className="hidden lg:block lg:sticky lg:top-0 lg:h-screen lg:shrink-0 print:hidden z-30">
        <AppSidebar activeTab={activeTab} onTabChange={onTabChange} />
      </div>

      {/* ── Mobile Drawer Sidebar (Slide-Over) ─────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden print:hidden flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Sliding Drawer */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 32 }}
              className="relative z-10 flex h-full"
            >
              <AppSidebar
                activeTab={activeTab}
                onTabChange={onTabChange}
                isMobile={true}
                onCloseMobile={() => setMobileOpen(false)}
              />

              {/* Close Button on Backdrop side */}
              <button
                onClick={() => setMobileOpen(false)}
                className="ml-3 mt-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md hover:bg-white/30 transition-colors shadow-lg"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Main Content Area ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 print:block print:p-0 print:m-0">
        <AppTopbar
          activeTab={activeTab}
          onOpenMobile={() => setMobileOpen(true)}
          onPrint={onPrint}
        />

        <main className="flex-1 p-3.5 sm:p-5 md:p-7 lg:p-8 max-w-7xl w-full mx-auto print:p-0 print:m-0 print:max-w-none">
          {children}
        </main>
      </div>
    </div>
  );
}
