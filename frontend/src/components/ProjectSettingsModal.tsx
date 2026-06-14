"use client";
import { useState, useEffect } from "react";
import { renameProject, deleteProject, detectKeys, createApiKey, type Project, type MissingKey } from "@/lib/api";
import TeamContent from "./TeamContent";
import { useRouter } from "next/navigation";

interface Props {
  project: Project;
  myRole: string;
  onClose: () => void;
  onProjectUpdated: (project: Project) => void;
}

type Tab = "general" | "team" | "api-keys";

export default function ProjectSettingsModal({ project, myRole, onClose, onProjectUpdated }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("general");

  // General tab state
  const [name, setName] = useState(project.name);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");

  // API Keys tab state
  const [keysLoading, setKeysLoading] = useState(false);
  const [keysLoaded, setKeysLoaded] = useState(false);
  const [missingKeys, setMissingKeys] = useState<MissingKey[]>([]);
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});
  const [keySaving, setKeySaving] = useState<Record<string, boolean>>({});
  const [keySaved, setKeySaved] = useState<Record<string, boolean>>({});
  const [keysError, setKeysError] = useState("");

  const isOwner = myRole === "owner";

  useEffect(() => {
    if (tab === "api-keys" && !keysLoaded) {
      loadKeys();
    }
  }, [tab]);

  async function loadKeys() {
    setKeysLoading(true);
    setKeysError("");
    try {
      const result = await detectKeys(project.id, project.description);
      setMissingKeys(result.missing ?? []);
      setKeysLoaded(true);
    } catch {
      setKeysError("Could not detect required API keys. Try again.");
    } finally {
      setKeysLoading(false);
    }
  }

  async function handleSaveKey(key: MissingKey) {
    const value = keyInputs[key.env_var]?.trim();
    if (!value) return;
    setKeySaving(s => ({ ...s, [key.env_var]: true }));
    try {
      await createApiKey(key.env_var, key.service, value);
      setKeySaved(s => ({ ...s, [key.env_var]: true }));
      setMissingKeys(prev => prev.filter(k => k.env_var !== key.env_var));
    } catch {
      setKeysError(`Failed to save ${key.service} key. Try again.`);
    } finally {
      setKeySaving(s => ({ ...s, [key.env_var]: false }));
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const updated = await renameProject(project.id, name.trim());
      onProjectUpdated(updated);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteProject(project.id);
      router.replace("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete");
      setDeleting(false);
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "general", label: "General" },
    { id: "team", label: "Team" },
    { id: "api-keys", label: "API Keys" },
  ];

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-xl bg-[#0a0a0a] border border-[#1e1e1e] rounded-[16px] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e1e] shrink-0">
            <div className="text-sm font-semibold text-white">Project Settings</div>
            <button onClick={onClose} className="p-1.5 rounded-[8px] text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 px-5 py-3 border-b border-[#1e1e1e] shrink-0">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 rounded-[8px] text-xs font-medium capitalize transition-colors ${
                  tab === t.id ? "bg-[#1a1a1a] text-white" : "text-[#555] hover:text-[#888]"
                }`}
              >
                {t.label}
                {t.id === "api-keys" && keysLoaded && missingKeys.length > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 text-[9px] font-bold">
                    {missingKeys.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {/* General tab */}
            {tab === "general" && (
              <div className="space-y-6">
                <form onSubmit={handleSave} className="space-y-3">
                  <label className="block">
                    <span className="text-xs text-[#666] font-medium uppercase tracking-wider">Project Name</span>
                    <input
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="mt-2 w-full bg-[#111] border border-[#222] rounded-[10px] px-3 py-2.5 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#333] transition-colors"
                    />
                  </label>
                  {error && <p className="text-xs text-red-400">{error}</p>}
                  {isOwner && (
                    <button
                      type="submit"
                      disabled={saving || name === project.name}
                      className="px-4 py-2 bg-white text-black text-xs font-semibold rounded-[8px] hover:bg-[#e0e0e0] transition-colors disabled:opacity-40"
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  )}
                </form>

                {isOwner && (
                  <div className="border border-red-500/20 rounded-[12px] p-4 space-y-3">
                    <div className="text-xs font-semibold text-red-400 uppercase tracking-wider">Danger Zone</div>
                    <p className="text-xs text-[#555]">Permanently delete this project and all its data. This cannot be undone.</p>
                    {confirmDelete ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleDelete}
                          disabled={deleting}
                          className="px-3 py-1.5 bg-red-500 text-white text-xs font-semibold rounded-[8px] hover:bg-red-600 transition-colors disabled:opacity-40"
                        >
                          {deleting ? "Deleting..." : "Confirm Delete"}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(false)}
                          className="px-3 py-1.5 text-[#888] text-xs hover:text-white transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(true)}
                        className="px-3 py-1.5 border border-red-500/30 text-red-400 text-xs font-medium rounded-[8px] hover:bg-red-500/10 transition-colors"
                      >
                        Delete Project
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Team tab */}
            {tab === "team" && (
              <TeamContent
                projectId={project.id}
                projectName={project.name}
                myRole={myRole}
              />
            )}

            {/* API Keys tab */}
            {tab === "api-keys" && (
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-[#666] font-medium uppercase tracking-wider mb-1">Required API Keys</p>
                  <p className="text-xs text-[#444]">Keys detected as required for this project. Saved keys are used during builds.</p>
                </div>

                {keysLoading && (
                  <div className="flex items-center gap-2 text-xs text-[#555] py-4">
                    <span className="animate-spin">⟳</span> Scanning project for required keys…
                  </div>
                )}

                {keysError && (
                  <div className="flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded-[10px] px-3 py-2.5">
                    <p className="text-xs text-red-400">{keysError}</p>
                    <button onClick={loadKeys} className="text-xs text-red-400 hover:text-red-300 underline ml-3">Retry</button>
                  </div>
                )}

                {keysLoaded && !keysLoading && missingKeys.length === 0 && (
                  <div className="flex items-center gap-2.5 bg-green-500/10 border border-green-500/20 rounded-[12px] px-4 py-3">
                    <span className="text-green-400 text-base">✓</span>
                    <p className="text-xs text-green-400 font-medium">All required API keys are configured.</p>
                  </div>
                )}

                {missingKeys.map(key => (
                  <div key={key.env_var} className="bg-[#111] border border-amber-500/20 rounded-[12px] p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-amber-400 text-xs">⚠</span>
                          <span className="text-sm font-semibold text-white">{key.service}</span>
                          <span className="text-[10px] font-mono text-[#555] bg-[#1a1a1a] px-1.5 py-0.5 rounded">{key.env_var}</span>
                        </div>
                        <p className="text-xs text-[#555] mt-1">{key.description}</p>
                      </div>
                    </div>
                    {keySaved[key.env_var] ? (
                      <p className="text-xs text-green-400">✓ Key saved successfully</p>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={keyInputs[key.env_var] ?? ""}
                          onChange={e => setKeyInputs(v => ({ ...v, [key.env_var]: e.target.value }))}
                          placeholder={`Paste your ${key.service} key…`}
                          className="flex-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded-[8px] px-3 py-2 text-xs text-white placeholder-[#333] focus:outline-none focus:border-[#444] transition-colors font-mono"
                        />
                        <button
                          onClick={() => handleSaveKey(key)}
                          disabled={keySaving[key.env_var] || !keyInputs[key.env_var]?.trim()}
                          className="px-3 py-2 bg-white text-black text-xs font-semibold rounded-[8px] hover:bg-[#e0e0e0] transition-colors disabled:opacity-40 whitespace-nowrap"
                        >
                          {keySaving[key.env_var] ? "Saving…" : "Save"}
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {keysLoaded && (
                  <button
                    onClick={() => { setKeysLoaded(false); loadKeys(); }}
                    className="text-xs text-[#444] hover:text-[#888] transition-colors"
                  >
                    ↻ Rescan project
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
