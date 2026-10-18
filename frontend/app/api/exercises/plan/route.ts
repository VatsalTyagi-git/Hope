import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

const EXPRESS_BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const DEFAULT_7_DAY_PLAN = [
  {
    day_number: 1,
    day_title: 'Day 1: Catching Automatic Thoughts',
    exercise_name: '3-Column Thought Record',
    focus_area: 'Identifying cognitive distortions and initial triggers',
    instruction: 'Notice when tension rises today. Record the situation, your automatic thought, and its emotional intensity.',
    target_question: 'When situations triggered distress today, what automatic thoughts came to your mind first?',
    recommended_duration_mins: 5,
  },
  {
    day_number: 2,
    day_title: 'Day 2: Somatic Regulation Drill',
    exercise_name: 'Physiological Sigh Breathing',
    focus_area: 'Down-regulating physical fight-or-flight arousal',
    instruction: 'Practice 5 cycles of physiological sigh (two deep inhales through nose, slow extended exhale) before any stressful task.',
    target_question: 'How did your physical tension and breathing respond when you tried the physiological sigh today?',
    recommended_duration_mins: 3,
  },
  {
    day_number: 3,
    day_title: 'Day 3: Evidence Examination Drill',
    exercise_name: 'Evidence Testing',
    focus_area: 'Testing catastrophic assumptions against objective facts',
    instruction: 'List 2 pieces of factual, objective evidence that contradict the negative thought from our session.',
    target_question: 'What objective evidence did you find today that challenged that negative assumption?',
    recommended_duration_mins: 5,
  },
  {
    day_number: 4,
    day_title: 'Day 4: Rational Reframing Practice',
    exercise_name: 'Balanced Thought Generation',
    focus_area: 'Replacing catastrophic predictions with balanced alternatives',
    instruction: 'Whenever you feel anxious or self-critical, speak your balanced reframe aloud.',
    target_question: 'Were you able to practice your balanced reframe today, and how did saying that shift your emotion?',
    recommended_duration_mins: 5,
  },
  {
    day_number: 5,
    day_title: 'Day 5: Decatastrophizing Drill',
    exercise_name: 'Best-Worst-Likely Scenario',
    focus_area: 'De-escalating worst-case forecasts',
    instruction: 'Write down the worst-case scenario, the best-case scenario, and the most realistic likely outcome.',
    target_question: 'In today’s practice, what did you identify as the most realistic, probable outcome rather than the worst case?',
    recommended_duration_mins: 5,
  },
  {
    day_number: 6,
    day_title: 'Day 6: Behavioral Boundary Enforcement',
    exercise_name: 'Digital Boundary Disconnect',
    focus_area: 'Guarding evening recovery and cognitive rest',
    instruction: 'Set an intentional boundary to disconnect from work communications by 8:00 PM tonight.',
    target_question: 'How did your evening boundary go tonight? Were you able to step away without lingering guilt?',
    recommended_duration_mins: 5,
  },
  {
    day_number: 7,
    day_title: 'Day 7: Weekly Progress Integration',
    exercise_name: 'Weekly CBT Reflection',
    focus_area: 'Consolidating gains before your next weekly clinical session',
    instruction: 'Reflect on how your baseline distress shifted over the past 6 days of daily drills.',
    target_question: 'Looking back over the entire week of daily practices, what has been your biggest breakthrough or shift in perspective?',
    recommended_duration_mins: 5,
  },
];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || '0ccbaecf-43fd-4b7f-91e0-d32233482b07';

    // 1. Try Express backend endpoint (which queries FalkorDB first, then PostgreSQL)
    try {
      const response = await fetch(`${EXPRESS_BACKEND_URL}/api/exercises/plan/${encodeURIComponent(userId)}`, {
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.plan) && data.plan.length > 0) {
          return NextResponse.json({
            success: true,
            source: data.source || 'falkordb',
            userId,
            hasCompletedFirstSession: Boolean(data.hasCompletedFirstSession),
            latestSession: data.latestSession || null,
            nextWeeklySession: data.nextWeeklySession || null,
            plan: data.plan,
          });
        }
      }
    } catch (expressErr: any) {
      console.warn('[GET /api/exercises/plan] Express backend unreachable, falling back to local Prisma:', expressErr.message);
    }

    // 2. Direct PostgreSQL fallback if Express is offline
    try {
      const latestSession = await prisma.session.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      const raw = latestSession?.rawTranscript as any;
      const rawPlan = raw?.extractedData?.weekly_daily_plan;
      if (Array.isArray(rawPlan) && rawPlan.length > 0) {
        const baseTimestamp = Math.floor(
          new Date(latestSession!.endedAt || latestSession!.startedAt || latestSession!.createdAt).getTime() / 1000
        );
        const sessionDateStr = new Date(baseTimestamp * 1000).toISOString().split('T')[0];
        const nextTimestamp = baseTimestamp + 7 * 86400;
        const nextDateStr = new Date(nextTimestamp * 1000).toISOString().split('T')[0];
        const nextDateObj = new Date(nextDateStr + 'T12:00:00Z');

        const nextWeeklySession = {
          date: nextDateStr,
          timestamp: nextTimestamp,
          formattedDate: nextDateObj.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          dayOfWeek: nextDateObj.getDay(),
        };

        const plan = rawPlan.map((d: any) => {
          const dayNum = Number(d.day_number || 1);
          const assignedDate =
            d.assigned_date ||
            new Date((baseTimestamp + dayNum * 86400) * 1000).toISOString().split('T')[0];
          return {
            ...d,
            day_number: dayNum,
            assigned_date: assignedDate,
          };
        });

        return NextResponse.json({
          success: true,
          source: 'postgresql-direct',
          userId,
          hasCompletedFirstSession: true,
          latestSession: {
            id: latestSession!.id,
            date: sessionDateStr,
            timestamp: baseTimestamp,
            summary: latestSession!.summary,
          },
          nextWeeklySession,
          plan,
        });
      }
    } catch (pgErr: any) {
      console.warn('[GET /api/exercises/plan] Direct Prisma query note:', pgErr.message);
    }

    // 3. Fallback to standard evidence-based 7-day CBT progression
    const nowTimestamp = Math.floor(Date.now() / 1000);
    const nowDate = new Date();
    const daysUntilNextSunday = (7 - nowDate.getDay()) % 7 || 7;
    const nextSundayObj = new Date(nowDate.getTime() + daysUntilNextSunday * 86400 * 1000);
    const nextSundayStr = nextSundayObj.toISOString().split('T')[0];

    const defaultWithDates = DEFAULT_7_DAY_PLAN.map((d) => ({
      ...d,
      assigned_date: new Date((nowTimestamp + d.day_number * 86400) * 1000).toISOString().split('T')[0],
      status: 'PENDING',
    }));

    return NextResponse.json({
      success: true,
      source: 'evidence-based-default',
      userId,
      hasCompletedFirstSession: false,
      latestSession: null,
      nextWeeklySession: {
        date: nextSundayStr,
        timestamp: Math.floor(nextSundayObj.getTime() / 1000),
        formattedDate: nextSundayObj.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        dayOfWeek: nextSundayObj.getDay(),
      },
      plan: defaultWithDates,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
