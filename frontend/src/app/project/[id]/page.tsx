"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  getProject,
  getProjectStatus,
  listFiles,
  sendPrompt,
  retryProject,
  ApiError,
  type Project,
  type ProjectFile,
  type ProjectStatus,
} from "@/lib/api";
import FileTree from "@/components/FileTree";
import AgentLog from "@/components/AgentLog";

const STATUS_LABELS: Record<string, string> = {
  idle: "Idle",
  building: "Building...",
  ready: "Ready",
  error: "Error",
};

const STATUS_COLORS: Record<string, string> = {
  idle: "text-gray-400",
  building: "text-yellow-400",
  ready: "text-green-400",
  error: "text-red-400",
};

export default function ProjectPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [statusData, setStatusData] = useState<ProjectStatus | null>(null);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedContent, setSelectedContent] = useState<string>("");
  const [prompt, setPrompt] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const s = await getProjectStatus(id);
      setStatusData(s);
      if (s.status === "ready" || s.status === "error") {
        if (pollRef.current) clearInterval(pollRef.current);
        // Refresh files after build completes
        const updatedFiles = await listFiles(id);
        setFiles(updatedFiles);
      }
    } catch {
      // ignore transient errors
    }
  }, [id]);

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      router.replace("/login");
      return;
    }

    async function init() {
      try {
        const [proj, status, fileList] = await Promise.all([
          getProject(id),
          getProjectStatus(id),
          listFiles(id),
        ]);
        setProject(proj);
        setStatusData(status);
        setFiles(fileList);

        if (status.status === "building") {
          pollRef.current = setInterval(fetchStatus, 2000);
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
        }
      }
    }

    init();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [id, router, fetchStatus]);

  useEffect(() => {
    if (statusData?.status === "building") {
      if (!pollRef.current) {
        pollRef.current = setInterval(fetchStatus, 2000);
      }
    } else {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
  }, [statusData?.status, fetchStatus]);

  function handleFileSelect(path: string) {
    setSelectedFile(path);
    const f = files.find((f) => f.file_path === path);
    setSelectedContent(f?.content ?? "");
  }

  async function handleSendPrompt(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;
    setError("");
    setSending(true);
    try {
      await sendPrompt(id, prompt);
      setPrompt("");
      setStatusData((s) => s ? { ...s, status: "building" } : s);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send prompt");
    } finally {
      setSending(false);
    }
  }

  async function handleRetry() {
    setError("");
    try {
      await retryProject(id);
      setStatusData((s) => s ? { ...s, status: "building" } : s);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to retry");
    }
  }

  const isBuilding = statusData?.status === "building";
  const previewPort = statusData?.preview_port ?? project?.preview_port;
  const taskLog = statusData?.task?.agent_log ?? [];
  const taskStatus = statusData?.task?.status ?? "";

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 px-4 py-3 flex items-center gap-4 flex-shrink-0">
        <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors text-sm">
          ← Dashboard
        </Link>
        <span className="text-gray-700">|</span>
        <h1 className="font-semibold truncate">{project?.name ?? "Loading..."}</h1>
        <span className={`text-sm ml-auto ${STATUS_COLORS[statusData?.status ?? "idle"]}`}>
          {STATUS_LABELS[statusData?.status ?? "idle"]}
        </span>
        {statusData?.status === "error" && (
          <button
            onClick={handleRetry}
            className="text-sm text-red-400 hover:text-white border border-red-800 hover:border-red-400 rounded px-3 py-1 transition-colors"
          >
            Retry
          </button>
        )}
      </header>

      {/* Body — three columns */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left — file tree */}
        <div className="w-52 border-r border-gray-800 overflow-y-auto flex-shrink-0 py-3">
          <p className="text-xs text-gray-600 px-3 mb-2 uppercase tracking-wider">Files</p>
          {files.length === 0 ? (
            <p className="text-xs text-gray-600 px-3">No files yet</p>
          ) : (
            <FileTree files={files} selectedPath={selectedFile} onSelect={handleFileSelect} />
          )}
        </div>

        {/* Middle — code viewer */}
        <div className="flex-1 overflow-hidden flex flex-col border-r border-gray-800">
          {selectedFile ? (
            <>
              <div className="border-b border-gray-800 px-4 py-2 text-xs text-gray-500 font-mono">
                {selectedFile}
              </div>
              <pre className="flex-1 overflow-auto p-4 text-sm font-mono text-gray-300 leading-relaxed whitespace-pre-wrap">
                {selectedContent}
              </pre>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
              Select a file to view its contents
            </div>
          )}
        </div>

        {/* Right — preview + prompt */}
        <div className="w-96 flex flex-col flex-shrink-0">
          {/* Preview iframe */}
          <div className="flex-1 bg-white overflow-hidden">
            {previewPort && statusData?.status === "ready" ? (
              <iframe
                src={`http://localhost:8080/preview/${id}/`}
                className="w-full h-full border-0"
                title="App preview"
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center bg-gray-900 text-gray-500 text-sm gap-2">
                {isBuilding ? (
                  <>
                    <span className="animate-spin text-2xl">⟳</span>
                    <span>Building your app...</span>
                  </>
                ) : (
                  <span>Preview will appear here once ready</span>
                )}
              </div>
            )}
          </div>

          {/* Agent log */}
          {taskLog.length > 0 && (
            <div className="border-t border-gray-800 p-3 max-h-40 overflow-y-auto bg-gray-950">
              <AgentLog log={taskLog} taskStatus={taskStatus} />
            </div>
          )}

          {/* Prompt input */}
          <div className="border-t border-gray-800 p-3 bg-gray-950">
            {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
            <form onSubmit={handleSendPrompt} className="flex gap-2">
              <input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={sending || isBuilding}
                placeholder="Describe a change..."
                className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={sending || isBuilding || !prompt.trim()}
                className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap"
              >
                {sending ? "..." : "Send"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
