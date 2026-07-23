/**
 * ==============================================================================
 * CUSTOM HOOK: useBatchHistory
 * ==============================================================================
 * PURPOSE:
 *  Manages all batch history state, server-side pagination, search queries,
 *  date filters, CRUD operations, and streaming CSV file exports.
 *
 * ARCHITECTURAL DESIGN (Interview Talking Points):
 *  1. Server-Side Pagination: Loads records in chunks of 50 per page. This
 *     ensures browser memory remains light even if the database contains 100,000+ entries.
 *
 *  2. Search Debouncing: Implements a 500ms debounce timer via `useRef` when user
 *     types in search filters. This prevents sending an HTTP request on every single keystroke.
 *
 *  3. Blob-Based Streaming File Downloads: CSV export fetches a binary `Blob`
 *     from the backend streaming endpoint and triggers an automated browser download link.
 * ==============================================================================
 */

"use client";

import { useState, useCallback, useEffect, useRef } from "react";

const PAGE_SIZE = 50;

export function useBatchHistory() {
  // Main records state
  const [history, setHistory]               = useState([]);
  const [loading, setLoading]               = useState(false);
  const [isExporting, setIsExporting]       = useState(false);
  const [historyQuery, setHistoryQuery]     = useState("");
  const [historyFrom, setHistoryFrom]       = useState("");
  const [historyTo, setHistoryTo]           = useState("");
  const [historyDetails, setHistoryDetails] = useState(null);

  // Pagination state tracking
  const [currentPage, setCurrentPage]       = useState(1);
  const [totalPages, setTotalPages]         = useState(1);
  const [totalCount, setTotalCount]         = useState(0);

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Fetch Paginated Records from API (/api/history)
  // ──────────────────────────────────────────────────────────────────────────
  const loadHistory = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (historyFrom)         params.set("from",   historyFrom);
      if (historyTo)           params.set("to",     historyTo);
      if (historyQuery.trim()) params.set("search", historyQuery);
      params.set("page",  String(page));
      params.set("limit", String(PAGE_SIZE));

      const res  = await fetch(`/api/history?${params.toString()}`);
      const json = await res.json();

      setHistory(json.data || []);

      // Update pagination state from server response
      if (json.pagination) {
        setCurrentPage(json.pagination.page);
        setTotalPages(json.pagination.totalPages);
        setTotalCount(json.pagination.total);
      }
    } catch (err) {
      console.error("loadHistory error:", err);
    } finally {
      setLoading(false);
    }
  }, [historyFrom, historyTo, historyQuery]);

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Debounce Search & Filter Input Changes (500ms Delay)
  // ──────────────────────────────────────────────────────────────────────────
  const debounceTimer = useRef(null);
  useEffect(() => {
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setCurrentPage(1);
      loadHistory(1);
    }, 500);
    return () => clearTimeout(debounceTimer.current);
  }, [historyFrom, historyTo, historyQuery, loadHistory]);

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Pagination Controls (Page Navigation)
  // ──────────────────────────────────────────────────────────────────────────
  const goToPage = useCallback((page) => {
    setCurrentPage(page);
    loadHistory(page);
  }, [loadHistory]);

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) goToPage(currentPage + 1);
  }, [currentPage, totalPages, goToPage]);

  const prevPage = useCallback(() => {
    if (currentPage > 1) goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Save Batch Record (POST request)
  // ──────────────────────────────────────────────────────────────────────────
  const saveToHistory = useCallback(async (data) => {
    try {
      const res = await fetch("/api/history", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ item: data }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to save history");
      }
      return await res.json();
    } catch (err) {
      throw err;
    }
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Delete Single Record (DELETE request with ID)
  // ──────────────────────────────────────────────────────────────────────────
  const deleteFromHistory = useCallback(async (id) => {
    try {
      await fetch(`/api/history?id=${id}`, { method: "DELETE" });
      setHistory((prev) => prev.filter((row) => String(row.id) !== String(id)));
      setHistoryDetails((d) => (d && String(d.id) === String(id) ? null : d));
      setTotalCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error("deleteFromHistory error:", err);
    }
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // 6. Bulk Delete All History (DELETE request with all=true)
  // ──────────────────────────────────────────────────────────────────────────
  const clearAllHistory = useCallback(async () => {
    try {
      await fetch("/api/history?all=true", { method: "DELETE" });
      setHistory([]);
      setTotalCount(0);
      setCurrentPage(1);
      setTotalPages(1);
    } catch (err) {
      console.error("clearAllHistory error:", err);
    }
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // 7. Preset Date Filters (Today, Last 7 Days, This Month)
  // ──────────────────────────────────────────────────────────────────────────
  const setToday = useCallback(() => {
    const v = new Date().toISOString().slice(0, 10);
    setHistoryFrom(v);
    setHistoryTo(v);
  }, []);

  const setLast7Days = useCallback(() => {
    const end   = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 6);
    setHistoryFrom(start.toISOString().slice(0, 10));
    setHistoryTo(end.toISOString().slice(0, 10));
  }, []);

  const setThisMonth = useCallback(() => {
    const now   = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setHistoryFrom(start.toISOString().slice(0, 10));
    setHistoryTo(end.toISOString().slice(0, 10));
  }, []);

  const clearFilters = useCallback(() => {
    setHistoryQuery("");
    setHistoryFrom("");
    setHistoryTo("");
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // 8. Stream CSV Export File Download
  // ──────────────────────────────────────────────────────────────────────────
  const exportToCSV = useCallback(async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (historyFrom)         params.set("from",   historyFrom);
      if (historyTo)           params.set("to",     historyTo);
      if (historyQuery.trim()) params.set("search", historyQuery);

      const res = await fetch(`/api/history/export?${params.toString()}`);
      
      if (!res.ok) {
        alert("Export failed. Please try again.");
        return;
      }

      const blob = await res.blob();
      if (blob.size < 50) {
        alert("No records to export.");
        return;
      }

      // Create object URL for blob download
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Batch_History_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("exportToCSV error:", err);
    } finally {
      setIsExporting(false);
    }
  }, [historyFrom, historyTo, historyQuery]);

  const filteredHistory = history;

  return {
    history,
    filteredHistory,
    loading,
    historyQuery,    setHistoryQuery,
    historyFrom,     setHistoryFrom,
    historyTo,       setHistoryTo,
    historyDetails,  setHistoryDetails,
    currentPage,
    totalPages,
    totalCount,
    goToPage,
    nextPage,
    prevPage,
    loadHistory: () => loadHistory(currentPage),
    saveToHistory,
    clearAllHistory,
    deleteFromHistory,
    setToday,
    setLast7Days,
    setThisMonth,
    clearFilters,
    exportToCSV,
    isExporting,
  };
}
