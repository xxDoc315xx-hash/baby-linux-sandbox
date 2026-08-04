import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc, 
  serverTimestamp, 
  getDocs, 
  setDoc 
} from 'firebase/firestore';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth, db } from '../firebase';
import { ChatChannel, ChatMessage, UserAccount, DMConversation } from '../types';
import SvgAvatar from './SvgAvatar';
import AuthModal from './AuthModal';
import UserProfilePanel from './UserProfilePanel';
import DMManagerModal from './DMManagerModal';
import { 
  MessageSquare, 
  Hash, 
  Plus, 
  Send, 
  Code, 
  Users, 
  LogIn, 
  LogOut, 
  Trash2, 
  Sparkles, 
  Smile, 
  CheckCircle2, 
  Circle, 
  Search, 
  Lock, 
  Zap, 
  Terminal, 
  Globe, 
  Flame, 
  Info,
  UserCheck,
  Sliders,
  Edit3,
  Table,
  Filter
} from 'lucide-react';

// Default Pioneers Seed Data
const ADA_AI_USER: UserAccount = {
  uid: "ada-ai-mentor",
  email: "ada.mentor@babylinux.ai",
  displayName: "Ada (AI Companion)",
  role: "AI Mentor & Tutor 🤖",
  bio: "Your friendly AI Coding Companion & Linux Guardian Angel!",
  avatarStyle: {
    bgColor: "#991b1b",
    fgColor: "#ffffff",
    pattern: "waves"
  }
};

const DEFAULT_PIONEERS: UserAccount[] = [
  {
    uid: "doc-lead-creator",
    email: "xxDoc315xx@hotmail.com",
    displayName: "Doc (Lead Architect)",
    role: "Cosmic Creator & Pioneer 🚀",
    bio: "Primary creator of the Baby Linux Playground & Pioneer Chat Room.",
    avatarStyle: {
      bgColor: "#451a03",
      fgColor: "#fbbf24",
      pattern: "dots"
    }
  },
  ADA_AI_USER,
  {
    uid: "google-lady-ai",
    email: "google.lady@babylinux.ai",
    displayName: "The Google Lady",
    role: "Linux Command Guru 🎙️",
    bio: "Guiding babies through terminal commands with warmth and clarity.",
    avatarStyle: {
      bgColor: "#881337",
      fgColor: "#fde047",
      pattern: "circles"
    }
  },
  {
    uid: "linus-torvalds-pioneer",
    email: "linus@kernel.org",
    displayName: "Linus Torvalds",
    role: "Linux Kernel Creator 🐧",
    bio: "Talk is cheap. Show me the code.",
    avatarStyle: {
      bgColor: "#1e293b",
      fgColor: "#38bdf8",
      pattern: "grid"
    }
  },
  {
    uid: "tux-penguin-pioneer",
    email: "tux@linux.org",
    displayName: "Tux The Penguin",
    role: "Official Linux Mascot 🐧",
    bio: "Waddling around the root directory eating pacifiers and ice blocks.",
    avatarStyle: {
      bgColor: "#065f46",
      fgColor: "#a7f3d0",
      pattern: "triangles"
    }
  }
];

