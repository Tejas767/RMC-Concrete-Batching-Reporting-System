/**
 * shared.jsx — Shared helpers for the admin feature components.
 */

// ── Subscription preset options ───────────────────────────────
export const PRESETS = [
  { label: "1 Month", days: 30 },
  { label: "3 Months", days: 90 },
  { label: "6 Months", days: 180 },
  { label: "1 Year", days: 365 },
];

// ── Shared input class ────────────────────────────────────────
export const inputCls =
  "w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm focus:border-brand-1 focus:outline-none focus:ring-2 focus:ring-brand-1/20 transition-colors";

// ── Reusable form field wrapper ───────────────────────────────
export function Field({ label, required, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-muted">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

// ── Small action button ───────────────────────────────────────
export function ActionBtn({ onClick, color, icon, label, full }) {
  const colors = {
    emerald: "border-emerald-200 text-emerald-700 hover:bg-emerald-50",
    amber: "border-amber-200 text-amber-700 hover:bg-amber-50",
    red: "border-red-200 text-red-600 hover:bg-red-50",
  };
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${colors[color]} ${full ? "flex-1" : ""}`}
    >
      {icon}{label}
    </button>
  );
}

// ── Helpers ───────────────────────────────────────────────────
export function daysColor(days) {
  if (days === null) return "text-brand-1 bg-brand-1/10";
  if (days <= 5) return "text-red-600 bg-red-50";
  if (days <= 15) return "text-amber-600 bg-amber-50";
  return "text-emerald-700 bg-emerald-50";
}

export function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
