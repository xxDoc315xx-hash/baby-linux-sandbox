import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Terminal as TerminalIcon,
  Code,
  BookOpen,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  HelpCircle,
  Play,
  FileText,
  Folder,
  ArrowRight,
  User,
  Coffee,
  Heart,
  X,
  Search,
  Database,
  Save,
  RotateCcw,
  Volume2,
  VolumeX,
  Layers,
  Cpu,
  Music,
  Sliders,
  Send,
  Download,
  Flame,
  ShieldCheck,
  Award,
  Lightbulb,
  Maximize2,
  Minimize2,
  Trash2
} from "lucide-react";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import adaTuxAvatar from "../assets/images/ada_tux_avatar_1785211204469.jpg";
import CommandDepository from "./CommandDepository";
import SystemLogViewer, { LogEntry } from "./SystemLogViewer";
import BackupManagerModal from "./BackupManagerModal";

interface AdaWorkbenchProps {
  currentUserEmail: string;
  nickname?: string;
  onProgressUpdate?: (progress: { currentLessonId: number; lessonsCompleted: number[]; xp: number; lastLessonTitle: string }) => void;
}

type WorkshopTab = "linux_terminal" | "visual_pipeline" | "memory_inspector" | "chiptune_synth";

// Simulated FS interfaces
interface SimulatedFile {
  name: string;
  type: "file";
  content: string;
  hidden?: boolean;
  permissions?: string;
}

interface SimulatedDirectory {
  name: string;
  type: "dir";
  hidden?: boolean;
  permissions?: string;
}

type FSNode = SimulatedFile | SimulatedDirectory;

interface FileSystem {
  [path: string]: FSNode;
}

// Guided Linux Quest definition
interface Lesson {
  id: number;
  title: string;
  subtitle: string;
  objective: string;
  instructions: string;
  successCondition: (cmd: string, args: string[], currentPath: string, fs: FileSystem, rawCmd?: string) => boolean;
  hint: string;
}

const LESSONS: Lesson[] = [
  {
    id: 1,
    title: "Level 1: Who Am I & Where Am I?",
    subtitle: "Learning pwd & whoami",
    objective: "Find out your active terminal username and current working directory path.",
    instructions: "Type 'pwd' to print the working directory, or 'whoami' to see your user badge!",
    successCondition: (cmd) => cmd === "pwd" || cmd === "whoami",
    hint: "Just type 'pwd' (Print Working Directory) and hit Enter!"
  },
  {
    id: 2,
    title: "Level 2: Peeking in the Folder",
    subtitle: "Using ls and ls -la",
    objective: "List all visible and hidden files inside your current directory.",
    instructions: "Type 'ls' to see normal files, or 'ls -la' to reveal secret dotfiles!",
    successCondition: (cmd, args) => cmd === "ls" || (cmd === "dir" && args.length === 0),
    hint: "Type 'ls' or 'ls -la' and press Enter to scan the filesystem."
  },
  {
    id: 3,
    title: "Level 3: Creating Your First File",
    subtitle: "Making new notes with touch & echo",
    objective: "Create a new file called 'notes.txt' using the touch command.",
    instructions: "Run 'touch notes.txt' to spawn a brand new empty file in your current folder.",
    successCondition: (cmd, args, currentPath, fs) => {
      if (cmd === "touch" && args.includes("notes.txt")) return true;
      const target = currentPath === "/" ? "/notes.txt" : `${currentPath}/notes.txt`;
      return !!fs[target];
    },
    hint: "Type 'touch notes.txt' and hit Enter. Watch it appear instantly in the file explorer!"
  },
  {
    id: 4,
    title: "Level 4: Reading File Contents",
    subtitle: "Using cat and less",
    objective: "Read what is written inside 'notes.txt' or 'welcome.txt' with cat.",
    instructions: "Type 'cat welcome.txt' to inspect its contents in the terminal window.",
    successCondition: (cmd, args) => cmd === "cat" && (args.includes("welcome.txt") || args.includes("notes.txt")),
    hint: "Type 'cat welcome.txt' and press Enter to read the file."
  },
  {
    id: 5,
    title: "Level 5: Making Directories",
    subtitle: "Organizing with mkdir and cd",
    objective: "Create a new directory called 'projects' and navigate inside it.",
    instructions: "Type 'mkdir projects' to build the folder, then 'cd projects' to step inside.",
    successCondition: (cmd, args, currentPath, fs) => {
      return (cmd === "mkdir" && args.includes("projects")) || currentPath.includes("projects");
    },
    hint: "First type 'mkdir projects' and then 'cd projects'."
  },
  {
    id: 6,
    title: "Level 6: Linux Superpower — Piping Streams!",
    subtitle: "Connecting commands with | (pipes)",
    objective: "Pipe output from cat through grep to filter matching lines.",
    instructions: "Run 'cat access.log | grep 500' to find error entries in the server logs.",
    successCondition: (cmd, args, currentPath, fs, rawCmd) => {
      return !!rawCmd && rawCmd.includes("|") && rawCmd.includes("grep");
    },
    hint: "Type 'cat access.log | grep 500' to isolate server error events!"
  }
];

