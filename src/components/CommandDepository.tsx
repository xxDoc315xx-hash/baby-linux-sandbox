import React, { useState } from "react";
import {
  Search,
  BookOpen,
  Terminal,
  X,
  Code,
  Globe,
  Shield,
  Activity,
  Zap,
  Tag,
  ArrowRight,
  Filter,
  FileText,
  Folder,
  Layers,
  HelpCircle,
  Copy,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface DepositoryItem {
  id: string;
  command: string;
  aliasKeywords: string[];
  category: "Navigation" | "Files" | "Network" | "Search & Edit" | "System" | "Permissions";
  lessonId?: number;
  title: string;
  babyTranslation: string;
  description: string;
  syntax: string;
  examples: string[];
  proTip: string;
}

export const COMMAND_DEPOSITORY: DepositoryItem[] = [
  {
    id: "pwd",
    command: "pwd",
    aliasKeywords: ["path", "location", "where am i", "directory", "crib"],
    category: "Navigation",
    lessonId: 1,
    title: "Print Working Directory",
    babyTranslation: "📍 The GPS Locator for your crib position",
    description: "Prints the full path of the folder you are currently standing inside. Crucial so you never get lost in the file system.",
    syntax: "pwd",
    examples: ["pwd"],
    proTip: "Use `pwd` whenever you feel lost or before creating new files to verify where they will end up."
  },
  {
    id: "ls",
    command: "ls",
    aliasKeywords: ["list", "dir", "files", "toys", "hidden", "see"],
    category: "Navigation",
    lessonId: 2,
    title: "List Directory Contents",
    babyTranslation: "👀 Scan and list all toys in your current room",
    description: "Displays all files and subdirectories inside your current working directory. Adding `-a` reveals secret hidden files (starting with `.`).",
    syntax: "ls [-a] [folder]",
    examples: ["ls", "ls -a", "ls /blocks"],
    proTip: "Files starting with a dot like `.pacifier.txt` are hidden by default! Use `ls -a` to spot them."
  },
  {
    id: "cd",
    command: "cd",
    aliasKeywords: ["crawl", "change directory", "folder", "enter", "move", "go to"],
    category: "Navigation",
    lessonId: 3,
    title: "Change Directory",
    babyTranslation: "👶 Crawl into another room or go back home",
    description: "Moves your terminal session into a target folder. Use `cd ..` to step back up one folder level, or `cd /` to jump straight to the root crib.",
    syntax: "cd <folder_path>",
    examples: ["cd blocks", "cd ..", "cd /"],
    proTip: "`cd` without any arguments takes you back to your user home directory instantly!"
  },
  {
    id: "cat",
    command: "cat",
    aliasKeywords: ["read", "view", "display", "file content", "suck data"],
    category: "Files",
    lessonId: 5,
    title: "Concatenate & Read File",
    babyTranslation: "📖 Suck text and secrets out of a file to read it",
    description: "Short for concatenate. Reads the entire contents of a plain text file and prints it directly into your terminal console.",
    syntax: "cat <filename>",
    examples: ["cat teddy_bear.txt", "cat .pacifier.txt"],
    proTip: "For massive files, Linux users also use tools like `less` or `head`, but `cat` is perfect for quick reads!"
  },
  {
    id: "mkdir",
    command: "mkdir",
    aliasKeywords: ["folder", "create folder", "make directory", "weave room"],
    category: "Files",
    lessonId: 6,
    title: "Make Directory",
    babyTranslation: "🧱 Weave a brand new empty toy box or room",
    description: "Creates a new folder at the specified path. Keeps your files tidy and organized.",
    syntax: "mkdir <folder_name>",
    examples: ["mkdir blanket", "mkdir /blocks/lego"],
    proTip: "Use `mkdir -p path/to/deep/folder` in Linux to create parent folders and subfolders all at once!"
  },
  {
    id: "touch",
    command: "touch",
    aliasKeywords: ["spawn", "create file", "new file", "make file"],
    category: "Files",
    lessonId: 7,
    title: "Spawn / Touch File",
    babyTranslation: "🪄 Spawn a new empty toy file out of thin air",
    description: "Instantly creates a new empty file if it doesn't exist, or updates its timestamp if it already exists.",
    syntax: "touch <filename>",
    examples: ["touch rattle.txt", "touch blanket/rattle.txt"],
    proTip: "You can spawn multiple files at once by listing them: `touch toy1.txt toy2.txt toy3.txt`."
  },
  {
    id: "echo",
    command: "echo",
    aliasKeywords: ["write", "print", "redirect", "chant", "add text"],
    category: "Files",
    lessonId: 8,
    title: "Echo Text & File Redirection",
    babyTranslation: "🗣️ Chant text or record words straight into a file",
    description: "Prints text to the screen. Paired with `>` (overwriting redirection) or `>>` (appending redirection), it writes text into files.",
    syntax: "echo \"text\" [> filename]",
    examples: ["echo \"rattle rattle\" > rattle.txt", "echo \"Hello World!\""],
    proTip: "Use `>` to replace a file's content completely, or `>>` to add lines at the bottom without erasing!"
  },
  {
    id: "rm",
    command: "rm",
    aliasKeywords: ["delete", "remove", "clean", "put away", "erase"],
    category: "Files",
    lessonId: 9,
    title: "Remove File",
    babyTranslation: "🧹 Put a toy away or permanently erase a file",
    description: "Deletes specified files from the file system. Careful! Linux doesn't have a recycle bin by default — once removed, it's gone!",
    syntax: "rm <filename>",
    examples: ["rm teddy_bear.txt"],
    proTip: "To remove an empty folder, use `rmdir`. To recursively delete a directory and all inside, Linux uses `rm -r`."
  },
  {
    id: "fetch",
    command: "curl / fetch",
    aliasKeywords: ["fetch", "curl", "web", "http", "download", "api", "internet", "get"],
    category: "Network",
    lessonId: 11,
    title: "Fetch Remote Web Toy",
    babyTranslation: "🌐 Reach out to the internet to grab data or milk config",
    description: "Fetches data from remote web servers or APIs right from your terminal. Equivalent to `curl` or JavaScript `fetch()`.",
    syntax: "fetch <url>  OR  curl <url>",
    examples: ["fetch https://api.babylinux.org/milk", "curl https://api.babylinux.org/quote"],
    proTip: "`curl` stands for Client URL. It's the Swiss Army knife for testing web services and downloading data!"
  },
  {
    id: "grep",
    command: "grep",
    aliasKeywords: ["search", "find text", "magnifying glass", "filter", "lookup"],
    category: "Search & Edit",
    lessonId: 12,
    title: "Magnifying Glass Search",
    babyTranslation: "🔍 Search through files to spot specific words instantly",
    description: "Global Regular Expression Print. Searches files or command outputs for matching lines containing your target word.",
    syntax: "grep <search_term> <filename>",
    examples: ["grep Milk baby_bottle.conf", "grep -i warm baby_bottle.conf"],
    proTip: "Adding `-i` makes search case-insensitive, so 'milk' matches 'MILK', 'Milk', and 'mIlK'."
  },
  {
    id: "chmod",
    command: "chmod",
    aliasKeywords: ["permissions", "lock", "security", "access", "executable", "allow"],
    category: "Permissions",
    lessonId: 13,
    title: "Change File Permissions",
    babyTranslation: "🔒 Put a safety lock or give permission to play with a file",
    description: "Modifies access permissions (Read, Write, Execute) for owner, group, and others on Linux files.",
    syntax: "chmod <permissions> <filename>",
    examples: ["chmod +x play.sh", "chmod 755 baby_bottle.conf"],
    proTip: "`+x` turns a file into an executable program so you can run it with `./script.sh`!"
  },
  {
    id: "ps",
    command: "ps / top",
    aliasKeywords: ["processes", "tasks", "energy", "monitor", "cpu", "running"],
    category: "System",
    lessonId: 14,
    title: "Process & Energy Monitor",
    babyTranslation: "⚡ Check active background tasks and crib energy usage",
    description: "Displays currently running processes, process IDs (PIDs), and resource consumption in your Linux system.",
    syntax: "ps  OR  top",
    examples: ["ps", "ps aux"],
    proTip: "`ps` gives a quick snapshot, while `top` gives a live updating dashboard of all active system processes!"
  },
  {
    id: "alias",
    command: "alias",
    aliasKeywords: ["shortcut", "nickname", "custom command", "abbreviation"],
    category: "System",
    lessonId: 15,
    title: "Create Command Shortcuts",
    babyTranslation: "🏷️ Give your favorite commands cute short nicknames",
    description: "Allows you to create custom shortcut names for long or frequently used command sequences.",
    syntax: "alias <nickname>='<full_command>'",
    examples: ["alias scan='ls -a'", "alias crib='cd /'"],
    proTip: "Save your aliases in your `~/.bashrc` file so your shortcuts stay forever every time you log in!"
  },
  {
    id: "nano",
    command: "nano",
    aliasKeywords: ["edit", "text editor", "notebook", "write code", "modify"],
    category: "Search & Edit",
    lessonId: 16,
    title: "Baby Notebook Editor",
    babyTranslation: "📝 Open a cozy text notebook to write multiline notes",
    description: "A friendly, beginner-accessible terminal text editor. Allows full line editing without complex mode switching.",
    syntax: "nano <filename>",
    examples: ["nano diary.txt", "nano baby_bottle.conf"],
    proTip: "In `nano`, press Ctrl+O to save (WriteOut) and Ctrl+X to safely exit back to your terminal!"
  },
  {
    id: "pipe",
    command: "pipe (|)",
    aliasKeywords: ["pipeline", "chain", "connect", "combine", "stream"],
    category: "Search & Edit",
    lessonId: 17,
    title: "Connecting Water Pipes",
    babyTranslation: "🚰 Stream output from one command right into another",
    description: "The pipe character `|` connects the output of one command directly into the input of the next command.",
    syntax: "command1 | command2",
    examples: ["cat baby_bottle.conf | grep STATUS", "ls | grep txt"],
    proTip: "Pipes embody the Linux philosophy: combine simple tools together to achieve powerful, complex magic!"
  },
  {
    id: "cp",
    command: "cp",
    aliasKeywords: ["copy", "duplicate", "clone", "backup"],
    category: "Files",
    lessonId: 18,
    title: "Copy / Duplicate Toy",
    babyTranslation: "👯 Make an exact twin copy of any file or toy",
    description: "Copies files or directories from a source location to a target location.",
    syntax: "cp <source_file> <target_file>",
    examples: ["cp teddy_bear.txt teddy_backup.txt", "cp -r /blocks /blocks_backup"],
    proTip: "Use `cp -r` to copy an entire directory and all its nested files!"
  },
  {
    id: "mv",
    command: "mv",
    aliasKeywords: ["move", "rename", "relocate", "transfer"],
    category: "Files",
    lessonId: 19,
    title: "Move & Rename Toy",
    babyTranslation: "🚚 Move a toy to another folder or rename it",
    description: "Moves files between folders or renames them if staying in the same folder.",
    syntax: "mv <source> <destination>",
    examples: ["mv blue_block.txt cyan_block.txt", "mv rattle.txt /blocks/"],
    proTip: "In Linux, renaming a file is simply moving it to a new name in the exact same directory!"
  },
  {
    id: "man",
    command: "man / tldr",
    aliasKeywords: ["manual", "help", "guide", "documentation", "info", "instructions"],
    category: "System",
    lessonId: 20,
    title: "Big Instruction Manual",
    babyTranslation: "📖 Open the official instruction handbook for any command",
    description: "Displays the system manual pages for any installed Linux command, detailing flags and usage.",
    syntax: "man <command>",
    examples: ["man ls", "man grep"],
    proTip: "Press `q` to quit the manual view and return to your terminal prompt!"
  }
];

interface CommandDepositoryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLesson: (lessonId: number, sampleCommand?: string) => void;
}

