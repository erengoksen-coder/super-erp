import { NextRequest, NextResponse } from 'next/server';
import { AgentRegistry } from '@/lib/agents/AgentRegistry';
import { AgentType } from '@/lib/agents/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { agent: string } }
) {
  const agentId = params.agent as AgentType;
  const registry = AgentRegistry.getInstance();
  const agent = registry.getAgent(agentId);

  if (!agent) {
    // If "all" is requested, return all reports
    if (params.agent === 'all') {
      const allReports = await registry.runAll();
      return NextResponse.json({ success: true, reports: allReports });
    }
    return NextResponse.json({ success: false, error: 'Agent not found' }, { status: 404 });
  }

  try {
    const report = await agent.run();
    return NextResponse.json({ success: true, report });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { agent: string } }
) {
  const agentId = params.agent as AgentType;
  const registry = AgentRegistry.getInstance();
  const agent = registry.getAgent(agentId);

  if (!agent) {
    return NextResponse.json({ success: false, error: 'Agent not found' }, { status: 404 });
  }

  try {
    const { action, payload } = await request.json();
    // In a real system, we'd validate the action against the agent's capabilities
    const result = await agent.act({
        agentId,
        action,
        rationale: 'Manual trigger',
        priority: 'high',
        impact: 'manual',
        requiredApproval: false
    });
    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
