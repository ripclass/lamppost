import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import type { SessionUser } from '@/lib/auth/server';

// Stub the minimum env to satisfy lib/config/server's Zod boot validation —
// the admin routes import serverConfig transitively.
beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key');
  vi.stubEnv('ANTHROPIC_API_KEY', 'sk-anthropic');
});

async function mockSession(user: SessionUser | null): Promise<void> {
  vi.doMock('@/lib/auth/server', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/auth/server')>();
    return {
      ...actual,
      getSession: vi.fn(async () => user),
    };
  });
}

describe('admin API auth guards', () => {
  it('POST /api/qa-bank/generate without a session returns 403', async () => {
    await mockSession(null);
    const { POST } = await import('@/app/api/qa-bank/generate/route');
    const req = new NextRequest('http://localhost/api/qa-bank/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chapterId: '00000000-0000-0000-0000-000000000000' }),
    });
    expect((await POST(req)).status).toBe(403);
  });

  it('POST /api/curriculum/batch-generate without a session returns 403', async () => {
    await mockSession(null);
    const { POST } = await import('@/app/api/curriculum/batch-generate/route');
    const req = new NextRequest('http://localhost/api/curriculum/batch-generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect((await POST(req)).status).toBe(403);
  });

  it('GET /api/qa-bank/stats without a session returns 403', async () => {
    await mockSession(null);
    const { GET } = await import('@/app/api/qa-bank/stats/route');
    const req = new NextRequest(
      'http://localhost/api/qa-bank/stats?chapterId=00000000-0000-0000-0000-000000000000',
    );
    expect((await GET(req)).status).toBe(403);
  });

  it('POST /api/qa-bank/generate with a non-admin (student) session returns 403', async () => {
    await mockSession({
      id: 'user-1',
      authId: 'auth-1',
      role: 'student',
      displayName: null,
      email: null,
      phone: null,
    });
    const { POST } = await import('@/app/api/qa-bank/generate/route');
    const req = new NextRequest('http://localhost/api/qa-bank/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chapterId: '00000000-0000-0000-0000-000000000000' }),
    });
    expect((await POST(req)).status).toBe(403);
  });

  it('POST /api/qa-bank/generate with support_agent (below content_editor) returns 403', async () => {
    await mockSession({
      id: 'user-1',
      authId: 'auth-1',
      role: 'support_agent',
      displayName: null,
      email: null,
      phone: null,
    });
    const { POST } = await import('@/app/api/qa-bank/generate/route');
    const req = new NextRequest('http://localhost/api/qa-bank/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chapterId: '00000000-0000-0000-0000-000000000000' }),
    });
    expect((await POST(req)).status).toBe(403);
  });

  it('POST /api/qa-bank/generate with content_editor passes the guard (not 403)', async () => {
    await mockSession({
      id: 'user-1',
      authId: 'auth-1',
      role: 'content_editor',
      displayName: null,
      email: null,
      phone: null,
    });
    const { POST } = await import('@/app/api/qa-bank/generate/route');
    const req = new NextRequest('http://localhost/api/qa-bank/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chapterId: '00000000-0000-0000-0000-000000000000' }),
    });
    const res = await POST(req);
    expect(res.status).not.toBe(403);
  });

  it('GET /api/qa-bank/stats with read_only role passes the guard (not 403)', async () => {
    await mockSession({
      id: 'user-1',
      authId: 'auth-1',
      role: 'read_only',
      displayName: null,
      email: null,
      phone: null,
    });
    // Stub the query helpers so the route doesn't try to hit a real Supabase.
    vi.doMock('@/lib/db/queries/qa-bank', () => ({
      getChapterQAStats: vi.fn(async () => ({ totalEntries: 0 })),
    }));
    vi.doMock('@/lib/db/queries/interactions', () => ({
      getInteractionStats: vi.fn(async () => ({ totalInteractions: 0 })),
    }));
    const { GET } = await import('@/app/api/qa-bank/stats/route');
    const req = new NextRequest(
      'http://localhost/api/qa-bank/stats?chapterId=00000000-0000-0000-0000-000000000000',
    );
    const res = await GET(req);
    expect(res.status).not.toBe(403);
  });
});
