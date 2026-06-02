"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { listProjects, type Project } from "@/lib/api";

const STATUS_DOT: Record<string, string> = {
  idle:     "bg-[#333]",
  building: "bg-yellow-400 animate-pulse",
  ready:    "bg-green-500",
  error:    "bg-red-500",
};

interface Props {
  open: boolean;
  onClose: () => void;
  currentProjectId?: string;
}

export default function ProjectsSidebar({ open, onClose, currentProjectId }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    listProjects().then(setProjects).catch(() => {}).finally(() => setLoading(false));
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      {open && <div className="fixed inset-0 z-40" onClick={onClose} />}

      {/* Panel */}
      <div
        className="fixed left-0 top-0 h-full w-60 bg-[#0a0a0a] border-r border-[#1e1e1e] z-50 flex flex-col transition-transform duration-200"
        style={{ transform: open ? "translateX(0)" : "translateX(-100%)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e1e1e] flex-shrink-0">
          <span className="text-xs font-semibold text-[#666] uppercase tracking-widest">Projects</span>
          <button onClick={onClose} className="text-[#444] hover:text-white transition-colors p-1 rounded-[6px] hover:bg-[#1a1a1a]">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* New project */}
        <Link href="/welcome" onClick={onClose}
          className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-[#555] hover:text-white hover:bg-[#111] transition-colors border-b border-[#1e1e1e] flex-shrink-0">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New project
        </Link>

        {/* List */}
        <div className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <p className="text-[#333] text-xs px-4 py-3">Loading...</p>
          ) : projects.length === 0 ? (
            <p className="text-[#333] text-xs px-4 py-3">No projects yet</p>
          ) : (
            projects.map(p => (
              <Link key={p.id} href={`/project/${p.id}`} onClick={onClose}
                className={`flex items-center gap-2.5 px-4 py-2.5 text-xs transition-colors ${
                  p.id === currentProjectId
                    ? "text-white bg-[#1a1a1a]"
                    : "text-[#666] hover:text-white hover:bg-[#111]"
                }`}>
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[p.status] ?? "bg-[#333]"}`} />
                <span className="truncate">{p.name}</span>
              </Link>
            ))
          )}
        </div>
      </div>
    </>
  );
}
