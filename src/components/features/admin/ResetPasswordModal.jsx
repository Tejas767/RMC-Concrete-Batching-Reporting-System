"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { KeyRound, AlertCircle, Eye, EyeOff } from "lucide-react";
import { inputCls } from "./shared";

/**
 * ResetPasswordModal — Modal for resetting a user's password.
 */
export function ResetPasswordModal({ user, onClose }) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleReset = async () => {
    if (!password || password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setError(""); setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setSuccess(true);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-card-lg">
        <h2 className="text-xl font-semibold text-brand-1 mb-1 flex items-center gap-2"><KeyRound size={18} /> Reset Password</h2>
        <p className="text-sm text-muted mb-6">User: <strong>{user.username}</strong></p>
        {success ? (
          <div className="text-center py-4">
            <p className="text-emerald-600 font-semibold text-lg mb-2">✅ Password Reset!</p>
            <p className="text-sm text-muted mb-4">The user can now log in with the new password.</p>
            <button onClick={onClose} className="rounded-xl bg-brand-1 px-6 py-2.5 text-sm font-semibold text-white">Done</button>
          </div>
        ) : (
          <>
            <div className="relative mb-3">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
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
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600 border border-red-100 mb-4"
              >
                <AlertCircle size={16} />
                {error}
              </motion.div>
            )}
            <div className="flex gap-3">
              <button onClick={onClose}
                className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold text-stone-600 hover:bg-surface transition-colors">
                Cancel
              </button>
              <button onClick={handleReset} disabled={loading}
                className="flex-1 rounded-xl bg-brand-1 py-3 text-sm font-semibold text-white hover:bg-brand-1/90 disabled:opacity-60 transition-colors">
                {loading ? "Saving…" : "Reset"}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
