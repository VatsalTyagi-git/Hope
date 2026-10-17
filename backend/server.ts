import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import prisma from './db/index.js';
import falkor from './db/falkor.js';
import { extractCbtSessionData } from './services/cbtExtractor.js';
import { syncSessionToFalkorDB } from './services/graphMemorySync.js';
import { chatbotAgent } from './services/chatbotAgent.js';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const geminiApiKey = process.env.GOOGLE_API_KEY;
const aiClient = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;

// Define Types & Interfaces
export interface TranscriptTurn {
  role?: string;
  content?: string;
  createdAt?: number | string | Date;
}

export interface SessionTranscriptPayload {
  roomName?: string;
  userId?: string;
  startedAt?: number;
  endedAt?: number;
  transcript?: TranscriptTurn[];
  mode?: string;
}

export interface InMemoryTranscript {
  id: string;
  roomName?: string;
  userId: string;
  startedAt: Date;
  endedAt: Date;
  transcript: TranscriptTurn[];
  receivedAt: string;
}

process.on('uncaughtException', (err: Error) => {
  console.warn('⚠️  [Backend Uncaught Exception Guard]:', err?.message || err);
});
process.on('unhandledRejection', (reason: unknown) => {
  console.warn('⚠️  [Backend Unhandled Rejection Guard]:', reason);
});

const app = express();
const PORT: number | string = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// In-memory store fallback (in case DB is temporarily offline)
const inMemoryTranscripts: InMemoryTranscript[] = [];

// Health check endpoint with DB and FalkorDB connectivity status
app.get('/health', async (_req: Request, res: Response) => {
  let dbConnected = false;
  let dbError: string | null = null;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbConnected = true;
  } catch (err: any) {
    dbError = err.message;
  }

  const falkorStatus = await falkor.checkHealth();

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    postgres: {
      connected: dbConnected,
      error: dbConnected ? null : dbError,
    },
    falkordb: falkorStatus,
  });
});

// GET all received transcripts from PostgreSQL (falls back to memory if DB offline)
app.get('/api/sessions/transcripts', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string | undefined;
    const where = userId ? { userId } : {};
    const sessions = await prisma.session.findMany({
      where,
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      success: true,
      source: 'database',
      count: sessions.length,
      sessions,
    });
  } catch (err: any) {
    console.warn('⚠️ Database query failed, returning in-memory fallback:', err.message);
    return res.json({
      success: true,
      source: 'in-memory-fallback',
      dbError: err.message,
      count: inMemoryTranscripts.length,
      sessions: inMemoryTranscripts,
    });
  }
});

