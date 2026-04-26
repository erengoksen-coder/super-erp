'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  Cpu, 
  Code, 
  ShieldCheck, 
  TrendingUp, 
  Activity, 
  AlertTriangle,
  Play,
  RotateCcw,
  Terminal,
  CheckCircle2,
  XCircle,
  Pause
} from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'sonner';

type AgentStatus = 'idle' | 'analyzing' | 'acting' | 'error';

interface AgentState {
  id: string;
  name: string;
  icon: any;
  status: AgentStatus;
  lastRun: string;
  findings: string[];
  color: string;
}

const ControlCenter = () => {
  const [agents, setAgents] = useState<AgentState[]>([
    { id: 'brain', name: 'Brain Agent', icon: Brain, status: 'idle', lastRun: '-', findings: [], color: 'blue' },
    { id: 'dev', name: 'Dev Agent', icon: Code, status: 'idle', lastRun: '-', findings: [], color: 'purple' },
    { id: 'ops', name: 'Ops Agent', icon: Cpu, status: 'idle', lastRun: '-', findings: [], color: 'orange' },
    { id: 'finance', name: 'Finance Agent', icon: TrendingUp, status: 'idle', lastRun: '-', findings: [], color: 'emerald' },
    { id: 'monitoring', name: 'Monitoring Agent', icon: Activity, status: 'idle', lastRun: '-', findings: [], color: 'cyan' },
    { id: 'self-healing', name: 'Self-Healing Agent', icon: ShieldCheck, status: 'idle', lastRun: '-', findings: [], color: 'rose' },
  ]);

  const [logs, setLogs] = useState<{ id: string; text: string; time: string; type: string }[]>([]);
  const [isAutoRunning, setIsAutoRunning] = useState(false);

  const addLog = (text: string, type: 'info' | 'error' | 'success' = 'info') => {
    setLogs(prev => [{ id: Math.random().toString(), text, time: new Date().toLocaleTimeString(), type }, ...prev].slice(0, 50));
  };

  const getAgentReports = async () => {
    addLog('System-wide pulse triggered...', 'info');
    try {
      const response = await fetch('/api/ai/all');
      const data = await response.json();
      if (data.success && data.reports) {
        setAgents(prev => prev.map(agent => {
          const report = data.reports.find((r: any) => r.agentId === agent.id);
          if (report) {
            return {
              ...agent,
              status: report.status,
              lastRun: new Date(report.lastRun).toLocaleString(),
              findings: report.findings
            };
          }
          return agent;
        }));
        addLog('All agents responded successfully.', 'success');
      }
    } catch (err) {
      addLog('Failed to fetch agent reports.', 'error');
    }
  };

  const runAgent = async (id: string) => {
    const agent = agents.find(a => a.id === id);
    if (!agent) return;

    setAgents(prev => prev.map(a => a.id === id ? { ...a, status: 'analyzing' } : a));
    addLog(`Manually triggering ${agent.name}...`, 'info');

    try {
      const response = await fetch(`/api/ai/${id}`);
      const data = await response.json();
      if (data.success) {
        setAgents(prev => prev.map(a => a.id === id ? { 
          ...a, 
          status: data.report.status,
          lastRun: new Date(data.report.lastRun).toLocaleString(),
          findings: data.report.findings
        } : a));
        addLog(`${agent.name} analysis complete.`, 'success');
      }
    } catch (err) {
      addLog(`${agent.name} execution failed.`, 'error');
      setAgents(prev => prev.map(a => a.id === id ? { ...a, status: 'error' } : a));
    }
  };

  useEffect(() => {
    getAgentReports();
  }, []);

  return (
    <div className="p-6 space-y-6 bg-gray-950 min-h-screen text-gray-100">
      <div className="flex justify-between items-center bg-gray-900/50 p-6 rounded-2xl border border-gray-800 backdrop-blur-md">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            ERP-OS Control Center
          </h1>
          <p className="text-gray-400 mt-1 text-sm">Autonomous Multi-Agent System Core</p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="border-gray-700 hover:border-blue-500 transition-colors"
            onClick={getAgentReports}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            System Refresh
          </Button>
          <Button 
            className={`transition-all duration-300 ${isAutoRunning ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}`}
            onClick={() => {
              setIsAutoRunning(!isAutoRunning);
              toast.success(isAutoRunning ? 'Autonomous Loop Paused' : 'Autonomous Loop Started');
            }}
          >
            {isAutoRunning ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            {isAutoRunning ? 'Stop Autonomy' : 'Start Autonomy'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {agents.map((agent) => (
            <motion.div
              key={agent.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card variant="glass" className="bg-gray-900/40 border-gray-800 hover:border-gray-700 transition-all duration-300 backdrop-blur-sm group h-full">
                <CardHeader 
                  className="flex flex-row items-center justify-between space-y-0 pb-2"
                  title={
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-${agent.color}-500/10 text-${agent.color}-400 group-hover:scale-110 transition-transform`}>
                        <agent.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-base font-semibold">{agent.name}</div>
                        <p className="text-xs text-gray-500">Last: {agent.lastRun}</p>
                      </div>
                    </div>
                  }
                  actions={
                    <Badge 
                      variant="soft"
                      color={agent.status === 'error' ? 'error' : agent.status === 'analyzing' ? 'info' : 'secondary'}
                      className={`
                        ${agent.status === 'analyzing' ? 'animate-pulse' : ''}
                        ${agent.status === 'idle' ? 'opacity-50' : ''}
                      `}
                    >
                      {agent.status.toUpperCase()}
                    </Badge>
                  }
                />
                <CardBody className="space-y-4">
                  <div className="space-y-2 min-h-[100px]">
                    <div className="text-xs font-medium text-gray-400 flex items-center gap-1">
                      <Terminal className="w-3 h-3" /> Latest Findings
                    </div>
                    <div className="space-y-1">
                      {agent.findings.length > 0 ? (
                        agent.findings.map((finding, idx) => (
                          <motion.p 
                            key={idx}
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-xs text-gray-300 border-l border-gray-800 pl-2 py-0.5"
                          >
                            {finding}
                          </motion.p>
                        ))
                      ) : (
                        <p className="text-xs text-gray-600 italic">No critical findings reported.</p>
                      )}
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-center text-xs h-8 bg-gray-800/50 hover:bg-gray-800"
                    onClick={() => runAgent(agent.id)}
                    disabled={agent.status === 'analyzing'}
                  >
                    Run Protocol
                  </Button>
                </CardBody>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <Card variant="glass" className="bg-gray-900/60 border-gray-800">
        <CardHeader 
          className="pb-2 border-b border-gray-800"
          title={
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-blue-400" />
              System Intelligence Logs
            </div>
          }
        />
        <CardBody className="p-0">
          <div className="h-[300px] overflow-y-auto font-mono text-sm p-4 space-y-2 custom-scrollbar">
            {logs.length > 0 ? (
              logs.map((log) => (
                <div key={log.id} className="flex gap-3 border-b border-gray-800/50 pb-2">
                  <span className="text-gray-600 min-w-[80px] shrink-0">[{log.time}]</span>
                  <span className={`
                    ${log.type === 'error' ? 'text-rose-400' : ''}
                    ${log.type === 'success' ? 'text-emerald-400' : ''}
                    ${log.type === 'info' ? 'text-blue-400' : ''}
                    shrink-0
                  `}>
                    [{log.type.toUpperCase()}]
                  </span>
                  <span className="text-gray-300">{log.text}</span>
                </div>
              ))
            ) : (
              <div className="h-full flex items-center justify-center text-gray-600 italic">
                Initializing logs...
              </div>
            )}
          </div>
        </CardBody>
      </Card>
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #0d0d0d;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1f1f1f;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #2b2b2b;
        }
      `}</style>
    </div>
  );
};

export default ControlCenter;