const getInitialFS = (): FileSystem => ({
  "/": { type: "dir", name: "/" },
  "/welcome.txt": {
    type: "file",
    name: "welcome.txt",
    content: "✨ Welcome to Ada's Workshop! 💻\nHere you learn real Linux terminal skills with step-by-step guidance, a live visual file tree, and zero stress."
  },
  "/access.log": {
    type: "file",
    name: "access.log",
    content: "2026-08-17 14:00:12 GET /api/v1/auth 200\n2026-08-17 14:00:15 POST /api/v1/login 401\n2026-08-17 14:00:19 GET /api/v1/user 200\n2026-08-17 14:00:22 GET /api/v1/database 500\n2026-08-17 14:00:28 GET /api/v1/metrics 200\n2026-08-17 14:00:33 POST /api/v1/upload 500\n2026-08-17 14:00:39 GET /api/v1/health 200"
  },
  "/system.conf": {
    type: "file",
    name: "system.conf",
    content: "# Ada Workshop Node Config\nOS=AdaLinux-2026\nSHELL=bash\nMENTOR=AdaLovelace\nSOUND=enabled"
  },
  "/scripts": { type: "dir", name: "scripts" },
  "/scripts/hello.sh": {
    type: "file",
    name: "hello.sh",
    content: "#!/bin/bash\necho '🚀 Greetings from Ada Lovelace & Tux! Happy coding!'",
    permissions: "-rwxr-xr-x"
  },
  "/scripts/.secret_key.pem": {
    type: "file",
    name: ".secret_key.pem",
    content: "🔑 SUPER_SECRET_QUANTUM_KEY_ADA_2026",
    hidden: true
  }
});

