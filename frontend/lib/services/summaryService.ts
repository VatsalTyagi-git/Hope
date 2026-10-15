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
    let whatWeExplored = "You explored current feelings and identified meaningful micro-actions to create space for yourself. Small, intentional pauses were recognized as valuable restorative practices.";
    let tags = ['Wellbeing', 'Self-care', 'Emotional balance'];
    let carryWithYou = 'Give yourself permission to pause without needing a reason.';

    if (fullText.includes('walk') || fullText.includes('phone') || fullText.includes('balance')) {
      title = 'Finding a little balance';
      whatWeExplored = "You explored feeling stretched between daily demands and your own needs. Evening walks emerged as a familiar, restorative practice that you'd like to return to.";
      tags = ['Work-life balance', 'Self-care', 'Feeling overwhelmed'];
      carryWithYou = 'Make space for a ten-minute, phone-free walk.';
    } else if (fullText.includes('bruno') || fullText.includes('dog')) {
      title = 'Nurturing connection with Bruno';
      whatWeExplored = "Reflected on the responsibility and protective love felt for Bruno. Grounded through the recognition that anxiety often signals care rather than incompetence.";
      tags = ['Pet companionship', 'Responsibility', 'Grounding'];
      carryWithYou = 'Take five quiet minutes to sit and breathe alongside Bruno today.';
    } else if (fullText.includes('work') || fullText.includes('slack') || fullText.includes('meeting')) {
      title = 'Decompressing work pressures';
      whatWeExplored = "Examined automatic cognitive pressures around urgent workplace expectations. Identified the importance of physical transitions at the end of the workday.";
      tags = ['Work stress', 'Boundaries', 'Mindful transitions'];
      carryWithYou = 'Close your laptop lid with intention and take three cleansing breaths.';
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
