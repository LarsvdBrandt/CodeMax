"use client";
import { useState, useEffect, useCallback } from "react";
import {
  listBranches, createBranch, listCommits,
  listPullRequests, createPullRequest, approvePullRequest, rejectPullRequest,
  startBranchPreview, stopBranchPreview,
  type ProjectBranch, type ProjectCommit, type ProjectPullRequest,
} from "@/lib/api";

// ── Branch colors ─────────────────────────────────────────────────────────────
const COLORS = ["#9ca3af","#818cf8","#22d3ee","#c084fc","#fb923c","#4ade80","#f87171","#facc15"];

function branchColor(branches: ProjectBranch[], id: string): string {
  const sorted = [...branches].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
  const idx = sorted.findIndex(b => b.id === id);
  return COLORS[Math.max(idx, 0) % COLORS.length];
}

function fmtDate(d: string) {
  const now = Date.now(), t = new Date(d).getTime(), diff = now - t;
  if (diff < 60000)  return "just now";
  if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff/86400000)}d ago`;
  return new Date(d).toLocaleDateString("en", { month: "short", day: "numeric" });
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface Props {
  projectId: string;
  myRole: string;
  activeBranchId: string | null;
  onCheckout: (branch: ProjectBranch) => void;
  onClose: () => void;
  onTaskCreated?: (taskId: string) => void;
}

// ── Commit graph column (SVG lane) ────────────────────────────────────────────
function CommitDot({ color, isHead, isLast }: { color: string; isHead: boolean; isLast: boolean }) {
  return (
    <div className="flex flex-col items-center w-5 flex-shrink-0">
      <div
        className="w-3 h-3 rounded-full border-2 flex-shrink-0 z-10"
        style={{ borderColor: color, backgroundColor: isHead ? color : "transparent", boxShadow: isHead ? `0 0 8px ${color}66` : undefined }}
      />
      {!isLast && <div className="w-px flex-1 min-h-[2rem]" style={{ backgroundColor: color + "55" }} />}
    </div>
  );
}

// ── Branch tree node ──────────────────────────────────────────────────────────
function BranchNode({
  branch, branches, depth, selected, checkedOut,
  onSelect, commitCounts,
}: {
  branch: ProjectBranch;
  branches: ProjectBranch[];
  depth: number;
  selected: boolean;
  checkedOut: boolean;
  onSelect: () => void;
  commitCounts: Record<string, number>;
}) {
  const color = branchColor(branches, branch.id);
  const children = branches.filter(b => b.parent_branch_id === branch.id);
  const count = commitCounts[branch.id] ?? 0;

  return (
    <div>
      <button
        onClick={onSelect}
        className={`w-full text-left flex items-center gap-2 px-3 py-2 transition-colors ${selected ? "bg-[#1a1a1a]" : "hover:bg-[#111]"}`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        {/* Tree connector */}
        {depth > 0 && (
          <div className="flex-shrink-0 relative -ml-4 mr-1 flex items-center">
            <div className="w-3 h-px" style={{ backgroundColor: color + "66" }} />
          </div>
        )}
        {/* Branch dot */}
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-1" style={{ backgroundColor: color + "33", borderColor: color, outline: `1px solid ${color}` }} />
        {/* Name + badges */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-white truncate font-mono">{branch.name}</span>
            {branch.name === "main" && <span className="text-[9px] text-[#555] uppercase">trunk</span>}
            {checkedOut && (
              <span className="text-[9px] px-1 rounded" style={{ backgroundColor: color + "22", color }}>HEAD</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-[10px] ${branch.status === "merged" ? "text-green-500" : branch.status === "rejected" ? "text-red-500" : "text-[#444]"}`}>
              {branch.status}
            </span>
            {count > 0 && <span className="text-[10px] text-[#333]">{count} commit{count !== 1 ? "s" : ""}</span>}
          </div>
        </div>
      </button>

      {/* Children */}
      {children.length > 0 && (
        <div className="relative">
          <div className="absolute top-0 bottom-0 w-px" style={{ left: `${16 + depth * 16}px`, backgroundColor: color + "33" }} />
          {children.map(child => (
            <BranchNode
              key={child.id}
              branch={child}
              branches={branches}
              depth={depth + 1}
              selected={false}
              checkedOut={false}
              onSelect={() => {}}
              commitCounts={commitCounts}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────
export default function VersionHistoryModal({
  projectId, myRole, activeBranchId, onCheckout, onClose, onTaskCreated,
}: Props) {
  const [branches,       setBranches]       = useState<ProjectBranch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<ProjectBranch | null>(null);
  const [commits,        setCommits]        = useState<ProjectCommit[]>([]);
  const [prs,            setPrs]            = useState<ProjectPullRequest[]>([]);
  const [tab,            setTab]            = useState<"commits" | "prs">("commits");
  const [loading,        setLoading]        = useState(true);
  const [commitCounts,   setCommitCounts]   = useState<Record<string, number>>({});
  const [previewLoading, setPreviewLoading] = useState(false);

  // Forms
  const [showNewBranch,  setShowNewBranch]  = useState(false);
  const [newBranchName,  setNewBranchName]  = useState("");
  const [showMergeForm,  setShowMergeForm]  = useState(false);
  const [mergeTitle,     setMergeTitle]     = useState("");
  const [mergeDesc,      setMergeDesc]      = useState("");

  const canMaintain = ["owner", "admin", "maintainer"].includes(myRole);
  const canApprove  = ["owner", "admin"].includes(myRole);

  // Load branches + commit counts
  const loadBranches = useCallback(async () => {
    setLoading(true);
    try {
      const bs = await listBranches(projectId);
      setBranches(bs);
      if (bs.length > 0 && !selectedBranch) {
        setSelectedBranch(bs.find(b => b.name === "main") ?? bs[0]);
      }
      // Load commit counts for all branches in parallel (lightweight)
      const counts: Record<string, number> = {};
      await Promise.all(bs.map(async b => {
        try {
          const cs = await listCommits(projectId, b.id);
          counts[b.id] = cs.length;
        } catch { counts[b.id] = 0; }
      }));
      setCommitCounts(counts);
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedBranch]);

  useEffect(() => { loadBranches(); }, []);

  useEffect(() => {
    if (!selectedBranch) return;
    listCommits(projectId, selectedBranch.id).then(setCommits).catch(() => setCommits([]));
  }, [selectedBranch, projectId]);

  useEffect(() => {
    if (tab === "prs") listPullRequests(projectId).then(setPrs).catch(() => setPrs([]));
  }, [tab, projectId]);

  async function handleCreateBranch(e: React.FormEvent) {
    e.preventDefault();
    if (!newBranchName.trim() || !selectedBranch) return;
    await createBranch(projectId, newBranchName.trim(), selectedBranch.id).catch(console.error);
    setNewBranchName(""); setShowNewBranch(false);
    loadBranches();
  }

  async function handleRequestMerge(e: React.FormEvent) {
    e.preventDefault();
    if (!mergeTitle.trim() || !selectedBranch) return;
    const mainBranch = branches.find(b => b.name === "main");
    if (!mainBranch) return;
    await createPullRequest(projectId, selectedBranch.id, mainBranch.id, mergeTitle.trim(), mergeDesc).catch(console.error);
    setMergeTitle(""); setMergeDesc(""); setShowMergeForm(false);
    setTab("prs");
    listPullRequests(projectId).then(setPrs);
  }

  async function handlePreview(branch: ProjectBranch) {
    setPreviewLoading(true);
    try {
      if (branch.container_id) {
        await stopBranchPreview(projectId, branch.id);
      } else {
        const updated = await startBranchPreview(projectId, branch.id);
        if (updated.preview_port) window.open(`http://localhost:${updated.preview_port}`, "_blank");
      }
      loadBranches();
    } catch (e) { console.error(e); }
    finally { setPreviewLoading(false); }
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

  const color = selectedBranch ? branchColor(branches, selectedBranch.id) : "#9ca3af";
  const isMain = selectedBranch?.name === "main";
  const isCheckedOut = selectedBranch?.id === activeBranchId;
  const rootBranches = branches.filter(b => !b.parent_branch_id);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-5xl h-[88vh] bg-[#0a0a0a] border border-[#1e1e1e] rounded-[16px] overflow-hidden shadow-2xl flex flex-col">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#1e1e1e] shrink-0">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-[#555]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 3v12m0 0a3 3 0 100 6 3 3 0 000-6zm0 0c3.314 0 6-2.686 6-6V9m0 0a3 3 0 100-6 3 3 0 000 6z" />
              </svg>
              <span className="text-sm font-semibold text-white">Version History</span>
              {activeBranchId && (
                <span className="text-xs text-[#555] flex items-center gap-1">
                  · on
                  <span className="font-mono" style={{ color: branchColor(branches, activeBranchId) }}>
                    {branches.find(b => b.id === activeBranchId)?.name ?? "…"}
                  </span>
                </span>
              )}
            </div>
            <button onClick={onClose} className="p-1.5 rounded-[8px] text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden">

            {/* ── Left: branch tree ────────────────────────────────────────── */}
            <div className="w-60 border-r border-[#1e1e1e] flex flex-col overflow-hidden bg-[#080808]">
              <div className="flex items-center justify-between px-3 py-2 border-b border-[#1e1e1e]">
                <span className="text-[10px] font-semibold text-[#444] uppercase tracking-widest">Branches</span>
                {canMaintain && (
                  <button onClick={() => setShowNewBranch(v => !v)} className="text-xs text-[#444] hover:text-white transition-colors px-1" title="New branch">+</button>
                )}
              </div>

              {showNewBranch && selectedBranch && (
                <form onSubmit={handleCreateBranch} className="p-2 border-b border-[#1e1e1e] space-y-1.5">
                  <input
                    autoFocus value={newBranchName}
                    onChange={e => setNewBranchName(e.target.value)}
                    placeholder={`from ${selectedBranch.name}`}
                    className="w-full bg-[#111] border border-[#222] rounded-[6px] px-2 py-1 text-xs text-white placeholder-[#333] focus:outline-none font-mono"
                  />
                  <div className="flex gap-1">
                    <button type="submit" className="flex-1 text-xs py-1 bg-white text-black rounded-[6px] font-medium">Create</button>
                    <button type="button" onClick={() => setShowNewBranch(false)} className="flex-1 text-xs py-1 bg-[#1a1a1a] text-[#666] rounded-[6px]">Cancel</button>
                  </div>
                </form>
              )}

              {/* Branch tree */}
              <div className="flex-1 overflow-y-auto py-1">
                {loading ? (
                  <p className="text-xs text-[#444] p-4">Loading…</p>
                ) : (
                  rootBranches.map(branch => {
                    const children = branches.filter(b => b.parent_branch_id === branch.id);
                    const bColor = branchColor(branches, branch.id);
                    return (
                      <div key={branch.id}>
                        {/* Root branch row */}
                        <button
                          onClick={() => { setSelectedBranch(branch); setShowMergeForm(false); }}
                          className={`w-full text-left flex items-center gap-2 px-3 py-2.5 transition-colors ${selectedBranch?.id === branch.id ? "bg-[#1a1a1a]" : "hover:bg-[#0f0f0f]"}`}
                        >
                          <div className="flex flex-col items-center w-4 flex-shrink-0">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: selectedBranch?.id === branch.id ? bColor : bColor + "55", border: `1.5px solid ${bColor}`, boxShadow: selectedBranch?.id === branch.id ? `0 0 6px ${bColor}66` : undefined }} />
                            {children.length > 0 && <div className="w-px flex-1 min-h-[8px] mt-0.5" style={{ backgroundColor: bColor + "33" }} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-mono text-white truncate">{branch.name}</span>
                              {branch.id === activeBranchId && (
                                <span className="text-[9px] px-1 rounded-sm font-medium" style={{ backgroundColor: bColor + "22", color: bColor }}>HEAD</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-[#333]">{commitCounts[branch.id] ?? 0} commits</span>
                            </div>
                          </div>
                        </button>

                        {/* Child branches */}
                        {children.map((child, ci) => {
                          const cColor = branchColor(branches, child.id);
                          const isLast = ci === children.length - 1;
                          return (
                            <div key={child.id} className="flex">
                              {/* Connector from parent */}
                              <div className="w-[28px] flex-shrink-0 flex flex-col items-center pt-0">
                                <div className="flex items-center" style={{ height: "36px" }}>
                                  <div className="w-px h-full" style={{ backgroundColor: bColor + "33", marginLeft: "11px" }} />
                                  <div className="w-3 h-px" style={{ backgroundColor: cColor + "55" }} />
                                </div>
                                {!isLast && <div className="w-px flex-1" style={{ backgroundColor: bColor + "33", marginLeft: "-17px" }} />}
                              </div>
                              <button
                                onClick={() => { setSelectedBranch(child); setShowMergeForm(false); }}
                                className={`flex-1 text-left flex items-center gap-2 pr-3 py-2 transition-colors ${selectedBranch?.id === child.id ? "bg-[#1a1a1a]" : "hover:bg-[#0f0f0f]"}`}
                              >
                                <div className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: selectedBranch?.id === child.id ? cColor : cColor + "44", border: `1.5px solid ${cColor}`, boxShadow: selectedBranch?.id === child.id ? `0 0 5px ${cColor}55` : undefined }} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`text-xs font-mono truncate ${child.status === "merged" ? "text-[#444] line-through" : child.status === "rejected" ? "text-[#444]" : "text-white"}`}>{child.name}</span>
                                    {child.id === activeBranchId && (
                                      <span className="text-[9px] px-1 rounded-sm font-medium" style={{ backgroundColor: cColor + "22", color: cColor }}>HEAD</span>
                                    )}
                                    {child.status !== "active" && (
                                      <span className={`text-[9px] ${child.status === "merged" ? "text-green-600" : "text-red-700"}`}>{child.status}</span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-[#333]">{commitCounts[child.id] ?? 0} commits</span>
                                </div>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Branch actions */}
              {selectedBranch && (
                <div className="p-2 border-t border-[#1e1e1e] space-y-1.5">
                  {canMaintain && (
                    <button
                      onClick={() => onCheckout(selectedBranch)}
                      className={`w-full text-xs py-1.5 rounded-[6px] font-medium transition-colors flex items-center justify-center gap-1.5 ${isCheckedOut ? "bg-[#1a1a1a] text-[#555] cursor-default" : "text-white hover:opacity-90"}`}
                      style={!isCheckedOut ? { backgroundColor: color + "22", borderColor: color + "55", border: `1px solid ${color}55`, color } : undefined}
                      disabled={isCheckedOut}
                    >
                      {isCheckedOut ? "✓ Checked out" : "Checkout"}
                    </button>
                  )}
                  {isCheckedOut && !isMain && canMaintain && !showMergeForm && (
                    <button
                      onClick={() => { setMergeTitle(`Merge ${selectedBranch.name} → main`); setShowMergeForm(true); setTab("prs"); }}
                      className="w-full text-xs py-1.5 rounded-[6px] font-medium transition-colors text-white bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center gap-1.5"
                    >
                      <span>→</span> Request Merge
                    </button>
                  )}
                  {!isMain && canMaintain && (
                    <button
                      onClick={() => handlePreview(selectedBranch)}
                      disabled={previewLoading}
                      className={`w-full text-xs py-1.5 rounded-[6px] transition-colors disabled:opacity-40 ${selectedBranch.container_id ? "text-red-400 bg-red-500/5 border border-red-500/15 hover:bg-red-500/10" : "text-[#555] bg-[#111] border border-[#1a1a1a] hover:text-white"}`}
                    >
                      {previewLoading ? "…" : selectedBranch.container_id ? "Stop Preview" : "Start Preview"}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* ── Right: commits / PRs ─────────────────────────────────────── */}
            <div className="flex-1 flex flex-col overflow-hidden">

              {/* Tabs */}
              <div className="flex items-center px-4 py-2 border-b border-[#1e1e1e] gap-1 shrink-0">
                {(["commits", "prs"] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`px-3 py-1 rounded-[8px] text-xs font-medium transition-colors ${tab === t ? "bg-[#1a1a1a] text-white" : "text-[#444] hover:text-[#888]"}`}>
                    {t === "commits" ? "Commits" : "Merge Requests"}
                    {t === "prs" && prs.filter(p => p.status === "open").length > 0 && (
                      <span className="ml-1.5 px-1 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-[10px]">
                        {prs.filter(p => p.status === "open").length}
                      </span>
                    )}
                  </button>
                ))}
                {selectedBranch && (
                  <div className="ml-3 flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-xs font-mono text-[#555]">{selectedBranch.name}</span>
                  </div>
                )}
              </div>

              {/* Commits tab — git graph */}
              {tab === "commits" && (
                <div className="flex-1 overflow-y-auto">
                  {commits.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 gap-2">
                      <p className="text-xs text-[#333]">No commits yet on this branch.</p>
                    </div>
                  ) : (
                    <div className="px-5 py-4">
                      {commits.map((commit, i) => {
                        const isHead = i === 0;
                        const isLast = i === commits.length - 1;
                        return (
                          <div key={commit.id} className="flex gap-3 group">
                            <CommitDot color={color} isHead={isHead} isLast={isLast} />
                            <div className={`flex-1 pb-4 ${!isLast ? "border-b border-[#0d0d0d]" : ""}`}>
                              <div className="flex items-start justify-between gap-2 pt-0.5">
                                <div className="min-w-0">
                                  <p className="text-sm text-white leading-snug">{commit.message || "Agent edit"}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] text-[#333]">{fmtDate(commit.created_at)}</span>
                                    <span className="text-[10px] font-mono text-[#222]">{commit.id.slice(0, 7)}</span>
                                    {isHead && (
                                      <span className="text-[10px] px-1 rounded" style={{ backgroundColor: color + "22", color }}>
                                        {selectedBranch?.name === "main" ? "HEAD" : "tip"}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {/* Branch root indicator */}
                      {selectedBranch && selectedBranch.name !== "main" && (
                        <div className="flex gap-3 mt-1">
                          <div className="w-5 flex-shrink-0 flex flex-col items-center">
                            <div className="w-px h-4" style={{ backgroundColor: color + "33" }} />
                            <div className="w-3 h-px" style={{ backgroundColor: "#555" }} />
                          </div>
                          <div className="pb-2">
                            <p className="text-[11px] text-[#333] pt-1 font-mono">forked from main</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* PRs / Merge Requests tab */}
              {tab === "prs" && (
                <div className="flex-1 overflow-y-auto p-4 space-y-3">

                  {/* Merge request form */}
                  {showMergeForm && selectedBranch && !isMain && (
                    <form onSubmit={handleRequestMerge} className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-[12px] p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-xs font-mono text-[#666]">{selectedBranch.name}</span>
                        <span className="text-xs text-[#333]">→ main</span>
                      </div>
                      <input
                        autoFocus value={mergeTitle}
                        onChange={e => setMergeTitle(e.target.value)}
                        placeholder="Title"
                        className="w-full bg-[#111] border border-[#222] rounded-[8px] px-3 py-2 text-sm text-white placeholder-[#333] focus:outline-none"
                      />
                      <textarea
                        value={mergeDesc}
                        onChange={e => setMergeDesc(e.target.value)}
                        placeholder="Description (optional)"
                        rows={2}
                        className="w-full bg-[#111] border border-[#222] rounded-[8px] px-3 py-2 text-sm text-white placeholder-[#333] focus:outline-none resize-none"
                      />
                      <div className="flex gap-2">
                        <button type="submit" className="flex-1 py-2 bg-white text-black text-xs font-semibold rounded-[8px]">Open Merge Request</button>
                        <button type="button" onClick={() => setShowMergeForm(false)} className="flex-1 py-2 bg-[#1a1a1a] text-[#666] text-xs rounded-[8px]">Cancel</button>
                      </div>
                    </form>
                  )}

                  {/* New request button for non-form case */}
                  {canMaintain && !showMergeForm && (
                    <div className="flex justify-end">
                      <button
                        onClick={() => { setMergeTitle(selectedBranch && !isMain ? `Merge ${selectedBranch.name} → main` : ""); setShowMergeForm(true); }}
                        className="text-xs text-[#444] hover:text-white transition-colors"
                      >
                        + New Request
                      </button>
                    </div>
                  )}

                  {prs.length === 0 && !showMergeForm ? (
                    <p className="text-xs text-[#333]">No merge requests yet.</p>
                  ) : prs.map(pr => {
                    const srcBranch = branches.find(b => b.id === pr.source_branch_id);
                    const srcColor  = srcBranch ? branchColor(branches, srcBranch.id) : "#555";
                    return (
                      <div key={pr.id} className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-[12px] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${pr.status === "approved" ? "bg-green-500/15 text-green-400" : pr.status === "rejected" ? "bg-red-500/15 text-red-400" : "bg-yellow-500/15 text-yellow-400"}`}>
                                {pr.status}
                              </span>
                              <span className="text-sm font-medium text-white truncate">{pr.title}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-[#333]">
                              <span className="font-mono" style={{ color: srcColor }}>{srcBranch?.name ?? "?"}</span>
                              <span>→</span>
                              <span className="font-mono text-[#555]">main</span>
                              <span className="ml-2">{fmtDate(pr.created_at)}</span>
                            </div>
                            {pr.description && <p className="text-xs text-[#444] mt-1.5 line-clamp-2">{pr.description}</p>}
                          </div>
                          {pr.status === "open" && canApprove && (
                            <div className="flex gap-2 shrink-0">
                              <button onClick={() => handleApprove(pr.id)} className="px-3 py-1.5 bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium rounded-[8px] hover:bg-green-500/20 transition-colors">
                                Approve
                              </button>
                              <button onClick={() => handleReject(pr.id)} className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium rounded-[8px] hover:bg-red-500/20 transition-colors">
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
