"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays } from "lucide-react";
import { PRESETS, inputCls } from "./shared";

/**
 * RenewModal — Modal for managing (add/set) a user's subscription days.
 */
export function RenewModal({ user, onClose, onRenewed }) {
  const [days, setDays] = useState(30);
  const [mode, setMode] = useState("add"); // "add" or "set"
  const [custom, setCustom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRenew = async () => {
    setError(""); setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/renew`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days, mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      onRenewed(data.data);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-card-lg">
        <h2 className="text-xl font-semibold text-brand-1 mb-1 flex items-center gap-2"><CalendarDays size={18} /> Manage Subscription</h2>
        <p className="text-sm text-muted mb-6">User: <strong>{user.username}</strong></p>

        {/* Mode Toggle */}
        <div className="flex p-1 bg-surface rounded-xl mb-6 border border-border">
          <button onClick={() => setMode("add")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${mode === "add" ? "bg-white text-brand-1 shadow-sm border border-border" : "text-muted hover:text-brand-1"}`}>
            Add Days
          </button>
          <button onClick={() => setMode("set")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${mode === "set" ? "bg-white text-brand-1 shadow-sm border border-border" : "text-muted hover:text-brand-1"}`}>
            Set Total Days
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {PRESETS.map(p => (
            <button key={p.days} type="button"
              onClick={() => { setDays(p.days); setCustom(false); }}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${days === p.days && !custom
                  ? "border-brand-1 bg-brand-1 text-white"
                  : "border-border text-stone-600 hover:border-brand-1"}`}>
              {p.label}
            </button>
          ))}
          <button type="button" onClick={() => setCustom(true)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${custom ? "border-brand-1 bg-brand-1 text-white" : "border-border text-stone-600 hover:border-brand-1"}`}>
            Custom
          </button>
        </div>
        {custom && (
          <input type="number" min="0" value={days} onChange={e => setDays(Number(e.target.value))}
            placeholder="Enter days" className={`${inputCls} mb-3`} />
        )}

        <p className="text-xs text-muted mb-6">
          {mode === "add"
            ? `Extending existing subscription by adding `
            : `Overriding total remaining time to `}
          <strong>{days} days</strong>.
        </p>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2 mb-3">{error}</p>}

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold text-stone-600 hover:bg-surface transition-colors">
            Cancel
          </button>
          <button onClick={handleRenew} disabled={loading}
            className={`flex-1 rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-60 transition-colors ${mode === "add" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-brand-1 hover:bg-brand-1/90"}`}>
            {loading ? "Updating…" : mode === "add" ? `Add ${days} Days` : `Set to ${days} Days`}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
