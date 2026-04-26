export type AgentType = 'brain' | 'dev' | 'ops' | 'finance' | 'monitoring' | 'self-healing';

export interface AgentAction {
  type: string;
  status: 'pending' | 'success' | 'failure';
  description: string;
  payload?: any;
  timestamp: string;
}

export interface AgentDecision {
  agentId: AgentType;
  action: string;
  rationale: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  impact: string;
  requiredApproval: boolean;
}

export interface AgentReport {
  agentId: AgentType;
  status: 'idle' | 'analyzing' | 'acting' | 'error';
  lastRun: string;
  findings: string[];
  suggestions: AgentDecision[];
}
