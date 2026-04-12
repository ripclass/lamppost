'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { QACoverageChart } from '@/components/admin/qa-coverage-chart';
import { CostTracker } from '@/components/admin/cost-tracker';

export default function AnalyticsPage() {
  const [chapterId, setChapterId] = useState('');
  const [qaData, setQaData] = useState(null);
  const [interactionData, setInteractionData] = useState(null);
  const [loading, setLoading] = useState(false);

  async function loadStats() {
    if (!chapterId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/qa-bank/stats?chapterId=${chapterId}`);
      const data = await res.json();
      if (data.success) {
        setQaData(data.qaBank);
        setInteractionData(data.interactions);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (chapterId) loadStats();
  }, [chapterId]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="size-4" />
          Admin
        </Link>

        <h1 className="text-2xl font-bold mb-2">Analytics</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Q&A bank coverage, student interaction stats, and cost tracking.
        </p>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-1.5">Chapter ID</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={chapterId}
              onChange={(e) => setChapterId(e.target.value)}
              placeholder="Enter chapter UUID"
              className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
            />
            <button
              onClick={loadStats}
              disabled={!chapterId || loading}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Load'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border bg-card p-6">
            <h2 className="font-semibold mb-4">Q&A Bank Coverage</h2>
            <QACoverageChart data={qaData} />
          </div>
          <div className="rounded-xl border bg-card p-6">
            <h2 className="font-semibold mb-4">Interactions & Cost</h2>
            <CostTracker data={interactionData} />
          </div>
        </div>
      </div>
    </div>
  );
}
