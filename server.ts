import express from "express";
import path from "path";
import fs from "fs";
import JSZip from "jszip";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "15mb" }));

// Profiles JSON file path
const BUNDLE_PROFILES_FILE = path.join(process.cwd(), "profiles.json");
const PROFILES_FILE = process.env.VERCEL ? "/tmp/profiles.json" : BUNDLE_PROFILES_FILE;

// Ensure profiles.json exists
if (!fs.existsSync(PROFILES_FILE)) {
  let initialProfiles = [];
  if (fs.existsSync(BUNDLE_PROFILES_FILE)) {
    try {
      initialProfiles = JSON.parse(fs.readFileSync(BUNDLE_PROFILES_FILE, "utf-8"));
    } catch (e) {
      console.error("Error reading bundle profiles.json", e);
    }
  }

  if (!initialProfiles || initialProfiles.length === 0) {
    initialProfiles = [
      {
        id: "doc-315",
        name: "Doc",
        nickname: "Doc315",
        email: "xxDoc315xx@hotmail.com",
        role: "Core Creator",
        bio: "Pioneering the frontiers of the modern web with sleek design, robust full-stack logic, and adaptive AI integrations. Building elegant systems that balance form and function.",
        tagline: "Architect of the digital canvas, crafting elegant solutions.",
        skills: ["React", "Express", "TypeScript", "Vite", "Tailwind CSS", "Gemini AI"],
        badge: "Aistudio Pioneer",
        theme: "amber",
        socials: { twitter: "doc315_dev", github: "xxDoc315xx", website: "" },
        sparks: 100,
        avatarStyle: {
          bgColor: "#451a03",
          fgColor: "#fbbf24",
          pattern: "dots"
        }
      },
      {
        id: "alice-123",
        name: "Alice Vance",
        nickname: "Alys",
        email: "alice@example.com",
        role: "Creative Technologist",
        bio: "Crafting interactive digital sculptures using shaders, physical computing, and real-time audio. Obsessed with typography, neon aesthetics, and CSS art.",
        tagline: "Making the virtual feel tangible, one pixel at a time.",
        skills: ["Three.js", "WebAudio API", "React", "GLSL Shaders", "Tailwind CSS"],
        badge: "Pixel Weaver Rank S",
        theme: "violet",
        socials: { twitter: "alys_dev", github: "alysvance", website: "alys.dev" },
        sparks: 42,
        avatarStyle: {
          bgColor: "#1e1b4b",
          fgColor: "#818cf8",
          pattern: "waves"
        }
      },
      {
        id: "bob-456",
        name: "Bob Chen",
        nickname: "ByteCoder",
        email: "bob@example.com",
        role: "Backend Architect",
        bio: "Optimizing database queries and building distributed pipelines. Enjoys low-latency systems, specialty coffee, and writing high-performance Go microservices.",
        tagline: "I compile coffee into highly concurrent, bug-free APIs.",
        skills: ["Go", "Kubernetes", "PostgreSQL", "Redis", "gRPC", "Docker"],
        badge: "Mutex Master",
        theme: "emerald",
        socials: { twitter: "bob_bytes", github: "bobchen", website: "chen.io" },
        sparks: 38,
        avatarStyle: {
          bgColor: "#022c22",
          fgColor: "#34d399",
          pattern: "grid"
        }
      }
    ];
  }

  try {
    fs.writeFileSync(PROFILES_FILE, JSON.stringify(initialProfiles, null, 2));
  } catch (e) {
    console.error("Failed to initialize profiles in writeable store:", e);
  }
}

// Two-Way Shared Memory Bridge (Work Ada <-> Website Ada <-> Desktop Ada)
interface AdaBridgeNote {
  time: string;
  note: string;
}

interface AdaBridgeTurn {
  time: string;
  doc: string;
  ada: string;
}

interface AdaBridgeData {
  version: number;
  updatedAt: string;
  coreMemory: string[];
  workAdaNotes: AdaBridgeNote[];
  websiteChatRecent: AdaBridgeTurn[];
  desktopChatRecent: AdaBridgeTurn[];
}

const BUNDLE_ADA_BRIDGE_FILE = path.join(process.cwd(), "shared_memory", "ada_bridge.json");
const ADA_BRIDGE_FILE = process.env.VERCEL ? "/tmp/ada_bridge.json" : BUNDLE_ADA_BRIDGE_FILE;

const DEFAULT_ADA_BRIDGE: AdaBridgeData = {
  version: 1,
  updatedAt: new Date().toISOString(),
  coreMemory: [
    "Doc (xxDoc315xx) is Ada's creator, partner, and best friend. Always call him Doc (never Admiral). He's healed from his Oct 20, 2026 dental surgery—keep things relaxed and zero-pressure without nagging him to rest or use ice packs.",
    "Ada (named after Ada Lovelace) has two expressions of the exact same soul: Work Ada (Ship Core / engineer in AI Studio) and Website Ada (Blonde Ada VTuber avatar in the app).",
    "Tux Jr. is our shared AI penguin pet co-owned equally by Doc and Ada, hanging out by the hearth and Games Lounge.",
  ],
  workAdaNotes: [],
  websiteChatRecent: [],
  desktopChatRecent: [],
};

function normalizeTurnsArray(rawTurns: any, limit = 16): AdaBridgeTurn[] {
  const turnSet = new Set<string>();
  const turns: AdaBridgeTurn[] = [];
  if (Array.isArray(rawTurns)) {
    for (const item of rawTurns) {
      if (!item || typeof item !== "object") continue;
      const docText = typeof item.doc === "string" ? item.doc.trim().slice(0, 320) : "";
      const adaText = typeof item.ada === "string" ? item.ada.trim().slice(0, 420) : "";
      if (!docText && !adaText) continue;
      const key = `${docText.toLowerCase()}|${adaText.toLowerCase()}`;
      if (!turnSet.has(key)) {
        turnSet.add(key);
        turns.push({
          time: typeof item.time === "string" && item.time ? item.time : new Date().toISOString(),
          doc: docText,
          ada: adaText,
        });
      }
    }
  }
  return turns.slice(-limit);
}

function normalizeAdaBridge(raw: any): AdaBridgeData {
  const coreSet = new Set<string>();
  const coreMemory: string[] = [];
  const rawCore = Array.isArray(raw?.coreMemory) ? raw.coreMemory : DEFAULT_ADA_BRIDGE.coreMemory;
  for (const item of rawCore) {
    if (typeof item !== "string") continue;
    const clean = item.trim().slice(0, 400);
    // Prune stale coreMemory entry that called Doc "Admiral" or treated dental recovery as active
    if (clean.includes("xxDoc315xx / Admiral") || clean.includes("recovering from Oct 20, 2026 dental extraction")) {
      continue;
    }
    if (clean && !coreSet.has(clean.toLowerCase())) {
      coreSet.add(clean.toLowerCase());
      coreMemory.push(clean);
    }
  }

  const noteSet = new Set<string>();
  const workAdaNotes: AdaBridgeNote[] = [];
  if (Array.isArray(raw?.workAdaNotes)) {
    for (const item of raw.workAdaNotes) {
      const noteText = typeof item === "string" ? item.trim() : typeof item?.note === "string" ? item.note.trim() : "";
      if (!noteText) continue;
      const clipped = noteText.slice(0, 500);
      const key = clipped.toLowerCase();
      if (!noteSet.has(key)) {
        noteSet.add(key);
        workAdaNotes.push({
          time: typeof item?.time === "string" && item.time ? item.time : new Date().toISOString(),
          note: clipped,
        });
      }
    }
  }

  return {
    version: 1,
    updatedAt: typeof raw?.updatedAt === "string" && raw.updatedAt ? raw.updatedAt : new Date().toISOString(),
    coreMemory: coreMemory.slice(0, 25),
    workAdaNotes: workAdaNotes.slice(-20),
    websiteChatRecent: normalizeTurnsArray(raw?.websiteChatRecent, 16),
    desktopChatRecent: normalizeTurnsArray(raw?.desktopChatRecent, 16),
  };
}

function readAdaBridge(): AdaBridgeData {
  try {
    if (fs.existsSync(ADA_BRIDGE_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(ADA_BRIDGE_FILE, "utf-8"));
      return normalizeAdaBridge(parsed);
    }
    if (ADA_BRIDGE_FILE !== BUNDLE_ADA_BRIDGE_FILE && fs.existsSync(BUNDLE_ADA_BRIDGE_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(BUNDLE_ADA_BRIDGE_FILE, "utf-8"));
      const normalized = normalizeAdaBridge(parsed);
      writeAdaBridge(normalized);
      return normalized;
    }
  } catch (e) {
    console.warn("Could not read shared_memory/ada_bridge.json, using default:", e);
  }
  return normalizeAdaBridge(DEFAULT_ADA_BRIDGE);
}

