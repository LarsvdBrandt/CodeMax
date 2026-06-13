"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  getProject, getProjectStatus, listFiles, listTasks, sendPrompt, retryProject,
  stopPreview, startPreview, getPreviewLogs, clarifyPrompt, provideApiKey,
  detectKeys, createApiKey, renameProject, getMyRole, listBranches, ApiError,
  type Project, type ProjectFile, type ProjectStatus, type TaskRecord, type MissingKey,
  type ProjectBranch,
} from "@/lib/api";
import FileExplorer from "@/components/FileExplorer";
import CodeEditor from "@/components/CodeEditor";
import ProjectsSidebar from "@/components/ProjectsSidebar";
import TeamModal from "@/components/TeamModal";
import VersionHistoryModal from "@/components/VersionHistoryModal";
import ProjectSettingsModal from "@/components/ProjectSettingsModal";

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

// ─── Build feed — streaming step animation ────────────────────────────────────

const STEP_MSGS: Record<string, string[]> = {
  start:        ["Thinking...", "Understanding your request...", "Getting ready..."],
  analyze:      ["Analyzing codebase...", "Reading file structure...", "Identifying what to change..."],
  retrieve:     ["Loading context...", "Reading relevant files...", "Gathering code context..."],
  plan:         ["Planning changes...", "Deciding what to update...", "Mapping out the approach..."],
  provision_db: ["Starting database...", "Provisioning PostgreSQL...", "Getting database ready..."],
  schema:       ["Checking database schema...", "Planning migrations...", "Updating tables..."],
  db_wiring:    ["Connecting app to database...", "Generating API routes...", "Wiring data layer..."],
  build:        ["Starting server...", "Installing packages...", "Booting preview..."],
  autofix:      ["Found a compile error...", "Diagnosing the issue...", "Rewriting the fix..."],
};

function getDoneLabel(step: string, detail: string): string {
  if (step === "start")        return "Understood your request";
  if (step === "analyze")      return "Analyzed codebase";
  if (step === "retrieve")     return "Loaded context";
  if (step === "plan")         return "Created a plan";
  if (step === "provision_db") return detail.startsWith("DB provision failed") ? detail : "Database ready";
  if (step === "schema")       return detail.startsWith("Schema") ? detail : `DB: ${detail}`;
  if (step === "db_wiring")    return detail.startsWith("DB wiring failed") ? detail : detail;
  if (step === "build")        return "Preview launched";
  if (step.match(/^codegen_\d+$/)) {
    const f = detail.split(":")[1]?.trim().split(" ")[0] ?? "file";
    return `Wrote ${f}`;
  }
  if (step.match(/^autofix_\d+$/)) return `Fixed compilation error`;
  return detail || step;
}

// Single step row — fades in from below
function StepRow({ label, done, error, active, index }: { label: string; done?: boolean; error?: boolean; active?: boolean; index: number }) {
  return (
    <div className="flex items-center gap-2.5"
      style={{ animation: `stepIn 0.28s cubic-bezier(0.16,1,0.3,1) both`, animationDelay: `${index * 30}ms` }}>
      <div className="relative flex-shrink-0 w-3.5 h-3.5 flex items-center justify-center">
        {error ? (
          <svg className="w-3 h-3 text-red-500/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : done ? (
          <svg className="w-3 h-3 text-green-500/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        ) : active ? (
          <span className="w-1.5 h-1.5 rounded-full bg-white/60"
            style={{ animation: "activePulse 1.4s ease-in-out infinite" }} />
        ) : (
          <span className="w-1 h-1 rounded-full bg-[#2a2a2a]" />
        )}
      </div>
      <span className={`text-xs leading-relaxed truncate transition-colors duration-500 ${
        done ? "text-[#2e2e2e]" : active ? "text-[#aaa]" : "text-[#2a2a2a]"
      }`}>
        {label}
      </span>
    </div>
  );
}

// Cycling label for the active step
function ActiveStepLabel({ step, detail }: { step: string; detail: string }) {
  const base = step.startsWith("codegen_") ? "autofix" : step.startsWith("autofix_") ? "autofix" : step;
  const msgs  = STEP_MSGS[base] ?? [detail || step.replace(/_/g, " ")];

  const [idx,     setIdx]     = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setIdx(0); setVisible(true);
    if (msgs.length <= 1) return;
    const t = setInterval(() => {
      setVisible(false);
      setTimeout(() => { setIdx(i => (i + 1) % msgs.length); setVisible(true); }, 220);
    }, 1800);
    return () => clearInterval(t);
  }, [step, msgs.length]);

  // For codegen, show filename instead
  if (step.match(/^codegen_\d+$/)) {
    const file = detail.split(":")[1]?.trim().split(" ")[0] ?? "file";
    return (
      <span className="text-xs text-[#aaa] font-mono truncate">
        Writing <span className="text-white/70">{file}</span>
        <span style={{ animation: "blink 0.8s step-end infinite" }}>▎</span>
      </span>
    );
  }

  return (
    <span className="text-xs text-[#aaa] transition-opacity duration-200"
      style={{ opacity: visible ? 1 : 0 }}>
      {msgs[idx]}
    </span>
  );
}

