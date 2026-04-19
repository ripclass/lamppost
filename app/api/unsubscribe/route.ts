import { NextRequest, NextResponse } from 'next/server';
import { verifyUnsubscribeToken } from '@/lib/notifications/unsubscribe-token';
import { markParentUnsubscribed } from '@/lib/db/queries/parent-email';
import { createLogger } from '@/lib/logger';

const log = createLogger('API:Unsubscribe');

/**
 * GET /api/unsubscribe?token=…
 *
 * Public endpoint — the HMAC in the token is the auth. On success, flips
 * parents.unsubscribed_at. Renders a tiny HTML response so the user sees a
 * confirmation rather than a JSON blob.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return htmlResponse(400, 'Missing token', 'We could not find the unsubscribe token in the link.');
  }

  const result = verifyUnsubscribeToken(token);
  if (!result.ok) {
    const [status, title, body] = verifyErrorCopy(result.reason);
    log.info(`Unsubscribe rejected: ${result.reason}`);
    return htmlResponse(status, title, body);
  }

  try {
    await markParentUnsubscribed(result.payload.parentId);
    log.info(`Parent ${result.payload.parentId} unsubscribed`);
    return htmlResponse(
      200,
      `You're unsubscribed`,
      `We won't send you any more weekly updates. You can always re-subscribe later from the student's profile.`,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(`Unsubscribe write failed: ${msg}`);
    return htmlResponse(500, 'Something went wrong', 'Please try the link again in a minute.');
  }
}

function verifyErrorCopy(reason: 'not_configured' | 'malformed' | 'bad_signature' | 'expired'): [number, string, string] {
  switch (reason) {
    case 'not_configured':
      return [500, 'Not configured', 'Unsubscribe is temporarily unavailable.'];
    case 'malformed':
      return [400, 'Invalid link', 'That unsubscribe link is malformed.'];
    case 'bad_signature':
      return [400, 'Invalid link', 'That unsubscribe link has been tampered with.'];
    case 'expired':
      return [
        410,
        'Link expired',
        'This unsubscribe link is older than 90 days. Open a recent weekly email to find a fresh one, or ask the student to remove you from their Lamppost profile.',
      ];
  }
}

function htmlResponse(status: number, title: string, body: string): NextResponse {
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)} · Lamppost</title>
<style>
  body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 10vh auto; padding: 24px; color: #1a1a1a; }
  h1 { font-size: 20px; margin-bottom: 8px; }
  p { color: #555; line-height: 1.6; }
</style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(body)}</p>
</body>
</html>`;
  return new NextResponse(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
