"use client";
import { useEffect, useState } from "react";
import { getMe, updateMe, type UserProfile } from "@/lib/api";

function Field({ label, value, onChange, placeholder }:
  { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs text-[#555] mb-1.5">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-[#111] border border-[#1e1e1e] rounded-[10px] px-4 py-2.5 text-sm text-white placeholder-[#2e2e2e] focus:outline-none focus:border-[#333] transition-colors" />
    </div>
  );
}

type F = { company_name: string; company_address: string; company_city: string; company_country: string; website: string };

export default function CompanyPage() {
  const [form,   setForm]   = useState<F>({ company_name:"", company_address:"", company_city:"", company_country:"", website:"" });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState("");

  useEffect(() => {
    getMe().then((u: UserProfile) => setForm({
      company_name:    u.company_name    ?? "",
      company_address: u.company_address ?? "",
      company_city:    u.company_city    ?? "",
      company_country: u.company_country ?? "",
      website:         u.website         ?? "",
    })).catch(() => {});
  }, []);

  const set = (k: keyof F) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setError(""); setSaving(true);
    try { await updateMe(form); setSaved(true); setTimeout(() => setSaved(false), 2000); }
    catch { setError("Failed to save"); }
    finally { setSaving(false); }
  }

  return (
    <div className="max-w-2xl mx-auto px-8 py-10">
      <h1 className="text-lg font-semibold text-white mb-1">Company information</h1>
      <p className="text-sm text-[#444] mb-8">Used when generating business apps and proposals.</p>

      <form onSubmit={handleSave} className="space-y-5">
        <Field label="Company name"    value={form.company_name}    onChange={set("company_name")}    placeholder="Acme Inc." />
        <Field label="Street address"  value={form.company_address} onChange={set("company_address")} placeholder="123 Main St" />
        <div className="grid grid-cols-2 gap-4">
          <Field label="City"    value={form.company_city}    onChange={set("company_city")}    placeholder="Amsterdam" />
          <Field label="Country" value={form.company_country} onChange={set("company_country")} placeholder="Netherlands" />
        </div>
        <Field label="Website" value={form.website} onChange={set("website")} placeholder="https://example.com" />

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
