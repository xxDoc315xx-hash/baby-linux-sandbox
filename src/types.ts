export interface AvatarStyle {
  bgColor: string;
  fgColor: string;
  pattern: "dots" | "grid" | "waves" | "circles" | "triangles" | "crosses";
}

export interface Socials {
  twitter?: string;
  github?: string;
  website?: string;
}

export interface Profile {
  id: string;
  name: string;
  nickname: string;
  email: string;
  role: string;
  bio: string;
  tagline: string;
  skills: string[];
  badge: string;
  theme: "slate" | "violet" | "amber" | "emerald" | "rose" | "sky";
  socials: Socials;
  sparks: number;
  avatarStyle: AvatarStyle;
}

export interface UserAccount {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  status?: string;
  bio?: string;
  role?: string;
  avatarStyle?: AvatarStyle;
  createdAt?: any;
  lastSeen?: any;
}

export interface ChatChannel {
  id: string;
  name: string;
  description: string;
  isPrivate?: boolean;
  members?: string[];
  icon?: string;
  createdAt?: any;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  senderUid: string;
  senderName: string;
  senderEmail: string;
  senderPhoto?: string;
  senderAvatarStyle?: AvatarStyle;
  text: string;
  isCode?: boolean;
  createdAt: any;
  reactions?: Record<string, string[]>; // emoji -> array of user uids
}

export interface DMConversation {
  id: string;
  otherUid: string;
  otherName: string;
  otherEmail?: string;
  otherRole?: string;
  otherAvatarStyle?: any;
  lastMessage?: string;
  updatedAt?: any;
}

export interface UserLessonProgress {
  userEmail: string;
  currentLessonId: number;
  lessonsCompleted: number[];
  xp: number;
  lastLessonTitle?: string;
  updatedAt?: any;
}

