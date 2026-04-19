'use client';

import { useState } from 'react';
import type { Identity } from '@/lib/classroom-engine/types';
import { ChapterHeader } from './chapter-header';
import { QuestionInput } from './question-input';
import {
  ResponseStream,
  type RateLimitState,
  type ResponseTurn,
} from './response-stream';

interface Props {
  readonly chapterId: string;
  readonly chapterTitle: string;
  readonly identity: Identity;
  readonly headerBadge?: string;
}

interface SearchSuccessBody {
  success: true;
  answer: string;
  source: 'qa_bank' | 'fallback_llm';
  agent: string;
  confidence: number;
  costUsd: number;
  latencyMs: number;
}

interface SearchRateLimitBody {
  success: false;
  code: 'RATE_LIMIT_EXCEEDED';
  scope: 'anon' | 'free';
  limit: number;
  resetAt: string;
}

export function ClassroomPlayer({ chapterId, chapterTitle, identity, headerBadge }: Props) {
  const [turns, setTurns] = useState<ResponseTurn[]>([]);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [rateLimit, setRateLimit] = useState<RateLimitState | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function ask(question: string) {
    setPendingQuestion(question);
    setError(null);

    try {
      const res = await fetch('/api/qa-bank/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, chapterId, identity }),
      });

      if (res.status === 429) {
        const body = (await res.json()) as SearchRateLimitBody;
        setRateLimit({ scope: body.scope, limit: body.limit, resetAt: body.resetAt });
        return;
      }

      if (!res.ok) {
        const text = await res.text();
        setError(`Something went wrong (${res.status}). ${text.slice(0, 120)}`);
        return;
      }

      const body = (await res.json()) as SearchSuccessBody;
      setTurns((prev) => [
        ...prev,
        {
          id: `${prev.length}-${Date.now()}`,
          question,
          answer: body.answer,
          source: body.source,
          confidence: body.confidence,
          latencyMs: body.latencyMs,
          costUsd: body.costUsd,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setPendingQuestion(null);
    }
  }

  const isRateLimited = rateLimit !== null;

  return (
    <section className="mx-auto max-w-3xl px-4 pt-20 pb-24 space-y-6">
      <ChapterHeader chapterTitle={chapterTitle} badge={headerBadge} />

      <ResponseStream
        turns={turns}
        pendingQuestion={pendingQuestion}
        rateLimit={rateLimit}
      />

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <QuestionInput
        onSubmit={ask}
        disabled={isRateLimited}
        disabledHint={
          isRateLimited
            ? 'Sample limit reached — sign up to keep asking.'
            : undefined
        }
      />
    </section>
  );
}
