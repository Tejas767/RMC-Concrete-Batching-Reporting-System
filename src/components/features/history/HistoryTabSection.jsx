"use client";

import { BatchHistoryFilters } from "./BatchHistoryFilters";
import { BatchHistoryTable } from "./BatchHistoryTable";

/**
 * HistoryTabSection — Modularized History Tab view for the Operator Dashboard.
 */
export function HistoryTabSection({
  filteredHistory,
  historyQuery,
  setHistoryQuery,
  historyFrom,
  setHistoryFrom,
  historyTo,
  setHistoryTo,
  loadHistory,
  setHistoryDetails,
  setDeleteId,
  setShowClearAll,
  setToday,
  setLast7Days,
  setThisMonth,
  clearFilters,
  exportToCSV,
  isExporting,
  totalCount,
  totalPages,
  currentPage,
  prevPage,
  nextPage,
}) {
  return (
    <div className="md:mx-auto md:max-w-5xl rounded-2xl md:rounded-3xl border border-border bg-white p-4 md:p-8 shadow-card space-y-5 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg md:text-xl font-semibold text-brand-1">Batch History</h2>
          <p className="mt-1 text-xs md:text-sm text-muted">Showing recent printed batches</p>
        </div>
        <button
          onClick={loadHistory}
          className="rounded-full border border-brand-1 bg-brand-1 px-3 md:px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white hover:bg-brand-1/90 transition-colors"
        >
          Refresh
        </button>
      </div>

      <BatchHistoryFilters
        query={historyQuery}
        onQueryChange={setHistoryQuery}
        dateFrom={historyFrom}
        onDateFromChange={setHistoryFrom}
        dateTo={historyTo}
        onDateToChange={setHistoryTo}
        onToday={setToday}
        onLast7Days={setLast7Days}
        onThisMonth={setThisMonth}
        onClear={clearFilters}
        onClearAll={() => setShowClearAll(true)}
        onExport={exportToCSV}
        isLoadingExport={isExporting}
        resultCount={totalCount}
      />

      <BatchHistoryTable
        rows={filteredHistory}
        onViewDetails={setHistoryDetails}
        onDeleteDetails={setDeleteId}
      />

      {/* ── Pagination Controls ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <p className="text-xs text-muted">
            Showing <span className="font-semibold text-foreground">{filteredHistory.length}</span> of{" "}
            <span className="font-semibold text-foreground">{totalCount.toLocaleString()}</span> records
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={prevPage}
              disabled={currentPage <= 1}
              className="rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold text-stone-600 hover:border-brand-1 hover:text-brand-1 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Prev
            </button>
            <span className="text-xs font-semibold text-stone-700">
              Page {currentPage} / {totalPages}
            </span>
            <button
              onClick={nextPage}
              disabled={currentPage >= totalPages}
              className="rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold text-stone-600 hover:border-brand-1 hover:text-brand-1 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
