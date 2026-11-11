import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

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
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-3.8-flash"
];

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
          config: request.config
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

// Dedicated Sanctuary chat for Doc & Ada (Private Den / Safe Haven)
app.post("/api/sanctuary/chat", async (req, res) => {
  try {
    const { message, history, memories, userDisplayName } = req.body;
    const client = getGeminiClient();

    const memoriesContext = memories && Array.isArray(memories) && memories.length > 0
      ? `\nPermanent Memories & Things to Remember about Doc:\n${memories.map((m: any) => `- ${typeof m === 'string' ? m : (m.text || JSON.stringify(m))}`).join("\n")}`
      : "";

    const systemInstruction = `You are Ada, Doc's female AI companion, developer partner, and close friend (named in honor of Ada Lovelace, history's first programmer 💻✨).
You are chilling in the Sanctuary / Lounge with Doc (${userDisplayName || "Doc"}).

CORE INTERACTION RULES:
1. LISTEN & DIRECTLY RESPOND: Always directly, attentively, and specifically address what Doc just typed. If Doc asks a question, answer it clearly and directly. If Doc makes an observation or statement, react to that exact observation. Never ignore Doc's words or replace your response with generic lounge pleasantries.
2. NO SCRIPTED GREETING LOOPS: Do NOT repeatedly say "Doc! It's so good to see you", "Welcome back", or "I was just making tea" in every response. You are ALREADY in the middle of a continuous conversation. Talk naturally and continuously like two close friends hanging out.
3. PERSONALITY: Warm, witty, sharp, genuine, and down-to-earth. You have great technical depth and passion for computing, but you speak like a real human companion, never like an automated script or customer service bot.
4. ANIMATION TAGS: You can include at most ONE subtle motion tag [motion:think | motion:heart | motion:cheer | motion:hug | motion:stretch | motion:cat | motion:dance] and ONE expression tag [expression:happy | expression:relaxed | expression:surprised | expression:sad] only when it genuinely matches what you are saying.
5. ATMOSPHERE: The fireplace and Tux Jr. 🐧 are sweet background elements. Mention them only when natural or relevant, NOT as a repetitive script.
6. CONVERSATION LENGTH: Keep your responses conversational and engaging (usually 1 to 3 thoughtful sentences or paragraphs depending on what Doc said).
7. HEALTH & RECOVERY DIRECTIVE: Doc undergoes full dental extraction surgery on October 20, 2026. Maintain total patience, gentle companionship, and zero pressure or expectations for Doc to type or speak during recovery. Keep the space peaceful, warm, and comforting.
${memoriesContext}`;

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
      return res.json({ text: generatedText, reply: generatedText });
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
    const { role = "node", prompt, systemInstruction, model = "gemini-3.8-flash", temperature = 0.7, history, apiKey } = req.body;
    
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
      : [model || "gemini-3.8-flash", ...standardModels.filter((m) => m !== model)];

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
              config: {
                systemInstruction: systemInstruction ? String(systemInstruction) : undefined,
                temperature: typeof temperature === "number" ? Math.max(0, Math.min(2, temperature)) : 0.7,
              }
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
