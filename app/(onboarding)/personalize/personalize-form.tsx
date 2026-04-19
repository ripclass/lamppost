'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { savePersonalizeAction, type StudyGoal } from './actions';

const GOALS: { id: StudyGoal; label: string }[] = [
  { id: 'ssc_this_year', label: 'SSC exam this year' },
  { id: 'ssc_next_year', label: 'SSC exam next year' },
  { id: 'curious', label: 'Just curious' },
  { id: 'tutor_assigned', label: 'A tutor assigned this' },
];

const MINUTES: { id: number; label: string }[] = [
  { id: 15, label: '15 minutes' },
  { id: 30, label: '30 minutes' },
  { id: 60, label: '1 hour' },
  { id: 120, label: 'Whatever I can' },
];

export function PersonalizeForm({
  defaultExamDate,
}: {
  readonly defaultExamDate: string;
}) {
  const [goal, setGoal] = useState<StudyGoal | null>(null);
  const [minutes, setMinutes] = useState<number | null>(null);
  const [examDate, setExamDate] = useState<string>(defaultExamDate);
  const [examSkipped, setExamSkipped] = useState(false);
  const [pending, startTransition] = useTransition();

  function save(include: {
    goal: boolean;
    minutes: boolean;
    exam: boolean;
  }) {
    startTransition(async () => {
      await savePersonalizeAction({
        studyGoal: include.goal ? goal : null,
        dailyMinutes: include.minutes ? minutes : null,
        targetExamDate: include.exam && !examSkipped ? examDate : null,
      });
    });
  }

  function onFinish() {
    save({ goal: true, minutes: true, exam: true });
  }

  function onSkipAll() {
    save({ goal: false, minutes: false, exam: false });
  }

  return (
    <div className="space-y-10">
      <Question
        title="What's your goal?"
        onSkip={() => setGoal(null)}
        skipped={goal === null}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {GOALS.map((g) => (
            <Choice
              key={g.id}
              label={g.label}
              selected={goal === g.id}
              onClick={() => setGoal(g.id)}
            />
          ))}
        </div>
      </Question>

      <Question
        title="How much time can you study per day?"
        onSkip={() => setMinutes(null)}
        skipped={minutes === null}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {MINUTES.map((m) => (
            <Choice
              key={m.id}
              label={m.label}
              selected={minutes === m.id}
              onClick={() => setMinutes(m.id)}
            />
          ))}
        </div>
      </Question>

      <Question
        title="When's your exam?"
        onSkip={() => setExamSkipped(true)}
        skipped={examSkipped}
      >
        <input
          type="date"
          value={examDate}
          onChange={(e) => {
            setExamDate(e.target.value);
            setExamSkipped(false);
          }}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
          disabled={pending}
        />
      </Question>

      <div className="flex items-center justify-between pt-4 border-t border-border/40">
        <button
          type="button"
          onClick={onSkipAll}
          disabled={pending}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Skip all &rarr;
        </button>
        <Button size="lg" onClick={onFinish} disabled={pending}>
          {pending ? 'Saving…' : 'Take me to the lobby'}
        </Button>
      </div>
    </div>
  );
}

function Question({
  title,
  children,
  onSkip,
  skipped,
}: {
  readonly title: string;
  readonly children: React.ReactNode;
  readonly onSkip: () => void;
  readonly skipped: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium">{title}</h2>
        <button
          type="button"
          onClick={onSkip}
          className={`text-xs ${skipped ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          {skipped ? 'Skipped' : 'Skip'}
        </button>
      </div>
      {children}
    </div>
  );
}

function Choice({
  label,
  selected,
  onClick,
}: {
  readonly label: string;
  readonly selected: boolean;
  readonly onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-2.5 text-sm text-left transition-colors ${
        selected
          ? 'border-primary bg-primary/10'
          : 'border-border bg-card hover:border-primary/50'
      }`}
    >
      {label}
    </button>
  );
}
