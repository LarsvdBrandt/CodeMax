"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { listProjects, createProject, ApiError, type Project } from "@/lib/api";

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
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");
    setCreating(true);
    try {
      await createProject(name, description);
      setShowModal(false);
      setName("");
      setDescription("");
      fetchProjects();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setCreating(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    router.push("/login");
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
          <button
            onClick={() => setShowModal(true)}
            className="bg-white hover:bg-gray-100 text-black text-sm rounded-[10px] px-4 py-2 transition-colors"
          >
            New project
          </button>
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
            <button
              onClick={() => setShowModal(true)}
              className="bg-white hover:bg-gray-100 text-black text-sm rounded-[10px] px-6 py-2.5 transition-colors"
            >
              Build your first app
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/project/${p.id}`}
                className="block bg-[#111] border border-[#222] rounded-[15px] p-5 hover:border-white/40 transition-colors group"
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
            ))}
          </div>
        )}
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[#111] border border-[#2a2a2a] rounded-[15px] p-6 w-full max-w-lg">
            <h2 className="text-lg font-semibold mb-5">New project</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#888] mb-1">App name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="My Todo App"
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#888] mb-1">
                  Describe the app you want to build
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={4}
                  placeholder="A todo list where you can add, complete, and delete tasks. Use a clean card-based layout with a purple accent color."
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 resize-none"
                />
              </div>
              {createError && <p className="text-red-400 text-sm">{createError}</p>}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-[#1a1a1a] hover:bg-gray-700 text-gray-300 rounded-[10px] px-4 py-2 text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-white hover:bg-gray-100 disabled:opacity-50 text-black rounded-[10px] px-4 py-2 text-sm font-medium transition-colors"
                >
                  {creating ? "Building..." : "Build it"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
