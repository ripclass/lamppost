'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Mail, X } from 'lucide-react';
import {
  linkParentEmailAction,
  unlinkParentEmailAction,
} from './parent-link-actions';

export interface LinkedParent {
  readonly parentId: string;
  readonly email: string;
  readonly unsubscribed: boolean;
}

export function ParentLinkForm({ linked }: { readonly linked: readonly LinkedParent[] }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      setStatus(null);
      const result = await linkParentEmailAction(email);
      if (!result.ok) {
        setStatus({ kind: 'err', message: result.message });
        return;
      }
      setEmail('');
      setStatus({
        kind: 'ok',
        message: result.welcomeSent
          ? `Linked. We sent a welcome email so they can opt out if they'd rather not.`
          : `Linked. Weekly emails will start next Sunday.`,
      });
    });
  }

  function onRemove(parentId: string) {
    startTransition(async () => {
      await unlinkParentEmailAction(parentId);
      setStatus({ kind: 'ok', message: 'Removed.' });
    });
  }

  return (
    <div className="space-y-4">
      {linked.length > 0 && (
        <ul className="space-y-2">
          {linked.map((p) => (
            <li
              key={p.parentId}
              className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/40 px-3 py-2"
            >
              <Mail className="size-3.5 text-muted-foreground" />
              <div className="flex-1 text-sm">
                {p.email}
                {p.unsubscribed && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    (unsubscribed)
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => onRemove(p.parentId)}
                disabled={pending}
                aria-label={`Remove ${p.email}`}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="parent@example.com"
          disabled={pending}
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
          required
        />
        <Button type="submit" size="default" disabled={pending || email.trim().length === 0}>
          {pending ? 'Linking…' : 'Add parent'}
        </Button>
      </form>

      {status && (
        <p
          className={`text-xs ${
            status.kind === 'ok' ? 'text-muted-foreground' : 'text-destructive'
          }`}
        >
          {status.message}
        </p>
      )}
    </div>
  );
}
