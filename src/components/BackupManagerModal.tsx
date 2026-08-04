import React, { useState } from "react";
import {
  Save,
  RotateCcw,
  Download,
  Upload,
  Trash2,
  X,
  Database,
  CheckCircle2,
  Clock,
  Sparkles,
  FileJson,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface BackupSnapshot {
  id: string;
  name: string;
  timestamp: string;
  fs: any;
  currentLessonId: number;
  lessonsCompleted: number[];
  commandHistory: string[];
  itemCount: number;
}

interface BackupManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  backups: BackupSnapshot[];
  onCreateBackup: (name?: string) => void;
  onRestoreBackup: (snapshot: BackupSnapshot) => void;
  onDeleteBackup: (id: string) => void;
  onImportBackup: (jsonData: string) => boolean;
}

export default function BackupManagerModal({
  isOpen,
  onClose,
  backups,
  onCreateBackup,
  onRestoreBackup,
  onDeleteBackup,
  onImportBackup
}: BackupManagerModalProps) {
  const [newBackupName, setNewBackupName] = useState("");
  const [restoredId, setRestoredId] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateBackup(newBackupName.trim() || undefined);
    setNewBackupName("");
  };

  const handleRestore = (snapshot: BackupSnapshot) => {
    onRestoreBackup(snapshot);
    setRestoredId(snapshot.id);
    setTimeout(() => setRestoredId(null), 3000);
  };

  const handleDownload = (snapshot: BackupSnapshot) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(snapshot, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `baby_linux_backup_${snapshot.name.replace(/\s+/g, "_")}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    setImportSuccess(false);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const ok = onImportBackup(content);
        if (ok) {
          setImportSuccess(true);
          setTimeout(() => setImportSuccess(false), 3000);
        } else {
          setImportError("Invalid backup JSON format. Please upload a valid Baby Linux backup file.");
        }
      } catch (err) {
        setImportError("Could not parse JSON backup file.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-neutral-950 border border-red-950 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl relative"
        >
          {/* Header */}
          <div className="bg-black px-6 py-4 border-b border-red-950 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-900 to-rose-700 flex items-center justify-center border border-red-800 shadow-md">
                <Database className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                  💾 Sandbox Backup & Restore Center
                </h2>
                <p className="text-xs text-slate-400">
                  Save full snapshots of your files, terminal history, and lesson progress!
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-neutral-900 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300">
            {/* 1. Quick Backup Form */}
            <div className="p-4 bg-neutral-900/80 border border-red-950 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white flex items-center gap-1.5 text-sm">
                  <Sparkles className="w-4 h-4 text-red-400" /> Create New Snapshot
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Saves to Browser Storage & JSON
                </span>
              </div>
              <form onSubmit={handleCreate} className="flex items-center gap-2">
                <input
                  type="text"
                  value={newBackupName}
                  onChange={(e) => setNewBackupName(e.target.value)}
                  placeholder="Snapshot label (e.g. Before Level 5, My Workspace...)"
                  className="flex-grow bg-black border border-neutral-800 focus:border-red-600 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition-all"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white font-bold rounded-xl shadow-lg transition-all flex items-center gap-1.5 cursor-pointer flex-shrink-0"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Backup</span>
                </button>
              </form>
            </div>

            {/* 2. Import External Backup */}
            <div className="p-4 bg-black border border-neutral-900 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200 flex items-center gap-1.5 text-xs">
                  <Upload className="w-4 h-4 text-rose-400" /> Import External Backup JSON File
                </span>
              </div>
              <div className="flex items-center gap-3">
                <label className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-white font-bold rounded-xl cursor-pointer transition-all flex items-center gap-2">
                  <FileJson className="w-4 h-4 text-red-400" />
                  <span>Browse .json File</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                {importSuccess && (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Backup imported & restored successfully!
                  </span>
                )}
                {importError && (
                  <span className="text-rose-400 font-bold flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> {importError}
                  </span>
                )}
              </div>
            </div>

            {/* 3. Saved Backups List */}
            <div className="space-y-3">
              <h3 className="font-extrabold text-white text-sm flex items-center justify-between">
                <span>Saved Snapshots ({backups.length})</span>
                {restoredId && (
                  <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 animate-pulse">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Snapshot Restored!
                  </span>
                )}
              </h3>

              {backups.length === 0 ? (
                <div className="p-8 text-center bg-black/50 border border-neutral-900 rounded-2xl text-slate-500">
                  <Database className="w-8 h-8 mx-auto mb-2 opacity-40 text-red-500" />
                  <p className="font-medium">No backups saved yet!</p>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Click "Save Backup" above or type <code className="text-red-400 font-mono">backup</code> in the terminal to freeze your progress.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {backups.map((snap) => (
                    <div
                      key={snap.id}
                      className="p-3.5 bg-neutral-900/90 border border-red-950/80 rounded-2xl flex items-center justify-between gap-4 hover:border-red-800/80 transition-all shadow-md"
                    >
                      <div className="space-y-1 overflow-hidden">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs truncate font-mono">
                            {snap.name}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-red-950 border border-red-900/60 text-[9px] text-rose-300 font-bold">
                            Lesson {snap.currentLessonId}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" /> {snap.timestamp}
                          </span>
                          <span>{snap.itemCount || Object.keys(snap.fs || {}).length} item(s)</span>
                          <span>{snap.lessonsCompleted?.length || 0} completed</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => handleRestore(snap)}
                          className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold rounded-xl transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                          title="Restore this snapshot into terminal"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restore</span>
                        </button>
                        <button
                          onClick={() => handleDownload(snap)}
                          className="p-1.5 bg-black hover:bg-neutral-800 border border-neutral-800 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer"
                          title="Download .json backup"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteBackup(snap.id)}
                          className="p-1.5 bg-black hover:bg-rose-950 border border-rose-950 text-rose-400 hover:text-rose-200 rounded-xl transition-all cursor-pointer"
                          title="Delete snapshot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-black px-6 py-3 border-t border-red-950 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>Terminal Commands: <code className="text-red-400">backup [name]</code> | <code className="text-red-400">restore [name]</code></span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-slate-300 hover:text-white font-bold rounded-xl transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
