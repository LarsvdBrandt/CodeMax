"use client";
import { type AgentLogEntry } from "@/lib/api";

const STEP_ICONS: Record<string, string> = {
  start: "▶",
  analyze: "🔍",
  retrieve: "📂",
  plan: "📋",
  build: "🐳",
  error: "✗",
};

const STATUS_COLORS: Record<string, string> = {
  running: "text-yellow-400",
  done: "text-green-400",
  error: "text-red-400",
};

function stepLabel(step: string): string {
  const base = step.replace(/^codegen_\d+$/, "codegen").replace(/_/g, " ");
  return base.charAt(0).toUpperCase() + base.slice(1);
}

interface Props {
  log: AgentLogEntry[];
  taskStatus: string;
}

export default function AgentLog({ log, taskStatus }: Props) {
  return (
    <div className="space-y-1 text-xs font-mono">
      {log.map((entry, i) => (
        <div key={i} className="flex gap-2 items-start">
          <span className="text-gray-500 flex-shrink-0 w-4">
            {STEP_ICONS[entry.step.replace(/^codegen_\d+$/, "codegen")] ?? "·"}
          </span>
          <span className={`flex-shrink-0 w-16 ${STATUS_COLORS[entry.status] ?? "text-gray-400"}`}>
            {stepLabel(entry.step)}
          </span>
          <span className="text-gray-400 truncate">{entry.detail}</span>
        </div>
      ))}
      {taskStatus === "running" && (
        <div className="flex gap-2 items-center text-yellow-400 mt-2">
          <span className="animate-spin">⟳</span>
          <span>Working...</span>
        </div>
      )}
    </div>
  );
}
