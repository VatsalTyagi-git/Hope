import { Conversation, SessionSummary } from '../types';
import { conversationService } from './conversationService';

export const summaryService = {
  generateSummary(conversation: Conversation): SessionSummary {
    const companionLabel =
      conversation.companionType === 'weekly'
        ? 'Weekly main therapist'
        : conversation.companionType === 'daily'
        ? 'Daily exercise therapist'
        : 'On-demand therapist';

    // Tailor summary to conversation content
    const fullText = conversation.messages.map((m) => m.content).join(' ').toLowerCase();

    let title = conversation.title;
    let whatWeExplored = "We engaged in meaningful therapeutic reflection together, identifying automatic thoughts and applying grounded CBT reframing.";
    let tags = ['CBT Reflection', 'Cognitive Reframing', 'Self-Compassion'];
    let carryWithYou = 'Take a moment to notice what your mind needs today, without judgment.';

    if (fullText.includes('marcus') || fullText.includes('aurora') || fullText.includes('failover') || fullText.includes('imposter')) {
      title = 'Project Aurora & Performance Reframing';
      whatWeExplored = "We explored work-related imposter panic and catastrophic interpretations of technical reviews. Together, we applied evidence-based CBT reframing to separate constructive feedback from your self-worth.";
      tags = ['Work Anxiety', 'Catastrophizing', 'Cognitive Restructuring'];
      carryWithYou = 'Constructive critique is normal engineering review, not proof of incompetence.';
    } else if (fullText.includes('boundary') || fullText.includes('julian') || fullText.includes('laptop') || fullText.includes('pr')) {
      title = 'Work-Life Boundaries';
      whatWeExplored = "We examined rigid 'Should Statements' around late-night responsiveness. Together, we reinforced healthy boundaries and cognitive clarity over constant availability.";
      tags = ['Should Statements', 'Boundaries', 'Work-Life Balance'];
      carryWithYou = 'Closing my laptop at 8 PM protects my mental clarity, which allows me to do better work tomorrow.';
    } else if (fullText.includes('sigh') || fullText.includes('breath') || fullText.includes('standup') || fullText.includes('clara')) {
      title = 'Somatic Grounding & Standup Calm';
      whatWeExplored = "We practiced physiological sigh breathing to down-regulate nervous system arousal before workplace triggers, shifting from dread to steady presence.";
      tags = ['Somatic Regulation', 'Physiological Sigh', 'Daily Practice'];
      carryWithYou = 'Take two quick inhales through the nose and a long, slow exhale whenever tension arises.';
    }

    const summary: SessionSummary = {
      id: `sum_${Date.now()}`,
      conversationId: conversation.id,
      title,
      dateLabel: `Today • ${companionLabel}`,
      whatWeExplored,
      tags,
      carryWithYou,
      createdAt: new Date().toISOString(),
    };

    conversationService.attachSummary(conversation.id, summary);
    return summary;
  },

  exportConversationTxt(conversation: Conversation): void {
    if (typeof window === 'undefined') return;

    const companionLabel =
      conversation.companionType === 'weekly'
        ? 'Weekly Main Therapist'
        : conversation.companionType === 'daily'
        ? 'Daily Exercise Therapist'
        : 'On-Demand Therapist';

    let content = `=====================================================\n`;
    content += `HOPE - CONVERSATION EXPORT\n`;
    content += `Session Title: ${conversation.title}\n`;
    content += `Companion:    ${companionLabel}\n`;
    content += `Date:         ${new Date(conversation.createdAt).toLocaleString()}\n`;
    content += `=====================================================\n\n`;

    content += `--- TRANSCRIPT ---\n\n`;
    for (const msg of conversation.messages) {
      const speaker = msg.role === 'assistant' ? 'Hope' : 'You';
      const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      content += `[${time}] ${speaker}:\n${msg.content}\n\n`;
    }

    if (conversation.summary) {
      content += `\n=====================================================\n`;
      content += `SESSION SUMMARY (MOMENT REFLECTED)\n`;
      content += `=====================================================\n`;
      content += `Title:            ${conversation.summary.title}\n`;
      content += `What We Explored: ${conversation.summary.whatWeExplored}\n`;
      content += `Tags:             ${conversation.summary.tags.join(', ')}\n`;
      content += `To Carry With You: ${conversation.summary.carryWithYou}\n`;
      content += `\nNote: Hope provides AI-guided wellbeing support, not professional medical or crisis care.\n`;
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hope-${conversation.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};
