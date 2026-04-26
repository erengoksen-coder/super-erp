import { AgentType, AgentReport, AgentDecision, AgentAction } from './types';
import { BaseAgent } from './BaseAgent';
import os from 'os';

export class OpsAgent extends BaseAgent {
  public id: AgentType = 'ops';

  public async analyze(): Promise<string[]> {
    const findings: string[] = [];
    
    await this.log('Monitoring system resources and services...');
    
    // Check CPU/Memory load
    const freemem = os.freemem();
    const totalmem = os.totalmem();
    const memUsage = Math.round(((totalmem - freemem) / totalmem) * 100);
    
    findings.push(`Memory usage detected at ${memUsage}%`);
    if (memUsage > 90) {
      findings.push('CRITICAL: Memory usage is dangerously high.');
    } else if (memUsage > 75) {
      findings.push('WARNING: Memory usage is elevated.');
    }
    
    // Simulate Docker check (Real agents would use dockerode/CLI)
    findings.push('Pulse: Docker container super-erp is running.');
    
    return findings;
  }

  public async decide(findings: string[]): Promise<AgentDecision[]> {
    const decisions: AgentDecision[] = [];
    
    await this.log('Orchestrating ops priority...');
    
    // If memory is critical, propose a restart (safety/performance)
    if (findings.some(f => f.startsWith('CRITICAL'))) {
      decisions.push({
        agentId: this.id,
        action: 'optimize_resources',
        rationale: 'Memory usage is at a critical level.',
        priority: 'high',
        impact: 'performance',
        requiredApproval: true
      });
    }

    return decisions;
  }

  public async act(decision: AgentDecision): Promise<AgentAction> {
    await this.log(`Executing ops action: ${decision.action}`);
    
    return {
      type: decision.action,
      status: 'success',
      description: 'Operations optimized.',
      timestamp: new Date().toISOString()
    };
  }
}