export default function AdaWorkbench({ currentUserEmail, nickname = "Doc", onProgressUpdate }: AdaWorkbenchProps) {
  const [activeTab, setActiveTab] = useState<WorkshopTab>("linux_terminal");

  // Terminal & Filesystem State
  const [currentPath, setCurrentPath] = useState<string>("/");
  const [fs, setFs] = useState<FileSystem>(getInitialFS());
  const [inputVal, setInputVal] = useState<string>("");
  const [terminalLogs, setTerminalLogs] = useState<Array<{
    type: "cmd" | "output" | "error" | "success";
    text: string;
  }>>([
    { type: "output", text: "🛠️ Welcome to ADA'S LINUX & DEV WORKSHOP v2.5!" },
    { type: "output", text: "Type 'help' to see commands, 'quest' for active mission, or click any file on the left." },
    { type: "output", text: "Ada is here beside you to guide you through every command! 💻✨" }
  ]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Lesson & Quest State
  const [currentLessonId, setCurrentLessonId] = useState<number>(1);
  const [lessonsCompleted, setLessonsCompleted] = useState<number[]>([]);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [successCelebration, setSuccessCelebration] = useState<boolean>(false);
  const [isDepositoryOpen, setIsDepositoryOpen] = useState<boolean>(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);

  // Sound & Synth State
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Visual Pipeline Interactive State
  const [pipeLogInput, setPipeLogInput] = useState<string>(
    `2026-08-17 GET /api/v1/auth 200\n2026-08-17 POST /api/v1/login 401\n2026-08-17 GET /api/v1/user 200\n2026-08-17 GET /api/v1/database 500\n2026-08-17 GET /api/v1/metrics 200\n2026-08-17 POST /api/v1/upload 500\n2026-08-17 GET /api/v1/health 200`
  );
  const [pipeFilterGrep, setPipeFilterGrep] = useState<string>("500");
  const [pipeTransform, setPipeTransform] = useState<string>("count");
  const [pipeSimulating, setPipeSimulating] = useState<boolean>(false);

  // Memory Hex Inspector State
  const [hexInputText, setHexInputText] = useState<string>("Ada Lovelace 2026! 🚀");
  const [selectedHexIndex, setSelectedHexIndex] = useState<number | null>(null);

  // AI Mentor Chat Drawer / Box
  const [mentorChatInput, setMentorChatInput] = useState<string>("");
  const [mentorChatLogs, setMentorChatLogs] = useState<Array<{ sender: "user" | "ada"; text: string }>>([
    {
      sender: "ada",
      text: `Hello ${nickname || "Doc"}! Welcome to my workshop. Think of this as your safe, hands-on command deck. Feel free to ask me anything about Linux commands, file systems, or terminal plumbing!`
    }
  ]);
  const [isMentorThinking, setIsMentorThinking] = useState<boolean>(false);

  const termEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    termEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [terminalLogs]);

  // Sync Progress with Firestore
  useEffect(() => {
    if (!currentUserEmail) return;
    const docId = currentUserEmail.replace(/[^a-zA-Z0-9]/g, "_");
    const progressRef = doc(db, "workshop_progress", docId);

    const unsubscribe = onSnapshot(
      progressRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (typeof data.currentLessonId === "number") setCurrentLessonId(data.currentLessonId);
          if (Array.isArray(data.lessonsCompleted)) setLessonsCompleted(data.lessonsCompleted);
        }
      },
      (err) => {
        console.warn("Workshop progress listener notice:", err);
      }
    );

    return () => unsubscribe();
  }, [currentUserEmail]);

  const saveProgressToFirestore = async (newLessonId: number, completedList: number[]) => {
    if (!currentUserEmail) return;
    try {
      const docId = currentUserEmail.replace(/[^a-zA-Z0-9]/g, "_");
      const progressRef = doc(db, "workshop_progress", docId);
      await setDoc(progressRef, {
        currentLessonId: newLessonId,
        lessonsCompleted: completedList,
        xp: completedList.length * 100,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.warn("Progress sync note:", e);
    }
  };

  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  const playChiptune = (freq = 440, type: OscillatorType = "square", duration = 0.15) => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  };

  // Command Execution Handler
  const handleRunCommand = (rawInput: string) => {
    const trimmed = rawInput.trim();
    if (!trimmed) return;

    // Add to history
    setCommandHistory((prev) => [...prev, trimmed]);
    setHistoryIndex(-1);
    setInputVal("");

    const newLogs = [...terminalLogs, { type: "cmd" as const, text: `$ ${trimmed}` }];

    // Handle Pipe syntax
    if (trimmed.includes("|")) {
      handlePipedCommand(trimmed, newLogs);
      return;
    }

    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    // Evaluate against Active Quest
    const activeLesson = LESSONS.find((l) => l.id === currentLessonId);
    let matchedQuest = false;
    if (activeLesson && activeLesson.successCondition(cmd, args, currentPath, fs, trimmed)) {
      matchedQuest = true;
    }

    // Process Linux built-ins
    switch (cmd) {
      case "help":
        newLogs.push({
          type: "output",
          text: `🛠️ Ada's Workshop Command Depository:\n• pwd       - Show current directory\n• whoami    - Display current user\n• ls [-la]  - List directory files & secret dotfiles\n• cd <dir>  - Change active directory (cd .. for parent)\n• cat <f>   - Display contents of a file\n• touch <f> - Create a new empty file\n• mkdir <d> - Create a new directory\n• rm <f>    - Remove a file\n• echo <t>  - Print text to screen\n• clear     - Clear terminal window\n• quest     - Review your current active lesson & objective`
        });
        break;

      case "quest":
        if (activeLesson) {
          newLogs.push({
            type: "output",
            text: `🎯 ACTIVE QUEST [${activeLesson.title}]\n${activeLesson.objective}\n💡 Instruction: ${activeLesson.instructions}`
          });
        }
        break;

      case "clear":
        setTerminalLogs([]);
        return;

      case "pwd":
        newLogs.push({ type: "output", text: currentPath });
        playChiptune(520, "sine", 0.1);
        break;

      case "whoami":
        newLogs.push({ type: "output", text: `${nickname || "doc"}@ada-workshop (Pioneer Developer)` });
        playChiptune(660, "triangle", 0.12);
        break;

      case "ls":
      case "dir": {
        const showAll = args.includes("-la") || args.includes("-a") || args.includes("-al");
        const items = Object.keys(fs).filter((p) => {
          if (p === "/") return false;
          const parent = p.substring(0, p.lastIndexOf("/")) || "/";
          return parent === currentPath;
        });

        if (items.length === 0) {
          newLogs.push({ type: "output", text: "(Directory is empty)" });
        } else {
          const listOutput = items
            .map((p) => {
              const node = fs[p];
              if (node.hidden && !showAll) return null;
              const isDir = node.type === "dir";
              const prefix = isDir ? "📁 [DIR]  " : "📄 [FILE] ";
              return `${prefix}${node.name}`;
            })
            .filter(Boolean)
            .join("\n");

          newLogs.push({ type: "output", text: listOutput || "(No visible files, try 'ls -la' to see hidden dotfiles)" });
        }
        playChiptune(480, "square", 0.08);
        break;
      }

      case "cd": {
        const target = args[0] || "/";
        if (target === "/" || target === "~") {
          setCurrentPath("/");
          newLogs.push({ type: "output", text: "Switched to /" });
        } else if (target === "..") {
          const parent = currentPath.substring(0, currentPath.lastIndexOf("/")) || "/";
          setCurrentPath(parent);
          newLogs.push({ type: "output", text: `Switched to ${parent}` });
        } else {
          const targetPath = currentPath === "/" ? `/${target}` : `${currentPath}/${target}`;
          if (fs[targetPath] && fs[targetPath].type === "dir") {
            setCurrentPath(targetPath);
            newLogs.push({ type: "output", text: `Switched to ${targetPath}` });
          } else {
            newLogs.push({ type: "error", text: `bash: cd: ${target}: No such directory` });
          }
        }
        break;
      }

      case "cat": {
        const filename = args[0];
        if (!filename) {
          newLogs.push({ type: "error", text: "Usage: cat <filename>" });
          break;
        }
        const targetPath = currentPath === "/" ? `/${filename}` : `${currentPath}/${filename}`;
        const node = fs[targetPath] || fs[`/${filename}`];
        if (node && node.type === "file") {
          newLogs.push({ type: "output", text: node.content });
          playChiptune(700, "sine", 0.12);
        } else if (node && node.type === "dir") {
          newLogs.push({ type: "error", text: `cat: ${filename}: Is a directory` });
        } else {
          newLogs.push({ type: "error", text: `cat: ${filename}: No such file or directory` });
        }
        break;
      }

      case "touch": {
        const filename = args[0];
        if (!filename) {
          newLogs.push({ type: "error", text: "Usage: touch <filename>" });
          break;
        }
        const targetPath = currentPath === "/" ? `/${filename}` : `${currentPath}/${filename}`;
        setFs((prev) => ({
          ...prev,
          [targetPath]: {
            type: "file",
            name: filename,
            content: `// Created with touch in Ada's Workshop on ${new Date().toLocaleDateString()}`
          }
        }));
        newLogs.push({ type: "output", text: `Created file '${filename}'` });
        playChiptune(880, "square", 0.15);
        break;
      }

      case "mkdir": {
        const dirname = args[0];
        if (!dirname) {
          newLogs.push({ type: "error", text: "Usage: mkdir <dirname>" });
          break;
        }
        const targetPath = currentPath === "/" ? `/${dirname}` : `${currentPath}/${dirname}`;
        setFs((prev) => ({
          ...prev,
          [targetPath]: {
            type: "dir",
            name: dirname
          }
        }));
        newLogs.push({ type: "output", text: `Created directory '${dirname}'` });
        playChiptune(600, "triangle", 0.15);
        break;
      }

      case "rm": {
        const filename = args[0];
        if (!filename) {
          newLogs.push({ type: "error", text: "Usage: rm <filename>" });
          break;
        }
        const targetPath = currentPath === "/" ? `/${filename}` : `${currentPath}/${filename}`;
        if (fs[targetPath]) {
          setFs((prev) => {
            const copy = { ...prev };
            delete copy[targetPath];
            return copy;
          });
          newLogs.push({ type: "output", text: `Removed '${filename}'` });
        } else {
          newLogs.push({ type: "error", text: `rm: cannot remove '${filename}': No such file` });
        }
        break;
      }

      case "echo": {
        const text = args.join(" ").replace(/^["']|["']$/g, "");
        newLogs.push({ type: "output", text });
        break;
      }

      default:
        newLogs.push({
          type: "error",
          text: `bash: ${cmd}: command not found. (Type 'help' to see all available tools!)`
        });
        playChiptune(200, "sawtooth", 0.2);
        break;
    }

    // Trigger Quest Victory if criteria met
    if (matchedQuest && activeLesson) {
      if (!lessonsCompleted.includes(activeLesson.id)) {
        const updated = [...lessonsCompleted, activeLesson.id];
        setLessonsCompleted(updated);
        setSuccessCelebration(true);
        newLogs.push({
          type: "success",
          text: `🎉 QUEST COMPLETED! +100 XP awarded for mastering [${activeLesson.title}]!`
        });

        // Trigger victory arpeggio sound
        if (soundEnabled) {
          setTimeout(() => playChiptune(523, "square", 0.1), 50);
          setTimeout(() => playChiptune(659, "square", 0.1), 150);
          setTimeout(() => playChiptune(783, "square", 0.1), 250);
          setTimeout(() => playChiptune(1046, "square", 0.25), 350);
        }

        const nextId = Math.min(activeLesson.id + 1, LESSONS.length);
        setCurrentLessonId(nextId);
        saveProgressToFirestore(nextId, updated);
        onProgressUpdate?.({
          currentLessonId: nextId,
          lessonsCompleted: updated,
          xp: updated.length * 100,
          lastLessonTitle: activeLesson.title
        });

        setTimeout(() => setSuccessCelebration(false), 3000);
      }
    }

    setTerminalLogs(newLogs);
  };

  // Pipe execution simulation (e.g. cat access.log | grep 500)
  const handlePipedCommand = (raw: string, newLogs: any[]) => {
    const stages = raw.split("|").map((s) => s.trim());
    let currentStream = "";

    // Stage 1
    const firstParts = stages[0].split(/\s+/);
    if (firstParts[0] === "cat") {
      const file = firstParts[1];
      const target = currentPath === "/" ? `/${file}` : `${currentPath}/${file}`;
      const node = fs[target] || fs[`/${file}`];
      if (node && node.type === "file") {
        currentStream = node.content;
      } else {
        newLogs.push({ type: "error", text: `cat: ${file}: No such file` });
        setTerminalLogs(newLogs);
        return;
      }
    } else {
      currentStream = stages[0];
    }

    // Subsequent Pipe Stages
    for (let i = 1; i < stages.length; i++) {
      const stageParts = stages[i].split(/\s+/);
      const stageCmd = stageParts[0];

      if (stageCmd === "grep") {
        const pattern = stageParts[1]?.replace(/^["']|["']$/g, "") || "";
        const lines = currentStream.split("\n");
        currentStream = lines.filter((l) => l.includes(pattern)).join("\n");
      } else if (stageCmd === "wc") {
        const lines = currentStream.split("\n").filter(Boolean);
        currentStream = `${lines.length} lines`;
      }
    }

    newLogs.push({ type: "output", text: currentStream || "(No matching stream lines)" });

    // Check if piped quest level 6
    if (currentLessonId === 6 && !lessonsCompleted.includes(6)) {
      const updated = [...lessonsCompleted, 6];
      setLessonsCompleted(updated);
      setSuccessCelebration(true);
      newLogs.push({
        type: "success",
        text: `🎉 LEVEL 6 MASTERED! You completed the Unix Pipeline Stream Quest! +100 XP!`
      });
      saveProgressToFirestore(6, updated);
      setTimeout(() => setSuccessCelebration(false), 3000);
    }

    setTerminalLogs(newLogs);
  };

  // Ask Ada AI Mentor
  const handleAskMentor = async () => {
    const query = mentorChatInput.trim();
    if (!query) return;

    setMentorChatLogs((prev) => [...prev, { sender: "user", text: query }]);
    setMentorChatInput("");
    setIsMentorThinking(true);

    try {
      const res = await fetch("/api/ada/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `User is in Ada's Linux Workshop asking for guidance: "${query}". Current working directory is "${currentPath}". Active quest: "${LESSONS.find(l => l.id === currentLessonId)?.title}". Explain in a friendly, encouraging, and clear way with practical command examples.`,
          history: [],
          personaMode: "mentor"
        })
      });

      if (!res.ok) throw new Error("Mentor service unavailable");
      const data = await res.json();
      setMentorChatLogs((prev) => [...prev, { sender: "ada", text: data.reply || "You've got this! Try running 'pwd' or 'ls' to see what's around you." }]);
    } catch (e) {
      setMentorChatLogs((prev) => [
        ...prev,
        {
          sender: "ada",
          text: `Great question! In Linux, you can use 'ls' to see files in your directory, 'cat <filename>' to read what's inside them, and 'touch <filename>' to make a new file. Give it a try in the terminal right beside us!`
        }
      ]);
    } finally {
      setIsMentorThinking(false);
    }
  };

  const activeLesson = LESSONS.find((l) => l.id === currentLessonId) || LESSONS[0];

  return (
    <div className="w-full space-y-6">
      {/* Top Banner */}
      <div className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-neutral-950 via-zinc-950 to-neutral-950 border border-red-950 shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-red-600/20 via-rose-950/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <img
              src={adaTuxAvatar}
              alt="Ada Lovelace & Tux"
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-red-600 object-cover shadow-xl shadow-red-950/80"
            />
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/40 border border-red-800/40 text-red-400 text-xs font-black uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Ada Lovelace's Linux & Dev Workshop</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                <span>Ada's Workshop</span>
                <span className="text-xs px-2.5 py-0.5 rounded-md bg-neutral-900 border border-neutral-800 text-amber-400 font-mono">
                  Level {currentLessonId} of {LESSONS.length}
                </span>
              </h2>
              <p className="text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Hands-on Linux command terminal, real-time visual filesystem explorer, stream piping sandbox, and Ada as your personal AI mentor.
              </p>
            </div>
          </div>

          {/* XP & Progress Badge */}
          <div className="flex items-center gap-4 bg-black/70 border border-red-950 p-3 rounded-2xl">
            <div className="text-center pr-3 border-r border-neutral-900">
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Earned XP</div>
              <div className="text-lg font-black text-amber-400 flex items-center justify-center gap-1">
                <Flame className="w-4 h-4 text-red-500 fill-current" />
                <span>{lessonsCompleted.length * 100}</span>
              </div>
            </div>

            <div className="text-left">
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Quests Cleared</div>
              <div className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>{lessonsCompleted.length} / {LESSONS.length} Mastered</span>
              </div>
            </div>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl border transition-all cursor-pointer ml-2 ${
                soundEnabled ? "bg-red-950/60 border-red-700 text-red-300" : "bg-neutral-900 border-neutral-800 text-slate-500"
              }`}
              title={soundEnabled ? "Mute Chiptune Audio" : "Enable Chiptune Audio"}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Workshop Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-neutral-950 border border-red-950/80 rounded-2xl shadow-xl">
        <button
          onClick={() => setActiveTab("linux_terminal")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "linux_terminal"
              ? "bg-gradient-to-r from-red-700 to-rose-600 text-white shadow-lg shadow-red-600/25 border border-red-500/30"
              : "text-slate-400 hover:text-white hover:bg-neutral-900/50"
          }`}
        >
          <TerminalIcon className="w-4 h-4 text-amber-400" />
          <span>Linux Terminal & Quests</span>
        </button>

        <button
          onClick={() => setActiveTab("visual_pipeline")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "visual_pipeline"
              ? "bg-gradient-to-r from-red-700 to-rose-600 text-white shadow-lg shadow-red-600/25 border border-red-500/30"
              : "text-slate-400 hover:text-white hover:bg-neutral-900/50"
          }`}
        >
          <Layers className="w-4 h-4 text-emerald-400" />
          <span>Visual Pipeline (cat | grep | wc)</span>
        </button>

        <button
          onClick={() => setActiveTab("memory_inspector")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "memory_inspector"
              ? "bg-gradient-to-r from-red-700 to-rose-600 text-white shadow-lg shadow-red-600/25 border border-red-500/30"
              : "text-slate-400 hover:text-white hover:bg-neutral-900/50"
          }`}
        >
          <Cpu className="w-4 h-4 text-sky-400" />
          <span>RAM & Memory Hex Inspector</span>
        </button>

        <button
          onClick={() => setIsDepositoryOpen(true)}
          className="ml-auto px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <BookOpen className="w-4 h-4 text-red-400" />
          <span>Command Cheat Sheet</span>
        </button>
      </div>

      {/* ACTIVE TAB: LINUX TERMINAL & QUESTS */}
      {activeTab === "linux_terminal" && (
        <div className="space-y-6">
          {/* Active Quest Mission Card */}
          <div className="p-5 bg-gradient-to-r from-neutral-950 via-zinc-950 to-neutral-950 border-2 border-red-600/40 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-red-950 border border-red-700 text-red-300 text-[11px] font-bold uppercase">
                  Active Mission
                </span>
                <h3 className="text-base font-extrabold text-white">{activeLesson.title}</h3>
              </div>
              <p className="text-xs text-slate-300">{activeLesson.objective}</p>
              <div className="text-xs font-mono text-amber-400 pt-1">
                👉 <span className="text-slate-400">Action:</span> {activeLesson.instructions}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowHint(!showHint)}
                className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-xs font-bold text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <span>{showHint ? "Hide Hint" : "Need a Hint?"}</span>
              </button>

              {/* Lesson Picker Dropdown */}
              <select
                value={currentLessonId}
                onChange={(e) => setCurrentLessonId(Number(e.target.value))}
                className="px-3 py-2 bg-black border border-neutral-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-red-600 cursor-pointer"
              >
                {LESSONS.map((l) => (
                  <option key={l.id} value={l.id}>
                    Quest {l.id}: {l.title.replace(/Level \d+:\s*/, "")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Hint Card */}
          {showHint && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-amber-950/30 border border-amber-800/50 rounded-2xl text-xs text-amber-200 flex items-center gap-3 font-mono"
            >
              <Lightbulb className="w-5 h-5 text-amber-400 shrink-0" />
              <span>💡 Ada's Hint: {activeLesson.hint}</span>
            </motion.div>
          )}

          {/* Main 3-Column Layout: Visual File Explorer | Interactive Terminal | Ada Mentor Chat */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Visual File Tree Explorer (3 cols) */}
            <div className="lg:col-span-3 bg-neutral-950 border border-red-950/80 rounded-2xl p-4 shadow-xl space-y-4 flex flex-col h-[520px]">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-900">
                <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Folder className="w-4 h-4 text-amber-400" /> Visual Explorer
                </span>
                <span className="text-[10px] text-slate-500 font-mono">{currentPath}</span>
              </div>

              <div className="text-[11px] text-slate-400 leading-tight">
                Live representation of your files. Updates instantly as you create, rename, or delete items!
              </div>

              {/* File List */}
              <div className="space-y-1.5 overflow-y-auto flex-grow pr-1">
                {Object.keys(fs)
                  .filter((p) => p !== "/")
                  .map((path) => {
                    const node = fs[path];
                    const isDir = node.type === "dir";
                    const isCurrentFolder = path === currentPath;

                    return (
                      <button
                        key={path}
                        onClick={() => {
                          if (isDir) {
                            setCurrentPath(path);
                            setTerminalLogs((prev) => [...prev, { type: "output", text: `Navigated to ${path}` }]);
                          } else {
                            setTerminalLogs((prev) => [
                              ...prev,
                              { type: "cmd", text: `$ cat ${node.name}` },
                              { type: "output", text: node.content }
                            ]);
                          }
                        }}
                        className={`w-full p-2 rounded-xl text-left text-xs font-mono transition-all flex items-center gap-2 cursor-pointer ${
                          isCurrentFolder
                            ? "bg-red-950/60 border border-red-600 text-white font-bold"
                            : "bg-neutral-900/60 border border-neutral-800/80 text-slate-300 hover:bg-neutral-900 hover:text-white"
                        }`}
                      >
                        {isDir ? (
                          <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                        ) : (
                          <FileText className="w-4 h-4 text-red-400 shrink-0" />
                        )}
                        <span className="truncate">{node.name}</span>
                        {node.hidden && (
                          <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-neutral-800 text-slate-400">dotfile</span>
                        )}
                      </button>
                    );
                  })}
              </div>

              {/* Quick Action Helper */}
              <div className="p-3 bg-black rounded-xl border border-neutral-900 text-[11px] text-slate-500 font-mono">
                Click any file to auto-read (<code className="text-amber-400">cat</code>), or any folder to open (<code className="text-sky-400">cd</code>).
              </div>
            </div>

            {/* Middle Column: The Interactive Linux Terminal (6 cols) */}
            <div className="lg:col-span-6 bg-neutral-950 border border-red-950/80 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[520px]">
              {/* Terminal Title Bar */}
              <div className="px-4 py-3 bg-neutral-900/90 border-b border-red-950/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-600 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                  </div>
                  <span className="text-xs font-mono text-slate-400 ml-2">bash ~ {nickname || "doc"}@ada-workshop</span>
                </div>

                <button
                  onClick={() => setTerminalLogs([])}
                  className="text-[11px] text-slate-500 hover:text-slate-300 font-mono cursor-pointer"
                >
                  Clear Screen
                </button>
              </div>

              {/* Terminal Logs & Output Display */}
              <div className="p-4 bg-black/95 font-mono text-xs overflow-y-auto flex-grow space-y-2 text-slate-200 selection:bg-red-900/80">
                {terminalLogs.map((log, idx) => (
                  <div
                    key={idx}
                    className={`leading-relaxed whitespace-pre-wrap ${
                      log.type === "cmd"
                        ? "text-amber-400 font-bold"
                        : log.type === "error"
                        ? "text-rose-400 bg-rose-950/20 p-2 rounded-lg border border-rose-900/40"
                        : log.type === "success"
                        ? "text-emerald-300 bg-emerald-950/30 p-2 rounded-lg border border-emerald-800/40 font-bold"
                        : "text-slate-300"
                    }`}
                  >
                    {log.text}
                  </div>
                ))}
                <div ref={termEndRef} />
              </div>

              {/* Terminal Command Input Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleRunCommand(inputVal);
                }}
                className="p-3 bg-neutral-900/90 border-t border-red-950/60 flex items-center gap-2"
              >
                <span className="text-xs font-mono text-red-500 font-black shrink-0">$</span>
                <input
                  id="workshop-terminal-input"
                  type="text"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowUp") {
                      if (commandHistory.length > 0) {
                        const nextIdx = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
                        setHistoryIndex(nextIdx);
                        setInputVal(commandHistory[nextIdx]);
                      }
                    } else if (e.key === "ArrowDown") {
                      if (historyIndex !== -1) {
                        const nextIdx = historyIndex + 1;
                        if (nextIdx >= commandHistory.length) {
                          setHistoryIndex(-1);
                          setInputVal("");
                        } else {
                          setHistoryIndex(nextIdx);
                          setInputVal(commandHistory[nextIdx]);
                        }
                      }
                    }
                  }}
                  placeholder="Type command (e.g. ls, pwd, cat welcome.txt, touch notes.txt)..."
                  className="flex-grow bg-transparent text-xs font-mono text-white placeholder-slate-500 focus:outline-none"
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-600/30 cursor-pointer flex items-center gap-1"
                >
                  <span>Execute</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>

            {/* Right Column: Ada AI Mentor Live Assistant (3 cols) */}
            <div className="lg:col-span-3 bg-neutral-950 border border-red-950/80 rounded-2xl p-4 shadow-xl space-y-3 flex flex-col h-[520px]">
              <div className="flex items-center gap-2 pb-2 border-b border-neutral-900">
                <div className="p-1.5 rounded-lg bg-red-950 border border-red-800">
                  <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-white">Ada Mentor</h4>
                  <p className="text-[10px] text-slate-400">Live AI Linux Tutor</p>
                </div>
              </div>

              {/* Chat Stream */}
              <div className="space-y-2.5 overflow-y-auto flex-grow pr-1">
                {mentorChatLogs.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl text-xs leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-red-950/50 border border-red-800/40 text-slate-200 ml-4"
                        : "bg-neutral-900 border border-neutral-800 text-slate-300 mr-2"
                    }`}
                  >
                    <div className="text-[10px] font-bold text-slate-500 mb-0.5">
                      {msg.sender === "user" ? nickname || "You" : "Ada Lovelace"}
                    </div>
                    <div>{msg.text}</div>
                  </div>
                ))}
                {isMentorThinking && (
                  <div className="text-xs text-amber-400 italic font-mono flex items-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" /> Ada is typing advice...
                  </div>
                )}
              </div>

              {/* Question Input */}
              <div className="flex gap-2 pt-2 border-t border-neutral-900">
                <input
                  type="text"
                  value={mentorChatInput}
                  onChange={(e) => setMentorChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAskMentor();
                  }}
                  placeholder="Ask Ada anything..."
                  className="flex-grow px-3 py-2 bg-black border border-neutral-900 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-600"
                />
                <button
                  onClick={handleAskMentor}
                  disabled={isMentorThinking || !mentorChatInput.trim()}
                  className="p-2 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE TAB: VISUAL PIPELINE FLOW */}
      {activeTab === "visual_pipeline" && (
        <div className="p-6 bg-neutral-950 border border-red-950/80 rounded-3xl space-y-6 shadow-2xl">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 text-xs font-black uppercase tracking-wider mb-2">
              <Layers className="w-3.5 h-3.5" /> Interactive Stream Pipeline
            </div>
            <h3 className="text-xl font-extrabold text-white">Visual Command Pipeline (cat | grep | wc)</h3>
            <p className="text-xs text-slate-400 mt-1">
              Connect Linux stream commands together using the pipe character (<code className="text-amber-400">|</code>) to filter, transform, and aggregate data packets!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Stage 1 */}
            <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-2">
              <span className="text-xs font-bold text-slate-300">Stage 1: Source (cat access.log)</span>
              <textarea
                value={pipeLogInput}
                onChange={(e) => setPipeLogInput(e.target.value)}
                rows={5}
                className="w-full p-2.5 bg-black border border-neutral-800 rounded-xl text-xs font-mono text-slate-300 focus:outline-none"
              />
            </div>

            {/* Stage 2 */}
            <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-2">
              <span className="text-xs font-bold text-slate-300">Stage 2: Filter (grep)</span>
              <input
                type="text"
                value={pipeFilterGrep}
                onChange={(e) => setPipeFilterGrep(e.target.value)}
                placeholder="e.g. 500 or GET"
                className="w-full px-3 py-2 bg-black border border-neutral-800 rounded-xl text-xs font-mono text-amber-400 focus:outline-none"
              />
              <div className="text-[11px] text-slate-500">
                Filters stream lines containing <span className="text-amber-400 font-mono">"{pipeFilterGrep}"</span>
              </div>
            </div>

            {/* Stage 3 */}
            <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-2">
              <span className="text-xs font-bold text-slate-300">Stage 3: Output Transformer</span>
              <select
                value={pipeTransform}
                onChange={(e) => setPipeTransform(e.target.value)}
                className="w-full px-3 py-2 bg-black border border-neutral-800 rounded-xl text-xs font-mono text-emerald-400 focus:outline-none"
              >
                <option value="count">wc -l (Count Matches)</option>
                <option value="raw">Pass Filtered Lines</option>
              </select>
            </div>
          </div>

          {/* Pipeline Results */}
          <div className="p-4 bg-black border border-neutral-800 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">Pipeline Output Stream</span>
              <code className="text-xs font-mono text-amber-400">
                cat access.log | grep "{pipeFilterGrep}" {pipeTransform === "count" ? "| wc -l" : ""}
              </code>
            </div>
            <div className="p-3 bg-neutral-950 rounded-xl font-mono text-xs text-emerald-400">
              {(() => {
                const filtered = pipeLogInput.split("\n").filter((l) => l.includes(pipeFilterGrep));
                if (pipeTransform === "count") return `Total Matches: ${filtered.length} lines`;
                return filtered.join("\n") || "(No matching lines)";
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE TAB: MEMORY & HEX INSPECTOR */}
      {activeTab === "memory_inspector" && (
        <div className="p-6 bg-neutral-950 border border-red-950/80 rounded-3xl space-y-6 shadow-2xl">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-950/40 border border-sky-800/40 text-sky-400 text-xs font-black uppercase tracking-wider mb-2">
              <Cpu className="w-3.5 h-3.5" /> Virtual Memory Inspector
            </div>
            <h3 className="text-xl font-extrabold text-white">Live System Memory & Hex Dump</h3>
            <p className="text-xs text-slate-400 mt-1">
              See how strings and files live in RAM with Hexadecimal (0x00 - 0xFF) and ASCII representation.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300">Data Buffer in RAM:</label>
            <input
              type="text"
              value={hexInputText}
              onChange={(e) => setHexInputText(e.target.value)}
              className="w-full px-4 py-2 bg-black border border-neutral-800 rounded-xl text-sm font-mono text-white focus:outline-none"
            />
          </div>

          {/* Hex Dump */}
          <div className="p-4 bg-black border border-neutral-800 rounded-2xl font-mono text-xs space-y-2">
            <div className="text-slate-500 border-b border-neutral-900 pb-1 flex justify-between font-bold">
              <span>ADDRESS</span>
              <span>HEX BYTES</span>
              <span>ASCII</span>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              {Array.from(new TextEncoder().encode(hexInputText)).map((byte, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedHexIndex(idx)}
                  className={`p-1.5 rounded text-xs transition-all cursor-pointer ${
                    selectedHexIndex === idx
                      ? "bg-amber-500 text-black font-extrabold"
                      : "bg-neutral-900 text-slate-300 hover:bg-neutral-800"
                  }`}
                >
                  {byte.toString(16).toUpperCase().padStart(2, "0")}
                </button>
              ))}
            </div>

            {selectedHexIndex !== null && (
              <div className="mt-4 p-3 bg-neutral-900 rounded-xl text-xs text-amber-300">
                Byte #{selectedHexIndex}: '{hexInputText[selectedHexIndex]}' | Decimal: {hexInputText.charCodeAt(selectedHexIndex)} | Binary: {hexInputText.charCodeAt(selectedHexIndex).toString(2).padStart(8, "0")}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Command Cheat Sheet Modal */}
      {isDepositoryOpen && (
        <CommandDepository
          isOpen={isDepositoryOpen}
          onClose={() => setIsDepositoryOpen(false)}
          onRunCommand={(cmd) => {
            setIsDepositoryOpen(false);
            handleRunCommand(cmd);
          }}
        />
      )}
    </div>
  );
}
