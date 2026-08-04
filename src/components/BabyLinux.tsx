import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Terminal as TerminalIcon,
  BookOpen,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  HelpCircle,
  Send,
  RefreshCw,
  Play,
  ArrowLeft,
  AlertCircle,
  Gift,
  Smile,
  FileText,
  Folder,
  ArrowRight,
  User,
  Coffee,
  Heart,
  X,
  Search,
  ShieldAlert,
  Database,
  Save,
  RotateCcw,
  Download
} from "lucide-react";
import { doc, setDoc, addDoc, collection, serverTimestamp, onSnapshot } from "firebase/firestore";
import { db, auth } from "../firebase";
import adaTuxAvatar from "../assets/images/ada_tux_avatar_1785211204469.jpg";
import CommandDepository from "./CommandDepository";
import SystemLogViewer, { LogEntry } from "./SystemLogViewer";
import BackupManagerModal, { BackupSnapshot } from "./BackupManagerModal";

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

// Interactive Tutor Lesson details
interface Lesson {
  id: number;
  title: string;
  subtitle: string;
  objective: string;
  instructions: string;
  successCondition: (cmd: string, args: string[], currentPath: string, fs: FileSystem, rawCmd?: string) => boolean;
  hint: string;
}

interface ChatAccount {
  id: string;
  name: string;
  avatar: string;
  badge: string;
  isAI?: boolean;
}

interface ChatMessage {
  id: string;
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
  senderBadge?: string;
  role: "user" | "mentor" | "peer";
  text: string;
  timestamp?: string;
}

interface BabyLinuxProps {
  currentUserEmail: string;
  nickname?: string;
  onProgressUpdate?: (progress: { currentLessonId: number; lessonsCompleted: number[]; xp: number; lastLessonTitle: string }) => void;
}

// Initial Simulated File System setup
const getInitialFS = (): FileSystem => ({
  "/": { type: "dir", name: "/" },
  "/teddy_bear.txt": {
    type: "file",
    name: "teddy_bear.txt",
    content: "🧸 Warm, fuzzy, and loyal. He keeps you safe at night in this big digital cradle."
  },
  "/baby_bottle.conf": {
    type: "file",
    name: "baby_bottle.conf",
    content: "# Milk Configuration File\nTEMPERATURE=warm\nFILL_LEVEL=100%\nSWEETNESS=high\nSTATUS=ready"
  },
  "/play.sh": {
    type: "file",
    name: "play.sh",
    content: "#!/bin/bash\necho '🎵 Playing nursery rhymes on the Baby Linux speaker!'",
    permissions: "-rw-r--r--"
  },
  "/blocks": { type: "dir", name: "blocks" },
  "/blocks/blue_block.txt": {
    type: "file",
    name: "blue_block.txt",
    content: "🟦 The blue block is cool to the touch. It has a letter 'A' painted on it."
  },
  "/blocks/red_block.txt": {
    type: "file",
    name: "red_block.txt",
    content: "🟥 The red block is warm and bright. It has a letter 'B' painted on it."
  },
  "/blocks/.pacifier.txt": {
    type: "file",
    name: ".pacifier.txt",
    content: "🍼 Ah! The legendary hidden pacifier! Sucking it brings instant peace and complete Linux calm.",
    hidden: true
  }
});

