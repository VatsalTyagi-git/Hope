import { CompanionType, Conversation, Message, SessionSummary } from '../types';
import { COMPANIONS } from './companionService';

const CONVERSATIONS_STORAGE_KEY = 'hope_conversations_list';

const SEED_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv_today_1',
    title: 'Finding a little balance',
    companionType: 'on-demand',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [
      {
        id: 'msg_1',
        role: 'user',
        content: "I've been feeling pulled in so many directions. Work has been busy and I haven't had much time for myself.",
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      },
      {
        id: 'msg_2',
        role: 'assistant',
        content: "It sounds like you've been giving a lot of yourself lately, with very little room to recharge. That can feel exhausting.\nWhen you think about having a little time just for you, what would that look like?",
        timestamp: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
      },
      {
        id: 'msg_3',
        role: 'user',
        content: "Honestly, just going for a walk without checking my phone. I used to do that every evening.",
        timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
      },
      {
        id: 'msg_4',
        role: 'assistant',
        content: "That sounds like a small but meaningful way to come back to yourself. You already know something that feels good for you.\nWhat if you gave yourself ten minutes for that walk today — not as another thing to achieve, but as a moment that's yours?",
        timestamp: new Date(Date.now() - 1000 * 60 * 7).toISOString(),
      },
    ],
    summary: {
      id: 'sum_1',
      conversationId: 'conv_today_1',
      title: 'Finding a little balance',
      dateLabel: 'Today • On-demand therapist',
      whatWeExplored: "You explored feeling stretched between work and your own needs. Evening walks emerged as a familiar, restorative practice that you'd like to return to.",
      tags: ['Work-life balance', 'Self-care', 'Feeling overwhelmed'],
      carryWithYou: 'Make space for a ten-minute, phone-free walk.',
      createdAt: new Date().toISOString(),
    },
  },
  {
    id: 'conv_yesterday_1',
    title: 'A calmer morning',
    companionType: 'weekly',
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    messages: [
      {
        id: 'msg_y1',
        role: 'user',
        content: 'Mornings always feel frantic. Before I even get out of bed, I start listing everything that could go wrong.',
        timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      },
      {
        id: 'msg_y2',
        role: 'assistant',
        content: "When our mind jumps straight into anticipating problems, our nervous system wakes up in alarm mode before our feet touch the floor. Let's look at one of those morning worries together. What was one specific thought you had today?",
        timestamp: new Date(Date.now() - 24 * 3600 * 1000 + 60000).toISOString(),
      },
      {
        id: 'msg_y3',
        role: 'user',
        content: "I thought: 'If I don't answer every Slack message by 9 AM, everyone will think I'm slacking.'",
        timestamp: new Date(Date.now() - 24 * 3600 * 1000 + 120000).toISOString(),
      },
      {
        id: 'msg_y4',
        role: 'assistant',
        content: "Notice the Mind Reading in that thought. You're assuming others will jump to the worst conclusion. What would be a more balanced perspective to remind yourself before opening your laptop?",
        timestamp: new Date(Date.now() - 24 * 3600 * 1000 + 180000).toISOString(),
      },
    ],
    summary: {
      id: 'sum_2',
      conversationId: 'conv_yesterday_1',
      title: 'A calmer morning',
      dateLabel: 'Yesterday • Weekly main therapist',
      whatWeExplored: "Examined morning anticipatory anxiety and the automatic thought that delayed replies equal incompetence. Practiced cognitive reframing.",
      tags: ['Work stress', 'Mind reading', 'Morning routine'],
      carryWithYou: 'Take three unhurried breaths before unlocking your phone tomorrow morning.',
      createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    },
  },
  {
    id: 'conv_lastweek_1',
    title: 'Making room for myself',
    companionType: 'daily',
    createdAt: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
    messages: [
      {
        id: 'msg_lw1',
        role: 'user',
        content: 'I managed to take a 10-minute break today without guilt.',
        timestamp: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
      },
      {
        id: 'msg_lw2',
        role: 'assistant',
        content: 'That is a real victory. Resting without apologizing for it is a skill that takes practice. How did your mind and body feel during those ten minutes?',
        timestamp: new Date(Date.now() - 7 * 24 * 3600 * 1000 + 60000).toISOString(),
      },
    ],
    summary: {
      id: 'sum_3',
      conversationId: 'conv_lastweek_1',
      title: 'Making room for myself',
      dateLabel: 'Last week • Daily exercise therapist',
      whatWeExplored: 'Practiced a guilt-free 10-minute pause and observed the physical shift in shoulder tension and breath depth.',
      tags: ['Micro-habits', 'Rest', 'Boundary setting'],
      carryWithYou: 'Rest is not a reward you earn; it is the fuel that sustains you.',
      createdAt: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
    },
  },
];

