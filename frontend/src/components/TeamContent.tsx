"use client";
import { useState, useEffect, useCallback } from "react";
import {
  listMembers, inviteMember, removeMember, updateMemberRole,
  type ProjectMember, type MemberRole,
} from "@/lib/api";
import RoleBadge from "./RoleBadge";

interface Props {
  projectId: string;
  projectName: string;
  myRole: string;
}

const ROLES: { value: MemberRole; label: string }[] = [
  { value: "observer", label: "Observer (Recruit)" },
  { value: "maintainer", label: "Maintainer (Corporal)" },
  { value: "admin", label: "Admin (Colonel)" },
];

export default function TeamContent({ projectId, projectName, myRole }: Props) {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("observer");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const canManage = myRole === "owner" || myRole === "admin";
  const isOwner = myRole === "owner";

  const load = useCallback(() => {
    setLoading(true);
    listMembers(projectId).then(setMembers).catch(console.error).finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setInviting(true);
    setError("");
    setInviteLink(null);
    try {
      const member = await inviteMember(projectId, email.trim(), role);
      const token = member.invite_token ?? "";
      const emailParam = encodeURIComponent(member.invite_email ?? "");
      const link = `${window.location.origin}/invite/${token}?email=${emailParam}`;
      setInviteLink(link);
      // Also send invite email (fire-and-forget, link is shown as fallback)
      await fetch("/api/send-invite", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email: member.invite_email, projectName, role }),
      }).catch(() => {});
      setEmail("");
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to invite");
    } finally {
      setInviting(false);
    }
  }

  function copyLink() {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleRemove(memberId: string) {
    await removeMember(projectId, memberId).catch(console.error);
    load();
  }

  async function handleRoleChange(memberId: string, newRole: MemberRole) {
    await updateMemberRole(projectId, memberId, newRole).catch(console.error);
    load();
  }

  return (
    <div className="space-y-5">
      {/* Invite form */}
      {canManage && (
        <form onSubmit={handleInvite} className="space-y-3">
          <div className="text-xs font-medium text-[#888] uppercase tracking-wider">Invite member</div>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="flex-1 bg-[#111] border border-[#222] rounded-[10px] px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#333] transition-colors"
            />
            <select
              value={role}
              onChange={e => setRole(e.target.value as MemberRole)}
              className="bg-[#111] border border-[#222] rounded-[10px] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#333] transition-colors"
            >
              {ROLES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={inviting || !email.trim()}
            className="w-full py-2 rounded-[10px] bg-white text-black text-sm font-semibold hover:bg-[#e0e0e0] transition-colors disabled:opacity-40"
          >
            {inviting ? "Sending invite..." : "Send Invite"}
          </button>
        </form>
      )}

      {/* Invite link — shown after a successful invite */}
      {inviteLink && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-[#888] uppercase tracking-wider">Invite link</div>
          <div className="flex items-center gap-2 bg-[#111] border border-[#1e1e1e] rounded-[10px] px-3 py-2">
            <span className="flex-1 text-xs text-[#666] font-mono truncate">{inviteLink}</span>
            <button
              onClick={copyLink}
              className="shrink-0 text-xs text-[#555] hover:text-white transition-colors px-2 py-0.5 rounded-[6px] hover:bg-[#1a1a1a]"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="text-[11px] text-[#444]">Share this link with the invitee. An email was also sent if SMTP is configured.</p>
        </div>
      )}

      {/* Member list */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-[#888] uppercase tracking-wider">Members</div>
        {loading ? (
          <p className="text-xs text-[#555]">Loading...</p>
        ) : members.length === 0 ? (
          <p className="text-xs text-[#555]">No team members yet.</p>
        ) : (
          members.map(member => (
            <div key={member.id} className="flex items-center gap-3 p-3 bg-[#111] border border-[#1a1a1a] rounded-[10px]">
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white truncate">{member.invite_email}</div>
                {member.status === "pending" && (
                  <div className="text-xs text-[#555] mt-0.5">Invite pending</div>
                )}
              </div>
              <RoleBadge role={member.role} />
              {isOwner && (
                <div className="flex items-center gap-1 shrink-0">
                  <select
                    value={member.role}
                    onChange={e => handleRoleChange(member.id, e.target.value as MemberRole)}
                    className="text-xs bg-[#1a1a1a] border border-[#222] rounded-[6px] px-1.5 py-1 text-[#888] focus:outline-none"
                  >
                    {ROLES.map(r => (
                      <option key={r.value} value={r.value}>{r.label.split(" ")[0]}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleRemove(member.id)}
                    className="p-1 text-[#555] hover:text-red-400 transition-colors"
                    title="Remove member"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
