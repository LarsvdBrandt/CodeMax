"use client";
import { useEffect, useState } from "react";
import { getMe, updateMe, type UserProfile } from "@/lib/api";

function initials(u: UserProfile | null) {
  if (u?.full_name) return u.full_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return u?.email?.[0].toUpperCase() ?? "?";
}

function Field({ label, value, onChange, placeholder, type = "text", readOnly = false }:
  { label: string; value: string; onChange?: (v: string) => void; placeholder?: string; type?: string; readOnly?: boolean }) {
  return (
    <div>
      <label className="block text-xs text-[#555] mb-1.5">{label}</label>
      <input type={type} value={value} readOnly={readOnly}
        onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#111] border border-[#1e1e1e] rounded-[10px] px-4 py-2.5 text-sm text-white placeholder-[#2e2e2e] focus:outline-none focus:border-[#333] read-only:opacity-50 read-only:cursor-not-allowed transition-colors" />
    </div>
  );
}

export default function ProfilePage() {
  const [user,    setUser]    = useState<UserProfile | null>(null);
  const [form,    setForm]    = useState({ full_name: "", bio: "" });
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState("");

  useEffect(() => {
    getMe().then(u => { setUser(u); setForm({ full_name: u.full_name ?? "", bio: u.bio ?? "" }); }).catch(() => {});
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setError(""); setSaving(true);
    try {
      const u = await updateMe(form);
      setUser(u); setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch { setError("Failed to save"); }
    finally { setSaving(false); }
  }

  return (
    <div className="max-w-2xl mx-auto px-8 py-10">
      {/* Avatar */}
      <div className="flex items-center gap-5 mb-10 p-5 bg-[#0d0d0d] border border-[#1e1e1e] rounded-[15px]">
        <div className="w-14 h-14 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] flex items-center justify-center text-xl font-semibold text-white flex-shrink-0">
          {initials(user)}
        </div>
        <div>
          <p className="text-white font-medium">{user?.full_name || "—"}</p>
          <p className="text-sm text-[#444]">{user?.email}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        <Field label="Full name" value={form.full_name} onChange={v => setForm(f => ({ ...f, full_name: v }))} placeholder="Lars van den Brandt" />
        <Field label="Email address" value={user?.email ?? ""} readOnly />

        <div>
          <label className="block text-xs text-[#555] mb-1.5">Bio</label>
          <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
            rows={3} placeholder="A short bio..."
            className="w-full bg-[#111] border border-[#1e1e1e] rounded-[10px] px-4 py-2.5 text-sm text-white placeholder-[#2e2e2e] focus:outline-none focus:border-[#333] resize-none transition-colors" />
        </div>

        {error && <p className="text-red-400 text-xs">{error}</p>}
        <div className="flex justify-end">
          <button type="submit" disabled={saving}
            className={`px-5 py-2 rounded-[10px] text-sm font-medium transition-all ${saved ? "bg-green-600/20 text-green-400 border border-green-600/30" : "bg-white hover:bg-gray-100 text-black disabled:opacity-50"}`}>
            {saving ? "Saving..." : saved ? "Saved" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
