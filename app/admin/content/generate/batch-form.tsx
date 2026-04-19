'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Sparkles } from 'lucide-react';

export function BatchGenerateForm() {
  const [subjectId, setSubjectId] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submitBatch() {
    startTransition(async () => {
      setStatus(null);
      const res = await fetch('/api/curriculum/batch-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId: subjectId || undefined }),
      });
      const data = await res.json();
      setStatus(
        res.ok
          ? `Batch started for ${data.subjectId ?? 'all'}. Track progress on the Content tree.`
          : `Error (${res.status}): ${data.error ?? 'unknown'}`,
      );
    });
  }

  function submitSingle() {
    if (!chapterId) return;
    startTransition(async () => {
      setStatus(null);
      const res = await fetch('/api/qa-bank/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterId }),
      });
      const data = await res.json();
      setStatus(
        res.ok
          ? `Q&A generation queued for chapter ${chapterId}. ${data.message ?? ''}`
          : `Error (${res.status}): ${data.error ?? 'unknown'}`,
      );
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border/60 bg-card/40 p-5 space-y-3">
        <h2 className="font-medium flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          Single chapter
        </h2>
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5">Chapter ID</label>
          <input
            type="text"
            value={chapterId}
            onChange={(e) => setChapterId(e.target.value)}
            placeholder="Enter chapter UUID"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono"
            disabled={pending}
          />
        </div>
        <Button
          onClick={submitSingle}
          disabled={!chapterId || pending}
          className="gap-1.5"
        >
          <Sparkles className="size-3.5" />
          Generate Q&A bank
        </Button>
      </div>

      <div className="rounded-xl border border-border/60 bg-card/40 p-5 space-y-3">
        <h2 className="font-medium flex items-center gap-2">
          <Upload className="size-4 text-primary" />
          Batch
        </h2>
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5">
            Subject ID (optional — blank for all pending chapters)
          </label>
          <input
            type="text"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            placeholder="Enter subject UUID"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono"
            disabled={pending}
          />
        </div>
        <Button
          variant="outline"
          onClick={submitBatch}
          disabled={pending}
          className="gap-1.5"
        >
          <Upload className="size-3.5" />
          Start batch generation
        </Button>
      </div>

      {status && (
        <div className="rounded-md border border-border/60 bg-muted/40 p-3 text-sm">
          {status}
        </div>
      )}
    </div>
  );
}
