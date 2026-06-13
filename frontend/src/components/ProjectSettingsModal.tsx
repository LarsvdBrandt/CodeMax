"use client";
import { useState } from "react";
import { renameProject, deleteProject, type Project } from "@/lib/api";
import TeamContent from "./TeamContent";
import { useRouter } from "next/navigation";

interface Props {
  project: Project;
  myRole: string;
  onClose: () => void;
  onProjectUpdated: (project: Project) => void;
}

type Tab = "general" | "team";

export default function ProjectSettingsModal({ project, myRole, onClose, onProjectUpdated }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("general");
  const [name, setName] = useState(project.name);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");

  const isOwner = myRole === "owner";

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
            {(["general", "team"] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-[8px] text-xs font-medium capitalize transition-colors ${
                  tab === t ? "bg-[#1a1a1a] text-white" : "text-[#555] hover:text-[#888]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-5">
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

            {tab === "team" && (
              <TeamContent
                projectId={project.id}
                projectName={project.name}
                myRole={myRole}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
