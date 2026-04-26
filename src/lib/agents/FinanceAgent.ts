import { AgentType, AgentReport, AgentDecision, AgentAction } from './types';
import { BaseAgent } from './BaseAgent';
import { getDatabase } from '../database/db';

export class FinanceAgent extends BaseAgent {
  public id: AgentType = 'finance';

  public async analyze(): Promise<string[]> {
    const findings: string[] = [];
    
    await this.log('Deep diving into financial and inventory data...');
    
    const db = getDatabase();
    
    // Check for critical stock
    try {
        // Mock analysis on the stocks table
        const criticalStocks = db.prepare('SELECT count(*) as count FROM material_stocks WHERE quantity < 5').get() as any;
        if (criticalStocks?.count > 0) {
            findings.push(`STOCK ALERT: ${criticalStocks.count} items are at critical inventory levels.`);
        }
    } catch (e) {
        findings.push('Database access: System is missing tables or not initialized.');
    }
    
    // Check delayed orders
    try {
        const delayedOrders = db.prepare("SELECT count(*) as count FROM orders WHERE status = 'delayed'").get() as any;
        if (delayedOrders?.count > 0) {
            findings.push(`CASH FLOW RISK: ${delayedOrders.count} orders are delayed.`);
        }
    } catch (e) {}

    return findings;
  }

  public async decide(findings: string[]): Promise<AgentDecision[]> {
    const decisions: AgentDecision[] = [];
    
    await this.log('Orchestrating financial strategy...');
    
    if (findings.some(f => f.startsWith('STOCK ALERT'))) {
        decisions.push({
            agentId: this.id,
            action: 'procurement_request',
            rationale: 'Inventory levels are below safety thresholds.',
            priority: 'medium',
            impact: 'operations',
            requiredApproval: true
        });
    }

    return decisions;
  }

  public async act(decision: AgentDecision): Promise<AgentAction> {
    await this.log(`Executing financial decision: ${decision.action}`);
    
    return {
      type: decision.action,
      status: 'success',
      description: 'Finance action proposed.',
      timestamp: new Date().toISOString()
    };
  }
}