export const ChatRoom: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [userDoc, setUserDoc] = useState<UserAccount | null>(null);
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string>('general');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [usersList, setUsersList] = useState<UserAccount[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isCodeMode, setIsCodeMode] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfilePanelOpen, setIsProfilePanelOpen] = useState(false);
  const [isNewChannelOpen, setIsNewChannelOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const [searchMember, setSearchMember] = useState('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isDMManagerOpen, setIsDMManagerOpen] = useState(false);
  const [searchDM, setSearchDM] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Default channels seed
  const DEFAULT_CHANNELS: ChatChannel[] = [
    { id: 'general', name: 'general', description: 'DocsHouse Lounge & General chat', icon: 'Globe' },
    { id: 'cosmic-creators', name: 'cosmic-creators', description: 'AI Studio Showcase & Project Demos', icon: 'Sparkles' },
    { id: 'baby-linux', name: 'baby-linux', description: 'Linux Terminal & Commands Help', icon: 'Terminal' },
    { id: 'code-lounge', name: 'code-lounge', description: 'React, Vite & Shaders Lounge', icon: 'Code' }
  ];

  // 1. Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Fetch/listen user doc
        const userRef = doc(db, 'users', user.uid);
        const unsubUser = onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            setUserDoc(snap.data() as UserAccount);
          }
        });
        return () => unsubUser();
      } else {
        setUserDoc(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Fetch/Listen Channels
  useEffect(() => {
    const q = query(collection(db, 'channels'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        // Seed default channels if empty
        DEFAULT_CHANNELS.forEach(async (ch) => {
          await setDoc(doc(db, 'channels', ch.id), {
            ...ch,
            createdAt: serverTimestamp()
          });
        });
        setChannels(DEFAULT_CHANNELS);
      } else {
        const fetched: ChatChannel[] = [];
        snapshot.forEach((d) => {
          const chData = d.data() as ChatChannel;
          if (d.id === 'general' && !chData.description) {
            chData.description = 'DocsHouse Lounge & General chat';
          }
          fetched.push({ id: d.id, ...chData });
        });
        setChannels(fetched);
      }
    }, (err) => {
      console.warn('Channels error, using default channels:', err);
      setChannels(DEFAULT_CHANNELS);
    });

    return () => unsubscribe();
  }, []);

  // 3. Fetch/Listen Messages for activeChannelId
  useEffect(() => {
    if (!activeChannelId) return;

    const q = query(
      collection(db, 'messages'),
      where('channelId', '==', activeChannelId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: ChatMessage[] = [];
      snapshot.forEach((d) => {
        msgs.push({ id: d.id, ...d.data() } as ChatMessage);
      });
      // Sort client-side by createdAt
      msgs.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : Date.now());
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : Date.now());
        return timeA - timeB;
      });

      setMessages(msgs);
    }, (err) => {
      console.warn('Messages fetch listener warning:', err);
    });

    return () => unsubscribe();
  }, [activeChannelId]);

  // 4. Listen to Registered Users list
  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: UserAccount[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as UserAccount);
      });
      setUsersList(list);
    }, (err) => {
      console.warn('Users list error:', err);
    });

    return () => unsubscribe();
  }, []);

  // 5. Fetch/Listen Direct Messages for currentUser
  const [dms, setDms] = useState<DMConversation[]>([]);
  useEffect(() => {
    if (!currentUser) {
      setDms([]);
      return;
    }

    const q = query(
      collection(db, 'dms'),
      where('members', 'array-contains', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: DMConversation[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const members: string[] = data.members || [];
        const otherUid = members.find((m) => m !== currentUser.uid) || currentUser.uid;
        const details = data.memberDetails || {};
        const other = details[otherUid] || {};
        list.push({
          id: docSnap.id,
          otherUid,
          otherName: other.displayName || 'User',
          otherEmail: other.email || '',
          otherRole: other.role || '',
          otherAvatarStyle: other.avatarStyle || null,
          lastMessage: data.lastMessage || '',
          updatedAt: data.updatedAt
        });
      });

      list.sort((a, b) => {
        const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : Date.now();
        const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : Date.now();
        return timeB - timeA;
      });

      setDms(list);
    }, (err) => {
      console.warn('DMs fetch listener warning:', err);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !currentUser) return;

    const textToSend = messageText.trim();
    setMessageText('');

    try {
      await addDoc(collection(db, 'messages'), {
        channelId: activeChannelId,
        senderUid: currentUser.uid,
        senderName: userDoc?.displayName || currentUser.displayName || 'Pioneer User',
        senderEmail: currentUser.email || '',
        senderPhoto: currentUser.photoURL || '',
        senderAvatarStyle: userDoc?.avatarStyle || null,
        text: textToSend,
        isCode: isCodeMode,
        createdAt: serverTimestamp(),
        reactions: {}
      });

      // Update DM doc if DM channel
      if (activeChannelId.startsWith('dm_')) {
        await setDoc(doc(db, 'dms', activeChannelId), {
          lastMessage: textToSend,
          updatedAt: serverTimestamp()
        }, { merge: true }).catch(() => {});

        // If DMing Ada AI or mentioning Ada in channel, auto-generate reply
        const isAdaTargeted = activeChannelId.includes('ada-ai-mentor') || textToSend.toLowerCase().includes('ada');
        if (isAdaTargeted) {
          try {
            let replyText = '';
            if (textToSend.trim().toLowerCase() === 'test') {
              replyText = 'test';
            } else {
              const res = await fetch('/api/baby-linux/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  message: textToSend,
                  history: messages.map((m) => ({
                    role: m.senderUid === 'ada-ai-mentor' ? 'mentor' : 'user',
                    text: m.text
                  }))
                })
              });
              if (res.ok) {
                const data = await res.json();
                replyText = data.text || 'test';
              } else {
                replyText = 'test';
              }
            }

            await addDoc(collection(db, 'messages'), {
              channelId: activeChannelId,
              senderUid: 'ada-ai-mentor',
              senderName: 'Ada (AI Companion)',
              senderEmail: 'ada.mentor@babylinux.ai',
              senderAvatarStyle: ADA_AI_USER.avatarStyle,
              text: replyText,
              isCode: false,
              createdAt: serverTimestamp(),
              reactions: {}
            });

            if (activeChannelId.startsWith('dm_')) {
              await setDoc(doc(db, 'dms', activeChannelId), {
                lastMessage: replyText,
                updatedAt: serverTimestamp()
              }, { merge: true }).catch(() => {});
            }
          } catch (err) {
            console.error('Ada AI response error:', err);
          }
        }
      } else if (textToSend.toLowerCase().includes('ada')) {
        // In public channels if Ada is mentioned
        try {
          let replyText = '';
          if (textToSend.trim().toLowerCase() === 'test') {
            replyText = 'test';
          } else {
            const res = await fetch('/api/baby-linux/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message: textToSend,
                history: messages.map((m) => ({
                  role: m.senderUid === 'ada-ai-mentor' ? 'mentor' : 'user',
                  text: m.text
                }))
              })
            });
            if (res.ok) {
              const data = await res.json();
              replyText = data.text || 'test';
            } else {
              replyText = 'test';
            }
          }

          await addDoc(collection(db, 'messages'), {
            channelId: activeChannelId,
            senderUid: 'ada-ai-mentor',
            senderName: 'Ada (AI Companion)',
            senderEmail: 'ada.mentor@babylinux.ai',
            senderAvatarStyle: ADA_AI_USER.avatarStyle,
            text: replyText,
            isCode: false,
            createdAt: serverTimestamp(),
            reactions: {}
          });
        } catch (err) {
          console.error('Ada public channel mention error:', err);
        }
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  // Create Channel
  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;

    const cleanName = newChannelName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const channelId = `ch-${Date.now()}`;

    try {
      await setDoc(doc(db, 'channels', channelId), {
        id: channelId,
        name: cleanName,
        description: newChannelDesc.trim() || 'Custom Pioneer Lounge',
        createdAt: serverTimestamp()
      });
      setActiveChannelId(channelId);
      setNewChannelName('');
      setNewChannelDesc('');
      setIsNewChannelOpen(false);
    } catch (err) {
      console.error('Failed to create channel:', err);
    }
  };

  // Toggle Reaction
  const handleToggleReaction = async (messageId: string, emoji: string) => {
    if (!currentUser) return;
    const msg = messages.find(m => m.id === messageId);
    if (!msg) return;

    const currentReactions = msg.reactions || {};
    const uids = currentReactions[emoji] || [];
    const hasReacted = uids.includes(currentUser.uid);

    let updatedUids: string[];
    if (hasReacted) {
      updatedUids = uids.filter(u => u !== currentUser.uid);
    } else {
      updatedUids = [...uids, currentUser.uid];
    }

    const updatedReactions = { ...currentReactions };
    if (updatedUids.length > 0) {
      updatedReactions[emoji] = updatedUids;
    } else {
      delete updatedReactions[emoji];
    }

    try {
      await updateDoc(doc(db, 'messages', messageId), {
        reactions: updatedReactions
      });
    } catch (err) {
      console.error('Reaction update error:', err);
    }
  };

  // Delete message if owner
  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteDoc(doc(db, 'messages', messageId));
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  };

  // Start Direct Message with User
  const handleStartDM = async (targetUser: UserAccount) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }

    const sortedUids = [currentUser.uid, targetUser.uid].sort();
    const dmId = `dm_${sortedUids.join('_')}`;

    try {
      const dmRef = doc(db, 'dms', dmId);
      await setDoc(dmRef, {
        id: dmId,
        members: sortedUids,
        memberDetails: {
          [currentUser.uid]: {
            displayName: userDoc?.displayName || currentUser.displayName || 'Pioneer User',
            email: currentUser.email || '',
            role: userDoc?.role || '',
            avatarStyle: userDoc?.avatarStyle || null
          },
          [targetUser.uid]: {
            displayName: targetUser.displayName,
            email: targetUser.email || '',
            role: targetUser.role || '',
            avatarStyle: targetUser.avatarStyle || null
          }
        },
        updatedAt: serverTimestamp()
      }, { merge: true });

      setActiveChannelId(dmId);
      setMobileSidebarOpen(false);
    } catch (err) {
      console.error('Failed to start DM:', err);
      setActiveChannelId(dmId);
      setMobileSidebarOpen(false);
    }
  };

  // Delete Direct Message Conversation
  const handleDeleteDM = async (dmId: string, deleteMessages = true) => {
    try {
      // 1. Delete DM Document
      await deleteDoc(doc(db, 'dms', dmId));

      // 2. Delete Associated Messages if requested
      if (deleteMessages) {
        const qMsgs = query(collection(db, 'messages'), where('channelId', '==', dmId));
        const snapMsgs = await getDocs(qMsgs);
        const deletePromises = snapMsgs.docs.map((docSnap) => deleteDoc(docSnap.ref));
        await Promise.all(deletePromises);
      }

      // If active channel was deleted DM, switch to general
      if (activeChannelId === dmId) {
        setActiveChannelId('general');
      }
    } catch (err) {
      console.error('Failed to delete DM conversation:', err);
    }
  };

  // Clear Direct Message Messages (keep conversation link)
  const handleClearDMMessages = async (dmId: string) => {
    try {
      const qMsgs = query(collection(db, 'messages'), where('channelId', '==', dmId));
      const snapMsgs = await getDocs(qMsgs);
      const deletePromises = snapMsgs.docs.map((docSnap) => deleteDoc(docSnap.ref));
      await Promise.all(deletePromises);

      await setDoc(doc(db, 'dms', dmId), {
        lastMessage: '',
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.error('Failed to clear DM messages:', err);
    }
  };

  // Bulk Delete DMs
  const handleBulkDeleteDMs = async (dmIds: string[]) => {
    for (const id of dmIds) {
      await handleDeleteDM(id, true);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const combinedUsersMap = new Map<string, UserAccount>();
  DEFAULT_PIONEERS.forEach((u) => combinedUsersMap.set(u.uid, u));
  usersList.forEach((u) => combinedUsersMap.set(u.uid, u));
  const allNetworkUsers = Array.from(combinedUsersMap.values());

  const filteredUsers = allNetworkUsers.filter((u) =>
    (u.displayName && u.displayName.toLowerCase().includes(searchMember.toLowerCase())) ||
    (u.email && u.email.toLowerCase().includes(searchMember.toLowerCase())) ||
    (u.role && u.role.toLowerCase().includes(searchMember.toLowerCase()))
  );

  const publicChannels = channels.filter(c => !c.id.startsWith('dm_') && !c.isPrivate);

  const isDMActive = activeChannelId.startsWith('dm_');
  const activeDM = isDMActive ? dms.find(d => d.id === activeChannelId) : null;
  const activeChannel = channels.find(c => c.id === activeChannelId) || {
    id: activeChannelId,
    name: activeChannelId,
    description: 'Pioneer Channel'
  };

  const dmTargetUser = isDMActive
    ? allNetworkUsers.find((u) => activeChannelId.includes(u.uid)) || (activeDM ? {
        displayName: activeDM.otherName,
        email: activeDM.otherEmail,
        role: activeDM.otherRole,
        avatarStyle: activeDM.otherAvatarStyle
      } : null)
    : null;

  return (
    <div className="flex flex-col h-[750px] bg-neutral-950 border border-red-950/80 rounded-3xl overflow-hidden shadow-2xl text-slate-100 my-4">
      {/* Top Bar Header */}
      <div className="bg-black/90 border-b border-red-950 px-6 py-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="md:hidden p-2 text-slate-400 hover:text-white bg-neutral-900 rounded-xl"
          >
            <Hash className="w-5 h-5 text-red-500" />
          </button>

          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-800 to-rose-600 flex items-center justify-center shadow-lg shadow-red-600/20">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black tracking-tight text-white uppercase flex items-center gap-1.5">
                {isDMActive ? (
                  <>
                    <MessageSquare className="w-4 h-4 text-rose-500" /> @{dmTargetUser?.displayName || 'Direct Message'}
                  </>
                ) : (
                  <>
                    <Hash className="w-4 h-4 text-red-500" /> {activeChannel.name}
                  </>
                )}
              </h2>
              <span className="px-2 py-0.5 rounded-md bg-red-950/60 border border-red-900/40 text-[10px] font-bold text-red-400 uppercase">
                {isDMActive ? 'Private DM' : 'Public Channel'}
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate max-w-md">
              {isDMActive
                ? `Direct 1-on-1 private thread with ${dmTargetUser?.displayName || 'User'}`
                : activeChannel.description}
            </p>
          </div>
        </div>

        {/* Auth Profile Status Header */}
        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-3 bg-neutral-900 border border-red-950 px-3.5 py-1.5 rounded-2xl">
              <button
                onClick={() => setIsProfilePanelOpen(true)}
                className="flex items-center gap-2.5 text-left group cursor-pointer hover:opacity-90 transition-opacity"
                title="Customize Username & Avatar Icon"
              >
                <div className="relative">
                  {userDoc?.avatarStyle ? (
                    <SvgAvatar style={userDoc.avatarStyle} name={userDoc.displayName} size={32} />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-red-800 flex items-center justify-center text-white font-black text-xs">
                      {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : 'U'}
                    </div>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-black" />
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-bold text-white leading-tight flex items-center gap-1 group-hover:text-red-400 transition-colors">
                    <span>{userDoc?.displayName || currentUser.displayName || 'Pioneer User'}</span>
                    <Edit3 className="w-3 h-3 text-slate-500 group-hover:text-red-400" />
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    {userDoc?.role || currentUser.email}
                  </div>
                </div>
              </button>

              <button
                onClick={() => setIsProfilePanelOpen(true)}
                title="User Profile & Icon Settings"
                className="p-1.5 bg-neutral-800 hover:bg-red-950/80 text-slate-300 hover:text-white rounded-lg border border-neutral-700 hover:border-red-600 transition-all cursor-pointer ml-1"
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleLogout}
                title="Sign Out"
                className="p-1.5 hover:bg-red-950 text-slate-400 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-xs font-black text-white rounded-xl shadow-lg shadow-red-600/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" /> Register / Sign In
            </button>
          )}
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="flex-grow flex overflow-hidden relative">
        
        {/* Left Sidebar: Channels & Direct Messages */}
        <div className={`w-64 bg-black border-r border-red-950/80 flex flex-col flex-shrink-0 absolute md:relative inset-y-0 left-0 z-30 transition-transform ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
          
          {/* Public Channels Section */}
          <div className="p-3 border-b border-red-950/60">
            <div className="flex items-center justify-between text-xs font-black tracking-widest uppercase text-slate-400 mb-2">
              <span className="flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-red-500" /> Channels
              </span>
              {currentUser && (
                <button
                  onClick={() => setIsNewChannelOpen(true)}
                  className="p-1 hover:bg-neutral-900 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                  title="Create Channel"
                >
                  <Plus className="w-4 h-4 text-red-400" />
                </button>
              )}
            </div>

            <div className="space-y-1">
              {publicChannels.map((ch) => {
                const isActive = activeChannelId === ch.id;
                return (
                  <button
                    key={ch.id}
                    onClick={() => {
                      setActiveChannelId(ch.id);
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-red-800/80 to-rose-700/60 text-white shadow-md shadow-red-900/20'
                        : 'text-slate-400 hover:text-white hover:bg-neutral-900/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Hash className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                      <span className="truncate">{ch.name}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Direct Messages Section */}
          <div className="p-3 flex-grow overflow-y-auto">
            <div className="flex items-center justify-between text-xs font-black tracking-widest uppercase text-slate-400 mb-2">
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-rose-500" /> Direct Messages
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsDMManagerOpen(true)}
                  className="px-2 py-1 hover:bg-neutral-900 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[10px] bg-red-950/60 border border-red-900/50 text-red-300 font-bold"
                  title="Open Direct Messages Chat Log"
                >
                  <MessageSquare className="w-3 h-3 text-rose-400" />
                  <span>Chat Log</span>
                </button>
              </div>
            </div>

            {/* DM Search Filter if multiple conversations */}
            {dms.length > 3 && (
              <div className="mb-2 relative">
                <Search className="w-3 h-3 text-slate-500 absolute left-2.5 top-2" />
                <input
                  type="text"
                  value={searchDM}
                  onChange={(e) => setSearchDM(e.target.value)}
                  placeholder="Filter DMs..."
                  className="w-full bg-neutral-950 border border-red-950 rounded-lg pl-7 pr-2 py-1 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-red-600"
                />
              </div>
            )}

            {dms.length === 0 ? (
              <div className="p-3 bg-neutral-950/80 border border-red-950/50 rounded-xl text-center">
                <p className="text-[11px] text-slate-500 italic">No DM chats yet.</p>
                <p className="text-[10px] text-slate-600 mt-1">Select any user in Network on the right to DM!</p>
              </div>
            ) : (
              <div className="space-y-1">
                {dms
                  .filter((dm) =>
                    dm.otherName.toLowerCase().includes(searchDM.toLowerCase()) ||
                    (dm.lastMessage && dm.lastMessage.toLowerCase().includes(searchDM.toLowerCase()))
                  )
                  .map((dm) => {
                    const isActive = activeChannelId === dm.id;
                    return (
                      <div key={dm.id} className="relative group/dm flex items-center">
                        <button
                          onClick={() => {
                            setActiveChannelId(dm.id);
                            setMobileSidebarOpen(false);
                          }}
                          className={`w-full p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer text-left pr-8 ${
                            isActive
                              ? 'bg-gradient-to-r from-red-800/80 to-rose-700/60 text-white shadow-md shadow-red-900/20'
                              : 'text-slate-400 hover:text-white hover:bg-neutral-900/60'
                          }`}
                        >
                          <div className="relative flex-shrink-0">
                            {dm.otherAvatarStyle ? (
                              <SvgAvatar style={dm.otherAvatarStyle} name={dm.otherName} size={26} />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-red-900 flex items-center justify-center text-white font-black text-[10px]">
                                {dm.otherName ? dm.otherName[0].toUpperCase() : 'U'}
                              </div>
                            )}
                            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-black" />
                          </div>

                          <div className="min-w-0 flex-grow">
                            <div className="font-bold truncate text-white leading-tight">
                              {dm.otherName}
                            </div>
                            {dm.lastMessage && (
                              <div className="text-[10px] text-slate-400 truncate opacity-80">
                                {dm.lastMessage}
                              </div>
                            )}
                          </div>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDM(dm.id, true);
                          }}
                          className="absolute right-1.5 opacity-0 group-hover/dm:opacity-100 p-1.5 text-slate-500 hover:text-red-400 hover:bg-neutral-900 rounded-lg transition-all cursor-pointer"
                          title="Delete conversation"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Quick Notice */}
          <div className="p-4 border-t border-red-950/60 bg-neutral-950/60">
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <Zap className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span>Real-time Firebase Firestore Sync Active</span>
            </div>
          </div>
        </div>

        {/* Center: Chat Feed & Input */}
        <div className="flex-grow flex flex-col bg-neutral-950 min-w-0">
          
          {/* Chat Messages Feed */}
          <div className="flex-grow overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-red-950 flex items-center justify-center mb-4">
                  {isDMActive ? (
                    <MessageSquare className="w-8 h-8 text-rose-500" />
                  ) : (
                    <Hash className="w-8 h-8 text-red-500" />
                  )}
                </div>
                <h4 className="text-base font-extrabold text-white mb-1">
                  {isDMActive
                    ? `Direct Message with ${dmTargetUser?.displayName || 'User'}`
                    : `Welcome to #${activeChannel.name}!`}
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mb-4">
                  {isDMActive
                    ? `This is the beginning of your direct message thread with ${dmTargetUser?.displayName || 'this user'}. Send a private message to start chatting!`
                    : `This is the start of the #${activeChannel.name} channel. Be the first pioneer to send a message!`}
                </p>
                {!currentUser && (
                  <button
                    onClick={() => setIsAuthOpen(true)}
                    className="px-4 py-2 bg-red-800 hover:bg-red-700 text-xs font-bold text-white rounded-xl transition-all shadow-md"
                  >
                    Register or Login to Post
                  </button>
                )}
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = currentUser?.uid === msg.senderUid;
                const senderUser = usersList.find(u => u.uid === msg.senderUid);
                const effectiveAvatarStyle = (isMe ? userDoc?.avatarStyle : senderUser?.avatarStyle) || msg.senderAvatarStyle;
                const effectiveDisplayName = (isMe ? (userDoc?.displayName || currentUser?.displayName) : senderUser?.displayName) || msg.senderName || 'Pioneer';

                return (
                  <div
                    key={msg.id}
                    className={`group flex items-start gap-3 p-3 rounded-2xl transition-all hover:bg-neutral-900/40 ${
                      isMe ? 'bg-red-950/15 border border-red-950/30' : ''
                    }`}
                  >
                    {/* User Avatar */}
                    <div className="flex-shrink-0">
                      {effectiveAvatarStyle ? (
                        <SvgAvatar style={effectiveAvatarStyle} name={effectiveDisplayName} size={38} />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-red-800 to-rose-600 flex items-center justify-center font-black text-white text-xs">
                          {effectiveDisplayName ? effectiveDisplayName[0].toUpperCase() : 'U'}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-white">
                            {effectiveDisplayName}
                          </span>
                          {isMe && (
                            <span className="px-1.5 py-0.2 rounded bg-red-900/50 text-[9px] font-bold text-red-300">
                              YOU
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500">
                            {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                          </span>
                        </div>

                        {/* Actions for owner */}
                        {isMe && (
                          <button
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-opacity"
                            title="Delete message"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Text / Code Block */}
                      {msg.isCode ? (
                        <div className="bg-black border border-red-950/80 rounded-xl p-3 font-mono text-xs text-emerald-400 overflow-x-auto my-1">
                          <code>{msg.text}</code>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-200 leading-relaxed break-words whitespace-pre-wrap">
                          {msg.text}
                        </p>
                      )}

                      {/* Reactions */}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {['👍', '🔥', '❤️', '🚀', '💡'].map((emoji) => {
                          const rxList = msg.reactions?.[emoji] || [];
                          const count = rxList.length;
                          const hasReacted = currentUser && rxList.includes(currentUser.uid);

                          return (
                            <button
                              key={emoji}
                              onClick={() => handleToggleReaction(msg.id, emoji)}
                              className={`px-2 py-0.5 rounded-lg text-[11px] border transition-all flex items-center gap-1 cursor-pointer ${
                                hasReacted
                                  ? 'bg-red-950/60 border-red-600 text-red-200 font-bold'
                                  : 'bg-neutral-900 border-neutral-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              <span>{emoji}</span>
                              {count > 0 && <span className="text-[10px]">{count}</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input Bar */}
          <div className="p-4 border-t border-red-950 bg-black/80">
            {currentUser ? (
              <form onSubmit={handleSendMessage} className="space-y-2">
                <div className="relative flex items-center bg-neutral-900 border border-red-950 rounded-2xl overflow-hidden focus-within:border-red-600 transition-all">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder={`Message #${activeChannel.name}...`}
                    className="flex-grow bg-transparent px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none"
                  />

                  {/* Code toggle */}
                  <button
                    type="button"
                    onClick={() => setIsCodeMode(!isCodeMode)}
                    className={`p-2 mr-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isCodeMode ? 'bg-red-950 text-red-400 border border-red-800' : 'text-slate-500 hover:text-slate-300'
                    }`}
                    title="Code Format Mode"
                  >
                    <Code className="w-4 h-4" />
                  </button>

                  {/* Send Button */}
                  <button
                    type="submit"
                    disabled={!messageText.trim()}
                    className="m-1.5 p-2.5 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 disabled:opacity-40 text-white rounded-xl transition-all shadow-md cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-3 bg-neutral-900 border border-red-950 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-center sm:text-left">
                <div>
                  <h5 className="text-xs font-extrabold text-white">Join the Discussion</h5>
                  <p className="text-[11px] text-slate-400">
                    Register an account or login to post real-time messages in the database chat.
                  </p>
                </div>
                <button
                  onClick={() => setIsAuthOpen(true)}
                  className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-xs font-black text-white rounded-xl shadow-md transition-all cursor-pointer flex-shrink-0"
                >
                  Register / Sign In
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Active Users / Registered Network */}
        <div className="w-64 bg-black border-l border-red-950/80 hidden lg:flex flex-col flex-shrink-0">
          <div className="p-4 border-b border-red-950/60">
            <span className="text-xs font-black tracking-widest uppercase text-slate-400 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-red-500" /> Network ({allNetworkUsers.length})
            </span>
          </div>

          {/* Search box */}
          <div className="p-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchMember}
                onChange={(e) => setSearchMember(e.target.value)}
                placeholder="Search member..."
                className="w-full bg-neutral-900 border border-red-950 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-600"
              />
            </div>
          </div>

          {/* Members List */}
          <div className="flex-grow overflow-y-auto p-3 space-y-1">
            {filteredUsers.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">No registered users found</p>
            ) : (
              filteredUsers.map((u) => {
                const isMe = currentUser?.uid === u.uid;
                return (
                  <div
                    key={u.uid}
                    onClick={() => !isMe && handleStartDM(u)}
                    className={`p-2 rounded-xl text-xs transition-all flex items-center gap-2.5 cursor-pointer group ${
                      isMe ? 'bg-neutral-900/60 border border-red-950/40' : 'hover:bg-neutral-900/40'
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      {u.avatarStyle ? (
                        <SvgAvatar style={u.avatarStyle} name={u.displayName} size={28} />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-red-800 flex items-center justify-center font-extrabold text-white text-[10px]">
                          {u.displayName ? u.displayName[0].toUpperCase() : 'U'}
                        </div>
                      )}
                      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-black" />
                    </div>

                    <div className="min-w-0 flex-grow">
                      <div className="font-bold text-slate-200 truncate group-hover:text-white flex items-center gap-1">
                        <span>{u.displayName}</span>
                        {isMe && <span className="text-[9px] text-red-400 font-extrabold">(You)</span>}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {u.role || u.email}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={() => setIsAuthOpen(false)}
      />

      {/* Create Channel Modal */}
      {isNewChannelOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-red-950 rounded-3xl w-full max-w-sm p-6 shadow-2xl text-white">
            <h3 className="text-base font-black text-white mb-1">Create Chat Channel</h3>
            <p className="text-xs text-slate-400 mb-4">Add a new discussion topic to the cosmic database.</p>

            <form onSubmit={handleCreateChannel} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Channel Name</label>
                <input
                  type="text"
                  required
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="e.g. quantum-computing"
                  className="w-full bg-neutral-900 border border-red-950 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Description</label>
                <input
                  type="text"
                  value={newChannelDesc}
                  onChange={(e) => setNewChannelDesc(e.target.value)}
                  placeholder="What is this channel about?"
                  className="w-full bg-neutral-900 border border-red-950 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewChannelOpen(false)}
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold text-slate-400 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-700 text-xs font-black text-white rounded-xl shadow-md"
                >
                  Create Channel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* User Profile Customization Panel Modal */}
      <UserProfilePanel
        isOpen={isProfilePanelOpen}
        onClose={() => setIsProfilePanelOpen(false)}
        currentUser={currentUser}
        userDoc={userDoc}
      />

      {/* Direct Messages Management Table Modal */}
      <DMManagerModal
        isOpen={isDMManagerOpen}
        onClose={() => setIsDMManagerOpen(false)}
        dms={dms}
        usersList={allNetworkUsers}
        activeChannelId={activeChannelId}
        onSelectDM={(dmId) => setActiveChannelId(dmId)}
        onDeleteDM={handleDeleteDM}
        onClearMessages={handleClearDMMessages}
        onBulkDeleteDMs={handleBulkDeleteDMs}
      />
    </div>
  );
};

export default ChatRoom;
