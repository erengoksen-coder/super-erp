import { AgentType, AgentReport, AgentDecision, AgentAction } from './types';
import { BaseAgent } from './BaseAgent';
import fs from 'fs';
import path from 'path';

export class SelfHealingAgent extends BaseAgent {
  public id: AgentType = 'self-healing';

  public async analyze(): Promise<string[]> {
    const findings: string[] = [];
    const rootDir = process.cwd();
    
    await this.log('Scanning ecosystem for corruption or missing configurations...');
    
    // Check .env presence
    if (!fs.existsSync(path.join(rootDir, '.env'))) {
        findings.push('CRITICAL: .env file missing.');
    }
    
    // Check data directory
    const dataDir = path.join(rootDir, 'data');
    if (!fs.existsSync(dataDir)) {
        findings.push('CRITICAL: Data directory missing.');
    } else {
        const erpDb = path.join(dataDir, 'erp.db');
        if (!fs.existsSync(erpDb)) {
            findings.push('CRITICAL: Database file erp.db missing.');
        } else {
            const stats = fs.statSync(erpDb);
            if (stats.size === 0) {
                findings.push('CRITICAL: Database file erp.db is empty.');
            }
        }
    }
    
    return findings;
  }

  public async decide(findings: string[]): Promise<AgentDecision[]> {
    const decisions: AgentDecision[] = [];
    
    await this.log('Deciding on self-healing protocols...');
    
    if (findings.some(f => f.includes('.env file missing'))) {
        decisions.push({
            agentId: this.id,
            action: 'restore_env_from_example',
            rationale: 'Environment configuration was lost.',
            priority: 'critical',
            impact: 'systemic',
            requiredApproval: true
        });
    }
    
    if (findings.some(f => f.includes('Database file erp.db missing'))) {
        decisions.push({
            agentId: this.id,
            action: 'restore_db_from_backup',
            rationale: 'Database file missing, recovery required.',
            priority: 'critical',
            impact: 'integrity',
            requiredApproval: true
        });
    }

    return decisions;
  }

  public async act(decision: AgentDecision): Promise<AgentAction> {
    await this.log(`Healing action: ${decision.action}`);
    
    if (decision.action === 'restore_db_from_backup') {
        const success = await this.restoreDbFromLatestBackup();
        return {
            type: decision.action,
            status: success ? 'success' : 'failure',
            description: success ? 'Database restored from latest backup.' : 'Failed to find a valid backup.',
            timestamp: new Date().toISOString()
        };
    }

    if (decision.action === 'restore_env_from_example') {
        try {
            const rootDir = process.cwd();
            if (fs.existsSync(path.join(rootDir, '.env.example'))) {
                fs.copyFileSync(path.join(rootDir, '.env.example'), path.join(rootDir, '.env'));
                return { type: decision.action, status: 'success', description: '.env restored from example.', timestamp: new Date().toISOString() };
            }
        } catch (e) {
            return { type: decision.action, status: 'failure', description: 'Failed to restore .env', timestamp: new Date().toISOString() };
        }
    }

    return {
      type: decision.action,
      status: 'success',
      description: 'Heal process completed.',
      timestamp: new Date().toISOString()
    };
  }

  private async restoreDbFromLatestBackup(): Promise<boolean> {
    const rootDir = process.cwd();
    const backupDir = path.join(rootDir, 'backups');
    const dataDir = path.join(rootDir, 'data');
    
    if (!fs.existsSync(backupDir)) return false;
    
    const backups = fs.readdirSync(backupDir)
        .filter(f => f.endsWith('.db'))
        .map(f => ({ name: f, time: fs.statSync(path.join(backupDir, f)).mtime.getTime() }))
        .sort((a, b) => b.time - a.time);
        
    if (backups.length === 0) return false;
    
    const latest = backups[0].name;
    const target = path.join(dataDir, 'erp.db');
    
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    
    fs.copyFileSync(path.join(backupDir, latest), target);
    await this.log(`Database successfully restored from ${latest}`);
    return true;
  }
}
