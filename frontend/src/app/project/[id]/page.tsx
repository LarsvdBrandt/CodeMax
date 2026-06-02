"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  getProject, getProjectStatus, listFiles, listTasks, sendPrompt, retryProject,
  stopPreview, startPreview, getPreviewLogs, ApiError,
  type Project, type ProjectFile, type ProjectStatus, type TaskRecord,
} from "@/lib/api";
import FileExplorer from "@/components/FileExplorer";
import CodeEditor from "@/components/CodeEditor";

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
const ExternalIcon=()  => <Icon d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />;
const BackIcon   = () => <Icon d="M15 19l-7-7 7-7" />;
const FileIcon   = () => <Icon d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />;
const WarningIcon= () => (
  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2L1 21h22L12 2zm1 14h-2v2h2v-2zm0-6h-2v4h2V10z" />
  </svg>
);

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg className={`w-3 h-3 transition-transform duration-150 ${open ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

// ─── Build feed ───────────────────────────────────────────────────────────────

const CODE_LINES = [
  { t: "import { useState, useEffect } from 'react';", c: "#6b9bd2" },
  { t: "import Head from 'next/head';",                c: "#6b9bd2" },
  { t: "",                                             c: "" },
  { t: "export default function App() {",             c: "#c792ea" },
  { t: "  const [data, setData] = useState([]);",     c: "#a3be8c" },
  { t: "  const [loading, setLoading] = useState(false);", c: "#a3be8c" },
  { t: "",                                             c: "" },
  { t: "  useEffect(() => {",                         c: "#ffd700" },
  { t: "    fetchData();",                             c: "#d8dee9" },
  { t: "  }, []);",                                   c: "#ffd700" },
  { t: "",                                             c: "" },
  { t: "  return (",                                  c: "#d8dee9" },
  { t: "    <main className=\"min-h-screen\">",       c: "#88c0d0" },
  { t: "      {data.map(item => (",                   c: "#d8dee9" },
  { t: "        <Card key={item.id} {...item} />",     c: "#88c0d0" },
  { t: "      ))}",                                   c: "#d8dee9" },
  { t: "    </main>",                                  c: "#88c0d0" },
  { t: "  );",                                        c: "#d8dee9" },
  { t: "}",                                           c: "#c792ea" },
];

const STEP_CYCLES: Record<string, string[]> = {
  start:    ["Thinking about your request...", "Understanding what you need...", "Preparing a response..."],
  analyze:  ["Analyzing the codebase...", "Identifying relevant files...", "Understanding the current structure..."],
  retrieve: ["Loading file context...", "Reading relevant code...", "Building context for the AI..."],
  plan:     ["Planning the changes...", "Deciding what files to update...", "Mapping out the approach..."],
  build:    ["Installing npm packages...", "Starting the Next.js server...", "Warming up the preview..."],
  autofix:  ["Detected a compilation error...", "Analyzing the error message...", "Rewriting the affected file..."],
};

function getStepCycle(step: string): string[] {
  if (step.startsWith("codegen_"))  return [];    // handled separately
  if (step.startsWith("autofix_"))  return STEP_CYCLES.autofix;
  return STEP_CYCLES[step] ?? ["Working..."];
}

function getDoneLabel(step: string, detail: string): string {
  if (step === "start")   return "Understood the request";
  if (step === "analyze") return `Analyzed — ${detail.split(":")[1]?.trim() ?? detail}`;
  if (step === "retrieve")return `Loaded ${detail}`;
  if (step === "plan")    return `Planned ${detail}`;
  if (step === "build")   return "App launched";
  if (step.match(/^codegen_\d+$/)) {
    const f = detail.split(":")[1]?.trim().split(" ")[0] ?? "file";
    return `Wrote ${f}`;
  }
  if (step.match(/^autofix_\d+$/)) return `Fixed error — ${detail}`;
  return detail || step;
}

// Cycles through messages while a step is active
function CyclingMessage({ step, detail }: { step: string; detail: string }) {
  const msgs = getStepCycle(step);
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (msgs.length <= 1) return;
    const t = setInterval(() => {
      setVisible(false);
      setTimeout(() => { setIdx(i => (i + 1) % msgs.length); setVisible(true); }, 300);
    }, 2000);
    return () => clearInterval(t);
  }, [step, msgs.length]);

  const msg = msgs[idx] ?? detail;
  return (
    <span className="text-xs text-[#777] transition-opacity duration-300" style={{ opacity: visible ? 1 : 0 }}>
      {msg}
    </span>
  );
}

// For codegen steps: line-by-line code writing animation
function CodeWriteAnimation({ detail }: { detail: string }) {
  const [activeLine, setActiveLine] = useState(0);
  const filename = detail.split(":")[1]?.trim().split(" ")[0] ?? "file.js";

  useEffect(() => {
    setActiveLine(0);
    const t = setInterval(() => setActiveLine(l => (l + 1) % CODE_LINES.length), 220);
    return () => clearInterval(t);
  }, [detail]);

  return (
    <div className="rounded-[12px] border border-[#1e1e1e] overflow-hidden bg-[#080808]">
      {/* Fake window chrome */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#111]">
        <div className="flex gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#ff5f57]/30" />
          <div className="w-2 h-2 rounded-full bg-[#febc2e]/30" />
          <div className="w-2 h-2 rounded-full bg-[#28c840]/30" />
        </div>
        <span className="text-[10px] text-[#333] font-mono">{filename}</span>
      </div>

      {/* Lines */}
      <div className="px-2 pt-2 pb-1 font-mono text-[10.5px] leading-[1.7] select-none">
        {CODE_LINES.map((line, i) => {
          const dist = Math.abs(i - activeLine);
          const isActive = i === activeLine;
          // Smooth opacity falloff: full on active, fades up and down
          const opacity = isActive ? 1 : dist === 1 ? 0.45 : dist === 2 ? 0.18 : 0.05;
          return (
            <div key={i}
              className={`flex gap-2 ${isActive ? "-mx-2 px-2 bg-white/[0.025]" : ""}`}
              style={{ opacity, transition: "opacity 0.18s ease" }}>
              <span className="text-[#1c1c1c] w-4 text-right flex-shrink-0 select-none">{i + 1}</span>
              <span style={{ color: line.c || "#222" }}>{line.t || " "}</span>
              {isActive && (
                <span className="inline-block w-[5px] h-[11px] bg-white/50 self-center flex-shrink-0"
                  style={{ animation: "blink 0.7s step-end infinite" }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="border-t border-[#111] px-3 py-2 flex items-center gap-2 bg-[#050505]">
        <span className="w-2.5 h-2.5 border border-[#333] border-t-[#666] rounded-full flex-shrink-0"
          style={{ animation: "spin 0.8s linear infinite" }} />
        <span className="text-[11px] text-[#444] truncate font-mono">Writing {filename}...</span>
      </div>
    </div>
  );
}

// Main build feed shown while task is active
function BuildFeed({ log, taskStatus }: { log: TaskRecord["agent_log"]; taskStatus: string }) {
  const running = [...log].reverse().find(e => e.status === "running");
  const done    = log.filter(e => e.status === "done");
  const isCodegen = running?.step.match(/^codegen_\d+$/);

  return (
    <div className="mt-2 mb-1 space-y-1.5">
      {/* Last 2 completed steps as faded history */}
      {done.slice(-2).map((e, i) => (
        <div key={i} className="flex items-center gap-2 text-[11px] text-[#2a2a2a]"
          style={{ animation: "fadeIn 0.4s ease" }}>
          <svg className="w-3 h-3 flex-shrink-0 text-green-500/25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          <span className="truncate">{getDoneLabel(e.step, e.detail)}</span>
        </div>
      ))}

      {/* Current running step */}
      {running && (
        <div style={{ animation: "fadeSlideIn 0.35s ease" }}>
          {isCodegen ? (
            <CodeWriteAnimation detail={running.detail} />
          ) : (
            <div className="flex items-center gap-2.5 py-0.5">
              <span className="w-3 h-3 border border-[#2a2a2a] border-t-[#666] rounded-full flex-shrink-0"
                style={{ animation: "spin 0.8s linear infinite" }} />
              <CyclingMessage step={running.step} detail={running.detail} />
            </div>
          )}
        </div>
      )}

      {taskStatus === "queued" && !running && (
        <div className="flex items-center gap-2 text-[11px] text-[#2a2a2a]">
          <span className="w-3 h-3 border border-[#1e1e1e] border-t-[#444] rounded-full"
            style={{ animation: "spin 1.2s linear infinite" }} />
          In queue...
        </div>
      )}

      <style>{`
        @keyframes spin        { to{transform:rotate(360deg)} }
        @keyframes blink       { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes fadeIn      { from{opacity:0} to{opacity:1} }
        @keyframes fadeSlideIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}

// ─── Step list (expandable inside completed messages) ─────────────────────────
function StepList({ log }: { log: TaskRecord["agent_log"] }) {
  const dot: Record<string,string> = { done: "bg-green-500", error: "bg-red-500", running: "bg-yellow-400" };
  return (
    <div className="mt-1.5 space-y-1.5 text-[11px] font-mono text-[#444]">
      {log.map((e, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot[e.status] ?? "bg-[#333]"}`} />
          <span className="truncate">{getDoneLabel(e.step, e.detail)}</span>
        </div>
      ))}
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
    .filter(e => e.step.startsWith("codegen_") && e.status === "done")
    .map(e => e.detail.split(":")[1]?.trim().split(" ")[0])
    .filter(Boolean);

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <div className="bg-[#1e1e1e] border border-[#2e2e2e] text-white text-sm rounded-[15px] rounded-tr-[4px] px-4 py-2.5 max-w-[88%] leading-relaxed">
          {task.prompt}
        </div>
      </div>
      <div className="flex gap-2.5">
        <div className="w-6 h-6 rounded-[8px] bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center flex-shrink-0 mt-0.5 text-[9px] font-bold text-[#444]">
          AI
        </div>
        <div className="flex-1 min-w-0">
          {isActive && <BuildFeed log={task.agent_log} taskStatus={task.status} />}
          {(isDone || isError || (!isActive && task.agent_log.length > 0)) && (
            <div className="bg-[#111] border border-[#1e1e1e] rounded-[15px] rounded-tl-[4px] px-4 py-3 text-sm space-y-2.5">
              {isDone  && <p className="text-white">Done! Here&apos;s what I&apos;ve built.</p>}
              {isError && <p className="text-red-400">Build failed.</p>}
              {task.agent_log.length > 0 && (
                <button onClick={() => setStepsOpen(!stepsOpen)}
                  className="flex items-center gap-1.5 text-[11px] text-[#333] hover:text-[#666] transition-colors">
                  <ChevronIcon open={stepsOpen} /> See steps
                </button>
              )}
              {stepsOpen && <StepList log={task.agent_log} />}
              {changedFiles.length > 0 && (
                <div className="pt-2 border-t border-[#1a1a1a]">
                  <p className="text-[11px] text-[#333] mb-1.5">Updates</p>
                  <div className="space-y-1">
                    {changedFiles.slice(0, 6).map(f => (
                      <div key={f} className="flex items-center gap-1.5 text-[11px] text-[#555]">
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

// ─── Bottom panel content ─────────────────────────────────────────────────────
function ConsolePanel({ projectId }: { projectId: string }) {
  const [lines, setLines] = useState<string[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try { if (alive) setLines((await getPreviewLogs(projectId)).lines); } catch { /**/ }
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
    return "text-[#444]";
  };

  return (
    <div className="h-44 overflow-y-auto font-mono text-[11px] px-4 py-3 space-y-0.5">
      {lines.length === 0
        ? <p className="text-[#333]">No logs yet.</p>
        : lines.map((l, i) => <div key={i} className={`${color(l)} whitespace-pre-wrap break-all leading-[1.5]`}>{l}</div>)
      }
      <div ref={endRef} />
    </div>
  );
}

function ErrorsPanel({ tasks }: { tasks: TaskRecord[] }) {
  const errorTasks = tasks.filter(t => t.status === "error");
  return (
    <div className="h-44 overflow-y-auto font-mono text-[11px] px-4 py-3 space-y-3">
      {errorTasks.length === 0
        ? <p className="text-[#333]">No errors.</p>
        : errorTasks.map(t => {
            const last = [...t.agent_log].reverse().find(e => e.status === "error");
            return (
              <div key={t.id} className="space-y-1">
                <p className="text-[#666] truncate">Prompt: {t.prompt}</p>
                {last && <p className="text-red-400 whitespace-pre-wrap break-all">{last.step}: {last.detail}</p>}
              </div>
            );
          })
      }
    </div>
  );
}

function WarningsPanel({ tasks }: { tasks: TaskRecord[] }) {
  const warnTasks = tasks.filter(t => t.agent_log.some(e => e.step.startsWith("autofix")));
  return (
    <div className="h-44 overflow-y-auto font-mono text-[11px] px-4 py-3 space-y-3">
      {warnTasks.length === 0
        ? <p className="text-[#333]">No warnings.</p>
        : warnTasks.map(t => {
            const fixes = t.agent_log.filter(e => e.step.startsWith("autofix"));
            return (
              <div key={t.id} className="space-y-1">
                <p className="text-[#666] truncate">Prompt: {t.prompt}</p>
                {fixes.map((f, i) => (
                  <p key={i} className="text-yellow-400 whitespace-pre-wrap break-all">{f.detail}</p>
                ))}
              </div>
            );
          })
      }
    </div>
  );
}

// ─── Toolbar button ───────────────────────────────────────────────────────────
function TB({ onClick, active, title, children }: { onClick?: () => void; active?: boolean; title: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={title}
      className={`p-1.5 rounded-[8px] transition-colors text-white ${active ? "bg-[#252525]" : "opacity-60 hover:opacity-100 hover:bg-[#1a1a1a]"}`}>
      {children}
    </button>
  );
}

// ─── Shimmer text ─────────────────────────────────────────────────────────────
function ShimmerText({ text }: { text: string }) {
  return (
    <div className="relative select-none">
      {/* Base layer — dim */}
      <span className="text-2xl font-light tracking-wide text-[#1e1e1e]">{text}</span>
      {/* Shimmer layer on top */}
      <span
        className="absolute inset-0 text-2xl font-light tracking-wide bg-clip-text text-transparent"
        style={{
          backgroundImage: "linear-gradient(90deg, #1e1e1e 0%, #1e1e1e 30%, #777 48%, #fff 50%, #777 52%, #1e1e1e 70%, #1e1e1e 100%)",
          backgroundSize: "300% 100%",
          animation: "shimmerMove 3s ease-in-out infinite",
          WebkitBackgroundClip: "text",
        }}
      >
        {text}
      </span>
      <style>{`
        @keyframes shimmerMove {
          0%   { background-position: 130% center; }
          100% { background-position: -30% center; }
        }
      `}</style>
    </div>
  );
}

// ─── URL bar with dropdown + edit ─────────────────────────────────────────────
interface PageEntry { route: string; label: string; }

function getProjectPages(files: { file_path: string }[]): PageEntry[] {
  const pages: PageEntry[] = [];
  for (const f of files) {
    if (!f.file_path.startsWith("pages/")) continue;
    if (f.file_path.startsWith("pages/_")) continue;
    const clean = f.file_path.replace(/^pages\//, "").replace(/\.(js|jsx|ts|tsx)$/, "");
    const route = clean === "index" ? "/" : `/${clean}`;
    const label = clean === "index" ? "Home" : clean.charAt(0).toUpperCase() + clean.slice(1).replace(/[-_]/g, " ");
    pages.push({ route, label });
  }
  return pages.sort((a, b) => a.route.localeCompare(b.route));
}

function UrlBar({
  previewUrl, isReady, isBuilding, pages, currentRoute, pageLabels,
  onRouteChange, onLabelSave,
}: {
  previewUrl: string | null; isReady: boolean; isBuilding: boolean;
  pages: PageEntry[]; currentRoute: string;
  pageLabels: Record<string, string>;
  onRouteChange: (r: string) => void;
  onLabelSave: (route: string, label: string) => void;
}) {
  const [open, setOpen]     = useState(false);
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState("");

  const label = pageLabels[currentRoute] ?? pages.find(p => p.route === currentRoute)?.label ?? currentRoute;
  const fullUrl = previewUrl ? `${previewUrl}${currentRoute === "/" ? "" : currentRoute}` : null;

  function startEdit() {
    setEditing(true);
    setEditVal(label);
    setOpen(false);
  }
  function commitEdit() {
    if (editVal.trim()) onLabelSave(currentRoute, editVal.trim());
    setEditing(false);
  }

  return (
    <div className="relative flex-1 mx-2">
      <div className={`flex items-center bg-black border rounded-[10px] px-2 h-7 gap-1.5 transition-colors ${open ? "border-[#333]" : "border-[#1e1e1e]"}`}>
        {/* Status dot */}
        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors ${isReady ? "bg-green-500" : isBuilding ? "bg-yellow-400 animate-pulse" : "bg-[#2a2a2a]"}`} />

        {/* Label / input */}
        {editing ? (
          <input
            autoFocus
            value={editVal}
            onChange={e => setEditVal(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditing(false); }}
            className="flex-1 bg-transparent text-xs text-white outline-none min-w-0"
          />
        ) : (
          <button
            onClick={() => pages.length > 1 && setOpen(o => !o)}
            className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
          >
            <span className="text-[11px] text-[#888] truncate">{label}</span>
            {fullUrl && (
              <span className="text-[10px] text-[#333] truncate hidden 2xl:block">{fullUrl}</span>
            )}
            {pages.length > 1 && (
              <svg className={`w-2.5 h-2.5 flex-shrink-0 text-[#333] transition-transform ${open ? "rotate-180" : ""}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </button>
        )}

        {/* Pen icon */}
        <button onClick={startEdit} title="Rename page" className="text-[#2a2a2a] hover:text-white transition-colors flex-shrink-0 p-0.5">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      </div>

      {/* Dropdown */}
      {open && pages.length > 0 && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 left-0 min-w-[180px] bg-[#111] border border-[#222] rounded-[10px] overflow-hidden z-50 shadow-xl">
            {pages.map(p => {
              const lbl = pageLabels[p.route] ?? p.label;
              const isCurrent = p.route === currentRoute;
              return (
                <button key={p.route}
                  onClick={() => { onRouteChange(p.route); setOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left hover:bg-[#1a1a1a] transition-colors ${isCurrent ? "text-white" : "text-[#555]"}`}>
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isCurrent ? "bg-green-500" : "bg-[#222]"}`} />
                  <span className="flex-1">{lbl}</span>
                  <span className="text-[#2a2a2a] font-mono">{p.route}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
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
  const [activePanel,  setActivePanel]  = useState<"console"|"errors"|"warnings"|null>(null);
  const [previewKey,   setPreviewKey]   = useState(0);
  const [currentRoute, setCurrentRoute] = useState("/");
  const [pageLabels,   setPageLabels]   = useState<Record<string, string>>({});
  const [prompt,       setPrompt]       = useState("");
  const [sending,      setSending]      = useState(false);
  const [sendError,    setSendError]    = useState("");
  const [powerLoading, setPowerLoading] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const chatEnd = useRef<HTMLDivElement>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const [s, t, f] = await Promise.all([getProjectStatus(id), listTasks(id), listFiles(id)]);
      setStatusData(s); setTasks(t); setFiles(f);
    } catch { /**/ }
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

  function togglePanel(panel: "console"|"errors"|"warnings") {
    setActivePanel(p => p === panel ? null : panel);
  }

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
    } catch { /**/ }
    setPowerLoading(false);
  }

  const isBuilding  = statusData?.status === "building";
  const isReady     = statusData?.status === "ready";
  const previewPort = statusData?.preview_port ?? project?.preview_port;
  const previewUrl  = previewPort ? `http://localhost:${previewPort}` : null;
  const errorCount  = tasks.filter(t => t.status === "error").length;
  const warnCount   = tasks.filter(t => t.agent_log.some(e => e.step.startsWith("autofix"))).length;
  const projectPages = getProjectPages(files);
  const iframeSrc   = previewUrl ? `${previewUrl}${currentRoute === "/" ? "" : currentRoute}` : null;

  return (
    <div className="h-screen flex bg-black text-white overflow-hidden p-2 gap-2">

      {/* ── Left: floating chat sidebar ─────────────────────────────────────── */}
      <div className="w-[360px] flex-shrink-0 flex flex-col bg-[#0d0d0d] border border-[#222] rounded-[15px] overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#1e1e1e]">
          <Link href="/dashboard" className="text-[#444] hover:text-white transition-colors">
            <BackIcon />
          </Link>
          <span className="font-medium text-sm truncate text-white">{project?.name ?? "..."}</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
          <div className="flex gap-2.5">
            <div className="w-6 h-6 rounded-[8px] bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center flex-shrink-0 text-[9px] font-bold text-[#444]">AI</div>
            <div className="bg-[#111] border border-[#1e1e1e] text-[#666] text-sm rounded-[15px] rounded-tl-[4px] px-4 py-3 max-w-[90%] leading-relaxed">
              What can I help you build today?
            </div>
          </div>

          {tasks.map(t => <ChatMessage key={t.id} task={t} />)}

          {statusData?.status === "error" && (
            <div className="flex justify-center">
              <button
                onClick={() => retryProject(id).then(() => setStatusData(s => s ? { ...s, status: "building" } : s))}
                className="text-xs text-[#555] border border-[#222] hover:border-[#444] hover:text-white rounded-full px-4 py-1.5 transition-colors">
                Retry last build
              </button>
            </div>
          )}
          <div ref={chatEnd} />
        </div>

        {/* Input */}
        <div className="border-t border-[#1e1e1e] p-3">
          {sendError && <p className="text-red-400 text-xs mb-2">{sendError}</p>}
          <form onSubmit={handleSend} className="relative">
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
              disabled={sending || isBuilding}
              placeholder="Make updates to your project"
              rows={3}
              className="w-full bg-[#111] border border-[#222] rounded-[15px] px-4 py-3 pr-12 text-sm resize-none focus:outline-none focus:border-[#333] disabled:opacity-40 placeholder-[#2e2e2e] text-white transition-colors"
            />
            <button type="submit" disabled={sending || isBuilding || !prompt.trim()}
              className="absolute bottom-3 right-3 w-7 h-7 bg-white hover:bg-gray-200 disabled:opacity-30 rounded-[8px] flex items-center justify-center transition-colors text-black">
              <SendIcon />
            </button>
          </form>
        </div>
      </div>

      {/* ── Right: editor ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#0a0a0a] border border-[#222] rounded-[15px]">

        {/* Toolbar */}
        <div className="flex items-center gap-1 px-3 h-11 border-b border-[#1e1e1e] flex-shrink-0">
          <div className="flex items-center border border-[#1e1e1e] rounded-[10px] p-0.5 gap-0.5">
            <TB onClick={() => setView("preview")} active={view === "preview"} title="Preview"><EyeIcon /></TB>
            <TB onClick={() => setView("code")}    active={view === "code"}    title="Code"><CodeIcon /></TB>
          </div>

          <div className="w-px h-5 bg-[#1e1e1e] mx-1" />

          <div className="flex items-center border border-[#1e1e1e] rounded-[10px] p-0.5 gap-0.5">
            <TB onClick={() => setDeviceMode("desktop")} active={deviceMode==="desktop"} title="Desktop"><DesktopIcon /></TB>
            <TB onClick={() => setDeviceMode("mobile")}  active={deviceMode==="mobile"}  title="Mobile"><MobileIcon /></TB>
          </div>

          <div className="w-px h-5 bg-[#1e1e1e] mx-1" />
          <TB onClick={() => setPreviewKey(k => k + 1)} title="Reload preview"><RefreshIcon /></TB>

          {/* URL bar */}
          <UrlBar
            previewUrl={previewUrl}
            isReady={isReady}
            isBuilding={isBuilding}
            pages={projectPages}
            currentRoute={currentRoute}
            pageLabels={pageLabels}
            onRouteChange={r => { setCurrentRoute(r); setPreviewKey(k => k + 1); }}
            onLabelSave={(route, label) => setPageLabels(pl => ({ ...pl, [route]: label }))}
          />

          <TB title="Share (coming soon)">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </TB>
          {previewUrl && (
            <a href={iframeSrc ?? previewUrl} target="_blank" rel="noopener noreferrer" title="Open in new tab"
              className="p-1.5 text-white opacity-60 hover:opacity-100 hover:bg-[#1a1a1a] rounded-[8px] transition-all">
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

        {/* Main content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-hidden">
            {view === "preview" ? (
              <div className="h-full flex items-center justify-center bg-[#060606]">
                {iframeSrc && isReady ? (
                  <div className={`h-full bg-white overflow-hidden transition-all duration-300 ${deviceMode === "mobile" ? "w-[390px] rounded-[20px] my-4 shadow-2xl" : "w-full"}`}>
                    <iframe key={`${previewKey}-${currentRoute}`} src={iframeSrc} className="w-full h-full border-0" title="preview" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <ShimmerText text={isBuilding ? "Building your app..." : "Your preview will appear"} />
                    {isBuilding && (
                      <div className="flex items-center gap-2 text-[#2a2a2a] text-xs">
                        <span className="w-3 h-3 border border-[#2a2a2a] border-t-[#555] rounded-full"
                          style={{ animation: "spin 0.9s linear infinite" }} />
                        Compiling...
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-full">
                {/* File explorer */}
                <div className="w-52 border-r border-[#1a1a1a] overflow-y-auto flex-shrink-0 bg-[#080808]">
                  <p className="text-[10px] text-[#2a2a2a] px-3 pt-3 pb-1 uppercase tracking-widest">Explorer</p>
                  <FileExplorer
                    files={files}
                    selectedPath={selFile}
                    onSelect={p => {
                      setSelFile(p);
                      setSelContent(files.find(f => f.file_path === p)?.content ?? "");
                    }}
                  />
                </div>

                {/* Monaco editor */}
                <div className="flex-1 overflow-hidden">
                  {selFile ? (
                    <CodeEditor
                      key={selFile}
                      projectId={id}
                      filePath={selFile}
                      initialContent={selContent}
                      onSaved={newContent => {
                        setFiles(fs => fs.map(f =>
                          f.file_path === selFile ? { ...f, content: newContent } : f
                        ));
                        setSelContent(newContent);
                      }}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-[#2a2a2a] text-sm">
                      Select a file to edit
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bottom panel */}
          {activePanel && (
            <div className="border-t border-[#1a1a1a] bg-black flex-shrink-0">
              {activePanel === "console"  && <ConsolePanel projectId={id} />}
              {activePanel === "errors"   && <ErrorsPanel tasks={tasks} />}
              {activePanel === "warnings" && <WarningsPanel tasks={tasks} />}
            </div>
          )}
        </div>

        {/* Status bar */}
        <div className="flex items-center px-4 h-7 border-t border-[#1a1a1a] text-[11px] flex-shrink-0 rounded-b-[15px]">
          {/* Console toggle */}
          <button onClick={() => togglePanel("console")}
            className={`flex items-center gap-1.5 transition-colors ${activePanel === "console" ? "text-white" : "text-[#333] hover:text-[#666]"}`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Console
            <ChevronIcon open={activePanel === "console"} />
          </button>

          <div className="ml-auto flex items-center gap-3">
            {/* Errors */}
            <button onClick={() => togglePanel("errors")}
              className={`flex items-center gap-1.5 transition-colors ${activePanel === "errors" ? "text-red-400" : errorCount > 0 ? "text-red-500 hover:text-red-400" : "text-[#333] hover:text-[#555]"}`}
              title="Errors">
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {errorCount}
              <ChevronIcon open={activePanel === "errors"} />
            </button>

            {/* Warnings */}
            <button onClick={() => togglePanel("warnings")}
              className={`flex items-center gap-1.5 transition-colors ${activePanel === "warnings" ? "text-yellow-400" : warnCount > 0 ? "text-yellow-500 hover:text-yellow-400" : "text-[#333] hover:text-[#555]"}`}
              title="Warnings">
              <WarningIcon />
              {warnCount}
              <ChevronIcon open={activePanel === "warnings"} />
            </button>

            <div className="w-px h-3.5 bg-[#1e1e1e]" />

            {/* Power */}
            <button onClick={handlePower} disabled={powerLoading || isBuilding}
              title={isReady ? "Stop container" : "Start container"}
              className="p-1 rounded-[6px] hover:bg-[#1a1a1a] transition-colors disabled:opacity-40">
              {powerLoading ? (
                <span className="w-4 h-4 border border-[#333] border-t-[#888] rounded-full block"
                  style={{ animation: "spin 0.8s linear infinite" }} />
              ) : (
                <svg className={`w-4 h-4 ${isReady ? "text-green-500" : "text-[#2a2a2a]"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
