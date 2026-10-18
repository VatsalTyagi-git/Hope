export type CompanionType = 'on-demand' | 'weekly' | 'daily';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarInitial: string;
}

export interface UserProfile extends User {
  ageRange?: string;
  focusAreas: string[]; // e.g. 'Stress', 'Work-life balance', 'Sleep', etc.
  conversationStyle: 'gentle' | 'direct';
  preferredTime: string; // e.g. 'Evening (7:00 PM)'
  preferredMode: 'text' | 'voice';
  bio?: string;
  onboardingComplete: boolean;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string; // ISO string
}

export interface SessionSummary {
  id: string;
  conversationId: string;
  title: string;
  dateLabel: string; // e.g. 'Today - On-demand therapist'
  whatWeExplored: string;
  tags: string[];
  carryWithYou: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  companionType: CompanionType;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  summary?: SessionSummary;
}

export interface CompanionInfo {
  id: CompanionType;
  name: string;
  badge: string;
  description: string;
  accentBg: string;
  accentBorder: string;
  accentText: string;
  initialPrompt: string;
}
