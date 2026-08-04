import React, { useState, useEffect } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { updateProfile, User } from 'firebase/auth';
import { auth, db } from '../firebase';
import { UserAccount, AvatarStyle } from '../types';
import SvgAvatar from './SvgAvatar';
import { 
  X, 
  User as UserIcon, 
  Palette, 
  Check, 
  Sparkles, 
  Save, 
  AlertCircle, 
  Tag, 
  Sliders,
  Smile
} from 'lucide-react';

interface UserProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  userDoc: UserAccount | null;
}

export const UserProfilePanel: React.FC<UserProfilePanelProps> = ({
  isOpen,
  onClose,
  currentUser,
  userDoc
}) => {
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('');
  const [bio, setBio] = useState('');
  const [bgColor, setBgColor] = useState('#ef4444');
  const [fgColor, setFgColor] = useState('#ffffff');
  const [pattern, setPattern] = useState<'dots' | 'grid' | 'waves' | 'circles' | 'triangles'>('dots');
  
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userDoc) {
      setDisplayName(userDoc.displayName || currentUser?.displayName || '');
      setRole(userDoc.role || 'DocsHouse Pioneer');
      setBio(userDoc.bio || 'Coding & collaborating in DocsHouse Lounge!');
      if (userDoc.avatarStyle) {
        setBgColor(userDoc.avatarStyle.bgColor || '#ef4444');
        setFgColor(userDoc.avatarStyle.fgColor || '#ffffff');
        setPattern(userDoc.avatarStyle.pattern || 'dots');
      }
    } else if (currentUser) {
      setDisplayName(currentUser.displayName || currentUser.email?.split('@')[0] || '');
      setRole('DocsHouse Pioneer');
      setBio('Ready to chat!');
    }
  }, [userDoc, currentUser, isOpen]);

  if (!isOpen || !currentUser) return null;

  const COLOR_PRESETS = [
    '#ef4444', '#f43f5e', '#ec4899', '#d946ef', '#a855f7', 
    '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#10b981', 
    '#84cc16', '#eab308', '#f97316', '#64748b', '#171717'
  ];

  const PATTERN_OPTIONS = [
    { id: 'dots', label: 'Dots' },
    { id: 'grid', label: 'Grid' },
    { id: 'waves', label: 'Waves' },
    { id: 'circles', label: 'Circles' },
    { id: 'triangles', label: 'Triangles' }
  ];

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Username cannot be empty.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // 1. Update Firebase Auth profile
      await updateProfile(currentUser, {
        displayName: displayName.trim()
      });

      // 2. Update Firestore user document
      const avatarStyle: AvatarStyle = {
        bgColor,
        fgColor,
        pattern
      };

      await setDoc(doc(db, 'users', currentUser.uid), {
        uid: currentUser.uid,
        email: currentUser.email || '',
        displayName: displayName.trim(),
        role: role.trim() || 'DocsHouse Pioneer',
        bio: bio.trim(),
        avatarStyle,
        lastSeen: serverTimestamp()
      }, { merge: true });

      setSaving(false);
      setSuccessMsg(true);
      setTimeout(() => {
        setSuccessMsg(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      setError(err.message || 'Failed to save profile configuration.');
      setSaving(false);
    }
  };

  const currentPreviewStyle: AvatarStyle = {
    bgColor,
    fgColor,
    pattern
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-neutral-950 border border-red-900/80 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl relative text-white my-6">
        
        {/* Header line */}
        <div className="h-1.5 bg-gradient-to-r from-red-800 via-red-600 to-rose-600" />

        <div className="p-6 sm:p-8">
          
          {/* Title */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-800 to-rose-600 flex items-center justify-center shadow-lg shadow-red-600/20">
                <Sliders className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight text-white">
                  User Profile & Avatar Customizer
                </h3>
                <p className="text-xs text-slate-400">
                  Manage your chat username, avatar icon, and member credentials
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-red-950 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Success / Error alert */}
          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-950/80 border border-emerald-600/80 rounded-2xl text-emerald-200 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Profile and custom avatar saved successfully!</span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-950/80 border border-red-600/80 rounded-2xl text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-6">
            
            {/* Live Icon & Username Preview Badge */}
            <div className="p-4 bg-neutral-900/80 border border-red-950 rounded-2xl flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <SvgAvatar style={currentPreviewStyle} name={displayName || 'User'} size={56} />
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-black" />
              </div>

              <div className="min-w-0 flex-grow">
                <div className="text-[10px] font-black tracking-widest text-red-400 uppercase mb-0.5">
                  Live Chat Badge Preview
                </div>
                <div className="text-base font-black text-white truncate">
                  {displayName || 'Your Username'}
                </div>
                <div className="text-xs text-slate-400 truncate">
                  {role || 'DocsHouse Pioneer'} • <span className="text-emerald-400">Online</span>
                </div>
              </div>
            </div>

            {/* Username & Credentials */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-400 mb-1.5">
                  Chat Username <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter chat username"
                    className="w-full bg-neutral-900 border border-red-950 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-600 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-400 mb-1.5">
                  Role / Specialization
                </label>
                <div className="relative">
                  <Tag className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="e.g. Frontend Specialist"
                    className="w-full bg-neutral-900 border border-red-950 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-600 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Bio / Status */}
            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-400 mb-1.5">
                Bio / Status Message
              </label>
              <input
                type="text"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="What are you working on today?"
                className="w-full bg-neutral-900 border border-red-950 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-600 transition-all"
              />
            </div>

            {/* Avatar Icon Customization Section */}
            <div className="p-4 bg-neutral-900/50 border border-red-950/80 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 text-xs font-extrabold text-white uppercase tracking-wider border-b border-red-950/60 pb-2">
                <Palette className="w-4 h-4 text-red-500" />
                Custom Icon Styling & Patterns
              </div>

              {/* Background Swatches */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-2">
                  Icon Background Color
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setBgColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-7 h-7 rounded-lg transition-transform cursor-pointer flex items-center justify-center ${
                        bgColor === c ? 'scale-110 ring-2 ring-white shadow-lg' : 'hover:scale-105'
                      }`}
                    >
                      {bgColor === c && <Check className="w-3.5 h-3.5 text-white drop-shadow" />}
                    </button>
                  ))}
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer bg-neutral-900 border border-red-950"
                    title="Custom Background Color"
                  />
                </div>
              </div>

              {/* Pattern Choice */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-2">
                  Avatar Background Pattern
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {PATTERN_OPTIONS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPattern(p.id as any)}
                      className={`py-2 px-1 text-xs font-bold rounded-xl border transition-all cursor-pointer text-center ${
                        pattern === p.id
                          ? 'bg-red-950/80 border-red-600 text-white shadow-md'
                          : 'bg-neutral-950 border-neutral-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Foreground Color Swatches */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-2">
                  Icon Foreground Color
                </label>
                <div className="flex items-center gap-3">
                  {['#ffffff', '#f8fafc', '#cbd5e1', '#000000', '#fef08a', '#fca5a5'].map((fc) => (
                    <button
                      key={fc}
                      type="button"
                      onClick={() => setFgColor(fc)}
                      style={{ backgroundColor: fc }}
                      className={`w-6 h-6 rounded-lg transition-transform cursor-pointer border border-slate-700 flex items-center justify-center ${
                        fgColor === fc ? 'scale-110 ring-2 ring-red-500' : ''
                      }`}
                    >
                      {fgColor === fc && <Check className="w-3 h-3 text-neutral-900" />}
                    </button>
                  ))}
                  <input
                    type="color"
                    value={fgColor}
                    onChange={(e) => setFgColor(e.target.value)}
                    className="w-7 h-7 rounded-lg cursor-pointer bg-neutral-900 border border-red-950"
                    title="Custom Foreground Color"
                  />
                </div>
              </div>

            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-slate-400 hover:text-white text-xs font-bold rounded-xl border border-red-950 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-lg shadow-red-600/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Save Profile & Icon
                  </>
                )}
              </button>
            </div>

          </form>

        </div>
      </div>
    </div>
  );
};

export default UserProfilePanel;
