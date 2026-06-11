"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { generatePlan, createProject, getProjectQuestions, type Question } from "@/lib/api";
import ProjectsSidebar from "@/components/ProjectsSidebar";

interface Message {
  role: "user" | "ai";
  content: string;
  typed?: boolean;
}

type Phase = "initial" | "planning" | "review" | "refining" | "questions" | "executing";

function parseIntent(text: string): "yes" | "no" | "restart" | "unknown" {
  const t = text.toLowerCase().trim();
  if (/\b(yes|yeah|yep|sure|go|do it|execute|build it|let's go|sounds good|ok|okay|proceed|absolutely|start)\b/.test(t)) return "yes";
  if (/\b(restart|start over|new idea|begin again|reset)\b/.test(t)) return "restart";
  if (/\b(no|nope|change|refine|adjust|modify|different|update|tweak|not quite|instead|actually|but)\b/.test(t)) return "no";
  return "unknown";
}

function TypedText({ text, speed = 8 }: { text: string; speed?: number }) {
  const [shown, setShown] = useState(0);
  const chunkSize = text.length > 400 ? 3 : 1;
  useEffect(() => { setShown(0); }, [text]);
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

// ── Question components ──────────────────────────────────────────────────────

function TextQuestion({ q, value, onChange }: {
  q: Question; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-[#aaa]">{q.question}</p>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={q.placeholder ?? ""}
        className="w-full bg-[#111] border border-[#222] rounded-[10px] px-3 py-2 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#444] transition-colors"
      />
    </div>
  );
}

function QuickMenuQuestion({ q, value, onChange }: {
  q: Question; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-[#aaa]">{q.question}</p>
      <div className="flex flex-wrap gap-2">
        {q.options?.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 rounded-[8px] text-xs font-medium border transition-all ${
              value === opt.value
                ? "bg-white text-black border-white"
                : "bg-transparent text-[#888] border-[#2a2a2a] hover:border-[#444] hover:text-white"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ColorPickerQuestion({ q, value, onChange }: {
  q: Question; value: string; onChange: (v: string) => void;
}) {
  const [customHex, setCustomHex] = useState("#6366F1");

  function hexToRgb(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r} ${g} ${b}`;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-[#aaa]">{q.question}</p>
      <div className="flex flex-wrap gap-2 items-center">
        {q.options?.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            title={opt.label}
            className={`w-8 h-8 rounded-full border-2 transition-all ${
              value === opt.value ? "border-white scale-110" : "border-transparent hover:border-[#666]"
            }`}
            style={{ backgroundColor: opt.hex ?? "#fff" }}
          />
        ))}
        {/* Custom colour swatch */}
        <div className="relative flex items-center">
          <input
            type="color"
            value={customHex}
            onChange={e => {
              setCustomHex(e.target.value);
              onChange(hexToRgb(e.target.value));
            }}
            className="opacity-0 absolute inset-0 w-8 h-8 cursor-pointer"
          />
          <div
            className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
              !q.options?.some(o => o.value === value) && value
                ? "border-white scale-110"
                : "border-[#333] hover:border-[#666]"
            }`}
            style={{ backgroundColor: customHex }}
          >
            <span className="text-[8px] text-white/60 font-bold select-none">+</span>
          </div>
        </div>
      </div>
      {value && (
        <p className="text-[11px] text-[#555]">
          Selected: {q.options?.find(o => o.value === value)?.label ?? "Custom"}
        </p>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function WelcomePage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("initial");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [originalRequest, setOriginalRequest] = useState("");
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Questions state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasMessages = messages.length > 0;

  useEffect(() => {
    if (!localStorage.getItem("token")) router.replace("/login");
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, phase]);

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
          content: `${plan}\n\nLooks good? Say **yes** to continue, or tell me what to change.`,
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
        // Fetch questions before building
        setLoading(true);
        try {
          const { questions: qs } = await getProjectQuestions(originalRequest);
          setQuestions(qs);
          setAnswers({});
          setPhase("questions");
          addAiMessage("Let me grab a few quick details to personalise your app ✦");
        } catch {
          // Questions failed — go straight to building
          await startBuilding({});
        } finally {
          setLoading(false);
        }
      } else if (intent === "restart") {
        handleReset();
      } else {
        setPhase("refining");
        addAiMessage("What would you like to change about the plan?");
      }
      return;
    }

    if (phase === "refining") {
      setLoading(true);
      try {
        const refined = `Original: ${originalRequest}\n\nFeedback: ${text}\n\nUpdate the plan based on this feedback.`;
        const { plan } = await generatePlan(refined);
        setPhase("review");
        addAiMessage(`${plan}\n\nLooks good? Say **yes** to continue, or tell me what to change.`);
      } catch {
        setError("Failed to refine plan. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  }

  async function startBuilding(finalAnswers: Record<string, string>) {
    setPhase("executing");
    setLoading(true);
    try {
      const businessName = finalAnswers.business_name;
      const name = businessName?.trim()
        ? businessName.trim()
        : originalRequest.slice(0, 40).replace(/[^a-zA-Z0-9\s]/g, "").trim() || "My App";
      const { project_id } = await createProject(name, originalRequest, finalAnswers);
      addAiMessage("Creating your app now…");
      router.push(`/project/${project_id}`);
    } catch {
      setError("Failed to create project. Please try again.");
      setPhase("questions");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setPhase("initial");
    setMessages([]);
    setOriginalRequest("");
    setInput("");
    setError("");
    setQuestions([]);
    setAnswers({});
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const allAnswered = questions.every(q => q.type === "text"
    ? (answers[q.id] ?? "").trim().length > 0
    : (answers[q.id] ?? "").length > 0
  );

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

      <div className="w-full max-w-xl flex flex-col gap-5">

        {/* Title */}
        <h1
          className="text-3xl font-bold tracking-tight text-center transition-all duration-500"
          style={{ opacity: hasMessages ? 0 : 1, height: hasMessages ? 0 : undefined, overflow: "hidden", marginBottom: hasMessages ? 0 : undefined }}
        >
          Let&apos;s start Codemaxing
        </h1>

        {/* Chat messages */}
        {hasMessages && (
          <div className="max-h-[45vh] overflow-y-auto space-y-4 pr-1">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[90%] text-sm leading-relaxed rounded-[15px] px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-[#1a1a1a] text-white border border-[#2a2a2a] rounded-tr-[4px]"
                    : "text-[#bbb] rounded-tl-[4px]"
                }`}>
                  {msg.role === "ai" && msg.typed
                    ? <TypedText text={msg.content} />
                    : <span className="whitespace-pre-wrap">{msg.content}</span>}
                </div>
              </div>
            ))}
            {loading && phase !== "questions" && (
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

        {/* Questions panel */}
        {phase === "questions" && questions.length > 0 && (
          <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-[15px] p-5 space-y-5">
            <p className="text-xs text-[#555] uppercase tracking-widest font-medium">Customise your app</p>

            {questions.map(q => (
              <div key={q.id}>
                {q.type === "text" && (
                  <TextQuestion q={q} value={answers[q.id] ?? ""} onChange={v => setAnswers(a => ({ ...a, [q.id]: v }))} />
                )}
                {q.type === "quick_menu" && (
                  <QuickMenuQuestion q={q} value={answers[q.id] ?? ""} onChange={v => setAnswers(a => ({ ...a, [q.id]: v }))} />
                )}
                {q.type === "color_picker" && (
                  <ColorPickerQuestion q={q} value={answers[q.id] ?? ""} onChange={v => setAnswers(a => ({ ...a, [q.id]: v }))} />
                )}
              </div>
            ))}

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => startBuilding(answers)}
                disabled={loading || !allAnswered}
                className="flex-1 bg-white hover:bg-gray-100 disabled:opacity-30 text-black text-sm font-semibold py-2.5 rounded-[10px] transition-colors"
              >
                {loading ? "Creating…" : "Build it ✦"}
              </button>
              <button
                onClick={() => startBuilding({})}
                disabled={loading}
                className="px-4 py-2.5 rounded-[10px] text-sm text-[#444] hover:text-white border border-[#222] hover:border-[#444] transition-colors disabled:opacity-30"
                title="Skip and build with AI defaults"
              >
                Skip
              </button>
            </div>
          </div>
        )}

        {/* Chat input — hidden during questions */}
        {phase !== "questions" && (
          <>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <form onSubmit={handleSubmit}>
              <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-[15px] overflow-hidden focus-within:border-[#2a2a2a] transition-colors">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={loading || phase === "executing"}
                  placeholder={
                    phase === "initial"   ? "Describe your awesome project" :
                    phase === "review"    ? "Say yes to build, or tell me what to change..." :
                    phase === "refining"  ? "What would you like to change?" :
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
          </>
        )}
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
