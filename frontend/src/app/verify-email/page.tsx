"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid or missing verification token.");
      return;
    }
    fetch(`/auth/verify-email?token=${encodeURIComponent(token)}`, {
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setStatus("error");
          setMessage(data.message ?? "Verification failed.");
        } else {
          setStatus("success");
          setTimeout(() => router.push("/dashboard"), 2000);
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Something went wrong.");
      });
  }, [token, router]);

  return (
    <div className="text-center space-y-4">
      {status === "verifying" && <p className="text-[#888]">Verifying your email...</p>}
      {status === "success" && (
        <p className="text-green-400">Email verified! Redirecting...</p>
      )}
      {status === "error" && (
        <>
          <p className="text-red-400">{message}</p>
          <Link href="/login" className="text-white hover:underline text-sm">Back to sign in</Link>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-8 text-center">Email Verification</h1>
        <Suspense fallback={<p className="text-[#888] text-center">Loading...</p>}>
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
