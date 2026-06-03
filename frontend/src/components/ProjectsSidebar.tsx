"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { listProjects, getMe, type Project, type UserProfile } from "@/lib/api";

function initials(u: UserProfile | null) {
  if (u?.full_name) return u.full_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return u?.email?.[0].toUpperCase() ?? "?";
}

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
  const [user,     setUser]     = useState<UserProfile | null>(null);

  useEffect(() => {
    getMe().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    listProjects().then(setProjects).catch(() => {}).finally(() => setLoading(false));
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      {open && <div className="fixed inset-0 z-40" onClick={onClose} />}

      {/* Panel — matches chat sidebar: floating card with same width + radius */}
      <div
        className="fixed left-2 top-2 bottom-2 w-[420px] bg-[#0d0d0d] border border-[#222] rounded-[15px] z-50 flex flex-col overflow-hidden transition-transform duration-200"
        style={{ transform: open ? "translateX(0)" : "translateX(calc(-100% - 12px))" }}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 px-3 py-3 border-b border-[#1e1e1e] flex-shrink-0">
          <span className="font-medium text-sm text-white flex-1 px-1">Projects</span>
          <button onClick={onClose} title="Close"
            className="p-1.5 text-[#444] hover:text-white transition-colors rounded-[8px] hover:bg-[#1a1a1a] flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* New project */}
        <Link href="/welcome" onClick={onClose}
          className="flex items-center gap-2.5 px-4 py-3 text-sm text-[#555] hover:text-white hover:bg-[#111] transition-colors border-b border-[#1e1e1e] flex-shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New project
        </Link>

        {/* List */}
        <div className="flex-1 overflow-y-auto py-2 px-2">
          {loading ? (
            <p className="text-[#333] text-xs px-3 py-3">Loading...</p>
          ) : projects.length === 0 ? (
            <p className="text-[#333] text-xs px-3 py-3">No projects yet</p>
          ) : (
            projects.map(p => (
              <Link key={p.id} href={`/project/${p.id}`} onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-[10px] transition-colors ${
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

        {/* Home + user footer */}
        <div className="border-t border-[#1e1e1e] flex-shrink-0">
          <Link href="/dashboard" onClick={onClose}
            className="flex items-center gap-3 px-4 py-3 text-[#555] hover:text-white hover:bg-[#111] transition-colors border-b border-[#1e1e1e]">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-sm">Home</span>
          </Link>
          <Link href="/settings" onClick={onClose}
            className="flex items-center gap-3 px-4 py-3 hover:bg-[#111] transition-colors group">
            <div className="w-8 h-8 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] flex items-center justify-center text-xs font-semibold text-white flex-shrink-0 group-hover:border-[#444] transition-colors">
              {initials(user)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{user?.full_name || user?.email || "..."}</p>
              {user?.full_name && <p className="text-xs text-[#333] truncate">{user.email}</p>}
            </div>
            <svg className="w-3.5 h-3.5 text-[#333] group-hover:text-[#666] transition-colors flex-shrink-0"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </>
  );
}
