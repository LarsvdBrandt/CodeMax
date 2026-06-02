"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { listProjects, deleteProject, ApiError, type Project } from "@/lib/api";

const STATUS_COLORS: Record<string, string> = {
  idle: "bg-gray-600",
  building: "bg-yellow-500 animate-pulse",
  ready: "bg-green-500",
  error: "bg-red-500",
};

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      router.replace("/login");
      return;
    }
    fetchProjects();
  }, [router]);

  async function fetchProjects() {
    try {
      const data = await listProjects();
      setProjects(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login");
      }
      // non-401 errors: stay on the page, projects just won't load
    } finally {
      setLoading(false);
    }
  }


  function handleLogout() {
    localStorage.removeItem("token");
    router.push("/login");
  }

  async function handleDelete(projectId: string) {
    if (!confirm("Delete this project? This cannot be undone.")) return;
    setDeleting(projectId);
    try {
      await deleteProject(projectId);
      setProjects(ps => ps.filter(p => p.id !== projectId));
      setMenuOpen(null);
    } catch (err) {
      console.error("Delete failed", err);
    } finally {
      setDeleting(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[#888]">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-[#222] px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">CodeMax</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/welcome"
            className="bg-white hover:bg-gray-100 text-black text-sm rounded-[10px] px-4 py-2 transition-colors inline-block"
          >
            New project
          </Link>
          <button
            onClick={handleLogout}
            className="text-[#888] hover:text-white text-sm transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {projects.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-[#555] text-lg mb-4">No projects yet</p>
            <Link
              href="/welcome"
              className="bg-white hover:bg-gray-100 text-black text-sm rounded-[10px] px-6 py-2.5 transition-colors inline-block"
            >
              Build your first app
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <div
                key={p.id}
                className="relative group"
              >
                <Link
                  href={`/project/${p.id}`}
                  className="block bg-[#111] border border-[#222] rounded-[15px] p-5 hover:border-white/40 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h2 className="font-medium group-hover:text-white transition-colors">{p.name}</h2>
                    <span
                      className={`mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0 ${STATUS_COLORS[p.status] ?? "bg-gray-600"}`}
                      title={p.status}
                    />
                  </div>
                  <p className="text-sm text-[#888] line-clamp-2">{p.description}</p>
                  <p className="text-xs text-[#444] mt-4">
                    {new Date(p.updated_at).toLocaleDateString()}
                  </p>
                </Link>

                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setMenuOpen(menuOpen === p.id ? null : p.id);
                  }}
                  className="absolute top-3 right-3 text-[#444] hover:text-white opacity-0 group-hover:opacity-100 transition-all p-1 rounded-[6px] hover:bg-[#1a1a1a]"
                  title="Delete project"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="5" r="1" />
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="12" cy="19" r="1" />
                  </svg>
                </button>

                {/* Dropdown menu */}
                {menuOpen === p.id && (
                  <div className="absolute top-10 right-0 bg-[#1a1a1a] border border-[#2a2a2a] rounded-[10px] shadow-xl z-10 overflow-hidden min-w-[140px]">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleDelete(p.id);
                      }}
                      disabled={deleting === p.id}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                    >
                      {deleting === p.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

    </div>
  );
}
