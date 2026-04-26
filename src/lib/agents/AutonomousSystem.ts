import cron from 'node-cron';
import { AgentRegistry } from './AgentRegistry';
import { BrainAgent } from './BrainAgent';
import { DevAgent } from './DevAgent';
import { OpsAgent } from './OpsAgent';
import { FinanceAgent } from './FinanceAgent';
import { MonitoringAgent } from './MonitoringAgent';
import { SelfHealingAgent } from './SelfHealingAgent';

export class AutonomousSystem {
  private static instance: AutonomousSystem;
  private isRunning: boolean = false;

  private constructor() {
    this.setupRegistry();
  }

  public static getInstance(): AutonomousSystem {
    if (!AutonomousSystem.instance) {
      AutonomousSystem.instance = new AutonomousSystem();
    }
    return AutonomousSystem.instance;
  }

  private setupRegistry(): void {
    const registry = AgentRegistry.getInstance();
    registry.register(new BrainAgent());
    registry.register(new DevAgent());
    registry.register(new OpsAgent());
    registry.register(new FinanceAgent());
    registry.register(new MonitoringAgent());
    registry.register(new SelfHealingAgent());
    console.log('[Autonomous System] Agent registry initialized.');
  }

  /**
   * Start the daily/weekly autonomous pulses.
   * Default: every 15 minutes.
   */
  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log('[Autonomous System] System heartbeat started.');
    
    // Task: every 15 minutes
    cron.schedule('*/15 * * * *', async () => {
      console.log('[Autonomous System] Pulse triggered.');
      const registry = AgentRegistry.getInstance();
      const reports = await registry.runAll();
      
      // The Brain then reviews these reports
      const brain = registry.getAgent('brain') as BrainAgent;
      if (brain) {
        await brain.run();
      }
    });

    // Run once immediately on start - Backgrounded to not block Next.js init
    setImmediate(async () => {
      try {
        await this.pulse();
      } catch (err) {
        console.error('[Autonomous System] Initial pulse background error:', err);
      }
    });
  }

  public async pulse() {
    console.log('[Autonomous System] Initial pulse starting...');
    const registry = AgentRegistry.getInstance();
    await registry.runAll();
  }
}
