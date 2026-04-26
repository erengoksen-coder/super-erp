import { AgentType, AgentReport, AgentDecision, AgentAction } from './types';
import fs from 'fs';
import path from 'path';

export abstract class BaseAgent {
  public abstract id: AgentType;
  protected logsDir: string;

  constructor() {
    this.logsDir = path.join(process.cwd(), 'logs', 'agents');
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  /**
   * Log an agent-specific message to the agent-specific log file.
   */
  protected async log(message: string, level: 'info' | 'warn' | 'error' = 'info'): Promise<void> {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
    const logFile = path.join(this.logsDir, `${this.id}.log`);
    fs.appendFileSync(logFile, logLine);
    console.log(`[Agent:${this.id}] ${message}`);
  }

  /**
   * Analyze the system state and return findings.
   */
  public abstract analyze(): Promise<string[]>;

  /**
   * Decide on an action based on the analysis.
   */
  public abstract decide(findings: string[]): Promise<AgentDecision[]>;

  /**
   * Execute a decided action.
   */
  public abstract act(decision: AgentDecision): Promise<AgentAction>;

  /**
   * Run the full agent lifecycle.
   */
  public async run(): Promise<AgentReport> {
    const report: AgentReport = {
      agentId: this.id,
      status: 'analyzing',
      lastRun: new Date().toISOString(),
      findings: [],
      suggestions: []
    };

    try {
      await this.log('Starting analysis phase...');
      report.findings = await this.analyze();
      
      await this.log(`Analysis complete. Found ${report.findings.length} points of interest.`);
      report.suggestions = await this.decide(report.findings);
      
      await this.log(`Decided on ${report.suggestions.length} potential actions.`);
      report.status = 'idle';
    } catch (error: any) {
      report.status = 'error';
      await this.log(`Critical failure: ${error.message}`, 'error');
    }

    return report;
  }
}
