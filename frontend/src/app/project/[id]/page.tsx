"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  getProject, getProjectStatus, listFiles, listTasks, sendPrompt, retryProject,
  stopPreview, startPreview, getPreviewLogs, ApiError,
  type Project, type ProjectFile, type ProjectStatus, type TaskRecord,
} from "@/lib/api";
import FileTree from "@/components/FileTree";

// ─── Icons ────────────────────────────────────────────────────────────────────
const Icon = ({ d, size = 4 }: { d: string; size?: number }) => (
  <svg className={`w-${size} h-${size}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={d} />
  </svg>
);
const EyeIcon    = () => <Icon d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />;
const CodeIcon   = () => <Icon d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />;
const DesktopIcon= () => <Icon d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />;
const MobileIcon = () => <Icon d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />;
const RefreshIcon= () => <Icon d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />;
const SendIcon   = () => <Icon d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />;
const ExternalIcon=() => <Icon d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />;
const BackIcon   = () => <Icon d="M15 19l-7-7 7-7" />;
const FileIcon   = () => <Icon d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />;

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg className={`w-3 h-3 transition-transform duration-150 ${open ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

// ─── Build animation ──────────────────────────────────────────────────────────
const CODE_LINES = [
  { text: "import { useState } from 'react';", color: "#6b9bd2" },
  { text: "import Head from 'next/head';", color: "#6b9bd2" },
  { text: "", color: "" },
  { text: "export default function App() {", color: "#c792ea" },
  { text: "  const [items, setItems] = useState([]);", color: "#a3be8c" },
  { text: "  const [input, setInput] = useState('');", color: "#a3be8c" },
  { text: "", color: "" },
  { text: "  return (", color: "#d8dee9" },
  { text: "    <main className=\"container mx-auto\">", color: "#88c0d0" },
  { text: "      <h1>{/* Generated */}</h1>", color: "#616e88" },
  { text: "    </main>", color: "#88c0d0" },
  { text: "  );", color: "#d8dee9" },
  { text: "}", color: "#c792ea" },
];

function BuildAnimation({ log }: { log: TaskRecord["agent_log"] }) {
  const latest = [...log].reverse().find((e) => e.status === "running");
  const label = (s: string) =>
    s.replace(/^codegen_\d+$/, "generating code")
     .replace(/^autofix_\d+$/, "fixing errors")
     .replace(/_/g, " ");

  return (
    <div className="rounded-[15px] border border-[#2a2a2a] overflow-hidden bg-[#0a0a0a] mt-2 mb-1">
      <div className="relative overflow-hidden px-4 py-3 font-mono text-xs leading-[1.6] select-none">
        {CODE_LINES.map((line, i) => (
          <div key={i} className="flex gap-3">
            <span className="text-[#333] w-4 text-right flex-shrink-0">{i + 1}</span>
            <span style={{ color: line.color || "#444" }}>{line.text || " "}</span>
          </div>
        ))}
        {/* Scanner */}
        <div className="pointer-events-none absolute left-0 right-0 h-7 bg-gradient-to-b from-transparent via-white/[0.03] to-transparent"
          style={{ animation: "scan 1.8s ease-in-out infinite" }} />
        {/* Cursor */}
        <div className="flex gap-3 mt-0.5">
          <span className="text-[#333] w-4 text-right flex-shrink-0">{CODE_LINES.length + 1}</span>
          <span className="inline-block w-[7px] h-[13px] bg-white/50 align-middle"
            style={{ animation: "blink 1s step-end infinite" }} />
        </div>
      </div>
      <div className="border-t border-[#1e1e1e] px-4 py-2.5 flex items-center gap-2.5 bg-[#080808]">
        <span className="w-3 h-3 border border-[#555] border-t-transparent rounded-full flex-shrink-0"
          style={{ animation: "spin 0.9s linear infinite" }} />
        <span className="text-xs text-[#666] capitalize truncate">
          {latest ? `${label(latest.step)}${latest.detail ? " — " + latest.detail : ""}` : "working..."}
        </span>
      </div>
      <style>{`
        @keyframes scan  { 0% { top:-28px } 100% { top:100% } }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes spin  { to { transform:rotate(360deg) } }
      `}</style>
    </div>
  );
}

// ─── Step list ────────────────────────────────────────────────────────────────
function StepList({ log, status }: { log: TaskRecord["agent_log"]; status: string }) {
  const dot: Record<string, string> = { running: "bg-yellow-400 animate-pulse", done: "bg-green-500", error: "bg-red-500" };
  const lbl = (s: string) => s.replace(/^codegen_\d+$/, "codegen").replace(/^autofix_\d+$/, "autofix").replace(/_/g, " ");
  return (
    <div className="mt-2 space-y-1.5 text-[11px] font-mono text-[#555]">
      {log.map((e, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot[e.status] ?? "bg-[#444]"}`} />
          <span className="w-20 flex-shrink-0 capitalize text-[#666]">{lbl(e.step)}</span>
          <span className="truncate">{e.detail}</span>
        </div>
      ))}
      {status === "running" && (
        <div className="flex items-center gap-2 text-[#555] pl-3">
          <span className="w-2.5 h-2.5 border border-[#555] border-t-transparent rounded-full"
            style={{ animation: "spin 0.9s linear infinite" }} />
          Working...
        </div>
      )}
    </div>
  );
}

// ─── Chat message ─────────────────────────────────────────────────────────────
function ChatMessage({ task }: { task: TaskRecord }) {
  const [stepsOpen, setStepsOpen] = useState(false);
  const isActive = task.status === "running" || task.status === "queued";
  const isDone   = task.status === "done";
  const isError  = task.status === "error";

  const changedFiles = task.agent_log
    .filter((e) => e.step.startsWith("codegen_") && e.status === "done")
    .map((e) => e.detail.split(":")[1]?.trim().split(" ")[0])
    .filter(Boolean);

  return (
    <div className="space-y-2">
      {/* User bubble */}
      <div className="flex justify-end">
        <div className="bg-[#1e1e1e] border border-[#2e2e2e] text-white text-sm rounded-[15px] rounded-tr-[4px] px-4 py-2.5 max-w-[88%] leading-relaxed">
          {task.prompt}
        </div>
      </div>

      {/* AI area */}
      <div className="flex gap-2.5">
        <div className="w-6 h-6 rounded-[8px] bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center flex-shrink-0 mt-0.5 text-[9px] font-bold text-[#555]">
          AI
        </div>
        <div className="flex-1 min-w-0">
          {isActive && <BuildAnimation log={task.agent_log} />}

          {(isDone || isError || (!isActive && task.agent_log.length > 0)) && (
            <div className="bg-[#111] border border-[#222] rounded-[15px] rounded-tl-[4px] px-4 py-3 text-sm space-y-2.5">
              {isDone  && <p className="text-white">Done! Here&apos;s what I&apos;ve built.</p>}
              {isError && <p className="text-red-400">Build failed.</p>}

              {task.agent_log.length > 0 && (
                <button onClick={() => setStepsOpen(!stepsOpen)}
                  className="flex items-center gap-1.5 text-[11px] text-[#444] hover:text-[#777] transition-colors">
                  <ChevronIcon open={stepsOpen} /> See steps
                </button>
              )}
              {stepsOpen && <StepList log={task.agent_log} status={task.status} />}

              {changedFiles.length > 0 && (
                <div className="pt-2 border-t border-[#1e1e1e]">
                  <p className="text-[11px] text-[#444] mb-1.5">Updates</p>
                  <div className="space-y-1">
                    {changedFiles.slice(0, 6).map((f) => (
                      <div key={f} className="flex items-center gap-1.5 text-[11px] text-[#666]">
                        <FileIcon /> {f}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Console ──────────────────────────────────────────────────────────────────
function ConsolePanel({ projectId }: { projectId: string }) {
  const [lines, setLines] = useState<string[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try { if (alive) setLines((await getPreviewLogs(projectId)).lines); } catch { /* */ }
    };
    poll();
    const t = setInterval(poll, 3000);
    return () => { alive = false; clearInterval(t); };
  }, [projectId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [lines]);

  const color = (l: string) => {
    const s = l.toLowerCase();
    if (s.includes("error") || s.includes("failed")) return "text-red-400";
    if (s.includes("warn") || s.includes("deprecat")) return "text-yellow-400";
    if (s.includes("ready") || s.includes("compiled") || s.includes("success")) return "text-green-400";
    return "text-[#555]";
  };

  return (
    <div className="h-44 overflow-y-auto font-mono text-[11px] px-4 py-3 space-y-0.5 bg-black border-t border-[#1e1e1e]">
      {lines.length === 0
        ? <p className="text-[#333]">No logs yet.</p>
        : lines.map((l, i) => <div key={i} className={`${color(l)} whitespace-pre-wrap break-all leading-[1.5]`}>{l}</div>)
      }
      <div ref={endRef} />
    </div>
  );
}

// ─── Toolbar button ───────────────────────────────────────────────────────────
function TB({ onClick, active, title, children }: { onClick?: () => void; active?: boolean; title: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={title}
      className={`p-1.5 rounded-[8px] transition-colors ${active ? "bg-[#222] text-white" : "text-[#555] hover:text-white hover:bg-[#1a1a1a]"}`}>
      {children}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ProjectPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };

  const [project,    setProject]    = useState<Project | null>(null);
  const [statusData, setStatusData] = useState<ProjectStatus | null>(null);
  const [tasks,      setTasks]      = useState<TaskRecord[]>([]);
  const [files,      setFiles]      = useState<ProjectFile[]>([]);
  const [selFile,    setSelFile]    = useState<string | null>(null);
  const [selContent, setSelContent] = useState("");

  const [view,         setView]         = useState<"preview"|"code">("preview");
  const [deviceMode,   setDeviceMode]   = useState<"desktop"|"mobile">("desktop");
  const [consoleOpen,  setConsoleOpen]  = useState(false);
  const [previewKey,   setPreviewKey]   = useState(0);
  const [prompt,       setPrompt]       = useState("");
  const [sending,      setSending]      = useState(false);
  const [sendError,    setSendError]    = useState("");
  const [powerLoading, setPowerLoading] = useState(false);

  const pollRef     = useRef<ReturnType<typeof setInterval>|null>(null);
  const chatEnd     = useRef<HTMLDivElement>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const [s, t, f] = await Promise.all([getProjectStatus(id), listTasks(id), listFiles(id)]);
      setStatusData(s); setTasks(t); setFiles(f);
    } catch { /* */ }
  }, [id]);

  useEffect(() => {
    if (!localStorage.getItem("token")) { router.replace("/login"); return; }
    (async () => {
      try {
        const [p, s, t, f] = await Promise.all([getProject(id), getProjectStatus(id), listTasks(id), listFiles(id)]);
        setProject(p); setStatusData(s); setTasks(t); setFiles(f);
      } catch (e) { if (e instanceof ApiError && e.status === 401) router.replace("/login"); }
    })();
  }, [id, router]);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [tasks]);

  useEffect(() => {
    if (statusData?.status === "building") {
      if (!pollRef.current) pollRef.current = setInterval(fetchStatus, 2000);
    } else {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    }
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [statusData?.status, fetchStatus]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || sending) return;
    setSendError(""); setSending(true);
    try {
      await sendPrompt(id, prompt); setPrompt("");
      setStatusData(s => s ? { ...s, status: "building" } : s);
      setTimeout(fetchStatus, 500);
    } catch (err) { setSendError(err instanceof Error ? err.message : "Failed"); }
    finally { setSending(false); }
  }

  async function handlePower() {
    if (!statusData || powerLoading) return;
    setPowerLoading(true);
    try {
      if (statusData.status === "ready") {
        await stopPreview(id);
        setStatusData(s => s ? { ...s, status: "idle" } : s);
      } else {
        await startPreview(id);
        setStatusData(s => s ? { ...s, status: "ready" } : s);
        setPreviewKey(k => k + 1);
      }
    } catch { /* */ }
    setPowerLoading(false);
  }

  const isBuilding = statusData?.status === "building";
  const isReady    = statusData?.status === "ready";
  const previewPort = statusData?.preview_port ?? project?.preview_port;
  const previewUrl  = previewPort ? `http://localhost:${previewPort}` : null;
  const errorCount  = tasks.filter(t => t.status === "error").length;
  const warnCount   = tasks.filter(t => t.agent_log.some(e => e.step.startsWith("autofix"))).length;

  return (
    <div className="h-screen flex bg-black text-white overflow-hidden">

      {/* ── Left: Chat ──────────────────────────────────────────────────────── */}
      <div className="w-[300px] flex-shrink-0 flex flex-col border-r border-[#222]">

        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#222]">
          <Link href="/dashboard" className="text-[#444] hover:text-white transition-colors">
            <BackIcon />
          </Link>
          <span className="font-medium text-sm truncate text-white">{project?.name ?? "..."}</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
          {/* Greeting */}
          <div className="flex gap-2.5">
            <div className="w-6 h-6 rounded-[8px] bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center flex-shrink-0 text-[9px] font-bold text-[#555]">
              AI
            </div>
            <div className="bg-[#111] border border-[#222] text-[#888] text-sm rounded-[15px] rounded-tl-[4px] px-4 py-3 max-w-[90%] leading-relaxed">
              What can I help you build today?
            </div>
          </div>

          {tasks.map(t => <ChatMessage key={t.id} task={t} />)}

          {statusData?.status === "error" && (
            <div className="flex justify-center">
              <button
                onClick={() => retryProject(id).then(() => setStatusData(s => s ? { ...s, status: "building" } : s))}
                className="text-xs text-[#666] border border-[#2a2a2a] hover:border-[#444] hover:text-white rounded-full px-4 py-1.5 transition-colors">
                Retry last build
              </button>
            </div>
          )}
          <div ref={chatEnd} />
        </div>

        {/* Input */}
        <div className="border-t border-[#222] p-3">
          {sendError && <p className="text-red-400 text-xs mb-2">{sendError}</p>}
          <form onSubmit={handleSend} className="relative">
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
              disabled={sending || isBuilding}
              placeholder="Make updates to your project"
              rows={3}
              className="w-full bg-[#0d0d0d] border border-[#222] rounded-[15px] px-4 py-3 pr-12 text-sm resize-none focus:outline-none focus:border-[#444] disabled:opacity-40 placeholder-[#333] text-white transition-colors"
            />
            <button type="submit" disabled={sending || isBuilding || !prompt.trim()}
              className="absolute bottom-3 right-3 w-7 h-7 bg-white hover:bg-gray-200 disabled:opacity-30 rounded-[8px] flex items-center justify-center transition-colors text-black">
              <SendIcon />
            </button>
          </form>
        </div>
      </div>

      {/* ── Right: Editor ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center gap-1 px-3 h-11 border-b border-[#222] bg-[#0a0a0a] flex-shrink-0">

          <div className="flex items-center border border-[#222] rounded-[10px] p-0.5 gap-0.5">
            <TB onClick={() => setView("preview")} active={view === "preview"} title="Preview"><EyeIcon /></TB>
            <TB onClick={() => setView("code")} active={view === "code"} title="Code"><CodeIcon /></TB>
          </div>

          <div className="w-px h-5 bg-[#222] mx-1" />

          <div className="flex items-center border border-[#222] rounded-[10px] p-0.5 gap-0.5">
            <TB onClick={() => setDeviceMode("desktop")} active={deviceMode === "desktop"} title="Desktop"><DesktopIcon /></TB>
            <TB onClick={() => setDeviceMode("mobile")} active={deviceMode === "mobile"} title="Mobile"><MobileIcon /></TB>
          </div>

          <div className="w-px h-5 bg-[#222] mx-1" />
          <TB onClick={() => setPreviewKey(k => k + 1)} title="Reload preview"><RefreshIcon /></TB>

          {/* URL bar */}
          <div className="flex-1 mx-2">
            <div className="flex items-center bg-[#0d0d0d] border border-[#222] rounded-[10px] px-3 h-7 gap-2">
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors ${isReady ? "bg-green-500" : isBuilding ? "bg-yellow-400 animate-pulse" : "bg-[#333]"}`} />
              <span className="text-[11px] text-[#444] truncate font-mono">
                {previewUrl ?? (isBuilding ? "Building..." : "Not running")}
              </span>
            </div>
          </div>

          {/* Right side */}
          <TB title="Share (coming soon)">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </TB>
          {previewUrl && (
            <a href={previewUrl} target="_blank" rel="noopener noreferrer" title="Open in new tab"
              className="p-1.5 text-[#555] hover:text-white hover:bg-[#1a1a1a] rounded-[8px] transition-colors">
              <ExternalIcon />
            </a>
          )}
          <button
            onClick={() => previewUrl && window.open(previewUrl, "_blank")}
            disabled={!previewUrl}
            className="bg-white hover:bg-gray-200 disabled:opacity-30 text-black text-xs font-semibold px-4 py-1.5 rounded-[10px] transition-colors ml-1">
            Publish
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col bg-[#080808]">
          <div className="flex-1 overflow-hidden">
            {view === "preview" ? (
              <div className="h-full flex items-center justify-center">
                {previewUrl && isReady ? (
                  <div className={`h-full bg-white overflow-hidden shadow-2xl transition-all duration-300 ${deviceMode === "mobile" ? "w-[390px] rounded-[20px] my-4" : "w-full"}`}>
                    <iframe key={previewKey} src={previewUrl} className="w-full h-full border-0" title="preview" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 text-[#333]">
                    {isBuilding ? (
                      <>
                        <span className="w-7 h-7 border-2 border-[#333] border-t-[#888] rounded-full"
                          style={{ animation: "spin 0.8s linear infinite" }} />
                        <span className="text-sm text-[#444]">Building your app...</span>
                      </>
                    ) : (
                      <span className="text-sm">Preview will appear here once ready</span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-full">
                <div className="w-44 border-r border-[#1e1e1e] overflow-y-auto py-2 bg-[#0a0a0a]">
                  <p className="text-[10px] text-[#333] px-3 mb-2 uppercase tracking-widest">Files</p>
                  {files.length === 0
                    ? <p className="text-xs text-[#333] px-3">No files yet</p>
                    : <FileTree files={files} selectedPath={selFile} onSelect={(p) => { setSelFile(p); setSelContent(files.find(f => f.file_path === p)?.content ?? ""); }} />
                  }
                </div>
                <div className="flex-1 flex flex-col overflow-hidden">
                  {selFile ? (
                    <>
                      <div className="border-b border-[#1e1e1e] px-4 py-2 text-xs text-[#444] font-mono flex-shrink-0 bg-[#0a0a0a]">{selFile}</div>
                      <pre className="flex-1 overflow-auto p-4 text-xs font-mono text-[#888] leading-relaxed whitespace-pre-wrap">{selContent}</pre>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-[#333] text-sm">Select a file</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {consoleOpen && <ConsolePanel projectId={id} />}
        </div>

        {/* Status bar */}
        <div className="flex items-center px-4 h-7 border-t border-[#1e1e1e] bg-[#0a0a0a] text-[11px] flex-shrink-0">
          <button onClick={() => setConsoleOpen(!consoleOpen)}
            className={`flex items-center gap-1.5 transition-colors ${consoleOpen ? "text-white" : "text-[#444] hover:text-[#888]"}`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Console
            <ChevronIcon open={consoleOpen} />
          </button>

          <div className="ml-auto flex items-center gap-3">
            <span className={`flex items-center gap-1 ${errorCount > 0 ? "text-red-400" : "text-[#333]"}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />{errorCount}
            </span>
            <span className={`flex items-center gap-1 ${warnCount > 0 ? "text-yellow-400" : "text-[#333]"}`}>
              <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L1 21h22L12 2zm1 14h-2v2h2v-2zm0-6h-2v4h2V10z" />
              </svg>
              {warnCount}
            </span>
            <div className="w-px h-3.5 bg-[#222]" />
            <button onClick={handlePower} disabled={powerLoading || isBuilding}
              title={isReady ? "Stop container" : "Start container"}
              className="p-1 rounded-[6px] hover:bg-[#1a1a1a] transition-colors disabled:opacity-40">
              {powerLoading ? (
                <span className="w-4 h-4 border border-[#444] border-t-[#888] rounded-full block"
                  style={{ animation: "spin 0.8s linear infinite" }} />
              ) : (
                <svg className={`w-4 h-4 ${isReady ? "text-green-500" : "text-[#333]"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 11-12.728 0M12 3v9" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>
    </div>
  );
}
