import { describe, expect, it, vi, beforeEach } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key');
  vi.stubEnv('ANTHROPIC_API_KEY', 'sk-anthropic');
  vi.stubEnv('UNSUBSCRIBE_SECRET', 'test-unsub');
});

const baseStudent = {
  studentId: 'stu-1',
  studentName: 'Mahmuda',
  interactionsLastWeek: 12,
  chaptersTouchedLastWeek: 3,
  qaHitRate: 0.75,
  fallbackCount: 3,
  rateLimitHits: 0,
  streakDays: 0,
  mostActiveChapterTitle: null,
};

describe('renderParentEmail', () => {
  it('uses the student name in the subject when there is one student', async () => {
    const { renderParentEmail } = await import('@/lib/notifications/parent-email');
    const out = renderParentEmail({
      parentId: 'p-1',
      parentEmail: 'parent@example.com',
      parentDisplayName: null,
      students: [baseStudent],
      baseUrl: 'https://lamppost.example',
    });
    expect(out.subject).toBe(`Mahmuda's week on Lamppost`);
  });

  it('uses a pluralized subject for multiple students', async () => {
    const { renderParentEmail } = await import('@/lib/notifications/parent-email');
    const out = renderParentEmail({
      parentId: 'p-1',
      parentEmail: 'parent@example.com',
      parentDisplayName: null,
      students: [baseStudent, { ...baseStudent, studentId: 'stu-2', studentName: 'Rifat' }],
      baseUrl: 'https://lamppost.example',
    });
    expect(out.subject).toBe(`Your kids' week on Lamppost`);
    expect(out.textBody).toContain('Mahmuda');
    expect(out.textBody).toContain('Rifat');
  });

  it('surfaces rate-limit hits when they pass the 3-hit threshold', async () => {
    const { renderParentEmail } = await import('@/lib/notifications/parent-email');
    const out = renderParentEmail({
      parentId: 'p-1',
      parentEmail: 'parent@example.com',
      parentDisplayName: null,
      students: [{ ...baseStudent, rateLimitHits: 4 }],
      baseUrl: 'https://lamppost.example',
    });
    expect(out.textBody).toContain('Hit the free-tier question limit 4 times');
  });

  it('omits rate-limit line below threshold', async () => {
    const { renderParentEmail } = await import('@/lib/notifications/parent-email');
    const out = renderParentEmail({
      parentId: 'p-1',
      parentEmail: 'parent@example.com',
      parentDisplayName: null,
      students: [{ ...baseStudent, rateLimitHits: 2 }],
      baseUrl: 'https://lamppost.example',
    });
    expect(out.textBody).not.toContain('free-tier question limit');
  });

  it('surfaces streaks of 2+ days', async () => {
    const { renderParentEmail } = await import('@/lib/notifications/parent-email');
    const out = renderParentEmail({
      parentId: 'p-1',
      parentEmail: 'parent@example.com',
      parentDisplayName: null,
      students: [{ ...baseStudent, streakDays: 5 }],
      baseUrl: 'https://lamppost.example',
    });
    expect(out.textBody).toContain('5-day study streak');
  });

  it('handles zero-activity weeks with a gentle nudge line', async () => {
    const { renderParentEmail } = await import('@/lib/notifications/parent-email');
    const out = renderParentEmail({
      parentId: 'p-1',
      parentEmail: 'parent@example.com',
      parentDisplayName: null,
      students: [{ ...baseStudent, interactionsLastWeek: 0, chaptersTouchedLastWeek: 0 }],
      baseUrl: 'https://lamppost.example',
    });
    expect(out.textBody).toContain('No study activity this week');
    expect(out.textBody).not.toContain('Most active in');
  });

  it('includes a signed unsubscribe URL', async () => {
    const { renderParentEmail } = await import('@/lib/notifications/parent-email');
    const out = renderParentEmail({
      parentId: 'p-1',
      parentEmail: 'parent@example.com',
      parentDisplayName: null,
      students: [baseStudent],
      baseUrl: 'https://lamppost.example',
    });
    expect(out.textBody).toMatch(/\/api\/unsubscribe\?token=[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
  });

  it('escapes student names in HTML', async () => {
    const { renderParentEmail } = await import('@/lib/notifications/parent-email');
    const out = renderParentEmail({
      parentId: 'p-1',
      parentEmail: 'parent@example.com',
      parentDisplayName: null,
      students: [{ ...baseStudent, studentName: '<script>alert(1)</script>' }],
      baseUrl: 'https://lamppost.example',
    });
    expect(out.htmlBody).not.toContain('<script>alert(1)</script>');
    expect(out.htmlBody).toContain('&lt;script&gt;');
  });
});

describe('sendParentEmail', () => {
  it('returns not_configured when Postmark env is missing', async () => {
    const { sendParentEmail } = await import('@/lib/notifications/parent-email');
    const result = await sendParentEmail('p@example.com', {
      subject: 's',
      htmlBody: 'h',
      textBody: 't',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('not_configured');
  });
});
