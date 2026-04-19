'use client';

import { useState, useRef, type FormEvent, type KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  readonly onSubmit: (question: string) => void | Promise<void>;
  readonly disabled?: boolean;
  readonly disabledHint?: string;
  readonly placeholder?: string;
}

export function QuestionInput({
  onSubmit,
  disabled = false,
  disabledHint,
  placeholder = 'Ask a question about this chapter…',
}: Props) {
  const [value, setValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const busy = disabled || isSending;

  async function submit() {
    const trimmed = value.trim();
    if (!trimmed || busy) return;
    setIsSending(true);
    try {
      await onSubmit(trimmed);
      setValue('');
      textareaRef.current?.focus();
    } finally {
      setIsSending(false);
    }
  }

  function handleForm(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void submit();
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  }

  return (
    <form onSubmit={handleForm} className="space-y-2">
      <div className="flex gap-2 items-end">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKey}
          disabled={busy}
          placeholder={placeholder}
          rows={2}
          className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-50"
        />
        <Button
          type="submit"
          size="icon-lg"
          disabled={busy || value.trim().length === 0}
          aria-label="Send question"
        >
          <Send />
        </Button>
      </div>
      {disabled && disabledHint && (
        <p className="text-xs text-muted-foreground">{disabledHint}</p>
      )}
    </form>
  );
}
