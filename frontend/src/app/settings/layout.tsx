"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { getMe, type UserProfile } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

function initials(user: UserProfile | null) {
  if (user?.full_name) return user.full_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  if (user?.email) return user.email[0].toUpperCase();
  return "?";
}

const NAV = [
  { label: "Personal information", href: "/settings/profile",       section: "Account" },
  { label: "Security",             href: "/settings/security",      section: "Account" },
  { label: "Company information",  href: "/settings/company",       section: "Workspace" },
  { label: "API keys",             href: "/settings/api-keys",      section: "Workspace" },
  { label: "Notifications",        href: "/settings/notifications", section: "Workspace" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!localStorage.getItem("token")) { router.replace("/login"); return; }
    getMe().then(setUser).catch(() => {});
  }, [router]);

  async function logout() {
    localStorage.removeItem("token");
    await authClient.signOut();
    router.push("/login");
  }

  const sections = [...new Set(NAV.map(n => n.section))];

  return (
    <div className="h-screen flex bg-black text-white overflow-hidden p-2 gap-2">
      {/* Sidebar — same floating card style as chat sidebar */}
      <div className="w-[420px] flex-shrink-0 flex flex-col bg-[#0d0d0d] border border-[#222] rounded-[15px] overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#1e1e1e] flex-shrink-0">
          <Link href="/dashboard"
            className="p-1.5 text-[#444] hover:text-white transition-colors rounded-[8px] hover:bg-[#1a1a1a] flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <span className="font-medium text-sm text-white">Settings</span>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto py-3 px-2">
          {sections.map(section => (
            <div key={section} className="mb-4">
              <p className="text-[10px] text-[#333] uppercase tracking-widest px-3 mb-1.5 font-semibold">{section}</p>
              {NAV.filter(n => n.section === section).map(item => (
                <Link key={item.href} href={item.href}
                  className={`flex items-center px-3 py-2.5 text-sm rounded-[10px] transition-colors ${
                    pathname === item.href
                      ? "bg-[#1a1a1a] text-white"
                      : "text-[#666] hover:text-white hover:bg-[#111]"
                  }`}>
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </div>

        {/* User footer */}
        <div className="border-t border-[#1e1e1e] flex-shrink-0">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
              {initials(user)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{user?.full_name || user?.email || "..."}</p>
              {user?.full_name && <p className="text-xs text-[#444] truncate">{user.email}</p>}
            </div>
          </div>
          <button onClick={logout}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#555] hover:text-red-400 hover:bg-[#111] transition-colors mb-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Log out
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-[#0a0a0a] border border-[#222] rounded-[15px]">
        {children}
      </div>
    </div>
  );
}
