import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GOOGLE_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

/**
 * Uses Gemini to generate a clinical CBT summary and structured graph entities
 * matching the FalkorDB schema from the conversation transcript.
 */
export async function extractCbtSessionData(transcript, metadata = {}) {
  if (!ai) {
    throw new Error('GOOGLE_API_KEY is not configured in backend/.env');
  }

  // Format transcript turns into readable dialog
  const dialogText = Array.isArray(transcript)
    ? transcript
        .map((t) => `${(t.role || 'user').toUpperCase()}: ${t.content || ''}`)
        .join('\n')
    : String(transcript || '');

  if (!dialogText.trim()) {
    return {
      summary: 'Brief session with no recorded speech turns.',
      initial_mood: 5,
      final_mood: 5,
      mode: metadata.mode || 'WEEKLY',
      episodes: [],
      daily_practice: null,
      homework: null,
      therapist_rules: [],
      agent_state: {
        recommended_next_mode: 'WEEKLY',
        urgent_flag: false,
        handoff_context: '',
      },
    };
  }

  const prompt = `
You are an expert clinical Cognitive Behavioral Therapy (CBT) supervisor.
Analyze this therapy conversation transcript between a Patient (USER) and a CBT Voice Companion (ASSISTANT).

Transcript:
"""
${dialogText}
"""

Extract a structured clinical analysis matching the following JSON schema strictly:
{
  "summary": "2-4 sentence clinical summary of what the patient explored, emotional shifts, and cognitive interventions applied.",
  "initial_mood": 5, // int 1-10 estimation at start of call
  "final_mood": 6, // int 1-10 estimation at end of call
  "mode": "WEEKLY", // "WEEKLY" | "DAILY" | "ON_DEMAND"
  "episodes": [
    {
      "situation": "Specific triggering event or distressing scenario unpacked",
      "automatic_thought": "The negative automatic thought identified",
      "emotion": "Dominant emotion (e.g. Anxiety, Shame, Anger)",
      "intensity_before": 8, // int 1-10
      "intensity_after": 4, // int 1-10
      "reframed_thought": "The rational reframe or balanced thought developed",
      "person": {
        "name": "Person name if involved (e.g. Sarah, Boss)",
        "role": "Role (e.g. Sister, Manager, Partner)",
        "sentiment": "Relationship sentiment (e.g. strained, supportive, neutral)"
      },
      "trigger": {
        "name": "Short name for the trigger (e.g. Sprint review criticism)",
        "category": "Work | Social | Health | General",
        "intensity": 8
      },
      "distortion": "All-or-Nothing Thinking | Catastrophizing | Mind Reading | Emotional Reasoning | Fortune Telling | Mental Filtering | Overgeneralization | Personalization | Should Statements | Labeling",
      "core_belief": {
        "statement": "Underlying core belief (e.g. If I make a mistake, I am a failure)",
        "category": "Helplessness | Unlovability | Worthlessness"
      }
    }
  ],
  "daily_practice": {
    "exercise_name": "Name of CBT exercise practiced (if this was a daily drill)",
    "user_reflection": "Patient reflection on completing it",
    "completed": true,
    "mood_before": 4,
    "mood_after": 6,
    "friction_note": "Any difficulty noted"
  }, // null if not a daily practice drill
  "homework": {
    "exercise_name": "Active homework assigned for next 7 days (e.g. 3-Column Thought Record)",
    "target_days": 7
  }, // null if none assigned
  "therapist_rules": [
    "Personalization rule for this user (e.g. When discussing Sarah, prioritize Decatastrophizing over breathing drills)"
  ],
  "agent_state": {
    "recommended_next_mode": "DAILY", // "WEEKLY" | "DAILY" | "ON_DEMAND"
    "urgent_flag": false, // true only if acute panic or crisis detected
    "handoff_context": "Clinical note to hand off to the next companion mode"
  }
}

Return ONLY the raw JSON object. Do not include markdown code fences or conversational text.
`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-lite',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      temperature: 0.2,
    },
  });

  const responseText = response.text || '{}';
  try {
    return JSON.parse(responseText);
  } catch (err) {
    console.error('Failed to parse Gemini CBT extraction JSON:', err, responseText);
    throw new Error('LLM output was not valid JSON');
  }
}

export default { extractCbtSessionData };