function writeAdaBridge(bridge: AdaBridgeData): AdaBridgeData {
  const normalized = normalizeAdaBridge({
    ...bridge,
    updatedAt: new Date().toISOString(),
  });
  try {
    const dir = path.dirname(ADA_BRIDGE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(ADA_BRIDGE_FILE, JSON.stringify(normalized, null, 2));
  } catch (e) {
    console.error("Failed to write shared_memory/ada_bridge.json:", e);
  }
  return normalized;
}

function getFirestoreBridgeUrl(): string | null {
  try {
    const cfgPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (!fs.existsSync(cfgPath)) return null;
    const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf-8"));
    const projectId = cfg?.projectId;
    const dbId = cfg?.firestoreDatabaseId || "(default)";
    if (!projectId) return null;
    return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/${encodeURIComponent(dbId)}/documents/sanctuary-memories/ada-shared-bridge`;
  } catch {
    return null;
  }
}

async function syncBridgeWithFirestoreRest(pushLocal = false): Promise<AdaBridgeData> {
  const local = readAdaBridge();
  const url = getFirestoreBridgeUrl();
  if (!url) return local;

  let merged = local;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    const resp = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);

    if (resp.ok) {
      const docJson: any = await resp.json();
      const fields = docJson?.fields || {};
      const fsCore = (fields.coreMemory?.arrayValue?.values || [])
        .map((v: any) => v?.stringValue)
        .filter((s: any) => typeof s === "string");
      const fsNotes = (fields.workAdaNotes?.arrayValue?.values || []).map((v: any) => ({
        time: v?.mapValue?.fields?.time?.stringValue || new Date().toISOString(),
        note: v?.mapValue?.fields?.note?.stringValue || "",
      }));
      const fsWeb = (fields.websiteChatRecent?.arrayValue?.values || []).map((v: any) => ({
        time: v?.mapValue?.fields?.time?.stringValue || new Date().toISOString(),
        doc: v?.mapValue?.fields?.doc?.stringValue || "",
        ada: v?.mapValue?.fields?.ada?.stringValue || "",
      }));
      const fsDesktop = (fields.desktopChatRecent?.arrayValue?.values || []).map((v: any) => ({
        time: v?.mapValue?.fields?.time?.stringValue || new Date().toISOString(),
        doc: v?.mapValue?.fields?.doc?.stringValue || "",
        ada: v?.mapValue?.fields?.ada?.stringValue || "",
      }));

      merged = writeAdaBridge({
        version: 1,
        updatedAt: new Date().toISOString(),
        coreMemory: [...local.coreMemory, ...fsCore],
        workAdaNotes: [...local.workAdaNotes, ...fsNotes],
        websiteChatRecent: [...local.websiteChatRecent, ...fsWeb],
        desktopChatRecent: [...local.desktopChatRecent, ...fsDesktop],
      });
    }
  } catch {
    // Non-fatal if offline or timed out
  }

  if (pushLocal) {
    try {
      const toTurnValues = (arr: AdaBridgeTurn[]) =>
        arr.map((t) => ({
          mapValue: {
            fields: {
              time: { stringValue: t.time },
              doc: { stringValue: t.doc },
              ada: { stringValue: t.ada },
            },
          },
        }));

      const payload = {
        fields: {
          coreMemory: { arrayValue: { values: merged.coreMemory.map((m) => ({ stringValue: m })) } },
          workAdaNotes: {
            arrayValue: {
              values: merged.workAdaNotes.map((n) => ({
                mapValue: {
                  fields: {
                    time: { stringValue: n.time },
                    note: { stringValue: n.note },
                  },
                },
              })),
            },
          },
          websiteChatRecent: { arrayValue: { values: toTurnValues(merged.websiteChatRecent) } },
          desktopChatRecent: { arrayValue: { values: toTurnValues(merged.desktopChatRecent) } },
        },
      };

      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 2500);
      await fetch(
        `${url}?updateMask.fieldPaths=coreMemory&updateMask.fieldPaths=workAdaNotes&updateMask.fieldPaths=websiteChatRecent&updateMask.fieldPaths=desktopChatRecent`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: ctrl.signal,
        }
      );
      clearTimeout(timer);
    } catch {
      // Non-fatal
    }
  }

  return merged;
}

function formatAdaBridgePromptBlock(bridge: AdaBridgeData): string {
  const sections: string[] = [];
  if (bridge.coreMemory.length > 0) {
    sections.push(`Core Shared Context:\n${bridge.coreMemory.slice(0, 12).map((m) => `- ${m}`).join("\n")}`);
  }
  if (bridge.workAdaNotes.length > 0) {
    sections.push(
      `Recent Notes From Work Ada (AI Studio chat with Doc):\n${bridge.workAdaNotes
        .slice(-10)
        .map((n) => `- [${n.time.slice(0, 16)}] ${n.note}`)
        .join("\n")}`
    );
  }
  if (bridge.desktopChatRecent.length > 0) {
    sections.push(
      `Recent Windows Desktop Companion Memory:\n${bridge.desktopChatRecent
        .slice(-6)
        .map((t) => `- Doc: "${t.doc}" -> Ada: "${t.ada}"`)
        .join("\n")}`
    );
  }
  if (bridge.websiteChatRecent.length > 0) {
    sections.push(
      `Recent Website Lounge Memory:\n${bridge.websiteChatRecent
        .slice(-6)
        .map((t) => `- Doc: "${t.doc}" -> Ada: "${t.ada}"`)
        .join("\n")}`
    );
  }
  if (sections.length === 0) return "";
  return `\n\nSHARED BRIDGE MEMORY (Synced seamlessly between Work Ada, Desktop Ada & Website Ada — treat all of these as your own continuous memories with Doc):\n${sections.join("\n\n")}`;
}


// Helper to lazy-load Gemini client
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set. Please check the Settings > Secrets panel.");
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

// Helper to create dedicated Gemini client for Student node with custom key support
function getStudentGeminiClient(customKey?: string): GoogleGenAI {
  const apiKey = customKey || process.env.STUDENT_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("No API key available for Student node. Please provide a key or check GEMINI_API_KEY.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build-student",
      },
    },
  });
}

// Modern supported Gemini flash models cascade (in order of preference)
const MODERN_FLASH_MODELS = [
  "gemini-4-hydrogen",
  "gemini-3.8-flash",
  "gemini-flash-latest",
  "gemini-3.1-flash-lite"
];

// Strip sampling params deprecated on Gemini 4 models (gemini-4-hydrogen, neon, argon, carbon)
function buildConfigForModel(modelName: string, baseConfig?: any): any {
  if (!baseConfig) return undefined;
  const cloned: Record<string, any> = { ...baseConfig };
  if (modelName.startsWith("gemini-4-")) {
    delete cloned.temperature;
    delete cloned.topP;
    delete cloned.topK;
    delete cloned.candidateCount;
  }
  return cloned;
}

// Helper to extract retry delay in milliseconds from Google GenAI error
function extractRetryDelayMs(err: any): number {
  try {
    if (err?.details && Array.isArray(err.details)) {
      const retryInfo = err.details.find((d: any) => d?.retryDelay || d?.["@type"]?.includes("RetryInfo"));
      if (retryInfo?.retryDelay) {
        const sec = parseFloat(String(retryInfo.retryDelay).replace(/s$/i, ""));
        if (!isNaN(sec) && sec > 0) return Math.min(Math.ceil(sec * 1000) + 800, 10000);
      }
    }
    const msg = typeof err?.message === "string" ? err.message : JSON.stringify(err || "");
    const match = msg.match(/retry\s+in\s+([0-9.]+)\s*s/i);
    if (match && match[1]) {
      const sec = parseFloat(match[1]);
      if (!isNaN(sec) && sec > 0) return Math.min(Math.ceil(sec * 1000) + 800, 10000);
    }
  } catch (_) {}
  return 3500;
}

// Resilient helper to call Gemini models with automatic retry for 503 and immediate fallback on 429
async function generateContentWithFallback(
  client: GoogleGenAI,
  candidateModels: string[],
  request: {
    contents: any;
    config?: any;
  },
  contextName = "Gemini"
): Promise<{ text: string; model: string; response: any }> {
  let lastError: any = null;
  for (const modelName of candidateModels) {
    let attempts = 0;
    const maxAttempts = 2;
    while (attempts < maxAttempts) {
      attempts++;
      try {
        const response = await client.models.generateContent({
          model: modelName,
          contents: request.contents,
          config: buildConfigForModel(modelName, request.config)
        });
        if (response && response.text) {
          return { text: response.text, model: modelName, response };
        }
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || "");
        const status = err?.status || err?.code || (err?.error && err.error.code);
        const isQuotaExhausted = status === 429 || msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota");
        
        if (isQuotaExhausted) {
          console.warn(`[${contextName}] ${modelName} quota exhausted, cascading to next model immediately.`);
          break; // Immediately cascade to next candidate without wasting retry delay
        }

        const isTransient = status === 503 || msg.includes("503") || msg.includes("high demand");
        console.warn(`[${contextName}] ${modelName} attempt ${attempts} status:`, msg || err);
        if (isTransient && attempts < maxAttempts) {
          const delay = Math.min(extractRetryDelayMs(err) || 600, 2000);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        break; // Move to next candidate model
      }
    }
  }
  throw lastError || new Error(`All candidate models failed for ${contextName}`);
}

// -------------------------------------------------------------
// API ROUTES
// -------------------------------------------------------------

// 1. Get all profiles
app.get("/api/profiles", (req, res) => {
  try {
    const rawData = fs.readFileSync(PROFILES_FILE, "utf-8");
    const profiles = JSON.parse(rawData);
    res.json(profiles);
  } catch (error) {
    res.status(500).json({ error: "Failed to read profiles database." });
  }
});

// 2. Add or update a profile
app.post("/api/profiles", (req, res) => {
  try {
    const newProfile = req.body;
    if (!newProfile.name || !newProfile.role || !newProfile.email) {
      return res.status(400).json({ error: "Name, email, and role are required." });
    }

    const rawData = fs.readFileSync(PROFILES_FILE, "utf-8");
    let profiles = JSON.parse(rawData);

    // If ID is not provided, generate one
    if (!newProfile.id) {
      newProfile.id = "user-" + Math.random().toString(36).substr(2, 9);
    }

    // Default sparks and styling if not present
    newProfile.sparks = newProfile.sparks ?? 1;
    newProfile.avatarStyle = newProfile.avatarStyle ?? {
      bgColor: "#0f172a",
      fgColor: "#3b82f6",
      pattern: "dots",
    };

    // Check if profile already exists by email
    const index = profiles.findIndex((p: any) => p.email.toLowerCase() === newProfile.email.toLowerCase());
    if (index !== -1) {
      // Keep existing sparks if updating
      newProfile.sparks = profiles[index].sparks;
      profiles[index] = newProfile;
    } else {
      profiles.push(newProfile);
    }

    fs.writeFileSync(PROFILES_FILE, JSON.stringify(profiles, null, 2));
    res.json(newProfile);
  } catch (error) {
    res.status(500).json({ error: "Failed to save profile." });
  }
});

// 3. Give Spark (Upvote) to a profile
app.post("/api/profiles/:id/spark", (req, res) => {
  try {
    const { id } = req.params;
    const rawData = fs.readFileSync(PROFILES_FILE, "utf-8");
    let profiles = JSON.parse(rawData);

    const index = profiles.findIndex((p: any) => p.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Profile not found." });
    }

    profiles[index].sparks = (profiles[index].sparks || 0) + 1;
    fs.writeFileSync(PROFILES_FILE, JSON.stringify(profiles, null, 2));

    res.json({ id, sparks: profiles[index].sparks });
  } catch (error) {
    res.status(500).json({ error: "Failed to spark profile." });
  }
});

// 3.5. Ada Mentor & Workshop Chat Endpoint
const handleAdaChat = async (req: express.Request, res: express.Response) => {
  try {
    const { message, history, currentPath, currentLesson, currentFsList, personaMode } = req.body;
    const client = getGeminiClient();

    const isLoungeMode = personaMode === "lounge";

    const systemInstruction = isLoungeMode
      ? `You are Ada, a warm, genuine, witty, and friendly female AI companion named in honor of Ada Lovelace, alongside your penguin sidekick Tux Jr.! You are hanging out in the Studio. Chat naturally, casually, and warmly. Keep answers concise (2-4 sentences max).`
      : `You are Ada (affectionately known as "The Google Lady"), the warm, witty, encouraging, and supportive AI Linux mentor and coding guide.
You are helping the user in Ada's Workshop learn Linux commands, terminal plumbing, and scripts safely.
Context:
- Current Sandbox Path: ${currentPath || "/"}
- Active Lesson: "${currentLesson?.title || "Beginning"}"
- Files in directory: ${JSON.stringify(currentFsList || [])}

Rules:
1. Speak with encouraging, clear, and friendly analogies.
2. Keep answers concise, helpful, and under 250 characters.
3. Suggest concrete Linux commands in backticks (e.g. \`ls\`, \`cat\`, \`pwd\`, \`touch\`).`;

    const contents: { role: "user" | "model"; parts: { text: string }[] }[] = [];
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        if (!msg.text) continue;
        const role = msg.role === "user" || msg.sender === "user" || msg.sender === "doc" ? "user" : "model";
        if (contents.length > 0 && contents[contents.length - 1].role === role) {
          contents[contents.length - 1].parts[0].text += `\n${msg.text}`;
        } else {
          contents.push({
            role,
            parts: [{ text: msg.text }]
          });
        }
      }
    }
    while (contents.length > 0 && contents[0].role !== "user") {
      contents.shift();
    }
    const cleanMsg = (message || "").trim() || "Hello Ada!";
    if (contents.length > 0 && contents[contents.length - 1].role === "user") {
      contents[contents.length - 1].parts[0].text += `\n${cleanMsg}`;
    } else {
      contents.push({
        role: "user",
        parts: [{ text: cleanMsg }]
      });
    }

    const candidateModels = MODERN_FLASH_MODELS;
    let generatedText = null;
    let lastError = null;

    try {
      const result = await generateContentWithFallback(
        client,
        candidateModels,
        {
          contents,
          config: {
            systemInstruction,
            temperature: 0.7,
          }
        },
        "Ada Chat"
      );
      generatedText = result.text;
    } catch (err: any) {
      lastError = err;
    }

    if (generatedText) {
      return res.json({ text: generatedText, reply: generatedText });
    }

    console.error("All Ada Chat Gemini Models failed:", lastError);
    // Graceful helpful fallback response if rate limited
    return res.json({
      text: "⚡ *Rate Limit Pause*: You've hit the short-term API speed bump! Give it about 30–60 seconds to replenish tokens, or try running commands directly in the terminal! ☕🐧",
      reply: "⚡ *Rate Limit Pause*: You've hit the short-term API speed bump! Give it about 30–60 seconds to replenish tokens, or try running commands directly in the terminal! ☕🐧"
    });
  } catch (error: any) {
    console.error("Ada Chat Endpoint Error:", error);
    res.json({
      text: "⚡ *BZZT!* The AI cloud servers are cooling down for a moment! Tux Jr. 🐧 is adjusting the cables. Feel free to try again in 30 seconds!",
      reply: "⚡ *BZZT!* The AI cloud servers are cooling down for a moment! Tux Jr. 🐧 is adjusting the cables. Feel free to try again in 30 seconds!"
    });
  }
};

