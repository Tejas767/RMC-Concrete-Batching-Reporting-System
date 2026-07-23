"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Plus, ToggleLeft, ToggleRight, RefreshCw,
  KeyRound, Trash2, CalendarDays, Shield, LogOut
} from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useSession } from "@/hooks/useSession";

// Admin feature components
import { CreateUserModal } from "@/components/features/admin/CreateUserModal";
import { RenewModal } from "@/components/features/admin/RenewModal";
import { ResetPasswordModal } from "@/components/features/admin/ResetPasswordModal";
import { ActionBtn, daysColor, formatDate } from "@/components/features/admin/shared";

/**
 * AdminPage — User Management Dashboard (src/app/(admin)/admin/page.jsx)
 *
 * Route: /admin
 * Route Group: (admin)
 */
export default function AdminPage() {
  const { user, isLoaded, isSignedIn } = useSession({ 
    redirectTo: "/login",
    requireRole: "admin"
  });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [renewUser, setRenewUser] = useState(null);
  const [resetUser, setResetUser] = useState(null);
  const [deleteUser, setDeleteUser] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const isAdmin = isSignedIn && user?.role === "admin";

  const loadUsers = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      setUsers(data.data || []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleToggle = async (user) => {
    setTogglingId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isActive: data.data.isActive } : u));
      }
    } finally {
      setTogglingId(null);
    }
  };

  const executeDelete = async () => {
    if (!deleteUser) return;
    await fetch(`/api/admin/users/${deleteUser.id}`, { method: "DELETE" });
    setUsers(prev => prev.filter(u => u.id !== deleteUser.id));
    setDeleteUser(null);
  };

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FDFCF7]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-1 border-t-transparent" />
      </div>
    );
  }

  if (!isSignedIn || user?.role !== "admin") {
    return null;
  }

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  const activeCount = users.filter(u => u.isActive).length;
  const expiringSoon = users.filter(u => u.daysRemaining !== null && u.daysRemaining <= 7 && u.daysRemaining > 0).length;
  const expired = users.filter(u => u.daysRemaining !== null && u.daysRemaining === 0).length;

  return (
    <main className="min-h-screen bg-[#FDFCF7]">
      {/* Header */}
      <header className="border-b border-border bg-white px-4 md:px-10 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-1">
            <Shield size={18} className="text-[#f1b24a]" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">Admin Panel</p>
            <h1 className="text-lg font-semibold text-brand-1 leading-tight">User Management</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors">
            <LogOut size={13} /> Logout
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 md:px-10 py-8 space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Operators", value: users.length, color: "text-brand-1", bg: "bg-brand-1/10" },
            { label: "Active Accounts", value: activeCount, color: "text-emerald-700", bg: "bg-emerald-50" },
            { label: "Expiring Soon", value: expiringSoon, color: "text-amber-600", bg: "bg-amber-50" },
            { label: "Expired", value: expired, color: "text-red-600", bg: "bg-red-50" },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl border border-border ${s.bg} p-5`}>
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted mt-1 font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        {/* User List Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-brand-1">Operators</h2>
          <div className="flex gap-2">
            <button onClick={loadUsers}
              className="flex items-center gap-1.5 rounded-full border border-border bg-white px-4 py-2 text-xs font-semibold text-stone-600 hover:border-brand-1 transition-colors">
              <RefreshCw size={13} /> Refresh
            </button>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 rounded-full bg-brand-1 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-1/90 transition-colors">
              <Plus size={13} /> New User
            </button>
          </div>
        </div>

        {/* User Cards / Table */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-1 border-t-transparent" />
          </div>
        ) : users.length === 0 ? (
          <div className="rounded-2xl border border-border bg-white p-12 text-center text-muted">
            No operators yet. Click <strong>New User</strong> to create one.
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto rounded-2xl border border-border bg-white">
              <table className="min-w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr className="bg-brand-1 text-white text-left">
                    {["User", "Status", "Subscription", "Expires", "Actions"].map((h, i) => (
                      <th key={h} className={`px-5 py-3.5 text-xs font-semibold uppercase tracking-widest ${i === 0 ? "rounded-tl-xl" : ""} ${i === 4 ? "rounded-tr-xl text-center" : ""}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, idx) => (
                    <motion.tr key={user.id}
                      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
                      className={idx % 2 === 0 ? "bg-white" : "bg-surface"}>
                      <td className="border-b border-border px-5 py-3.5">
                        <p className="font-semibold text-brand-1">{user.username}</p>
                        <p className="text-xs text-muted">{user.displayName || "—"}</p>
                      </td>
                      <td className="border-b border-border px-5 py-3.5">
                        <button onClick={() => handleToggle(user)} disabled={togglingId === user.id}
                          className="flex items-center gap-1.5 transition-opacity disabled:opacity-50">
                          {user.isActive
                            ? <ToggleRight size={26} className="text-emerald-500" />
                            : <ToggleLeft size={26} className="text-stone-300" />}
                          <span className={`text-xs font-semibold ${user.isActive ? "text-emerald-600" : "text-stone-400"}`}>
                            {user.isActive ? "Active" : "Disabled"}
                          </span>
                        </button>
                      </td>
                      <td className="border-b border-border px-5 py-3.5">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${daysColor(user.daysRemaining)}`}>
                          {user.daysRemaining === null ? "No expiry" : user.daysRemaining === 0 ? "Expired" : `${user.daysRemaining} days left`}
                        </span>
                      </td>
                      <td className="border-b border-border px-5 py-3.5 text-xs text-muted">
                        {formatDate(user.expiresAt)}
                      </td>
                      <td className="border-b border-border px-5 py-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <ActionBtn onClick={() => setRenewUser(user)} color="emerald" icon={<CalendarDays size={12} />} label="Renew" />
                          <ActionBtn onClick={() => setResetUser(user)} color="amber" icon={<KeyRound size={12} />} label="Reset PW" />
                          <ActionBtn onClick={() => setDeleteUser(user)} color="red" icon={<Trash2 size={12} />} label="Delete" />
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden flex flex-col gap-3">
              {users.map((user, idx) => (
                <motion.div key={user.id}
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
                  className="rounded-2xl border border-border bg-white p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-brand-1">{user.username}</p>
                      <p className="text-xs text-muted">{user.displayName || "—"}</p>
                    </div>
                    <button onClick={() => handleToggle(user)} disabled={togglingId === user.id}
                      className="flex items-center gap-1 disabled:opacity-50">
                      {user.isActive ? <ToggleRight size={28} className="text-emerald-500" /> : <ToggleLeft size={28} className="text-stone-300" />}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${daysColor(user.daysRemaining)}`}>
                      {user.daysRemaining === null ? "No expiry" : user.daysRemaining === 0 ? "Expired" : `${user.daysRemaining} days left`}
                    </span>
                    <span className="text-xs text-muted">Expires: {formatDate(user.expiresAt)}</span>
                  </div>
                  <div className="flex gap-2 pt-1 border-t border-border">
                    <ActionBtn onClick={() => setRenewUser(user)} color="emerald" icon={<CalendarDays size={12} />} label="Renew" full />
                    <ActionBtn onClick={() => setResetUser(user)} color="amber" icon={<KeyRound size={12} />} label="Reset PW" full />
                    <ActionBtn onClick={() => setDeleteUser(user)} color="red" icon={<Trash2 size={12} />} label="Delete" full />
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence mode="wait">
        {showCreate && (
          <CreateUserModal
            key="create-modal"
            onClose={() => setShowCreate(false)}
            onCreated={(u) => { setUsers(prev => [u, ...prev]); setShowCreate(false); loadUsers(); }}
          />
        )}
        {renewUser && (
          <RenewModal
            key="renew-modal"
            user={renewUser}
            onClose={() => setRenewUser(null)}
            onRenewed={() => { setRenewUser(null); loadUsers(); }}
          />
        )}
        {resetUser && (
          <ResetPasswordModal
            key="reset-modal"
            user={resetUser}
            onClose={() => setResetUser(null)}
          />
        )}

        {deleteUser && (
          <ConfirmDialog
            key="delete-modal"
            open={!!deleteUser}
            onClose={() => setDeleteUser(null)}
            onConfirm={executeDelete}
            title="Delete Operator?"
            message={`Are you sure you want to delete "${deleteUser?.username}"? This will PERMANENTLY erase all their batch records and history. This action cannot be undone.`}
            confirmText="Delete User & History"
            variant="danger"
          />
        )}
      </AnimatePresence>
    </main>
  );
}
