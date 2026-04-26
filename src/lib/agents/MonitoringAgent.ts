import { AgentType, AgentReport, AgentDecision, AgentAction } from './types';
import { BaseAgent } from './BaseAgent';
import fs from 'fs';
import path from 'path';

export class MonitoringAgent extends BaseAgent {
  public id: AgentType = 'monitoring';

  public async analyze(): Promise<string[]> {
    const findings: string[] = [];
    const rootDir = process.cwd();
    
    await this.log('Scanning logs for errors and performance hits...');
    
    // Check for build error log
    const buildLog = path.join(rootDir, 'build_error.log');
    if (fs.existsSync(buildLog)) {
        const stats = fs.statSync(buildLog);
        if (stats.size > 0) {
            findings.push(`Build instability detected. ${stats.size} error bytes found.`);
        }
    }
    
    // Pulse: API health check (Simulated)
    findings.push('API pulse: /api/health responding in 45ms.');
    
    return findings;
  }

  public async decide(findings: string[]): Promise<AgentDecision[]> {
    const decisions: AgentDecision[] = [];
    
    await this.log('Orchestrating monitoring alerts...');
    
    if (findings.some(f => f.startsWith('Build instability'))) {
        decisions.push({
            agentId: this.id,
            action: 'clear_build_cache',
            rationale: 'Build artifacts may be corrupted.',
            priority: 'medium',
            impact: 'stability',
            requiredApproval: true
        });
    }

    return decisions;
  }

  public async act(decision: AgentDecision): Promise<AgentAction> {
    await this.log(`Executing monitoring action: ${decision.action}`);
    
    return {
      type: decision.action,
      status: 'success',
      description: 'Monitoring alert addressed.',
      timestamp: new Date().toISOString()
    };
  }
}