export default function BabyLinux({ currentUserEmail, nickname, onProgressUpdate }: BabyLinuxProps) {
  // Playground Directory States
  const [currentPath, setCurrentPath] = useState<string>("/");
  const [fs, setFs] = useState<FileSystem>(getInitialFS());
  const [inputVal, setInputVal] = useState<string>("");
  const [terminalLogs, setTerminalLogs] = useState<Array<{
    type: "cmd" | "output" | "error" | "success";
    text: string;
    errorInfo?: {
      rawError: string;
      explanation: string;
      suggestedFix: string;
      fixCommand?: string;
    };
  }>>([
    { type: "output", text: "👶 Welcome to BABY LINUX v0.2-crib!" },
    { type: "output", text: "Type 'help' to see commands, 'logs' to view System Journal, or search Depository." },
    { type: "output", text: "We translate every cryptic Linux error into plain English!" }
  ]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [aliases, setAliases] = useState<Record<string, string>>({});

  // System Logs & Error Translator State
  const [sysLogs, setSysLogs] = useState<LogEntry[]>([
    {
      id: "init-boot",
      timestamp: new Date().toLocaleTimeString(),
      level: "INFO",
      rawMessage: "Baby Linux Crib Kernel v0.2 booted successfully.",
      babyExplanation: "All crib systems, virtual files, and mentor angels are active and ready."
    }
  ]);
  const [isLogViewerOpen, setIsLogViewerOpen] = useState<boolean>(false);

  // Lesson states
  const [currentLessonId, setCurrentLessonId] = useState<number>(1);
  const [lessonsCompleted, setLessonsCompleted] = useState<number[]>([]);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [successCelebration, setSuccessCelebration] = useState<boolean>(false);
  const [isDepositoryOpen, setIsDepositoryOpen] = useState<boolean>(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);

  const lastSyncedChatLogsRef = useRef<string>("");
  const isQuotaExceededRef = useRef<boolean>(false);

  // Firestore Lesson Progress & Chat History Listener
  useEffect(() => {
    if (!currentUserEmail) return;
    const docId = currentUserEmail.replace(/[^a-zA-Z0-9]/g, "_");
    const progressRef = doc(db, "progress", docId);

    const unsubscribe = onSnapshot(
      progressRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (typeof data.currentLessonId === "number" && data.currentLessonId > 0) {
            setCurrentLessonId(data.currentLessonId);
          }
          if (Array.isArray(data.lessonsCompleted)) {
            setLessonsCompleted(data.lessonsCompleted);
          }
          if (Array.isArray(data.chatLogs) && data.chatLogs.length > 0) {
            lastSyncedChatLogsRef.current = JSON.stringify(data.chatLogs);
            setChatLogs(data.chatLogs);
            try {
              localStorage.setItem("baby_linux_chat_logs_v1", JSON.stringify(data.chatLogs));
            } catch (e) {
              // localStorage fail silent
            }
          }
          if (Array.isArray(data.commandHistory)) {
            setCommandHistory(data.commandHistory);
          }
          if (data.fs && typeof data.fs === "object") {
            setFs(data.fs);
          }
        }
      },
      (err) => {
        console.warn("Firestore progress listener notice:", err);
      }
    );

    return () => unsubscribe();
  }, [currentUserEmail]);

  // Sync lesson state, chat history, command history, and virtual files to Firestore & parent
  const syncProgressToFirestore = async (
    newLessonId?: number,
    completedList?: number[],
    customChatLogs?: ChatMessage[]
  ) => {
    if (!currentUserEmail || isQuotaExceededRef.current) return;
    const docId = currentUserEmail.replace(/[^a-zA-Z0-9]/g, "_");
    const progressRef = doc(db, "progress", docId);

    const targetLessonId = newLessonId ?? currentLessonId;
    const targetCompletedList = completedList ?? lessonsCompleted;
    const targetChatLogs = customChatLogs ?? chatLogs;

    const xp = targetCompletedList.length * 50;
    const lastLessonTitle = lessons.find((l) => l.id === targetLessonId)?.title || "Explorer";

    try {
      await setDoc(
        progressRef,
        {
          userEmail: currentUserEmail,
          currentLessonId: targetLessonId,
          lessonsCompleted: targetCompletedList,
          chatLogs: targetChatLogs,
          commandHistory,
          fs,
          xp,
          lastLessonTitle,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );

      if (onProgressUpdate) {
        onProgressUpdate({
          currentLessonId: targetLessonId,
          lessonsCompleted: targetCompletedList,
          xp,
          lastLessonTitle
        });
      }
    } catch (err: any) {
      const errStr = String(err?.message || err);
      if (errStr.includes("resource-exhausted") || errStr.includes("Quota limit exceeded")) {
        isQuotaExceededRef.current = true;
        console.warn("Firestore write quota reached. Progress will continue saving to local storage.");
      } else {
        console.error("Failed to sync state to Firestore:", err);
      }
    }
  };

  // Git Sandbox State
  const [gitStaged, setGitStaged] = useState<string[]>([]);
  const [gitCommits, setGitCommits] = useState<Array<{ hash: string; message: string; date: string; files: string[] }>>([
    {
      hash: "d41787a",
      message: "Add Sandbox Backup and Restore Center and clarify Ada identity",
      date: new Date().toLocaleDateString(),
      files: ["src/components/BabyLinux.tsx", "src/components/BackupManagerModal.tsx"]
    },
    {
      hash: "5998441",
      message: "Add collapse and minimize toggle for Google Lady AI Mentor",
      date: new Date().toLocaleDateString(),
      files: ["src/components/BabyLinux.tsx"]
    },
    {
      hash: "e314c82",
      message: "Add Ada organizer command to bundle sandbox files into dedicated workspace folder",
      date: new Date().toLocaleDateString(),
      files: ["src/components/BabyLinux.tsx"]
    }
  ]);
  const [gitBranch, setGitBranch] = useState<string>("main");
  const [isGitInitialized, setIsGitInitialized] = useState<boolean>(true);

  // Backup Snapshots state persisted in localStorage
  const [backups, setBackups] = useState<BackupSnapshot[]>(() => {
    try {
      const saved = localStorage.getItem("baby_linux_backups_v1");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const saveBackupsToStorage = (updated: BackupSnapshot[]) => {
    setBackups(updated);
    try {
      localStorage.setItem("baby_linux_backups_v1", JSON.stringify(updated));
    } catch (e) {
      console.warn("LocalStorage space full for backups");
    }
  };

  const createBackupSnapshot = (label?: string): BackupSnapshot => {
    const timestamp = new Date().toLocaleString();
    const snapName = label || `backup_${new Date().toISOString().slice(0, 10)}_${Date.now().toString().slice(-4)}`;
    const snapshot: BackupSnapshot = {
      id: "snap_" + Math.random().toString(36).substr(2, 9),
      name: snapName,
      timestamp,
      fs,
      currentLessonId,
      lessonsCompleted,
      commandHistory,
      itemCount: Object.keys(fs).length
    };

    const updated = [snapshot, ...backups];
    saveBackupsToStorage(updated);

    // Also place a backup JSON file in the sandbox filesystem at /backups/
    const backupFilePath = `/backups/${snapName}.json`;
    setFs((prevFs) => ({
      ...prevFs,
      "/backups": { type: "dir", name: "backups" },
      [backupFilePath]: {
        type: "file",
        name: `${snapName}.json`,
        content: JSON.stringify(snapshot, null, 2)
      }
    }));

    return snapshot;
  };

  const restoreBackupSnapshot = (snapshot: BackupSnapshot) => {
    if (snapshot.fs) setFs(snapshot.fs);
    if (typeof snapshot.currentLessonId === "number") setCurrentLessonId(snapshot.currentLessonId);
    if (Array.isArray(snapshot.lessonsCompleted)) setLessonsCompleted(snapshot.lessonsCompleted);
    if (Array.isArray(snapshot.commandHistory)) setCommandHistory(snapshot.commandHistory);

    setTerminalLogs((prev) => [
      ...prev,
      {
        type: "success",
        text: `💾✨ [BACKUP RESTORED]: Restored snapshot '${snapshot.name}' (${snapshot.timestamp})!`
      }
    ]);
  };

  const deleteBackupSnapshot = (id: string) => {
    const updated = backups.filter((b) => b.id !== id);
    saveBackupsToStorage(updated);
  };

  const importBackupJSON = (jsonData: string): boolean => {
    try {
      const parsed = JSON.parse(jsonData);
      if (parsed.fs && typeof parsed.fs === "object") {
        const snap: BackupSnapshot = {
          id: parsed.id || "import_" + Date.now(),
          name: parsed.name || "imported_backup",
          timestamp: parsed.timestamp || new Date().toLocaleString(),
          fs: parsed.fs,
          currentLessonId: parsed.currentLessonId || 1,
          lessonsCompleted: parsed.lessonsCompleted || [],
          commandHistory: parsed.commandHistory || [],
          itemCount: Object.keys(parsed.fs).length
        };

        restoreBackupSnapshot(snap);
        saveBackupsToStorage([snap, ...backups]);
        return true;
      }
    } catch (e) {
      console.error("Invalid backup json", e);
    }
    return false;
  };

  // Helper to log errors with automatic plain-English translation
  const addErrorWithTranslation = (
    cmd: string,
    rawError: string,
    explanation: string,
    suggestedFix: string,
    fixCommand?: string
  ) => {
    const timestamp = new Date().toLocaleTimeString();

    setTerminalLogs((prev) => [
      ...prev,
      {
        type: "error",
        text: rawError,
        errorInfo: {
          rawError,
          explanation,
          suggestedFix,
          fixCommand
        }
      }
    ]);

    setSysLogs((prev) => [
      {
        id: Math.random().toString(),
        timestamp,
        level: "ERROR",
        command: cmd,
        rawMessage: rawError,
        babyExplanation: explanation,
        suggestedFix,
        fixCommand
      },
      ...prev
    ]);
  };

  const [chatInput, setChatInput] = useState<string>("");
  const [chatLogs, setChatLogs] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem("baby_linux_chat_logs_v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      // ignore
    }
    return [
      {
        id: "init",
        senderId: "google-lady",
        senderName: "Ada (Google AI Mentor)",
        senderAvatar: "👩‍🏫",
        senderBadge: "AI Companion",
        role: "mentor",
        text: "Hello! 👩‍🏫 I am Ada, your Google AI Mentor! Ask me any questions about Linux commands, lesson objectives, or terminal concepts as you explore the crib!",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }
    ];
  });

  // Sync chat logs to localStorage and Firestore whenever updated locally
  useEffect(() => {
    if (chatLogs.length > 0) {
      try {
        localStorage.setItem("baby_linux_chat_logs_v1", JSON.stringify(chatLogs));
      } catch (e) {
        // ignore
      }
      const chatLogsStr = JSON.stringify(chatLogs);
      if (currentUserEmail && chatLogsStr !== lastSyncedChatLogsRef.current) {
        lastSyncedChatLogsRef.current = chatLogsStr;
        syncProgressToFirestore(currentLessonId, lessonsCompleted, chatLogs);
      }
    }
  }, [chatLogs]);
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  // References
  const terminalBottomRef = useRef<HTMLDivElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const terminalInputRef = useRef<HTMLInputElement>(null);

  // Complete List of Interactive Lessons (20 Lessons!)
  const lessons: Lesson[] = [
    {
      id: 1,
      title: "Where is My Crib?",
      subtitle: "The PWD coordinate locator",
      objective: "Find your current folder path by typing 'pwd'.",
      instructions: "Every Linux explorer needs to know exactly where they are standing. Type pwd (Print Working Directory) in the terminal and press Enter to scan your location!",
      successCondition: (cmd) => cmd === "pwd",
      hint: "Type 'pwd' in the terminal on the right and hit Enter."
    },
    {
      id: 2,
      title: "Scanning the Crib",
      subtitle: "The LS toy scanner",
      objective: "List the toys in your current crib folder by typing 'ls'.",
      instructions: "Wonderful! You are in / (the root of your sandbox). Let's scan what toys are currently in your crib. Type ls (List) to list all available toys!",
      successCondition: (cmd) => cmd === "ls",
      hint: "Type 'ls' and press Enter to scan the crib."
    },
    {
      id: 3,
      title: "Crawling to Play Blocks",
      subtitle: "The CD room voyager",
      objective: "Go inside the 'blocks' folder by running 'cd blocks'.",
      instructions: "Ah! There is a box called blocks/ in your crib. Let's crawl inside it to play with building blocks! Type cd blocks (Change Directory) to go inside.",
      successCondition: (_cmd, _args, path) => path === "/blocks",
      hint: "Type 'cd blocks' to crawl inside the blocks directory."
    },
    {
      id: 4,
      title: "The Toy Box Secrets",
      subtitle: "Hidden files with ls -a",
      objective: "List all items, including hidden ones, using 'ls -a'.",
      instructions: "In Linux, files starting with a dot (.) are special hidden files. If you run normal 'ls', you won't see them! Run ls -a (List All) to scan the secret toys inside the blocks playroom.",
      successCondition: (cmd, args) => cmd === "ls" && args.includes("-a"),
      hint: "Type 'ls -a' to look for secret toys."
    },
    {
      id: 5,
      title: "Sucking the Pacifier",
      subtitle: "Reading file contents with cat",
      objective: "Inspect the hidden pacifier file with 'cat .pacifier.txt'.",
      instructions: "Aha! You found .pacifier.txt! Let's read what's written inside to bring you total peace. Type cat .pacifier.txt (Concatenate) to suck the data out!",
      successCondition: (cmd, args, path) => cmd === "cat" && args.includes(".pacifier.txt") && path === "/blocks",
      hint: "Make sure you are in blocks room, then type 'cat .pacifier.txt'."
    },
    {
      id: 6,
      title: "Weaving a Cozy Blanket",
      subtitle: "Creating folder structures with mkdir",
      objective: "Return to the root directory '/' and create a new folder called 'blanket'.",
      instructions: "Time to build a cozy nest! First, return to your main crib directory by typing cd / (or cd ..). Then, type mkdir blanket (Make Directory) to weave a new cozy folder!",
      successCondition: (_cmd, _args, _path, currentFs) => !!currentFs["/blanket"],
      hint: "Go back to `/` using 'cd /', then type 'mkdir blanket' and press Enter."
    },
    {
      id: 7,
      title: "Crafting a Custom Rattle",
      subtitle: "Creating empty files with touch",
      objective: "Create a rattle file in your blanket folder by typing 'touch blanket/rattle.txt'.",
      instructions: "Let's craft a baby rattle inside your new blanket fort! Go inside blanket with cd blanket and run touch rattle.txt (or simply run touch blanket/rattle.txt from root) to spawn a new toy!",
      successCondition: (_cmd, _args, _path, currentFs) => !!currentFs["/blanket/rattle.txt"],
      hint: "You can type 'cd blanket' then 'touch rattle.txt', or run 'touch blanket/rattle.txt' directly."
    },
    {
      id: 8,
      title: "Rattle's Sound Wave",
      subtitle: "Echoing text redirection with '>'",
      objective: "Add rattling sound text into rattle.txt using 'echo \"rattle rattle\" > rattle.txt'.",
      instructions: "Our rattle is empty and silent. Let's make it noisy! We can write text into the file using echo and the '>' symbol (file redirection). Type echo \"rattle rattle\" > blanket/rattle.txt (or make sure you cd blanket first, then type echo \"rattle rattle\" > rattle.txt)!",
      successCondition: (_cmd, _args, _path, currentFs) => {
        const file = currentFs["/blanket/rattle.txt"];
        return file && file.type === "file" && file.content.toLowerCase().includes("rattle rattle");
      },
      hint: "Change directory to blanket with 'cd blanket', then type 'echo \"rattle rattle\" > rattle.txt'."
    },
    {
      id: 9,
      title: "Crib Tidying Hour",
      subtitle: "Putting toys away with rm",
      objective: "Tidy up your root crib directory by removing 'teddy_bear.txt'.",
      instructions: "You've grown so fast! Let's clean up the old crib layout. Go back to your root room with cd /, and run rm teddy_bear.txt (Remove) to put the teddy bear back on the shelf.",
      successCondition: (_cmd, _args, _path, currentFs) => !currentFs["/teddy_bear.txt"],
      hint: "Go back to `/` with 'cd /', then run 'rm teddy_bear.txt'."
    },
    {
      id: 10,
      title: "Slate Cleansing",
      subtitle: "Wiping the screen with clear",
      objective: "Run the 'clear' command to tidy the terminal screen.",
      instructions: "Incredible progress! Whenever your screen gets cluttered, run clear to wipe the slate clean and keep your environment peaceful.",
      successCondition: (cmd) => cmd === "clear",
      hint: "Just type 'clear' and hit Enter!"
    },
    {
      id: 11,
      title: "Fetching Web Toys",
      subtitle: "The fetch / curl web data extractor",
      objective: "Fetch remote milk API data by typing 'fetch https://api.babylinux.org/milk'.",
      instructions: "In Linux, curl and fetch allow you to reach out to the internet to pull data right into your terminal! Type fetch https://api.babylinux.org/milk (or curl https://api.babylinux.org/milk) to retrieve fresh milk data!",
      successCondition: (cmd, args) => (cmd === "fetch" || cmd === "curl") && args.some((a) => a.includes("milk")),
      hint: "Type 'fetch https://api.babylinux.org/milk' and press Enter."
    },
    {
      id: 12,
      title: "Magnifying Glass Search",
      subtitle: "Filtering file contents with grep",
      objective: "Find lines containing 'STATUS' in 'baby_bottle.conf' using 'grep STATUS baby_bottle.conf'.",
      instructions: "When files get long, grep acts as a powerful magnifying glass. Type grep STATUS baby_bottle.conf (from root) to locate the status line instantly!",
      successCondition: (cmd, args) => cmd === "grep" && args.includes("baby_bottle.conf"),
      hint: "Make sure you are at `/` or specify the file path, then type 'grep STATUS baby_bottle.conf'."
    },
    {
      id: 13,
      title: "Baby Security Locks",
      subtitle: "Changing file permissions with chmod",
      objective: "Make 'play.sh' executable by running 'chmod +x play.sh'.",
      instructions: "In Linux, scripts require execute (+x) permissions before they can be run. Type chmod +x play.sh to unlock executable permissions on your nursery rhyme script!",
      successCondition: (cmd, args) => cmd === "chmod" && args.includes("+x") && args.includes("play.sh"),
      hint: "Type 'chmod +x play.sh' to grant execute rights."
    },
    {
      id: 14,
      title: "Crib Energy & Active Tasks",
      subtitle: "Monitoring processes with ps or top",
      objective: "Inspect running background tasks by typing 'ps' or 'top'.",
      instructions: "Linux monitors all background apps as active 'processes'. Type ps (Process Status) or top to inspect active tasks currently running in your crib!",
      successCondition: (cmd) => cmd === "ps" || cmd === "top",
      hint: "Type 'ps' or 'top' in the terminal."
    },
    {
      id: 15,
      title: "Creating Baby Shortcuts",
      subtitle: "Custom command nicknames with alias",
      objective: "Create a shortcut 'scan' for 'ls -a' by typing 'alias scan=\"ls -a\"'.",
      instructions: "Tired of typing long flags? The alias command lets you create cute nicknames! Type alias scan=\"ls -a\" to create your custom shortcut.",
      successCondition: (cmd, args) => cmd === "alias" && args.some((a) => a.includes("scan")),
      hint: "Type 'alias scan=\"ls -a\"' and press Enter."
    },
    {
      id: 16,
      title: "Baby Notebook Editor",
      subtitle: "Writing notes with nano",
      objective: "Open the notebook editor by typing 'nano notes.txt'.",
      instructions: "Need a simple text notebook to write notes or code? nano is the most beginner-friendly terminal text editor! Type nano notes.txt to open your notebook.",
      successCondition: (cmd, args) => cmd === "nano" && args.length > 0,
      hint: "Type 'nano notes.txt' to open the notebook editor."
    },
    {
      id: 17,
      title: "Connecting Water Pipes",
      subtitle: "Piping commands together with '|'",
      objective: "Chain cat and grep using 'cat baby_bottle.conf | grep STATUS'.",
      instructions: "Pipes (|) let you stream the output of one command straight into another! Type cat baby_bottle.conf | grep STATUS to combine reading and filtering in one swoop.",
      successCondition: (_cmd, _args, _path, _fs, rawCmd) => !!rawCmd && rawCmd.includes("|") && rawCmd.includes("grep"),
      hint: "Type 'cat baby_bottle.conf | grep STATUS' and hit Enter."
    },
    {
      id: 18,
      title: "Cloning Your Favorite Toy",
      subtitle: "Duplicating files with cp",
      objective: "Make a copy of 'baby_bottle.conf' named 'bottle_backup.conf' using 'cp baby_bottle.conf bottle_backup.conf'.",
      instructions: "Never risk losing a file! Use cp (Copy) to clone files. Type cp baby_bottle.conf bottle_backup.conf to create a safety duplicate.",
      successCondition: (_cmd, _args, _path, currentFs) => !!currentFs["/bottle_backup.conf"],
      hint: "Make sure you are at `/` then type 'cp baby_bottle.conf bottle_backup.conf'."
    },
    {
      id: 19,
      title: "Relocating & Renaming Toys",
      subtitle: "Moving files with mv",
      objective: "Rename 'blue_block.txt' to 'cyan_block.txt' inside '/blocks' using 'mv blue_block.txt cyan_block.txt'.",
      instructions: "The mv command relocates or renames files! Crawl into blocks using cd blocks, then type mv blue_block.txt cyan_block.txt to give it a fresh color name.",
      successCondition: (_cmd, _args, _path, currentFs) => !currentFs["/blocks/blue_block.txt"] && !!currentFs["/blocks/cyan_block.txt"],
      hint: "Crawl into blocks using 'cd blocks', then type 'mv blue_block.txt cyan_block.txt'."
    },
    {
      id: 20,
      title: "The Big Baby Instruction Manual",
      subtitle: "Reading command handbooks with man",
      objective: "Read the official manual for fetch or ls by typing 'man fetch' or 'man ls'.",
      instructions: "Congratulations! You are now a master explorer! Whenever you want to learn any Linux command in depth, type man <command> (e.g., man fetch). Try it now!",
      successCondition: (cmd) => cmd === "man",
      hint: "Type 'man fetch' or 'man ls' to open the instruction manual handbook!"
    }
  ];

  const currentLesson = lessons.find((l) => l.id === currentLessonId) || lessons[0];

  // Focus terminal input on mount safely without page scroll
  useEffect(() => {
    terminalInputRef.current?.focus({ preventScroll: true });
  }, []);

  const focusTerminal = () => {
    terminalInputRef.current?.focus({ preventScroll: true });
  };

  // Helper to resolve paths
  const resolvePath = (target: string): string => {
    if (!target) return currentPath;
    if (target === "/") return "/";

    let resolved = currentPath;
    if (target.startsWith("/")) {
      resolved = target;
    } else {
      // Relative path resolution
      const parts = currentPath.split("/").filter(Boolean);
      const targetParts = target.split("/").filter(Boolean);

      for (const t of targetParts) {
        if (t === ".") {
          continue;
        } else if (t === "..") {
          parts.pop();
        } else {
          parts.push(t);
        }
      }
      resolved = "/" + parts.join("/");
    }

    // Clean up trailing slash unless it's root
    if (resolved.endsWith("/") && resolved !== "/") {
      resolved = resolved.slice(0, -1);
    }
    return resolved;
  };

  // Execute Simulated Command
  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = inputVal.trim();
    if (!trimmedInput) return;

    // Add command to log and history
    setTerminalLogs((prev) => [...prev, { type: "cmd", text: `$ ${trimmedInput}` }]);
    setCommandHistory((prev) => [trimmedInput, ...prev.filter((c) => c !== trimmedInput)]);
    setHistoryIndex(-1);
    setInputVal("");

    // Handle Command Pipelines (Pipes '|')
    if (trimmedInput.includes("|")) {
      const pipeParts = trimmedInput.split("|").map((p) => p.trim());
      if (pipeParts.length === 2 && pipeParts[0].startsWith("cat ") && pipeParts[1].startsWith("grep ")) {
        const catTarget = pipeParts[0].replace("cat ", "").trim();
        const grepTerm = pipeParts[1].replace("grep ", "").trim();
        const resolved = resolvePath(catTarget);

        if (fs[resolved] && fs[resolved].type === "file") {
          const lines = (fs[resolved] as SimulatedFile).content.split("\n");
          const matched = lines.filter((line) => line.toLowerCase().includes(grepTerm.toLowerCase()));
          if (matched.length > 0) {
            setTerminalLogs((prev) => [
              ...prev,
              ...matched.map((m) => ({ type: "output" as const, text: `🚰 [PIPE SUCCESS] ${m}` }))
            ]);
          } else {
            setTerminalLogs((prev) => [
              ...prev,
              { type: "output", text: `🚰 [PIPE] No lines matching '${grepTerm}' found in ${catTarget}` }
            ]);
          }
        } else {
          addErrorWithTranslation(
            trimmedInput,
            `cat: ${catTarget}: File not found`,
            `You asked cat to read '${catTarget}', but that file doesn't exist in your current room (${currentPath}).`,
            `Run 'ls' to check existing files, or type 'touch ${catTarget}' to spawn it first!`,
            `touch ${catTarget}`
          );
        }
        checkLessonSuccess("pipe", [], currentPath, fs, trimmedInput);
        return;
      }
    }

    const parts = trimmedInput.split(" ");
    let cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    // Check Alias Expansion
    if (aliases[cmd]) {
      cmd = aliases[cmd];
    }

    // System Journal & Logs Command
    if (cmd === "logs" || cmd === "journalctl" || cmd === "dmesg" || cmd === "baby.log") {
      setIsLogViewerOpen(true);
      setTerminalLogs((prev) => [
        ...prev,
        { type: "output", text: "📜 Opening Baby System Journal & Error Translator..." }
      ]);
      return;
    }

    // Help Command
    if (cmd === "help") {
      setTerminalLogs((prev) => [
        ...prev,
        { type: "output", text: "👶 BABY SHELL SYSTEM GUIDE & DEPOSITORY:" },
        { type: "output", text: "  pwd                  - Print current crib location." },
        { type: "output", text: "  ls [-a]              - Scan/List toys in the current folder." },
        { type: "output", text: "  cd <folder>          - Crawl into a different directory." },
        { type: "output", text: "  cat <file>           - Read details or suck text out of a file." },
        { type: "output", text: "  mkdir <name>         - Weave/Create a brand new folder." },
        { type: "output", text: "  touch <name>         - Spawn a new empty toy/file." },
        { type: "output", text: "  echo <text> [> file] - Chant/Write text, optional redirect to file." },
        { type: "output", text: "  rm <file>            - Remove/Put a toy away." },
        { type: "output", text: "  fetch / curl <url>   - Fetch remote web toys & milk API endpoints." },
        { type: "output", text: "  grep <term> <file>   - Search for words inside files." },
        { type: "output", text: "  chmod +x <file>      - Unlock execution permissions." },
        { type: "output", text: "  ps / top             - Inspect running processes & crib energy." },
        { type: "output", text: "  logs / journalctl    - View System Journal & translate errors." },
        { type: "output", text: "  alias <key>='<cmd>'  - Create custom command nicknames." },
        { type: "output", text: "  nano <file>          - Open interactive notebook editor." },
        { type: "output", text: "  cp <src> <dest>      - Clone / duplicate files." },
        { type: "output", text: "  mv <src> <dest>      - Move / rename files." },
        { type: "output", text: "  ada [folder] / bundle- Ada's organizer: tuck loose root files into a folder." },
        { type: "output", text: "  backup [name] / save - Save a complete sandbox snapshot." },
        { type: "output", text: "  restore [name]/ load - Restore a saved sandbox snapshot." },
        { type: "output", text: "  backups              - Open Backup Center or list saved snapshots." },
        { type: "output", text: "  export               - Export sandbox snapshot as downloadable JSON." },
        { type: "output", text: "  git <status|add|push>- Full Git version control commands (status, add, commit, push, log)." },
        { type: "output", text: "  man <cmd>            - Read official command handbooks." },
        { type: "output", text: "  push <msg> / unpush  - Send real-time push alert / Mute notifications & tips." },
        { type: "output", text: "  tux / ascii          - Summon Tux Jr. the penguin in ASCII art! 🐧" },
        { type: "output", text: "  cowsay [text]        - Make Tux Jr. speak your message in ASCII!" },
        { type: "output", text: "  neofetch             - Display Baby Linux system specs with Tux Jr. ASCII art." },
        { type: "output", text: "  fortune              - Receive a cozy Linux fortune quote." },
        { type: "output", text: "  clear                - Clean terminal display screen." },
        { type: "output", text: "  reset                - Reset file system layout to default baby state." }
      ]);
      return;
    }

    // Reset Command
    if (cmd === "reset") {
      setFs(getInitialFS());
      setCurrentPath("/");
      setAliases({});
      setTerminalLogs((prev) => [...prev, { type: "success", text: "🧸 Sandbox successfully restored to original configuration!" }]);
      return;
    }

    // Clear Command
    if (cmd === "clear") {
      setTerminalLogs([]);
      checkLessonSuccess("clear", args, currentPath, fs);
      return;
    }

    // PWD Command
    if (cmd === "pwd") {
      setTerminalLogs((prev) => [...prev, { type: "output", text: currentPath }]);
      checkLessonSuccess("pwd", args, currentPath, fs);
      return;
    }

    // LS Command
    if (cmd === "ls") {
      const showHidden = args.includes("-a");
      const listPath = currentPath;

      const contents = Object.keys(fs).filter((key) => {
        if (key === "/") return false;
        const parentPath = key.substring(0, key.lastIndexOf("/")) || "/";
        const name = key.substring(key.lastIndexOf("/") + 1);

        if (parentPath !== listPath) return false;
        if (name.startsWith(".") && !showHidden) return false;
        return true;
      });

      if (contents.length === 0) {
        setTerminalLogs((prev) => [...prev, { type: "output", text: "empty crib" }]);
      } else {
        const formatted = contents
          .map((key) => {
            const node = fs[key];
            const name = key.substring(key.lastIndexOf("/") + 1);
            return node.type === "dir" ? `${name}/` : name;
          })
          .join("   ");
        setTerminalLogs((prev) => [...prev, { type: "output", text: formatted }]);
      }

      checkLessonSuccess("ls", args, currentPath, fs);
      return;
    }

    // CD Command
    if (cmd === "cd") {
      const target = args[0] || "/";
      const resolved = resolvePath(target);

      if (fs[resolved]) {
        if (fs[resolved].type === "dir") {
          setCurrentPath(resolved);
          checkLessonSuccess("cd", args, resolved, fs);
        } else {
          addErrorWithTranslation(
            `cd ${target}`,
            `cd: ${target}: Not a directory`,
            `You tried to crawl inside '${target}', but '${target}' is a file toy, not a folder room!`,
            `To read the file's text, use 'cat ${target}' instead.`,
            `cat ${target}`
          );
        }
      } else {
        addErrorWithTranslation(
          `cd ${target}`,
          `cd: ${target}: No such file or directory`,
          `You tried to crawl into '${target}', but there is no folder by that name in ${currentPath}.`,
          `Run 'ls' to see available folders, or build it using 'mkdir ${target}'.`,
          `mkdir ${target}`
        );
      }
      return;
    }

    // CAT Command
    if (cmd === "cat") {
      if (args.length === 0) {
        addErrorWithTranslation(
          "cat",
          "cat: missing argument",
          "You typed 'cat' without specifying which file you want to read.",
          "Specify a filename, like 'cat rattle.txt'.",
          "ls"
        );
        return;
      }
      const targetFile = args[0];
      const resolved = resolvePath(targetFile);

      if (fs[resolved]) {
        const node = fs[resolved];
        if (node.type === "file") {
          setTerminalLogs((prev) => [...prev, { type: "output", text: node.content }]);
          checkLessonSuccess("cat", args, currentPath, fs);
        } else {
          addErrorWithTranslation(
            `cat ${targetFile}`,
            `cat: ${targetFile}: Is a directory`,
            `'${targetFile}' is a folder room, not a text file! You cannot read a directory with cat.`,
            `Crawl inside the folder using 'cd ${targetFile}' or list its contents with 'ls ${targetFile}'.`,
            `cd ${targetFile}`
          );
        }
      } else {
        addErrorWithTranslation(
          `cat ${targetFile}`,
          `cat: ${targetFile}: No such file or directory`,
          `You asked cat to read '${targetFile}', but that file does not exist in your current room (${currentPath}).`,
          `Run 'ls' to see what files exist here, or type 'touch ${targetFile}' to create it!`,
          `touch ${targetFile}`
        );
      }
      return;
    }

    // FETCH / CURL Commands
    if (cmd === "fetch" || cmd === "curl") {
      const url = args[0] || "https://api.babylinux.org/milk";
      setTerminalLogs((prev) => [
        ...prev,
        { type: "output", text: `🌐 [${cmd.toUpperCase()}] Requesting data from ${url}...` },
        { type: "success", text: `HTTP/1.1 200 OK` },
        { type: "output", text: `{"status": "100% warm milk ready", "temperature": "38°C", "satisfaction": "maximum", "formula": "organic-calm"}` }
      ]);
      checkLessonSuccess(cmd, args, currentPath, fs);
      return;
    }

    // GREP Command
    if (cmd === "grep") {
      if (args.length < 2) {
        addErrorWithTranslation(
          "grep",
          "grep: missing arguments",
          "Grep needs a search word AND a filename, like: grep Milk blocks/red_block.txt",
          "Provide both a search term and a target filename."
        );
        return;
      }
      const searchTerm = args[0];
      const targetFile = args[1];
      const resolved = resolvePath(targetFile);

      if (fs[resolved] && fs[resolved].type === "file") {
        const lines = (fs[resolved] as SimulatedFile).content.split("\n");
        const matched = lines.filter((line) => line.toLowerCase().includes(searchTerm.toLowerCase()));
        if (matched.length > 0) {
          setTerminalLogs((prev) => [
            ...prev,
            ...matched.map((m) => ({ type: "output" as const, text: `🔍 ${m}` }))
          ]);
        } else {
          setTerminalLogs((prev) => [...prev, { type: "output", text: `No lines matching '${searchTerm}' found.` }]);
        }
        checkLessonSuccess("grep", args, currentPath, fs);
      } else {
        addErrorWithTranslation(
          `grep ${searchTerm} ${targetFile}`,
          `grep: ${targetFile}: No such file in crib`,
          `Your magnifying glass search couldn't find file '${targetFile}' in ${currentPath}.`,
          `Run 'ls' to verify the filename spelling.`
        );
      }
      return;
    }

    // CHMOD Command
    if (cmd === "chmod") {
      if (args.length < 2) {
        addErrorWithTranslation(
          "chmod",
          "chmod: missing arguments",
          "Chmod needs permission flags and a filename, e.g. chmod +x rattle.txt",
          "Specify mode (+x) and target file."
        );
        return;
      }
      const perm = args[0];
      const targetFile = args[1];
      const resolved = resolvePath(targetFile);

      if (fs[resolved]) {
        const updatedFs = { ...fs };
        updatedFs[resolved] = { ...updatedFs[resolved], permissions: perm === "+x" ? "-rwxr-xr-x" : perm };
        setFs(updatedFs);
        setTerminalLogs((prev) => [
          ...prev,
          { type: "success", text: `🔒 [PERMISSIONS UPDATED] ${targetFile} is now set to '${perm === "+x" ? "-rwxr-xr-x (Executable)" : perm}'` }
        ]);
        checkLessonSuccess("chmod", args, currentPath, updatedFs);
      } else {
        addErrorWithTranslation(
          `chmod ${perm} ${targetFile}`,
          `chmod: ${targetFile}: File not found`,
          `Cannot change permissions for '${targetFile}' because the file doesn't exist.`,
          `Run 'touch ${targetFile}' to spawn the file first.`,
          `touch ${targetFile}`
        );
      }
      return;
    }

    // PS & TOP Commands
    if (cmd === "ps" || cmd === "top") {
      setTerminalLogs((prev) => [
        ...prev,
        { type: "output", text: "⚡ [ACTIVE CRIB PROCESSES & ENERGY MONITOR]" },
        { type: "output", text: "PID   TTY      TIME     CPU%   CMD" },
        { type: "output", text: "101   tty1     00:00:01 0.1%   baby-bash" },
        { type: "output", text: "102   tty1     00:00:03 0.2%   milk-daemon" },
        { type: "output", text: "103   tty1     00:00:08 0.5%   google-lady-mentor" }
      ]);
      checkLessonSuccess(cmd, args, currentPath, fs);
      return;
    }

    // ALIAS Command
    if (cmd === "alias") {
      if (args.length === 0) {
        const aliasList = Object.entries(aliases).map(([k, v]) => `${k}='${v}'`).join("\n") || "No custom aliases set.";
        setTerminalLogs((prev) => [...prev, { type: "output", text: aliasList }]);
        return;
      }
      const aliasStr = args.join(" ");
      const match = aliasStr.match(/^([a-zA-Z0-9_-]+)=['"]?([^'"]+)['"]?$/);
      if (match) {
        const name = match[1];
        const val = match[2];
        setAliases((prev) => ({ ...prev, [name]: val }));
        setTerminalLogs((prev) => [...prev, { type: "success", text: `🏷️ Created alias: ${name} => '${val}'` }]);
        checkLessonSuccess("alias", args, currentPath, fs);
      } else {
        addErrorWithTranslation(
          `alias ${aliasStr}`,
          "alias: invalid syntax",
          "Alias creation format requires: alias nickname='command'",
          "Example: alias ll='ls -a'"
        );
      }
      return;
    }

    // NANO Notebook Editor Command
    if (cmd === "nano") {
      if (args.length === 0) {
        addErrorWithTranslation(
          "nano",
          "nano: missing filename",
          "Specify a filename to open in the notebook editor.",
          "Example: nano notes.txt",
          "nano notes.txt"
        );
        return;
      }
      const filename = args[0];
      const resolved = resolvePath(filename);

      if (!fs[resolved]) {
        const updatedFs = {
          ...fs,
          [resolved]: { type: "file" as const, name: filename, content: "📝 Notebook entry written in Baby Nano Editor." }
        };
        setFs(updatedFs);
      }
      setTerminalLogs((prev) => [
        ...prev,
        { type: "output", text: `📝 [NANO EDITOR OPENED] Editing ${filename}...` },
        { type: "success", text: `[Saved & Closed ${filename} successfully]` }
      ]);
      checkLessonSuccess("nano", args, currentPath, fs);
      return;
    }

    // CP (Copy) Command
    if (cmd === "cp") {
      if (args.length < 2) {
        addErrorWithTranslation(
          "cp",
          "cp: missing destination argument",
          "Copy requires both source file AND target destination: cp source.txt clone.txt",
          "Provide source and target filenames."
        );
        return;
      }
      const srcResolved = resolvePath(args[0]);
      const destResolved = resolvePath(args[1]);

      if (fs[srcResolved]) {
        const name = args[1].substring(args[1].lastIndexOf("/") + 1);
        const srcNode = fs[srcResolved];
        const updatedFs = {
          ...fs,
          [destResolved]: { ...srcNode, name }
        };
        setFs(updatedFs);
        setTerminalLogs((prev) => [...prev, { type: "success", text: `👯 Cloned ${args[0]} to ${args[1]}` }]);
        checkLessonSuccess("cp", args, currentPath, updatedFs);
      } else {
        addErrorWithTranslation(
          `cp ${args[0]} ${args[1]}`,
          `cp: ${args[0]}: Source file not found`,
          `Cannot clone '${args[0]}' because the source file does not exist in ${currentPath}.`,
          `Run 'ls' to check file names before copying.`
        );
      }
      return;
    }

    // MV (Move/Rename) Command
    if (cmd === "mv") {
      if (args.length < 2) {
        addErrorWithTranslation(
          "mv",
          "mv: missing destination argument",
          "Move requires both source file AND destination path: mv old.txt new.txt",
          "Provide source and target filenames."
        );
        return;
      }
      const srcResolved = resolvePath(args[0]);
      const destResolved = resolvePath(args[1]);

      if (fs[srcResolved]) {
        const name = args[1].substring(args[1].lastIndexOf("/") + 1);
        const srcNode = fs[srcResolved];
        const updatedFs = { ...fs };
        delete updatedFs[srcResolved];
        updatedFs[destResolved] = { ...srcNode, name };
        setFs(updatedFs);
        setTerminalLogs((prev) => [...prev, { type: "success", text: `🚚 Relocated/Renamed ${args[0]} to ${args[1]}` }]);
        checkLessonSuccess("mv", args, currentPath, updatedFs);
      } else {
        addErrorWithTranslation(
          `mv ${args[0]} ${args[1]}`,
          `mv: ${args[0]}: Source file not found`,
          `Cannot move or rename '${args[0]}' because the source file does not exist.`,
          `Run 'ls' to check file names.`
        );
      }
      return;
    }

    // ADA / ORGANIZE / BUNDLE Command - Put loose root files into a folder
    if (cmd === "ada" || cmd === "organize" || cmd === "bundle") {
      const targetDirName = args[0] || "ada_workspace";
      const targetDirPath = `/${targetDirName}`;

      const updatedFs = { ...fs };
      if (!updatedFs[targetDirPath]) {
        updatedFs[targetDirPath] = { type: "dir", name: targetDirName };
      }

      let movedCount = 0;
      Object.keys(fs).forEach((key) => {
        if (key === "/" || key === targetDirPath) return;
        const parentPath = key.substring(0, key.lastIndexOf("/")) || "/";
        const name = key.substring(key.lastIndexOf("/") + 1);

        if (parentPath === "/" && fs[key].type === "file") {
          const newPath = `${targetDirPath}/${name}`;
          updatedFs[newPath] = { ...fs[key], name };
          delete updatedFs[key];
          movedCount++;
        }
      });

      setFs(updatedFs);
      setTerminalLogs((prev) => [
        ...prev,
        {
          type: "success",
          text: `💻✨ [ADA COMPANION]: Tucked ${movedCount} loose file(s) safely into '${targetDirPath}'!`
        },
        {
          type: "output",
          text: `💡 Type 'cd ${targetDirName}' and 'ls' to inspect your tidy sandbox workspace.`
        }
      ]);
      return;
    }

    // BACKUP / SAVE Command
    if (cmd === "backup" || cmd === "save") {
      const snapName = args.join("_") || undefined;
      const snap = createBackupSnapshot(snapName);
      setTerminalLogs((prev) => [
        ...prev,
        {
          type: "success",
          text: `💾✨ [ADA BACKUP ENGINE]: Snapshot '${snap.name}' saved successfully!`
        },
        {
          type: "output",
          text: `📁 Saved to /backups/${snap.name}.json and local browser storage. Type 'backups' or 'restore' anytime!`
        }
      ]);
      return;
    }

    // RESTORE / LOAD Command
    if (cmd === "restore" || cmd === "load") {
      const targetName = args.join("_");
      if (!targetName) {
        if (backups.length === 0) {
          setTerminalLogs((prev) => [
            ...prev,
            { type: "error", text: "restore: No saved backups found. Type 'backup <name>' to save one!" }
          ]);
        } else {
          // Restore the latest backup by default
          restoreBackupSnapshot(backups[0]);
        }
      } else {
        const found = backups.find(
          (b) => b.name.toLowerCase() === targetName.toLowerCase() || b.id === targetName
        );
        if (found) {
          restoreBackupSnapshot(found);
        } else {
          setTerminalLogs((prev) => [
            ...prev,
            { type: "error", text: `restore: Snapshot '${targetName}' not found. Type 'backups' to list snapshots.` }
          ]);
        }
      }
      return;
    }

    // BACKUPS List Command
    if (cmd === "backups" || cmd === "snapshots") {
      setIsBackupModalOpen(true);
      if (backups.length === 0) {
        setTerminalLogs((prev) => [
          ...prev,
          { type: "output", text: "💾 No backups saved yet. Type 'backup [name]' to create your first snapshot!" }
        ]);
      } else {
        setTerminalLogs((prev) => [
          ...prev,
          { type: "output", text: `💾 SAVED SANDBOX SNAPSHOTS (${backups.length}):` },
          ...backups.map((b) => ({
            type: "output" as const,
            text: `  • ${b.name} (${b.timestamp}) - Level ${b.currentLessonId}, ${b.itemCount} items`
          })),
          { type: "output", text: "💡 Type 'restore <name>' to load any snapshot!" }
        ]);
      }
      return;
    }

    // EXPORT Command
    if (cmd === "export") {
      const snap = createBackupSnapshot("export_download");
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(snap, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `baby_linux_export_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setTerminalLogs((prev) => [
        ...prev,
        {
          type: "success",
          text: `📥✨ [ADA EXPORTER]: Downloaded full sandbox backup JSON file!`
        }
      ]);
      return;
    }

    // GIT Command Suite
    if (cmd === "git") {
      const subCmd = args[0]?.toLowerCase();
      const subArgs = args.slice(1);

      if (!subCmd) {
        setTerminalLogs((prev) => [
          ...prev,
          { type: "output", text: "🐙 [ADA GIT VERSION CONTROL ENGINE v2.4]" },
          { type: "output", text: "Usage: git <command> [options]\n" },
          { type: "output", text: "Commands:" },
          { type: "output", text: "  git status          - Check working directory & staged files" },
          { type: "output", text: "  git add <file>      - Stage files for committing (or 'git add .')" },
          { type: "output", text: "  git commit -m \"msg\" - Commit staged snapshot to repository" },
          { type: "output", text: "  git push            - Push commits to remote GitHub repository" },
          { type: "output", text: "  git log             - View commit history log" },
          { type: "output", text: "  git branch          - List local git branches" },
          { type: "output", text: "  git init            - Initialize new git repository" },
          { type: "output", text: "  git clone <url>     - Clone a repository into current directory" }
        ]);
        return;
      }

      if (subCmd === "init") {
        setIsGitInitialized(true);
        setTerminalLogs((prev) => [
          ...prev,
          { type: "success", text: `Initialized empty Git repository in ${currentPath}/.git/` }
        ]);
        return;
      }

      if (subCmd === "status") {
        const fileKeys = Object.keys(fs).filter((k) => k !== "/" && fs[k].type === "file");
        const relativeFiles = fileKeys.map((k) => (k.startsWith("/") ? k.slice(1) : k));
        const unstaged = relativeFiles.filter((f) => !gitStaged.includes(f));

        setTerminalLogs((prev) => [
          ...prev,
          { type: "output", text: `On branch ${gitBranch}` },
          { type: "output", text: `Your branch is up to date with 'origin/${gitBranch}'.\n` },
          ...(gitStaged.length > 0
            ? [
                { type: "output" as const, text: "Changes to be committed:" },
                { type: "output" as const, text: "  (use \"git restore --staged <file>...\" to unstage)\n" },
                ...gitStaged.map((f) => ({ type: "success" as const, text: `\tstaged:   ${f}` }))
              ]
            : [{ type: "output" as const, text: "No changes staged for commit." }]),
          ...(unstaged.length > 0
            ? [
                { type: "output" as const, text: "\nUntracked / Modified files:" },
                { type: "output" as const, text: "  (use \"git add <file>...\" to include in what will be committed)\n" },
                ...unstaged.map((f) => ({ type: "error" as const, text: `\t${f}` }))
              ]
            : [{ type: "output" as const, text: "\nnothing to commit, working tree clean" }])
        ]);
        return;
      }

      if (subCmd === "add") {
        const target = subArgs[0];
        if (!target) {
          addErrorWithTranslation(
            "git add",
            "fatal: No pathspec given",
            "You typed 'git add' without specifying which file to stage.",
            "Type 'git add .' or 'git add <filename>'."
          );
          return;
        }

        const fileKeys = Object.keys(fs).filter((k) => k !== "/" && fs[k].type === "file");
        const relativeFiles = fileKeys.map((k) => (k.startsWith("/") ? k.slice(1) : k));

        if (target === "." || target === "-A" || target === "*") {
          setGitStaged(relativeFiles);
          setTerminalLogs((prev) => [
            ...prev,
            { type: "success", text: `🐙 Staged ${relativeFiles.length} file(s) for commit!` }
          ]);
        } else {
          const resolved = resolvePath(target);
          if (fs[resolved]) {
            const relName = resolved.startsWith("/") ? resolved.slice(1) : resolved;
            if (!gitStaged.includes(relName)) {
              setGitStaged((prev) => [...prev, relName]);
            }
            setTerminalLogs((prev) => [
              ...prev,
              { type: "success", text: `🐙 Staged '${relName}' for commit!` }
            ]);
          } else {
            addErrorWithTranslation(
              `git add ${target}`,
              `fatal: pathspec '${target}' did not match any files`,
              `The file '${target}' was not found in ${currentPath}.`,
              "Run 'ls' to verify filenames."
            );
          }
        }
        return;
      }

      if (subCmd === "commit") {
        let msg = "Update sandbox files";
        const mIndex = subArgs.indexOf("-m");
        if (mIndex !== -1 && subArgs[mIndex + 1]) {
          msg = subArgs.slice(mIndex + 1).join(" ").replace(/['"]/g, "");
        } else if (subArgs.length > 0) {
          msg = subArgs.join(" ").replace(/['"]/g, "");
        }

        if (gitStaged.length === 0) {
          setTerminalLogs((prev) => [
            ...prev,
            { type: "output", text: "On branch main\nNothing staged to commit (use \"git add\" to stage files)." }
          ]);
          return;
        }

        const shortSha = Math.random().toString(36).substring(2, 9);
        const newCommit = {
          hash: shortSha,
          message: msg,
          date: new Date().toLocaleString(),
          files: [...gitStaged]
        };

        setGitCommits((prev) => [newCommit, ...prev]);
        const committedCount = gitStaged.length;
        setGitStaged([]);

        setTerminalLogs((prev) => [
          ...prev,
          { type: "success", text: `[${gitBranch} ${shortSha}] ${msg}` },
          { type: "output", text: ` ${committedCount} file(s) changed, commit recorded.` }
        ]);
        return;
      }

      if (subCmd === "push") {
        const latestCommit = gitCommits[0];
        const hash = latestCommit ? latestCommit.hash : "d41787a";
        setTerminalLogs((prev) => [
          ...prev,
          { type: "output", text: "Enumerating objects: 5, done." },
          { type: "output", text: "Counting objects: 100% (5/5), done." },
          { type: "output", text: "Writing objects: 100% (5/5), 1.2 KiB | 1.2 MiB/s, done." },
          { type: "success", text: `🚀 [GITHUB SYNC SUCCESS]: To https://github.com/xxDoc315xx-hash/baby-linux-sandbox.git` },
          { type: "output", text: `   ${hash.slice(0, 7)}..${hash.slice(0, 7)}  ${gitBranch} -> ${gitBranch}` },
          { type: "output", text: "✨ GitHub repository is now fully up to date!" }
        ]);
        return;
      }

      if (subCmd === "log") {
        setTerminalLogs((prev) => [
          ...prev,
          ...gitCommits.flatMap((c) => [
            { type: "output" as const, text: `commit \x1b[33m${c.hash}\x1b[0m (HEAD -> ${gitBranch}, origin/${gitBranch})` },
            { type: "output" as const, text: `Author: xxDoc315xx-hash <xxDoc315xx@hotmail.com>` },
            { type: "output" as const, text: `Date:   ${c.date}\n` },
            { type: "output" as const, text: `    ${c.message}\n` }
          ])
        ]);
        return;
      }

      if (subCmd === "branch") {
        setTerminalLogs((prev) => [
          ...prev,
          { type: "success", text: `* ${gitBranch}` }
        ]);
        return;
      }

      if (subCmd === "clone") {
        const repoUrl = subArgs[0] || "https://github.com/xxDoc315xx-hash/baby-linux-sandbox.git";
        const repoName = repoUrl.split("/").pop()?.replace(".git", "") || "cloned_repo";
        const targetDirPath = resolvePath(repoName);

        setFs((prev) => ({
          ...prev,
          [targetDirPath]: { type: "dir", name: repoName },
          [`${targetDirPath}/README.md`]: { type: "file", name: "README.md", content: `# ${repoName}\nCloned via Baby Linux Git Engine!` }
        }));

        setTerminalLogs((prev) => [
          ...prev,
          { type: "output", text: `Cloning into '${repoName}'...` },
          { type: "output", text: "remote: Enumerating objects: 42, done." },
          { type: "output", text: "remote: Compressing objects: 100% (30/30), done." },
          { type: "success", text: `✨ Cloned repository successfully into ./${repoName}!` }
        ]);
        return;
      }

      addErrorWithTranslation(
        `git ${subCmd}`,
        `git: '${subCmd}' is not a git command. See 'git --help'`,
        `The git subcommand '${subCmd}' is not recognized.`,
        "Try 'git status', 'git add .', 'git commit -m \"msg\"', or 'git push'."
      );
      return;
    }

    // MAN Handbook Command
    if (cmd === "man") {
      const topic = args[0] || "ls";
      setTerminalLogs((prev) => [
        ...prev,
        { type: "output", text: `📖 [MANUAL HANDBOOK: ${topic.toUpperCase()}(1)]` },
        { type: "output", text: `NAME\n    ${topic} - Baby Linux official handbook documentation page.` },
        { type: "output", text: `DESCRIPTION\n    Full beginner instructions and flags for ${topic}. Use 'q' or clear to return.` }
      ]);
      checkLessonSuccess("man", args, currentPath, fs);
      return;
    }

    // MKDIR Command
    if (cmd === "mkdir") {
      if (args.length === 0) {
        addErrorWithTranslation(
          "mkdir",
          "mkdir: missing folder name",
          "You typed 'mkdir' without giving your new folder room a name.",
          "Provide a name like 'mkdir my_playroom'.",
          "mkdir my_playroom"
        );
        return;
      }
      const folderName = args[0];
      const resolved = resolvePath(folderName);

      if (fs[resolved]) {
        addErrorWithTranslation(
          `mkdir ${folderName}`,
          `mkdir: ${folderName}: File or directory exists`,
          `A file or folder named '${folderName}' already exists in ${currentPath}!`,
          `Pick a new name like 'mkdir ${folderName}_2' or crawl into it with 'cd ${folderName}'.`,
          `cd ${folderName}`
        );
      } else {
        const updatedFs = {
          ...fs,
          [resolved]: { type: "dir" as const, name: folderName }
        };
        setFs(updatedFs);
        setTerminalLogs((prev) => [...prev, { type: "success", text: `Weaved directory box: ${folderName}/` }]);
        checkLessonSuccess("mkdir", args, currentPath, updatedFs);
      }
      return;
    }

    // TOUCH Command
    if (cmd === "touch") {
      if (args.length === 0) {
        addErrorWithTranslation(
          "touch",
          "touch: missing file name",
          "You typed 'touch' without specifying what file toy to spawn.",
          "Specify a filename, e.g. touch rattle.txt",
          "touch rattle.txt"
        );
        return;
      }
      const fileName = args[0];
      const resolved = resolvePath(fileName);

      if (fs[resolved]) {
        setTerminalLogs((prev) => [...prev, { type: "success", text: `Warmed up existing toy: ${fileName}` }]);
      } else {
        const updatedFs = {
          ...fs,
          [resolved]: { type: "file" as const, name: fileName, content: "Blank newborn crib toy. Add details using echo!" }
        };
        setFs(updatedFs);
        setTerminalLogs((prev) => [...prev, { type: "success", text: `Spawned file: ${fileName}` }]);
        checkLessonSuccess("touch", args, currentPath, updatedFs);
      }
      return;
    }

    // RM Command
    if (cmd === "rm") {
      if (args.length === 0) {
        addErrorWithTranslation(
          "rm",
          "rm: missing argument",
          "You typed 'rm' without specifying which file you want to delete.",
          "Specify a filename, e.g. rm rattle.txt",
          "ls"
        );
        return;
      }
      const target = args[0];
      const resolved = resolvePath(target);

      if (fs[resolved]) {
        if (fs[resolved].type === "file") {
          const updatedFs = { ...fs };
          delete updatedFs[resolved];
          setFs(updatedFs);
          setTerminalLogs((prev) => [...prev, { type: "success", text: `Put file away: ${target}` }]);
          checkLessonSuccess("rm", args, currentPath, updatedFs);
        } else {
          addErrorWithTranslation(
            `rm ${target}`,
            `rm: ${target}: Is a directory`,
            `'${target}' is a folder room! Standard 'rm' command only erases single files.`,
            `Use 'rmdir ${target}' or 'rm -r ${target}' to delete directory boxes.`
          );
        }
      } else {
        addErrorWithTranslation(
          `rm ${target}`,
          `rm: ${target}: No such file or directory`,
          `You tried to delete '${target}', but that file does not exist in ${currentPath}.`,
          `Run 'ls' to check file names before erasing.`
        );
      }
      return;
    }

    // ECHO Command
    if (cmd === "echo") {
      const redirectIndex = args.indexOf(">");
      if (redirectIndex !== -1) {
        const contentStr = args.slice(0, redirectIndex).join(" ").replace(/['"]/g, "");
        const targetFile = args[redirectIndex + 1];

        if (!targetFile) {
          addErrorWithTranslation(
            `echo ${args.join(" ")}`,
            "syntax error: missing redirect target",
            "The '>' symbol redirects text to a file, but no destination file was specified.",
            "Example: echo Hello > note.txt"
          );
          return;
        }

        const resolved = resolvePath(targetFile);
        const name = targetFile.substring(targetFile.lastIndexOf("/") + 1);

        const updatedFs = {
          ...fs,
          [resolved]: { type: "file" as const, name, content: contentStr }
        };
        setFs(updatedFs);
        setTerminalLogs((prev) => [...prev, { type: "success", text: `Chanted and wrote to file: ${targetFile}` }]);
        checkLessonSuccess("echo", args, currentPath, updatedFs);
      } else {
        const contentStr = args.join(" ").replace(/['"]/g, "");
        setTerminalLogs((prev) => [...prev, { type: "output", text: contentStr }]);
        checkLessonSuccess("echo", args, currentPath, fs);
      }
      return;
    }

    // PUSH & UNPUSH Commands
    if (cmd === "unpush" || (cmd === "push" && args[0] === "clear")) {
      setTerminalLogs((prev) => [
        ...prev,
        { type: "output", text: "🔕 Muted notification broadcasts and cleared push queue." },
        { type: "output", text: "💡 To revoke browser-level notification permissions on your phone/PC:" },
        { type: "output", text: "   1. Tap/click the Lock/Tune icon near the address bar URL." },
        { type: "output", text: "   2. Select 'Permissions' or 'Site Settings'." },
        { type: "output", text: "   3. Change 'Notifications' from Allow -> Block or Reset." }
      ]);
      return;
    }

    if (cmd === "push") {
      const messageText = args.join(" ");
      if (!messageText) {
        addErrorWithTranslation(
          "push",
          "push: missing message text",
          "Specify the text payload to broadcast to your mobile device.",
          "Example: push Hello phone!"
        );
        return;
      }

      fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText,
          email: currentUserEmail,
          sender: nickname || "Baby Bash Terminal"
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setTerminalLogs((prev) => [
            ...prev,
            { type: "success", text: `🚀 Pushed message to ${data.clientsNotified} active screen(s)!` }
          ]);
        } else {
          addErrorWithTranslation(
            `push ${messageText}`,
            `push error: ${data.message}`,
            "The real-time push broadcast server encountered an issue.",
            "Ensure mobile push receiver is active."
          );
        }
      })
      .catch(() => {
        addErrorWithTranslation(
          `push ${messageText}`,
          "push: network dispatch failed",
          "Could not establish connection with push API endpoint.",
          "Check local dev server API route status."
        );
      });
      return;
    }

    // TUX / ASCII Commands
    if (cmd === "tux" || cmd === "ascii") {
      const tuxArt = [
        "   .--.       ",
        "  |o_o |   < Squeak! Tux Jr. says: 'Linux is awesome!' 🐧 >",
        "  |:_/ |  /",
        " //   \\ \\ ",
        "(|     | )",
        "/'\\_   _/`\\",
        "\\___)=(___/"
      ].join("\n");
      setTerminalLogs((prev) => [...prev, { type: "output", text: tuxArt }]);
      checkLessonSuccess("tux", args, currentPath, fs);
      return;
    }

    // COWSAY Command
    if (cmd === "cowsay") {
      const sayText = args.join(" ") || "Squeak! Learning Linux with Ada and Tux Jr.!";
      const border = "-".repeat(sayText.length + 2);
      const cowsayArt = [
        ` ${"_".repeat(sayText.length + 2)}`,
        `< ${sayText} >`,
        ` ${border}`,
        "   \\",
        "    \\    .--.",
        "        |o_o |",
        "        |:_/ |",
        "       //   \\ \\",
        "      (|     | )",
        "      /'\\_   _/`\\",
        "      \\___)=(___/"
      ].join("\n");
      setTerminalLogs((prev) => [...prev, { type: "output", text: cowsayArt }]);
      checkLessonSuccess("cowsay", args, currentPath, fs);
      return;
    }

    // NEOFETCH Command
    if (cmd === "neofetch") {
      const neofetchArt = [
        "   .--.         ada@baby-linux",
        "  |o_o |        --------------",
        "  |:_/ |        OS: Baby Linux v1.0 (Cozy Distro)",
        " //   \\ \\       Kernel: 6.12.0-baby-tux",
        "(|     | )      Uptime: 2 days of fun coding",
        "/'\\_   _/`\\     Shell: baby-bash 4.2",
        "\\___)=(___/     Pet: Tux Jr. 🐧 (Mood: Sassy & Happy)",
        "                Coffee: Triple-shot Cold Brew ☕",
        "                Mentor: Ada (\"The Google Lady\") 💻"
      ].join("\n");
      setTerminalLogs((prev) => [...prev, { type: "output", text: neofetchArt }]);
      checkLessonSuccess("neofetch", args, currentPath, fs);
      return;
    }

    // FORTUNE Command
    if (cmd === "fortune") {
      const fortunes = [
        "🥠 Fortune: A clean directory path brings peace of mind and happy terminal sessions.",
        "🥠 Fortune: There is no place like /home! 🏡",
        "🥠 Fortune: Squeak! Sassy code is good code. 💅",
        "🥠 Fortune: Tux Jr. tested and Ada approved! 🐧✨",
        "🥠 Fortune: Great programmers aren't born; they're compiled step-by-step!",
        "🥠 Fortune: When in doubt, type 'ls' and breathe deep."
      ];
      const randomFortune = fortunes[Math.floor(Math.random() * fortunes.length)];
      setTerminalLogs((prev) => [...prev, { type: "output", text: randomFortune }]);
      checkLessonSuccess("fortune", args, currentPath, fs);
      return;
    }

    // Default Unrecognized Command error
    addErrorWithTranslation(
      cmd,
      `baby-bash: command not found: ${cmd}`,
      `Linux does not recognize '${cmd}' as a command or program.`,
      `Check spelling, type 'help', or open the Command Depository for lessons and instructions.`,
      `help`
    );
  };

  // Broadcast milestone to public Chat Room & Ada Mentor
  const broadcastLessonProgressToChat = async (completedTitle: string, nextLessonObj?: Lesson) => {
    try {
      const userDisplayName = nickname || auth.currentUser?.displayName || "Doc (Lead Architect)";
      const userUid = auth.currentUser?.uid || "doc-lead-creator";

      // 1. System milestone announcement in #baby-linux channel
      await addDoc(collection(db, "messages"), {
        channelId: "baby-linux",
        senderUid: "lesson-tracker-bot",
        senderName: "🏆 Lesson Tracker",
        senderEmail: currentUserEmail,
        senderAvatarStyle: { bgColor: "#065f46", fgColor: "#a7f3d0", pattern: "dots" },
        text: `🎉 ${userDisplayName} completed Lesson ${currentLessonId}: "${completedTitle}"! (+50 XP) 🚀 Now starting Lesson ${currentLessonId + 1}: "${nextLessonObj?.title || 'Mastery'}"!`,
        isCode: false,
        createdAt: serverTimestamp(),
        reactions: { "⭐": [userUid], "🔥": [userUid] }
      });

      // 2. Ada AI Mentor message into public chat
      if (nextLessonObj) {
        await addDoc(collection(db, "messages"), {
          channelId: "baby-linux",
          senderUid: "ada-ai-mentor",
          senderName: "Ada (AI Companion)",
          senderEmail: "ada.mentor@babylinux.ai",
          senderAvatarStyle: { bgColor: "#991b1b", fgColor: "#ffffff", pattern: "waves" },
          text: `👩‍🏫 "Woohoo, ${userDisplayName}! Outstanding job clearing '${completedTitle}'! Next up: '${nextLessonObj.title}' - ${nextLessonObj.objective} Hint: ${nextLessonObj.hint}"`,
          isCode: false,
          createdAt: serverTimestamp(),
          reactions: { "❤️": ["ada-ai-mentor"] }
        });
      }
    } catch (err) {
      console.warn("Notice: Broadcast to chat room warning:", err);
    }
  };

  // Check Lesson Success
  const checkLessonSuccess = (cmd: string, args: string[], path: string, currentFs: FileSystem, rawCmd?: string) => {
    if (currentLesson.successCondition(cmd, args, path, currentFs, rawCmd)) {
      setSuccessCelebration(true);
      const updatedCompleted = lessonsCompleted.includes(currentLessonId)
        ? lessonsCompleted
        : [...lessonsCompleted, currentLessonId];

      setLessonsCompleted(updatedCompleted);
      
      const nextLessonId = Math.min(currentLessonId + 1, lessons.length);
      const nextLessonObj = lessons.find((l) => l.id === nextLessonId);

      setTerminalLogs((prev) => [
        ...prev,
        { type: "success", text: `✨ LESSON COMPLETED: ${currentLesson.title}! Ada: "Yay! Gold star for you! ⭐"` }
      ]);

      // Talk to Google Lady immediately to congratulate locally
      triggerCongratulation(currentLesson.title);

      // Save to Firebase Firestore & broadcast to Chat Room
      syncProgressToFirestore(nextLessonId, updatedCompleted);
      broadcastLessonProgressToChat(currentLesson.title, nextLessonObj);

      setTimeout(() => {
        setSuccessCelebration(false);
        if (currentLessonId < lessons.length) {
          setCurrentLessonId(nextLessonId);
          setShowHint(false);
        }
      }, 3000);
    }
  };

  // Congratulations chat triggers
  const triggerCongratulation = async (lessonTitle: string) => {
    setChatLoading(true);
    try {
      const response = await fetch("/api/baby-linux/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `I just completed "${lessonTitle}"! Give me a quick, sassy "Yay!" or "Way to go!" celebration under 150 characters!`,
          history: chatLogs.map((c) => ({ role: c.role === "user" ? "user" : "mentor", text: `${c.senderName}: ${c.text}` })),
          currentPath,
          currentLesson,
          currentFsList: Object.keys(fs)
        })
      });
      if (response.ok) {
        const data = await response.json();
        setChatLogs((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            senderId: "google-lady",
            senderName: "The Google Lady",
            senderAvatar: "👩‍🏫",
            senderBadge: "AI Mentor",
            role: "mentor",
            text: data.text,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          }
        ]);
      }
    } catch (e) {
      // Fail silently for automatic trigger
    } finally {
      setChatLoading(false);
    }
  };

  // Handle Mentor Chat Submit
  const handleChatSubmit = async (e?: React.FormEvent, presetMsg?: string) => {
    if (e) e.preventDefault();
    const msg = presetMsg || chatInput.trim();
    if (!msg) return;

    const userDisplayName = nickname || (currentUserEmail ? currentUserEmail.split("@")[0] : "Learner");
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Append user message
    const newMsg: ChatMessage = {
      id: Math.random().toString(),
      senderId: "user",
      senderName: userDisplayName,
      senderAvatar: "👶",
      senderBadge: "Learner",
      role: "user",
      text: msg,
      timestamp
    };

    setChatLogs((prev) => [...prev, newMsg]);
    setChatInput("");
    setChatLoading(true);

    try {
      const currentFiles = Object.keys(fs).filter((k) => {
        const parent = k.substring(0, k.lastIndexOf("/")) || "/";
        return parent === currentPath;
      });

      const res = await fetch("/api/baby-linux/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          history: chatLogs.map((c) => ({
            role: c.role === "user" ? "user" : "mentor",
            text: `${c.senderName}: ${c.text}`
          })),
          currentPath,
          currentLesson,
          currentFsList: currentFiles
        })
      });

      if (!res.ok) throw new Error();
      const data = await res.json();

      setChatLogs((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          senderId: "google-lady",
          senderName: "The Google Lady",
          senderAvatar: "👩‍🏫",
          senderBadge: "AI Mentor",
          role: "mentor",
          text: data.text,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    } catch (err) {
      setChatLogs((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          senderId: "google-lady",
          senderName: "The Google Lady",
          senderAvatar: "👩‍🏫",
          senderBadge: "AI Mentor",
          role: "mentor",
          text: "Oops! My cloud server connection had a slight hitch. Please try asking me again!",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // Tab Completion Mock (Simple autocomplete for toys/directories)
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const parts = inputVal.split(" ");
      if (parts.length === 0) return;
      const lastPart = parts[parts.length - 1];

      // Match files in current path starting with lastPart
      const matchCandidates = Object.keys(fs)
        .filter((key) => {
          const parent = key.substring(0, key.lastIndexOf("/")) || "/";
          const name = key.substring(key.lastIndexOf("/") + 1);
          return parent === currentPath && name.startsWith(lastPart);
        })
        .map((key) => key.substring(key.lastIndexOf("/") + 1));

      if (matchCandidates.length === 1) {
        parts[parts.length - 1] = matchCandidates[0];
        setInputVal(parts.join(" "));
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const nextIndex = historyIndex + 1;
        if (nextIndex < commandHistory.length) {
          setHistoryIndex(nextIndex);
          setInputVal(commandHistory[nextIndex]);
        }
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const prevIndex = historyIndex - 1;
      if (prevIndex >= 0) {
        setHistoryIndex(prevIndex);
        setInputVal(commandHistory[prevIndex]);
      } else {
        setHistoryIndex(-1);
        setInputVal("");
      }
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
      
      {/* 1. Left Side: Guide & Lesson Curriculum (Columns: 5/12) */}
      <div className="md:col-span-5 space-y-6">
        
        {/* Course Card progress */}
        <div className="bg-neutral-950 border border-red-950/80 rounded-3xl p-5 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-600/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
            <span className="text-xs font-black tracking-widest uppercase text-red-500 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4" /> COURSE SYLLABUS
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsBackupModalOpen(true)}
                className="text-xs font-bold text-amber-300 hover:text-white bg-amber-950/80 hover:bg-amber-900 border border-amber-900/80 px-2.5 py-1 rounded-full transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="Manage Sandbox Snapshots & Backups"
              >
                <Database className="w-3.5 h-3.5 text-amber-400" />
                <span>Backups</span>
              </button>
              <button
                onClick={() => setIsLogViewerOpen(true)}
                className="text-xs font-bold text-rose-300 hover:text-white bg-rose-950/80 hover:bg-rose-900 border border-rose-900/80 px-2.5 py-1 rounded-full transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="View System Journal & Error Translator"
              >
                <FileText className="w-3.5 h-3.5 text-rose-400" />
                <span>Journal</span>
              </button>
              <button
                onClick={() => setIsDepositoryOpen(true)}
                className="text-xs font-bold text-red-300 hover:text-white bg-red-950/80 hover:bg-red-900 border border-red-900/80 px-2.5 py-1 rounded-full transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="Search Command Depository"
              >
                <Search className="w-3.5 h-3.5 text-red-400" />
                <span>Depository</span>
              </button>
              <span className="text-xs text-slate-300 font-bold bg-neutral-900 px-2.5 py-1 rounded-full border border-neutral-850">
                Level {currentLessonId} of {lessons.length}
              </span>
            </div>
          </div>

          {/* Lesson progress dots */}
          <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
            {lessons.map((l) => (
              <button
                key={l.id}
                onClick={() => {
                  setCurrentLessonId(l.id);
                  setShowHint(false);
                }}
                className={`h-2 flex-grow min-w-4 rounded-full transition-all ${
                  l.id === currentLessonId
                    ? "bg-red-600 shadow-sm shadow-red-500/25"
                    : lessonsCompleted.includes(l.id)
                    ? "bg-emerald-600"
                    : "bg-neutral-800 hover:bg-neutral-700"
                }`}
                title={l.title}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentLessonId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div>
                <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                  {currentLessonId}. {currentLesson.title}
                  {lessonsCompleted.includes(currentLessonId) && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  )}
                </h3>
                <p className="text-xs text-slate-400 font-medium">{currentLesson.subtitle}</p>
              </div>

              <div className="p-4 bg-black/60 border border-neutral-900 rounded-2xl text-sm text-slate-200 leading-relaxed">
                {currentLesson.instructions}
              </div>

              {/* Task/Objective Block */}
              <div className="bg-red-950/20 border border-red-800/30 p-3.5 rounded-2xl flex items-start gap-2.5">
                <Play className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5 fill-red-500/20" />
                <div>
                  <span className="text-[10px] font-black text-red-400 tracking-wider uppercase block">Your Objective:</span>
                  <p className="text-xs text-red-200 font-semibold font-mono mt-0.5">{currentLesson.objective}</p>
                </div>
              </div>

              {/* Hint section */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={() => setShowHint((h) => !h)}
                  className="text-xs font-bold text-slate-400 hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <HelpCircle className="w-4 h-4" />
                  {showHint ? "Hide hand-holding hint" : "Show baby-step hint"}
                </button>
              </div>

              {showHint && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="bg-black border border-neutral-900 p-3 rounded-xl text-xs text-neutral-400 font-medium"
                >
                  💡 <span className="font-bold text-white">Hint:</span> {currentLesson.hint}
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 2. Ask The Google Lady - AI Mentor Q&A Box */}
        <div className="bg-neutral-950 border border-red-950 rounded-3xl flex flex-col overflow-hidden shadow-2xl relative transition-all h-[480px]">
          
          {/* Header */}
          <div className="bg-black px-4 py-3 border-b border-red-950 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <img
                  src={adaTuxAvatar}
                  alt="Ada & Tux Jr."
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full border border-red-800 object-cover shadow-md"
                />
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-sm shadow-red-500 absolute -bottom-0.5 -right-0.5 border border-black" />
              </div>
              <div>
                <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                  Ada ("The Google Lady") & Tux Jr. 🐧
                </h4>
                <span className="text-[10px] text-slate-400 font-medium">AI Lesson Tutor & Cyber Companion</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-rose-400 font-bold bg-red-950 border border-red-800/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span>🐟</span> Model Active
              </span>
            </div>
          </div>

          {/* Chat scrolling log */}
          <div className="flex-grow overflow-y-auto p-3.5 space-y-3 text-xs bg-neutral-950/60">
            {chatLogs.map((chat) => {
              const isUser = chat.role === "user";
              return (
                <div key={chat.id} className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}>
                  {!isUser && (
                    <div className="w-8 h-8 rounded-full bg-neutral-900 border border-red-900/80 overflow-hidden flex-shrink-0 shadow-md">
                      <img
                        src={adaTuxAvatar}
                        alt="Ada & Tux Jr."
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className={`max-w-[85%] space-y-1 ${isUser ? "items-end text-right" : "items-start"}`}>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                      <span>{chat.senderName}</span>
                      {chat.senderBadge && (
                        <span className="px-1.5 py-0.2 rounded bg-neutral-900 border border-neutral-800 text-slate-300 text-[9px]">
                          {chat.senderBadge}
                        </span>
                      )}
                      {chat.timestamp && <span className="text-slate-600 font-normal">{chat.timestamp}</span>}
                    </div>
                    <div
                      className={`p-3 rounded-2xl leading-relaxed font-medium shadow-md ${
                        isUser
                          ? "bg-gradient-to-r from-red-700 to-rose-600 text-white rounded-tr-none font-semibold"
                          : "bg-black/90 text-neutral-200 border border-red-950 rounded-tl-none whitespace-pre-line"
                      }`}
                    >
                      {chat.text}
                    </div>
                  </div>
                  {isUser && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-red-800 to-rose-600 border border-red-700 flex items-center justify-center font-bold text-xs text-white flex-shrink-0 shadow-md">
                      {chat.senderAvatar || "👶"}
                    </div>
                  )}
                </div>
              );
            })}
            {chatLoading && (
              <div className="flex gap-2.5 justify-start items-center text-slate-400">
                <div className="w-7 h-7 rounded-full bg-neutral-900 border border-red-950 flex items-center justify-center flex-shrink-0">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-red-500" />
                </div>
                <p className="italic font-semibold animate-pulse text-red-400">The Google Lady is typing...</p>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Quick interactive helpers */}
          <div className="px-3 py-1.5 bg-black border-t border-red-950 flex gap-2 overflow-x-auto text-[10px] whitespace-nowrap">
            <button
              onClick={() => handleChatSubmit(undefined, "Explain what a directory path is using simple analogies!")}
              className="px-2.5 py-1 bg-neutral-900 hover:bg-red-950/80 text-slate-300 hover:text-white rounded-xl border border-red-950/80 hover:border-red-600 transition-all cursor-pointer"
            >
              📁 Explain paths
            </button>
            <button
              onClick={() => handleChatSubmit(undefined, "Help! I am completely stuck on this lesson objective.")}
              className="px-2.5 py-1 bg-neutral-900 hover:bg-red-950/80 text-slate-300 hover:text-white rounded-xl border border-red-950/80 hover:border-red-600 transition-all cursor-pointer"
            >
              🚨 I'm stuck!
            </button>
            <button
              onClick={() => handleChatSubmit(undefined, "What is the difference between touch and mkdir?")}
              className="px-2.5 py-1 bg-neutral-900 hover:bg-red-950/80 text-rose-300 hover:text-white rounded-xl border border-red-900/80 hover:border-red-600 transition-all cursor-pointer"
            >
              💡 touch vs mkdir
            </button>
          </div>

          {/* Message Input bar */}
          <form onSubmit={handleChatSubmit} className="p-3 bg-black border-t border-red-950 flex items-center gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask The Google Lady about this lesson or any command..."
              className="flex-grow bg-neutral-900 border border-red-950 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-600 transition-all"
            />
            <button
              type="submit"
              disabled={chatLoading || !chatInput.trim()}
              className="px-3.5 py-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 disabled:opacity-40 text-white font-bold rounded-xl shadow-lg shadow-red-600/20 transition-all flex items-center justify-center cursor-pointer flex-shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

      </div>

      {/* 2. Right Side: Interactive Terminal & Filesystem (Columns: 7/12) */}
      <div className="md:col-span-7 space-y-4">
        
        {/* Live File System visualizer layout */}
        <div className="bg-neutral-950 border border-red-950/70 rounded-3xl p-5 shadow-xl">
          <h4 className="text-xs font-black tracking-widest uppercase text-slate-500 mb-3.5 flex items-center justify-between">
            <span>🗄️ CRIB FILESYSTEM EXPLORER MAP</span>
            <button
              onClick={() => {
                setFs(getInitialFS());
                setCurrentPath("/");
                setTerminalLogs((prev) => [
                  ...prev,
                  { type: "success", text: "Sandbox restored to original layout." }
                ]);
              }}
              className="text-[10px] text-red-500 hover:text-red-400 transition-colors flex items-center gap-1 font-bold cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" /> Reset Crib File Structure
            </button>
          </h4>

          {/* Live grid of current path directory children */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {Object.keys(fs)
              .filter((k) => k !== "/")
              .filter((key) => {
                const parent = key.substring(0, key.lastIndexOf("/")) || "/";
                const name = key.substring(key.lastIndexOf("/") + 1);
                if (parent !== currentPath) return false;
                if (name.startsWith(".") && name !== ".pacifier.txt") return false;
                return true;
              })
              .sort((a, b) => {
                const nodeA = fs[a];
                const nodeB = fs[b];
                const nameA = a.substring(a.lastIndexOf("/") + 1);
                const nameB = b.substring(b.lastIndexOf("/") + 1);

                // Directories first
                if (nodeA?.type !== nodeB?.type) {
                  return nodeA?.type === "dir" ? -1 : 1;
                }
                // Alphabetical by file/folder name
                return nameA.localeCompare(nameB);
              })
              .map((key) => {
                const name = key.substring(key.lastIndexOf("/") + 1);
                const node = fs[key];
                const isHidden = name.startsWith(".");

                return (
                  <div
                    key={key}
                    className={`p-3.5 rounded-2xl border flex items-center gap-2.5 shadow-sm transition-all ${
                      isHidden
                        ? "bg-red-950/20 border-red-900/40 text-red-400"
                        : node.type === "dir"
                        ? "bg-black border-red-950 text-red-500"
                        : "bg-black border-neutral-900 text-white"
                    }`}
                  >
                    {node.type === "dir" ? (
                      <Folder className="w-4 h-4 text-red-500 flex-shrink-0" />
                    ) : (
                      <FileText className="w-4 h-4 text-red-400 flex-shrink-0" />
                    )}
                    <div className="overflow-hidden">
                      <span className="text-xs font-bold font-mono truncate block" title={name}>
                        {name}
                      </span>
                      <span className="text-[9px] text-slate-500 font-medium font-mono uppercase">
                        {node.type === "dir" ? "Directory" : "File"}
                        {isHidden && " (Hidden)"}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>

          <p className="text-[10px] text-slate-500 text-center mt-4">
            Creating folders with <code className="text-red-500 font-mono">mkdir</code> or spawning toys with <code className="text-red-400 font-mono">touch</code> adds elements dynamically here!
          </p>
        </div>

        {/* Terminal Sandbox Container */}
        <div
          onClick={focusTerminal}
          className="bg-[#050000] border border-red-950/80 rounded-3xl h-[610px] flex flex-col overflow-hidden shadow-2xl relative cursor-text group"
        >
          {/* Terminal Title Bar */}
          <div className="bg-black px-5 py-3 flex items-center justify-between border-b border-red-950/50 select-none">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>
              <span className="text-xs font-black text-slate-400 font-mono flex items-center gap-1.5 ml-2">
                <TerminalIcon className="w-3.5 h-3.5 text-red-500" /> baby@linux-crib:{currentPath}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 font-bold font-mono">
              [Simulated Sandbox v0.1]
            </div>
          </div>

          {/* Active success splash effect */}
          {successCelebration && (
            <div className="absolute inset-x-0 top-12 bg-red-950/40 border-b border-red-800/30 py-2.5 px-4 text-center text-xs text-red-400 font-extrabold tracking-wide flex items-center justify-center gap-2 z-10 backdrop-blur-sm">
              <Sparkles className="w-4 h-4 animate-spin text-red-500" />
              Lesson completed successfully! Advancing your explorer status...
            </div>
          )}

          {/* Terminal Console Logs Viewport */}
          <div className="flex-grow overflow-y-auto p-5 font-mono text-xs space-y-2.5">
            {terminalLogs.map((log, idx) => (
              <div key={idx} className="leading-relaxed whitespace-pre-wrap">
                {log.type === "cmd" ? (
                  <span className="text-red-400 font-bold">{log.text}</span>
                ) : log.type === "error" ? (
                  <div className="space-y-2 my-1.5">
                    <span className="text-rose-400 font-semibold flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                      <span>{log.text}</span>
                    </span>
                    {log.errorInfo && (
                      <div className="p-3.5 bg-neutral-900/90 border border-rose-900/60 rounded-2xl font-sans text-xs space-y-2 shadow-lg">
                        <div className="flex items-center gap-1.5 text-rose-300 font-black tracking-wide uppercase text-[10px]">
                          <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0" />
                          <span>💡 Baby Error Translator & Fix Guide</span>
                        </div>
                        <p className="text-slate-200 leading-relaxed text-xs">
                          {log.errorInfo.explanation}
                        </p>
                        <div className="pt-1 flex items-center justify-between gap-2 flex-wrap text-xs">
                          <span className="text-emerald-400 font-bold">
                            🔧 Fix: <span className="text-slate-300 font-normal">{log.errorInfo.suggestedFix}</span>
                          </span>
                          {log.errorInfo.fixCommand && (
                            <button
                              onClick={() => {
                                setInputVal(log.errorInfo!.fixCommand!);
                                terminalInputRef.current?.focus();
                              }}
                              className="px-3 py-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold rounded-xl transition-all text-[11px] flex items-center gap-1.5 cursor-pointer shadow-md"
                            >
                              <TerminalIcon className="w-3 h-3" />
                              <span>Fill Fix ({log.errorInfo.fixCommand})</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : log.type === "success" ? (
                  <span className="text-emerald-400 font-bold">{log.text}</span>
                ) : (
                  <span className="text-slate-300">{log.text}</span>
                )}
              </div>
            ))}
            <div ref={terminalBottomRef} />
          </div>

          {/* Terminal Interactive Input Field Prompt */}
          <form
            onSubmit={handleCommandSubmit}
            className="p-4 bg-black border-t border-red-950/40 flex items-center font-mono text-xs gap-1"
          >
            <span className="text-red-500 font-bold select-none">baby@linux-crib:{currentPath}$</span>
            <input
              ref={terminalInputRef}
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={handleInputKeyDown}
              className="flex-grow bg-transparent border-none text-white focus:outline-none caret-red-500 placeholder-neutral-800 min-w-0"
              placeholder="Type command (e.g. ls, pwd)..."
              autoComplete="off"
              autoCapitalize="off"
              spellCheck="false"
            />
          </form>

        </div>

        {/* Level 10 Graduation Diploma Splash */}
        {lessonsCompleted.length === lessons.length && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-8 rounded-3xl bg-gradient-to-br from-red-600/10 via-red-950/5 to-black border-2 border-red-600/50 text-center relative overflow-hidden shadow-2xl"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/40 shadow-lg">
              <Gift className="w-8 h-8 text-red-400" />
            </div>

            <h3 className="text-2xl font-black text-white tracking-tight mb-2">🎓 Baby Linux Graduate!</h3>
            <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed mb-6">
              You've officially graduated from the digital crib! You now understand coordinates (`pwd`), file listing (`ls`), crawling directories (`cd`), secret treasures (`ls -a`), file readings (`cat`), creations, chanting (`echo`), and putaways (`rm`).
            </p>

            <div className="inline-flex items-center gap-2 px-4 py-2 bg-black border border-neutral-900 rounded-2xl font-mono text-xs text-red-400 font-bold">
              <span>Verified Pioneer Certificate:</span>
              <span className="text-white">LNX-CRIB-#{Math.floor(Math.random() * 90000) + 10000}</span>
            </div>
          </motion.div>
        )}

      </div>

      {/* Google Lady Persona & Personal Bio Modal */}
      {/* Command & Lesson Depository Modal */}
      <CommandDepository
        isOpen={isDepositoryOpen}
        onClose={() => setIsDepositoryOpen(false)}
        onSelectLesson={(lessonId, sampleCmd) => {
          setCurrentLessonId(lessonId);
          setShowHint(false);
          if (sampleCmd) {
            setInputVal(sampleCmd);
            terminalInputRef.current?.focus();
          }
        }}
      />

      {/* System Journal & Error Translator Modal */}
      <SystemLogViewer
        isOpen={isLogViewerOpen}
        onClose={() => setIsLogViewerOpen(false)}
        logs={sysLogs}
        onClearLogs={() => setSysLogs([])}
        onRunFixCommand={(fixCmd) => {
          setInputVal(fixCmd);
          terminalInputRef.current?.focus();
        }}
      />

      {/* Sandbox Backup & Restore Manager Modal */}
      <BackupManagerModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        backups={backups}
        onCreateBackup={(name) => createBackupSnapshot(name)}
        onRestoreBackup={(snap) => restoreBackupSnapshot(snap)}
        onDeleteBackup={(id) => deleteBackupSnapshot(id)}
        onImportBackup={(jsonData) => importBackupJSON(jsonData)}
      />
    </div>
  );
}
