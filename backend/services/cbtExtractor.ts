import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GOOGLE_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export interface CbtExtractedEpisode {
  situation?: string;
  automatic_thought?: string;
  emotion?: string;
  intensity_before?: number;
  intensity_after?: number;
  reframed_thought?: string;
  person?: {
    name?: string;
    role?: string;
    sentiment?: string;
    [key: string]: any;
  };
  trigger?: {
    name?: string;
    category?: string;
    intensity?: number;
    [key: string]: any;
  };
  distortion?: string;
  core_belief?: {
    statement?: string;
    category?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface WeeklyDayExercise {
  day_number: number;
  day_title: string;
  exercise_name: string;
  focus_area: string;
  instruction: string;
  target_question: string;
  recommended_duration_mins: number;
  [key: string]: any;
}

export interface CbtExtractedData {
  title?: string;
  summary?: string;
  initial_mood?: number;
  final_mood?: number;
  mode?: string;
  episodes?: CbtExtractedEpisode[];
  daily_practice?: {
    exercise_name?: string;
    user_reflection?: string;
    completed?: boolean;
    mood_before?: number;
    mood_after?: number;
    friction_note?: string;
    [key: string]: any;
  } | null;
  homework?: {
    exercise_name?: string;
    target_days?: number;
    [key: string]: any;
  } | null;
  weekly_daily_plan?: WeeklyDayExercise[];
  therapist_rules?: string[];
  agent_state?: {
    recommended_next_mode?: string;
    urgent_flag?: boolean;
    handoff_context?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface CbtExtractorMetadata {
  mode?: string;
  userId?: string;
  roomName?: string;
}

/**
 * Uses Gemini to generate a clinical CBT summary and structured graph entities
 * matching the FalkorDB schema from the conversation transcript.
 */
export async function extractCbtSessionData(
  transcript: any,
  metadata: CbtExtractorMetadata = {}
): Promise<CbtExtractedData> {
  if (!ai) {
    throw new Error('GOOGLE_API_KEY is not configured in backend/.env');
  }

  // Format transcript turns into readable dialog
  const dialogText = Array.isArray(transcript)
    ? transcript
        .map((t) => `${(t.role || 'user').toUpperCase()}: ${t.content || t.text || ''}`)
        .join('\n')
    : String(transcript || '');

  if (!dialogText.trim()) {
    return {
      title: 'Mindfulness & Grounding',
      summary: 'A supportive grounding reflection on emotional balance and self-compassion.',
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
  "title": "A concise 3-5 word objective title summarizing the primary topic or goal discussed (e.g., 'Exam Anxiety Coping', 'Marcus Architecture Feedback', 'Overcoming Presentation Panic', 'Sleep Routine Reset'). DO NOT include words like 'patient', 'client', 'session', 'brief', 'check-in', 'therapist', or greetings.",
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
  "weekly_daily_plan": [
    // EXACTLY 7 items, one for each day of the upcoming week (Day 1 through Day 7)
    {
      "day_number": 1, // 1 to 7
      "day_title": "Day 1: Catching the Automatic Thought",
      "exercise_name": "3-Column Thought Record",
      "focus_area": "Catching catastrophizing thoughts around manager feedback",
      "instruction": "Notice when panic or tension arises. Write down the automatic thought and identify the distortion.",
      "target_question": "When you faced feedback today, what was the first automatic thought that came to your mind?",
      "recommended_duration_mins": 5
    }
  ],
  "therapist_rules": [
    "Personalization rule for this user (e.g. When discussing Sarah, prioritize Decatastrophizing over breathing drills)"
  ],
  "agent_state": {
    "recommended_next_mode": "DAILY", // "WEEKLY" | "DAILY" | "ON_DEMAND"
    "urgent_flag": false, // true only if acute panic or crisis detected
    "handoff_context": "Clinical note to hand off to the next companion mode"
  }
}

IMPORTANT: Provide all 7 days in "weekly_daily_plan", tailoring the exercise, instruction, and specific target question of each day to the patient's specific thoughts, people, and reframes discussed in this transcript!
Return ONLY the raw JSON object. Do not include markdown code fences or conversational text.
`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      temperature: 0.2,
    },
  });

  const responseText = response.text || '{}';
  try {
    const parsed: CbtExtractedData = JSON.parse(responseText);
    // Ensure all 7 days are properly defined in weekly_daily_plan
    if (!Array.isArray(parsed.weekly_daily_plan) || parsed.weekly_daily_plan.length < 7) {
      const defaults = generateDefaultWeeklyPlan(parsed);
      const existing = Array.isArray(parsed.weekly_daily_plan) ? parsed.weekly_daily_plan : [];
      const planByDay = new Map<number, WeeklyDayExercise>();
      defaults.forEach((d) => planByDay.set(d.day_number, d));
      existing.forEach((e) => {
        if (e && e.day_number >= 1 && e.day_number <= 7) {
          planByDay.set(e.day_number, e);
        }
      });
      parsed.weekly_daily_plan = Array.from(planByDay.values()).sort((a, b) => a.day_number - b.day_number);
    }
    return parsed;
  } catch (err) {
    console.error('Failed to parse Gemini CBT extraction JSON:', err, responseText);
    throw new Error('LLM output was not valid JSON');
  }
}

function generateDefaultWeeklyPlan(data: Partial<CbtExtractedData>): WeeklyDayExercise[] {
  const primaryDistortion = data.episodes?.[0]?.distortion || 'Catastrophizing';
  const primaryTrigger = data.episodes?.[0]?.trigger?.name || 'stressful feedback or challenges';
  const primaryReframe = data.episodes?.[0]?.reframed_thought || 'one challenge does not define my capability';
  const homework = data.homework?.exercise_name || '3-Column Thought Record';

  return [
    {
      day_number: 1,
      day_title: 'Day 1: Identifying Automatic Thoughts',
      exercise_name: homework,
      focus_area: `Catching ${primaryDistortion} spirals around ${primaryTrigger}`,
      instruction: `Notice when tension rises regarding ${primaryTrigger}. Write down the first automatic thought and label the distortion.`,
      target_question: `Welcome to your Day 1 practice check-in. When thoughts around ${primaryTrigger} surfaced today, what automatic thoughts did you catch?`,
      recommended_duration_mins: 5,
    },
    {
      day_number: 2,
      day_title: 'Day 2: Somatic Regulation & Physiological Sigh',
      exercise_name: 'Physiological Sigh Breathing',
      focus_area: 'Down-regulating physical fight-or-flight arousal',
      instruction: 'Practice 5 cycles of physiological sigh (two inhales through the nose, long slow exhale) before any stressful task.',
      target_question: `How did your body feel today when practicing the physiological sigh? Did you notice your heart rate or chest tension settle?`,
      recommended_duration_mins: 3,
    },
    {
      day_number: 3,
      day_title: 'Day 3: Evidence Examination Drill',
      exercise_name: 'Evidence Testing',
      focus_area: `Testing assumptions against objective facts`,
      instruction: `List 3 pieces of factual, objective evidence that contradict the negative thought from our session.`,
      target_question: `Let us examine the evidence today: what concrete facts did you observe that prove the catastrophic thought was untrue?`,
      recommended_duration_mins: 5,
    },
    {
      day_number: 4,
      day_title: 'Day 4: Rational Reframing Practice',
      exercise_name: 'Balanced Thought Generation',
      focus_area: `Applying the reframe: "${primaryReframe}"`,
      instruction: `Whenever the familiar panic returns, deliberately repeat our session reframe.`,
      target_question: `Were you able to practice our reframe today—"${primaryReframe}"? How did saying that shift your distress level?`,
      recommended_duration_mins: 5,
    },
    {
      day_number: 5,
      day_title: 'Day 5: Decatastrophizing Drill',
      exercise_name: 'Best-Worst-Likely Scenario',
      focus_area: 'De-escalating worst-case forecasts',
      instruction: `Write down the worst-case scenario, the best-case scenario, and the most realistic likely outcome.`,
      target_question: `In today's practice, what did you identify as the most realistic, probable outcome rather than the worst case?`,
      recommended_duration_mins: 5,
    },
    {
      day_number: 6,
      day_title: 'Day 6: Behavioral Boundary Enforcement',
      exercise_name: 'Digital Boundary Disconnect',
      focus_area: 'Guarding evening recovery and cognitive rest',
      instruction: 'Set an intentional boundary to disconnect from work communications by 8:00 PM tonight.',
      target_question: `How did your evening boundary go tonight? Were you able to step away without lingering guilt?`,
      recommended_duration_mins: 5,
    },
    {
      day_number: 7,
      day_title: 'Day 7: Weekly Progress Integration',
      exercise_name: 'Weekly CBT Reflection',
      focus_area: 'Consolidating gains before the next weekly clinical session',
      instruction: 'Reflect on how your baseline distress shifted over the past 6 days of daily drills.',
      target_question: `Looking back over the entire week of daily practices, what has been your biggest breakthrough or shift in perspective?`,
      recommended_duration_mins: 5,
    },
  ];
}

export default { extractCbtSessionData };