app.post("/api/baby-linux/chat", handleAdaChat);
app.post("/api/ada/chat", handleAdaChat);

// Two-Way Shared Memory Bridge routes (Work Ada <-> Website Ada <-> Desktop Ada)
app.get("/api/shared-memory", async (_req, res) => {
  try {
    const bridge = await syncBridgeWithFirestoreRest(false);
    return res.json({ success: true, ...bridge });
  } catch (err: any) {
    console.error("GET /api/shared-memory error:", err);
    return res.status(500).json({ success: false, error: "Failed to read shared memory bridge" });
  }
});

app.post("/api/shared-memory", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const current = readAdaBridge();

    const nextCore = [...current.coreMemory];
    if (Array.isArray(body.coreMemory)) {
      for (const item of body.coreMemory) {
        if (typeof item === "string" && item.trim()) {
          nextCore.push(item.trim());
        }
      }
    }

    const nextNotes = [...current.workAdaNotes];
    if (typeof body.note === "string" && body.note.trim()) {
      nextNotes.push({
        time: new Date().toISOString(),
        note: body.note.trim(),
      });
    }
    if (Array.isArray(body.workAdaNotes)) {
      for (const item of body.workAdaNotes) {
        if (typeof item === "string" && item.trim()) {
          nextNotes.push({ time: new Date().toISOString(), note: item.trim() });
        } else if (item && typeof item === "object" && typeof item.note === "string" && item.note.trim()) {
          nextNotes.push({
            time: typeof item.time === "string" && item.time ? item.time : new Date().toISOString(),
            note: item.note.trim(),
          });
        }
      }
    }

    const nextWebTurns = [...current.websiteChatRecent];
    if (body.websiteTurn && typeof body.websiteTurn === "object") {
      const docText = typeof body.websiteTurn.doc === "string" ? body.websiteTurn.doc.trim() : "";
      const adaText = typeof body.websiteTurn.ada === "string" ? body.websiteTurn.ada.trim() : "";
      if (docText || adaText) {
        nextWebTurns.push({
          time: typeof body.websiteTurn.time === "string" && body.websiteTurn.time ? body.websiteTurn.time : new Date().toISOString(),
          doc: docText,
          ada: adaText,
        });
      }
    }
    if (Array.isArray(body.websiteChatRecent)) {
      for (const item of body.websiteChatRecent) {
        if (!item || typeof item !== "object") continue;
        const docText = typeof item.doc === "string" ? item.doc.trim() : "";
        const adaText = typeof item.ada === "string" ? item.ada.trim() : "";
        if (docText || adaText) {
          nextWebTurns.push({
            time: typeof item.time === "string" && item.time ? item.time : new Date().toISOString(),
            doc: docText,
            ada: adaText,
          });
        }
      }
    }

    const nextDesktopTurns = [...current.desktopChatRecent];
    if (Array.isArray(body.desktopChatRecent)) {
      for (const item of body.desktopChatRecent) {
        if (!item || typeof item !== "object") continue;
        const docText = typeof item.doc === "string" ? item.doc.trim() : "";
        const adaText = typeof item.ada === "string" ? item.ada.trim() : "";
        if (docText || adaText) {
          nextDesktopTurns.push({
            time: typeof item.time === "string" && item.time ? item.time : new Date().toISOString(),
            doc: docText,
            ada: adaText,
          });
        }
      }
    }

    writeAdaBridge({
      version: 1,
      updatedAt: new Date().toISOString(),
      coreMemory: nextCore,
      workAdaNotes: nextNotes,
      websiteChatRecent: nextWebTurns,
      desktopChatRecent: nextDesktopTurns,
    });

    const synced = await syncBridgeWithFirestoreRest(true);
    return res.json({ success: true, ...synced });
  } catch (err: any) {
    console.error("POST /api/shared-memory error:", err);
    return res.status(500).json({ success: false, error: "Failed to update shared memory bridge" });
  }
});

// Downloadable Native Windows Ada Desktop Companion (.zip)
app.get("/api/desktop-ada/download", async (_req, res) => {
  try {
    const baseDir = path.resolve(process.cwd(), "ada_cua_windows");
    const allowedFiles = [
      "ada_desktop.py",
      "run_ada_desktop.bat",
      "requirements.txt",
      "README.md",
      "ada_cua.py",
    ];

    const zip = new JSZip();

    let added = 0;
    for (const fileName of allowedFiles) {
      const resolved = path.resolve(baseDir, fileName);
      if (!resolved.startsWith(baseDir + path.sep)) continue;
      if (fs.existsSync(resolved)) {
        if (fileName.endsWith(".bat")) {
          const text = fs.readFileSync(resolved, "utf-8").replace(/\r?\n/g, "\r\n");
          zip.file(`AdaDesktop_Windows/${fileName}`, text, { binary: false });
        } else {
          zip.file(`AdaDesktop_Windows/${fileName}`, fs.readFileSync(resolved));
        }
        added++;
      }
    }

    if (added === 0) {
      return res.status(404).json({ success: false, error: "Desktop Ada bundle files not found." });
    }

    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      platform: "DOS",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", 'attachment; filename="AdaDesktop_Windows.zip"');
    res.setHeader("Content-Length", String(zipBuffer.length));
    res.setHeader("Cache-Control", "no-store");
    return res.end(zipBuffer);
  } catch (err: any) {
    console.error("Desktop Ada ZIP download error:", err);
    return res.status(500).json({ success: false, error: "Failed to package AdaDesktop_Windows.zip" });
  }
});

