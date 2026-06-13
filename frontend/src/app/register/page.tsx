"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export default function RegisterPage() {
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
      const { error: signUpError } = await authClient.signUp.email({
        email,
        password,
        name: email,
      });
      if (signUpError) {
        setError(signUpError.message ?? "Registration failed");
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
      setError("Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-8 text-center">Create your account</h1>
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
              minLength={8}
              className="w-full bg-[#111] border border-[#2a2a2a] rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white hover:bg-gray-100 disabled:opacity-50 text-black rounded-[10px] px-4 py-2 text-sm font-medium transition-colors"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>
        <p className="text-center text-sm text-[#555] mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-white hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
