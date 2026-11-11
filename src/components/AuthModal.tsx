import React, { useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  updateProfile 
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { 
  X, 
  Mail, 
  Lock, 
  User, 
  Sparkles, 
  AlertCircle, 
  LogIn, 
  UserPlus, 
  CheckCircle2, 
  Eye, 
  EyeOff,
  Zap
} from 'lucide-react';
import SvgAvatar from './SvgAvatar';
import { AvatarStyle } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('Cosmic Pioneer');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreateUserDocument = async (uid: string, userEmail: string, name: string, userRole: string, photoURL?: string) => {
    try {
      const userRef = doc(db, 'users', uid);
      const docSnap = await getDoc(userRef);

      const randomAvatarStyle: AvatarStyle = {
        bgColor: ['#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#10b981', '#f59e0b'][Math.floor(Math.random() * 6)],
        fgColor: '#ffffff',
        pattern: ['dots', 'grid', 'waves', 'circles', 'triangles'][Math.floor(Math.random() * 5)] as any
      };

      if (!docSnap.exists()) {
        await setDoc(userRef, {
          uid,
          email: userEmail,
          displayName: name || userEmail.split('@')[0],
          role: userRole || 'Cosmic Pioneer',
          photoURL: photoURL || '',
          avatarStyle: randomAvatarStyle,
          status: 'online',
          bio: 'Ready to collaborate in the Cosmic Network!',
          createdAt: serverTimestamp(),
          lastSeen: serverTimestamp()
        });
      } else {
        await setDoc(userRef, {
          status: 'online',
          lastSeen: serverTimestamp()
        }, { merge: true });
      }
    } catch (err: any) {
      console.warn("User document creation/sync skipped due to Firestore write quota or network status:", err?.message || err);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegistering) {
        if (!displayName.trim()) {
          setError('Please provide a display name for your profile.');
          setLoading(false);
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await updateProfile(user, {
          displayName: displayName.trim()
        });

        await handleCreateUserDocument(user.uid, user.email || email, displayName.trim(), role);
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await handleCreateUserDocument(user.uid, user.email || email, user.displayName || '', 'Cosmic Pioneer');
      }

      setLoading(false);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Auth error:', err);
      let msg = err.message || 'Authentication failed. Please check your credentials.';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'This email address is already registered. Please sign in instead.';
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Invalid email or password. Please double check and try again.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password should be at least 6 characters long.';
      } else if (err.code === 'auth/user-not-found') {
        msg = 'No user account found with this email. Please register first.';
      }
      setError(msg);
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;

      await handleCreateUserDocument(
        user.uid, 
        user.email || 'google-user@cosmic.io', 
        user.displayName || 'Google Pioneer', 
        'Cosmic Explorer',
        user.photoURL || undefined
      );

      setLoading(false);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Google Sign In error:', err);
      setError(err.message || 'Failed to sign in with Google.');
      setLoading(false);
    }
  };

  const handleDemoSignIn = async () => {
    setError(null);
    setLoading(true);
    const demoEmail = `pioneer_${Math.floor(1000 + Math.random() * 9000)}@cosmic.internal`;
    const demoPassword = 'CosmicPassword123!';
    const demoName = `Pioneer-${Math.floor(100 + Math.random() * 900)}`;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, demoEmail, demoPassword);
      const user = userCredential.user;

      await updateProfile(user, { displayName: demoName });
      await handleCreateUserDocument(user.uid, demoEmail, demoName, 'Demo Explorer');

      setLoading(false);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      // Fallback if demo email collided
      try {
        const loginCredential = await signInWithEmailAndPassword(auth, demoEmail, demoPassword);
        await handleCreateUserDocument(loginCredential.user.uid, demoEmail, demoName, 'Demo Explorer');
        setLoading(false);
        if (onSuccess) onSuccess();
        onClose();
      } catch (innerErr: any) {
        setError('Demo login initialization failed. Please try manual registration.');
        setLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-neutral-950 border border-red-900/60 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative text-white my-8">
        {/* Header gradient line */}
        <div className="h-1.5 bg-gradient-to-r from-red-800 via-red-600 to-rose-600" />

        <div className="p-6 sm:p-8">
          {/* Top Row */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-800 to-rose-600 flex items-center justify-center shadow-md shadow-red-600/20">
                <Sparkles className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight text-white">
                  {isRegistering ? 'Create Pioneer Account' : 'Welcome Back'}
                </h3>
                <p className="text-xs text-slate-400">
                  {isRegistering ? 'Join the Cosmic network database' : 'Sign in to access real-time chat'}
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

          {/* Toggle Register / Login */}
          <div className="flex bg-neutral-900 p-1 rounded-2xl border border-red-950/60 mb-6">
            <button
              type="button"
              onClick={() => { setIsRegistering(false); setError(null); }}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                !isRegistering
                  ? 'bg-gradient-to-r from-red-700 to-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" /> Login
            </button>
            <button
              type="button"
              onClick={() => { setIsRegistering(true); setError(null); }}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                isRegistering
                  ? 'bg-gradient-to-r from-red-700 to-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" /> Register
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3.5 bg-red-950/50 border border-red-800/80 rounded-2xl text-red-200 text-xs flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {isRegistering && (
              <>
                <div>
                  <label className="block text-xs font-extrabold uppercase text-slate-400 mb-1.5">
                    Display Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Commander Sarah"
                      className="w-full bg-neutral-900 border border-red-950 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-600 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase text-slate-400 mb-1.5">
                    Role / Specialization
                  </label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="e.g. Frontend Architect / Shaders"
                    className="w-full bg-neutral-900 border border-red-950 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-600 transition-all"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-400 mb-1.5">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-neutral-900 border border-red-950 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-600 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-400 mb-1.5">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-neutral-900 border border-red-950 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-600 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 disabled:opacity-50 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-red-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isRegistering ? (
                <>
                  <UserPlus className="w-4 h-4" /> Create Account & Join Chat
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" /> Sign In to Chat
                </>
              )}
            </button>
          </form>

          {/* Or Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="flex-grow h-px bg-red-950/80" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Or Continue With</span>
            <div className="flex-grow h-px bg-red-950/80" />
          </div>

          {/* Quick Options */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="py-2.5 px-3 bg-neutral-900 hover:bg-neutral-850 border border-red-950 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.2 9 5 12 5z"/>
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
                <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9c-.8-.7-1.4-1.6-1.8-2.7z"/>
                <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-2.9l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.2-6.4-5.2L1.9 16.1C3.7 19.8 7.5 23 12 23z"/>
              </svg>
              Google
            </button>

            <button
              type="button"
              onClick={handleDemoSignIn}
              disabled={loading}
              className="py-2.5 px-3 bg-neutral-900 hover:bg-red-950/40 border border-red-950 rounded-xl text-xs font-bold text-red-400 hover:text-red-300 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" /> Demo Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
