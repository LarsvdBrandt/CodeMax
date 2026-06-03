"use client";
import { useEffect, useState } from "react";
import { listApiKeys, createApiKey, deleteApiKey, type ApiKey } from "@/lib/api";

const SERVICES = ["OpenAI","Anthropic","Google","Stripe","Twilio","SendGrid","Custom"];

export default function ApiKeysPage() {
  const [keys,    setKeys]    = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding,  setAdding]  = useState(false);
  const [form,    setForm]    = useState({ name: "", service: "Custom", key_value: "" });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  useEffect(() => {
    listApiKeys().then(setKeys).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault(); setError(""); setSaving(true);
    try {
      const k = await createApiKey(form.name, form.service, form.key_value);
      setKeys(ks => [k, ...ks]);
      setForm({ name: "", service: "Custom", key_value: "" });
      setAdding(false);
    } catch { setError("Failed to add key"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this API key?")) return;
    await deleteApiKey(id).catch(() => {});
    setKeys(ks => ks.filter(k => k.id !== id));
  }

  return (
    <div className="max-w-2xl mx-auto px-8 py-10">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-lg font-semibold text-white mb-1">API Keys</h1>
          <p className="text-sm text-[#444]">Store external API keys that your built apps can reference.</p>
        </div>
        <button onClick={() => setAdding(a => !a)}
          className="bg-white hover:bg-gray-100 text-black text-sm font-medium px-4 py-2 rounded-[10px] transition-colors flex-shrink-0">
          {adding ? "Cancel" : "+ Add key"}
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <form onSubmit={handleAdd} className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-[15px] p-5 mb-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#555] mb-1.5">Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="My OpenAI key" required
                className="w-full bg-[#111] border border-[#1e1e1e] rounded-[10px] px-4 py-2.5 text-sm text-white placeholder-[#2e2e2e] focus:outline-none focus:border-[#333] transition-colors" />
            </div>
            <div>
              <label className="block text-xs text-[#555] mb-1.5">Service</label>
              <select value={form.service} onChange={e => setForm(f => ({ ...f, service: e.target.value }))}
                className="w-full bg-[#111] border border-[#1e1e1e] rounded-[10px] px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#333] transition-colors">
                {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-[#555] mb-1.5">API Key value</label>
            <input type="password" value={form.key_value} onChange={e => setForm(f => ({ ...f, key_value: e.target.value }))}
              placeholder="sk-..." required
              className="w-full bg-[#111] border border-[#1e1e1e] rounded-[10px] px-4 py-2.5 text-sm text-white placeholder-[#2e2e2e] focus:outline-none focus:border-[#333] font-mono transition-colors" />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <div className="flex justify-end">
            <button type="submit" disabled={saving}
              className="bg-white hover:bg-gray-100 disabled:opacity-50 text-black text-sm font-medium px-5 py-2 rounded-[10px] transition-colors">
              {saving ? "Saving..." : "Add key"}
            </button>
          </div>
        </form>
      )}

      {/* Keys list */}
      {loading ? (
        <p className="text-[#333] text-sm">Loading...</p>
      ) : keys.length === 0 ? (
        <div className="text-center py-16 text-[#2a2a2a]">
          <svg className="w-8 h-8 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
          <p className="text-sm">No API keys yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map(k => (
            <div key={k.id} className="flex items-center justify-between bg-[#0d0d0d] border border-[#1e1e1e] rounded-[12px] px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-[8px] bg-[#1a1a1a] border border-[#222] flex items-center justify-center text-[10px] font-bold text-[#555] flex-shrink-0">
                  {k.service[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">{k.name}</p>
                  <p className="text-xs text-[#444] font-mono">{k.key_preview}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                <span className="text-[10px] text-[#333] border border-[#1e1e1e] rounded-full px-2 py-0.5">{k.service}</span>
                <button onClick={() => handleDelete(k.id)}
                  className="text-[#333] hover:text-red-400 transition-colors p-1 rounded-[6px] hover:bg-[#1a1a1a]">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
