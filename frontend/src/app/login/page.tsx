"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error: signInError } = await authClient.signIn.email({ email, password });
      if (signInError) {
        setError(signInError.message ?? "Login failed");
        return;
      }
      // Get HS256 JWT for Spring Boot API calls
      const res = await fetch("/api/get-api-token", { credentials: "include" });
      if (res.ok) {
        const { token } = await res.json();
        localStorage.setItem("token", token);
      }
      router.push("/dashboard");
    } catch {
      setError("Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-8 text-center">Sign in to CodeMax</h1>
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
          <div>
            <label className="block text-sm font-medium text-[#888] mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <div className="flex justify-between items-center mt-6">
          <p className="text-sm text-[#555]">
            No account?{" "}
            <Link href="/register" className="text-white hover:underline">
              Create one
            </Link>
          </p>
          <Link href="/forgot-password" className="text-sm text-[#555] hover:text-white">
            Forgot password?
          </Link>
        </div>
      </div>
    </div>
  );
}
