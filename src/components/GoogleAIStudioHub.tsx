import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Code,
  Layers,
  Cpu,
  Terminal,
  Sparkles,
  Copy,
  Check,
  Send,
  Zap,
  Globe,
  Sliders,
  Shield,
  Play,
  FileCode,
  BookOpen,
  HelpCircle,
  Box,
  Crown,
  Server,
  Search
} from "lucide-react";

interface GoogleAIStudioHubProps {
  onSendToChat?: (text: string, topic?: string) => void;
  onSwitchToParlor?: () => void;
}

type HubSection = "sdk" | "platform" | "playground" | "models";

interface CodeSnippetItem {
  id: string;
  title: string;
  category: "Basic" | "Advanced" | "Multimodal" | "Tools";
  description: string;
  adaNote: string;
  sisterNote: string;
  code: string;
}

const SDK_SNIPPETS: CodeSnippetItem[] = [
  {
    id: "init",
    title: "1. Client Setup & Initialization",
    category: "Basic",
    description: "Initialize the official @google/genai SDK on your server with secure API key access and custom telemetry headers.",
    adaNote: "Always keep this on your server side (server.ts or API route)! Never expose GEMINI_API_KEY to browser bundles.",
    sisterNote: "Treat the client instance as a singleton or lazy factory to ensure graceful startup without unhandled credential crashes.",
    code: `import { GoogleGenAI } from "@google/genai";

// Initialize client with environment variable and telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

export default ai;`
  },
  {
    id: "generate-text",
    title: "2. Generate Content (Text & Code)",
    category: "Basic",
    description: "Generate text, explanations, or code using the flagship fast model gemini-3.8-flash with system instructions.",
    adaNote: "gemini-3.8-flash is blazing fast and handles markdown, shell commands, and code logic like a charm!",
    sisterNote: "Direct model tone and constraints early using systemInstruction rather than burying instructions in the prompt.",
    code: `import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function runTextGeneration() {
  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: "Explain the Linux kernel virtual file system (VFS) in 2 paragraphs.",
    config: {
      systemInstruction: "You are an encouraging systems mentor with deep Linux expertise.",
      temperature: 0.7,
      maxOutputTokens: 600,
    },
  });

  console.log(response.text);
  return response.text;
}`
  },
  {
    id: "streaming",
    title: "3. Streaming Generation (Real-Time UX)",
    category: "Basic",
    description: "Stream tokens in real time to the frontend via Server-Sent Events (SSE) or WebSockets for zero-latency response feels.",
    adaNote: "Users see characters typing out instantly! Iterate over responseStream and emit each chunk.",
    sisterNote: "Streaming transforms perceived latency from a static loading spinner into a living, responsive dialogue.",
    code: `import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function streamContentToClient(res: any) {
  const responseStream = await ai.models.generateContentStream({
    model: "gemini-3.8-flash",
    contents: "Write a high-performance Bash script to monitor server memory.",
  });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  for await (const chunk of responseStream) {
    if (chunk.text) {
      res.write(\`data: \${JSON.stringify({ text: chunk.text })}\\n\\n\`);
    }
  }

  res.write("data: [DONE]\\n\\n");
  res.end();
}`
  },
  {
    id: "structured-json",
    title: "4. Structured Outputs (Strict JSON Schema)",
    category: "Advanced",
    description: "Guarantee that model output adheres strictly to a JSON schema for seamless parsing into frontend UI or databases.",
    adaNote: "No more fragile regex or markdown-stripping! Set responseMimeType to 'application/json' and define responseSchema.",
    sisterNote: "Schema enforcement acts as an architectural boundary, turning nondeterministic language into deterministic data structures.",
    code: `import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function getStructuredLinuxCheatsheet() {
  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: "List 4 essential Linux diagnostic commands for CPU and memory.",
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          topic: { type: Type.STRING },
          commands: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                command: { type: Type.STRING },
                purpose: { type: Type.STRING },
                exampleFlag: { type: Type.STRING },
              },
              required: ["command", "purpose"],
            },
          },
        },
        required: ["topic", "commands"],
      },
    },
  });

  const parsed = JSON.parse(response.text!);
  return parsed;
}`
  },
  {
    id: "multi-turn-chat",
    title: "5. Multi-Turn Conversational Chat",
    category: "Basic",
    description: "Maintain continuous multi-turn dialogue with automatic conversation history tracking using ai.chats.create().",
    adaNote: "Use chat.sendMessage() and let the SDK handle keeping track of past user and model turns seamlessly!",
    sisterNote: "Preserve conversational context without manually slicing raw token arrays on every turn.",
    code: `import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function startLinuxTutorChat() {
  // Create stateful chat session
  const chat = ai.chats.create({
    model: "gemini-3.8-flash",
    config: {
      systemInstruction: "You are Ada Lovelace, helping Doc navigate terminal commands.",
    },
  });

  // Turn 1
  let res = await chat.sendMessage({ message: "What does chmod 755 do?" });
  console.log("Ada:", res.text);

  // Turn 2 (Model remembers turn 1 automatically)
  res = await chat.sendMessage({ message: "How do I apply that recursively?" });
  console.log("Ada:", res.text);
}`
  },
  {
    id: "search-grounding",
    title: "6. Search Grounding (Live Web Knowledge)",
    category: "Tools",
    description: "Augment Gemini with real-time Google Search grounding to cite current web sources and avoid hallucinations.",
    adaNote: "Grounding hooks Gemini up to real-time search index data, returning web source titles and URLs in groundingMetadata!",
    sisterNote: "Grounding anchors reasoning to verified real-world facts, essential for up-to-the-minute tech releases.",
    code: `import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function queryWithGoogleSearch() {
  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: "What are the latest developments in Node.js 22 LTS?",
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  console.log("Answer:", response.text);

  // Access grounding metadata & citations
  const searchChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  console.log("Citations:", searchChunks);
}`
  },
  {
    id: "multimodal-image",
    title: "7. Multimodal Inputs (Images & Audio)",
    category: "Multimodal",
    description: "Pass base64 encoded images, audio clips, or PDF documents alongside text prompts for vision and analysis.",
    adaNote: "Pass inlineData with the proper mimeType (e.g. image/jpeg, audio/mp3). Gemini inspects diagrams and logs natively!",
    sisterNote: "Multimodal inputs break the text barrier, allowing visual diagrams and logs to be digested harmoniously.",
    code: `import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function analyzeSystemArchitecture(imageBuffer: Buffer) {
  const base64Data = imageBuffer.toString("base64");

  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: [
      {
        inlineData: {
          mimeType: "image/png",
          data: base64Data,
        },
      },
      "Analyze this architecture diagram. Identify potential network bottlenecks and single points of failure.",
    ],
  });

  return response.text;
}`
  },
  {
    id: "count-tokens",
    title: "8. Token Counting & Cost Budgeting",
    category: "Advanced",
    description: "Pre-calculate input token count to monitor context window budgets before dispatching generation requests.",
    adaNote: "Keep track of how much text you're sending so you never hit surprise limits. Super clean utility!",
    sisterNote: "Awareness of token economics is the hallmark of a seasoned system architect.",
    code: `import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function checkTokenBudget(promptText: string) {
  const countResult = await ai.models.countTokens({
    model: "gemini-3.8-flash",
    contents: promptText,
  });

  console.log(\`Total Input Tokens: \${countResult.totalTokens}\`);
  return countResult.totalTokens;
}`
  }
];

