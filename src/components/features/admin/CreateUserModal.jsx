"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, AlertCircle, Eye, EyeOff } from "lucide-react";
import { PRESETS, inputCls, Field } from "./shared";

/**
 * CreateUserModal — Modal form for creating a new operator user.
 */
export function CreateUserModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ username: "", password: "", displayName: "", subscriptionDays: 30, notes: "" });
  const [custom, setCustom] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create user");
      onCreated(data.data);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md rounded-3xl bg-white p-8 shadow-card-lg">
        <h2 className="text-xl font-semibold text-brand-1 mb-6 flex items-center gap-2"><Plus size={18} /> Create Operator</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <Field label="Username" required>
            <input required value={form.username} onChange={e => set("username", e.target.value)}
              placeholder="e.g. john_operator" className={inputCls} />
          </Field>
          {/* Display Name */}
          <Field label="Display Name">
            <input value={form.displayName} onChange={e => set("displayName", e.target.value)}
              placeholder="e.g. John Doe" className={inputCls} />
          </Field>
          {/* Password */}
          <Field label="Password" required>
            <div className="relative">
              <input
                required
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={e => set("password", e.target.value)}
                placeholder="Min. 6 characters"
                className={`${inputCls} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-brand-1 transition-colors"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </Field>
          {/* Subscription */}
          <Field label="Subscription Period">
            <div className="flex flex-wrap gap-2 mb-2">
              {PRESETS.map(p => (
                <button type="button" key={p.days}
                  onClick={() => { set("subscriptionDays", p.days); setCustom(false); }}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${form.subscriptionDays === p.days && !custom
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
              <input type="number" min="1" value={form.subscriptionDays}
                onChange={e => set("subscriptionDays", Number(e.target.value))}
                placeholder="Enter days" className={inputCls} />
            )}
            <p className="text-xs text-muted mt-1">Account expires in <strong>{form.subscriptionDays} days</strong></p>
          </Field>
          {/* Notes */}
          <Field label="Notes (optional)">
            <input value={form.notes} onChange={e => set("notes", e.target.value)}
              placeholder="Any notes about this user" className={inputCls} />
          </Field>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600 border border-red-100"
            >
              <AlertCircle size={16} />
              {error}
            </motion.div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold text-stone-600 hover:bg-surface transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 rounded-xl bg-brand-1 py-3 text-sm font-semibold text-white hover:bg-brand-1/90 disabled:opacity-60 transition-colors">
              {loading ? "Creating…" : "Create User"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