export const conversationService = {
  async syncConversations(userId?: string): Promise<Conversation[]> {
    if (typeof window === 'undefined') return this.getConversations();

    try {
      const url = `/api/sessions${userId ? `?userId=${encodeURIComponent(userId)}` : ''}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) {
        return this.getConversations();
      }

      const data = await res.json();
      if (!data.success || !Array.isArray(data.sessions)) {
        return this.getConversations();
      }

      const dbSessions: Conversation[] = data.sessions.map((sess: any) => {
        const room = String(sess.roomName || '').toLowerCase();
        const isInitial = room.includes('_initial');
        const isDaily = room.includes('_daily');
        const isCompanion = room.includes('_companion') || room.includes('_checkin');

        const companionType: CompanionType = isDaily ? 'daily' : isCompanion ? 'on-demand' : 'weekly';

        // Derive conversation title
        let title = 'Weekly CBT session';
        if (isInitial) {
          title = 'Initial Intake Session';
        } else if (isDaily) {
          title = 'Daily CBT grounding & practice';
        } else if (isCompanion) {
          title = 'Mindful on-demand check-in';
        }

        // Format date label
        const createdAt = sess.createdAt ? new Date(sess.createdAt).toISOString() : new Date().toISOString();
        const dateObj = new Date(createdAt);
        const now = new Date();
        const isToday = dateObj.toDateString() === now.toDateString();
        const dateLabel = `${isToday ? 'Today' : dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • ${
          isInitial
            ? 'Initial Intake Session'
            : companionType === 'weekly'
            ? 'Weekly main therapist'
            : companionType === 'daily'
            ? 'Daily exercise therapist'
            : 'On-demand therapist'
        }`;

        // Map messages
        const messages: Message[] = Array.isArray(sess.messages) && sess.messages.length > 0
          ? sess.messages.map((m: any) => ({
              id: m.id || `msg_${Math.random().toString(36).substring(2, 9)}`,
              role: m.role === 'assistant' ? 'assistant' : 'user',
              content: m.content || '',
              timestamp: m.createdAt ? new Date(m.createdAt).toISOString() : createdAt,
            }))
          : [
              {
                id: `msg_init_${sess.id}`,
                role: 'assistant',
                content: sess.summary || 'Session completed with Hope.',
                timestamp: createdAt,
              },
            ];

        // Format summary
        const summary: SessionSummary = {
          id: `sum_${sess.id}`,
          conversationId: sess.id,
          title,
          dateLabel,
          whatWeExplored: sess.summary || 'You engaged in a meaningful therapeutic dialogue with Hope.',
          tags: isInitial
            ? ['Initial consultation', 'CBT Foundations', 'Daily exercises brief']
            : isDaily
            ? ['Daily drill', 'Grounding practice', 'CBT Habit']
            : ['Cognitive reframe', 'Emotional awareness', 'Self-compassion'],
          carryWithYou: isInitial
            ? 'Practice 3-5 minutes of daily exercises to reinforce today’s reflection.'
            : 'Take gentle, unhurried breaths whenever you feel overwhelmed.',
          createdAt,
        };

        return {
          id: sess.id,
          title,
          companionType,
          createdAt,
          updatedAt: sess.updatedAt ? new Date(sess.updatedAt).toISOString() : createdAt,
          messages,
          summary,
        };
      });

      // Merge DB sessions at the top, avoiding duplicate IDs
      const localList = this.getConversations();
      const existingDbIds = new Set(dbSessions.map((s) => s.id));
      const filteredLocal = localList.filter((c) => !existingDbIds.has(c.id));

      const merged = [...dbSessions, ...filteredLocal];
      localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(merged));
      return merged;
    } catch (err) {
      console.warn('Error syncing conversations from database:', err);
      return this.getConversations();
    }
  },

  getConversations(filterQuery = ''): Conversation[] {
    if (typeof window === 'undefined') return SEED_CONVERSATIONS;
    
    let list: Conversation[] = [];
    const raw = localStorage.getItem(CONVERSATIONS_STORAGE_KEY);
    if (!raw) {
      list = SEED_CONVERSATIONS;
      localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(list));
    } else {
      try {
        list = JSON.parse(raw);
      } catch {
        list = SEED_CONVERSATIONS;
      }
    }

    if (!filterQuery.trim()) return list;

    const q = filterQuery.toLowerCase();
    return list.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.messages.some((m) => m.content.toLowerCase().includes(q))
    );
  },

  getConversationById(id: string): Conversation | null {
    const list = this.getConversations();
    return list.find((c) => c.id === id) || null;
  },

  createConversation(companionType: CompanionType = 'on-demand'): Conversation {
    const comp = COMPANIONS[companionType];
    const newConv: Conversation = {
      id: `conv_${Date.now()}`,
      title: 'A moment just for you',
      companionType,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: `msg_init_${Date.now()}`,
          role: 'assistant',
          content: comp.initialPrompt,
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const list = this.getConversations();
    const updated = [newConv, ...list];
    if (typeof window !== 'undefined') {
      localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(updated));
    }
    return newConv;
  },

  async sendMessage(conversationId: string, userText: string): Promise<{ userMsg: Message; replyMsg: Message }> {
    const list = this.getConversations();
    const convIndex = list.findIndex((c) => c.id === conversationId);
    if (convIndex === -1) throw new Error('Conversation not found');

    const userMsg: Message = {
      id: `msg_u_${Date.now()}`,
      role: 'user',
      content: userText,
      timestamp: new Date().toISOString(),
    };

    list[convIndex].messages.push(userMsg);
    list[convIndex].updatedAt = new Date().toISOString();

    // Auto-update title if it's still default
    if (list[convIndex].title === 'A moment just for you' && list[convIndex].messages.length > 1) {
      const words = userText.trim().split(' ').slice(0, 4).join(' ');
      list[convIndex].title = words.length > 3 ? words.charAt(0).toUpperCase() + words.slice(1) : 'Finding calm today';
    }

    // Save immediate user turn
    if (typeof window !== 'undefined') {
      localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(list));
    }

    // Mock realistic typing pause (700ms)
    await new Promise((resolve) => setTimeout(resolve, 750));

    // Dynamic, context-attuned therapeutic replies
    const companion = list[convIndex].companionType;
    let replyContent = "I hear you, and it's completely natural to experience moments like this. When you pause and notice that feeling right now, what physical sensations come with it?";

    const lower = userText.toLowerCase();
    if (lower.includes('bruno') || lower.includes('dog') || lower.includes('shelter')) {
      replyContent = "I remember Bruno and how much care and reflection you put into his adoption. When feelings of doubt arise, remember that feeling protective shows how much you value that bond. How has he been doing today?";
    } else if (lower.includes('work') || lower.includes('busy') || lower.includes('boss') || lower.includes('slack')) {
      replyContent = "Work demands can quickly crowd out mental space when boundaries blur. If you took just five intentional minutes to step away from screens right now, how would that feel?";
    } else if (lower.includes('tired') || lower.includes('exhausted') || lower.includes('sleep') || lower.includes('drained')) {
      replyContent = "Exhaustion is your body's honest signal that the pace you've been keeping needs tenderness, not pressure. Let's give you permission right here to slow down. What does gentle rest look like for you this evening?";
    } else if (lower.includes('first session') || lower.includes('session 1')) {
      replyContent = "In our first session, we focused on establishing a safe anchor and grounding through acute stress. It's meaningful to look back and recognize how much ground you've covered since then.";
    } else if (companion === 'daily') {
      replyContent = "That's a valuable observation for your daily check-in. Let's practice a quick grounding breath: inhale deeply for 4 seconds, hold gently for 4, and release for 6. How does your chest feel?";
    } else if (companion === 'weekly') {
      replyContent = "Let's unpack that cognitive pattern together. When that thought entered your mind, did you notice an automatic assumption that things were out of your control?";
    }

    const replyMsg: Message = {
      id: `msg_a_${Date.now()}`,
      role: 'assistant',
      content: replyContent,
      timestamp: new Date().toISOString(),
    };

    list[convIndex].messages.push(replyMsg);
    if (typeof window !== 'undefined') {
      localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(list));
    }

    return { userMsg, replyMsg };
  },

  attachSummary(conversationId: string, summary: SessionSummary): Conversation {
    const list = this.getConversations();
    const convIndex = list.findIndex((c) => c.id === conversationId);
    if (convIndex !== -1) {
      list[convIndex].summary = summary;
      if (typeof window !== 'undefined') {
        localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(list));
      }
      return list[convIndex];
    }
    throw new Error('Conversation not found');
  },
};
