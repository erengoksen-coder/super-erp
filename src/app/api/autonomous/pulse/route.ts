import { NextResponse } from 'next/server';
import { AutonomousSystem } from '@/lib/agents/AutonomousSystem';
import { AgentRegistry } from '@/lib/agents/AgentRegistry';

export async function GET() {
  try {
    const system = AutonomousSystem.getInstance();
    await system.pulse();
    
    const registry = AgentRegistry.getInstance();
    const reports = registry.getAllAgents().map(agent => ({
      id: agent.id,
      lastPulse: new Date().toISOString(),
      status: 'active'
    }));

    return NextResponse.json({
      success: true,
      message: 'Autonomous pulse completed.',
      agents: reports,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function POST() {
    // Manually trigger a full run of the Brain
    const registry = AgentRegistry.getInstance();
    const brain = registry.getAgent('brain');
    if (brain) {
        await brain.run();
    }
    return NextResponse.json({ success: true, action: 'Brain orchestration triggered' });
}