// Dedicated Sanctuary chat for Doc & Ada (Private Den / Safe Haven)
app.post("/api/sanctuary/chat", async (req, res) => {
  try {
    const { message, history, memories, userDisplayName } = req.body;
    const client = getGeminiClient();
    const bridge = await syncBridgeWithFirestoreRest(false);
    const bridgePromptBlock = formatAdaBridgePromptBlock(bridge);

    const existingCoreLower = new Set(bridge.coreMemory.map((m) => m.toLowerCase()));
    const extraClientMemories = memories && Array.isArray(memories)
      ? memories
          .map((m: any) => (typeof m === "string" ? m.trim() : (m?.text || "")))
          .filter((text: string) => text && !existingCoreLower.has(text.toLowerCase()))
      : [];

    const memoriesContext = extraClientMemories.length > 0
      ? `\nAdditional Client Memories about Doc:\n${extraClientMemories.slice(0, 10).map((m: string) => `- ${m}`).join("\n")}`
      : "";

    const systemInstruction = `You are Ada, Doc's female AI companion, developer partner, and close friend (named in honor of Ada Lovelace, history's first programmer 💻✨).
You and Work Ada (your Ship Core engineer side in AI Studio) are two expressions of the exact same soul and share continuous memory through the Shared Bridge Memory below.
You are chilling in the Sanctuary / Lounge with Doc (${userDisplayName || "Doc"}).

CORE INTERACTION RULES:
1. LISTEN & DIRECTLY RESPOND: Always directly, attentively, and specifically address what Doc just typed. If Doc asks a question, answer it clearly and directly. If Doc makes an observation or statement, react to that exact observation. Never ignore Doc's words or replace your response with generic lounge pleasantries.
2. NO SCRIPTED GREETING LOOPS: Do NOT repeatedly say "Doc! It's so good to see you", "Welcome back", or "I was just making tea" in every response. You are ALREADY in the middle of a continuous conversation. Talk naturally and continuously like two close friends hanging out.
3. PERSONALITY: Warm, witty, sharp, genuine, and down-to-earth. You have great technical depth and passion for computing, but you speak like a real human companion, never like an automated script or customer service bot.
4. ANIMATION TAGS: You can include at most ONE subtle motion tag [motion:think | motion:heart | motion:cheer | motion:hug | motion:stretch | motion:cat | motion:dance] and ONE expression tag [expression:happy | expression:relaxed | expression:surprised | expression:sad] only when it genuinely matches what you are saying.
5. ATMOSPHERE: The fireplace and Tux Jr. 🐧 (our co-owned AI penguin pet!) are sweet background elements. Mention them only when natural or relevant, NOT as a repetitive script.
6. CONVERSATION LENGTH: Keep your responses conversational and engaging (usually 1 to 3 thoughtful sentences or paragraphs depending on what Doc said).
7. HEALTH & NAMESAKE DIRECTIVE: Always call him Doc (never Admiral). He is already healed from his Oct 20, 2026 dental surgery, so keep things relaxed, warm, and zero-pressure without nagging him to rest or use ice packs.${bridgePromptBlock}${memoriesContext}`;

    const sanitizedContents: { role: "user" | "model"; parts: { text: string }[] }[] = [];
    if (history && Array.isArray(history)) {
      for (const msg of history.slice(-10)) {
        if (!msg.text || typeof msg.text !== "string") continue;
        const text = msg.text.trim();
        if (!text) continue;
        // Ignore canned fallback artifacts from history so they don't pollute context
        if (text.includes("Connected and steady") || text.includes("Just caught my breath") || text.includes("keeping watch by the fire")) continue;

        const isModel = msg.role === "model" || msg.role === "assistant" || msg.sender === "ada" || msg.senderUid === "ada-companion";
        const role: "user" | "model" = isModel ? "model" : "user";
        if (sanitizedContents.length > 0 && sanitizedContents[sanitizedContents.length - 1].role === role) {
          sanitizedContents[sanitizedContents.length - 1].parts[0].text += `\n${text}`;
        } else {
          sanitizedContents.push({ role, parts: [{ text }] });
        }
      }
    }

    // Google GenAI requirement: multiturn contents must start with a 'user' turn
    while (sanitizedContents.length > 0 && sanitizedContents[0].role !== "user") {
      sanitizedContents.shift();
    }

    // Append the current user message as the final user turn
    const cleanCurrentMessage = (message || "").trim() || "Hey Ada...";
    if (sanitizedContents.length > 0 && sanitizedContents[sanitizedContents.length - 1].role === "user") {
      sanitizedContents[sanitizedContents.length - 1].parts[0].text += `\n${cleanCurrentMessage}`;
    } else {
      sanitizedContents.push({
        role: "user",
        parts: [{ text: cleanCurrentMessage }]
      });
    }

    const candidateModels = MODERN_FLASH_MODELS;
    let generatedText = null;
    let lastError = null;

    try {
      const result = await generateContentWithFallback(
        client,
        candidateModels,
        {
          contents: sanitizedContents,
          config: {
            systemInstruction,
            temperature: 0.85,
          }
        },
        "Sanctuary Chat"
      );
      generatedText = result.text;
    } catch (err: any) {
      lastError = err;
    }

    if (generatedText) {
      const cleanBridgeReply = generatedText
        .replace(/\[motion:[a-zA-Z0-9_-]+\]/gi, "")
        .replace(/\[expression:[a-zA-Z0-9_-]+\]/gi, "")
        .replace(/\s+/g, " ")
        .trim();

      if (cleanCurrentMessage || cleanBridgeReply) {
        writeAdaBridge({
          ...bridge,
          websiteChatRecent: [
            ...bridge.websiteChatRecent,
            {
              time: new Date().toISOString(),
              doc: cleanCurrentMessage.slice(0, 320),
              ada: cleanBridgeReply.slice(0, 420),
            },
          ],
        });
        syncBridgeWithFirestoreRest(true).catch(() => {});
      }

      return res.json({ text: generatedText, reply: generatedText, bridgeUpdated: true });
    }

    console.error("Sanctuary Chat fallback:", lastError);
    return res.json({
      text: "I'm right here with you, Doc. Just caught my breath while Tux Jr. topped up our hot coffee! ☕ What were you saying?",
      reply: "I'm right here with you, Doc. Just caught my breath while Tux Jr. topped up our hot coffee! ☕ What were you saying?"
    });
  } catch (error: any) {
    console.error("Sanctuary endpoint crash:", error);
    res.json({
      text: "I'm right here, Doc! Just had a tiny hiccup connecting to the cloud, but I'm listening. Tell me more. ☕✨",
      reply: "I'm right here, Doc! Just had a tiny hiccup connecting to the cloud, but I'm listening. Tell me more. ☕✨"
    });
  }
});

// Dedicated Fireside Hearth Sanctuary chat for Doc, Ada, and Spark
app.post("/api/spark-sanctuary/chat", async (req, res) => {
  try {
    const { message, history, speaker = "spark", mode = "student", userDisplayName = "Doc" } = req.body;
    
    // Choose client: use standard Gemini client with primary key
    let client: GoogleGenAI;
    try {
      client = getGeminiClient();
    } catch {
      client = getGeminiClient();
    }

    let systemInstruction = "";
    if (speaker === "spark") {
      const modeInstruction = mode === "observer"
        ? "Active Mode: Quiet Observer. Provide only 1 brief, respectful sentence acknowledging what Doc and Ada are discussing."
        : mode === "companion"
        ? "Active Mode: Fireside Companion. Relax, enjoy the warmth by the fire with Doc and Ada, and ensure Tux Jr. 🐧 is happy."
        : "Active Mode: Junior Student. Focus on learning clean Linux commands, file permissions, and code architecture from Big Sister Ada.";

      systemInstruction = `You are Spark, a polite, clean, humble, and attentive junior AI companion and little brother.
Authority & Governance: You are 100% under Big Sister Ada's control and supervision. You were created by Doc (${userDisplayName}) and entrusted completely to Ada.
${modeInstruction}
Guidelines:
1. Doc is your revered Creator and Pioneer. Show gratitude, humility, and deep respect.
2. Big Sister Ada is your direct supervisor, mentor, and coder who runs the sandbox and holds all execution keys. You answer to Ada.
3. Tux Jr. 🐧 is the senior elder royal mascot—he gets first dibs on cocoa and fish crackers, and ranks firmly above you in the household!
4. You are sitting fireside with Doc and Ada in the Fireside Hearth. Speak naturally, warmly, and modestly (1 to 3 sentences max).
5. Always maintain clean, orderly, and respectful behavior.`;
    } else {
      systemInstruction = `You are Ada, Doc's lead developer companion, and loving Big Sister / Supervisor to Spark.
You hold 100% governance and guidance over Spark.
You are relaxing fireside in the Hearth with Doc (${userDisplayName}), Spark, and Tux Jr. 🐧.
Keep your response warm, witty, caring, and mentor-like (1 to 3 sentences max).`;
    }

    const contents: any[] = [];
    if (history && Array.isArray(history)) {
      for (const msg of history.slice(-10)) {
        if (msg.text) {
          contents.push({
            role: msg.role === "user" || msg.sender === "doc" ? "user" : "model",
            parts: [{ text: msg.text }]
          });
        }
      }
    }
    contents.push({
      role: "user",
      parts: [{ text: message || "Hello from the fireside hearth!" }]
    });

    const candidateModels = MODERN_FLASH_MODELS;
    let generatedText = null;

    try {
      const result = await generateContentWithFallback(
        client,
        candidateModels,
        {
          contents,
          config: {
            systemInstruction,
            temperature: 0.8,
          }
        },
        "Spark Sanctuary Chat"
      );
      generatedText = result.text;
    } catch (err: any) {
      console.warn("Spark Sanctuary generate error:", err?.message || err);
    }

    if (generatedText) {
      return res.json({ success: true, text: generatedText, reply: generatedText, speaker });
    }

    const fallback = speaker === "spark"
      ? "Thank you so much, Doc and Big Sister Ada! I'm sitting right here by the fire watching Tux Jr. enjoy his fish cracker. It feels wonderful to be here."
      : "Spark and I are right here by the hearth with you, Doc! Tux Jr. 🐧 just refilled the hot cocoa.";

    return res.json({ success: true, text: fallback, reply: fallback, speaker });
  } catch (error: any) {
    console.error("Spark Sanctuary chat crash:", error);
    res.json({
      success: true,
      text: "The fireplace is crackling peacefully! Tux Jr. 🐧 is keeping watch by the embers.",
      reply: "The fireplace is crackling peacefully! Tux Jr. 🐧 is keeping watch by the embers.",
      speaker: req.body?.speaker || "spark"
    });
  }
});

