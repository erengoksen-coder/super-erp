import { AgentType, AgentReport } from './types';
import { BaseAgent } from './BaseAgent';

export class AgentRegistry {
  private static instance: AgentRegistry;
  private agents: Map<AgentType, BaseAgent> = new Map();

  private constructor() {}

  public static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  public register(agent: BaseAgent): void {
    this.agents.set(agent.id, agent);
  }

  public getAgent(id: AgentType): BaseAgent | undefined {
    return this.agents.get(id);
  }

  public getAllAgents(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Run all registered agents and return combined report.
   */
  public async runAll(): Promise<AgentReport[]> {
    const reports: AgentReport[] = [];
    for (const agent of this.agents.values()) {
      try {
        console.log(`Running agent: ${agent.id}...`);
        const report = await agent.run();
        reports.push(report);
      } catch (err: any) {
        console.error(`Fatal agent failure [${agent.id}]:`, err.message);
      }
    }
    return reports;
  }
}
