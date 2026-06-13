"use client";
import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/auth/request-password-reset", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, redirectTo: "/reset-password" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message ?? "Failed to send reset email");
        return;
      }
      setSent(true);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-2 text-center">Reset password</h1>
        {sent ? (
          <div className="text-center space-y-4 mt-6">
            <p className="text-[#888] text-sm">
              If an account with that email exists, we&apos;ve sent a reset link.
              Check your inbox.
            </p>
            <Link href="/login" className="text-white hover:underline text-sm">
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-[#555] mb-8 text-center">
              Enter your email and we&apos;ll send you a reset link.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#888] mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-[#111] border border-[#2a2a2a] rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white hover:bg-gray-100 disabled:opacity-50 text-black rounded-[10px] px-4 py-2 text-sm font-medium transition-colors"
              >
                {loading ? "Sending..." : "Send reset link"}
              </button>
            </form>
            <p className="text-center text-sm text-[#555] mt-6">
              <Link href="/login" className="text-white hover:underline">
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
