import { FalkorDB } from 'falkordb';
import dotenv from 'dotenv';

dotenv.config();

const host = process.env.FALKORDB_HOST || 'localhost';
const port = parseInt(process.env.FALKORDB_PORT || '6379', 10);
const password = process.env.FALKORDB_PASSWORD || undefined;
const graphName = process.env.FALKORDB_GRAPH || 'therapy_memory';

class FalkorManager {
  driver: any = null;
  graph: any = null;
  connecting: boolean = false;

  async getGraph(): Promise<any> {
    if (this.graph && this.driver) {
      return this.graph;
    }

    if (this.connecting) {
      // Avoid stampede
      await new Promise((r) => setTimeout(r, 200));
      if (this.graph) return this.graph;
    }

    this.connecting = true;
    try {
      const driver = await FalkorDB.connect({
        socket: {
          host,
          port,
          connectTimeout: 5000,
          timeout: 10000,
          reconnectStrategy: false, // Don't infinite loop reconnect if daemon is dead
        } as any,
        password,
      });

      // Always swallow error events on driver to prevent Node unhandled exception crashes
      driver.on('error', (err: any) => {
        console.warn('⚠️  [FalkorDB Socket Notice]:', err?.message || err);
        this.graph = null;
        this.driver = null;
      });

      this.driver = driver;
      this.graph = driver.selectGraph(graphName);
      return this.graph;
    } catch (connErr) {
      this.graph = null;
      this.driver = null;
      throw connErr;
    } finally {
      this.connecting = false;
    }
  }

  async query(cypher: string, params: Record<string, any> = {}): Promise<any> {
    const g = await this.getGraph();
    return g.query(cypher, { params });
  }

  async checkHealth(): Promise<{ connected: boolean; result?: any; error?: string }> {
    try {
      const g = await this.getGraph();
      const res = await g.query('RETURN 1 AS alive');
      return { connected: true, result: res.data };
    } catch (err: any) {
      return { connected: false, error: err?.message || String(err) };
    }
  }

  async clearAll(): Promise<{ success: boolean; message: string }> {
    const g = await this.getGraph();
    await g.query('MATCH (n) DETACH DELETE n');
    return { success: true, message: 'FalkorDB graph cleared completely.' };
  }

  async initIndices(): Promise<void> {
    const g = await this.getGraph();
    const indexes: [string, string][] = [
      ['User', 'id'],
      ['Companion', 'id'],
      ['Companion', 'userId'],
      ['Session', 'id'],
      ['Session', 'userId'],
      ['Session', 'started_at'],
      ['AgentState', 'id'],
      ['AgentState', 'userId'],
      ['Episode', 'id'],
      ['Episode', 'userId'],
      ['Person', 'id'],
      ['Person', 'userId'],
      ['Trigger', 'id'],
      ['Trigger', 'userId'],
      ['CognitiveDistortion', 'id'],
      ['CognitiveDistortion', 'userId'],
      ['CoreBelief', 'id'],
      ['CoreBelief', 'userId'],
      ['DailyPractice', 'id'],
      ['DailyPractice', 'userId'],
      ['CBTExercise', 'id'],
      ['CBTExercise', 'userId'],
      ['Handoff', 'id'],
      ['Handoff', 'userId'],
      ['TherapistRule', 'id'],
      ['TherapistRule', 'userId'],
    ];

    for (const [label, prop] of indexes) {
      try {
        await g.query(`CREATE INDEX FOR (n:${label}) ON (n.${prop})`);
      } catch (e) {
        // FalkorDB ignores if index already exists
      }
    }
  }

