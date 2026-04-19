import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createLogger } from '@/lib/logger';
import { providerStatus, serverConfig } from '@/lib/config/server';
import {
  listDueParents,
  getStudentSummaries,
} from '@/lib/db/queries/parent-email';
import {
  renderParentEmail,
  sendParentEmail,
} from '@/lib/notifications/parent-email';

const log = createLogger('Cron:ParentWeekly');

/**
 * GET /api/cron/parent-weekly
 *
 * Scheduled Sunday 10 AM Asia/Dhaka (0 4 * * 0 UTC). Sends the weekly
 * summary to each parent linked to an active student. CRON_SECRET-gated.
 *
 * Behavior matrix:
 *   - POSTMARK missing + dryRun=false → graceful-skip, still runs query,
 *     logs how many parents *would* have been emailed
 *   - POSTMARK present + dryRun=true  → renders every email but sends none
 *   - POSTMARK present + dryRun=false → sends each email, logs results
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = serverConfig.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return apiError('INVALID_REQUEST', 401, 'Unauthorized');
  }

  const dryRun = request.nextUrl.searchParams.get('dryRun') === 'true';
  const baseUrl = deriveBaseUrl(request);

  try {
    const parents = await listDueParents();
    log.info(`Parent-weekly: ${parents.length} parents eligible`);

    if (parents.length === 0) {
      return apiSuccess({ status: 'idle', parentsConsidered: 0, sent: 0 });
    }

    if (!providerStatus.postmark && !dryRun) {
      log.info(
        `Postmark not configured — skipping send. Would have emailed ${parents.length} parents.`,
      );
      return apiSuccess({
        status: 'skipped_not_configured',
        parentsConsidered: parents.length,
        sent: 0,
      });
    }

    let sent = 0;
    let failed = 0;
    const failures: Array<{ parentId: string; reason: string }> = [];

    for (const parent of parents) {
      try {
        const students = await getStudentSummaries(parent.studentIds);
        const rendered = renderParentEmail({
          parentId: parent.parentId,
          parentEmail: parent.email,
          parentDisplayName: parent.displayName,
          students,
          baseUrl,
        });

        if (dryRun) {
          log.info(
            `[dryRun] ${parent.email}: "${rendered.subject}" (${students.length} student(s))`,
          );
          continue;
        }

        const result = await sendParentEmail(parent.email, rendered);
        if (result.ok) {
          sent++;
        } else {
          failed++;
          failures.push({ parentId: parent.parentId, reason: `${result.reason}: ${result.message}` });
        }
      } catch (err) {
        failed++;
        const msg = err instanceof Error ? err.message : String(err);
        failures.push({ parentId: parent.parentId, reason: msg });
        log.error(`Parent ${parent.parentId} failed: ${msg}`);
      }
    }

    return apiSuccess({
      status: dryRun ? 'dry_run_completed' : 'completed',
      parentsConsidered: parents.length,
      sent,
      failed,
      failures: failures.slice(0, 25),
    });
  } catch (error) {
    log.error('Parent-weekly cron failed:', error);
    return apiError(
      'INTERNAL_ERROR',
      500,
      'Parent-weekly processing failed',
      error instanceof Error ? error.message : undefined,
    );
  }
}

function deriveBaseUrl(request: NextRequest): string {
  // Prefer the env (set on Vercel as VERCEL_URL or NEXT_PUBLIC_APP_URL); fall
  // back to the request origin so local dev works without extra config.
  const envUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL;
  if (envUrl) return envUrl.startsWith('http') ? envUrl : `https://${envUrl}`;
  return request.nextUrl.origin;
}
