/**
 * page.jsx — Operator Dashboard Orchestrator (src/app/(operator)/page.jsx)
 *
 * Route: /
 * Route Group: (operator)
 *
 * This file is a thin orchestrator that:
 *  1. Wires custom domain logic hooks
 *  2. Handles auth and role guards
 *  3. Renders layout shell + tab navigation
 *  4. Passes props down into isolated feature components
 */
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

// Layout
import { PageShell } from "@/components/layout/PageShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { TabNav } from "@/components/layout/TabNav";

// Feature components
import { BatchEntryForm } from "@/components/features/entry/BatchEntryForm";
import { MixDesignEditor } from "@/components/features/mix-design/MixDesignEditor";
import { AutographicReport, HiddenPrintReport } from "@/components/features/report/AutographicReport";
import { BillingTabSection } from "@/components/features/report/BillingTabSection";
import { HistoryTabSection } from "@/components/features/history/HistoryTabSection";
import { BatchDetailModal } from "@/components/features/history/BatchDetailModal";
import { CustomerManager } from "@/components/features/customers/CustomerManager";
import { VehicleManager } from "@/components/features/vehicles/VehicleManager";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

// Hooks
import { useSession } from "@/hooks/useSession";
import { useMixDesign } from "@/hooks/useMixDesign";
import { useBatchEntry } from "@/hooks/useBatchEntry";
import { useBatchHistory } from "@/hooks/useBatchHistory";
import { useReportData } from "@/hooks/useReportData";
import { useCustomers } from "@/hooks/useCustomers";
import { useVehicles } from "@/hooks/useVehicles";

// Constants
import { initialMixDesign } from "@/constants/mixConfig";

/* ── Tab content animation ───────────────────── */
const tabVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

