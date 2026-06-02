"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { generatePlan, createProject } from "@/lib/api";
import ProjectsSidebar from "@/components/ProjectsSidebar";

interface Message {
  role: "user" | "ai";
  content: string;
  typed?: boolean; // whether this message should animate in
}

type Phase = "initial" | "planning" | "review" | "refining" | "executing";

function parseIntent(text: string): "yes" | "no" | "restart" | "unknown" {
  const t = text.toLowerCase().trim();
  if (/\b(yes|yeah|yep|sure|go|do it|execute|build it|let's go|sounds good|ok|okay|proceed|absolutely|start)\b/.test(t)) return "yes";
  if (/\b(restart|start over|new idea|begin again|reset)\b/.test(t)) return "restart";
  if (/\b(no|nope|change|refine|adjust|modify|different|update|tweak|not quite|instead|actually|but)\b/.test(t)) return "no";
  return "unknown";
}

// Typewriter for a single AI message
function TypedText({ text, speed = 8 }: { text: string; speed?: number }) {
  const [shown, setShown] = useState(0);
  const chunkSize = text.length > 400 ? 3 : 1;

  useEffect(() => {
    setShown(0);
  }, [text]);

  useEffect(() => {
    if (shown >= text.length) return;
    const t = setTimeout(() => setShown(s => Math.min(s + chunkSize, text.length)), speed);
    return () => clearTimeout(t);
  }, [shown, text, chunkSize, speed]);

  return (
    <span className="whitespace-pre-wrap">
      {text.slice(0, shown)}
      {shown < text.length && (
        <span className="inline-block w-[2px] h-[14px] bg-[#666] align-middle ml-0.5"
          style={{ animation: "blink 0.7s step-end infinite" }} />
      )}
    </span>
  );
}

export default function WelcomePage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("initial");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [originalRequest, setOriginalRequest] = useState("");
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasMessages = messages.length > 0;

  useEffect(() => {
    if (!localStorage.getItem("token")) router.replace("/login");
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function addAiMessage(content: string) {
    setMessages(m => [...m, { role: "ai", content, typed: true }]);
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput("");
    setError("");

    if (phase === "initial") {
      setMessages([{ role: "user", content: text }]);
      setOriginalRequest(text);
      setLoading(true);
      setPhase("planning");
      try {
        const { plan } = await generatePlan(text);
        setPhase("review");
        setMessages(m => [...m, {
          role: "ai",
          content: `${plan}\n\nShould I execute this plan?`,
          typed: true,
        }]);
      } catch {
        setError("Failed to generate plan. Please try again.");
        setPhase("initial");
      } finally {
        setLoading(false);
      }
      return;
    }

    setMessages(m => [...m, { role: "user", content: text }]);
    const intent = parseIntent(text);

    if (phase === "review") {
      if (intent === "yes") {
        setPhase("executing");
        setLoading(true);
        try {
          const name = originalRequest.slice(0, 40).replace(/[^a-zA-Z0-9\s]/g, "").trim() || "My App";
          const { project_id } = await createProject(name, originalRequest);
          addAiMessage("Creating your project now...");
          router.push(`/project/${project_id}`);
        } catch {
          setError("Failed to create project. Please try again.");
          setPhase("review");
        } finally {
          setLoading(false);
        }
      } else if (intent === "restart") {
        setPhase("initial");
        setMessages([]);
        setOriginalRequest("");
      } else {
        setPhase("refining");
        addAiMessage("What would you like to change about the plan?");
      }
      return;
    }

    if (phase === "refining") {
      setLoading(true);
      try {
        const refinedRequest = `Original: ${originalRequest}\n\nFeedback: ${text}\n\nPlease update the plan based on this feedback.`;
        const { plan } = await generatePlan(refinedRequest);
        setPhase("review");
        addAiMessage(`${plan}\n\nShould I execute this plan?`);
      } catch {
        setError("Failed to refine plan. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleReset() {
    setPhase("initial");
    setMessages([]);
    setOriginalRequest("");
    setInput("");
    setError("");
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-black text-white overflow-hidden px-6">

      <ProjectsSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Top-left icons */}
      <div className="absolute top-4 left-4 flex items-center gap-1 z-10">
        <button onClick={() => setSidebarOpen(true)} title="All projects"
          className="p-2 rounded-[10px] bg-[#0d0d0d] border border-[#1e1e1e] text-[#555] hover:text-white transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 12h16M4 18h7" />
          </svg>
        </button>
        <button onClick={handleReset} title="New project"
          className="p-2 rounded-[10px] bg-[#0d0d0d] border border-[#1e1e1e] text-[#555] hover:text-white transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      </div>

      {/* Central card — same position always */}
      <div className="w-full max-w-xl flex flex-col gap-5">

        {/* Title — fades out once messages appear */}
        <h1
          className="text-3xl font-bold tracking-tight text-center transition-all duration-500"
          style={{ opacity: hasMessages ? 0 : 1, height: hasMessages ? 0 : undefined, overflow: "hidden", marginBottom: hasMessages ? 0 : undefined }}
        >
          Let&apos;s start Codemaxing
        </h1>

        {/* Messages — appear above input, same max-width as card */}
        {hasMessages && (
          <div className="max-h-[55vh] overflow-y-auto space-y-4 pr-1">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[90%] text-sm leading-relaxed rounded-[15px] px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-[#1a1a1a] text-white border border-[#2a2a2a] rounded-tr-[4px]"
                    : "text-[#bbb] rounded-tl-[4px]"
                }`}>
                  {msg.role === "ai" && msg.typed
                    ? <TypedText text={msg.content} />
                    : <span className="whitespace-pre-wrap">{msg.content}</span>
                  }
                </div>
              </div>
            ))}

            {/* Typing indicator while loading */}
            {loading && (
              <div className="flex justify-start px-1">
                <div className="flex gap-1 items-center py-2">
                  {[0, 1, 2].map(i => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#333]"
                      style={{ animation: `typingBounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input card — no border-t, same box always */}
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-[15px] overflow-hidden focus-within:border-[#2a2a2a] transition-colors">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading || phase === "executing"}
              placeholder={
                phase === "initial"  ? "Describe your awesome project" :
                phase === "review"   ? "Say yes to build, or tell me what to change..." :
                phase === "refining" ? "What would you like to change?" :
                "..."
              }
              rows={3}
              className="w-full bg-transparent px-4 pt-4 pb-2 text-sm resize-none focus:outline-none disabled:opacity-40 placeholder-[#2a2a2a] text-white"
            />
            <div className="flex items-center justify-between px-4 pb-3 pt-1">
              <button type="button" className="text-[#333] hover:text-[#666] transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-[#2a2a2a] flex items-center gap-1 select-none">
                  GPT-4o
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
                <button type="submit" disabled={!input.trim() || loading || phase === "executing"}
                  className="text-[#444] hover:text-white disabled:opacity-30 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes typingBounce {
          0%, 100% { transform: translateY(0); opacity: 0.3; }
          50%       { transform: translateY(-4px); opacity: 1; }
        }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>
    </div>
  );
}
