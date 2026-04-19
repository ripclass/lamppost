import Link from 'next/link';
import { Sparkles, Bot, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ResponseTurn {
  readonly id: string;
  readonly question: string;
  readonly answer: string;
  readonly source: 'qa_bank' | 'fallback_llm';
  readonly confidence: number;
  readonly latencyMs: number;
  readonly costUsd: number;
}

export interface RateLimitState {
  readonly scope: 'anon' | 'free';
  readonly limit: number;
  readonly resetAt: string;
}

interface Props {
  readonly turns: readonly ResponseTurn[];
  readonly pendingQuestion: string | null;
  readonly rateLimit: RateLimitState | null;
}

export function ResponseStream({ turns, pendingQuestion, rateLimit }: Props) {
  if (turns.length === 0 && !pendingQuestion && !rateLimit) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground/70">
        Your questions and Lamppost&apos;s answers will appear here.
      </div>
    );
  }

  return (
    <ol className="space-y-6">
      {turns.map((turn) => (
        <li key={turn.id} className="space-y-3">
          <QuestionBubble text={turn.question} />
          <AnswerBubble turn={turn} />
        </li>
      ))}
      {pendingQuestion && (
        <li className="space-y-3">
          <QuestionBubble text={pendingQuestion} />
          <PendingBubble />
        </li>
      )}
      {rateLimit && (
        <li>
          <RateLimitBanner state={rateLimit} />
        </li>
      )}
    </ol>
  );
}

function QuestionBubble({ text }: { readonly text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary/10 px-4 py-2.5 text-sm">
        {text}
      </div>
    </div>
  );
}

function AnswerBubble({ turn }: { readonly turn: ResponseTurn }) {
  const fromBank = turn.source === 'qa_bank';
  const Icon = fromBank ? Sparkles : Bot;
  return (
    <div className="flex gap-3">
      <div className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-3.5" />
      </div>
      <div className="flex-1 space-y-1.5">
        <div className="text-sm leading-relaxed whitespace-pre-wrap">{turn.answer}</div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground/70">
          <span>{fromBank ? 'From the bank' : 'Thought through live'}</span>
          <span>·</span>
          <span>{Math.round(turn.latencyMs)} ms</span>
          {!fromBank && turn.costUsd > 0 && (
            <>
              <span>·</span>
              <span>${turn.costUsd.toFixed(4)}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PendingBubble() {
  return (
    <div className="flex gap-3">
      <div className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
        <span className="size-2 rounded-full bg-muted-foreground/50 animate-pulse" />
      </div>
      <div className="text-sm text-muted-foreground/70">Thinking…</div>
    </div>
  );
}

function RateLimitBanner({ state }: { readonly state: RateLimitState }) {
  const resetWhen = formatResetTime(state.resetAt);
  return (
    <div className="rounded-2xl border border-border bg-muted/30 p-5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-background text-muted-foreground">
          <Lock className="size-4" />
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <p className="text-sm font-medium">
              You&apos;ve asked your {state.limit} questions in this sample.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Come back at {resetWhen} to keep exploring — or sign up for free to
              continue now.
            </p>
          </div>
          <Button asChild size="sm">
            <Link href="/signup">Sign up to continue</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function formatResetTime(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleString('en-BD', {
      timeZone: 'Asia/Dhaka',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return 'midnight';
  }
}
