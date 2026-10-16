import { FalkorDB } from 'falkordb';
import dotenv from 'dotenv';

dotenv.config();

const host = process.env.FALKORDB_HOST || 'localhost';
const port = parseInt(process.env.FALKORDB_PORT || '6379', 10);
const password = process.env.FALKORDB_PASSWORD || undefined;
const graphName = process.env.FALKORDB_GRAPH || 'therapy_memory';

class FalkorManager {
  constructor() {
    this.driver = null;
    this.graph = null;
    this.connecting = false;
  }

  async getGraph() {
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
        },
        password,
      });

      // Always swallow error events on driver to prevent Node unhandled exception crashes
      driver.on('error', (err) => {
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

  async query(cypher, params = {}) {
    const g = await this.getGraph();
    return g.query(cypher, { params });
  }

  async checkHealth() {
    try {
      const g = await this.getGraph();
      const res = await g.query('RETURN 1 AS alive');
      return { connected: true, result: res.data };
    } catch (err) {
      return { connected: false, error: err.message };
    }
  }

  async clearAll() {
    const g = await this.getGraph();
    await g.query('MATCH (n) DETACH DELETE n');
    return { success: true, message: 'FalkorDB graph cleared completely.' };
  }

  async initIndices() {
    const g = await this.getGraph();
    const indexes = [
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
}

export const falkor = new FalkorManager();
export default falkor;
