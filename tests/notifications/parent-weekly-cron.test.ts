import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key');
  vi.stubEnv('ANTHROPIC_API_KEY', 'sk-anthropic');
  vi.stubEnv('UNSUBSCRIBE_SECRET', 'test-unsub');
  vi.stubEnv('CRON_SECRET', 'test-cron');
});

describe('GET /api/cron/parent-weekly', () => {
  it('returns 401 without the CRON_SECRET bearer', async () => {
    vi.doMock('@/lib/db/queries/parent-email', () => ({
      listDueParents: vi.fn(async () => []),
      getStudentSummaries: vi.fn(async () => []),
    }));
    const { GET } = await import('@/app/api/cron/parent-weekly/route');
    const req = new NextRequest('http://localhost/api/cron/parent-weekly');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns idle when no parents are due', async () => {
    vi.doMock('@/lib/db/queries/parent-email', () => ({
      listDueParents: vi.fn(async () => []),
      getStudentSummaries: vi.fn(async () => []),
    }));
    const { GET } = await import('@/app/api/cron/parent-weekly/route');
    const req = new NextRequest('http://localhost/api/cron/parent-weekly', {
      headers: { authorization: 'Bearer test-cron' },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; parentsConsidered: number };
    expect(body.status).toBe('idle');
    expect(body.parentsConsidered).toBe(0);
  });

  it('graceful-skips when Postmark is not configured but still runs the query', async () => {
    const listDueParents = vi.fn(async () => [
      { parentId: 'p-1', email: 'parent@example.com', displayName: null, studentIds: ['s-1'] },
    ]);
    const getStudentSummaries = vi.fn();
    vi.doMock('@/lib/db/queries/parent-email', () => ({
      listDueParents,
      getStudentSummaries,
    }));
    const { GET } = await import('@/app/api/cron/parent-weekly/route');
    const req = new NextRequest('http://localhost/api/cron/parent-weekly', {
      headers: { authorization: 'Bearer test-cron' },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; parentsConsidered: number; sent: number };
    expect(body.status).toBe('skipped_not_configured');
    expect(body.parentsConsidered).toBe(1);
    expect(body.sent).toBe(0);
    expect(listDueParents).toHaveBeenCalled();
  });

  it('dry-run renders per-parent but does not send', async () => {
    vi.stubEnv('POSTMARK_SERVER_TOKEN', 'server-token');
    vi.stubEnv('POSTMARK_FROM_EMAIL', 'hello@lamppost.test');

    const listDueParents = vi.fn(async () => [
      { parentId: 'p-1', email: 'parent@example.com', displayName: null, studentIds: ['s-1'] },
    ]);
    const getStudentSummaries = vi.fn(async () => [
      {
        studentId: 's-1',
        studentName: 'Mahmuda',
        interactionsLastWeek: 5,
        chaptersTouchedLastWeek: 2,
        qaHitRate: 0.8,
        fallbackCount: 1,
        rateLimitHits: 0,
        streakDays: 0,
        mostActiveChapterTitle: null,
      },
    ]);
    const sendParentEmail = vi.fn();
    vi.doMock('@/lib/db/queries/parent-email', () => ({
      listDueParents,
      getStudentSummaries,
    }));
    vi.doMock('@/lib/notifications/parent-email', async (importOriginal) => {
      const actual =
        await importOriginal<typeof import('@/lib/notifications/parent-email')>();
      return { ...actual, sendParentEmail };
    });
    const { GET } = await import('@/app/api/cron/parent-weekly/route');
    const req = new NextRequest(
      'http://localhost/api/cron/parent-weekly?dryRun=true',
      { headers: { authorization: 'Bearer test-cron' } },
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; sent: number };
    expect(body.status).toBe('dry_run_completed');
    expect(body.sent).toBe(0);
    expect(sendParentEmail).not.toHaveBeenCalled();
    expect(getStudentSummaries).toHaveBeenCalledWith(['s-1']);
  });
});