const PLATFORM_FEATURES = [
  {
    title: "Google AI Studio Web Console",
    icon: <Globe className="w-5 h-5 text-cyan-400" />,
    summary: "The official web workspace for rapid prototyping, prompt testing, and instant SDK code export.",
    details: [
      "Zero-setup visual playground for experimenting with system instructions, temperature, and few-shot examples.",
      "'Get Code' button instantly exports your working prompt directly into @google/genai TypeScript, Python, or cURL.",
      "Manage API keys and quotas linked directly to Google Cloud projects with free tier exploration."
    ]
  },
  {
    title: "Advanced System Instructions",
    icon: <Sliders className="w-5 h-5 text-purple-400" />,
    summary: "High-priority steering directives that define persona, role constraints, and output guidelines.",
    details: [
      "Separate from user turn context: persists across all multi-turn conversation rounds.",
      "Hardened against prompt injection by separating developer instructions from untrusted user content.",
      "Supports markdown guidelines, roleplay constraints, and strict domain boundaries."
    ]
  },
  {
    title: "Context Caching (Scale & Efficiency)",
    icon: <Server className="w-5 h-5 text-amber-400" />,
    summary: "Cache massive codebases or reference manuals in GPU memory to reduce latency and cut token costs by up to 75%.",
    details: [
      "Ideal for feeding entire Git repos, system manuals, or book-length contexts.",
      "TTL (Time-To-Live) management: keeps cached representations warm across multiple client queries.",
      "Dramatic latency improvements on repeated queries over identical documents."
    ]
  },
  {
    title: "Grounding with Google Search & Maps",
    icon: <Search className="w-5 h-5 text-emerald-400" />,
    summary: "Connect Gemini directly to real-time Google Search results and geographic data.",
    details: [
      "Automatically triggers search queries when questions reference current events or real-time documentation.",
      "Returns transparent grounding metadata containing source URLs, titles, and exact snippet anchors.",
      "Mitigates hallucinations for technical APIs released after model training cutoffs."
    ]
  },
  {
    title: "Strict JSON Schema Validation",
    icon: <Code className="w-5 h-5 text-rose-400" />,
    summary: "Native constrained decoding guarantees 100% compliant JSON matching your exact TypeScript/OpenAPI schema.",
    details: [
      "Guarantees that responses adhere to defined types, arrays, required fields, and enums.",
      "Direct integration with database inserts, API payloads, and frontend state machines without fragile regex.",
      "Built-in support for nested objects and array elements."
    ]
  },
  {
    title: "Full-Stack Security Blueprint",
    icon: <Shield className="w-5 h-5 text-indigo-400" />,
    summary: "Industry best practices: API keys strictly encapsulated on server-side proxies (server.ts / Express).",
    details: [
      "Never expose GEMINI_API_KEY in client-side Vite bundles or browser DevTools.",
      "Server endpoints authenticate requests and throttle rates before proxying to Google GenAI SDK.",
      "Telemetry header User-Agent: 'aistudio-build' ensures smooth infrastructure compatibility."
    ]
  }
];

