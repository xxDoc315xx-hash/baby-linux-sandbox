import React, { useState } from "react";
import {
  FileText,
  X,
  AlertTriangle,
  CheckCircle,
  Info,
  Terminal,
  Search,
  Trash2,
  Copy,
  Check,
  ShieldAlert,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface LogEntry {
  id: string;
  timestamp: string;
  level: "INFO" | "SUCCESS" | "ERROR" | "WARNING";
  command?: string;
  rawMessage: string;
  babyExplanation: string;
  suggestedFix?: string;
  fixCommand?: string;
}

interface SystemLogViewerProps {
  isOpen: boolean;
  onClose: () => void;
  logs: LogEntry[];
  onClearLogs: () => void;
  onRunFixCommand?: (cmd: string) => void;
}

export default function SystemLogViewer({
  isOpen,
  onClose,
  logs,
  onClearLogs,
  onRunFixCommand
}: SystemLogViewerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLevel, setFilterLevel] = useState<string>("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredLogs = logs.filter((log) => {
    const matchesLevel = filterLevel === "ALL" || log.level === filterLevel;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesLevel;

    const matchesRaw = log.rawMessage.toLowerCase().includes(q);
    const matchesExp = log.babyExplanation.toLowerCase().includes(q);
    const matchesCmd = log.command?.toLowerCase().includes(q);

    return matchesLevel && (matchesRaw || matchesExp || matchesCmd);
  });

  const handleCopy = (id: string, text: string) => {
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
          className="bg-neutral-950 border border-red-900/60 rounded-3xl w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden shadow-2xl relative text-white"
        >
          {/* Header Bar */}
          <div className="bg-black px-6 py-5 border-b border-red-950 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-700 to-red-600 flex items-center justify-center text-white shadow-lg shadow-red-600/30">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
                  📜 System Journal & Error Translator
                </h2>
                <p className="text-xs text-slate-400 font-medium">
                  Real-time system events, crash reports, and plain-English translations for every Linux error!
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2.5 rounded-2xl bg-neutral-900 hover:bg-red-950 text-slate-400 hover:text-white border border-red-950 transition-all cursor-pointer flex-shrink-0"
              title="Close System Logs"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div className="p-5 bg-black/60 border-b border-red-950/80 flex flex-col sm:flex-row items-center gap-3 justify-between">
            {/* Search Input */}
            <div className="relative w-full sm:w-auto flex-grow max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-red-500 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search system logs (e.g. 'error', 'cat', 'file not found')..."
                className="w-full bg-neutral-900 border border-red-900/50 rounded-xl pl-10 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-all shadow-inner"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto text-xs">
              {["ALL", "ERROR", "SUCCESS", "INFO"].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setFilterLevel(lvl)}
                  className={`px-3 py-1.5 rounded-xl font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                    filterLevel === lvl
                      ? lvl === "ERROR"
                        ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                        : lvl === "SUCCESS"
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                        : "bg-red-600 text-white shadow-md shadow-red-600/30"
                      : "bg-neutral-900 text-slate-400 hover:text-white border border-neutral-850"
                  }`}
                >
                  {lvl}
                </button>
              ))}

              <button
                onClick={onClearLogs}
                className="p-2 bg-neutral-900 hover:bg-rose-950 text-slate-400 hover:text-rose-300 rounded-xl border border-neutral-850 hover:border-rose-900 transition-all cursor-pointer ml-auto"
                title="Clear Log History"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Log Stream Content */}
          <div className="flex-grow overflow-y-auto p-5 space-y-3 font-mono text-xs bg-neutral-950/90">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-16 text-slate-500 space-y-2">
                <ShieldAlert className="w-10 h-10 mx-auto text-slate-600" />
                <p className="font-bold">No system log entries found matching your search.</p>
                <p className="text-[11px]">Type commands in the terminal to generate real-time system events!</p>
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-4 rounded-2xl border transition-all space-y-2.5 ${
                    log.level === "ERROR"
                      ? "bg-rose-950/20 border-rose-900/60 text-rose-200"
                      : log.level === "SUCCESS"
                      ? "bg-emerald-950/20 border-emerald-900/50 text-emerald-200"
                      : "bg-neutral-900/80 border-neutral-850 text-slate-300"
                  }`}
                >
                  {/* Top Bar */}
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500">{log.timestamp}</span>
                      <span
                        className={`px-2 py-0.5 rounded-md font-black text-[9px] uppercase tracking-wider ${
                          log.level === "ERROR"
                            ? "bg-rose-950 text-rose-400 border border-rose-900"
                            : log.level === "SUCCESS"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-900"
                            : "bg-neutral-800 text-slate-400"
                        }`}
                      >
                        {log.level}
                      </span>
                      {log.command && (
                        <code className="text-red-400 font-bold bg-black/60 px-2 py-0.5 rounded border border-neutral-800">
                          $ {log.command}
                        </code>
                      )}
                    </div>

                    <button
                      onClick={() => handleCopy(log.id, `${log.rawMessage}\n${log.babyExplanation}`)}
                      className="text-slate-500 hover:text-white p-1 rounded transition-colors"
                      title="Copy log entry"
                    >
                      {copiedId === log.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Raw Message */}
                  <div className="font-bold text-xs flex items-start gap-2">
                    {log.level === "ERROR" ? (
                      <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                    ) : log.level === "SUCCESS" ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <Info className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
                    )}
                    <span className="select-all">{log.rawMessage}</span>
                  </div>

                  {/* Baby Explanation */}
                  <div className="p-3 bg-black/80 rounded-xl border border-neutral-900 font-sans text-xs text-slate-200 leading-relaxed">
                    💡 <strong className="text-red-400">Baby Linux Plain-English Translation:</strong>{" "}
                    {log.babyExplanation}
                  </div>

                  {/* Suggested Fix Action */}
                  {log.suggestedFix && (
                    <div className="p-3 bg-red-950/40 rounded-xl border border-red-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-sans">
                      <div>
                        <strong className="text-emerald-400 font-bold">🔧 How to Fix:</strong>{" "}
                        <span className="text-slate-300">{log.suggestedFix}</span>
                      </div>

                      {log.fixCommand && onRunFixCommand && (
                        <button
                          onClick={() => {
                            onRunFixCommand(log.fixCommand!);
                            onClose();
                          }}
                          className="px-3 py-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
                        >
                          <Terminal className="w-3.5 h-3.5" />
                          <span>Run Fix ({log.fixCommand})</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer Bar */}
          <div className="bg-black px-6 py-4 border-t border-red-950 flex items-center justify-between text-xs text-slate-400">
            <span>Showing {filteredLogs.length} of {logs.length} Log Entries</span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl border border-neutral-800 font-bold transition-all cursor-pointer"
            >
              Close Journal
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
