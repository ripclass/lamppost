import { describe, expect, it, vi, beforeEach } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key');
  vi.stubEnv('ANTHROPIC_API_KEY', 'sk-anthropic');
  vi.stubEnv('UNSUBSCRIBE_SECRET', 'unsubscribe-test-secret');
});

describe('unsubscribe-token', () => {
  it('round-trips a signed token within the 90-day window', async () => {
    const { signUnsubscribeToken, verifyUnsubscribeToken } = await import(
      '@/lib/notifications/unsubscribe-token'
    );
    const token = signUnsubscribeToken('parent-123');
    const result = verifyUnsubscribeToken(token);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.payload.parentId).toBe('parent-123');
  });

  it('rejects tokens older than 90 days', async () => {
    const { signUnsubscribeToken, verifyUnsubscribeToken } = await import(
      '@/lib/notifications/unsubscribe-token'
    );
    const oldDate = new Date('2026-01-01T00:00:00Z');
    const laterDate = new Date('2026-05-01T00:00:00Z'); // >90 days after
    const token = signUnsubscribeToken('parent-123', oldDate);
    const result = verifyUnsubscribeToken(token, laterDate);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('expired');
  });

  it('rejects tampered signatures', async () => {
    const { signUnsubscribeToken, verifyUnsubscribeToken } = await import(
      '@/lib/notifications/unsubscribe-token'
    );
    const token = signUnsubscribeToken('parent-123');
    const [body] = token.split('.');
    const tampered = `${body}.AAAA`;
    const result = verifyUnsubscribeToken(tampered);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('bad_signature');
  });

  it('rejects tampered payloads (signature mismatch)', async () => {
    const { signUnsubscribeToken, verifyUnsubscribeToken } = await import(
      '@/lib/notifications/unsubscribe-token'
    );
    const token = signUnsubscribeToken('parent-123');
    const [, sig] = token.split('.');
    const forgedBody = Buffer.from(
      JSON.stringify({ parentId: 'attacker', issuedAt: Date.now() }),
    )
      .toString('base64')
      .replace(/=+$/, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
    const tampered = `${forgedBody}.${sig}`;
    const result = verifyUnsubscribeToken(tampered);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('bad_signature');
  });

  it('rejects malformed tokens', async () => {
    const { verifyUnsubscribeToken } = await import(
      '@/lib/notifications/unsubscribe-token'
    );
    expect(verifyUnsubscribeToken('garbage').ok).toBe(false);
    expect(verifyUnsubscribeToken('only-one-part').ok).toBe(false);
  });

  it('returns not_configured when the secret is absent', async () => {
    // Zod's `nonEmpty.optional()` accepts undefined; unset via delete so
    // serverConfig sees no UNSUBSCRIBE_SECRET at all.
    delete process.env.UNSUBSCRIBE_SECRET;
    vi.resetModules();
    const { verifyUnsubscribeToken } = await import(
      '@/lib/notifications/unsubscribe-token'
    );
    const result = verifyUnsubscribeToken('anything.here');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('not_configured');
  });
});
