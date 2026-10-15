import { CompanionInfo, CompanionType } from '../types';

export const COMPANIONS: Record<CompanionType, CompanionInfo> = {
  'on-demand': {
    id: 'on-demand',
    name: 'On-demand therapist',
    badge: 'Always here',
    description: 'Immediate grounding, acute distress decompression, and real-time support whenever a moment feels heavy.',
    accentBg: 'bg-purple-50 hover:bg-purple-100/70',
    accentBorder: 'border-purple-200/60',
    accentText: 'text-purple-700',
    initialPrompt: "I'm glad you're here. You don't have to carry whatever is on your mind all at once. What feels most present for you right now?",
  },
  'weekly': {
    id: 'weekly',
    name: 'Weekly main therapist',
    badge: 'Structured CBT',
    description: '45-minute deep-dive psychotherapy to explore patterns, unpack core beliefs, and formulate your personalized weekly plan.',
    accentBg: 'bg-blue-50/80 hover:bg-blue-100/70',
    accentBorder: 'border-blue-200/60',
    accentText: 'text-blue-700',
    initialPrompt: "Welcome to your weekly session. Let's take a calm breath together. How has this past week felt compared to when we last met, and how did your homework go?",
  },
  'daily': {
    id: 'daily',
    name: 'Daily exercise therapist',
    badge: '5-min drill',
    description: 'Quick daily practice companion for cognitive restructuring, urge surfing, and grounding drills.',
    accentBg: 'bg-emerald-50/80 hover:bg-emerald-100/70',
    accentBorder: 'border-emerald-200/60',
    accentText: 'text-emerald-700',
    initialPrompt: "Ready for your daily 5-minute CBT practice? Let's take a quick moment to notice your automatic thoughts and check in with your mind.",
  },
};

export const companionService = {
  getCompanion(type: CompanionType): CompanionInfo {
    return COMPANIONS[type] || COMPANIONS['on-demand'];
  },

  getAllCompanions(): CompanionInfo[] {
    return Object.values(COMPANIONS);
  },
};
