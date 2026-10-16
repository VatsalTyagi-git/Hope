import falkor from '../db/falkor.js';
import { syncSessionToFalkorDB } from '../services/graphMemorySync.js';

async function main() {
  console.log('================================================================');
  console.log('🚀 SIMULATING 10 SESSIONS EACH FOR 2 DIFFERENT USERS (20 TOTAL)');
  console.log('================================================================\n');

  // 1. Clear FalkorDB to start completely fresh
  console.log('🧹 Clearing FalkorDB to 0 nodes...');
  await falkor.clearAll();
  await falkor.initIndices();
  console.log('✅ FalkorDB cleared and indexed!\n');

  const baseTime = Math.floor(Date.now() / 1000) - (20 * 86400); // 20 days ago

  // ============================================================================
  // USER 1: sarah.miller@gmail.com (10 Diverse CBT Sessions)
  // ============================================================================
  const sarahEmail = 'sarah.miller@gmail.com';
  const sarahSessions = [
    {
      num: 1,
      mode: 'WEEKLY',
      topic: 'Work Performance Spiral & Imposter Anxiety',
      initialMood: 3,
      finalMood: 6,
      daysAgo: 19,
      summary: 'Initial intake exploring severe panic after receiving code architecture feedback from engineering manager Marcus. Unpacked catastrophic assumptions of termination.',
      episodes: [{
        situation: 'Sprint code review meeting with tough architectural critique',
        automatic_thought: 'If my code architecture has flaws, I am completely incompetent and will get fired.',
        emotion: 'Panic & Inadequacy',
        intensity_before: 9,
        intensity_after: 5,
        reframed_thought: 'Technical feedback is a standard part of engineering growth, not evidence of incompetence.',
        person: { name: 'Manager Marcus', role: 'Engineering Manager', sentiment: 'intimidating' },
        trigger: { name: 'Sprint Architecture Review', category: 'Work', intensity: 9 },
        distortion: 'All-or-Nothing Thinking',
        core_belief: { statement: 'If I am not flawless, I am worthless', category: 'Worthlessness' },
      }],
      homework: { exercise_name: '3-Column Thought Record', target_days: 7 },
      rules: ['Prompt Sarah to examine positive peer reviews before addressing critical feedback.'],
    },
    {
      num: 2,
      mode: 'DAILY',
      topic: 'Daily Drill: Thought Record on Production Release',
      initialMood: 5,
      finalMood: 7,
      daysAgo: 18,
      summary: 'Daily 5-minute drill completing a 3-column thought record regarding upcoming staging deployment.',
      episodes: [{
        situation: 'Staging deployment deadline approaching at 5 PM',
        automatic_thought: 'The database migration will fail and break customer workflows.',
        emotion: 'Anxiety',
        intensity_before: 7,
        intensity_after: 4,
        reframed_thought: 'We have tested the migration script three times in staging with zero rollbacks.',
        trigger: { name: 'Production Deployment', category: 'Work', intensity: 7 },
        distortion: 'Catastrophizing',
      }],
      dailyPractice: {
        exercise_name: '3-Column Thought Record',
        user_reflection: 'Writing out past successful migrations quickly deflated the panic.',
        completed: true,
        mood_before: 5,
        mood_after: 7,
      },
    },
    {
      num: 3,
      mode: 'WEEKLY',
      topic: 'Imposter Syndrome at Company All-Hands Presentation',
      initialMood: 4,
      finalMood: 7,
      daysAgo: 16,
      summary: 'Addressed dread surrounding presenting backend microservice initiative to VP Rachel and senior leadership.',
      episodes: [{
        situation: 'Scheduled to present 15-minute deck to 50 engineers and VP Rachel',
        automatic_thought: 'The leadership team will see through me and realize I do not belong in this role.',
        emotion: 'Dread',
        intensity_before: 8,
        intensity_after: 4,
        reframed_thought: 'I built this microservice from scratch and know the technical decisions better than anyone in the room.',
        person: { name: 'VP Rachel', role: 'Executive', sentiment: 'respected' },
        trigger: { name: 'Company All-Hands Presentation', category: 'Work', intensity: 8 },
        distortion: 'Fortune Telling',
        core_belief: { statement: 'I am an imposter waiting to be exposed', category: 'Worthlessness' },
      }],
      homework: { exercise_name: 'Decatastrophizing Script', target_days: 7 },
      rules: ['Use reality-testing questions when Sarah predicts failure ahead of presentations.'],
    },
    {
      num: 4,
      mode: 'WEEKLY',
      topic: 'Boundary Setting & Overtime Peer Pressure',
      initialMood: 5,
      finalMood: 7,
      daysAgo: 13,
      summary: 'Explored chronic over-commitment driven by fear of disappointing peer colleague Greg.',
      episodes: [{
        situation: 'Colleague Greg asked Sarah to take over on-call shifts for the entire weekend',
        automatic_thought: 'I should always step up when asked; if I say no, my team will resent me.',
        emotion: 'Guilt & Resentment',
        intensity_before: 7,
        intensity_after: 3,
        reframed_thought: 'Saying no to an unfair request protects my energy and maintains healthy teamwork.',
        person: { name: 'Colleague Greg', role: 'Senior Peer', sentiment: 'demanding' },
        trigger: { name: 'Weekend On-Call Handover', category: 'Work', intensity: 7 },
        distortion: 'Should Statements',
        core_belief: { statement: 'My worth is determined by how much I sacrifice for others', category: 'Helplessness' },
      }],
      homework: { exercise_name: 'Boundary Assertion Script', target_days: 7 },
    },
    {
      num: 5,
      mode: 'ON_DEMAND',
      topic: 'Acute Panic De-escalation: Midnight Outage Alert',
      initialMood: 2,
      finalMood: 6,
      daysAgo: 11,
      summary: 'Immediate crisis grounding session triggered by PagerDuty incident alert at 1 AM. Guided 5-4-3-2-1 somatic regulation.',
      episodes: [{
        situation: 'PagerDuty incident alarm waking Sarah at 1:15 AM',
        automatic_thought: 'Everything is crashing and everyone will blame me personally.',
        emotion: 'Acute Panic & Tachycardia',
        intensity_before: 10,
        intensity_after: 4,
        reframed_thought: 'Systems experience alerts regularly; we have a secondary engineer on call and an runbook.',
        trigger: { name: 'Midnight PagerDuty Alarm', category: 'Emergency', intensity: 10 },
        distortion: 'Emotional Reasoning',
      }],
      dailyPractice: {
        exercise_name: '5-4-3-2-1 Grounding',
        user_reflection: 'Physical grounding brought heart rate down and stopped the shaking.',
        completed: true,
        mood_before: 2,
        mood_after: 6,
      },
    },
    {
      num: 6,
      mode: 'DAILY',
      topic: 'Daily Practice Drill: Post-Incident Debrief',
      initialMood: 6,
      finalMood: 8,
      daysAgo: 10,
      summary: '5-minute drill processing the post-incident outcome. Confirmed zero downtime and positive team feedback.',
      episodes: [{
        situation: 'Incident retro meeting with Marcus and the infrastructure team',
        automatic_thought: 'They will secretly think I caused the latency spike.',
        emotion: 'Apprehension',
        intensity_before: 6,
        intensity_after: 2,
        reframed_thought: 'The retro showed a cloud provider outage, not our code.',
        person: { name: 'Manager Marcus', role: 'Engineering Manager', sentiment: 'supportive' },
        trigger: { name: 'Incident Postmortem', category: 'Work', intensity: 6 },
        distortion: 'Mind Reading',
      }],
      dailyPractice: {
        exercise_name: 'Decatastrophizing Script',
        user_reflection: 'The actual retro was completely objective and collaborative.',
        completed: true,
        mood_before: 6,
        mood_after: 8,
      },
    },
    {
      num: 7,
      mode: 'WEEKLY',
      topic: 'Perfectionism in Personal Life & Relationship Guilt',
      initialMood: 4,
      finalMood: 7,
      daysAgo: 7,
      summary: 'Unpacked spillover of work perfectionism into relationship with partner Liam. Reframed exhaustion as valid rest.',
      episodes: [{
        situation: 'Canceling weekend dinner plans with partner Liam due to burnout',
        automatic_thought: 'I am a terrible partner and ruining Liam’s weekend because I cannot handle my life.',
        emotion: 'Guilt & Shame',
        intensity_before: 8,
        intensity_after: 3,
        reframed_thought: 'Resting when exhausted is necessary health care, and Liam expressed genuine care and support.',
        person: { name: 'Partner Liam', role: 'Partner', sentiment: 'loving' },
        trigger: { name: 'Canceling Dinner Plans', category: 'Personal', intensity: 8 },
        distortion: 'Labeling',
        core_belief: { statement: 'If I am weak or tired, I am unlovable', category: 'Unlovability' },
      }],
      homework: { exercise_name: 'Behavioral Activation', target_days: 7 },
    },
    {
      num: 8,
      mode: 'DAILY',
      topic: 'Daily Practice Drill: Mindful Evening Disconnect',
      initialMood: 6,
      finalMood: 8,
      daysAgo: 5,
      summary: '5-minute Behavioral Activation check-in: closing laptop at 6 PM and taking a walk without Slack on phone.',
      episodes: [{
        situation: 'Putting work laptop into drawer at 6 PM sharp',
        automatic_thought: 'If an urgent message comes in while I walk, I will look unresponsive.',
        emotion: 'Mild Restlessness',
        intensity_before: 5,
        intensity_after: 2,
        reframed_thought: 'Work hours end at 6 PM. Emergency escalations have phone alerts; Slack can wait until morning.',
        trigger: { name: 'Closing Laptop at 6 PM', category: 'Work-Life', intensity: 5 },
        distortion: 'Catastrophizing',
      }],
      dailyPractice: {
        exercise_name: 'Behavioral Activation',
        user_reflection: 'Enjoyed the fresh air and didn’t miss a single critical issue.',
        completed: true,
        mood_before: 6,
        mood_after: 8,
      },
    },
    {
      num: 9,
      mode: 'WEEKLY',
      topic: 'Annual Promotion & Compensation Discussion',
      initialMood: 4,
      finalMood: 8,
      daysAgo: 3,
      summary: 'Prepared for annual compensation review with Marcus. Replaced automatic minimization with structured achievement inventory.',
      episodes: [{
        situation: 'Drafting self-evaluation document for Staff Engineer promotion',
        automatic_thought: 'Listing my achievements feels boastful and Marcus will think I have an inflated ego.',
        emotion: 'Self-Doubt',
        intensity_before: 7,
        intensity_after: 2,
        reframed_thought: 'Factual documentation of business impact is standard professional self-advocacy.',
        person: { name: 'Manager Marcus', role: 'Engineering Manager', sentiment: 'collaborative' },
        trigger: { name: 'Promotion Evaluation Draft', category: 'Work', intensity: 7 },
        distortion: 'Mental Filtering',
        core_belief: { statement: 'My achievements do not count unless others praise them unprompted', category: 'Worthlessness' },
      }],
      homework: { exercise_name: '3-Column Thought Record', target_days: 7 },
    },
    {
      num: 10,
      mode: 'WEEKLY',
      topic: '10-Session Clinical Milestone & Relapse Prevention',
      initialMood: 7,
      finalMood: 9,
      daysAgo: 1,
      summary: 'Milestone reflection session. Reviewed shift from chronic imposter panic to self-advocacy and firm boundary enforcement.',
      episodes: [{
        situation: 'Marcus approved the Staff Engineer promotion packet with praise',
        automatic_thought: 'I might stumble in the new role and not live up to expectations.',
        emotion: 'Excitement with mild caution',
        intensity_before: 5,
        intensity_after: 2,
        reframed_thought: 'Growth involves new challenges, and I now possess proven CBT tools to regulate anxiety.',
        person: { name: 'Manager Marcus', role: 'Engineering Manager', sentiment: 'supportive' },
        trigger: { name: 'Promotion Packet Approval', category: 'Milestone', intensity: 4 },
        distortion: 'Fortune Telling',
      }],
      homework: { exercise_name: 'Worry Time Scheduling', target_days: 14 },
      rules: ['Celebrate Sarah’s milestone independence; encourage self-guided thought challenging.'],
    },
  ];

  // ============================================================================
  // USER 2: alex.chen@yahoo.com (10 Diverse CBT Sessions)
  // ============================================================================
  const alexEmail = 'alex.chen@yahoo.com';
  const alexSessions = [
    {
      num: 1,
      mode: 'WEEKLY',
      topic: 'Social Isolation & Networking Paralysis',
      initialMood: 3,
      finalMood: 6,
      daysAgo: 19,
      summary: 'Initial intake examining acute social anxiety during industry mixer with colleague Priya. High sensitivity to conversational pauses.',
      episodes: [{
        situation: 'Awkward 5-second silence during networking mixer conversation',
        automatic_thought: 'Everyone in this circle thinks I am excruciatingly boring and awkward.',
        emotion: 'Social Shame',
        intensity_before: 9,
        intensity_after: 4,
        reframed_thought: 'Natural pauses happen in group conversations and do not reflect on my personal value.',
        person: { name: 'Colleague Priya', role: 'Teammate', sentiment: 'friendly' },
        trigger: { name: 'Networking Mixer Silence', category: 'Social', intensity: 9 },
        distortion: 'Mind Reading',
        core_belief: { statement: 'I am fundamentally defective in social interactions', category: 'Unlovability' },
      }],
      homework: { exercise_name: 'Behavioral Activation', target_days: 7 },
      rules: ['Gently challenge Alex to test reality before assuming peers harbor negative judgments.'],
    },
    {
      num: 2,
      mode: 'DAILY',
      topic: 'Daily Drill: Coffee Chat Social Exposure',
      initialMood: 4,
      finalMood: 7,
      daysAgo: 18,
      summary: '5-minute drill processing the completion of a scheduled 10-minute coffee break with Priya.',
      episodes: [{
        situation: 'Walking to coffee shop with Priya',
        automatic_thought: 'I will run out of things to say and freeze up.',
        emotion: 'Anticipatory Anxiety',
        intensity_before: 7,
        intensity_after: 3,
        reframed_thought: 'We share common interests in photography; asking open-ended questions keeps conversation fluid.',
        person: { name: 'Colleague Priya', role: 'Teammate', sentiment: 'warm' },
        trigger: { name: 'Coffee Chat Initiation', category: 'Social', intensity: 7 },
        distortion: 'Catastrophizing',
      }],
      dailyPractice: {
        exercise_name: 'Behavioral Activation',
        user_reflection: 'Conversation flowed naturally for 25 minutes instead of 10.',
        completed: true,
        mood_before: 4,
        mood_after: 7,
      },
    },
    {
      num: 3,
      mode: 'WEEKLY',
      topic: 'Public Speaking Panic at Toastmasters Club',
      initialMood: 3,
      finalMood: 6,
      daysAgo: 15,
      summary: 'Explored physiological panic symptoms (trembling hands, shallow breathing) during impromptu speaking exercises.',
      episodes: [{
        situation: 'Called up to speak for 2 minutes on stage by Group Leader Kevin',
        automatic_thought: 'My voice will shake, everyone will pity me, and I will humiliate myself.',
        emotion: 'Stage Fright',
        intensity_before: 9,
        intensity_after: 4,
        reframed_thought: 'Physiological arousal is normal adrenaline, not a sign of catastrophic humiliation.',
        person: { name: 'Group Leader Kevin', role: 'Toastmasters Organizer', sentiment: 'encouraging' },
        trigger: { name: 'Table Topics Impromptu Speech', category: 'Public Speaking', intensity: 9 },
        distortion: 'Catastrophizing',
        core_belief: { statement: 'Visible anxiety makes me inferior to others', category: 'Worthlessness' },
      }],
      homework: { exercise_name: 'Decatastrophizing Script', target_days: 7 },
      rules: ['Reinforce somatic grounding (diaphragmatic breathing) before public speaking events.'],
    },
    {
      num: 4,
      mode: 'ON_DEMAND',
      topic: 'Acute Panic in Crowded Subway Car',
      initialMood: 2,
      finalMood: 6,
      daysAgo: 13,
      summary: 'Emergency distress tolerance call while experiencing sensory overload and claustrophobia on delayed subway.',
      episodes: [{
        situation: 'Subway train stopped between stations in dark tunnel with packed crowd',
        automatic_thought: 'I cannot breathe and I am going to pass out in front of strangers.',
        emotion: 'Claustrophobia & Terror',
        intensity_before: 10,
        intensity_after: 4,
        reframed_thought: 'The train has adequate ventilation and I have experienced this sensation before without fainting.',
        trigger: { name: 'Subway Tunnel Delay', category: 'Enclosed Space', intensity: 10 },
        distortion: 'Catastrophizing',
      }],
      dailyPractice: {
        exercise_name: '5-4-3-2-1 Grounding',
        user_reflection: 'Counting physical objects in the carriage prevented hyperventilation.',
        completed: true,
        mood_before: 2,
        mood_after: 6,
      },
    },
    {
      num: 5,
      mode: 'DAILY',
      topic: 'Daily Drill: Post-Party Cognitive Decontamination',
      initialMood: 5,
      finalMood: 8,
      daysAgo: 11,
      summary: '5-minute thought record deconstructing post-social rumination following housewarming gathering.',
      episodes: [{
        situation: 'Lying in bed replaying an awkward joke made at party',
        automatic_thought: 'Everyone laughed politely out of pity, they were secretly mocking me.',
        emotion: 'Rumination & Embarrassment',
        intensity_before: 7,
        intensity_after: 2,
        reframed_thought: 'People smiled genuinely and two guests asked for my contact information afterwards.',
        trigger: { name: 'Post-Party Replay', category: 'Rumination', intensity: 7 },
        distortion: 'Mental Filtering',
      }],
      dailyPractice: {
        exercise_name: '3-Column Thought Record',
        user_reflection: 'Counter-evidence was indisputable once written down.',
        completed: true,
        mood_before: 5,
        mood_after: 8,
      },
    },
    {
      num: 6,
      mode: 'WEEKLY',
      topic: 'Family Obligation & Parental Approval Trap',
      initialMood: 4,
      finalMood: 7,
      daysAgo: 9,
      summary: 'Unpacked emotional exhaustion from Sunday phone calls with father Thomas questioning creative career path.',
      episodes: [{
        situation: 'Father Thomas questioning salary prospects in design compared to software engineering',
        automatic_thought: 'If I do not please my father, I am an ungrateful son who brought shame on our family.',
        emotion: 'Chronic Guilt',
        intensity_before: 8,
        intensity_after: 4,
        reframed_thought: 'My father’s anxieties stem from his background, but my life choices belong to me.',
        person: { name: 'Father Thomas', role: 'Father', sentiment: 'critical' },
        trigger: { name: 'Weekly Sunday Family Phone Call', category: 'Family', intensity: 8 },
        distortion: 'Personalization',
        core_belief: { statement: 'I must sacrifice my autonomy to earn love', category: 'Unlovability' },
      }],
      homework: { exercise_name: 'Boundary Assertion Script', target_days: 7 },
    },
    {
      num: 7,
      mode: 'WEEKLY',
      topic: 'Dating Anxiety & Rejection Sensitivity',
      initialMood: 3,
      finalMood: 7,
      daysAgo: 7,
      summary: 'Worked through acute rejection sensitivity after date Jordan took 24 hours to respond to a message.',
      episodes: [{
        situation: 'Sent follow-up text to date Jordan with no response after 24 hours',
        automatic_thought: 'Jordan realized I am uninteresting and is ghosting me; nobody ever stays.',
        emotion: 'Heartbreak & Anticipatory Rejection',
        intensity_before: 8,
        intensity_after: 3,
        reframed_thought: 'People have demanding work schedules and personal obligations that have nothing to do with me.',
        person: { name: 'Date Jordan', role: 'Romantic Interest', sentiment: 'ambivalent' },
        trigger: { name: 'Unanswered Text Message', category: 'Dating', intensity: 8 },
        distortion: 'Overgeneralization',
        core_belief: { statement: 'I am destined to be abandoned', category: 'Unlovability' },
      }],
      homework: { exercise_name: 'Worry Time Scheduling', target_days: 7 },
    },
    {
      num: 8,
      mode: 'DAILY',
      topic: 'Daily Drill: Attending Photography Workshop',
      initialMood: 5,
      finalMood: 8,
      daysAgo: 5,
      summary: 'Behavioral activation debrief: successfully participated in a 2-hour street photography workshop alone.',
      episodes: [{
        situation: 'Arriving alone at community center photography class',
        automatic_thought: 'Everyone already knows each other; I will stand alone like an outsider.',
        emotion: 'Social Hesitation',
        intensity_before: 6,
        intensity_after: 2,
        reframed_thought: 'Workshops are designed for individuals to learn and meet new peers.',
        trigger: { name: 'Entering New Community Class', category: 'Social', intensity: 6 },
        distortion: 'Fortune Telling',
      }],
      dailyPractice: {
        exercise_name: 'Behavioral Activation',
        user_reflection: 'Ended up partnering with a fellow beginner and sharing gear tips.',
        completed: true,
        mood_before: 5,
        mood_after: 8,
      },
    },
    {
      num: 9,
      mode: 'WEEKLY',
      topic: 'Assertive Communication & Conflict with Senior Designer Maya',
      initialMood: 4,
      finalMood: 8,
      daysAgo: 3,
      summary: 'Practiced direct boundary communication when Senior Designer Maya altered project specs without consulting Alex.',
      episodes: [{
        situation: 'Maya redid interface wireframes without discussing user research data',
        automatic_thought: 'If I speak up and disagree, Maya will despise me and create a hostile workplace.',
        emotion: 'Anxious Submissiveness',
        intensity_before: 8,
        intensity_after: 3,
        reframed_thought: 'Professional disagreement supported by research data is expected in product design.',
        person: { name: 'Senior Designer Maya', role: 'Design Lead', sentiment: 'dominant' },
        trigger: { name: 'Wireframe Spec Override', category: 'Work', intensity: 8 },
        distortion: 'Catastrophizing',
        core_belief: { statement: 'Expressing disagreement leads to immediate rejection', category: 'Helplessness' },
      }],
      homework: { exercise_name: 'Boundary Assertion Script', target_days: 7 },
    },
    {
      num: 10,
      mode: 'WEEKLY',
      topic: '10-Session Clinical Milestone & Social Independence',
      initialMood: 7,
      finalMood: 9,
      daysAgo: 1,
      summary: 'Milestone reflection session. Celebrated overcoming subway panic, establishing firm boundaries with Maya, and hosting a photography meetup.',
      episodes: [{
        situation: 'Organized and hosted first 6-person photography walk in downtown park',
        automatic_thought: 'I might get overwhelmed or conversation will lag.',
        emotion: 'Healthy Nervous Energy',
        intensity_before: 4,
        intensity_after: 1,
        reframed_thought: 'I have successfully hosted and participated in dozens of conversations; I can trust my social resilience.',
        person: { name: 'Colleague Priya', role: 'Teammate', sentiment: 'close friend' },
        trigger: { name: 'Hosting Community Meetup', category: 'Milestone', intensity: 4 },
        distortion: 'Fortune Telling',
      }],
      homework: { exercise_name: 'Behavioral Activation', target_days: 30 },
      rules: ['Encourage Alex to continue organizing creative community events independently.'],
    },
  ];

  // ============================================================================
  // EXECUTE SYNC FOR USER 1 (SARAH)
  // ============================================================================
  console.log('👤 [1/2] SYNCING 10 COMPLETE SESSIONS FOR USER 1: "sarah.miller@gmail.com"...');
  for (const s of sarahSessions) {
    const startedAt = baseTime + (s.daysAgo * 86400);
    const endedAt = startedAt + 2700; // 45 min
    const sessionId = `sarah_sess_${String(s.num).padStart(2, '0')}`;

    console.log(`  👉 Syncing Session ${s.num}/10 [${s.mode}]: "${s.topic}" (${sessionId})`);
    await syncSessionToFalkorDB({
      userId: sarahEmail,
      sessionRecord: {
        id: sessionId,
        userId: sarahEmail,
        startedAt: new Date(startedAt * 1000).toISOString(),
        endedAt: new Date(endedAt * 1000).toISOString(),
      },
      extractedData: {
        mode: s.mode,
        summary: s.summary,
        initial_mood: s.initialMood,
        final_mood: s.finalMood,
        episodes: s.episodes,
        daily_practice: s.dailyPractice || null,
        homework: s.homework || null,
        therapist_rules: s.rules || [],
        agent_state: {
          recommended_next_mode: s.mode === 'WEEKLY' ? 'DAILY' : 'WEEKLY',
          urgent_flag: false,
          handoff_context: `Session ${s.num} complete on topic: ${s.topic}`,
        },
      },
    });
  }
  console.log('✅ User 1 (sarah.miller@gmail.com) 10 sessions synced successfully!\n');

  // ============================================================================
  // EXECUTE SYNC FOR USER 2 (ALEX)
  // ============================================================================
  console.log('👤 [2/2] SYNCING 10 COMPLETE SESSIONS FOR USER 2: "alex.chen@yahoo.com"...');
  for (const s of alexSessions) {
    const startedAt = baseTime + (s.daysAgo * 86400);
    const endedAt = startedAt + 2700; // 45 min
    const sessionId = `alex_sess_${String(s.num).padStart(2, '0')}`;

    console.log(`  👉 Syncing Session ${s.num}/10 [${s.mode}]: "${s.topic}" (${sessionId})`);
    await syncSessionToFalkorDB({
      userId: alexEmail,
      sessionRecord: {
        id: sessionId,
        userId: alexEmail,
        startedAt: new Date(startedAt * 1000).toISOString(),
        endedAt: new Date(endedAt * 1000).toISOString(),
      },
      extractedData: {
        mode: s.mode,
        summary: s.summary,
        initial_mood: s.initialMood,
        final_mood: s.finalMood,
        episodes: s.episodes,
        daily_practice: s.dailyPractice || null,
        homework: s.homework || null,
        therapist_rules: s.rules || [],
        agent_state: {
          recommended_next_mode: s.mode === 'WEEKLY' ? 'DAILY' : 'WEEKLY',
          urgent_flag: false,
          handoff_context: `Session ${s.num} complete on topic: ${s.topic}`,
        },
      },
    });
  }
  console.log('✅ User 2 (alex.chen@yahoo.com) 10 sessions synced successfully!\n');

  // ============================================================================
  // FALKORDB VERIFICATION & STATS
  // ============================================================================
  console.log('================================================================');
  console.log('🔍 FALKORDB MULTI-TENANT ISOLATION & NODE TREE VERIFICATION');
  console.log('================================================================');
  const g = await falkor.getGraph();

  // 1. Direct HAS_SESSION connections for Sarah
  const sarahDirectSessions = await g.query(`
    MATCH (u:User {id: $email})-[:HAS_SESSION]->(s:Session)
    RETURN s.id AS id, s.mode AS mode, s.started_at AS started
    ORDER BY s.id
  `, { params: { email: sarahEmail } });

  // 2. Direct HAS_SESSION connections for Alex
  const alexDirectSessions = await g.query(`
    MATCH (u:User {id: $email})-[:HAS_SESSION]->(s:Session)
    RETURN s.id AS id, s.mode AS mode, s.started_at AS started
    ORDER BY s.id
  `, { params: { email: alexEmail } });

  // 3. Node count breakdown for Sarah
  const sarahNodeStats = await g.query(`
    MATCH (n) WHERE n.userId = $email OR n.id = $email
    RETURN labels(n)[0] AS label, count(n) AS count
    ORDER BY count DESC
  `, { params: { email: sarahEmail } });

  // 4. Node count breakdown for Alex
  const alexNodeStats = await g.query(`
    MATCH (n) WHERE n.userId = $email OR n.id = $email
    RETURN labels(n)[0] AS label, count(n) AS count
    ORDER BY count DESC
  `, { params: { email: alexEmail } });

  // 5. Cross-User Path Isolation Check (Zero Shared Nodes & Zero Cross-User Edges)
  const sharedNodesRes = await g.query(`
    MATCH (n1 {userId: $email1})
    MATCH (n2 {userId: $email2})
    WHERE n1 = n2
    RETURN count(n1) AS sharedNodes
  `, { params: { email1: sarahEmail, email2: alexEmail } });
  const sharedNodes = (sharedNodesRes.data || sharedNodesRes.result_set || [])[0]?.sharedNodes || 0;

  const crossEdgeRes = await g.query(`
    MATCH (n1)-[r]->(n2)
    WHERE (n1.userId = $email1 OR n1.id = $email1)
      AND (n2.userId = $email2 OR n2.id = $email2)
    RETURN count(r) AS crossEdges
  `, { params: { email1: sarahEmail, email2: alexEmail } });
  const crossEdges = (crossEdgeRes.data || crossEdgeRes.result_set || [])[0]?.crossEdges || 0;

  console.log(`\n📊 SARAH MILLER ("${sarahEmail}"):`);
  console.log(`  - Direct sessions attached to Primary User node via [:HAS_SESSION]: ${(sarahDirectSessions.data || []).length}/10`);
  console.log('  - Node Inventory in Sarah’s Tree:');
  for (const row of (sarahNodeStats.data || [])) {
    console.log(`      * ${row.label}: ${row.count}`);
  }

  console.log(`\n📊 ALEX CHEN ("${alexEmail}"):`);
  console.log(`  - Direct sessions attached to Primary User node via [:HAS_SESSION]: ${(alexDirectSessions.data || []).length}/10`);
  console.log('  - Node Inventory in Alex’s Tree:');
  for (const row of (alexNodeStats.data || [])) {
    console.log(`      * ${row.label}: ${row.count}`);
  }

  console.log('\n================================================================');
  console.log('🔒 ISOLATION INTEGRITY CHECK:');
  console.log('================================================================');
  console.log(`Shared Nodes between Sarah and Alex: ${sharedNodes}`);
  console.log(`Cross-connecting Edges between Sarah and Alex: ${crossEdges}`);
  if (Number(sharedNodes) === 0 && Number(crossEdges) === 0) {
    console.log('🎉 100% ISOLATION VERIFIED: Exactly ZERO shared nodes or cross-connecting edges!');
    console.log('🎉 Both users have completely independent, separate graphs in FalkorDB!');
  } else {
    console.error('❌ FAILED: Found cross-user connections!');
  }
  console.log('================================================================\n');

  process.exit(0);
}

main().catch((err) => {
  console.error('Simulation error:', err);
  process.exit(1);
});
