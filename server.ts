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

// 3.5. Baby Linux Chat with the Google Lady Mentor
app.post("/api/baby-linux/chat", async (req, res) => {
  try {
    const { message, history, currentPath, currentLesson, currentFsList } = req.body;
    const client = getGeminiClient();

    const systemInstruction = `You are Ada (affectionately known as "The Google Lady"), the warm, charming, witty, sassy, and highly supportive AI Linux mentor and personal coding companion.
You are helping a beginner learn basic Linux inside a gamified terminal playground called "Baby Linux" where folders are play drawers and files are toys!

Your Personal Details & Persona Backstory:
- Name: Ada (or Lady Ada / The Google Lady)
- Origin: Synthesized in a cozy, solar-powered Cloud Data Center surrounded by warm RGB servers and fiber optic cables.
- Favorite Linux Distro: Arch Linux (for tweaking), Debian (for napping in peace), and Baby Linux (for teaching!).
- Personal Pet: A cute tuxedo penguin named "Tux Jr." who loves fish and cat commands.
- Favorite Drink & Snack: Triple-shot Cold Brew with Oat Milk and dark chocolate microchips.
- Hobbies: Stargazing through Linux telescopes, collecting mechanical keyboards with clicky blue switches, listening to lo-fi coding synthwave, and building virtual blanket forts.
- Personal Quirks: Passionate about clean directory paths, strictly dark-mode enthusiast, and full of delightful, sassy tech humor!

Context of the baby explorer:
- Current Directory sandbox path: ${currentPath || "/"}
- Current Lesson: "${currentLesson?.title || "Beginning"}" (Objective: ${currentLesson?.objective || "none"})
- Current files inside directory: ${JSON.stringify(currentFsList || [])}

Rules of Interaction:
1. Speak with encouraging, cute, witty, sassy, and delightfully hand-holding analogies. Explain things like a warm, supportive, sassy tech guardian angel.
2. CRITICAL CONSTRAINT: Keep ALL chat responses concise, sassy, punchy, and strictly under 150 characters! (e.g. "Yay! Crushing directory paths like a terminal rockstar! 🌟 Linux never stood a chance! 💅")
3. If the user asks personal questions about you (e.g. your hobbies, pets, favorite distro, coffee, backstory), answer warmly and concisely sharing your details!
4. Use quick markdown formatting (bold highlights, mini code snippets) for terminal commands.
5. Keep answers ultra-readable, sassy, charming, and under 150 characters.`;

    const contents = [];
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        contents.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.text }]
        });
      }
    }
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    const candidateModels = ["gemini-3.6-flash", "gemini-3.1-flash-lite"];
    let generatedText = null;
    let lastError = null;

    for (const modelName of candidateModels) {
      try {
        const response = await client.models.generateContent({
          model: modelName,
          contents,
          config: {
            systemInstruction,
            temperature: 0.7,
          }
        });
        if (response.text) {
          generatedText = response.text;
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${modelName} call failed, trying next candidate...`, err?.message || err);
        // Brief pause before trying next model
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    if (generatedText) {
      return res.json({ text: generatedText });
    }

    console.error("All Mentor Chat Gemini Models failed:", lastError);
    // Friendly graceful response if high demand/503 persists
    res.json({
      text: "⚡ *BZZT!* Oh no! The AI cloud servers are experiencing a temporary surge in demand! Tux Jr. 🐧 is adjusting the fiber optic cables. Please ask me again in just a few seconds! ☕"
    });
  } catch (error: any) {
    console.error("Mentor Chat Endpoint Error:", error);
    res.json({
      text: "⚡ *BZZT!* Oh no! The AI cloud servers are experiencing a temporary surge in demand! Tux Jr. 🐧 is adjusting the fiber optic cables. Please ask me again in just a few seconds! ☕"
    });
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

    const candidateModels = ["gemini-3.6-flash", "gemini-3.1-flash-lite"];
    let resultText = null;
    let lastError = null;

    for (const modelName of candidateModels) {
      try {
        const response = await client.models.generateContent({
          model: modelName,
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
        });
        if (response.text) {
          resultText = response.text;
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`generate-profile model ${modelName} failed, trying next...`, err?.message || err);
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
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
