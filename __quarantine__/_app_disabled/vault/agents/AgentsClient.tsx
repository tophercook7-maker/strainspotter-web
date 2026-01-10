'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { vaultTheme } from '../vaultTheme';
import { Bot, Play, Clock, CheckCircle, AlertCircle } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AgentsClient() {
  const { data: status, mutate } = useSWR('/api/vault/agents/status', fetcher, {
    refreshInterval: 5000
  });

  const agents = status?.agents || {};
  const agentNames = ['scrape', 'generator', 'manifest', 'cluster', 'cleanup'];

  const runAgent = async (agentName: string) => {
    try {
      const res = await fetch('/api/vault/agents/run-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: agentName })
      });
      if (!res.ok) throw new Error('Failed to run agent');
      mutate();
      alert(`Agent ${agentName} started`);
    } catch (error: any) {
      alert(`Failed to run agent: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Bot className="h-8 w-8" />
          AI Agents
        </h1>
        <div className="flex items-center gap-4">
          <div className="text-sm" style={{ color: vaultTheme.colors.textSecondary }}>
            Status: {status?.running ? 'Running' : 'Stopped'}
          </div>
          {status?.running ? (
            <button
              onClick={async () => {
                await fetch('/api/vault/agents/stop', { method: 'POST' });
                mutate();
              }}
              className="px-4 py-2 rounded hover:opacity-80"
              style={{
                backgroundColor: vaultTheme.colors.error,
                color: 'white'
              }}
            >
              Stop Manager
            </button>
          ) : (
            <button
              onClick={async () => {
                await fetch('/api/vault/agents/start', { method: 'POST' });
                mutate();
              }}
              className="px-4 py-2 rounded hover:opacity-80"
              style={{
                backgroundColor: vaultTheme.colors.accent,
                color: 'white'
              }}
            >
              Start Manager
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {agentNames.map((agentName) => {
          const agent = agents[agentName] || {};
          return (
            <div
              key={agentName}
              className="rounded-[var(--radius-md)] border p-6"
              style={{
                backgroundColor: vaultTheme.colors.panelDark,
                borderColor: vaultTheme.colors.border
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Bot className="h-5 w-5" style={{ color: vaultTheme.colors.accent }} />
                  <h2 className="text-xl font-semibold capitalize">{agentName} Agent</h2>
                </div>
                <button
                  onClick={() => runAgent(agentName)}
                  className="px-4 py-2 rounded flex items-center gap-2 hover:opacity-80"
                  style={{
                    backgroundColor: vaultTheme.colors.accent,
                    color: 'white'
                  }}
                >
                  <Play className="h-4 w-4" />
                  Run Now
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-sm mb-1" style={{ color: vaultTheme.colors.textSecondary }}>
                    Last Run
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" style={{ color: vaultTheme.colors.textSecondary }} />
                    <span style={{ color: vaultTheme.colors.textPrimary }}>
                      {agent.lastRun ? new Date(agent.lastRun).toLocaleString() : 'Never'}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="text-sm mb-1" style={{ color: vaultTheme.colors.textSecondary }}>
                    Next Run
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" style={{ color: vaultTheme.colors.textSecondary }} />
                    <span style={{ color: vaultTheme.colors.textPrimary }}>
                      {agent.nextRun ? new Date(agent.nextRun).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="text-sm mb-1" style={{ color: vaultTheme.colors.textSecondary }}>
                    Tasks Completed
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" style={{ color: vaultTheme.colors.success }} />
                    <span style={{ color: vaultTheme.colors.textPrimary }}>
                      {agent.tasksCompleted || 0}
                    </span>
                  </div>
                </div>
              </div>

              {agent.errors && agent.errors.length > 0 && (
                <div className="mt-4 p-3 rounded" style={{ backgroundColor: vaultTheme.colors.panelMid }}>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4" style={{ color: vaultTheme.colors.error }} />
                    <span className="text-sm font-semibold">Recent Errors</span>
                  </div>
                  <div className="space-y-1">
                    {agent.errors.slice(-3).map((error: string, idx: number) => (
                      <div key={idx} className="text-xs" style={{ color: vaultTheme.colors.error }}>
                        {error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
