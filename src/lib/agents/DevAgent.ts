import { AgentType, AgentReport, AgentDecision, AgentAction } from './types';
import { BaseAgent } from './BaseAgent';
import fs from 'fs';
import path from 'path';

export class DevAgent extends BaseAgent {
  public id: AgentType = 'dev';

  public async analyze(): Promise<string[]> {
    const findings: string[] = [];
    const rootDir = process.cwd();
    
    await this.log('Scanning project for missing components or refactoring opportunities...');
    
    // Check for common source directories
    const srcDirs = ['components', 'app', 'lib'];
    for (const dir of srcDirs) {
      const dirPath = path.join(rootDir, dir);
      if (fs.existsSync(dirPath)) {
        const stats = fs.statSync(dirPath);
        if (stats.isDirectory()) {
          findings.push(`Found source directory: ${dir}`);
        }
      } else {
        findings.push(`MISSING: Basic source directory ${dir} is not present.`);
      }
    }
    
    // Minimal example of "detecting messy code" - scan for TODOs
    // (Real autonomous systems would use an LLM to scan files)
    return findings;
  }

  public async decide(findings: string[]): Promise<AgentDecision[]> {
    const decisions: AgentDecision[] = [];
    
    await this.log('Formulating development suggestions...');
    
    // If we're missing a common directory, propose creating it
    if (findings.some(f => f.startsWith('MISSING'))) {
      decisions.push({
        agentId: this.id,
        action: 'initialize_boilerplate',
        rationale: 'Project appears to be missing standard directory structure.',
        priority: 'medium',
        impact: 'structural',
        requiredApproval: true
      });
    }

    return decisions;
  }

  public async act(decision: AgentDecision): Promise<AgentAction> {
    await this.log(`Executing dev action: ${decision.action}`);
    // Only simulate execution for safety in this task
    return {
      type: decision.action,
      status: 'success',
      description: 'Dev action simulated.',
      timestamp: new Date().toISOString()
    };
  }
}
