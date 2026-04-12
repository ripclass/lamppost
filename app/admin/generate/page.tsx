'use client';

import { useState } from 'react';
import { ArrowLeft, Sparkles, Upload } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function GeneratePage() {
  const [subjectId, setSubjectId] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function triggerBatchGeneration() {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch('/api/curriculum/batch-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: subjectId || undefined,
        }),
      });
      const data = await res.json();
      setStatus(
        data.success
          ? `Generation started for ${data.subjectId}. Monitor progress via Analytics.`
          : `Error: ${data.error}`,
      );
    } catch {
      setStatus('Request failed');
    } finally {
      setLoading(false);
    }
  }

  async function triggerSingleGeneration() {
    if (!chapterId) return;
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch('/api/qa-bank/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterId }),
      });
      const data = await res.json();
      setStatus(
        data.success
          ? `Q&A generation queued for chapter ${chapterId}`
          : `Status: ${data.status} — ${data.message}`,
      );
    } catch {
      setStatus('Request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="size-4" />
          Admin
        </Link>

        <h1 className="text-2xl font-bold mb-2">Generate</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Trigger Opus lesson and Q&A bank generation. Each chapter costs roughly $1-5.
        </p>

        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              Single Chapter
            </h2>
            <div>
              <label className="block text-sm font-medium mb-1.5">Chapter ID</label>
              <input
                type="text"
                value={chapterId}
                onChange={(e) => setChapterId(e.target.value)}
                placeholder="Enter chapter UUID"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
            <Button
              onClick={triggerSingleGeneration}
              disabled={!chapterId || loading}
              className="gap-1.5"
            >
              <Sparkles className="size-3.5" />
              Generate Q&A Bank
            </Button>
          </div>

          <div className="rounded-xl border bg-card p-6 space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Upload className="size-4 text-primary" />
              Batch Generation
            </h2>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Subject ID (optional — leave empty for all)
              </label>
              <input
                type="text"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                placeholder="Enter subject UUID or leave empty"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
            <Button
              variant="outline"
              onClick={triggerBatchGeneration}
              disabled={loading}
              className="gap-1.5"
            >
              <Upload className="size-3.5" />
              Start Batch Generation
            </Button>
          </div>

          {status && (
            <div className="rounded-md bg-muted p-4 text-sm">{status}</div>
          )}
        </div>
      </div>
    </div>
  );
}
