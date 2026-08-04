import React, { useState } from 'react';
import { DMConversation, UserAccount } from '../types';
import SvgAvatar from './SvgAvatar';
import { 
  MessageSquare, 
  Search, 
  Trash2, 
  ExternalLink, 
  X, 
  CheckSquare, 
  Square, 
  AlertTriangle, 
  Clock, 
  RefreshCw,
  Filter,
  UserCheck
} from 'lucide-react';

interface DMManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  dms: DMConversation[];
  usersList: UserAccount[];
  activeChannelId: string;
  onSelectDM: (dmId: string) => void;
  onDeleteDM: (dmId: string, deleteMessages?: boolean) => Promise<void>;
  onClearMessages: (dmId: string) => Promise<void>;
  onBulkDeleteDMs: (dmIds: string[]) => Promise<void>;
}

export const DMManagerModal: React.FC<DMManagerModalProps> = ({
  isOpen,
  onClose,
  dms,
  usersList,
  activeChannelId,
  onSelectDM,
  onDeleteDM,
  onClearMessages,
  onBulkDeleteDMs
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'with_messages' | 'empty'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  // Filter DMs
  const filteredDms = dms.filter((dm) => {
    const matchesSearch = 
      dm.otherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (dm.otherEmail && dm.otherEmail.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (dm.lastMessage && dm.lastMessage.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterType === 'with_messages') {
      return Boolean(dm.lastMessage && dm.lastMessage.trim().length > 0);
    }
    if (filterType === 'empty') {
      return !dm.lastMessage || dm.lastMessage.trim().length === 0;
    }
    return true;
  });

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => 
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredDms.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredDms.map((d) => d.id));
    }
  };

  const handleDeleteSingle = async (dmId: string) => {
    setIsProcessing(true);
    try {
      await onDeleteDM(dmId, true);
      setConfirmDeleteId(null);
      setSelectedIds((prev) => prev.filter((id) => id !== dmId));
    } catch (err) {
      console.error('Failed to delete DM:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearSingle = async (dmId: string) => {
    setIsProcessing(true);
    try {
      await onClearMessages(dmId);
    } catch (err) {
      console.error('Failed to clear DM messages:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsProcessing(true);
    try {
      await onBulkDeleteDMs(selectedIds);
      setSelectedIds([]);
      setConfirmBulkDelete(false);
    } catch (err) {
      console.error('Failed bulk delete DMs:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (updatedAt: any) => {
    if (!updatedAt) return 'No activity';
    try {
      const date = updatedAt.toDate ? updatedAt.toDate() : new Date(updatedAt.seconds ? updatedAt.seconds * 1000 : updatedAt);
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return 'Recent';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-neutral-950 border border-red-950 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-black/90 border-b border-red-950 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-800 to-red-600 flex items-center justify-center shadow-lg shadow-rose-900/30">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-wide flex items-center gap-2">
                Direct Messages Chat Log
              </h2>
              <p className="text-xs text-slate-400">
                Organize, search, keep or delete direct message conversation threads.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-900 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Filter Bar */}
        <div className="p-4 bg-neutral-900/60 border-b border-red-950/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-grow max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by user name, email, or message text..."
              className="w-full bg-neutral-950 border border-red-950 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-600"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-white text-xs"
              >
                Clear
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-neutral-950 p-1 border border-red-950 rounded-xl">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterType === 'all'
                  ? 'bg-red-950 text-white border border-red-800'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({dms.length})
            </button>
            <button
              onClick={() => setFilterType('with_messages')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterType === 'with_messages'
                  ? 'bg-red-950 text-white border border-red-800'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Active Messages
            </button>
            <button
              onClick={() => setFilterType('empty')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterType === 'empty'
                  ? 'bg-red-950 text-white border border-red-800'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Empty
            </button>
          </div>

          {/* Bulk Action Controls */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 animate-fadeIn">
              <button
                onClick={() => setConfirmBulkDelete(true)}
                disabled={isProcessing}
                className="px-3 py-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-xs font-black text-white rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Selected ({selectedIds.length})
              </button>
            </div>
          )}
        </div>

        {/* DM Table */}
        <div className="flex-grow overflow-x-auto overflow-y-auto p-4">
          {filteredDms.length === 0 ? (
            <div className="py-16 text-center bg-neutral-900/30 border border-red-950/40 rounded-2xl">
              <MessageSquare className="w-10 h-10 text-slate-600 mx-auto mb-2 opacity-50" />
              <h4 className="text-sm font-bold text-slate-300">No Direct Messages Found</h4>
              <p className="text-xs text-slate-500 mt-1">
                {searchTerm ? 'No conversations match your search criteria.' : 'You have no direct message conversations yet.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-red-950 text-[11px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="p-3 w-10 text-center">
                    <button
                      onClick={toggleSelectAll}
                      className="text-slate-400 hover:text-white cursor-pointer"
                      title="Select / Deselect All"
                    >
                      {selectedIds.length === filteredDms.length ? (
                        <CheckSquare className="w-4 h-4 text-red-500" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="p-3">User / Contact</th>
                  <th className="p-3">Last Message</th>
                  <th className="p-3">Last Activity</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-950/40 text-xs">
                {filteredDms.map((dm) => {
                  const isSelected = selectedIds.includes(dm.id);
                  const isCurrentActive = activeChannelId === dm.id;

                  return (
                    <tr 
                      key={dm.id}
                      className={`group hover:bg-neutral-900/60 transition-colors ${
                        isSelected ? 'bg-red-950/20' : ''
                      } ${isCurrentActive ? 'border-l-2 border-l-red-500' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="p-3 text-center">
                        <button
                          onClick={() => toggleSelect(dm.id)}
                          className="text-slate-500 hover:text-white cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-red-500" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* User Info */}
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          {dm.otherAvatarStyle ? (
                            <SvgAvatar style={dm.otherAvatarStyle} name={dm.otherName} size={32} />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-red-900 flex items-center justify-center font-extrabold text-white text-xs">
                              {dm.otherName ? dm.otherName[0].toUpperCase() : 'U'}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>{dm.otherName}</span>
                              {dm.otherRole && (
                                <span className="px-1.5 py-0.2 rounded bg-neutral-800 border border-neutral-700 text-[10px] text-slate-400 font-medium">
                                  {dm.otherRole}
                                </span>
                              )}
                            </div>
                            {dm.otherEmail && (
                              <div className="text-[10px] text-slate-500">{dm.otherEmail}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Last Message */}
                      <td className="p-3 max-w-xs">
                        {dm.lastMessage ? (
                          <div className="text-slate-300 truncate font-mono text-[11px]">
                            "{dm.lastMessage}"
                          </div>
                        ) : (
                          <span className="text-slate-600 italic text-[11px]">No messages sent</span>
                        )}
                      </td>

                      {/* Last Activity */}
                      <td className="p-3 text-slate-400 text-[11px] whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{formatDate(dm.updatedAt)}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Open Chat */}
                          <button
                            onClick={() => {
                              onSelectDM(dm.id);
                              onClose();
                            }}
                            className="px-2.5 py-1.5 bg-neutral-900 hover:bg-red-950 text-slate-200 hover:text-white border border-red-950 hover:border-red-600 rounded-xl transition-all text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                            title="Open direct message"
                          >
                            <ExternalLink className="w-3 h-3 text-rose-400" />
                            Open Chat
                          </button>

                          {/* Clear History */}
                          <button
                            onClick={() => handleClearSingle(dm.id)}
                            disabled={isProcessing || !dm.lastMessage}
                            className="p-1.5 bg-neutral-900 hover:bg-amber-950/60 text-slate-400 hover:text-amber-400 border border-neutral-800 hover:border-amber-700 rounded-xl transition-all cursor-pointer disabled:opacity-30"
                            title="Clear message history only (keep contact)"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete DM Conversation */}
                          <button
                            onClick={() => setConfirmDeleteId(dm.id)}
                            disabled={isProcessing}
                            className="p-1.5 bg-neutral-900 hover:bg-red-950 text-slate-400 hover:text-red-400 border border-neutral-800 hover:border-red-700 rounded-xl transition-all cursor-pointer"
                            title="Delete entire DM conversation"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Info & Statistics */}
        <div className="p-4 bg-black/90 border-t border-red-950 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Showing {filteredDms.length} of {dms.length} conversations</span>
          </div>
          <div className="text-[11px] text-slate-500">
            Deleting a conversation removes the direct link and thread history permanently from Firestore.
          </div>
        </div>

      </div>

      {/* Confirmation Dialog for Single Delete */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-red-900 rounded-3xl max-w-sm w-full p-6 text-white shadow-2xl">
            <div className="w-10 h-10 rounded-2xl bg-red-950 border border-red-800 flex items-center justify-center mb-3 text-red-500">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-black text-white mb-1">Delete Conversation?</h3>
            <p className="text-xs text-slate-400 mb-4">
              Are you sure you want to delete this direct message conversation thread? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                disabled={isProcessing}
                className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold text-slate-300 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteSingle(confirmDeleteId)}
                disabled={isProcessing}
                className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 text-xs font-black text-white rounded-xl shadow-lg cursor-pointer flex items-center gap-1.5"
              >
                {isProcessing ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Bulk Delete */}
      {confirmBulkDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-red-900 rounded-3xl max-w-sm w-full p-6 text-white shadow-2xl">
            <div className="w-10 h-10 rounded-2xl bg-red-950 border border-red-800 flex items-center justify-center mb-3 text-red-500">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-black text-white mb-1">
              Delete {selectedIds.length} Conversations?
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              You are about to permanently delete {selectedIds.length} selected DM conversation links and message histories.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmBulkDelete(false)}
                disabled={isProcessing}
                className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold text-slate-300 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={isProcessing}
                className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 text-xs font-black text-white rounded-xl shadow-lg cursor-pointer"
              >
                {isProcessing ? 'Deleting...' : 'Delete All Selected'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DMManagerModal;