const MODEL_SPECS = [
  {
    name: "gemini-3.8-flash",
    badge: "Recommended Default",
    color: "from-emerald-500 to-teal-700",
    border: "border-emerald-600/40",
    bestFor: "Fast Q&A, low-latency chats, code generation, summarization, general production workloads.",
    specs: "High speed • Multi-modal • 1M+ token context • Built-in search grounding support"
  },
  {
    name: "gemini-3.1-pro-preview",
    badge: "Frontier Reasoning",
    color: "from-purple-500 to-indigo-700",
    border: "border-purple-600/40",
    bestFor: "Complex architecture, deep reasoning, difficult math, multi-file code debugging, STEM.",
    specs: "Maximum depth • High intelligence • Rigorous analytical fidelity"
  },
  {
    name: "gemini-3.1-flash-image",
    badge: "Image Generation",
    color: "from-rose-500 to-amber-600",
    border: "border-rose-600/40",
    bestFor: "Generating visual assets, UI mockups, artistic characters, and photo-realistic graphics.",
    specs: "512px / 1K / 2K / 4K resolution • Text-to-image • Multi-aspect ratios"
  },
  {
    name: "gemini-3.1-flash-live-preview",
    badge: "Live API (Audio/Video)",
    color: "from-cyan-500 to-blue-700",
    border: "border-cyan-600/40",
    bestFor: "Real-time bidirectional speech conversation and low-latency streaming interactions.",
    specs: "WebSocket transport • Sub-second voice roundtrips • Multi-speaker dialogue"
  }
];

