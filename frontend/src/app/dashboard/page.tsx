"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { listProjects, deleteProject, getMe, ApiError, type Project, type UserProfile } from "@/lib/api";

const STATUS_DOT: Record<string, string> = {
  idle:     "bg-[#2a2a2a]",
  building: "bg-yellow-500 animate-pulse",
  ready:    "bg-green-500",
  error:    "bg-red-500",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function projInitials(name: string): string {
  return name.split(/\s+/).map(w => w[0] ?? "").join("").slice(0, 2).toUpperCase() || "?";
}

function userInitials(u: UserProfile | null): string {
  if (u?.full_name) return u.full_name.split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return u?.email?.[0].toUpperCase() ?? "?";
}

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects]   = useState<Project[]>([]);
  const [user,     setUser]       = useState<UserProfile | null>(null);
  const [loading,  setLoading]    = useState(true);
  const [query,    setQuery]      = useState("");
  const [menuOpen, setMenuOpen]   = useState<string | null>(null);
  const [deleting, setDeleting]   = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!localStorage.getItem("token")) { router.replace("/login"); return; }
    Promise.all([
      listProjects().catch(() => [] as Project[]),
      getMe().catch(() => null),
    ]).then(([ps, u]) => { setProjects(ps); setUser(u); }).finally(() => setLoading(false));
  }, [router]);

  // Close menu on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(null);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  async function handleDelete(projectId: string, e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    if (!confirm("Delete this project? This cannot be undone.")) return;
    setDeleting(projectId); setMenuOpen(null);
    try { await deleteProject(projectId); setProjects(ps => ps.filter(p => p.id !== projectId)); }
    catch (err) { if (err instanceof ApiError && err.status === 401) router.replace("/login"); }
    finally { setDeleting(null); }
  }

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase()) ||
    p.description.toLowerCase().includes(query.toLowerCase())
  );

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-black">
      <div className="w-5 h-5 border-2 border-[#222] border-t-[#555] rounded-full"
        style={{ animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div className="h-screen bg-black text-white flex flex-col overflow-hidden">

      {/* User icon — top right */}
      <div className="absolute top-4 right-4 z-10">
        <Link href="/settings"
          className="w-9 h-9 rounded-full bg-[#111] border border-[#222] hover:border-[#444] flex items-center justify-center text-xs font-semibold text-white transition-colors">
          {userInitials(user)}
        </Link>
      </div>

      {/* Center content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-[520px] space-y-2">

          {/* Search bar */}
          <div className="flex items-center gap-2 bg-[#0d0d0d] border border-[#222] rounded-[15px] px-4 h-12">
            <svg className="w-4 h-4 text-[#333] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search projects..."
              className="flex-1 bg-transparent text-sm text-white placeholder-[#2e2e2e] focus:outline-none"
            />
            <Link href="/welcome"
              className="w-7 h-7 rounded-full bg-[#1a1a1a] hover:bg-[#252525] border border-[#2a2a2a] flex items-center justify-center text-[#666] hover:text-white transition-colors flex-shrink-0"
              title="New project">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </Link>
          </div>

          {/* Projects list */}
          {filtered.length > 0 && (
            <div className="bg-[#0d0d0d] border border-[#222] rounded-[15px] overflow-hidden">
              {filtered.map((p, i) => (
                <div key={p.id} className="relative group">
                  <Link href={`/project/${p.id}`}
                    className={`flex items-center gap-3.5 px-4 py-3.5 hover:bg-[#111] transition-colors ${i !== 0 ? "border-t border-[#1a1a1a]" : ""}`}>

                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0">
                      {projInitials(p.name)}
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate leading-tight">{p.name}</p>
                      <p className="text-xs text-[#444] truncate mt-0.5 leading-tight">{p.description}</p>
                    </div>

                    {/* Right: time + status */}
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0 ml-2">
                      <span className="text-[11px] text-[#333]">{timeAgo(p.updated_at)}</span>
                      <div className={`w-4 h-4 rounded-full border-2 border-[#1a1a1a] ${STATUS_DOT[p.status] ?? "bg-[#2a2a2a]"}`} />
                    </div>
                  </Link>

                  {/* Ellipsis menu */}
                  <button
                    onClick={e => { e.preventDefault(); setMenuOpen(menuOpen === p.id ? null : p.id); }}
                    className="absolute right-12 top-1/2 -translate-y-1/2 p-1.5 text-[#2a2a2a] hover:text-[#777] opacity-0 group-hover:opacity-100 transition-all rounded-[6px] hover:bg-[#1a1a1a]"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" />
                    </svg>
                  </button>

                  {menuOpen === p.id && (
                    <div ref={menuRef}
                      className="absolute right-10 top-1/2 -translate-y-1/2 bg-[#111] border border-[#222] rounded-[10px] z-20 overflow-hidden min-w-[120px] shadow-xl">
                      <button onClick={e => handleDelete(p.id, e)} disabled={deleting === p.id}
                        className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50">
                        {deleting === p.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Empty states */}
          {!loading && filtered.length === 0 && query && (
            <p className="text-center text-sm text-[#333] pt-4">No projects match &ldquo;{query}&rdquo;</p>
          )}
          {!loading && projects.length === 0 && (
            <div className="text-center pt-6 space-y-3">
              <p className="text-[#333] text-sm">No projects yet</p>
              <Link href="/welcome"
                className="inline-block bg-white hover:bg-gray-100 text-black text-sm font-medium px-5 py-2 rounded-[10px] transition-colors">
                Build your first app
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