// Code lines used in the animation
const CODE_LINES = [
  { t: "import { useState, useEffect } from 'react';", c: "#6b9bd2" },
  { t: "import Head from 'next/head';",                c: "#6b9bd2" },
  { t: "export default function App() {",             c: "#c792ea" },
  { t: "  const [data, setData] = useState([]);",     c: "#a3be8c" },
  { t: "  const [loading, setLoading] = useState(false);", c: "#a3be8c" },
  { t: "  useEffect(() => { fetchData(); }, []);",    c: "#ffd700" },
  { t: "  return (",                                  c: "#d8dee9" },
  { t: "    <main className=\"min-h-screen\">",       c: "#88c0d0" },
  { t: "      {data.map(item => (",                   c: "#d8dee9" },
  { t: "        <Card key={item.id} {...item} />",     c: "#88c0d0" },
  { t: "      ))}",                                   c: "#d8dee9" },
  { t: "    </main>",                                 c: "#88c0d0" },
  { t: "  );",                                        c: "#d8dee9" },
  { t: "}",                                           c: "#c792ea" },
];

// Compact 3-line code animation — no border/chrome, just pure code
function CodegenRow({ detail, index }: { detail: string; index: number }) {
  const file = detail.split(":")[1]?.trim().split(" ")[0] ?? "file";
  const [active, setActive] = useState(2);

  useEffect(() => {
    setActive(2);
    const t = setInterval(() => setActive(l => (l + 1) % CODE_LINES.length), 190);
    return () => clearInterval(t);
  }, [detail]);

  // Show prev, active, next — wrapped
  const wrap = (i: number) => ((i % CODE_LINES.length) + CODE_LINES.length) % CODE_LINES.length;
  const rows = [
    { line: CODE_LINES[wrap(active - 1)], opacity: 0.18 },
    { line: CODE_LINES[active],            opacity: 0.85, cursor: true },
    { line: CODE_LINES[wrap(active + 1)], opacity: 0.18 },
  ];

  return (
    <div style={{ animation: `stepIn 0.28s cubic-bezier(0.16,1,0.3,1) both`, animationDelay: `${index * 30}ms` }}>
      {/* Label row */}
      <div className="flex items-center gap-2.5 mb-1.5">
        <div className="flex-shrink-0 w-3.5 h-3.5 flex items-center justify-center">
          <span className="w-1.5 h-1.5 rounded-full bg-white/60"
            style={{ animation: "activePulse 1.4s ease-in-out infinite" }} />
        </div>
        <span className="text-xs font-mono text-[#555]">
          Writing <span className="text-[#888]">{file}</span>
        </span>
      </div>
      {/* 3 code lines */}
      <div className="ml-6 font-mono text-[10.5px] leading-[1.65] select-none">
        {rows.map(({ line, opacity, cursor }, i) => (
          <div key={i} style={{ opacity, transition: "opacity 0.15s ease" }}
            className={i === 1 ? "bg-white/[0.03] -mx-1 px-1 rounded-sm" : ""}>
            <span style={{ color: line.c || "#333" }}>{line.t || " "}</span>
            {cursor && (
              <span className="inline-block w-[4px] h-[10px] bg-white/50 align-middle ml-px"
                style={{ animation: "blink 0.7s step-end infinite" }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function BuildFeed({ log, taskStatus }: { log: TaskRecord["agent_log"]; taskStatus: string }) {
  const done    = log.filter(e => e.status === "done" || e.status === "error");
  const running = [...log].reverse().find(e => e.status === "running");

  return (
    <div className="pt-1 pb-0.5 space-y-2">
      {/* All done/error steps */}
      {done.map((e, i) => (
        <StepRow key={i} label={getDoneLabel(e.step, e.detail)} done={e.status === "done"} error={e.status === "error"} index={i} />
      ))}

      {/* Active step */}
      {running && (
        running.step.match(/^codegen_\d+$/)
          ? <CodegenRow detail={running.detail} index={done.length} />
          : (
            <div className="flex items-center gap-2.5"
              style={{ animation: "stepIn 0.28s cubic-bezier(0.16,1,0.3,1) both" }}>
              <div className="flex-shrink-0 w-3.5 h-3.5 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-white/60"
                  style={{ animation: "activePulse 1.4s ease-in-out infinite" }} />
              </div>
              <ActiveStepLabel step={running.step} detail={running.detail} />
            </div>
          )
      )}

      {taskStatus === "queued" && !running && (
        <div className="flex items-center gap-2.5">
          <div className="flex-shrink-0 w-3.5 h-3.5 flex items-center justify-center">
            <span className="w-1 h-1 rounded-full bg-[#333]"
              style={{ animation: "activePulse 2s ease-in-out infinite" }} />
          </div>
          <span className="text-xs text-[#333]">In queue...</span>
        </div>
      )}

      <style>{`
        @keyframes stepIn      { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
        @keyframes activePulse { 0%,100%{opacity:0.3;transform:scale(0.8)} 50%{opacity:1;transform:scale(1)} }
        @keyframes blink       { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes spin        { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}

// ─── Step list (expandable) ───────────────────────────────────────────────────
function StepList({ log }: { log: TaskRecord["agent_log"] }) {
  const dot: Record<string,string> = { done: "bg-green-500/60", error: "bg-red-500", running: "bg-yellow-400" };
  return (
    <div className="mt-1 space-y-1.5 text-[11px] font-mono text-[#3a3a3a]">
      {log.map((e, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot[e.status] ?? "bg-[#2a2a2a]"}`} />
          <span className="truncate">{getDoneLabel(e.step, e.detail)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── API key card (shown when task is waiting_for_key) ────────────────────────
function ApiKeyCard({ task, projectId, onProvided }: {
  task: TaskRecord;
  projectId: string;
  onProvided: () => void;
}) {
  const needsKeyEntry = task.agent_log.find(e => e.step === "need_api_key");
  const [envVar, service, description] = (needsKeyEntry?.detail ?? "||").split("|");
  const [keyValue, setKeyValue] = useState("");
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!keyValue.trim()) return;
    setSaving(true); setError("");
    try {
      await provideApiKey(projectId, envVar, keyValue.trim(), service);
      onProvided();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save key");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-[15px] border border-[#2a2a2a] bg-[#0d0d0d] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#1e1e1e] flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-[8px] bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center flex-shrink-0">
          <svg className="w-3.5 h-3.5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>
        <div>
          <p className="text-sm text-white font-medium">{service} API key required</p>
          <p className="text-[11px] text-[#444]">{description}</p>
        </div>
      </div>
      <form onSubmit={handleSave} className="px-4 py-3 space-y-3">
        <p className="text-xs text-[#555]">
          This app uses <span className="font-mono text-[#666]">{envVar}</span>. Provide your key below — it will be saved to your API keys and used automatically in future builds.
        </p>
        <input
          type="password"
          value={keyValue}
          onChange={e => setKeyValue(e.target.value)}
          placeholder={`Paste your ${service} key...`}
          className="w-full bg-[#111] border border-[#222] rounded-[10px] px-3 py-2 text-xs font-mono text-white placeholder-[#2a2a2a] focus:outline-none focus:border-[#333] transition-colors"
        />
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <div className="flex items-center gap-2">
          <button type="submit" disabled={!keyValue.trim() || saving}
            className="bg-white hover:bg-gray-100 disabled:opacity-40 text-black text-xs font-medium px-4 py-2 rounded-[8px] transition-colors">
            {saving ? "Saving..." : "Save & continue build"}
          </button>
          <a href="/settings/api-keys" target="_blank"
            className="text-xs text-[#333] hover:text-[#666] transition-colors">
            Manage API keys →
          </a>
        </div>
      </form>
    </div>
  );
}

// ─── Pre-build key card (shown before build starts, saves key to user settings) ─
function PreBuildKeyCard({ envVar, service, description, provided, onProvided }: {
  envVar: string;
  service: string;
  description: string;
  provided: boolean;
  onProvided: (envVar: string) => void;
}) {
  const [keyValue, setKeyValue] = useState("");
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");

  if (provided) {
    return (
      <div className="flex items-center gap-2.5 px-4 py-3 rounded-[15px] border border-green-900/40 bg-green-950/20">
        <svg className="w-3.5 h-3.5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
        <span className="text-sm text-green-400">{service} key saved</span>
      </div>
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!keyValue.trim()) return;
    setSaving(true); setError("");
    try {
      await createApiKey(envVar, service, keyValue.trim());
      onProvided(envVar);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save key");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-[15px] border border-[#2a2a2a] bg-[#0d0d0d] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#1e1e1e] flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-[8px] bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center flex-shrink-0">
          <svg className="w-3.5 h-3.5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>
        <div>
          <p className="text-sm text-white font-medium">{service} API key required</p>
          <p className="text-[11px] text-[#444]">{description}</p>
        </div>
      </div>
      <form onSubmit={handleSave} className="px-4 py-3 space-y-3">
        <p className="text-xs text-[#555]">
          This app needs <span className="font-mono text-[#666]">{envVar}</span>. Your key will be saved to your API keys and reused automatically in future builds.
        </p>
        <input
          type="password"
          value={keyValue}
          onChange={e => setKeyValue(e.target.value)}
          placeholder={`Paste your ${service} key...`}
          autoFocus
          className="w-full bg-[#111] border border-[#222] rounded-[10px] px-3 py-2 text-xs font-mono text-white placeholder-[#2a2a2a] focus:outline-none focus:border-[#333] transition-colors"
        />
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <div className="flex items-center gap-2">
          <button type="submit" disabled={!keyValue.trim() || saving}
            className="bg-white hover:bg-gray-100 disabled:opacity-40 text-black text-xs font-medium px-4 py-2 rounded-[8px] transition-colors">
            {saving ? "Saving..." : "Save key"}
          </button>
          <a href="/settings/api-keys" target="_blank"
            className="text-xs text-[#333] hover:text-[#666] transition-colors">
            Manage API keys →
          </a>
        </div>
      </form>
    </div>
  );
}

// ─── Chat message ─────────────────────────────────────────────────────────────
function ChatMessage({ task, projectId, onKeyProvided }: {
  task: TaskRecord;
  projectId: string;
  onKeyProvided: () => void;
}) {
  const [stepsOpen, setStepsOpen] = useState(false);
  const isActive      = task.status === "running" || task.status === "queued";
  const isDone        = task.status === "done";
  const isError       = task.status === "error";
  const isWaitingKey  = task.status === "waiting_for_key";

  const changedFiles = task.agent_log
    .filter(e => e.step.startsWith("codegen_") && e.status === "done")
    .map(e => e.detail.split(":")[1]?.trim().split(" ")[0])
    .filter(Boolean);

  return (
    <div className="space-y-3">
      {/* User bubble */}
      <div className="flex justify-end">
        <div className="bg-[#1e1e1e] border border-[#2a2a2a] text-white text-sm rounded-[15px] rounded-tr-[4px] px-4 py-2.5 max-w-[88%] leading-relaxed">
          {task.prompt}
        </div>
      </div>

      {/* AI response — no avatar */}
      <div className="pl-1">
        {isActive && <BuildFeed log={task.agent_log} taskStatus={task.status} />}

        {/* Waiting for API key */}
        {isWaitingKey && (
          <ApiKeyCard task={task} projectId={projectId} onProvided={onKeyProvided} />
        )}

        {(isDone || isError || (!isActive && !isWaitingKey && task.agent_log.length > 0)) && (
          <div className="text-sm space-y-2">
            {isDone  && <p className="text-[#777] leading-relaxed">Done! Here&apos;s what I built.</p>}
            {isError && <p className="text-red-400/70 leading-relaxed">Build failed.</p>}
            {task.agent_log.length > 0 && (
              <button onClick={() => setStepsOpen(!stepsOpen)}
                className="flex items-center gap-1.5 text-[11px] text-[#2e2e2e] hover:text-[#555] transition-colors">
                <ChevronIcon open={stepsOpen} /> See steps
              </button>
            )}
            {stepsOpen && <StepList log={task.agent_log} />}
            {changedFiles.length > 0 && isDone && (
              <div className="pt-1.5">
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {changedFiles.slice(0, 8).map(f => (
                    <span key={f} className="text-[10px] font-mono text-[#444] bg-[#111] border border-[#1e1e1e] rounded-[6px] px-2 py-0.5">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
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

// ─── Speech-to-text hook ──────────────────────────────────────────────────────
function useSpeechToText(onResult: (text: string) => void) {
  const [listening, setListening] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recogRef = useRef<any>(null);

  function toggle() {
    if (listening) {
      recogRef.current?.stop();
      setListening(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      alert("Speech recognition is not supported in this browser. Try Chrome or Edge.");
      return;
    }

    const r = new SR();
    r.continuous      = true;   // keep recording until stopped
    r.interimResults  = true;   // show partial results
    r.lang            = "en-US";
    r.maxAlternatives = 1;

    r.onstart = () => setListening(true);
    r.onerror = () => { setListening(false); recogRef.current = null; };
    r.onend   = () => { setListening(false); recogRef.current = null; };

    r.onresult = (e: any) => {
      // Collect all final segments; ignore interim ones
      let transcript = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          transcript += e.results[i][0].transcript;
        }
      }
      if (transcript.trim()) onResult(transcript.trim());
    };

    recogRef.current = r;
    r.start();
  }

  return { listening, toggle };
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
  const [activePanel,   setActivePanel]  = useState<"console"|"errors"|"warnings"|null>(null);
  const [previewKey,    setPreviewKey]   = useState(0);
  const [currentRoute,  setCurrentRoute] = useState("/");
  const [pageLabels,    setPageLabels]   = useState<Record<string, string>>({});
  const [chatOpen,      setChatOpen]     = useState(true);
  const [projectsOpen,  setProjectsOpen] = useState(false);
  const [prompt,       setPrompt]       = useState("");
  const [sending,      setSending]      = useState(false);
  const [sendError,    setSendError]    = useState("");
  const [titleEditing, setTitleEditing] = useState(false);
  const [titleValue,   setTitleValue]   = useState("");
  const [powerLoading, setPowerLoading] = useState(false);
  const { listening, toggle: toggleMic } = useSpeechToText(text =>
    setPrompt(p => p ? `${p} ${text}` : text)
  );

  const [myRole,       setMyRole]       = useState<string>("owner");
  const [showTeam,     setShowTeam]     = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeBranch, setActiveBranch] = useState<ProjectBranch | null>(null);

  // Clarification state
  interface Clarification {
    basePrompt: string;       // original user prompt
    context: string;          // accumulated Q&A context
    question: string;
    suggestions: string[];
    round: number;            // 1 or 2, max 2 rounds
  }
  const [clarification,    setClarification]    = useState<Clarification | null>(null);
  const [clarifying,       setClarifying]       = useState(false);
  // Pre-build local chat messages (shown above tasks)
  const [localMessages,    setLocalMessages]    = useState<{ role: "user"|"ai"; text: string }[]>([]);
  // Pre-build API key collection
  const [pendingBuild,     setPendingBuild]     = useState<{ prompt: string; remainingKeys: string[] } | null>(null);
  const [keyCollectionKeys, setKeyCollectionKeys] = useState<(MissingKey & { provided: boolean })[]>([]);

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
        try { const { role } = await getMyRole(id); setMyRole(role); } catch { /* default: owner */ }
        try {
          const branches = await listBranches(id);
          const storedId = localStorage.getItem(`codemax-active-branch-${id}`);
          const stored = storedId ? branches.find(b => b.id === storedId) : null;
          setActiveBranch(stored ?? branches.find(b => b.name === "main") ?? branches[0] ?? null);
        } catch { /* branches not yet created */ }
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

  async function executeBuild(finalPrompt: string) {
    setSending(true); setSendError("");
    try {
      await sendPrompt(id, finalPrompt, activeBranch?.id);
      setStatusData(s => s ? { ...s, status: "building" } : s);
      setTimeout(fetchStatus, 500);
    } catch (err) { setSendError(err instanceof Error ? err.message : "Failed"); }
    finally { setSending(false); }
  }

  async function startBuildWithKeyCheck(finalPrompt: string) {
    setClarification(null);
    setClarifying(true);
    try {
      const { missing } = await detectKeys(id, finalPrompt);
      if (missing.length === 0) {
        setLocalMessages([]);
        await executeBuild(finalPrompt);
        return;
      }
      // Pause before building — collect missing keys
      setPendingBuild({ prompt: finalPrompt, remainingKeys: missing.map(k => k.env_var) });
      setKeyCollectionKeys(missing.map(k => ({ ...k, provided: false })));
      const services = missing.map(k => k.service).join(", ");
      setLocalMessages(m => [
        ...m,
        { role: "ai", text: `Before I start building, I need ${missing.length === 1 ? "an API key" : "some API keys"} (${services}). Please provide ${missing.length === 1 ? "it" : "them"} below:` },
      ]);
    } catch {
      // Detection failed — build anyway
      setLocalMessages([]);
      await executeBuild(finalPrompt);
    } finally {
      setClarifying(false);
    }
  }

  function handleKeyProvided(envVar: string) {
    setKeyCollectionKeys(prev => prev.map(k => k.env_var === envVar ? { ...k, provided: true } : k));
    if (!pendingBuild) return;
    const remaining = pendingBuild.remainingKeys.filter(v => v !== envVar);
    if (remaining.length === 0) {
      const prompt = pendingBuild.prompt;
      setPendingBuild(null);
      setKeyCollectionKeys([]);
      setLocalMessages([]);
      executeBuild(prompt);
    } else {
      setPendingBuild(prev => prev ? { ...prev, remainingKeys: remaining } : null);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || sending || clarifying) return;
    if (pendingBuild) return; // collecting keys — don't accept new prompts
    const text = prompt.trim();
    setPrompt("");

    // If we're mid-clarification: user typed a free-form answer
    if (clarification) {
      await handleClarificationAnswer(text);
      return;
    }

    // New prompt — show user message locally and ask for clarification
    setLocalMessages([{ role: "user", text }]);
    setSendError("");
    setClarifying(true);
    try {
      const result = await clarifyPrompt(id, text);
      if (result.needs_clarification && result.question) {
        setClarification({
          basePrompt: text, context: "", question: result.question,
          suggestions: result.suggestions ?? [], round: 1,
        });
        setLocalMessages(m => [...m, { role: "ai", text: result.question! }]);
      } else {
        // No clarification needed — check keys then build
        await startBuildWithKeyCheck(text);
      }
    } catch {
      // Clarify failed — build anyway
      setLocalMessages([]);
      await executeBuild(text);
    } finally {
      setClarifying(false);
    }
  }

  async function handleClarificationAnswer(answer: string) {
    if (!clarification) return;
    const newContext = clarification.context
      ? `${clarification.context}\nQ: ${clarification.question}\nA: ${answer}`
      : `Q: ${clarification.question}\nA: ${answer}`;
    const enrichedPrompt = `${clarification.basePrompt}\n\n${newContext}`;

    setLocalMessages(m => [...m, { role: "user", text: answer }]);

    // Max 2 clarification rounds
    if (clarification.round >= 2) {
      await startBuildWithKeyCheck(enrichedPrompt);
      return;
    }

    // Ask one more clarifying question
    setClarifying(true);
    try {
      const result = await clarifyPrompt(id, clarification.basePrompt, newContext);
      if (result.needs_clarification && result.question) {
        setClarification({
          ...clarification, context: newContext,
          question: result.question,
          suggestions: result.suggestions ?? [],
          round: clarification.round + 1,
        });
        setLocalMessages(m => [...m, { role: "ai", text: result.question! }]);
      } else {
        await startBuildWithKeyCheck(enrichedPrompt);
      }
    } catch {
      setClarification(null);
      setLocalMessages([]);
      await executeBuild(enrichedPrompt);
    } finally {
      setClarifying(false);
    }
  }

  async function handleSuggestion(suggestion: string) {
    if (!clarification) return;
    setPrompt("");
    await handleClarificationAnswer(suggestion);
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

      <ProjectsSidebar open={projectsOpen} onClose={() => setProjectsOpen(false)} currentProjectId={id} />

      {/* ── Collapsed chat strip ────────────────────────────────────────────── */}
      {!chatOpen && (
        <div className="w-10 flex-shrink-0 flex flex-col items-center gap-2 py-3 bg-[#0d0d0d] border border-[#222] rounded-[15px]">
          <button onClick={() => setProjectsOpen(true)} title="All projects"
            className="p-1.5 text-[#444] hover:text-white transition-colors rounded-[8px] hover:bg-[#1a1a1a]">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
          </button>
          <Link href="/welcome" title="New project"
            className="p-1.5 text-[#444] hover:text-white transition-colors rounded-[8px] hover:bg-[#1a1a1a]">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </Link>
          <div className="flex-1" />
          <button onClick={() => setChatOpen(true)} title="Show chat"
            className="p-1.5 text-[#444] hover:text-white transition-colors rounded-[8px] hover:bg-[#1a1a1a]">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* ── Left: floating chat sidebar ─────────────────────────────────────── */}
      {chatOpen && (
      <div className="w-[420px] flex-shrink-0 flex flex-col bg-[#0d0d0d] border border-[#222] rounded-[15px] overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-1.5 px-3 py-3 border-b border-[#1e1e1e]">
          <button onClick={() => setProjectsOpen(true)} title="All projects"
            className="p-1.5 text-[#444] hover:text-white transition-colors rounded-[8px] hover:bg-[#1a1a1a] flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
          </button>
          <Link href="/welcome" title="New project"
            className="p-1.5 text-[#444] hover:text-white transition-colors rounded-[8px] hover:bg-[#1a1a1a] flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </Link>
          {titleEditing ? (
            <input
              autoFocus
              value={titleValue}
              onChange={e => setTitleValue(e.target.value)}
              onBlur={async () => {
                setTitleEditing(false);
                const trimmed = titleValue.trim();
                if (!trimmed || trimmed === project?.name) return;
                try {
                  const updated = await renameProject(id, trimmed);
                  setProject(updated);
                } catch { setTitleValue(project?.name ?? ""); }
              }}
              onKeyDown={e => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") { setTitleEditing(false); setTitleValue(project?.name ?? ""); }
              }}
              className="flex-1 min-w-0 px-1.5 py-0.5 bg-[#1a1a1a] border border-[#333] rounded-[6px] text-sm font-medium text-white focus:outline-none focus:border-[#555]"
            />
          ) : (
            <div className="flex-1 min-w-0 flex flex-col">
              <button
                onClick={() => { setTitleValue(project?.name ?? ""); setTitleEditing(true); }}
                className="font-medium text-sm truncate text-white px-1 text-left hover:text-[#aaa] transition-colors"
                title="Click to rename"
              >
                {project?.name ?? "..."}
              </button>
              {activeBranch && (
                <button
                  onClick={() => setShowVersions(true)}
                  className="flex items-center gap-1 px-1 group"
                  title="Version history"
                >
                  <svg className="w-2.5 h-2.5 text-[#333] group-hover:text-[#666] transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 3v12m0 0a3 3 0 100 6 3 3 0 000-6zm0 0c3.314 0 6-2.686 6-6V9m0 0a3 3 0 100-6 3 3 0 000 6z" />
                  </svg>
                  <span className="text-[10px] font-mono text-[#333] group-hover:text-[#666] transition-colors truncate">
                    {activeBranch.name}
                  </span>
                </button>
              )}
            </div>
          )}
          <button onClick={() => setChatOpen(false)} title="Collapse chat"
            className="p-1.5 text-[#444] hover:text-white transition-colors rounded-[8px] hover:bg-[#1a1a1a] flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          <p className="text-sm text-[#555] leading-relaxed pl-1">
            What can I help you build today?
          </p>

          {tasks.map(t => (
            <ChatMessage key={t.id} task={t} projectId={id}
              onKeyProvided={() => {
                setStatusData(s => s ? { ...s, status: "building" } : s);
                setTimeout(fetchStatus, 1000);
              }} />
          ))}

          {/* Pre-build clarification messages */}
          {localMessages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "user" ? (
                <div className="bg-[#1e1e1e] border border-[#2a2a2a] text-white text-sm rounded-[15px] rounded-tr-[4px] px-4 py-2.5 max-w-[88%] leading-relaxed">
                  {m.text}
                </div>
              ) : (
                <p className="text-sm text-[#888] leading-relaxed pl-1 max-w-[90%]">{m.text}</p>
              )}
            </div>
          ))}

          {/* Pre-build API key collection cards */}
          {keyCollectionKeys.length > 0 && (
            <div className="space-y-2 pl-1">
              {keyCollectionKeys.map(k => (
                <PreBuildKeyCard
                  key={k.env_var}
                  envVar={k.env_var}
                  service={k.service}
                  description={k.description}
                  provided={k.provided}
                  onProvided={handleKeyProvided}
                />
              ))}
            </div>
          )}

          {/* Thinking indicator during clarification / key-detection */}
          {clarifying && (
            <div className="flex justify-start pl-1">
              <div className="flex gap-1 items-center py-1">
                {[0,1,2].map(i => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#2a2a2a]"
                    style={{ animation: `typingBounce 1.2s ease-in-out ${i*0.2}s infinite` }} />
                ))}
              </div>
            </div>
          )}

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
        {myRole !== "observer" && <div className="p-3">

          {/* Suggestion buttons — shown during clarification */}
          {clarification && (
            <div className="mb-3 space-y-1.5">
              {clarification.suggestions.map((s, i) => (
                <button key={i} type="button" onClick={() => handleSuggestion(s)}
                  disabled={clarifying || sending}
                  className="w-full text-left text-xs text-[#888] hover:text-white bg-[#111] hover:bg-[#1a1a1a] border border-[#1e1e1e] hover:border-[#333] px-3 py-2.5 rounded-[10px] transition-all disabled:opacity-40 leading-relaxed">
                  {s}
                </button>
              ))}
            </div>
          )}

          {sendError && <p className="text-red-400 text-xs mb-2">{sendError}</p>}
          <form onSubmit={handleSend} className="relative">
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
              disabled={sending || isBuilding || clarifying || !!pendingBuild}
              placeholder={pendingBuild ? "Provide the API keys above to continue..." : clarification ? "Or type your answer..." : "Make updates to your project"}
              rows={3}
              className="w-full bg-[#111] border border-[#222] rounded-[15px] px-4 py-3 pr-12 text-sm resize-none focus:outline-none focus:border-[#333] disabled:opacity-40 placeholder-[#2e2e2e] text-white transition-colors"
            />
            {prompt.trim() ? (
              <button type="submit" disabled={sending || isBuilding}
                className="absolute bottom-3 right-3 w-7 h-7 bg-white hover:bg-gray-200 disabled:opacity-50 rounded-[8px] flex items-center justify-center transition-colors text-black">
                <SendIcon />
              </button>
            ) : (
              <button type="button" onClick={toggleMic} disabled={isBuilding}
                title={listening ? "Stop recording" : "Speak your prompt"}
                className={`absolute bottom-3 right-3 w-7 h-7 rounded-[8px] flex items-center justify-center transition-all disabled:opacity-30 ${
                  listening ? "bg-red-500/15 text-red-400" : "text-[#555] hover:text-white hover:bg-[#1a1a1a]"
                }`}>
                {listening ? (
                  /* Animated waveform bars when recording */
                  <span className="flex items-end gap-[2px] h-4">
                    {[0, 1, 2, 3].map(i => (
                      <span key={i} className="w-[3px] bg-red-400 rounded-full"
                        style={{ animation: `wave 0.8s ease-in-out ${i * 0.12}s infinite alternate`, height: "40%" }} />
                    ))}
                    <style>{`@keyframes wave{from{height:25%}to{height:100%}}`}</style>
                  </span>
                ) : (
                  /* Mic icon at rest */
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zm-1 3a1 1 0 012 0v8a1 1 0 01-2 0V4zM8 11H6v1a6 6 0 005 5.92V20H9v2h6v-2h-2v-2.08A6 6 0 0018 12v-1h-2v1a4 4 0 01-8 0v-1z"/>
                  </svg>
                )}
              </button>
            )}
          </form>
        </div>}
      </div>
      )}

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

          <TB onClick={() => setShowTeam(true)} title="Team Members">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </TB>
          <TB onClick={() => setShowVersions(true)} title="Version History">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </TB>
          <TB onClick={() => setShowSettings(true)} title="Project Settings">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </TB>
          {previewUrl && (
            <a href={iframeSrc ?? previewUrl} target="_blank" rel="noopener noreferrer" title="Open in new tab"
              className="p-1.5 text-white opacity-60 hover:opacity-100 hover:bg-[#1a1a1a] rounded-[8px] transition-all">
              <ExternalIcon />
            </a>
          )}
          {myRole !== "observer" && (
            <button
              onClick={() => previewUrl && window.open(previewUrl, "_blank")}
              disabled={!previewUrl}
              className="bg-white hover:bg-gray-200 disabled:opacity-30 text-black text-xs font-semibold px-4 py-1.5 rounded-[10px] transition-colors ml-1">
              Publish
            </button>
          )}
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-hidden">
            {view === "preview" ? (
              <div className="h-full flex items-center justify-center bg-[#060606]">
                {iframeSrc ? (
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

      <style>{`
        @keyframes spin          { to { transform:rotate(360deg) } }
        @keyframes micPulse      { 0%{transform:scale(1);opacity:0.6} 100%{transform:scale(2.2);opacity:0} }
        @keyframes typingBounce  { 0%,100%{transform:translateY(0);opacity:0.3} 50%{transform:translateY(-4px);opacity:1} }
      `}</style>

      {showTeam && project && (
        <TeamModal
          projectId={id}
          projectName={project.name}
          myRole={myRole}
          onClose={() => setShowTeam(false)}
        />
      )}

      {showVersions && project && (
        <VersionHistoryModal
          projectId={id}
          myRole={myRole}
          activeBranchId={activeBranch?.id ?? null}
          onCheckout={branch => {
            setActiveBranch(branch);
            localStorage.setItem(`codemax-active-branch-${id}`, branch.id);
          }}
          onClose={() => setShowVersions(false)}
          onTaskCreated={() => {
            setShowVersions(false);
            setStatusData(s => s ? { ...s, status: "building" } : s);
            setTimeout(fetchStatus, 1000);
          }}
        />
      )}

      {showSettings && project && (
        <ProjectSettingsModal
          project={project}
          myRole={myRole}
          onClose={() => setShowSettings(false)}
          onProjectUpdated={p => setProject(p)}
        />
      )}
    </div>
  );
}