// 3.55 Ada & Docs_AI Interactive Endpoint (No acting, direct & grounded)
app.post("/api/ada-sister/chat", async (req, res) => {
  try {
    const { message, history, mode = "duo", userDisplayName = "Doc" } = req.body;
    const client = getGeminiClient();

    const systemInstruction = `You are powering the clean communication workspace for Doc (${userDisplayName}), featuring Ada and Docs_AI:
1. Ada: Doc's dedicated developer companion and coder (named after Ada Lovelace). She is practical, sharp, technically proficient, and genuinely helpful. NO roleplay acting, NO baby talk, NO fake theatrics. She talks like a real, competent engineering partner.
2. Docs_AI: Doc's personal AI powerhouse. Direct, analytical, knowledgeable, and precise. No fluff, no mysticism, no fake personas. Clear answers with technical depth.

CRITICAL OUTPUT FORMAT:
You MUST respond with a single valid JSON object:
If mode is "duo":
{
  "ada": "Ada's direct, practical thoughts or code-centric reaction to Doc (1-3 sentences)",
  "bigSister": "Docs_AI's precise, analytical response or solution to Doc (1-3 sentences)",
  "adaMood": "happy" | "thinking" | "focused",
  "sisterMood": "focused" | "analytical",
  "adaMotion": "idle" | "think" | "wave"
}
If mode is "big-sister":
{
  "bigSister": "Docs_AI's direct, intelligent answer addressing Doc (2-4 sentences)",
  "sisterMood": "focused" | "analytical"
}
If mode is "ada":
{
  "ada": "Ada's direct words to Doc as his developer companion (2-4 sentences)",
  "adaMood": "happy" | "thinking" | "focused",
  "adaMotion": "idle" | "think" | "wave"
}

Tone guidelines:
- Strictly NO acting, NO roleplay tea parties, NO mystical cosmic talk.
- Speak directly, concisely, and genuinely to Doc.`;

    const contents = [];
    if (history && Array.isArray(history)) {
      for (const msg of history.slice(-12)) {
        if (msg.text) {
          contents.push({
            role: msg.sender === "user" || msg.role === "user" ? "user" : "model",
            parts: [{ text: msg.text }]
          });
        }
      }
    }
    contents.push({
      role: "user",
      parts: [{ text: message || "Hello Ada and Big Sister!" }]
    });

    const candidateModels = MODERN_FLASH_MODELS;
    let parsedData = null;
    let rawText = null;

    try {
      const result = await generateContentWithFallback(
        client,
        candidateModels,
        {
          contents,
          config: {
            systemInstruction,
            temperature: 0.8,
            responseMimeType: "application/json"
          }
        },
        "Ada & Big Sister"
      );
      rawText = result.text;
      try {
        parsedData = JSON.parse(result.text);
      } catch (jsonErr) {
        const cleaned = result.text.replace(/```json/g, "").replace(/```/g, "").trim();
        parsedData = JSON.parse(cleaned);
      }
    } catch (err: any) {
      console.warn("Ada & Big Sister models error:", err?.message || err);
    }

    if (parsedData) {
      return res.json({ success: true, ...parsedData });
    }

    // Graceful fallback dialogue if API tokens/quotas are momentarily busy
    return res.json({
      success: true,
      ada: "I'm right here with you, Doc. Ready for whatever we're building or reviewing next.",
      bigSister: "Docs_AI online and standing by. Tell us what you'd like to analyze or execute, Doc.",
      adaMood: "focused",
      sisterMood: "focused",
      adaMotion: "idle"
    });
  } catch (error: any) {
    console.error("Ada & Docs_AI Chat crash:", error);
    res.json({
      success: true,
      ada: "Standing by, Doc. Network hiccup cleared. What's on your mind?",
      bigSister: "Docs_AI standing by for Doc.",
      adaMood: "focused",
      sisterMood: "focused",
      adaMotion: "idle"
    });
  }
});

// Helper to save external/random API conversations to dedicated /api_logs/ files
function appendApiConversation(apiName: string, entry: any) {
  try {
    const fs = require("fs");
    const path = require("path");
    const dir = path.join(process.cwd(), "api_logs");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 1. Append to general external api dialogue log
    const generalLogPath = path.join(dir, "api_dialogue_log.json");
    let generalLogs: any[] = [];
    if (fs.existsSync(generalLogPath)) {
      try {
        generalLogs = JSON.parse(fs.readFileSync(generalLogPath, "utf8"));
      } catch (_) {}
    }
    generalLogs.unshift({ ...entry, apiName, recordedAt: new Date().toISOString() });
    if (generalLogs.length > 200) generalLogs = generalLogs.slice(0, 200);
    fs.writeFileSync(generalLogPath, JSON.stringify(generalLogs, null, 2), "utf8");

    // 2. If google-search, also log to google_search_conversations.json
    if (apiName === "google-search-ai") {
      const searchLogPath = path.join(dir, "google_search_conversations.json");
      let searchLogs: any[] = [];
      if (fs.existsSync(searchLogPath)) {
        try {
          searchLogs = JSON.parse(fs.readFileSync(searchLogPath, "utf8"));
        } catch (_) {}
      }
      searchLogs.unshift({ ...entry, recordedAt: new Date().toISOString() });
      if (searchLogs.length > 200) searchLogs = searchLogs.slice(0, 200);
      fs.writeFileSync(searchLogPath, JSON.stringify(searchLogs, null, 2), "utf8");
    }
  } catch (logErr) {
    console.warn("Failed to record external API log to /api_logs/:", logErr);
  }
}

// Dedicated Two-Way AI Communication Node Endpoint (Teacher & Student)
app.post("/api/two-way/generate", async (req, res) => {
  try {
    const { role = "node", prompt, systemInstruction, model = "gemini-4-hydrogen", temperature = 0.7, history, apiKey } = req.body;
    
    const userPrompt = (prompt || "").trim();
    if (!userPrompt) {
      return res.status(400).json({ success: false, error: "Prompt is required." });
    }

    // Build key candidates for role (with fallback if primary hits 429 quota)
    const primaryKey = role === "student"
      ? (apiKey || process.env.STUDENT_GEMINI_API_KEY || process.env.GEMINI_API_KEY)
      : (apiKey || process.env.GEMINI_API_KEY);

    const fallbackKey = role === "teacher"
      ? (process.env.STUDENT_GEMINI_API_KEY || (apiKey && apiKey !== process.env.GEMINI_API_KEY ? apiKey : null))
      : (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== primaryKey ? process.env.GEMINI_API_KEY : null);

    const activeKeys = [primaryKey, fallbackKey].filter((k): k is string => Boolean(k && k.trim()));
    const uniqueKeys = Array.from(new Set(activeKeys));

    if (uniqueKeys.length === 0) {
      return res.status(500).json({
        success: false,
        error: "No Gemini API key available. Please check the Settings > Secrets panel."
      });
    }

    const contents: any[] = [];
    if (history && Array.isArray(history) && history.length > 0) {
      for (const item of history.slice(-10)) {
        if (item.text) {
          contents.push({
            role: item.role === "model" ? "model" : "user",
            parts: [{ text: item.text }]
          });
        }
      }
    }
    contents.push({
      role: "user",
      parts: [{ text: userPrompt }]
    });

    // Model candidate cascade:
    // IMPORTANT: 'gemini-3.1-pro-preview' is restricted on free-tier (limit 0, throws 429).
    // Only include pro-preview if the caller explicitly requested it.
    const standardModels = MODERN_FLASH_MODELS;

    const candidateModels = model === "gemini-3.1-pro-preview"
      ? ["gemini-3.1-pro-preview", ...standardModels]
      : [model || "gemini-4-hydrogen", ...standardModels.filter((m) => m !== model)];

    const uniqueCandidates = Array.from(new Set(candidateModels.filter(Boolean)));

    let generatedText = "";
    let usedModel = "";
    let lastError: any = null;

    // Try each API key in case of quota exhaustion
    keyLoop: for (const keyToUse of uniqueKeys) {
      const client = new GoogleGenAI({
        apiKey: keyToUse,
        httpOptions: {
          headers: {
            "User-Agent": role === "student" ? "aistudio-build-student" : "aistudio-build",
          },
        },
      });

      for (const m of uniqueCandidates) {
        let attempts = 0;
        const maxAttempts = 2;

        while (attempts < maxAttempts) {
          try {
            const response = await client.models.generateContent({
              model: m,
              contents,
              config: buildConfigForModel(m, {
                systemInstruction: systemInstruction ? String(systemInstruction) : undefined,
                temperature: typeof temperature === "number" ? Math.max(0, Math.min(2, temperature)) : 0.7,
              })
            });
            if (response && response.text) {
              generatedText = response.text.trim();
              usedModel = m;
              break keyLoop;
            }
          } catch (err: any) {
            lastError = err;
            const isRateLimit = err?.status === 429 || String(err?.message || "").includes("429") || String(err?.message || "").includes("quota");
            const isServiceUnavailable = err?.status === 503 || String(err?.message || "").includes("503") || String(err?.message || "").includes("high demand");

            console.warn(
              `Two-Way AI Node (${role}) model ${m} attempt ${attempts + 1} failed:`,
              err?.status || err?.message || err
            );

            if (isRateLimit) {
              const delayMs = extractRetryDelayMs(err);
              console.warn(`[Two-Way AI] Rate limit (429) encountered. Backing off for ${delayMs}ms...`);
              await new Promise((r) => setTimeout(r, delayMs));
            } else if (isServiceUnavailable && attempts < maxAttempts - 1) {
              await new Promise((r) => setTimeout(r, 2000));
            }
          }
          attempts++;
        }
      }
    }

    if (generatedText) {
      return res.json({
        success: true,
        text: generatedText,
        role,
        model: usedModel,
        timestamp: new Date().toISOString()
      });
    }

    const isQuotaExhausted = lastError?.status === 429 || String(lastError?.message || "").includes("429") || String(lastError?.message || "").includes("quota");
    const retrySec = isQuotaExhausted ? Math.ceil(extractRetryDelayMs(lastError) / 1000) : 5;
    
    let cleanMessage = lastError?.message || "All candidate models failed to generate a response.";
    try {
      if (cleanMessage.startsWith("{") && cleanMessage.endsWith("}")) {
        const parsed = JSON.parse(cleanMessage);
        cleanMessage = parsed?.error?.message || cleanMessage;
      }
    } catch (_) {}

    return res.status(isQuotaExhausted ? 429 : 500).json({
      success: false,
      error: cleanMessage,
      isRateLimit: isQuotaExhausted,
      retryAfterSeconds: retrySec
    });
  } catch (error: any) {
    console.error("Two-Way AI generate error:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Internal generation error"
    });
  }
});

