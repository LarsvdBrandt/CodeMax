"use client";
import { type ProjectFile } from "@/lib/api";

interface Props {
  files: ProjectFile[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
}

export default function FileTree({ files, selectedPath, onSelect }: Props) {
  const publicFiles = [...files.filter(f => !f.file_path.startsWith("_meta/"))]
    .sort((a, b) => a.file_path.localeCompare(b.file_path));

  return (
    <div className="text-xs font-mono">
      {publicFiles.map((f) => {
        const parts = f.file_path.split("/");
        const name = parts[parts.length - 1];
        const indent = (parts.length - 1) * 10;
        const isSelected = f.file_path === selectedPath;
        return (
          <button
            key={f.file_path}
            onClick={() => onSelect(f.file_path)}
            className={`w-full text-left py-1 rounded-[6px] transition-colors truncate ${
              isSelected ? "bg-[#1e1e1e] text-white" : "text-[#555] hover:text-[#aaa] hover:bg-[#111]"
            }`}
            style={{ paddingLeft: `${12 + indent}px`, paddingRight: "12px" }}
            title={f.file_path}
          >
            {name}
          </button>
        );
      })}
    </div>
  );
}