export default function CommandDepository({ isOpen, onClose, onSelectLesson }: CommandDepositoryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const categories = ["All", "Navigation", "Files", "Network", "Search & Edit", "System", "Permissions"];

  const filteredItems = COMMAND_DEPOSITORY.filter((item) => {
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    const query = searchQuery.toLowerCase().trim();
    if (!query) return matchesCategory;

    const matchesName = item.command.toLowerCase().includes(query);
    const matchesTitle = item.title.toLowerCase().includes(query);
    const matchesDesc = item.description.toLowerCase().includes(query);
    const matchesTranslation = item.babyTranslation.toLowerCase().includes(query);
    const matchesKeywords = item.aliasKeywords.some((k) => k.toLowerCase().includes(query));

    return matchesCategory && (matchesName || matchesTitle || matchesDesc || matchesTranslation || matchesKeywords);
  });

  const handleCopySyntax = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-neutral-950 border border-red-900/60 rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative text-white"
        >
          {/* Header Bar */}
          <div className="bg-black px-6 py-5 border-b border-red-950 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-700 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-red-600/30">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
                  📚 Command & Lesson Depository
                </h2>
                <p className="text-xs text-slate-400 font-medium">
                  Search any Linux command, keyword, or concept to see baby explanations, syntax, and lesson links.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2.5 rounded-2xl bg-neutral-900 hover:bg-red-950 text-slate-400 hover:text-white border border-red-950 transition-all cursor-pointer flex-shrink-0"
              title="Close Depository"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search & Category Filter Section */}
          <div className="p-6 bg-black/60 border-b border-red-950/80 space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-5 h-5 absolute left-4 top-3.5 text-red-500 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search commands, topics, or keywords (e.g. 'fetch', 'grep', 'permissions', 'delete', 'curl')..."
                className="w-full bg-neutral-900 border border-red-900/50 rounded-2xl pl-12 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-3.5 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Category Badges */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1 mr-1 flex-shrink-0">
                <Filter className="w-3 h-3" /> Filter:
              </span>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                    selectedCategory === cat
                      ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-600/30"
                      : "bg-neutral-900 text-slate-400 hover:text-white hover:bg-neutral-850 border border-neutral-850"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Grid Content List */}
          <div className="flex-grow overflow-y-auto p-6 space-y-4 bg-neutral-950/80">
            {filteredItems.length === 0 ? (
              <div className="text-center py-16 px-4 space-y-3">
                <div className="w-12 h-12 rounded-full bg-neutral-900 border border-red-950 flex items-center justify-center mx-auto text-red-500">
                  <HelpCircle className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-white">No matching commands or lessons found</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Try searching for terms like <code className="text-red-400">fetch</code>, <code className="text-red-400">cat</code>, <code className="text-red-400">permissions</code>, <code className="text-red-400">list</code>, or reset the filter.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("All");
                  }}
                  className="px-4 py-2 bg-neutral-900 hover:bg-red-950 text-red-400 hover:text-white text-xs font-bold rounded-xl border border-red-950 transition-all cursor-pointer"
                >
                  Reset Search Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-black/90 border border-neutral-900 hover:border-red-900/60 rounded-2xl p-5 flex flex-col justify-between transition-all group shadow-lg"
                  >
                    <div className="space-y-3">
                      {/* Top Bar: Command & Category */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-black font-mono text-red-400 bg-red-950/40 px-2.5 py-1 rounded-lg border border-red-900/40">
                            {item.command}
                          </code>
                          <span className="text-[10px] font-extrabold uppercase text-slate-400 bg-neutral-900 px-2 py-0.5 rounded-md border border-neutral-800">
                            {item.category}
                          </span>
                        </div>

                        {item.lessonId && (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-md">
                            Lesson #{item.lessonId}
                          </span>
                        )}
                      </div>

                      {/* Title & Baby Translation */}
                      <div>
                        <h3 className="text-base font-extrabold text-white group-hover:text-red-400 transition-colors">
                          {item.title}
                        </h3>
                        <p className="text-xs font-bold text-slate-300 mt-1">
                          {item.babyTranslation}
                        </p>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-slate-400 leading-relaxed font-normal">
                        {item.description}
                      </p>

                      {/* Syntax Box */}
                      <div className="bg-neutral-900/90 border border-neutral-850 p-3 rounded-xl font-mono text-xs text-slate-200 relative group/code flex items-center justify-between">
                        <div className="overflow-x-auto pr-2">
                          <span className="text-red-500 font-bold select-none mr-2">$</span>
                          <span>{item.syntax}</span>
                        </div>
                        <button
                          onClick={() => handleCopySyntax(item.id, item.syntax)}
                          className="text-slate-500 hover:text-white p-1 rounded transition-colors flex-shrink-0"
                          title="Copy command syntax"
                        >
                          {copiedId === item.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {/* Pro Tip */}
                      <div className="p-2.5 bg-red-950/20 border border-red-900/30 rounded-xl text-[11px] text-red-200/90 leading-snug">
                        💡 <strong className="text-red-400">Pro Tip:</strong> {item.proTip}
                      </div>
                    </div>

                    {/* Bottom Action Button */}
                    <div className="pt-4 mt-4 border-t border-neutral-900 flex items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-1">
                        {item.aliasKeywords.slice(0, 3).map((kw) => (
                          <span key={kw} className="text-[9px] font-mono text-slate-500 bg-neutral-900 px-1.5 py-0.5 rounded">
                            #{kw}
                          </span>
                        ))}
                      </div>

                      {item.lessonId && (
                        <button
                          onClick={() => {
                            onSelectLesson(item.lessonId!, item.examples[0]);
                            onClose();
                          }}
                          className="px-3 py-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-bold rounded-xl shadow-md shadow-red-600/20 transition-all flex items-center gap-1.5 cursor-pointer flex-shrink-0"
                        >
                          <span>Go to Lesson #{item.lessonId}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="bg-black px-6 py-4 border-t border-red-950 flex items-center justify-between text-xs text-slate-400">
            <span>Showing {filteredItems.length} of {COMMAND_DEPOSITORY.length} Depository Commands</span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl border border-neutral-800 font-bold transition-all cursor-pointer"
            >
              Back to Sandbox
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