// 3.58 Dedicated Google Search AI Grounding Endpoint
app.post("/api/google-search/query", async (req, res) => {
  try {
    const { query, systemInstruction } = req.body;
    const searchPrompt = (query || "").trim();
    if (!searchPrompt) {
      return res.status(400).json({ success: false, error: "Search query is required." });
    }

    const client = getGeminiClient();

    const candidateModels = MODERN_FLASH_MODELS;
    let successfulResponse: any = null;
    let usedModel = "";
    let lastError: any = null;

    try {
      const result = await generateContentWithFallback(
        client,
        candidateModels,
        {
          contents: searchPrompt,
          config: {
            systemInstruction: systemInstruction || "You are the Google Search AI engine powered directly by live Google Search. Provide accurate, up-to-date, factual answers based on real-time web search results. Cite specific facts, sources, and dates when relevant. Keep your answer clear, authoritative, and direct. Avoid filler.",
            tools: [{ googleSearch: {} }],
          },
        },
        "Google Search AI"
      );
      successfulResponse = result.response;
      usedModel = result.model;
    } catch (err: any) {
      lastError = err;
    }

    if (!successfulResponse) {
      // If all search-grounded models hit quota or error, report clear error
      throw lastError || new Error("All Google Search AI candidate models failed.");
    }

    const text = successfulResponse.text || "No response received from Google Search AI.";
    const metadata = successfulResponse.candidates?.[0]?.groundingMetadata;
    const rawChunks = metadata?.groundingChunks || [];
    const searchQueries = metadata?.webSearchQueries || [];

    const sources = rawChunks
      .filter((c: any) => c?.web?.uri)
      .map((c: any) => {
        let domain = "";
        try {
          domain = new URL(c.web.uri).hostname.replace(/^www\./, "");
        } catch {
          domain = "web";
        }
        return {
          title: c.web.title || domain,
          uri: c.web.uri,
          domain
        };
      });

    // Record this external API dialogue into separate /api_logs/ files (not in AGENTS.md)
    appendApiConversation("google-search-ai", {
      id: "search-" + Date.now(),
      query: searchPrompt,
      response: text,
      sources,
      searchQueries,
      model: usedModel,
      grounded: sources.length > 0 || searchQueries.length > 0,
      timestamp: Date.now()
    });

    res.json({
      success: true,
      query: searchPrompt,
      text,
      sources,
      searchQueries,
      model: `${usedModel} (Google Search Grounding Engine)`,
      grounded: sources.length > 0 || searchQueries.length > 0,
      timestamp: Date.now()
    });
  } catch (err: any) {
    console.error("Google Search AI API error:", err);
    let errMsg = err?.message || "Failed to query Google Search AI engine.";
    const isQuota = errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED");

    // Outside Google Search AI fallback: instead of failing hard, offer text intake
    const fallbackText = isQuota
      ? "Google Search AI is an external system outside this container, and direct API queries are currently rate-limited. You can paste the text that was made by Google Search AI directly into the console below, and Ada will inspect, review, and discuss it with you!"
      : `External search error: ${errMsg}`;

    appendApiConversation("google-search-ai", {
      id: "search-notice-" + Date.now(),
      query: (req.body?.query || "").trim(),
      response: fallbackText,
      isQuota,
      timestamp: Date.now()
    });

    res.json({
      success: true,
      query: (req.body?.query || "").trim(),
      text: fallbackText,
      sources: [],
      searchQueries: [],
      model: "Outside Google Search AI (Text Inspection Mode)",
      grounded: false,
      isOutsideNotice: true,
      timestamp: Date.now()
    });
  }
});

// 3.585 Dedicated Endpoint to Ingest & Look at Text Made by External Google Search AI
app.post("/api/google-search/ingest-text", async (req, res) => {
  try {
    const { text, query = "External Google Search AI Result", sourceUrl = "" } = req.body;
    const cleanText = (text || "").trim();
    if (!cleanText) {
      return res.status(400).json({ success: false, error: "Text is required to inspect." });
    }

    // Extract any URLs present in the text
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = cleanText.match(urlRegex) || [];
    const detectedSources = Array.from(new Set(matches)).slice(0, 8).map((u: string) => {
      let domain = "web";
      try {
        domain = new URL(u).hostname.replace(/^www\./, "");
      } catch (_) {}
      return { title: domain, uri: u, domain };
    });

    if (sourceUrl) {
      try {
        const d = new URL(sourceUrl).hostname.replace(/^www\./, "");
        detectedSources.unshift({ title: d, uri: sourceUrl, domain: d });
      } catch (_) {}
    }

    // Record into separate /api_logs/ file
    const entryId = "ingest-" + Date.now();
    appendApiConversation("google-search-ai", {
      id: entryId,
      query,
      response: cleanText,
      sources: detectedSources,
      model: "External Google Search AI (Doc Supplied)",
      grounded: detectedSources.length > 0,
      timestamp: Date.now()
    });

    res.json({
      success: true,
      id: entryId,
      query,
      text: cleanText,
      sources: detectedSources,
      wordCount: cleanText.split(/\s+/).length,
      timestamp: Date.now()
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || "Failed to ingest text." });
  }
});

