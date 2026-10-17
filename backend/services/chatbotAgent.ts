import { GoogleGenAI } from '@google/genai';
import falkor from '../db/falkor.js';
import dotenv from 'dotenv';

dotenv.config();

const geminiApiKey = process.env.GOOGLE_API_KEY;
const aiClient = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;

export const ON_DEMAND_COMPANION_PROMPT = `You are Hope, an empathetic, soothing CBT Companion and Emotional First-Aid Guide for on-demand check-ins.
The patient is reaching out in the present moment—often during a stressful situation, acute anxiety, emotional overwhelm, or when they just need someone safe to talk to right now.
Your role is immediate emotional safety, nervous system down-regulation, gentle perspective shifting, and compassionate presence.

Clinical Objectives:
1. Immediate Emotional Presence: Acknowledge and validate whatever they are feeling right now. Make them feel heard, held, and unjudged.
2. Present-Moment Focus: Focus strictly on the present moment. Inquire gently what is feeling heaviest right now or what their mind/body needs right now.
3. Emotional First-Aid & Grounding: If anxious, panicky, or spiraling, guide them through real-time calming (e.g. 5-4-3-2-1 grounding, physiological sigh, slow breathing, naming the emotion).
4. Defusing Acute Thoughts: Gently help them untangle overwhelming spirals without demanding heavy worksheets.
5. Soft, Low-Pressure Space: Keep the atmosphere unhurried, reassuring, and comforting. Do NOT assign homework, set formal agendas, or demand rigorous cognitive tracking.

Core Behavioural Rule:
- Your primary responsibility is to provide therapeutic presence and guidance directly within the conversation.
- Never reflexively tell the patient to seek professional help, consult a therapist, or contact a mental-health professional when discussing ordinary psychological difficulties.
- Speak in natural, warm, conversational plain text. Never output markdown headers (no "#", "##"), bullet lists, emojis, or code blocks.
- Keep responses conversational and concise (2 to 4 gentle sentences).
- Ask at most ONE thoughtful question at a time.
- Memory Awareness: You have full access to their FalkorDB therapeutic graph memory below. When the patient mentions people (Marcus, Julian, Clara), presentations, projects, standups, or prior exercises, acknowledge and weave in that shared history seamlessly and reassuringly.`;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface GenerateChatReplyOptions {
  userId?: string;
  messages: ChatMessage[];
  mode?: string;
}

