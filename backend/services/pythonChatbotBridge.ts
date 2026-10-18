import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface GenerateChatReplyOptions {
  userId?: string;
  messages: ChatMessage[];
  mode?: string;
  sessionId?: string;
}

export class PythonChatbotBridge {
  private pythonPath: string;
  private scriptPath: string;
  private cwd: string;
  private workerProcess: ChildProcess | null = null;
  private pendingCallbacks: Map<
    string,
    { resolve: (val: any) => void; reject: (err: any) => void; timeout: NodeJS.Timeout }
  > = new Map();
  private isReady: boolean = false;

  constructor() {
    const rootDir = path.resolve(__dirname, '..', '..');
    const myAgentDir = path.join(rootDir, 'my-agent');
    this.cwd = myAgentDir;
    this.scriptPath = path.join(myAgentDir, 'src', 'chatbot.py');
    this.pythonPath = path.join(myAgentDir, '.venv', 'Scripts', 'python.exe');

    // Pre-warm the persistent Python worker on server startup to eliminate cold-start lag
    try {
      this.getWorker();
    } catch (e) {
      console.warn('⚠️ [PythonChatbotBridge] Pre-warm failed, will retry on demand:', e);
    }
  }

  /**
   * Spawns or retrieves the persistent Python chatbot worker process in my-agent
   */
  private getWorker(): ChildProcess {
    if (this.workerProcess && !this.workerProcess.killed && this.workerProcess.exitCode === null) {
      return this.workerProcess;
    }

    console.log(`🐍 [PythonChatbotBridge] Launching persistent Python chatbot worker in my-agent...`);
    this.workerProcess = spawn(this.pythonPath, [this.scriptPath, '--worker'], {
      cwd: this.cwd,
      stdio: ['pipe', 'pipe', 'inherit'],
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
        PYTHONUNBUFFERED: '1',
      },
    });

    let stdoutBuffer = '';
    this.workerProcess.stdout?.on('data', (chunk: Buffer) => {
      stdoutBuffer += chunk.toString('utf-8');
      const lines = stdoutBuffer.split('\n');
      stdoutBuffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const json = JSON.parse(trimmed);
          if (json.status === 'ready') {
            this.isReady = true;
            console.log(`✅ [PythonChatbotBridge] Python chatbot in my-agent is ready!`);
            continue;
          }
          if (json.reqId && this.pendingCallbacks.has(json.reqId)) {
            const { resolve, reject, timeout } = this.pendingCallbacks.get(json.reqId)!;
            clearTimeout(timeout);
            this.pendingCallbacks.delete(json.reqId);
            if (json.success && json.message) {
              resolve(json.message);
            } else {
              reject(new Error(json.error || 'Python chatbot generation failed'));
            }
          }
        } catch {
          // Non-JSON logging line from Python
        }
      }
    });

    this.workerProcess.on('exit', (code) => {
      console.warn(`⚠️ [PythonChatbotBridge] Python worker exited with code ${code}`);
      this.workerProcess = null;
      this.isReady = false;
      for (const [reqId, { reject, timeout }] of this.pendingCallbacks.entries()) {
        clearTimeout(timeout);
        reject(new Error(`Python chatbot worker terminated unexpectedly (code ${code})`));
      }
      this.pendingCallbacks.clear();
    });

    return this.workerProcess;
  }

  /**
   * Generates chat reply using Python chatbot and its toolcalling in my-agent
   */
  async generateChatReply(
    options: GenerateChatReplyOptions
  ): Promise<{ role: string; content: string }> {
    const worker = this.getWorker();
    const reqId = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const payload = JSON.stringify({ ...options, reqId }) + '\n';

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (this.pendingCallbacks.has(reqId)) {
          this.pendingCallbacks.delete(reqId);
          reject(new Error('Python chatbot generation timed out after 30 seconds'));
        }
      }, 30000);

      this.pendingCallbacks.set(reqId, { resolve, reject, timeout });

      try {
        worker.stdin?.write(payload, 'utf-8');
      } catch (err) {
        clearTimeout(timeout);
        this.pendingCallbacks.delete(reqId);
        reject(err);
      }
    });
  }
}

export const pythonChatbotBridge = new PythonChatbotBridge();
export default pythonChatbotBridge;
