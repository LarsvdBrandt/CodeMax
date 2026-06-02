"use client";
import { useState } from "react";
import { type ProjectFile } from "@/lib/api";

// ─── File type icon ───────────────────────────────────────────────────────────
const FILE_ICONS: Record<string, { bg: string; color: string; label: string }> = {
  js:   { bg: "#f7df1e22", color: "#f7df1e", label: "JS" },
  jsx:  { bg: "#61dafb22", color: "#61dafb", label: "JSX" },
  ts:   { bg: "#3178c622", color: "#3178c6", label: "TS" },
  tsx:  { bg: "#3178c622", color: "#60a5fa", label: "TSX" },
  css:  { bg: "#2196f322", color: "#2196f3", label: "CSS" },
  scss: { bg: "#cc6699aa", color: "#cc6699", label: "SCSS" },
  json: { bg: "#f9a82522", color: "#f9a825", label: "{}" },
  md:   { bg: "#42a5f522", color: "#42a5f5", label: "MD" },
  html: { bg: "#e44d2622", color: "#e44d26", label: "HTML" },
  svg:  { bg: "#ffb30022", color: "#ffb300", label: "SVG" },
  png:  { bg: "#ab47bc22", color: "#ab47bc", label: "IMG" },
  jpg:  { bg: "#ab47bc22", color: "#ab47bc", label: "IMG" },
  gif:  { bg: "#ab47bc22", color: "#ab47bc", label: "GIF" },
  env:  { bg: "#66bb6a22", color: "#66bb6a", label: "ENV" },
  sh:   { bg: "#66bb6a22", color: "#66bb6a", label: "SH" },
};

function FileTypeIcon({ name }: { name: string }) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const icon = FILE_ICONS[ext];
  if (!icon) {
    return (
      <span className="w-[18px] h-[18px] rounded-[4px] flex items-center justify-center flex-shrink-0 text-[8px] font-bold"
        style={{ background: "#33333344", color: "#666" }}>
        {ext.slice(0, 2).toUpperCase() || "?"}
      </span>
    );
  }
  return (
    <span className="w-[18px] h-[18px] rounded-[4px] flex items-center justify-center flex-shrink-0 text-[8px] font-bold leading-none"
      style={{ background: icon.bg, color: icon.color }}>
      {icon.label}
    </span>
  );
}

function FolderIcon({ open }: { open: boolean }) {
  return (
    <svg className="w-[18px] h-[18px] flex-shrink-0" viewBox="0 0 20 20" fill="none">
      {open ? (
        <path d="M2 6a2 2 0 012-2h3.172a2 2 0 011.414.586l.828.828A2 2 0 0010.828 6H16a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
          fill="#e2b053" opacity="0.9" />
      ) : (
        <>
          <path d="M2 6a2 2 0 012-2h3.172a2 2 0 011.414.586l.828.828A2 2 0 0010.828 6H16a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
            fill="#e2b053" opacity="0.6" />
        </>
      )}
    </svg>
  );
}

// ─── Tree building ────────────────────────────────────────────────────────────
interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children: TreeNode[];
}

function buildTree(files: ProjectFile[]): TreeNode[] {
  const dirMap = new Map<string, TreeNode>();
  const root: TreeNode[] = [];

  const sorted = [...files]
    .filter(f => !f.file_path.startsWith("_meta/"))
    .sort((a, b) => a.file_path.localeCompare(b.file_path));

  for (const file of sorted) {
    const parts = file.file_path.split("/");
    let parentList = root;
    let pathSoFar = "";

    for (let i = 0; i < parts.length; i++) {
      pathSoFar = pathSoFar ? `${pathSoFar}/${parts[i]}` : parts[i];

      if (i === parts.length - 1) {
        parentList.push({ name: parts[i], path: file.file_path, isDir: false, children: [] });
      } else {
        let dir = dirMap.get(pathSoFar);
        if (!dir) {
          dir = { name: parts[i], path: pathSoFar, isDir: true, children: [] };
          dirMap.set(pathSoFar, dir);
          parentList.push(dir);
        }
        parentList = dir.children;
      }
    }
  }

  // Sort: folders first, then files
  function sortNodes(nodes: TreeNode[]): TreeNode[] {
    return nodes
      .sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
        return a.name.localeCompare(b.name);
      })
      .map(n => ({ ...n, children: sortNodes(n.children) }));
  }

  return sortNodes(root);
}

// ─── Tree node row ────────────────────────────────────────────────────────────
function TreeRow({
  node, depth, selectedPath, onSelect, defaultOpen,
}: {
  node: TreeNode;
  depth: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? depth === 0);

  if (node.isDir) {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center gap-1.5 py-[3px] pr-3 rounded-[6px] text-[#666] hover:text-[#aaa] hover:bg-[#111] transition-colors text-xs"
          style={{ paddingLeft: `${8 + depth * 14}px` }}
        >
          <svg className={`w-2.5 h-2.5 flex-shrink-0 transition-transform duration-100 ${open ? "rotate-90" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
          <FolderIcon open={open} />
          <span className="truncate">{node.name}</span>
        </button>
        {open && node.children.map(child => (
          <TreeRow key={child.path} node={child} depth={depth + 1} selectedPath={selectedPath} onSelect={onSelect} />
        ))}
      </div>
    );
  }

  const isSelected = node.path === selectedPath;
  return (
    <button
      onClick={() => onSelect(node.path)}
      className={`w-full flex items-center gap-1.5 py-[3px] pr-3 rounded-[6px] text-xs transition-colors ${
        isSelected ? "bg-[#1e1e1e] text-white" : "text-[#666] hover:text-[#aaa] hover:bg-[#111]"
      }`}
      style={{ paddingLeft: `${8 + depth * 14 + 10}px` }}
      title={node.path}
    >
      <FileTypeIcon name={node.name} />
      <span className="truncate">{node.name}</span>
    </button>
  );
}

// ─── Explorer root ────────────────────────────────────────────────────────────
interface Props {
  files: ProjectFile[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
}

export default function FileExplorer({ files, selectedPath, onSelect }: Props) {
  const tree = buildTree(files);

  if (files.length === 0) {
    return <p className="text-xs text-[#2a2a2a] px-3 py-2">No files yet</p>;
  }

  return (
    <div className="py-1.5 px-1">
      {tree.map(node => (
        <TreeRow key={node.path} node={node} depth={0} selectedPath={selectedPath} onSelect={onSelect} defaultOpen />
      ))}
    </div>
  );
}
