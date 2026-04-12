'use client';

import { useState } from 'react';
import { RefreshCw, ArrowRight, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FlywheelJob {
  id: string;
  chapterId: string;
  questionCount: number;
  status: string;
}

export function FlywheelDashboard() {
  const [jobs, setJobs] = useState<FlywheelJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function runFlywheel() {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/qa-bank/flywheel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();

      if (data.success) {
        setJobs(data.jobs ?? []);
        setResult(
          data.jobs?.length
            ? `${data.totalPending} questions → ${data.jobs.length} jobs`
            : data.message,
        );
      }
    } catch {
      setResult('Flywheel request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Flywheel Processing</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={runFlywheel}
          disabled={loading}
          className="gap-1.5"
        >
          <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
          Run Flywheel
        </Button>
      </div>

      {result && (
        <div className="text-sm text-muted-foreground bg-muted rounded-md p-3">
          {result}
        </div>
      )}

      {jobs.length > 0 && (
        <div className="space-y-2">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="flex items-center justify-between rounded-md border p-3 text-sm"
            >
              <div className="flex items-center gap-2">
                {job.status === 'pending' ? (
                  <Clock className="size-4 text-muted-foreground" />
                ) : (
                  <CheckCircle2 className="size-4 text-green-500" />
                )}
                <span className="font-mono text-xs">{job.chapterId.slice(0, 8)}...</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>{job.questionCount} questions</span>
                <ArrowRight className="size-3" />
                <span>{job.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
