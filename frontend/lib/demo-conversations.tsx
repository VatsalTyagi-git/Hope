'use client';

import { type ReactNode, createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { UIMessage } from 'ai';

export type Thread = {
  id: string;
  title: string;
  date: string;
  agent: string;
  messages: UIMessage[];
  summary: string;
  themes: string[];
  takeaway: string;
  ended?: boolean;
  isVoice?: boolean;
  sessionType?: 'voice' | 'chat';
};

export const textMessage = (id: string, role: 'user' | 'assistant', text: string): UIMessage => ({
  id,
  role,
  parts: [{ type: 'text', text }],
});

// The 5 real simulated clinical CBT sessions for tested user Elena Rostova (0ccbaecf-43fd-4b7f-91e0-d32233482b07)
export const demoThreads: Thread[] = [
  {
    id: '2874bfce-2351-441e-9575-ed4e4da31684',
    title: 'Imposter Panic & Reframe Recall',
    date: 'Today',
    agent: 'Weekly main therapist',
    isVoice: true,
    sessionType: 'voice',
    messages: [
      textMessage(
        '8a1b2ff1-c876-474d-bf9a-5ba3f9d89b54',
        'user',
        'Therapist, I am feeling that old imposter panic creeping up again like in our very first session. Can you remind me about that presentation with Marcus on Project Aurora? What cognitive distortion was I stuck in, and what was the reframed thought we agreed on?'
      ),
      textMessage(
        '0c71e466-afda-4633-859a-fcf32e55b9e7',
        'assistant',
        'Hello Elena. I am so glad you reached out. It takes a lot of self-awareness to recognize when that familiar wave of anxiety starts to crest. Let us look back at our very first session: you came to me feeling overwhelmed by the feedback Marcus gave you regarding the Project Aurora presentation. At that time, you were caught in a classic pattern of Catastrophizing—your mind took a critique of your distributed cache failover architecture and spiraled into the belief that you were on the verge of being fired. Together, we worked to ground that thought into this reframe: "Constructive critique on distributed failover architecture is a normal part of engineering review, not proof that I am incompetent or getting fired. I solved three critical bugs last sprint and cut query latency by 40%." What I want you to notice, Elena, is how far you have come since then.'
      ),
      textMessage(
        '11eb33da-9d4d-4b90-b660-364aeef7f53d',
        'user',
        'Thank you so much. Hearing that reframe again and knowing you remember exactly what happened clears the fog completely. I feel grounded and ready for tomorrow.'
      ),
      textMessage(
        '7a787a24-51fe-41f2-b82c-07e7c9bbf09c',
        'assistant',
        'You are more than ready, Elena. Carry that reframe and your morning breath with you. Remember, feedback is data for growth, not a verdict on your worth.'
      ),
    ],
    summary:
      'An exploration of imposter anxiety triggered by an upcoming presentation, identifying catastrophizing and re-applying a validated cognitive reframe with Marcus and Project Aurora.',
    themes: ['Catastrophizing', 'Imposter Panic', 'Memory Recall'],
    takeaway:
      'Constructive critique on distributed failover architecture is a normal part of engineering review, not proof that I am incompetent or getting fired. I solved three critical bugs last sprint and cut query latency by 40%.',
    ended: true,
  },
  {
    id: '134996ad-542e-49b4-a342-ef9780ecce1a',
    title: 'Midday Grounding for Stakeholder Demo',
    date: 'Today',
    agent: 'On-demand therapist',
    isVoice: false,
    sessionType: 'chat',
    messages: [
      textMessage(
        'be86eedb-da6e-4229-8bcf-2d4989ed2ad3',
        'assistant',
        "Hope companion here Elena. Take a slow breath. I'm with you. What do you need right now?"
      ),
      textMessage(
        '5201e993-fee8-4a55-82b3-b53ad1c7b247',
        'user',
        'Just feeling a quick spike of tension right before a cross-team stakeholder demo. Need a 2-minute reset.'
      ),
      textMessage(
        '4286d95b-723b-4219-bc75-7192d2af3794',
        'assistant',
        "Let's do 3 cycles of 4-7-8 breathing together. Breathe in... hold... and release slowly. You are prepared, and this demo is just a conversation."
      ),
      textMessage(
        '4842d115-7a52-4f25-8dd7-6955554a3c95',
        'user',
        'Thank you. Feeling much more grounded now.'
      ),
    ],
    summary:
      'We focused on your experience of acute performance anxiety prior to a cross-team stakeholder demo. Together, we utilized a 4-7-8 breathing practice to regulate the physical stress response and developed a cognitive reframe to normalize the situation.',
    themes: ['Performance Anxiety', 'Fortune Telling', '4-7-8 Breathing'],
    takeaway: 'This demo is just a conversation, and I am prepared.',
    ended: true,
  },
  {
    id: '7f48f5f7-e4a4-41fe-887d-55a5253fef53',
    title: 'Work-Life Boundaries with Julian',
    date: 'Yesterday',
    agent: 'Weekly main therapist',
    isVoice: true,
    sessionType: 'voice',
    messages: [
      textMessage(
        '9bc5b755-f946-4746-89a1-2c91e4543136',
        'assistant',
        'Welcome back Elena. How has your week unfolded, and what would you like to unpack today?'
      ),
      textMessage(
        '903487fb-8736-4aaa-954d-684ad8f983bf',
        'user',
        "My partner Julian pointed out that I was still reviewing pull requests on my laptop at 11 PM. I noticed a rigid 'Should Statement' in my head: 'I should always be immediately responsive to every PR so nobody thinks I am slacking.'"
      ),
      textMessage(
        '00126027-2d8c-4662-a172-d42f87854c27',
        'assistant',
        "Spotting the 'Should Statement' is tremendous awareness. How can we reframe that unrealistic expectation?"
      ),
      textMessage(
        '528c418a-58aa-454e-af27-9f4c9e783852',
        'user',
        "I reframed it to: 'Closing my laptop at 8 PM protects my mental clarity, which allows me to write better architecture code the next morning.' Julian and I even went for an evening walk instead."
      ),
      textMessage(
        '1a4e6528-d4d5-420a-8933-8e6b904f6857',
        'assistant',
        'That is a healthy boundary that honors both your engineering craft and your wellbeing. Keep logging those boundary wins.'
      ),
    ],
    summary:
      "We identified a rigid 'Should Statement' regarding professional responsiveness that was leading to late-night overworking. Together, we explored cognitive reframing to protect your mental clarity and established an 8 PM laptop boundary with Julian.",
    themes: ['Should Statements', 'Boundaries', 'Work Stress'],
    takeaway:
      'Closing my laptop at 8 PM protects my mental clarity, which allows me to write better architecture code the next morning.',
    ended: true,
  },
  {
    id: 'eb6b1c29-8f6f-499d-aea3-44eb35010492',
    title: 'Morning Physiological Sigh & Standup with Clara',
    date: 'Yesterday',
    agent: 'Daily exercise therapist',
    isVoice: true,
    sessionType: 'voice',
    messages: [
      textMessage(
        '62454e8d-4136-4e8b-a86f-eb80ec3e8ccc',
        'assistant',
        "Good morning Elena. Let's do your daily 5-minute practice check-in. Did you try the physiological sigh breathing this morning?"
      ),
      textMessage(
        '988f451d-f62b-4528-9186-cc868c3a0363',
        'user',
        'Yes! I did the 5-minute physiological sigh before our 9:30 AM standup. My colleague Clara asked me to pair on documentation, and instead of feeling dread, I felt steady.'
      ),
      textMessage(
        '5544bc5a-01d1-4b06-b05d-9337c4941491',
        'assistant',
        "That is fantastic progress. You applied the tool in real life and regulated your nervous system before a trigger. Let's record this win in your daily practice streak."
      ),
    ],
    summary:
      'We reviewed your successful practice of physiological sigh breathing to regulate your nervous system before work triggers. By applying this technique, you shifted from anticipated dread to feeling steady and grounded during collaboration with Clara.',
    themes: ['Somatic Regulation', 'Fortune Telling', 'Daily Practice'],
    takeaway: 'Continue daily physiological sigh breathing before known work triggers.',
    ended: true,
  },
  {
    id: '94004602-c2dd-4853-94c8-b3a95c6a1bce',
    title: 'Project Aurora Presentation & Marcus Critique',
    date: 'Yesterday',
    agent: 'Weekly main therapist',
    isVoice: true,
    sessionType: 'voice',
    messages: [
      textMessage(
        '6fda5e68-1763-4fca-9e1b-00aa15590775',
        'assistant',
        "Hello Elena Rostova, welcome to Hope. I'm so glad you're here. This is a private, safe space to take a breath and speak freely. What brings you to this quiet space today?"
      ),
      textMessage(
        '502b2cc5-bd0b-4794-a26b-9126dbb932c8',
        'user',
        "I'm having overwhelming panic about work. Yesterday during our all-hands presentation on Project Aurora, my engineering director Marcus harshly questioned my distributed cache failover architecture in front of 12 senior engineers. My throat tightened, and I spiraled into thinking: 'I am completely incompetent, an imposter, and Marcus will fire me before my probation ends.'"
      ),
      textMessage(
        'e1dae123-d7a0-4e67-9965-e0ed689e9f38',
        'assistant',
        "Thank you for trusting me with that, Elena. That sounds terrifying and exhausting. Notice that automatic thought: 'I am completely incompetent, and Marcus will fire me.' In CBT, we call this Catastrophizing and All-or-Nothing Thinking. Let's look at the evidence together: did Marcus critique your entire engineering competency, or specifically that failover diagram?"
      ),
      textMessage(
        '8eee85a8-b008-454d-ba19-1a50b12d40e3',
        'user',
        'It was specifically about edge-case race conditions on the failover cluster. Actually, earlier in the same sprint Marcus praised my query optimization that cut database latency by 40%.'
      ),
      textMessage(
        '1a19979c-ebf0-4dae-aac0-87d772413a9c',
        'assistant',
        "That is significant, objective evidence against the thought of being incompetent. How can we reframe Marcus's critique into a balanced thought?"
      ),
      textMessage(
        '4a7bd7d7-bb13-4e21-a3b2-62921f395e17',
        'user',
        "A balanced thought would be: 'Constructive critique on distributed failover architecture is a normal part of engineering review, not proof that I am incompetent or getting fired. I solved three critical bugs last sprint and cut query latency by 40%.'"
      ),
      textMessage(
        '7d8f150d-ed4b-405d-95eb-d20dbb588eb7',
        'assistant',
        'That is an empowering, rational reframe. Notice how your chest feels now. For your homework this week, practice a 5-minute morning physiological sigh breathing session each morning, and log any catastrophic spirals into a 3-Column Thought Record.'
      ),
      textMessage(
        '5c39135d-8724-4730-b8ad-20b529f3c4a4',
        'user',
        'I will do that. The 5-minute breathing and the 3-column thought record.'
      ),
    ],
    summary:
      'We explored acute work-related anxiety triggered by feedback from your engineering director Marcus. Through Socratic dialogue and evidence examination, we identified cognitive distortions and shifted from a catastrophic spiral to a balanced, grounded view of your competence.',
    themes: ['Catastrophizing', 'All-or-Nothing Thinking', 'Work Anxiety'],
    takeaway:
      'Feedback is data for growth, not a verdict on your worth. Complete your 5-minute morning physiological sigh and 3-column thought record.',
    ended: true,
  },
];

const STORAGE_KEY = 'hope-conversations-v2';

type Store = {
  threads: Thread[];
  ready: boolean;
  error: string;
  save: (thread: Thread) => void;
  remove: (id: string) => Promise<void>;
  reloadFromBackend: () => Promise<void>;
  fetchThreadById: (id: string) => Promise<Thread | null>;
};

const ThreadContext = createContext<Store | null>(null);

function formatDate(isoOrTs?: any): string {
  if (!isoOrTs) return 'Recently';
  try {
    const d = typeof isoOrTs === 'number' ? new Date(isoOrTs * 1000) : new Date(isoOrTs);
    const now = new Date();
    const diffHours = (now.getTime() - d.getTime()) / (1000 * 60 * 60);
    if (diffHours < 24) return 'Today';
    if (diffHours < 48) return 'Yesterday';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

export function deriveObjectiveTitle(s: any): string {
  const room = String(s.roomName || '').toLowerCase();
  const ext = s.rawTranscript?.extractedData || s.extractedData || {};
  const ep = ext.episodes?.[0] || {};
  const mode = (ext.mode || (room.includes('daily') ? 'DAILY' : room.includes('ondemand') || room.includes('companion') ? 'ON_DEMAND' : 'WEEKLY')).toUpperCase();

  // 1. Room-based preset overrides
  if (room.includes('recall')) return 'Imposter Panic & Reframe Recall';
  if (room.includes('boundaries')) return 'Work-Life Boundaries with Julian';
  if (room.includes('daily_drill')) return 'Morning Physiological Sigh & Standup with Clara';
  if (room.includes('ondemand_calm')) return 'Midday Grounding for Stakeholder Demo';
  if (room.includes('weekly_intake') || room.includes('initial')) return 'Project Aurora Presentation & Marcus Critique';

  const isGreeting = (str: string) =>
    /^(hi|hello|hey|hey there|good morning|good afternoon|good evening|sup|yo|greetings|howdy|test)[.!?]?$/i.test(str.trim());

  // 2. If object already has an existing valid title that isn't a greeting or boilerplate
  if (s.title && typeof s.title === 'string') {
    const rawT = s.title.trim();
    if (
      rawT.length > 3 &&
      !isGreeting(rawT) &&
      !/^brief\s+check-in/i.test(rawT) &&
      !/^the\s+(patient|client|session)/i.test(rawT) &&
      !/^initiated\s+contact/i.test(rawT) &&
      rawT !== 'CBT Session' &&
      rawT !== 'New conversation' &&
      rawT !== 'Mindful Reflection'
    ) {
      return rawT.length > 40 ? rawT.slice(0, 38) + '…' : rawT;
    }
  }

  // 3. Extracted title from Gemini CBT extractor
  if (ext.title && typeof ext.title === 'string') {
    const trimmed = ext.title.trim();
    if (
      trimmed.length > 3 &&
      !isGreeting(trimmed) &&
      !/patient|client|session|brief|check-in|initiated/i.test(trimmed)
    ) {
      return trimmed.length > 40 ? trimmed.slice(0, 38) + '…' : trimmed;
    }
  }

  // 4. Check message turns for substantive user topics FIRST (Real user objective)
  const rawMessages = Array.isArray(s.messages) && s.messages.length > 0
    ? s.messages
    : (Array.isArray(s.rawTranscript?.turns) ? s.rawTranscript.turns : []);

  const substantiveUserTurn = rawMessages.find((m: any) => {
    const role = (m.role || '').toLowerCase();
    const content = (m.content || (m.parts ? m.parts[0]?.text : '') || m.text || '').trim();
    return role === 'user' && content.length > 0 && !isGreeting(content);
  });

  const userObjective = substantiveUserTurn
    ? (substantiveUserTurn.content || (substantiveUserTurn.parts ? substantiveUserTurn.parts[0]?.text : '') || substantiveUserTurn.text || '').trim()
    : '';

  if (userObjective) {
    let cleanUser = userObjective
      .replace(/^(hi|hello|hey|hey there|good morning)[,\s]+(hope|therapist|there)?[,\s]*/i, '')
      .replace(/^(i'm feeling|i feel like|i am feeling|can we talk about|i want to talk about|i need help with|can you help me|help me with|help me|feeling)\s+/i, '')
      .trim();
    cleanUser = cleanUser.charAt(0).toUpperCase() + cleanUser.slice(1);
    cleanUser = cleanUser.replace(/[?.!]+$/, '');
    if (cleanUser.length > 3) {
      return cleanUser.length > 38 ? cleanUser.slice(0, 35) + '…' : cleanUser;
    }
  }

  // 5. Episode trigger if present (punchy 2-4 word objective)
  if (ep.trigger?.name && typeof ep.trigger.name === 'string') {
    const trig = ep.trigger.name.trim();
    if (trig.length > 2 && !/patient|session|check-in|initiated/i.test(trig)) {
      const formatted = trig.charAt(0).toUpperCase() + trig.slice(1);
      return formatted.length > 40 ? formatted.slice(0, 38) + '…' : formatted;
    }
  }

  // 6. Clean summary if present, filtering out clinical boilerplate
  const summary = (s.summary || ext.summary || '').trim();
  if (
    summary &&
    !/no recorded speech turns/i.test(summary) &&
    !/^the\s+(patient|client)\s+initiated\s+contact/i.test(summary) &&
    !/^the\s+patient\s+has\s+not\s+yet\s+provided/i.test(summary) &&
    !/has\s+initiated/i.test(summary) &&
    !/^the\s+session\s+initiated\s+with/i.test(summary) &&
    !/^brief\s+session/i.test(summary)
  ) {
    let cleaned = summary
      .replace(/^the\s+(patient|client)\s+(sought\s+support\s+to|explored|discussed|presented\s+with|reached\s+out\s+to|is\s+experiencing|struggles\s+with|navigated|reflected\s+on)\s+/i, '')
      .replace(/^the\s+(patient|client)\s+/i, '')
      .replace(/^brief\s+check-in\s+with\s+on-demand\s+companion[.:]?\s*/i, '')
      .replace(/^brief\s+check-in[.:]?\s*/i, '')
      .replace(/^a\s+therapeutic\s+reflection\s+focused\s+on\s+/i, '')
      .replace(/^a\s+supportive\s+grounding\s+reflection\s+on\s+/i, '')
      .trim();

    cleaned = cleaned.replace(/\.$/, '');

    if (
      cleaned.length > 3 &&
      !/^(brief|patient|hi|hello|initiated|has\s+initiated|the\s+session)/i.test(cleaned)
    ) {
      const words = cleaned.split(/\s+/);
      let shortPhrase = words.slice(0, 6).join(' ');
      shortPhrase = shortPhrase.charAt(0).toUpperCase() + shortPhrase.slice(1);
      if (words.length > 6 || cleaned.length > shortPhrase.length + 3) {
        shortPhrase += '…';
      }
      return shortPhrase.length > 40 ? shortPhrase.slice(0, 38) + '…' : shortPhrase;
    }
  }

  // 7. Episode distortion fallback
  if (ep.distortion) {
    return `Reframing ${ep.distortion}`;
  }

  // 8. Clean, mode-aware objective title fallback (Never contains "brief" or "patient")
  if (mode === 'WEEKLY') {
    return 'Weekly Therapy Check-in';
  } else if (mode === 'DAILY') {
    return 'Daily CBT Practice';
  }
  return 'Mindful Centering & Grounding';
}

/**
 * Normalizes any clinical third-person phrasing into first-person plural
 * ("We explored...", "We discussed...", "Together, we identified...").
 */
export function toFirstPersonSummary(summary: string): string {
  if (!summary || typeof summary !== 'string') return summary;

  let text = summary.trim();

  // Sentence beginnings
  text = text
    .replace(/^the\s+(?:patient|client)\s+initiated\s+the\s+conversation\s+(?:by\s+)?expressing\s+/i, 'We began by exploring ')
    .replace(/^the\s+(?:patient|client)\s+initiated\s+contact\s+(?:to\s+discuss|expressing|seeking)\s+/i, 'We connected to explore ')
    .replace(/^the\s+(?:patient|client)\s+(?:reached\s+out|came\s+in)\s+(?:to\s+discuss|feeling|seeking|expressing)\s+/i, 'We connected to explore ')
    .replace(/^the\s+(?:patient|client)\s+(?:sought\s+support\s+to|presented\s+with|sought\s+help\s+with)\s+/i, 'We focused on ')
    .replace(/^the\s+(?:patient|client)\s+explored\s+/i, 'We explored ')
    .replace(/^the\s+(?:patient|client)\s+discussed\s+/i, 'We discussed ')
    .replace(/^the\s+(?:patient|client)\s+shared\s+/i, 'You shared ')
    .replace(/^the\s+(?:patient|client)\s+described\s+/i, 'You described ')
    .replace(/^the\s+(?:patient|client)\s+reported\s+/i, 'You shared ')
    .replace(/^the\s+(?:patient|client)\s+stated\s+/i, 'You reflected that ')
    .replace(/^the\s+(?:patient|client)\s+expressed\s+/i, 'We explored your feelings of ')
    .replace(/^the\s+(?:patient|client)\s+experienced\s+/i, 'We focused on your experience of ')
    .replace(/^the\s+(?:patient|client)\s+struggled\s+with\s+/i, 'We looked into the challenges around ')
    .replace(/^the\s+(?:patient|client)\s+reflected\s+on\s+/i, 'We reflected together on ')
    .replace(/^the\s+(?:patient|client)\s+navigated\s+/i, 'We navigated ')
    .replace(/^the\s+(?:patient|client)\s+identified\s+/i, 'Together, we identified ');

  // Mid-sentence replacements
  text = text
    .replace(/which\s+they\s+reported\s+was\s+leading\s+to/gi, 'and how it was contributing to')
    .replace(/which\s+they\s+felt\s+was/gi, 'which felt like it was')
    .replace(/which\s+the\s+(?:patient|client)\s+reported\s+/gi, 'which you noted ')
    .replace(/(?:the\s+)?companion\s+validated\s+their\s+feelings\s+and\s+explored/gi, 'We validated these feelings and explored')
    .replace(/(?:the\s+)?companion\s+(?:and\s+the\s+patient|guided\s+the\s+patient\s+to|helped\s+the\s+patient\s+to)/gi, 'we worked together to')
    .replace(/(?:the\s+)?companion\s+guided\s+them\s+to/gi, 'we worked together to')
    .replace(/(?:the\s+)?companion\s+introduced\s+/gi, 'we introduced ')
    .replace(/(?:the\s+)?companion\s+explored\s+/gi, 'we explored ')
    .replace(/(?:the\s+)?companion\s+provided\s+/gi, 'we practiced ')
    .replace(/(?:the\s+)?companion\s+suggested\s+/gi, 'we explored ')
    .replace(/(?:the\s+)?companion\s+encouraged\s+/gi, 'we encouraged ')
    .replace(/(?:the\s+)?companion\s+helped\s+/gi, 'we worked to ')
    .replace(/(?:the\s+)?companion\s+validated\s+/gi, 'we validated ')
    .replace(/leading\s+(?:to\s+)?the\s+(?:patient|client)\s+to\s+identify/gi, 'helping you identify')
    .replace(/leading\s+(?:to\s+)?the\s+(?:patient|client)\s+to\s+/gi, 'guiding you to ')
    .replace(/(?:the\s+)?(?:patient|client)\s+later\s+expressed\s+a\s+desire\s+to\s+/gi, 'We also discussed your desire to ')
    .replace(/(?:the\s+)?(?:patient|client)\s+also\s+expressed\s+/gi, 'You also shared ')
    .replace(/(?:the\s+)?(?:patient|client)\s+noted\s+/gi, 'You noted ')
    .replace(/indicating\s+a\s+need\s+for\s+more\s+in-depth\s+cognitive\s+work/gi, 'laying the groundwork for deeper cognitive reflection together')
    .replace(/the\s+(?:patient|client)'s/gi, 'your')
    .replace(/\b(?:patient|client)'s\b/gi, 'your')
    .replace(/the\s+(?:patient|client)\b/gi, 'you')
    .replace(/the\s+companion\b/gi, 'we')
    .replace(/\btheir\s+(feelings|thoughts|emotions|anxiety|concerns|fear|fears|reaction|reactions|situation|work|life|mind|goals|progress|triggers)\b/gi, 'your $1')
    .replace(/\bto\s+challenge\s+their\b/gi, 'to challenge your')
    .replace(/\bfrom\s+their\b/gi, 'from your')
    .replace(/\babout\s+their\b/gi, 'about your')
    .replace(/\bwith\s+their\b/gi, 'with your')
    .replace(/\binto\s+their\b/gi, 'into your')
    .replace(/\bfor\s+their\b/gi, 'for your');

  // Capitalize sentence beginnings
  text = text.replace(/(?:^|[.!?]\s+)([a-z])/g, (_, letter) => letter.toUpperCase());

  // Clean up any duplicates
  text = text
    .replace(/\bwe\s+we\b/gi, 'we')
    .replace(/\byou\s+you\b/gi, 'you')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return text;
}

export function formatSessionToThread(s: any): Thread {
  const room = String(s.roomName || '').toLowerCase();
  const ext = s.rawTranscript?.extractedData || {};
  const ep = ext.episodes?.[0] || {};

  // Formulate humanized title focusing strictly on the main objective
  const title = deriveObjectiveTitle(s);

  // Determine mode / agent name
  const mode = (ext.mode || (room.includes('daily') ? 'DAILY' : room.includes('ondemand') || room.includes('companion') ? 'ON_DEMAND' : 'WEEKLY')).toUpperCase();
  const agentName =
    mode === 'DAILY'
      ? 'Daily exercise therapist'
      : mode === 'ON_DEMAND'
      ? 'On-demand therapist'
      : 'Weekly main therapist';

  // Determine whether it is a voice agent session or chat session
  const isVoice = room.startsWith('therapy_') || s.isVoice === true || (!room.startsWith('ondemand_chat_') && !room.includes('_chat_'));

  // Format messages
  const rawMessages = Array.isArray(s.messages) && s.messages.length > 0
    ? s.messages
    : (Array.isArray(s.rawTranscript?.turns) ? s.rawTranscript.turns : []);

  const msgs: UIMessage[] = rawMessages.map((m: any, idx: number) =>
    textMessage(
      m.id || `m_${s.id}_${idx}`,
      m.role === 'assistant' || m.role === 'therapist' ? 'assistant' : 'user',
      m.content || m.text || ''
    )
  );

  const rawSummary = s.summary || ext.summary || 'A therapeutic reflection focused on understanding patterns and cognitive reframing.';
  const summary = toFirstPersonSummary(rawSummary);
  const themes = ep.distortion
    ? [ep.distortion, ep.trigger?.category || 'Work Stress', 'Cognitive Restructuring']
    : (s.themes || ['Cognitive Restructuring', 'Self-Compassion']);
  const takeaway = ep.reframed_thought || ext.homework?.exercise_name || s.homework || 'Continue noticing automatic thoughts and applying gentle reframing.';

  return {
    id: s.id,
    title,
    date: formatDate(s.startedAt || s.started_at || s.createdAt),
    agent: agentName,
    messages: msgs.length > 0 ? msgs : [
      textMessage('m1', 'assistant', summary)
    ],
    summary,
    themes,
    takeaway,
    ended: true,
    isVoice,
    sessionType: isVoice ? 'voice' : 'chat',
  };
}

export function ThreadProvider({ children }: { children: ReactNode }) {
  const [threads, setThreads] = useState<Thread[]>(demoThreads);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  const loadBackendSessions = useCallback(async () => {
    try {
      let userId = '0ccbaecf-43fd-4b7f-91e0-d32233482b07';
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('hope_current_user');
        if (stored) {
          try {
            userId = JSON.parse(stored)?.id || userId;
          } catch {}
        }
        if (!userId) {
          const cookieMatch = document.cookie.match(/(^| )cbt_patient_id=([^;]+)/);
          if (cookieMatch) userId = decodeURIComponent(cookieMatch[2]);
        }
      }

      const res = await fetch(`/api/sessions?userId=${encodeURIComponent(userId)}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.sessions)) {
          const validSessions = data.sessions.filter(
            (s: any) =>
              (Array.isArray(s.messages) && s.messages.length > 0) ||
              (Array.isArray(s.rawTranscript?.turns) && s.rawTranscript.turns.length > 0)
          );
          if (validSessions.length > 0) {
            const mappedThreads: Thread[] = validSessions.map(formatSessionToThread);
            setThreads(mappedThreads);
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(mappedThreads));
            } catch {}
            return;
          } else if (userId !== '0ccbaecf-43fd-4b7f-91e0-d32233482b07') {
            setThreads([]);
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
            } catch {}
            return;
          }
        }
      }
      // If default test user and backend returned no sessions yet, use demoThreads
      setThreads(userId === '0ccbaecf-43fd-4b7f-91e0-d32233482b07' ? demoThreads : []);
    } catch (err) {
      console.warn('[ThreadProvider] Backend session fetch note:', err);
      setThreads([]);
    }
  }, []);

  const fetchThreadById = useCallback(async (id: string): Promise<Thread | null> => {
    // Check if we already have it in state with messages
    const cached = threads.find((t) => t.id === id);
    if (cached && cached.messages.length > 0) {
      return cached;
    }

    try {
      const res = await fetch(`/api/sessions/${encodeURIComponent(id)}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.session) {
          const thread = formatSessionToThread(data.session);
          setThreads((prev) => {
            const next = [thread, ...prev.filter((t) => t.id !== id)];
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            } catch {}
            return next;
          });
          return thread;
        }
      }
    } catch (e) {
      console.warn(`[ThreadProvider] Failed to fetch session ${id}:`, e);
    }

    // Fall back to demoThreads
    const fallback = demoThreads.find((t) => t.id === id);
    return fallback || null;
  }, [threads]);

  useEffect(() => {
    try {
      // Clear out obsolete storage keys from previous dummy iterations
      if (typeof window !== 'undefined') {
        localStorage.removeItem('still-demo-conversations-v1');
      }

      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (
          Array.isArray(parsed) &&
          parsed.every((t) => t && typeof t.id === 'string' && Array.isArray(t.messages))
        ) {
          // Check if it has any old dummy sessions
          const hasDummy = parsed.some((t: any) =>
            t.id === 'finding-a-little-balance' ||
            t.id === 'a-calmer-morning' ||
            t.id === 'making-room-for-myself'
          );
          if (!hasDummy && parsed.length > 0) {
            const sanitizedParsed = (parsed as Thread[]).map((t: any) => ({
              ...t,
              title: deriveObjectiveTitle(t),
            }));
            setThreads(sanitizedParsed);
          } else {
            setThreads(demoThreads);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(demoThreads));
          }
        }
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(demoThreads));
      }
    } catch {
      setError("This browser couldn't save your conversations.");
    }

    loadBackendSessions().finally(() => {
      setReady(true);
    });

    const handleSessionUpdate = () => {
      loadBackendSessions();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('hope-session-updated', handleSessionUpdate);
      window.addEventListener('focus', handleSessionUpdate);
      return () => {
        window.removeEventListener('hope-session-updated', handleSessionUpdate);
        window.removeEventListener('focus', handleSessionUpdate);
      };
    }
  }, [loadBackendSessions]);

  function update(next: Thread[]) {
    setThreads(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      setError("This browser couldn't save your conversations.");
    }
  }

  const remove = useCallback(async (id: string) => {
    // 1. Optimistically remove from state and local storage
    setThreads((prev) => {
      const next = prev.filter((t) => t.id !== id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    // 2. Call server endpoint to delete from PostgreSQL and FalkorDB
    try {
      await fetch(`/api/sessions/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      console.warn('[ThreadProvider] Error deleting session on backend:', err);
    }
  }, []);

  return (
    <ThreadContext.Provider
      value={{
        threads,
        ready,
        error,
        save: (thread) => update([thread, ...threads.filter((t) => t.id !== thread.id)]),
        remove,
        reloadFromBackend: loadBackendSessions,
        fetchThreadById,
      }}
    >
      {children}
    </ThreadContext.Provider>
  );
}

export function useThreads() {
  const store = useContext(ThreadContext);
  if (!store) throw new Error('Conversation provider is missing');
  return store;
}

export function simulatedReply(text: string) {
  if (/danger|suicid|kill myself|hurt myself/i.test(text))
    return "I'm sorry you're feeling this much pain. This space cannot provide crisis care. If you're in immediate danger, call your local emergency number now. You can also reach out to someone you trust or a local crisis service.";
  if (/aurora|marcus|failover|presentation|imposter/i.test(text))
    return "I remember your presentation on Project Aurora and Marcus's feedback on cache failover. Remember the cognitive reframe we built: constructive technical critique is a standard engineering review process, not a verdict on your competence. You solved 3 critical bugs and cut latency by 40%.";
  if (/boundary|laptop|julian|work late/i.test(text))
    return "Setting that 8 PM laptop boundary with Julian is essential for your mental clarity. Closing the laptop protects your wellbeing so you can build better architecture code the next morning.";
  if (/sigh|breath|standup|clara/i.test(text))
    return "Let's do two quick inhales through the nose and one slow, complete exhale. You regulated your nervous system during standup before, and you can do it right now.";
  if (/work|overwhelm|stress/i.test(text))
    return "It sounds like there's a lot asking for your attention right now. You don't need to sort everything out at once.\n\nWhat feels like the heaviest part of it today? We can start there, at your pace.";
  return "Thank you for sharing that. We can take a moment with what you're feeling, without needing to change it right away.\n\nWhat would feel most helpful right now — making sense of it, or simply having a little space to talk?";
}
