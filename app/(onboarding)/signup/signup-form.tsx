'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  sendOtpAction,
  verifyOtpAction,
  type OtpChannel,
  type SendOtpResult,
} from './actions';

type Step = 'identifier' | 'code';

export function SignupForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('identifier');
  const [channel, setChannel] = useState<OtpChannel>('phone');
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSendOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const result = await sendOtpAction(channel, identifier);
      applySendResult(result);
    });
  }

  function applySendResult(result: SendOtpResult) {
    if (result.ok) {
      setStep('code');
      setInfo(
        channel === 'phone'
          ? 'We sent a 6-digit code via SMS.'
          : 'Check your email for a 6-digit code.',
      );
      return;
    }
    if (result.reason === 'sms_not_configured' && channel === 'phone') {
      setChannel('email');
      setError(null);
      setInfo('SMS is not available yet. Switched to email — try again.');
      return;
    }
    setError(result.message);
  }

  function onVerifyOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const result = await verifyOtpAction(channel, identifier, code);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.push(result.next);
    });
  }

  function onResend() {
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const result = await sendOtpAction(channel, identifier);
      applySendResult(result);
    });
  }

  function onEditIdentifier() {
    setStep('identifier');
    setCode('');
    setError(null);
    setInfo(null);
  }

  if (step === 'code') {
    return (
      <form onSubmit={onVerifyOtp} className="space-y-5">
        <div>
          <p className="text-sm text-muted-foreground">
            Code sent to <span className="font-medium text-foreground">{identifier}</span>{' '}
            <button
              type="button"
              onClick={onEditIdentifier}
              className="text-primary underline underline-offset-2 hover:no-underline"
            >
              change
            </button>
          </p>
        </div>
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">6-digit code</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-lg tracking-[0.4em] text-center font-mono focus:outline-none focus:ring-2 focus:ring-ring/40"
            autoFocus
            disabled={pending}
          />
        </label>
        {info && <p className="text-xs text-muted-foreground">{info}</p>}
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={pending || code.length < 4}>
          {pending ? 'Verifying…' : 'Continue'}
        </Button>
        <p className="text-xs text-center text-muted-foreground">
          Didn&apos;t get it?{' '}
          <button
            type="button"
            onClick={onResend}
            disabled={pending}
            className="text-primary underline underline-offset-2 hover:no-underline disabled:opacity-50"
          >
            Resend code
          </button>
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={onSendOtp} className="space-y-5">
      <div
        role="tablist"
        aria-label="Signup channel"
        className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5"
      >
        <ChannelTab
          active={channel === 'phone'}
          onClick={() => {
            setChannel('phone');
            setIdentifier('');
            setError(null);
          }}
        >
          Phone
        </ChannelTab>
        <ChannelTab
          active={channel === 'email'}
          onClick={() => {
            setChannel('email');
            setIdentifier('');
            setError(null);
          }}
        >
          Email
        </ChannelTab>
      </div>
      <label className="block">
        <span className="text-xs font-medium text-muted-foreground">
          {channel === 'phone' ? 'Phone number' : 'Email'}
        </span>
        <input
          type={channel === 'phone' ? 'tel' : 'email'}
          inputMode={channel === 'phone' ? 'tel' : 'email'}
          autoComplete={channel === 'phone' ? 'tel' : 'email'}
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder={
            channel === 'phone' ? '01712345678 or +8801712345678' : 'you@example.com'
          }
          className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
          autoFocus
          disabled={pending}
          required
        />
      </label>
      {info && <p className="text-xs text-muted-foreground">{info}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={pending || identifier.trim().length === 0}>
        {pending ? 'Sending…' : 'Send verification code'}
      </Button>
    </form>
  );
}

function ChannelTab({
  active,
  onClick,
  children,
}: {
  readonly active: boolean;
  readonly onClick: () => void;
  readonly children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`px-4 py-1.5 text-sm rounded-[calc(var(--radius-md)-2px)] transition-colors ${
        active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}
