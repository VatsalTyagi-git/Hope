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
  "summary": "2-4 warm, empathetic sentences written in collaborative first-person plural ('We' / 'You' / 'Together') from Hope's perspective reflecting directly with the user on what was explored in the session (e.g., 'In this session, we explored your feelings around [topic] and looked at how [situation] triggered [reaction]. Together, we identified [pattern] and practiced [strategy]. We also discussed your goal to continue working on [takeaway].'). CRITICAL DIRECTIVE: NEVER write in detached third-person clinical language. NEVER use 'the patient', 'the client', 'the companion', 'the therapist', or 'they/their' to describe the user or Hope. Speak directly and warmly with the user using 'we', 'together', and 'you/your'.",
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

    if (parsed.summary) {
      parsed.summary = toFirstPersonSummary(parsed.summary);
    }

    return parsed;
  } catch (err) {
    console.error('Failed to parse Gemini CBT extraction JSON:', err, responseText);
    throw new Error('LLM output was not valid JSON');
  }
}

/**
 * Transforms clinical third-person summary phrasing into warm, empathetic
 * first-person plural reflections ("we explored", "together we identified", "you shared").
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
