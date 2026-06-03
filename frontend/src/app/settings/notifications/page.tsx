"use client";
import { useState } from "react";

function Toggle({ label, description, value, onChange }:
  { label: string; description: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between py-4 border-b border-[#1a1a1a] last:border-0">
      <div>
        <p className="text-sm text-white">{label}</p>
        <p className="text-xs text-[#444] mt-0.5">{description}</p>
      </div>
      <button type="button" onClick={() => onChange(!value)}
        className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ml-6 mt-0.5 ${value ? "bg-white" : "bg-[#2a2a2a]"}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${value ? "left-5.5 bg-black" : "left-0.5 bg-[#555]"}`}
          style={{ left: value ? "22px" : "2px" }} />
      </button>
    </div>
  );
}

export default function NotificationsPage() {
  const [prefs, setPrefs] = useState({
    build_complete:   true,
    build_failed:     true,
    weekly_summary:   false,
    product_updates:  true,
  });
  const [saved, setSaved] = useState(false);

  const toggle = (k: keyof typeof prefs) => (v: boolean) => setPrefs(p => ({ ...p, [k]: v }));

  function save() { setSaved(true); setTimeout(() => setSaved(false), 2000); }

  return (
    <div className="max-w-2xl mx-auto px-8 py-10">
      <h1 className="text-lg font-semibold text-white mb-1">Notifications</h1>
      <p className="text-sm text-[#444] mb-8">Control which notifications you receive.</p>

      <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-[15px] px-5 mb-6">
        <Toggle label="Build complete"   description="Notify when a project finishes building"   value={prefs.build_complete}  onChange={toggle("build_complete")} />
        <Toggle label="Build failed"     description="Notify when a build encounters an error"   value={prefs.build_failed}    onChange={toggle("build_failed")} />
        <Toggle label="Weekly summary"   description="Weekly digest of your projects' activity"  value={prefs.weekly_summary}  onChange={toggle("weekly_summary")} />
        <Toggle label="Product updates"  description="New features and improvements to CodeMax"  value={prefs.product_updates} onChange={toggle("product_updates")} />
      </div>

      <div className="flex justify-end">
        <button onClick={save}
          className={`px-5 py-2 rounded-[10px] text-sm font-medium transition-all ${saved ? "bg-green-600/20 text-green-400 border border-green-600/30" : "bg-white hover:bg-gray-100 text-black"}`}>
          {saved ? "Saved" : "Save preferences"}
        </button>
      </div>
    </div>
  );
}
