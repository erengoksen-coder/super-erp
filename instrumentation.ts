export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { AutonomousSystem } = await import('@/lib/agents/AutonomousSystem');
    const system = AutonomousSystem.getInstance();
    system.start();
    console.log('--- ERP-OS AUTONOMOUS CORE INITIALIZED ---');
  }
}
