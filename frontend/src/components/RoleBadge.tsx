import type { MemberRole } from "@/lib/api";

interface Props {
  role: MemberRole | "none";
  size?: "sm" | "md";
}

export default function RoleBadge({ role, size = "sm" }: Props) {
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";

  if (role === "owner") {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-yellow-500/10 border border-yellow-500/30 ${textSize} font-semibold text-yellow-400 shrink-0`}>
        <span className="text-yellow-300">♛</span>
        Commander
      </span>
    );
  }

  if (role === "admin") {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-500/10 border border-orange-500/30 ${textSize} font-semibold text-orange-400 shrink-0`}>
        <AdminInsignia />
        Colonel
      </span>
    );
  }

  if (role === "maintainer") {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/30 ${textSize} font-semibold text-blue-400 shrink-0`}>
        <MaintainerInsignia />
        Corporal
      </span>
    );
  }

  // observer / none
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md bg-[#1a1a1a] border border-[#2a2a2a] ${textSize} font-medium text-[#666] shrink-0`}>
      Recruit
    </span>
  );
}

function AdminInsignia() {
  return (
    <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
      <rect x="0" y="0" width="14" height="2" rx="1" fill="#f97316" />
      <rect x="0" y="4" width="14" height="2" rx="1" fill="#f97316" />
      <rect x="0" y="8" width="14" height="2" rx="1" fill="#f97316" />
    </svg>
  );
}

function MaintainerInsignia() {
  return (
    <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
      <path d="M6 0L12 5L6 10" stroke="#60a5fa" strokeWidth="2" strokeLinejoin="round" fill="none" />
      <path d="M0 0L6 5L0 10" stroke="#60a5fa" strokeWidth="2" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
