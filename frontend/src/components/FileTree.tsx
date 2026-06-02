"use client";
import { type ProjectFile } from "@/lib/api";

interface Props {
  files: ProjectFile[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
}

function buildTree(files: ProjectFile[]): Record<string, string[]> {
  const dirs: Record<string, string[]> = { "": [] };
  for (const f of files) {
    const parts = f.file_path.split("/");
    if (parts.length === 1) {
      dirs[""].push(f.file_path);
    } else {
      const dir = parts.slice(0, -1).join("/");
      if (!dirs[dir]) dirs[dir] = [];
      dirs[dir].push(f.file_path);
    }
  }
  return dirs;
}

export default function FileTree({ files, selectedPath, onSelect }: Props) {
  const publicFiles = files.filter((f) => !f.file_path.startsWith("_meta/"));
  const sorted = [...publicFiles].sort((a, b) => a.file_path.localeCompare(b.file_path));

  return (
    <div className="text-sm font-mono">
      {sorted.map((f) => {
        const parts = f.file_path.split("/");
        const name = parts[parts.length - 1];
        const indent = (parts.length - 1) * 12;
        const isSelected = f.file_path === selectedPath;
        return (
          <button
            key={f.file_path}
            onClick={() => onSelect(f.file_path)}
            className={`w-full text-left px-3 py-1 rounded transition-colors truncate ${
              isSelected
                ? "bg-violet-600/20 text-violet-300"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
            style={{ paddingLeft: `${12 + indent}px` }}
            title={f.file_path}
          >
            {name}
          </button>
        );
      })}
    </div>
  );
}
