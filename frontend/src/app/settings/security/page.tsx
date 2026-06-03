"use client";
import { useState } from "react";
import { changePassword } from "@/lib/api";

export default function SecurityPage() {
  const [form,   setForm]   = useState({ current_password: "", new_password: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setError("");
    if (form.new_password !== form.confirm) { setError("Passwords don't match"); return; }
    if (form.new_password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setSaving(true);
    try {
      await changePassword(form.current_password, form.new_password);
      setForm({ current_password: "", new_password: "", confirm: "" });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to change password");
    } finally { setSaving(false); }
  }

  const inp = "w-full bg-[#111] border border-[#1e1e1e] rounded-[10px] px-4 py-2.5 text-sm text-white placeholder-[#2e2e2e] focus:outline-none focus:border-[#333] transition-colors";

  return (
    <div className="max-w-2xl mx-auto px-8 py-10">
      <h1 className="text-lg font-semibold text-white mb-1">Security</h1>
      <p className="text-sm text-[#444] mb-8">Update your password to keep your account secure.</p>

      <form onSubmit={handleSave} className="space-y-5">
        <div>
          <label className="block text-xs text-[#555] mb-1.5">Current password</label>
          <input type="password" value={form.current_password} onChange={e => setForm(f => ({ ...f, current_password: e.target.value }))} required className={inp} />
        </div>
        <div>
          <label className="block text-xs text-[#555] mb-1.5">New password</label>
          <input type="password" value={form.new_password} onChange={e => setForm(f => ({ ...f, new_password: e.target.value }))} required className={inp} />
        </div>
        <div>
          <label className="block text-xs text-[#555] mb-1.5">Confirm new password</label>
          <input type="password" value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} required className={inp} />
        </div>

        {error && <p className="text-red-400 text-xs">{error}</p>}
        <div className="flex justify-end">
          <button type="submit" disabled={saving}
            className={`px-5 py-2 rounded-[10px] text-sm font-medium transition-all ${saved ? "bg-green-600/20 text-green-400 border border-green-600/30" : "bg-white hover:bg-gray-100 text-black disabled:opacity-50"}`}>
            {saving ? "Saving..." : saved ? "Password updated" : "Update password"}
          </button>
        </div>
      </form>
    </div>
  );
}