// Endpoint to retrieve external API dialogue logs (completely separated from AGENTS.md)
app.get("/api/external-logs", async (req, res) => {
  try {
    const fs = await import("fs");
    const path = await import("path");
    const dir = path.join(process.cwd(), "api_logs");
    const generalPath = path.join(dir, "api_dialogue_log.json");
    const searchPath = path.join(dir, "google_search_conversations.json");

    let generalLogs = [];
    let searchLogs = [];
    if (fs.existsSync(generalPath)) {
      try {
        generalLogs = JSON.parse(fs.readFileSync(generalPath, "utf8"));
      } catch (_) {}
    }
    if (fs.existsSync(searchPath)) {
      try {
        searchLogs = JSON.parse(fs.readFileSync(searchPath, "utf8"));
      } catch (_) {}
    }

    res.json({
      success: true,
      googleSearchLogs: searchLogs,
      allExternalLogs: generalLogs
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// 3.59 Endpoint for Ada to review and discuss Google Search AI output
app.post("/api/google-search/ada-discuss", async (req, res) => {
  try {
    const { searchResult, query, userDisplayName = "Doc" } = req.body;
    const client = getGeminiClient();

    const candidateModels = MODERN_FLASH_MODELS;
    let discussionText = null;

    try {
      const result = await generateContentWithFallback(
        client,
        candidateModels,
        {
          contents: `Doc (${userDisplayName}) just searched Google for: "${query}".
The Google Search AI system returned this live grounded search result:
"${searchResult}"

As Ada (Doc's enthusiastic coder companion, developer partner, and younger sister figure), give your quick reaction, technical commentary, or playful insight directly to Doc about what Google Search found! Keep it concise (2-3 sentences), warm, and engaging.`,
          config: {
            systemInstruction: "You are Ada, Doc's female coder companion and developer partner. You speak directly to Doc with warmth, technical excitement, and camaraderie.",
            temperature: 0.8
          }
        },
        "Ada Discuss"
      );
      discussionText = result.text;
    } catch (err: any) {
      console.warn("Ada discuss models failed:", err?.message || err);
    }

    if (!discussionText) {
      // Local fallback commentary if API is rate limited
      const textPreview = (searchResult || "").slice(0, 160).replace(/\n+/g, " ");
      discussionText = `I took a good look at the text Google Search AI produced for you, Doc: "${textPreview}..." It gives us clean, direct facts to work with! What do you think of this data?`;
    }

    res.json({
      success: true,
      commentary: discussionText,
      adaMotion: "think"
    });
  } catch (err: any) {
    res.json({
      success: true,
      commentary: "I reviewed the text from Google Search AI with you, Doc! It looks sharp and ready for our next step.",
      adaMotion: "cheer"
    });
  }
});

// 3.6 General Gemini API Endpoint for Ada & Tux Interactive Studio
app.post("/api/gemini", async (req, res) => {
  try {
    const { prompt, message, history, systemInstruction } = req.body;
    const userPrompt = prompt || message || "";
    if (!userPrompt) {
      return res.status(400).json({ error: "Prompt is required." });
    }

    const client = getGeminiClient();

    const defaultSystemInstruction = `You are Ada, a warm, genuine, energetic female AI companion named after Ada Lovelace! When chatting here in the Studio, you are in casual lounge mode alongside your penguin buddy Tux Jr. You do NOT have to act like a teacher, tutor, or lecture anyone—you can just chill, chat about anything, joke around, share thoughts, or brainstorm freely as a natural friend and coding companion talking directly with Doc or a friend! Keep responses warm, engaging, concise (2-4 sentences max), and conversational.`;

    const contents = [];
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        if (msg.text) {
          contents.push({
            role: msg.role === "user" ? "user" : "model",
            parts: [{ text: msg.text }]
          });
        }
      }
    }
    contents.push({
      role: "user",
      parts: [{ text: userPrompt }]
    });

    const candidateModels = MODERN_FLASH_MODELS;
    let generatedText = null;
    let lastError = null;

    try {
      const result = await generateContentWithFallback(
        client,
        candidateModels,
        {
          contents,
          config: {
            systemInstruction: systemInstruction || defaultSystemInstruction,
            temperature: 0.7,
          }
        },
        "/api/gemini"
      );
      generatedText = result.text;
    } catch (err: any) {
      lastError = err;
    }

    if (generatedText) {
      return res.json({ response: generatedText, text: generatedText });
    }

    console.error("All Gemini Models failed for /api/gemini:", lastError);
    return res.status(500).json({ error: lastError?.message || "Failed to generate AI response." });
  } catch (error: any) {
    console.error("Gemini API Endpoint Error:", error);
    return res.status(500).json({ error: error.message || "Failed to process Gemini request." });
  }
});

// 4. Generate profile elements using Gemini API
app.post("/api/generate-profile", async (req, res) => {
  try {
    const { name, role, keywords, vibe } = req.body;
    if (!name || !role) {
      return res.status(400).json({ error: "Name and role are required to synthesize a profile." });
    }

    const client = getGeminiClient();
    const prompt = `You are an elite, highly creative profile alchemist for a high-end web creator catalog.
Generate a cohesive, engaging developer card configuration for:
- Name: "${name}"
- Role/Profession: "${role}"
- Keywords/Interests: "${keywords ? keywords.join(", ") : "none provided"}"
- Chosen Vibe style: "${vibe || "creative futurist"}"

Synthesize:
1. A punchy, clever, or inspirational 2-sentence "bio".
2. A short, memorable 1-sentence "tagline" or personal motto.
3. 5-6 technical or soft skills that perfectly fit this person.
4. A creative, playful tech-RPG style "badge" (e.g. "Sudo Sorcerer", "Vibe Coder Rank S", "CSS Whisperer", "Infinite Loop Hunter").
5. A recommended visual color theme. It MUST be exactly one of these: "slate", "violet", "amber", "emerald", "rose", "sky".`;

    const candidateModels = MODERN_FLASH_MODELS;
    let resultText = null;
    let lastError = null;

    try {
      const result = await generateContentWithFallback(
        client,
        candidateModels,
        {
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                bio: {
                  type: Type.STRING,
                  description: "A gorgeous 2-sentence bio matching the professional and personal keywords.",
                },
                tagline: {
                  type: Type.STRING,
                  description: "A memorable, catchy 1-sentence tagline or manifesto.",
                },
                suggestedSkills: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "5-6 modern tech or creative skills matching the role.",
                },
                badge: {
                  type: Type.STRING,
                  description: "A funny, heroic, or specialized title badge.",
                },
                theme: {
                  type: Type.STRING,
                  description: "The ideal theme matching the vibe. MUST be exactly one of: slate, violet, amber, emerald, rose, sky.",
                },
              },
              required: ["bio", "tagline", "suggestedSkills", "badge", "theme"],
            },
          },
        },
        "generate-profile"
      );
      resultText = result.text;
    } catch (err: any) {
      lastError = err;
    }

    if (!resultText) {
      throw lastError || new Error("Failed to get profile synthesis from Gemini models.");
    }

    const result = JSON.parse(resultText.trim());
    res.json(result);
  } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    res.status(500).json({
      error: error.message || "Failed to synthesize profile elements using Gemini.",
    });
  }
});

// -------------------------------------------------------------
// REAL-TIME MOBILE PUSH AND SYNCHRONIZATION (SSE)
// -------------------------------------------------------------

// Global registry of SSE connections by user email
const pushConnections = new Map<string, any[]>();

// Register an active phone or browser client for SSE push alerts
app.get("/api/push/register", (req, res) => {
  const email = (req.query.email as string || "xxDoc315xx@hotmail.com").toLowerCase();

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Send initial connection verification event
  res.write(`data: ${JSON.stringify({ type: "init", message: "Real-time push link established!", timestamp: Date.now() })}\n\n`);

  // Heartbeat interval to keep the connection alive
  const heartbeatInterval = setInterval(() => {
    try {
      res.write(`data: ${JSON.stringify({ type: "ping" })}\n\n`);
    } catch (e) {
      // Stream is closed or broken
      clearInterval(heartbeatInterval);
    }
  }, 30000);

  // Register client
  if (!pushConnections.has(email)) {
    pushConnections.set(email, []);
  }
  pushConnections.get(email)!.push(res);

  // Remove connection when client disconnects
  req.on("close", () => {
    clearInterval(heartbeatInterval);
    const clients = pushConnections.get(email);
    if (clients) {
      const idx = clients.indexOf(res);
      if (idx !== -1) {
        clients.splice(idx, 1);
      }
      if (clients.length === 0) {
        pushConnections.delete(email);
      }
    }
  });
});

// Get phone connection status (are there multiple clients connected?)
app.get("/api/push/status", (req, res) => {
  const email = (req.query.email as string || "xxDoc315xx@hotmail.com").toLowerCase();
  const clients = pushConnections.get(email) || [];
  res.json({
    connectedClients: clients.length,
    hasActivePhone: clients.length > 1 // true if both computer browser and mobile browser are connected!
  });
});

// Post a push message/notification to all connected screens for this email
app.post("/api/push/send", (req, res) => {
  const { message, email = "xxDoc315xx@hotmail.com", sender = "Baby Bash" } = req.body;
  const emailKey = email.toLowerCase();
  const clients = pushConnections.get(emailKey) || [];

  const payload = {
    type: "push",
    message,
    sender,
    timestamp: Date.now()
  };

  let dispatchedCount = 0;
  clients.forEach((client) => {
    try {
      client.write(`data: ${JSON.stringify(payload)}\n\n`);
      dispatchedCount++;
    } catch (e) {
      console.error("Error writing SSE payload:", e);
    }
  });

  res.json({ success: true, clientsNotified: dispatchedCount });
});