// GET a single session by id from PostgreSQL
app.get('/api/sessions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!session) {
      const memoryMatch = inMemoryTranscripts.find((s) => s.id === id);
      if (memoryMatch) {
        return res.json({ success: true, source: 'in-memory', session: memoryMatch });
      }
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    return res.json({
      success: true,
      source: 'database',
      session,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET FalkorDB graph memory statistics
app.get('/api/memory/stats', async (_req: Request, res: Response) => {
  try {
    const g = await falkor.getGraph();
    const nodeCounts = await g.query(`
      MATCH (n)
      RETURN labels(n)[0] AS label, count(n) AS count
      ORDER BY count DESC
    `);
    const relCounts = await g.query(`
      MATCH ()-[r]->()
      RETURN type(r) AS relationship, count(r) AS count
      ORDER BY count DESC
    `);

    res.json({
      success: true,
      nodes: nodeCounts.data || nodeCounts.result_set || [],
      relationships: relCounts.data || relCounts.result_set || [],
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST endpoint to clear FalkorDB and reinitialize schema
app.post('/api/memory/clear', async (_req: Request, res: Response) => {
  try {
    const clearRes = await falkor.clearAll();
    await falkor.initIndices();
    console.log('🧹 [FalkorDB] Cleared and indices reinitialized via API.');
    res.json({
      success: true,
      message: 'FalkorDB graph memory cleared completely and indices reinitialized.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET user memory overview from FalkorDB (Primary Root Node: User)
app.get('/api/memory/user/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;
  try {
    const g = await falkor.getGraph();

    // Query User primary node
    const userRes = await g.query(
      `
      MATCH (u:User {id: $userId})
      RETURN u.id, u.name, u.created_at, u.baseline_anxiety
      `,
      { params: { userId } }
    );

    // Query active state directly from primary User node
    const stateRes = await g.query(
      `
      MATCH (u:User {id: $userId})-[:HAS_STATE]->(a:AgentState)
      OPTIONAL MATCH (a)-[:ACTIVE_HOMEWORK]->(ex:CBTExercise)
      RETURN a.recommended_next_mode, a.active_homework, a.homework_streak,
             a.urgent_flag, a.handoff_context, a.updated_at, ex.name
      `,
      { params: { userId } }
    );

    // Query all sessions connected directly to primary User node via HAS_SESSION
    const sessionsRes = await g.query(
      `
      MATCH (u:User {id: $userId})-[:HAS_SESSION]->(s:Session)
      OPTIONAL MATCH (s)-[:CONDUCTED_BY]->(c:Companion)
      RETURN s.id, s.mode, s.started_at, s.ended_at, s.initial_mood, s.final_mood, s.summary, c.mode
      ORDER BY s.started_at DESC
      LIMIT 10
      `,
      { params: { userId } }
    );

    // Query episodes branching from sessions under this primary User node
    const episodesRes = await g.query(
      `
      MATCH (u:User {id: $userId})-[:HAS_SESSION]->(s:Session)-[:CAPTURED_EPISODE]->(e:Episode)
      OPTIONAL MATCH (e)-[:INVOLVED_PERSON]->(p:Person)
      OPTIONAL MATCH (e)-[:SPARKED_BY]->(t:Trigger)
      OPTIONAL MATCH (e)-[:EXHIBITED_DISTORTION]->(cd:CognitiveDistortion)
      RETURN e.situation, e.automatic_thought, e.emotion, e.reframed_thought,
             p.name AS person, t.name AS trigger, cd.name AS distortion, e.timestamp
      ORDER BY e.timestamp DESC
      LIMIT 10
      `,
      { params: { userId } }
    );

    // Query personalized therapist rules attached to primary User node
    const rulesRes = await g.query(
      `
      MATCH (u:User {id: $userId})-[:PREFERS_RULE]->(r:TherapistRule)
      RETURN r.rule, r.confidence, r.learned_from_mode
      LIMIT 5
      `,
      { params: { userId } }
    );

    res.json({
      success: true,
      userId,
      user: (userRes.data || userRes.result_set || [])[0] || null,
      agentState: (stateRes.data || stateRes.result_set || [])[0] || null,
      sessions: sessionsRes.data || sessionsRes.result_set || [],
      episodes: episodesRes.data || episodesRes.result_set || [],
      rules: rulesRes.data || rulesRes.result_set || [],
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET complete isolated node tree for a user
app.get('/api/memory/user/:userId/tree', async (req: Request, res: Response) => {
  const { userId } = req.params;
  try {
    const g = await falkor.getGraph();
    const treeRes = await g.query(
      `
      MATCH (u:User {id: $userId})-[r]->(target)
      RETURN type(r) AS relationship, labels(target)[0] AS target_label, target.id AS target_id, target.mode AS mode, target.summary AS summary
      `,
      { params: { userId } }
    );

    res.json({
      success: true,
      userId,
      root: { id: userId, label: 'User' },
      directConnections: treeRes.data || treeRes.result_set || [],
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Inactivity Debounce Timers map for auto-finalizing chat sessions
const sessionDebounceTimers = new Map<string, NodeJS.Timeout>();
const INACTIVITY_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes of inactivity

function scheduleSessionFinalization(sessionId: string, userId: string) {
  if (sessionDebounceTimers.has(sessionId)) {
    clearTimeout(sessionDebounceTimers.get(sessionId)!);
  }

  const timer = setTimeout(async () => {
    sessionDebounceTimers.delete(sessionId);
    console.log(`⏱️ [Auto-Finalizer] Inactivity timeout reached for session ${sessionId}. Finalizing in background...`);
    await finalizeChatSession(sessionId, userId);
  }, INACTIVITY_TIMEOUT_MS);

  sessionDebounceTimers.set(sessionId, timer);
}

export async function finalizeChatSession(sessionId: string, userId: string) {
  if (sessionDebounceTimers.has(sessionId)) {
    clearTimeout(sessionDebounceTimers.get(sessionId)!);
    sessionDebounceTimers.delete(sessionId);
  }

  try {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    if (!session) {
      console.warn(`[Finalizer] Session ${sessionId} not found.`);
      return { success: false, error: 'Session not found' };
    }

    // Check if session already has a substantive extracted summary
    const existingExtracted = (session.rawTranscript as any)?.extractedData;
    if (existingExtracted && session.summary && !session.summary.startsWith('Brief check-in')) {
      console.log(`[Finalizer] Session ${sessionId} already has full summary.`);
      return { success: true, alreadyFinalized: true, summary: session.summary };
    }

    const turns = session.messages.map((m) => ({
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
    }));

    const userTurns = turns.filter((t) => t.role === 'user');
    const totalUserWords = userTurns
      .map((t) => t.content?.trim().split(/\s+/).length || 0)
      .reduce((a, b) => a + b, 0);

    // CLINICAL GATEKEEPER: Is the conversation substantive enough for CBT extraction?
    // Rule: At least 2 user turns AND at least 10 user words
    const isSubstantive = userTurns.length >= 2 && totalUserWords >= 10;

    if (!isSubstantive) {
      console.log(
        `ℹ️ [Finalizer] Session ${sessionId} is a brief check-in (${userTurns.length} user turns, ${totalUserWords} words). Skipping FalkorDB graph sync.`
      );
      const briefSummary = 'Brief check-in with on-demand companion.';
      await prisma.session.update({
        where: { id: sessionId },
        data: {
          summary: briefSummary,
          rawTranscript: {
            turns,
            brief: true,
          },
        },
      });
      return {
        success: true,
        substantive: false,
        summary: briefSummary,
        falkorSynced: false,
      };
    }

    // SUBSTANTIVE SESSION: Run Gemini CBT Extractor + FalkorDB Graph Sync
    console.log(
      `🧠 [Finalizer] Substantive session detected (${userTurns.length} turns, ${totalUserWords} words). Running CBT extractor...`
    );
    const extractedData = await extractCbtSessionData(turns, {
      mode: 'ON_DEMAND',
      userId,
      roomName: session.roomName,
    });

    // Update PostgreSQL session record with clinical summary & extracted data
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        summary: extractedData.summary,
        rawTranscript: {
          turns,
          extractedData,
        },
      },
    });
    console.log(`📝 [Finalizer] Updated PostgreSQL session ${sessionId} with CBT summary!`);

    // Sync to FalkorDB graph memory
    await syncSessionToFalkorDB({
      userId,
      sessionRecord: session,
      extractedData,
    });
    console.log(`🕸️ [Finalizer] Synced session ${sessionId} to FalkorDB graph memory successfully!`);

    return {
      success: true,
      substantive: true,
      summary: extractedData.summary,
      falkorSynced: true,
      extractedData,
    };
  } catch (err: any) {
    console.error(`⚠️ [Finalizer Error] Failed to finalize session ${sessionId}:`, err.message);
    return { success: false, error: err.message };
  }
}

// POST endpoint: Real-time CBT Companion Chatbot with FalkorDB graph memory integration & turn-by-turn persistence
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const {
      sessionId,
      userId = '0ccbaecf-43fd-4b7f-91e0-d32233482b07',
      messages = [],
      mode = 'ON_DEMAND',
    } = req.body;

    const message = await chatbotAgent.generateChatReply({
      userId,
      messages,
      mode,
    });

    // Automatically persist this turn to PostgreSQL immediately
    if (sessionId) {
      try {
        const now = new Date();
        const fullTranscriptTurns = [
          ...messages,
          { role: 'assistant', content: message.content },
        ];
        const lastUserMsg = messages.length > 0 ? messages[messages.length - 1] : null;

        await prisma.session.upsert({
          where: { id: sessionId },
          create: {
            id: sessionId,
            roomName: `ondemand_chat_${sessionId}`,
            userId,
            startedAt: now,
            endedAt: now,
            rawTranscript: { turns: fullTranscriptTurns },
            messages: {
              create: [
                ...(lastUserMsg
                  ? [{ role: lastUserMsg.role || 'user', content: lastUserMsg.content, createdAt: now }]
                  : []),
                { role: 'assistant', content: message.content, createdAt: now },
              ],
            },
          },
          update: {
            endedAt: now,
            rawTranscript: { turns: fullTranscriptTurns },
            messages: {
              create: [
                ...(lastUserMsg
                  ? [{ role: lastUserMsg.role || 'user', content: lastUserMsg.content, createdAt: now }]
                  : []),
                { role: 'assistant', content: message.content, createdAt: now },
              ],
            },
          },
        });
        console.log(`💾 [Turn Persisted] Saved turn for session ${sessionId} to PostgreSQL!`);

        // Schedule auto-finalization after 3 minutes of inactivity
        scheduleSessionFinalization(sessionId, userId);
      } catch (dbErr: any) {
        console.warn(`⚠️ [Turn Persistence Note]: Could not save turn to PostgreSQL:`, dbErr.message);
      }
    }

    return res.json({
      success: true,
      message,
    });
  } catch (err: any) {
    console.error('⚠️ [API /api/chat Error]:', err?.message || err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Chat generation failed',
    });
  }
});

// POST endpoint to finalize a session immediately (e.g. user clicked End Session or New Conversation)
app.post('/api/sessions/finalize', async (req: Request, res: Response) => {
  try {
    const { sessionId, userId = '0ccbaecf-43fd-4b7f-91e0-d32233482b07' } = req.body;
    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'sessionId is required' });
    }

    const result = await finalizeChatSession(sessionId, userId);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

function parseSafeDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === 'number') {
    return new Date(val < 10000000000 ? val * 1000 : val);
  }
  if (typeof val === 'string') {
    if (/^\d+$/.test(val)) {
      const num = Number(val);
      return new Date(num < 10000000000 ? num * 1000 : num);
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

// POST endpoint where LiveKit Agent sends the transcript upon session completion
app.post('/api/sessions/transcript', async (req: Request<{}, {}, SessionTranscriptPayload>, res: Response) => {
  const { roomName, userId, startedAt, endedAt, transcript, mode = 'WEEKLY' } = req.body;

  const parsedStart = parseSafeDate(startedAt) || new Date();
  const parsedEnd = parseSafeDate(endedAt) || new Date();

  console.log('\n======================================================');
  console.log('📥 NEW TRANSCRIPT RECEIVED FROM AI THERAPIST AGENT');
  console.log('======================================================');
  console.log(`🏠 Room:       ${roomName || 'N/A'}`);
  console.log(`👤 User/ID:    ${userId || 'Anonymous'}`);
  console.log(`🧭 Mode:       ${mode}`);
  console.log(
    `⏱️  Duration:   ${parsedStart.toLocaleTimeString()} - ${parsedEnd.toLocaleTimeString()}`
  );
  console.log(`💬 Turn count: ${Array.isArray(transcript) ? transcript.length : 0}`);
  console.log('------------------------------------------------------');

  if (Array.isArray(transcript) && transcript.length > 0) {
    transcript.forEach((turn: TranscriptTurn, idx: number) => {
      const role = (turn.role || 'unknown').toUpperCase();
      const content = turn.content || '';
      console.log(`[${idx + 1}] [${role}]: ${content}`);
    });
  } else {
    console.log('(No message turns recorded in this session)');
  }
  console.log('======================================================\n');

  // 1. Format messages for PostgreSQL relation
  const formattedMessages = Array.isArray(transcript)
    ? transcript
        .filter((turn: TranscriptTurn) => turn.content && turn.content.trim())
        .map((turn: TranscriptTurn) => ({
          role: turn.role || 'user',
          content: turn.content!.trim(),
          createdAt: parseSafeDate(turn.createdAt) || new Date(),
        }))
    : [];

  let savedSession: any = null;
  let dbError: string | null = null;

  try {
    savedSession = await prisma.session.create({
      data: {
        roomName: roomName || 'unknown-room',
        userId: userId || 'anonymous',
        startedAt: parsedStart,
        endedAt: parsedEnd,
        rawTranscript: transcript || [],
        messages: {
          create: formattedMessages,
        },
      },
      include: {
        messages: true,
      },
    });
    console.log(`💾 Saved raw session ${savedSession.id} to PostgreSQL database!`);
  } catch (err: any) {
    dbError = err.message;
    console.warn('⚠️  Could not save to PostgreSQL database:', err.message);

    savedSession = {
      id: `sess_mem_${Date.now()}`,
      roomName,
      userId: userId || 'anonymous',
      startedAt: startedAt ? new Date(startedAt * 1000) : new Date(),
      endedAt: endedAt ? new Date(endedAt * 1000) : new Date(),
    };

    inMemoryTranscripts.push({
      ...savedSession,
      transcript: transcript || [],
      receivedAt: new Date().toISOString(),
    });
  }

  // 2. Generate CBT Summary & Structured Analysis using Gemini LLM
  let extractedData: any = null;
  let extractionError: string | null = null;

  try {
    console.log('🧠 Generating CBT summary & clinical memory extraction via Gemini...');
    extractedData = await extractCbtSessionData(transcript, {
      mode,
      userId: savedSession.userId,
      roomName,
    });
    console.log('✨ CBT Summary generated successfully:');
    console.log(`   "${extractedData.summary}"`);
  } catch (err: any) {
    extractionError = err.message;
    console.error('⚠️  CBT extraction via LLM failed:', err.message);
    extractedData = {
      summary: 'Session completed. Speech turns captured in database.',
      initial_mood: 5,
      final_mood: 5,
      mode,
      episodes: [],
      daily_practice: null,
      homework: null,
      therapist_rules: [],
      agent_state: {
        recommended_next_mode: mode,
        urgent_flag: false,
        handoff_context: '',
      },
    };
  }

  // 3. Update PostgreSQL session record with the generated summary
  if (savedSession && !dbError && extractedData.summary) {
    try {
      await prisma.session.update({
        where: { id: savedSession.id },
        data: {
          summary: extractedData.summary,
          rawTranscript: {
            turns: transcript || [],
            extractedData: extractedData || null,
          },
        },
      });
      console.log(`📝 Updated PostgreSQL session ${savedSession.id} with CBT summary!`);
    } catch (updateErr: any) {
      console.warn('⚠️  Could not update session summary in PostgreSQL:', updateErr.message);
    }
  }

  // 4. Sync entities & relationships into FalkorDB matching the CBT schema
  let falkorSynced = false;
  let falkorError: string | null = null;

  try {
    console.log('🕸️  Syncing session and clinical memory entities into FalkorDB...');
    await syncSessionToFalkorDB({
      userId: savedSession.userId,
      sessionRecord: savedSession,
      extractedData,
    });
    falkorSynced = true;
    console.log('✅ FalkorDB graph memory updated successfully!');
  } catch (err: any) {
    falkorError = err.message;
    console.error('⚠️  FalkorDB graph sync failed:', err.message);
  }

  // 5. Send complete response to agent/client
  res.status(200).json({
    success: true,
    message: 'Transcript saved, summary generated, and FalkorDB graph memory updated.',
    sessionId: savedSession.id,
    userId: savedSession.userId,
    summary: extractedData.summary,
    extractedData,
    dbSaved: !dbError,
    dbError,
    llmExtracted: !extractionError,
    extractionError,
    falkorSynced,
    falkorError,
    turnsCount: Array.isArray(transcript) ? transcript.length : 0,
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Express server running on http://localhost:${PORT}`);
  console.log(`👉 Health check: http://localhost:${PORT}/health`);
  console.log(`👉 Transcript endpoint: POST http://localhost:${PORT}/api/sessions/transcript`);
  console.log(`👉 View transcripts: GET http://localhost:${PORT}/api/sessions/transcripts`);
  console.log(`👉 FalkorDB memory stats: GET http://localhost:${PORT}/api/memory/stats`);
  console.log(`👉 User memory overview: GET http://localhost:${PORT}/api/memory/user/:userId`);
});