  async deleteSession(sessionId: string, _userId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const g = await this.getGraph();

      // 1. Relink NEXT_SESSION chain if prev_s and next_s exist
      try {
        await g.query(
          `
          MATCH (s:Session) WHERE s.id = $sessionId OR s.transcript_db_id = $sessionId
          OPTIONAL MATCH (prev_s:Session)-[:NEXT_SESSION]->(s)
          OPTIONAL MATCH (s)-[:NEXT_SESSION]->(next_s:Session)
          FOREACH (_ IN CASE WHEN prev_s IS NOT NULL AND next_s IS NOT NULL THEN [1] ELSE [] END |
            CREATE (prev_s)-[:NEXT_SESSION]->(next_s)
          )
          `,
          { params: { sessionId } }
        );
      } catch (e: any) {
        console.warn(`[FalkorDB deleteSession relink next]:`, e?.message);
      }

      // 2. Relink LATEST_SESSION if s was latest
      try {
        await g.query(
          `
          MATCH (s:Session) WHERE s.id = $sessionId OR s.transcript_db_id = $sessionId
          OPTIONAL MATCH (u:User)-[ls:LATEST_SESSION]->(s)
          OPTIONAL MATCH (prev_s:Session)-[:NEXT_SESSION]->(s)
          DELETE ls
          FOREACH (_ IN CASE WHEN u IS NOT NULL AND prev_s IS NOT NULL THEN [1] ELSE [] END |
            MERGE (u)-[:LATEST_SESSION]->(prev_s)
          )
          `,
          { params: { sessionId } }
        );
      } catch (e: any) {
        console.warn(`[FalkorDB deleteSession relink latest]:`, e?.message);
      }

      // 3. Delete Episode nodes captured by this session
      try {
        await g.query(
          `
          MATCH (s:Session)-[:CAPTURED_EPISODE]->(e:Episode)
          WHERE s.id = $sessionId OR s.transcript_db_id = $sessionId
          DETACH DELETE e
          `,
          { params: { sessionId } }
        );
        await g.query(
          `
          MATCH (e:Episode) WHERE e.id STARTS WITH "ep_" + $sessionId + "_"
          DETACH DELETE e
          `,
          { params: { sessionId } }
        );
      } catch (e: any) {
        console.warn(`[FalkorDB deleteSession episodes]:`, e?.message);
      }

      // 4. Delete DailyPractice nodes logged by this session
      try {
        await g.query(
          `
          MATCH (s:Session)-[:LOGGED_PRACTICE]->(d:DailyPractice)
          WHERE s.id = $sessionId OR s.transcript_db_id = $sessionId
          DETACH DELETE d
          `,
          { params: { sessionId } }
        );
        await g.query(
          `
          MATCH (d:DailyPractice) WHERE d.id = "practice_" + $sessionId
          DETACH DELETE d
          `,
          { params: { sessionId } }
        );
      } catch (e: any) {
        console.warn(`[FalkorDB deleteSession practice]:`, e?.message);
      }

      // 5. Delete Handoff nodes created by this session
      try {
        await g.query(
          `
          MATCH (s:Session)-[:CREATED_HANDOFF]->(h:Handoff)
          WHERE s.id = $sessionId OR s.transcript_db_id = $sessionId
          DETACH DELETE h
          `,
          { params: { sessionId } }
        );
        await g.query(
          `
          MATCH (h:Handoff) WHERE h.id = "handoff_" + $sessionId
          DETACH DELETE h
          `,
          { params: { sessionId } }
        );
      } catch (e: any) {
        console.warn(`[FalkorDB deleteSession handoff]:`, e?.message);
      }

      // 6. Finally detach and delete the Session node itself
      await g.query(
        `
        MATCH (s:Session)
        WHERE s.id = $sessionId OR s.transcript_db_id = $sessionId
        DETACH DELETE s
        `,
        { params: { sessionId } }
      );

      console.log(`🧹 [FalkorDB] Successfully purged session ${sessionId} and associated clinical memory nodes.`);
      return { success: true };
    } catch (err: any) {
      console.error(`[FalkorDB deleteSession Error]:`, err?.message || err);
      return { success: false, error: err?.message || 'Failed to delete session from FalkorDB' };
    }
  }
}

export const falkor = new FalkorManager();
export default falkor;
