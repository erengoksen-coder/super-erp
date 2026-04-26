import { AgentType, AgentReport, AgentDecision, AgentAction } from './types';
import { BaseAgent } from './BaseAgent';
import { AgentRegistry } from './AgentRegistry';

export class BrainAgent extends BaseAgent {
  public id: AgentType = 'brain';

  public async analyze(): Promise<string[]> {
    const registry = AgentRegistry.getInstance();
    const otherAgents = registry.getAllAgents().filter(a => a.id !== 'brain');
    
    await this.log('Gathering status reports from all systems...');
    const findings = [`Brain pulse check: System is operational.`];
    
    // In a real autonomous system, the brain would analyze the reports of other agents.
    // Here we'll start with a pulse of the other agents.
    findings.push(`${otherAgents.length} active agents tracked in registry.`);
    
    return findings;
  }

  public async decide(findings: string[]): Promise<AgentDecision[]> {
    const decisions: AgentDecision[] = [];
    const registry = AgentRegistry.getInstance();
    
    await this.log('Orchestrating system-wide priorities...');
    
    // Critical priority: Self-Healing
    const shAgent = registry.getAgent('self-healing');
    const shReports = shAgent ? await shAgent.analyze() : [];
    
    if (shReports.some(r => r.startsWith('CRITICAL'))) {
        await this.log('CRITICAL issue detected! Prioritizing self-healing intervention.');
        const shDecisions = await shAgent!.decide(shReports);
        decisions.push(...shDecisions);
    } else {
        // Brain logic: If everything is normal, maintain homeostasis.
        decisions.push({
          agentId: this.id,
          action: 'maintain_homeostasis',
          rationale: 'System remains stable, continuing autonomous monitoring.',
          priority: 'low',
          impact: 'minimal',
          requiredApproval: false
        });
    }

    return decisions;
  }

  public async act(decision: AgentDecision): Promise<AgentAction> {
    await this.log(`Executing brain decision: ${decision.action}`);
    
    return {
      type: decision.action,
      status: 'success',
      description: 'System state maintained.',
      timestamp: new Date().toISOString()
    };
  }
}