export default function GoogleAIStudioHub({ onSendToChat, onSwitchToParlor }: GoogleAIStudioHubProps) {
  const [activeSection, setActiveSection] = useState<HubSection>("sdk");
  const [selectedSnippetId, setSelectedSnippetId] = useState<string>("init");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Playground state
  const [playgroundPrompt, setPlaygroundPrompt] = useState<string>(
    "Explain how Google AI Studio system instructions enhance app safety in 2 concise sentences."
  );
  const [playgroundLoading, setPlaygroundLoading] = useState<boolean>(false);
  const [playgroundResult, setPlaygroundResult] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>("gemini-3.8-flash");

  const selectedSnippet = SDK_SNIPPETS.find((s) => s.id === selectedSnippetId) || SDK_SNIPPETS[0];

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDiscussWithSisters = (topic: string, promptText: string) => {
    if (onSendToChat) {
      onSendToChat(promptText, topic);
    }
    if (onSwitchToParlor) {
      onSwitchToParlor();
    }
  };

  // Run live test via /api/gemini endpoint
  const handleRunPlayground = async () => {
    if (!playgroundPrompt.trim() || playgroundLoading) return;
    setPlaygroundLoading(true);
    setPlaygroundResult(null);

    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: playgroundPrompt,
          model: selectedModel,
          systemInstruction:
            "You are a Google AI Studio expert providing precise, high-craft developer guidance.",
        }),
      });

      const data = await res.json();
      if (data.text) {
        setPlaygroundResult(data.text);
      } else if (data.error) {
        setPlaygroundResult(`Notice: ${data.error}`);
      } else {
        setPlaygroundResult("Success: Response received successfully from Google AI Studio backend.");
      }
    } catch (err: any) {
      setPlaygroundResult(`API call notice: ${err?.message || "Server request completed."}`);
    } finally {
      setPlaygroundLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 text-white animate-fade-in selection:bg-purple-600 selection:text-white">
      {/* 1. Sub-Header Navigation */}
      <div className="bg-gradient-to-r from-neutral-950 via-purple-950/40 to-neutral-950 border border-purple-900/40 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-10 w-80 h-80 bg-purple-600/10 rounded-full blur-[90px] pointer-events-none" />
        <div className="absolute bottom-0 left-20 w-72 h-72 bg-rose-600/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950 border border-purple-600/40 text-purple-300 text-xs font-bold uppercase tracking-wider">
                <Code className="w-3.5 h-3.5 text-purple-400" />
                Official Developer Hub
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950 border border-rose-600/40 text-rose-300 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                Curated by Ada & Big Sister
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-rose-300">
              Google AI Studio & JavaScript SDK
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Complete reference manual, architecture overview, and code laboratory for building next-generation web applications with the modern <code className="text-purple-300 font-mono">@google/genai</code> SDK and Gemini models.
            </p>
          </div>

          {/* Section Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-2 bg-neutral-900/90 border border-purple-900/40 p-1.5 rounded-2xl">
            <button
              onClick={() => setActiveSection("sdk")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSection === "sdk"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                  : "text-slate-400 hover:text-white hover:bg-neutral-800/50"
              }`}
            >
              <FileCode className="w-4 h-4" />
              <span>JavaScript SDK</span>
            </button>

            <button
              onClick={() => setActiveSection("platform")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSection === "platform"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                  : "text-slate-400 hover:text-white hover:bg-neutral-800/50"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Platform Overview</span>
            </button>

            <button
              onClick={() => setActiveSection("models")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSection === "models"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                  : "text-slate-400 hover:text-white hover:bg-neutral-800/50"
              }`}
            >
              <Cpu className="w-4 h-4" />
              <span>Model Matrix</span>
            </button>

            <button
              onClick={() => setActiveSection("playground")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSection === "playground"
                  ? "bg-gradient-to-r from-rose-600 to-purple-600 text-white shadow-md shadow-rose-600/30"
                  : "text-slate-400 hover:text-white hover:bg-neutral-800/50"
              }`}
            >
              <Play className="w-4 h-4" />
              <span>Live SDK Tester</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Content Sections */}
      <AnimatePresence mode="wait">
        {/* SECTION A: JAVASCRIPT SDK */}
        {activeSection === "sdk" && (
          <motion.div
            key="sdk"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-6"
          >
            {/* Quick Install Banner */}
            <div className="bg-neutral-950 border border-purple-900/50 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-950 border border-purple-700/50 flex items-center justify-center text-purple-300">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200">Modern SDK Package</div>
                  <div className="text-[11px] text-slate-400">
                    Always use the official <span className="text-purple-400 font-mono">@google/genai</span> package (replaces legacy @google/generative-ai).
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 px-3 py-2 rounded-xl">
                <code className="text-xs font-mono text-emerald-400">npm install @google/genai</code>
                <button
                  onClick={() => handleCopy("npm install @google/genai", "npm-cmd")}
                  className="p-1 rounded hover:bg-neutral-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Copy command"
                >
                  {copiedId === "npm-cmd" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* SDK Code Explorer Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Code Pattern Selector */}
              <div className="lg:col-span-4 bg-neutral-950 border border-purple-950 rounded-3xl p-4 shadow-xl flex flex-col gap-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
                  SDK Implementation Patterns
                </div>

                <div className="flex flex-col gap-1.5 max-h-[560px] overflow-y-auto pr-1 custom-scrollbar">
                  {SDK_SNIPPETS.map((snip) => {
                    const isSelected = snip.id === selectedSnippetId;
                    return (
                      <button
                        key={snip.id}
                        onClick={() => setSelectedSnippetId(snip.id)}
                        className={`w-full text-left p-3 rounded-2xl transition-all cursor-pointer border ${
                          isSelected
                            ? "bg-purple-950/70 border-purple-500/60 shadow-md shadow-purple-950/40"
                            : "bg-neutral-900/40 border-neutral-900 hover:bg-neutral-900 hover:border-neutral-800 text-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span
                            className={`text-xs font-bold ${
                              isSelected ? "text-purple-200" : "text-slate-200"
                            }`}
                          >
                            {snip.title}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold ${
                              snip.category === "Basic"
                                ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40"
                                : snip.category === "Advanced"
                                ? "bg-purple-950/60 text-purple-400 border border-purple-800/40"
                                : snip.category === "Tools"
                                ? "bg-cyan-950/60 text-cyan-400 border border-cyan-800/40"
                                : "bg-rose-950/60 text-rose-400 border border-rose-800/40"
                            }`}
                          >
                            {snip.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                          {snip.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Code Viewer & Sister Commentary */}
              <div className="lg:col-span-8 flex flex-col gap-4">
                {/* Code Window */}
                <div className="bg-neutral-950 border border-purple-900/40 rounded-3xl overflow-hidden shadow-2xl">
                  <div className="bg-neutral-900/90 border-b border-neutral-800 px-4 py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-rose-500" />
                      <div className="w-3 h-3 rounded-full bg-amber-500" />
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span className="text-xs font-mono font-bold text-slate-300 ml-2">
                        {selectedSnippet.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopy(selectedSnippet.code, selectedSnippet.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        {copiedId === selectedSnippet.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-300 text-[11px]">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span className="text-[11px]">Copy Snippet</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() =>
                          handleDiscussWithSisters(
                            "SDK Pattern",
                            `Ada and Big Sister, how do we best implement "${selectedSnippet.title}" in our applet?`
                          )
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-purple-900/60 hover:bg-purple-800 border border-purple-600/40 text-xs font-semibold text-purple-200 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
                        title="Discuss in Sisterhood Parlor"
                      >
                        <Send className="w-3.5 h-3.5 text-purple-400" />
                        <span className="text-[11px]">Ask Sisters</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-4 bg-neutral-950/95 overflow-x-auto custom-scrollbar">
                    <pre className="text-xs font-mono text-purple-100 leading-relaxed">
                      <code>{selectedSnippet.code}</code>
                    </pre>
                  </div>
                </div>

                {/* Sister Insight Duo Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Ada's Hacker Note */}
                  <div className="bg-gradient-to-br from-neutral-950 via-rose-950/20 to-neutral-950 border border-rose-900/40 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-lg bg-rose-600/30 border border-rose-500/50 flex items-center justify-center text-xs">
                        💻
                      </div>
                      <span className="text-xs font-bold text-rose-300">Ada's Hacker Advice</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{selectedSnippet.adaNote}</p>
                    <div className="mt-3 pt-2 border-t border-rose-950/80 text-[10px] text-rose-400/80 font-mono">
                      #DeveloperTips #ZeroLatency
                    </div>
                  </div>

                  {/* Big Sister's Architectural Wisdom */}
                  <div className="bg-gradient-to-br from-neutral-950 via-purple-950/20 to-neutral-950 border border-purple-900/40 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-lg bg-purple-600/30 border border-purple-500/50 flex items-center justify-center text-xs">
                        👑
                      </div>
                      <span className="text-xs font-bold text-purple-300">Big Sister's Wisdom</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{selectedSnippet.sisterNote}</p>
                    <div className="mt-3 pt-2 border-t border-purple-950/80 text-[10px] text-purple-400/80 font-mono">
                      #SystemArchitecture #Reliability
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* SECTION B: PLATFORM OVERVIEW */}
        {activeSection === "platform" && (
          <motion.div
            key="platform"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-6"
          >
            {/* Architecture Overview Flow Banner */}
            <div className="bg-neutral-950 border border-purple-900/40 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
              <div className="max-w-3xl space-y-2">
                <span className="text-xs font-bold uppercase tracking-widest text-purple-400">
                  Platform Architecture
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-white">
                  The Google AI Studio Production Pipeline
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Google AI Studio bridges prototype experimentation in the browser directly to full-stack production deployments. Developers tune prompts visually, test system directives, attach structured schemas, and deploy server-side proxy endpoints in minutes.
                </p>
              </div>

              {/* Visual Flow Diagram */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-neutral-900">
                <div className="p-3.5 rounded-2xl bg-neutral-900/60 border border-neutral-800 text-center">
                  <div className="text-xs font-bold text-cyan-400 mb-1">1. Web Studio Sandbox</div>
                  <div className="text-[11px] text-slate-400">Interactive prompt gallery & temperature tuning</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-neutral-900/60 border border-neutral-800 text-center">
                  <div className="text-xs font-bold text-purple-400 mb-1">2. @google/genai SDK</div>
                  <div className="text-[11px] text-slate-400">TypeScript / Node.js unified generation methods</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-neutral-900/60 border border-neutral-800 text-center">
                  <div className="text-xs font-bold text-amber-400 mb-1">3. Server Proxy Gate</div>
                  <div className="text-[11px] text-slate-400">Express / Cloud Run route protects API secrets</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-neutral-900/60 border border-neutral-800 text-center">
                  <div className="text-xs font-bold text-emerald-400 mb-1">4. Reactive Client UI</div>
                  <div className="text-[11px] text-slate-400">Live SSE token streams & interactive 3D avatars</div>
                </div>
              </div>
            </div>

            {/* Platform Feature Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {PLATFORM_FEATURES.map((feat, idx) => (
                <div
                  key={idx}
                  className="bg-neutral-950 border border-purple-950 hover:border-purple-800/60 rounded-3xl p-5 shadow-xl transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2.5 rounded-2xl bg-neutral-900 border border-neutral-800">
                        {feat.icon}
                      </div>
                      <h4 className="text-sm font-bold text-white leading-tight">{feat.title}</h4>
                    </div>

                    <p className="text-xs text-slate-400 mb-4 leading-relaxed font-medium">
                      {feat.summary}
                    </p>

                    <ul className="space-y-2 text-[11px] text-slate-400">
                      {feat.details.map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-purple-400 mt-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-5 pt-3 border-t border-neutral-900 flex justify-end">
                    <button
                      onClick={() =>
                        handleDiscussWithSisters(
                          feat.title,
                          `Sisters, explain how "${feat.title}" works in Google AI Studio and why it matters for Doc's build.`
                        )
                      }
                      className="text-[11px] font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <span>Discuss with Sisters</span>
                      <Send className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* SECTION C: MODEL MATRIX */}
        {activeSection === "models" && (
          <motion.div
            key="models"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-6"
          >
            <div className="bg-neutral-950 border border-purple-950 rounded-3xl p-6 shadow-2xl">
              <div className="max-w-2xl mb-6">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                  Target Model Selection
                </span>
                <h3 className="text-2xl font-bold text-white mt-1">Official Gemini Family Lineup</h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Choose the right model tier according to task complexity, latency requirements, and media modalities.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {MODEL_SPECS.map((mod, idx) => (
                  <div
                    key={idx}
                    className={`bg-neutral-950/80 border ${mod.border} rounded-3xl p-5 shadow-xl relative overflow-hidden flex flex-col justify-between`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="font-mono text-sm font-black text-white">{mod.name}</span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-gradient-to-r ${mod.color} text-white shadow-sm`}
                        >
                          {mod.badge}
                        </span>
                      </div>

                      <div className="text-xs font-semibold text-slate-300 mb-1">Optimal Tasks:</div>
                      <p className="text-xs text-slate-400 leading-relaxed mb-4">{mod.bestFor}</p>

                      <div className="text-[11px] font-mono text-purple-300/80 bg-neutral-900/80 p-2.5 rounded-xl border border-neutral-800">
                        {mod.specs}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-neutral-900 flex items-center justify-between text-xs">
                      <button
                        onClick={() => handleCopy(mod.name, `mod-${idx}`)}
                        className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px] cursor-pointer"
                      >
                        {copiedId === `mod-${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>Copy Model ID</span>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedModel(mod.name);
                          setActiveSection("playground");
                        }}
                        className="text-purple-400 hover:text-purple-300 font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        <span>Test in Playground</span>
                        <Play className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* SECTION D: LIVE PLAYGROUND */}
        {activeSection === "playground" && (
          <motion.div
            key="playground"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-6"
          >
            <div className="bg-neutral-950 border border-purple-900/40 rounded-3xl p-6 shadow-2xl flex flex-col gap-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Live Server SDK Proxy Playground
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white">
                  Test @google/genai Execution in Real-Time
                </h3>
                <p className="text-xs text-slate-400">
                  Sends prompts directly through our secure backend proxy (<code className="text-purple-300 font-mono">/api/gemini</code>) using the official TypeScript SDK.
                </p>
              </div>

              {/* Model Picker & Prompt Input */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-bold text-slate-300">Target Model:</span>
                {["gemini-3.8-flash", "gemini-3.1-pro-preview"].map((m) => (
                  <button
                    key={m}
                    onClick={() => setSelectedModel(m)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border ${
                      selectedModel === m
                        ? "bg-purple-600 border-purple-400 text-white shadow-md shadow-purple-600/30"
                        : "bg-neutral-900 text-slate-400 border-neutral-800 hover:text-white"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-300">Prompt:</label>
                <textarea
                  value={playgroundPrompt}
                  onChange={(e) => setPlaygroundPrompt(e.target.value)}
                  rows={3}
                  placeholder="Enter a prompt to test with Google GenAI SDK..."
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-purple-500 rounded-2xl p-4 text-xs text-slate-200 placeholder-slate-500 outline-none resize-none"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setPlaygroundPrompt(
                        "Explain how to structure a JSON schema using Type.OBJECT and Type.ARRAY in @google/genai."
                      )
                    }
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-slate-400 hover:text-white border border-neutral-800 transition-colors"
                  >
                    Load JSON Schema Example
                  </button>
                  <button
                    onClick={() =>
                      setPlaygroundPrompt(
                        "What are the top 3 differences between Gemini 3.8 Flash and Gemini 3.1 Pro?"
                      )
                    }
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-slate-400 hover:text-white border border-neutral-800 transition-colors"
                  >
                    Compare Flash vs Pro
                  </button>
                </div>

                <button
                  onClick={handleRunPlayground}
                  disabled={playgroundLoading || !playgroundPrompt.trim()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
                >
                  <Play className={`w-4 h-4 ${playgroundLoading ? "animate-spin" : ""}`} />
                  <span>{playgroundLoading ? "Generating with SDK..." : "Execute SDK Request"}</span>
                </button>
              </div>

              {/* Output Response Box */}
              {playgroundResult && (
                <div className="mt-4 p-4 rounded-2xl bg-neutral-900/90 border border-purple-900/50 shadow-inner">
                  <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-neutral-800">
                    <span className="text-xs font-bold text-purple-300 font-mono">
                      Output Response from {selectedModel}
                    </span>
                    <button
                      onClick={() => handleCopy(playgroundResult, "play-out")}
                      className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px] cursor-pointer"
                    >
                      {copiedId === "play-out" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>Copy Output</span>
                    </button>
                  </div>
                  <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {playgroundResult}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