export default function OperatorDashboard() {
  const { user, isLoaded, isSignedIn } = useSession({
    redirectTo: "/login",
    requireRole: "operator",
  });
  const [activeTab, setActiveTab] = useState("ENTRY");

  // Restore active tab from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("activeTab");
      if (saved) setActiveTab(saved);
    }
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      localStorage.setItem("activeTab", tab);
    }
  };

  const [deleteId, setDeleteId] = useState(null);
  const [showClearAll, setShowClearAll] = useState(false);
  const [lastBatch, setLastBatch] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // ── Data / Logic hooks ──────────────────────
  const {
    mixDesign, batchSize, setBatchSize, differences, updateDifference, syncMessage,
    saveMixDesign, updateCell, resetMixDesign,
  } = useMixDesign();

  const { entry, updateField, resetForm } = useBatchEntry(user);

  const {
    customers, addCustomer, deleteCustomer, deleteAllCustomers, loading: customersLoading,
  } = useCustomers();

  const {
    vehicles, addVehicle, deleteVehicle, deleteAllVehicles, loading: vehiclesLoading,
  } = useVehicles();

  const {
    filteredHistory, historyQuery, setHistoryQuery,
    historyFrom, setHistoryFrom, historyTo, setHistoryTo,
    historyDetails, setHistoryDetails,
    loadHistory, saveToHistory, clearAllHistory, deleteFromHistory,
    setToday, setLast7Days, setThisMonth, clearFilters, exportToCSV, isExporting,
    currentPage, totalPages, totalCount, nextPage, prevPage,
  } = useBatchHistory();

  // Targets = mix design row for the currently selected grade
  const targets = mixDesign[entry.grade] || mixDesign.M15 || initialMixDesign.M15;

  // Report data computed deterministically from entry + targets
  const reportData = useReportData(entry, targets, batchSize, differences);

  // ── Field update wrapper ──────────────────────
  const handleUpdateField = (key, value) => {
    updateField(key, value);
    if (lastBatch) {
      setLastBatch((prev) => (prev ? { ...prev, [key]: value } : null));
    }
  };

  // ── Handlers ──────────────────────────────────
  const handleStartBatch = (e) => {
    e.preventDefault();
    if (!entry.docketNo || !entry.customerName || !entry.grade || !entry.qty) {
      toast.error("Please fill all required fields");
    }
  };

  const handleViewLastReport = () => {
    if (filteredHistory && filteredHistory.length > 0) {
      setLastBatch(filteredHistory[0]);
    } else {
      setLastBatch(null);
    }
    setActiveTab("REPORT");
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      setTimeout(() => {
        window.print();
      }, 300);
    }
  };

  const onStopBatch = async () => {
    if (isSaving) return;
    setIsSaving(true);
    const time = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
    });

    const finalEntry = { ...entry, batchStop: time };
    const finalTargets = mixDesign[finalEntry.grade] || mixDesign.M15 || initialMixDesign.M15;

    const batchData = {
      ...finalEntry,
      mixDesign: finalTargets,
      differences,
      batchSize,
      rows: reportData.rows,
      totals: reportData.totals,
      setWeights: reportData.setWeights,
      totalBatches: reportData.totalBatches,
    };

    try {
      await saveToHistory(batchData);
      loadHistory();
      setLastBatch(batchData);
      resetForm();
      setActiveTab("REPORT");
      toast.success(`Batch #${finalEntry.docketNo} SAVED ✅`, {
        description: "Viewing report for this batch.",
      });
    } catch (error) {
      toast.error(`Error saving batch: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveToHistory = async () => {
    const dataToSave = lastBatch ? lastBatch : {
      ...entry,
      mixDesign: targets,
      batchSize,
      rows: reportData.rows,
      totals: reportData.totals,
      setWeights: reportData.setWeights,
      totalBatches: reportData.totalBatches,
    };

    try {
      await saveToHistory(dataToSave);
      loadHistory();
      toast.success(`Docket ${dataToSave.docketNo} saved successfully!`);
    } catch (error) {
      toast.error(error.message);
    }
  };

  // 1. Loading state
  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FDFCF7]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-1 border-t-transparent" />
      </div>
    );
  }

  // 2. Auth & Role Guard
  if (!isSignedIn || user?.role !== "operator") return null;

  return (
    <PageShell>
      <div className="print:hidden mx-auto w-full max-w-5xl flex flex-col md:flex-row md:items-center md:justify-between gap-6 pt-0 pb-6 md:pb-8">
        <TabNav activeTab={activeTab} onTabChange={handleTabChange} />
        <AppHeader />
      </div>

      {/* Tab content with enter/exit animations */}
      <div className={activeTab === "BILLING" ? "" : "print:hidden"}>
        <AnimatePresence mode="wait">
          <motion.section
            key={activeTab}
            variants={tabVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="mt-8"
          >
            {/* ── ENTRY TAB ─── */}
            {activeTab === "ENTRY" && (
              <div className="md:mx-auto md:max-w-5xl">
                <div className="rounded-2xl md:rounded-3xl border border-border bg-white p-5 md:p-8 shadow-card">
                  <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-lg md:text-xl font-semibold text-brand-1">Batch Entry</h2>
                    <span className="rounded-full bg-brand-1/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-brand-1">
                      ENTRY
                    </span>
                  </div>
                  <BatchEntryForm
                    entry={entry}
                    customers={customers}
                    vehicles={vehicles}
                    onUpdateField={updateField}
                    onStart={handleStartBatch}
                    onStop={onStopBatch}
                    onPrint={handleViewLastReport}
                    onSaveToHistory={handleSaveToHistory}
                  />
                </div>
              </div>
            )}

            {/* ── CUSTOMERS TAB ─── */}
            {activeTab === "CUSTOMERS" && (
              <div className="md:mx-auto md:max-w-5xl w-full">
                <CustomerManager
                  customers={customers}
                  onAdd={addCustomer}
                  onDelete={deleteCustomer}
                  onDeleteAll={deleteAllCustomers}
                  loading={customersLoading}
                />
              </div>
            )}

            {/* ── VEHICLE TAB ─── */}
            {activeTab === "VEHICLE" && (
              <div className="md:mx-auto md:max-w-5xl w-full">
                <VehicleManager
                  vehicles={vehicles}
                  onAdd={addVehicle}
                  onDelete={deleteVehicle}
                  onDeleteAll={deleteAllVehicles}
                  loading={vehiclesLoading}
                />
              </div>
            )}

            {/* ── MIX DESIGN TAB ─── */}
            {activeTab === "EDIT" && (
              <div className="md:mx-auto md:max-w-7xl">
                <MixDesignEditor
                  mixDesign={mixDesign}
                  batchSize={batchSize}
                  setBatchSize={setBatchSize}
                  differences={differences}
                  onUpdateDifference={updateDifference}
                  syncMessage={syncMessage}
                  onUpdateCell={updateCell}
                  onSave={() => saveMixDesign(mixDesign, batchSize, differences)}
                  onReset={resetMixDesign}
                />
              </div>
            )}

            {/* ── REPORT TAB ─── */}
            {activeTab === "REPORT" && (
              <div className="md:mx-auto md:max-w-5xl space-y-8">
                <AutographicReport
                  entry={lastBatch || entry}
                  targets={lastBatch?.mixDesign || targets}
                  reportData={lastBatch || reportData}
                  batchSize={lastBatch?.batchSize || batchSize}
                  onPrint={handlePrint}
                  onSaveToHistory={handleSaveToHistory}
                  onUpdateField={handleUpdateField}
                />
              </div>
            )}

            {/* ── BILLING TAB ─── */}
            {activeTab === "BILLING" && (
              <BillingTabSection entry={entry} lastBatch={lastBatch} />
            )}

            {/* ── HISTORY TAB ─── */}
            {activeTab === "HISTORY" && (
              <HistoryTabSection
                filteredHistory={filteredHistory}
                historyQuery={historyQuery}
                setHistoryQuery={setHistoryQuery}
                historyFrom={historyFrom}
                setHistoryFrom={setHistoryFrom}
                historyTo={historyTo}
                setHistoryTo={setHistoryTo}
                loadHistory={loadHistory}
                setHistoryDetails={setHistoryDetails}
                setDeleteId={setDeleteId}
                setShowClearAll={setShowClearAll}
                setToday={setToday}
                setLast7Days={setLast7Days}
                setThisMonth={setThisMonth}
                clearFilters={clearFilters}
                exportToCSV={exportToCSV}
                isExporting={isExporting}
                totalCount={totalCount}
                totalPages={totalPages}
                currentPage={currentPage}
                prevPage={prevPage}
                nextPage={nextPage}
              />
            )}
          </motion.section>
        </AnimatePresence>
      </div>

      {/* History Detail Modal */}
      <BatchDetailModal
        record={historyDetails}
        onClose={() => setHistoryDetails(null)}
        onPrint={(record) => {
          setLastBatch(record);
          setHistoryDetails(null);
          setTimeout(() => window.print(), 400);
        }}
      />

      {/* Confirmation Modals */}
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) deleteFromHistory(deleteId);
          toast.success("Batch record deleted");
        }}
        title="Delete Batch Record"
        message="Are you sure you want to permanently delete this batch record? This action cannot be undone."
        confirmText="Delete Record"
      />

      <ConfirmDialog
        open={showClearAll}
        onClose={() => setShowClearAll(false)}
        onConfirm={() => {
          clearAllHistory();
          setLastBatch(null);
          toast.success("All history deleted");
        }}
        title="Clear All History"
        message="Are you sure you want to PERMANENTLY delete all batch history? This action will erase all records and cannot be undone."
        confirmText="Delete All"
      />

      {/* Hidden Print Report */}
      {activeTab === "REPORT" && (
        <HiddenPrintReport
          entry={lastBatch || entry}
          targets={lastBatch?.mixDesign || targets}
          reportData={lastBatch || reportData}
          batchSize={lastBatch?.batchSize || batchSize}
        />
      )}
    </PageShell>
  );
}
