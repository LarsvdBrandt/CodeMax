"use client";
import { useState, useEffect, useCallback } from "react";
import {
  listBranches, createBranch, listCommits, getCommitFiles,
  startBranchPreview, stopBranchPreview,
  listPullRequests, createPullRequest, approvePullRequest, rejectPullRequest,
  type ProjectBranch, type ProjectCommit, type ProjectCommitFile, type ProjectPullRequest,
} from "@/lib/api";

interface Props {
  projectId: string;
  myRole: string;
  onClose: () => void;
  onTaskCreated?: (taskId: string) => void;
}

type Tab = "commits" | "prs";

export default function VersionHistoryModal({ projectId, myRole, onClose, onTaskCreated }: Props) {
  const [branches, setBranches] = useState<ProjectBranch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<ProjectBranch | null>(null);
  const [commits, setCommits] = useState<ProjectCommit[]>([]);
  const [selectedCommit, setSelectedCommit] = useState<ProjectCommit | null>(null);
  const [commitFiles, setCommitFiles] = useState<ProjectCommitFile[]>([]);
  const [prs, setPrs] = useState<ProjectPullRequest[]>([]);
  const [tab, setTab] = useState<Tab>("commits");
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);

  // New branch form
  const [showNewBranch, setShowNewBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");

  // New PR form
  const [showNewPr, setShowNewPr] = useState(false);
  const [prTitle, setPrTitle] = useState("");
  const [prDesc, setPrDesc] = useState("");
  const [prSourceId, setPrSourceId] = useState("");

  const canMaintain = ["owner", "admin", "maintainer"].includes(myRole);
  const canApprove = ["owner", "admin"].includes(myRole);

  const loadBranches = useCallback(async () => {
    setLoading(true);
    try {
      const bs = await listBranches(projectId);
      setBranches(bs);
      if (!selectedBranch && bs.length > 0) {
        const main = bs.find(b => b.name === "main") ?? bs[0];
        setSelectedBranch(main);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedBranch]);

  useEffect(() => { loadBranches(); }, []);

  useEffect(() => {
    if (!selectedBranch) return;
    listCommits(projectId, selectedBranch.id).then(setCommits).catch(console.error);
    if (tab === "prs") listPullRequests(projectId).then(setPrs).catch(console.error);
  }, [selectedBranch, tab, projectId]);

  useEffect(() => {
    if (tab === "prs") listPullRequests(projectId).then(setPrs).catch(console.error);
  }, [tab, projectId]);

  async function handleSelectCommit(commit: ProjectCommit) {
    setSelectedCommit(commit);
    setCommitFiles([]);
    const files = await getCommitFiles(projectId, commit.id).catch(() => []);
    setCommitFiles(files);
  }

  async function handleCreateBranch(e: React.FormEvent) {
    e.preventDefault();
    if (!newBranchName.trim() || !selectedBranch) return;
    await createBranch(projectId, newBranchName.trim(), selectedBranch.id).catch(console.error);
    setNewBranchName("");
    setShowNewBranch(false);
    loadBranches();
  }

  async function handlePreview(branch: ProjectBranch) {
    setPreviewLoading(true);
    try {
      if (branch.container_id) {
        await stopBranchPreview(projectId, branch.id);
      } else {
        const updated = await startBranchPreview(projectId, branch.id);
        if (updated.preview_port) {
          window.open(`http://localhost:${updated.preview_port}`, "_blank");
        }
      }
      loadBranches();
    } catch (e) {
      console.error(e);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleCreatePr(e: React.FormEvent) {
    e.preventDefault();
    if (!prTitle.trim() || !prSourceId) return;
    const mainBranch = branches.find(b => b.name === "main");
    if (!mainBranch) return;
    await createPullRequest(projectId, prSourceId, mainBranch.id, prTitle.trim(), prDesc).catch(console.error);
    setPrTitle(""); setPrDesc(""); setPrSourceId(""); setShowNewPr(false);
    listPullRequests(projectId).then(setPrs);
  }

  async function handleApprove(prId: string) {
    await approvePullRequest(projectId, prId).catch(console.error);
    listPullRequests(projectId).then(setPrs);
    loadBranches();
  }

  async function handleReject(prId: string) {
    const result = await rejectPullRequest(projectId, prId).catch(() => null);
    if (result?.task?.id) onTaskCreated?.(result.task.id);
    listPullRequests(projectId).then(setPrs);
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  const statusColor = (s: string) =>
    s === "approved" ? "text-green-400" : s === "rejected" ? "text-red-400" : "text-yellow-400";

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-4xl h-[85vh] bg-[#0a0a0a] border border-[#1e1e1e] rounded-[16px] overflow-hidden shadow-2xl flex flex-col">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1e1e1e] shrink-0">
            <div className="flex items-center gap-2">
              <GitBranchIcon />
              <span className="text-sm font-semibold text-white">Version History</span>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-[8px] text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden">

            {/* Left: Branch list */}
            <div className="w-56 border-r border-[#1e1e1e] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#1e1e1e]">
                <span className="text-xs font-medium text-[#666] uppercase tracking-wider">Branches</span>
                {canMaintain && (
                  <button
                    onClick={() => setShowNewBranch(!showNewBranch)}
                    className="text-xs text-[#555] hover:text-white transition-colors font-medium"
                    title="New branch"
                  >+</button>
                )}
              </div>

              {showNewBranch && selectedBranch && (
                <form onSubmit={handleCreateBranch} className="p-2 border-b border-[#1e1e1e]">
                  <input
                    autoFocus
                    value={newBranchName}
                    onChange={e => setNewBranchName(e.target.value)}
                    placeholder="branch-name"
                    className="w-full bg-[#111] border border-[#222] rounded-[6px] px-2 py-1 text-xs text-white placeholder-[#444] focus:outline-none"
                  />
                  <div className="flex gap-1 mt-1.5">
                    <button type="submit" className="flex-1 text-xs py-1 bg-white text-black rounded-[6px] font-medium">Create</button>
                    <button type="button" onClick={() => setShowNewBranch(false)} className="flex-1 text-xs py-1 bg-[#1a1a1a] text-[#888] rounded-[6px]">Cancel</button>
                  </div>
                </form>
              )}

              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <p className="text-xs text-[#555] p-3">Loading...</p>
                ) : branches.map(branch => (
                  <button
                    key={branch.id}
                    onClick={() => { setSelectedBranch(branch); setSelectedCommit(null); setCommitFiles([]); }}
                    className={`w-full text-left px-3 py-2.5 transition-colors border-b border-[#111] ${
                      selectedBranch?.id === branch.id ? "bg-[#1a1a1a]" : "hover:bg-[#111]"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {branch.name === "main" && <span className="text-yellow-400 text-xs">★</span>}
                      <span className="text-xs text-white truncate">{branch.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[10px] ${branch.status === "merged" ? "text-green-500" : branch.status === "rejected" ? "text-red-500" : "text-[#444]"}`}>
                        {branch.status}
                      </span>
                      {branch.container_id && (
                        <span className="text-[10px] text-green-400">● live</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Branch preview button */}
              {selectedBranch && selectedBranch.name !== "main" && canMaintain && (
                <div className="p-2 border-t border-[#1e1e1e]">
                  <button
                    onClick={() => handlePreview(selectedBranch)}
                    disabled={previewLoading}
                    className={`w-full text-xs py-1.5 rounded-[6px] font-medium transition-colors disabled:opacity-40 ${
                      selectedBranch.container_id
                        ? "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
                        : "bg-white/5 text-white border border-[#2a2a2a] hover:bg-white/10"
                    }`}
                  >
                    {previewLoading ? "..." : selectedBranch.container_id ? "Stop Preview" : "Start Preview"}
                  </button>
                </div>
              )}
            </div>

            {/* Right: content */}
            <div className="flex-1 flex flex-col overflow-hidden">

              {/* Tabs */}
              <div className="flex items-center gap-1 px-4 py-2.5 border-b border-[#1e1e1e] shrink-0">
                {(["commits", "prs"] as Tab[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`px-3 py-1 rounded-[8px] text-xs font-medium transition-colors ${
                      tab === t ? "bg-[#1a1a1a] text-white" : "text-[#555] hover:text-[#888]"
                    }`}
                  >
                    {t === "commits" ? "Commits" : "Feature Requests"}
                    {t === "prs" && prs.filter(p => p.status === "open").length > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-[10px]">
                        {prs.filter(p => p.status === "open").length}
                      </span>
                    )}
                  </button>
                ))}
                {tab === "prs" && canMaintain && (
                  <button
                    onClick={() => setShowNewPr(!showNewPr)}
                    className="ml-auto text-xs text-[#555] hover:text-white transition-colors"
                  >
                    + New Request
                  </button>
                )}
              </div>

              {tab === "commits" && (
                <div className="flex flex-1 overflow-hidden">
                  {/* Commit list */}
                  <div className="w-64 border-r border-[#1e1e1e] overflow-y-auto">
                    {commits.length === 0 ? (
                      <p className="text-xs text-[#555] p-4">No commits yet on this branch.</p>
                    ) : commits.map((commit, i) => (
                      <button
                        key={commit.id}
                        onClick={() => handleSelectCommit(commit)}
                        className={`w-full text-left px-4 py-3 border-b border-[#111] transition-colors ${
                          selectedCommit?.id === commit.id ? "bg-[#1a1a1a]" : "hover:bg-[#0d0d0d]"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div className="flex flex-col items-center mt-1">
                            <div className="w-2 h-2 rounded-full bg-[#333] border border-[#555]" />
                            {i < commits.length - 1 && <div className="w-px h-full bg-[#1e1e1e] mt-1 min-h-[16px]" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-white truncate">{commit.message || "Agent edit"}</p>
                            <p className="text-[10px] text-[#555] mt-0.5">{formatDate(commit.created_at)}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* File viewer */}
                  <div className="flex-1 overflow-y-auto p-4">
                    {!selectedCommit ? (
                      <p className="text-xs text-[#555]">Select a commit to view files.</p>
                    ) : commitFiles.length === 0 ? (
                      <p className="text-xs text-[#555]">Loading files...</p>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-xs text-[#666] font-medium">{commitFiles.length} files in this commit</p>
                        {commitFiles.map(file => (
                          <div key={file.id} className="border border-[#1e1e1e] rounded-[10px] overflow-hidden">
                            <div className="px-3 py-2 bg-[#111] border-b border-[#1e1e1e]">
                              <span className="text-xs font-mono text-[#888]">{file.file_path}</span>
                            </div>
                            <pre className="px-3 py-2 text-[11px] text-[#666] overflow-x-auto max-h-40 font-mono leading-relaxed">
                              {file.content.slice(0, 500)}{file.content.length > 500 ? "\n..." : ""}
                            </pre>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {tab === "prs" && (
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {/* New PR form */}
                  {showNewPr && (
                    <form onSubmit={handleCreatePr} className="bg-[#111] border border-[#1e1e1e] rounded-[12px] p-4 space-y-3">
                      <p className="text-xs font-medium text-white">New Feature Request</p>
                      <select
                        value={prSourceId}
                        onChange={e => setPrSourceId(e.target.value)}
                        className="w-full bg-[#0d0d0d] border border-[#222] rounded-[8px] px-3 py-2 text-sm text-white focus:outline-none"
                      >
                        <option value="">Select source branch…</option>
                        {branches.filter(b => b.name !== "main" && b.status === "active").map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                      <input
                        value={prTitle}
                        onChange={e => setPrTitle(e.target.value)}
                        placeholder="Feature request title"
                        className="w-full bg-[#0d0d0d] border border-[#222] rounded-[8px] px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none"
                      />
                      <textarea
                        value={prDesc}
                        onChange={e => setPrDesc(e.target.value)}
                        placeholder="Description (optional)"
                        rows={2}
                        className="w-full bg-[#0d0d0d] border border-[#222] rounded-[8px] px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none resize-none"
                      />
                      <div className="flex gap-2">
                        <button type="submit" className="flex-1 py-2 bg-white text-black text-xs font-semibold rounded-[8px]">Create</button>
                        <button type="button" onClick={() => setShowNewPr(false)} className="flex-1 py-2 bg-[#1a1a1a] text-[#888] text-xs rounded-[8px]">Cancel</button>
                      </div>
                    </form>
                  )}

                  {prs.length === 0 ? (
                    <p className="text-xs text-[#555]">No feature requests yet.</p>
                  ) : prs.map(pr => (
                    <div key={pr.id} className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-[12px] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-semibold uppercase tracking-wider ${statusColor(pr.status)}`}>
                              {pr.status}
                            </span>
                            <span className="text-sm font-medium text-white truncate">{pr.title}</span>
                          </div>
                          {pr.description && (
                            <p className="text-xs text-[#555] mt-1 line-clamp-2">{pr.description}</p>
                          )}
                          <p className="text-[10px] text-[#444] mt-2">{formatDate(pr.created_at)}</p>
                        </div>
                        {pr.status === "open" && canApprove && (
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => handleApprove(pr.id)}
                              className="px-3 py-1.5 bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium rounded-[8px] hover:bg-green-500/20 transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(pr.id)}
                              className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium rounded-[8px] hover:bg-red-500/20 transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function GitBranchIcon() {
  return (
    <svg className="w-4 h-4 text-[#666]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M6 3v12m0 0a3 3 0 100 6 3 3 0 000-6zm0 0c3.314 0 6-2.686 6-6V9m0 0a3 3 0 100-6 3 3 0 000 6z" />
    </svg>
  );
}
