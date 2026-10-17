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
      'The patient reached out during an acute episode of imposter anxiety triggered by an upcoming presentation. The assistant successfully utilized historical context from graph memory to help the patient recall Marcus and Project Aurora, identify catastrophizing, and re-apply their validated cognitive reframe.',
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
      'The patient experienced acute performance anxiety prior to a cross-team stakeholder demo. The assistant utilized a 4-7-8 breathing intervention to regulate physiological stress response and provided a cognitive reframe to normalize the high-stakes situation.',
    themes: ['Performance Anxiety', 'Fortune Telling', '4-7-8 Breathing'],
    takeaway: 'This demo is just a conversation, and I am prepared.',
    ended: true,
  },
  {
    id: '7f48f5f7-e4a4-41fe-887d-55a5253fef53',
    title: 'Work-Life Boundaries with Julian',
    date: 'Yesterday',
    agent: 'Weekly main therapist',
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
      "Elena identified a 'Should Statement' regarding her professional responsiveness that led to overworking. She successfully applied cognitive reframing to prioritize her mental clarity and wellbeing, resulting in an 8 PM laptop boundary with Julian.",
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
      'Elena successfully utilized physiological sigh breathing to regulate her nervous system before a work-related trigger. By applying this tool, she shifted from a state of anticipated dread to feeling steady during collaboration with Clara.',
    themes: ['Somatic Regulation', 'Fortune Telling', 'Daily Practice'],
    takeaway: 'Continue daily physiological sigh breathing before known work triggers.',
    ended: true,
  },
  {
    id: '94004602-c2dd-4853-94c8-b3a95c6a1bce',
    title: 'Project Aurora Presentation & Marcus Critique',
    date: 'Yesterday',
    agent: 'Weekly main therapist',
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
      'Elena presented with acute work-related anxiety triggered by a public critique from her manager Marcus. Through Socratic questioning and evidence-based reframing, she successfully identified cognitive distortions and shifted from a catastrophic perspective to a balanced, evidence-based view of her competence.',
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
  remove: (id: string) => void;
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

export function formatSessionToThread(s: any): Thread {
  const room = String(s.roomName || '').toLowerCase();
  const ext = s.rawTranscript?.extractedData || {};
  const ep = ext.episodes?.[0] || {};

  // Formulate humanized title
  let title = s.summary ? (s.summary.length > 45 ? s.summary.slice(0, 42) + '…' : s.summary) : 'CBT Session';
  if (room.includes('recall')) {
    title = 'Imposter Panic & Reframe Recall';
  } else if (room.includes('boundaries')) {
    title = 'Work-Life Boundaries with Julian';
  } else if (room.includes('daily_drill')) {
    title = 'Morning Physiological Sigh & Standup with Clara';
  } else if (room.includes('ondemand_calm')) {
    title = 'Midday Grounding for Stakeholder Demo';
  } else if (room.includes('weekly_intake') || room.includes('initial')) {
    title = 'Project Aurora Presentation & Marcus Critique';
  }

  // Determine mode / agent name
  const mode = (ext.mode || (room.includes('daily') ? 'DAILY' : room.includes('ondemand') ? 'ON_DEMAND' : 'WEEKLY')).toUpperCase();
  const agentName =
    mode === 'DAILY'
      ? 'Daily exercise therapist'
      : mode === 'ON_DEMAND'
      ? 'On-demand therapist'
      : 'Weekly main therapist';

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

  const summary = s.summary || ext.summary || 'A therapeutic reflection focused on understanding patterns and cognitive reframing.';
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
          if (data.sessions.length > 0) {
            const mappedThreads: Thread[] = data.sessions.map(formatSessionToThread);
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
            setThreads(parsed);
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
  }, [loadBackendSessions]);

  function update(next: Thread[]) {
    setThreads(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      setError("This browser couldn't save your conversations.");
    }
  }

  return (
    <ThreadContext.Provider
      value={{
        threads,
        ready,
        error,
        save: (thread) => update([thread, ...threads.filter((t) => t.id !== thread.id)]),
        remove: (id) => update(threads.filter((t) => t.id !== id)),
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