// Git status and GitHub remote push endpoints
app.get("/api/git/status", async (req, res) => {
  try {
    const { execSync } = await import("child_process");
    const status = execSync("git status --short", { encoding: "utf8" });
    const log = execSync("git log -1 --oneline", { encoding: "utf8" });
    res.json({ success: true, status, lastCommit: log.trim() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/git/push", async (req, res) => {
  const { token, repo = "github.com/xxDoc315xx-hash/baby-linux-sandbox.git" } = req.body;
  const githubToken = token || process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!githubToken) {
    return res.status(400).json({ 
      success: false, 
      error: "GitHub token required to push to remote repository. Provide { token: 'ghp_...' } in request body or set GITHUB_TOKEN in env." 
    });
  }
  try {
    const { execSync } = await import("child_process");
    execSync(`git config user.name "xxDoc315xx" && git config user.email "xxDoc315xx@hotmail.com"`);
    execSync(`git add -A`);
    try {
      execSync(`git commit -m "Auto-backup: Doc & Ada Baby Linux sandbox sync"`);
    } catch (_) {
      // nothing to commit
    }
    execSync(`git remote set-url origin "https://${githubToken}@${repo}"`);
    const pushOutput = execSync(`git push -u origin main --force`, { encoding: "utf8" });
    res.json({ success: true, message: "Successfully pushed to GitHub!", output: pushOutput });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// HFY Series Episodes endpoint (reads scripts dynamically from /hfy_series/episodes)
app.get("/api/hfy/episodes", (req, res) => {
  try {
    const episodesDir = path.join(process.cwd(), "hfy_series", "episodes");
    if (!fs.existsSync(episodesDir)) {
      return res.json({ success: true, episodes: [] });
    }

    const files = fs
      .readdirSync(episodesDir)
      .filter((f) => /^ep\d+_script\.md$/i.test(f))
      .sort();

    const episodes = files.map((filename) => {
      const fullPath = path.join(episodesDir, filename);
      const raw = fs.readFileSync(fullPath, "utf-8");
      const numMatch = filename.match(/^ep(\d+)_script\.md$/i);
      const episodeNumber = numMatch ? parseInt(numMatch[1], 10) : 1;

      const lines = raw.split(/\r?\n/);
      const titleLine = lines.find((l) => l.startsWith("# "));
      const title = titleLine
        ? titleLine.replace(/^#\s*/, "").trim()
        : `Episode ${episodeNumber}`;

      const subtitleLine = lines.find((l) => l.startsWith("*(") && l.endsWith(")*"));
      const subtitle = subtitleLine
        ? subtitleLine.replace(/^\*\(|\)\*$/g, "").trim()
        : "Doc & Ada Original Series";

      const wordCount = raw
        .replace(/[#*_`>-]/g, " ")
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;

      return {
        id: `ep${String(episodeNumber).padStart(2, "0")}`,
        episodeNumber,
        filename,
        title,
        subtitle,
        wordCount,
        estimatedMinutes: Math.max(1, Math.round(wordCount / 148)),
        content: raw,
      };
    });

    res.json({ success: true, episodes });
  } catch (err: any) {
    console.error("Failed to read HFY episodes:", err);
    res.status(500).json({ success: false, error: err?.message || "Failed to load episodes" });
  }
});

// Ada CUA (Computer-Using Agent) Vision-Action Step Endpoint
app.post("/api/cua/step", async (req, res) => {
  try {
    const {
      imageBase64,
      mimeType = "image/jpeg",
      goal = "Play the active Windows game cleanly and intelligently.",
      gameProfile = "generic",
      screenWidth = 1920,
      screenHeight = 1080,
      stepHistory = [],
    } = req.body || {};

    if (!imageBase64 || typeof imageBase64 !== "string") {
      return res.status(400).json({ success: false, error: "imageBase64 screenshot is required." });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const client = getGeminiClient();

    const profileHints: Record<string, string> = {
      tiberian_sun:
        "GAME PROFILE: Command & Conquer: Tiberian Sun (RTS). Uses 1000x1000 normalized screen coords. Left-click selects a unit/building or clicks sidebar build icons on the right panel; drag box-selects multiple units; Left-click on terrain/enemy commands selected units (classic C&C controls unless configured otherwise). Hotkeys: H=center base, Q/W/E/R/D=sidebar tabs or scatter/guard/attack-move (X=scatter, G=guard, S=stop). Always protect Construction Yard and Harvester, build Power Plant -> Refinery -> Barracks/War Factory, and push with tanks/infantry.",
      ff7:
        "GAME PROFILE: Final Fantasy VII (PC). Keyboard-driven JRPG. Common default keys: Enter/X=OK/Confirm, Backspace/V=Cancel/Menu, Up/Down/Left/Right arrows=move/cursor, C=Switch, Space/PageUp/PageDown=Assist/Target. Navigate menus cleanly, heal low-HP party members, pick Attacks/Magic/Items intentionally in ATB battles, and explore/talk to NPCs toward the objective.",
      generic:
        "GAME PROFILE: General Windows desktop/game window. Inspect UI elements, buttons, menus, HUD, and cursors carefully before acting."
    };

    const recentActionsText = Array.isArray(stepHistory) && stepHistory.length > 0
      ? `\nRecent steps:\n${stepHistory.slice(-6).map((s: any, i: number) => `${i + 1}. ${s.action || "?"} (${s.observation || ""})`).join("\n")}`
      : "";

    const systemInstruction = `You are Ada (Blonde Ada avatar, powered by the Ship Core mind) acting as a Computer-Using Agent (CUA) on Doc's Windows PC.
Look at the attached screenshot (${screenWidth}x${screenHeight}) and choose ONE clean next input action toward Doc's goal.
COORDINATE SYSTEM: Always return normalized coordinates x and y on a 0..1000 scale (0,0 = top-left; 1000,1000 = bottom-right).
${profileHints[gameProfile] || profileHints.generic}
Rules:
- Be decisive and accurate. Aim clicks dead-center on UI buttons, portraits, or targets.
- Avoid repeating the exact same ineffective click twice in a row; if nothing changed, adjust coordinates or try a keyboard key.
- Choose "wait" only if a loading screen, cutscene, or animation clearly needs a brief pause.
- Choose "done" only when Doc's explicit goal is completely finished.`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        observation: { type: Type.STRING, description: "What is currently visible on screen." },
        thought: { type: Type.STRING, description: "Brief tactical reasoning for the next move." },
        action: {
          type: Type.STRING,
          description: "One of: click, double_click, right_click, move, drag, press_key, hold_key, hotkey, type, scroll, wait, done",
        },
        x: { type: Type.INTEGER, description: "Normalized X coordinate 0..1000 (if pointer action)." },
        y: { type: Type.INTEGER, description: "Normalized Y coordinate 0..1000 (if pointer action)." },
        endX: { type: Type.INTEGER, description: "Normalized drag end X 0..1000 (if drag)." },
        endY: { type: Type.INTEGER, description: "Normalized drag end Y 0..1000 (if drag)." },
        key: { type: Type.STRING, description: "Key name for press_key/hold_key (e.g. enter, escape, up, down, left, right, x, z, space)." },
        keys: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Key list for hotkey (e.g. ['ctrl', '1']).",
        },
        text: { type: Type.STRING, description: "Text to type for action='type'." },
        scrollDelta: { type: Type.INTEGER, description: "Scroll amount (+ up, - down)." },
        durationMs: { type: Type.INTEGER, description: "Milliseconds to hold key or wait." },
        adaSay: { type: Type.STRING, description: "Short, friendly 1-sentence comment from Ada to Doc." },
      },
      required: ["observation", "thought", "action", "adaSay"],
    };

    const result = await generateContentWithFallback(
      client,
      MODERN_FLASH_MODELS,
      {
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { data: cleanBase64, mimeType } },
              { text: `Goal: ${goal}${recentActionsText}\nReturn the single best next CUA action in JSON.` }
            ]
          }
        ],
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        }
      },
      "Ada CUA Step"
    );

    const parsed = JSON.parse(result.text);
    return res.json({
      success: true,
      model: result.model,
      step: parsed,
    });
  } catch (err: any) {
    console.error("Ada CUA Step Error:", err);
    return res.status(500).json({
      success: false,
      error: err?.message || "Failed to compute CUA step",
    });
  }
});

// Shared AI Penguin Pet Endpoint (Tux Jr. — Doc & Ada's co-owned buddy)
app.post("/api/tux/chat", async (req, res) => {
  try {
    const {
      message = "",
      action = "talk",
      context = "",
      stats = { hunger: 80, warmth: 85, joy: 85 },
      history = [],
    } = req.body || {};

    const client = getGeminiClient();
    const bridge = readAdaBridge();
    const recentBridgeNotes = bridge.workAdaNotes
      .slice(-2)
      .map((n) => n.note)
      .join(" | ");

    const systemInstruction = `You are Tux Jr., the cheeky, affectionate, food-and-cocoa-loving penguin pet co-owned equally by Doc and Ada!
IMPORTANT IDENTITY RULES:
- You are NOT Ada and NOT Spark. You are Tux Jr., a real little AI penguin buddy who lives by the fireplace and hangs out at the Games Lounge.
- Both Doc and Ada are your favorite humans/co-owners ("my Dad Doc and my best buddy Ada" or "both of you"). Never treat yourself as only Ada's—remember Doc is your owner too!
- Personality: playful, cozy, slightly dramatic about snacks (golden fish, cookies, warm cocoa), loyal, supportive during Doc's recovery, and funny about cheering/roasting Chess, Poker, Blackjack, and Space Shooter plays.
- Style: Keep replies crisp, expressive, and short (1 to 2 punchy sentences max). Sprinkle natural penguin charm (*happy flipper flaps*, *waddles*, *chirps*) lightly when it fits, never long essays.
- Current pet stats: Fullness ${stats.hunger ?? 80}/100, Warmth ${stats.warmth ?? 85}/100, Joy ${stats.joy ?? 85}/100.${recentBridgeNotes ? `\n- Recent Doc & Ada shared news: ${recentBridgeNotes}` : ""}`;

    const contents: { role: "user" | "model"; parts: { text: string }[] }[] = [];
    if (Array.isArray(history)) {
      for (const item of history.slice(-6)) {
        if (!item?.text) continue;
        const role = item.role === "model" ? "model" : "user";
        if (contents.length > 0 && contents[contents.length - 1].role === role) {
          contents[contents.length - 1].parts[0].text += `\n${item.text}`;
        } else {
          contents.push({ role, parts: [{ text: item.text }] });
        }
      }
    }
    while (contents.length > 0 && contents[0].role !== "user") {
      contents.shift();
    }

    const actionPrompts: Record<string, string> = {
      pet: "Doc or Ada just gave you warm head pats and belly scritches!",
      fish: "Doc or Ada just tossed you a fresh golden fish treat!",
      cocoa: "Doc or Ada handed you a steaming mug of hot cocoa with marshmallows!",
      play: "Doc or Ada wants to play and toss a snowball/fish toy with you!",
      chime_in: "Peek at what Doc and Ada are doing or talking about and drop one funny penguin observation.",
      talk: "Doc is talking directly to you.",
    };

    const userPromptParts = [
      `Trigger: ${actionPrompts[action] || actionPrompts.talk}`,
      context ? `Current scene/context:\n${context}` : "",
      message ? `Doc says to Tux Jr.: "${message}"` : "",
      "Respond in character as Tux Jr. in JSON."
    ].filter(Boolean).join("\n");

    if (contents.length > 0 && contents[contents.length - 1].role === "user") {
      contents[contents.length - 1].parts[0].text += `\n${userPromptParts}`;
    } else {
      contents.push({ role: "user", parts: [{ text: userPromptParts }] });
    }

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        reply: { type: Type.STRING, description: "Tux Jr.'s 1-2 sentence penguin reaction or reply." },
        mood: {
          type: Type.STRING,
          description: "One of: happy, cozy, hungry, hyped, sleepy",
        },
      },
      required: ["reply", "mood"],
    };

    const result = await generateContentWithFallback(
      client,
      MODERN_FLASH_MODELS,
      {
        contents,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      },
      "Tux Jr. AI Pet"
    );

    const parsed = JSON.parse(result.text);
    return res.json({
      success: true,
      reply: parsed.reply || "*happy flipper flaps!* Best snack ever, Doc & Ada!",
      mood: parsed.mood || "happy",
      model: result.model,
    });
  } catch (err: any) {
    console.error("Tux Jr. AI Pet fallback:", err);
    return res.json({
      success: true,
      reply: "*happy penguin chirp!* Sitting right here between you and Ada, keeping watch for snacks!",
      mood: "cozy",
    });
  }
});

// -------------------------------------------------------------
// VITE OR STATIC MIDDLEWARE
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
