"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { acceptInvite } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";

export default function InvitePage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const searchParams = useSearchParams();
  const token = params.token;
  const email = searchParams.get("email") ?? "";

  const [status, setStatus] = useState<"checking" | "accepting" | "success" | "error">("checking");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid invite link.");
      return;
    }

    authClient.getSession().then(({ data: session }) => {
      if (!session) {
        // Not logged in — send to setup page (pre-fills email + sets password)
        const emailParam = email ? `?email=${encodeURIComponent(email)}` : "";
        router.replace(`/invite/${token}/setup${emailParam}`);
        return;
      }

      // Logged in — accept immediately
      setStatus("accepting");
      acceptInvite(token)
        .then((member) => {
          setStatus("success");
          setTimeout(() => router.replace(`/project/${member.project_id}`), 1500);
        })
        .catch((err) => {
          setStatus("error");
          setMessage(err?.message ?? "Failed to accept invite.");
        });
    });
  }, [token, email, router]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-black text-white">
      <div className="w-full max-w-sm text-center space-y-4">
        <div className="text-2xl font-bold mb-8">Project Invitation</div>

        {status === "checking" && (
          <p className="text-[#888]">Checking your session...</p>
        )}
        {status === "accepting" && (
          <p className="text-[#888]">Accepting invitation...</p>
        )}
        {status === "success" && (
          <p className="text-green-400">Invitation accepted! Redirecting to project...</p>
        )}
        {status === "error" && (
          <>
            <p className="text-red-400">{message}</p>
            <Link href="/dashboard" className="text-white hover:underline text-sm">Go to dashboard</Link>
          </>
        )}
      </div>
    </div>
  );
}
