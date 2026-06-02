"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { updateFile } from "@/lib/api";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center text-[#333] text-sm">
      Loading editor...
    </div>
  ),
});

const LANG_MAP: Record<string, string> = {
  js: "javascript", jsx: "javascript",
  ts: "typescript", tsx: "typescript",
  css: "css", scss: "scss",
  json: "json", md: "markdown",
  html: "html", yaml: "yaml", yml: "yaml",
  sh: "shell", env: "plaintext",
};

function getLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return LANG_MAP[ext] ?? "plaintext";
}

interface Props {
  projectId: string;
  filePath: string;
  initialContent: string;
  onSaved?: (newContent: string) => void;
}

export default function CodeEditor({ projectId, filePath, initialContent, onSaved }: Props) {
  const [content, setContent]           = useState(initialContent);
  const [isDirty, setIsDirty]           = useState(false);
  const [saving, setSaving]             = useState(false);
  const [savedBriefly, setSavedBriefly] = useState(false);
  const originalRef = useRef(initialContent);

  // Reset when file changes
  useEffect(() => {
    setContent(initialContent);
    setIsDirty(false);
    setSavedBriefly(false);
    originalRef.current = initialContent;
  }, [filePath, initialContent]);

  function handleChange(value: string | undefined) {
    const v = value ?? "";
    setContent(v);
    setIsDirty(v !== originalRef.current);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateFile(projectId, filePath, content);
      originalRef.current = content;
      setIsDirty(false);
      setSavedBriefly(true);
      onSaved?.(content);
      setTimeout(() => setSavedBriefly(false), 2000);
    } catch (e) {
      console.error("Save failed", e);
    } finally {
      setSaving(false);
    }
  }

  // Ctrl/Cmd + S to save
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (isDirty) handleSave();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const lang = getLanguage(filePath);
  const parts = filePath.split("/");

  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumb + save */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#1a1a1a] bg-[#080808] flex-shrink-0">
        <div className="flex items-center gap-1 text-xs font-mono text-[#444] min-w-0">
          {parts.map((part, i) => (
            <span key={i} className="flex items-center gap-1 min-w-0">
              {i > 0 && <span className="text-[#2a2a2a]">/</span>}
              <span className={i === parts.length - 1 ? "text-[#888]" : ""}>{part}</span>
            </span>
          ))}
          {isDirty && <span className="ml-2 w-1.5 h-1.5 rounded-full bg-white/40 flex-shrink-0" title="Unsaved changes" />}
        </div>

        <button
          onClick={handleSave}
          disabled={!isDirty || saving}
          className={`flex items-center gap-1.5 text-[11px] px-3 py-1 rounded-[8px] border transition-all flex-shrink-0 ml-4 ${
            savedBriefly
              ? "border-green-500/40 text-green-400 bg-green-500/10"
              : isDirty
              ? "border-[#333] text-white bg-[#1a1a1a] hover:bg-[#222]"
              : "border-[#1a1a1a] text-[#2a2a2a] cursor-default"
          }`}
        >
          {saving ? (
            <>
              <span className="w-2.5 h-2.5 border border-[#444] border-t-[#888] rounded-full"
                style={{ animation: "spin 0.8s linear infinite" }} />
              Saving
            </>
          ) : savedBriefly ? (
            <>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Saved
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              Save
            </>
          )}
        </button>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <MonacoEditor
          height="100%"
          language={lang}
          value={content}
          onChange={handleChange}
          theme="vs-dark"
          options={{
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace",
            fontLigatures: true,
            lineHeight: 22,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            renderLineHighlight: "gutter",
            padding: { top: 16, bottom: 16 },
            smoothScrolling: true,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            bracketPairColorization: { enabled: true },
            guides: { bracketPairs: true },
            tabSize: 2,
            wordWrap: "on",
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            scrollbar: {
              verticalScrollbarSize: 6,
              horizontalScrollbarSize: 6,
            },
          }}
        />
      </div>

      <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>
    </div>
  );
}