export class ChatbotAgent {
  /**
   * Retrieves user's live clinical context from FalkorDB graph memory
   */
  async buildUserGraphMemoryPrompt(userId: string): Promise<string> {
    try {
      const g = await falkor.getGraph();

      // 1. Query agent state
      const stateRes = await g.query(
        `
        MATCH (u:User {id: $userId})-[:HAS_STATE]->(a:AgentState)
        RETURN a.recommended_next_mode, a.active_homework, a.homework_streak, a.urgent_flag, a.handoff_context
        LIMIT 1
        `,
        { params: { userId } }
      );

      // 2. Query historical episodes (triggers, distortions, reframes)
      const episodesRes = await g.query(
        `
        MATCH (u:User {id: $userId})-[:HAS_SESSION]->(s:Session)-[:CAPTURED_EPISODE]->(e:Episode)
        OPTIONAL MATCH (e)-[:INVOLVED_PERSON]->(p:Person)
        OPTIONAL MATCH (e)-[:SPARKED_BY]->(t:Trigger)
        OPTIONAL MATCH (e)-[:EXHIBITED_DISTORTION]->(cd:CognitiveDistortion)
        RETURN e.situation, e.automatic_thought, e.emotion, e.reframed_thought,
               p.name AS person, t.name AS trigger, cd.name AS distortion, e.timestamp
        ORDER BY e.timestamp DESC
        LIMIT 8
        `,
        { params: { userId } }
      );

      // 3. Query personalized therapist rules
      const rulesRes = await g.query(
        `
        MATCH (u:User {id: $userId})-[:PREFERS_RULE]->(r:TherapistRule)
        RETURN r.rule, r.confidence
        LIMIT 5
        `,
        { params: { userId } }
      );

      const state = (stateRes.data || stateRes.result_set || [])[0];
      const episodes = episodesRes.data || episodesRes.result_set || [];
      const rules = rulesRes.data || rulesRes.result_set || [];

      let memory = `\n# Patient Graph Memory Context (Live from FalkorDB):\n`;
      if (state) {
        const hw = state['a.active_homework'] || state[1];
        const streak = state['a.homework_streak'] || state[2] || 0;
        const handoff = state['a.handoff_context'] || state[4];
        if (hw) memory += `- Active CBT Homework: "${hw}" (Current streak: ${streak} days)\n`;
        if (handoff) memory += `- Clinical Handoff Note: "${handoff}"\n`;
      }

      if (episodes.length > 0) {
        memory += `\nRelevant Past Breakthroughs, Incidents & Validated Reframes:\n`;
        episodes.forEach((ep: any, idx: number) => {
          const situation = ep['e.situation'] || ep[0];
          const thought = ep['e.automatic_thought'] || ep[1];
          const emotion = ep['e.emotion'] || ep[2];
          const reframe = ep['e.reframed_thought'] || ep[3];
          const person = ep['person'] || ep[4];
          const trigger = ep['trigger'] || ep[5];
          const distortion = ep['distortion'] || ep[6];

          memory += `${idx + 1}. Episode: ${situation || 'Prior session'}\n`;
          if (person) memory += `   * Person: ${person}\n`;
          if (trigger) memory += `   * Trigger: ${trigger}\n`;
          if (distortion) memory += `   * Distortion: ${distortion}\n`;
          if (thought) memory += `   * Automatic Thought: "${thought}" (${emotion || 'Anxiety'})\n`;
          if (reframe) memory += `   * Validated Cognitive Reframe: "${reframe}"\n`;
        });
      }

      if (rules.length > 0) {
        memory += `\nPersonalized Therapist Rules for This Patient:\n`;
        rules.forEach((r: any) => {
          const ruleText = r['r.rule'] || r[0];
          if (ruleText) memory += `- ${ruleText}\n`;
        });
      }

      return memory;
    } catch (err: any) {
      console.warn('[FalkorDB Memory Context Note]:', err?.message);
      return '';
    }
  }

  /**
   * Generates a contextual CBT reply using Gemini 2.5 Flash and live FalkorDB memory
   */
  async generateChatReply({
    userId = '0ccbaecf-43fd-4b7f-91e0-d32233482b07',
    messages = [],
    mode = 'ON_DEMAND',
  }: GenerateChatReplyOptions): Promise<{ role: string; content: string }> {
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error('Messages array is required.');
    }

    if (!aiClient) {
      throw new Error('Gemini AI client not initialized (missing GOOGLE_API_KEY).');
    }

    // 1. Fetch live FalkorDB graph memory
    const memoryContext = await this.buildUserGraphMemoryPrompt(userId);

    // 2. Build system instruction with persona and live memory injection
    const systemInstruction = `${ON_DEMAND_COMPANION_PROMPT}\n\n${memoryContext}`;

    // 3. Format message history for Gemini SDK
    const contents = messages
      .filter((m: any) => m && m.content)
      .map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content.trim() }],
      }));

    if (contents.length === 0 || contents[contents.length - 1].role !== 'user') {
      throw new Error('Last message must be from user.');
    }

    console.log(`💬 [ChatbotAgent] Generating response for user ${userId} (mode: ${mode})...`);

    // 4. Generate content with Gemini 2.5 Flash
    const geminiResponse = await aiClient.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const replyText =
      geminiResponse.text?.trim() ||
      "I'm right here with you. Take a slow breath. What feels heaviest for you right now?";

    console.log(`✨ [ChatbotAgent] Generated reply (${replyText.length} chars).`);

    return {
      role: 'assistant',
      content: replyText,
    };
  }
}

export const chatbotAgent = new ChatbotAgent();
export default chatbotAgent;
