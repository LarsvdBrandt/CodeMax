"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { acceptInvite } from "@/lib/api";

function SetupForm() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const searchParams = useSearchParams();
  const token = params.token;
  const emailFromUrl = searchParams.get("email") ?? "";

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // If already logged in, skip setup and accept directly
  useEffect(() => {
    authClient.getSession().then(({ data: session }) => {
      if (!session) return;
      acceptInvite(token)
        .then((member) => router.replace(`/project/${member.project_id}`))
        .catch((err) => setError(err?.message ?? "Failed to accept invite."));
    });
  }, [token, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!emailFromUrl) { setError("Missing email in invite link."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    setError("");

    try {
      // 1. Create account with the invited email
      const { error: signUpError } = await authClient.signUp.email({
        email: emailFromUrl,
        password,
        name: emailFromUrl,
      });
      if (signUpError) {
        // Account might already exist — try signing in instead
        const { error: signInError } = await authClient.signIn.email({
          email: emailFromUrl,
          password,
        });
        if (signInError) {
          setError(signInError.message ?? "Sign-in failed. Check your password.");
          setLoading(false);
          return;
        }
      }

      // 2. Get HS256 JWT for the Spring Boot API
      const res = await fetch("/api/get-api-token", { credentials: "include" });
      if (res.ok) {
        const { token: jwt } = await res.json();
        localStorage.setItem("token", jwt);
      }

      // 3. Accept the invite
      const member = await acceptInvite(token);
      router.replace(`/project/${member.project_id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-2xl font-bold mb-2 text-center">Set up your account</h1>
      <p className="text-sm text-[#555] mb-8 text-center">
        You&apos;ve been invited to collaborate on a project.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#888] mb-1">Email</label>
          <input
            type="email"
            value={emailFromUrl}
            readOnly
            className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-[10px] px-3 py-2 text-sm text-[#666] cursor-not-allowed"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#888] mb-1">Choose a password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoFocus
            placeholder="At least 8 characters"
            className="w-full bg-[#111] border border-[#2a2a2a] rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
          />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading || !emailFromUrl}
          className="w-full bg-white hover:bg-gray-100 disabled:opacity-50 text-black rounded-[10px] px-4 py-2 text-sm font-medium transition-colors"
        >
          {loading ? "Setting up..." : "Create account & join project"}
        </button>
      </form>

      <p className="text-center text-sm text-[#555] mt-6">
        Already have an account?{" "}
        <a
          href={`/login?redirect=/invite/${token}`}
          className="text-white hover:underline"
        >
          Sign in
        </a>
      </p>
    </div>
  );
}

export default function InviteSetupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-black text-white">
      <Suspense fallback={<p className="text-[#555] text-sm">Loading...</p>}>
        <SetupForm />
      </Suspense>
    </div>
  );
}
