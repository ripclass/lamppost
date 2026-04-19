'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminRole } from '@/lib/auth/admin-guard';
import { setChapterNeedsRegeneration } from '@/lib/db/queries/admin/content';

/**
 * Flag / unflag a chapter for regeneration. Batch generator will pick up
 * flagged chapters on the next run. This action is gated to content_editor
 * and above — same level as the /api/qa-bank/generate endpoint, since both
 * eventually drive Opus spend.
 */
export async function toggleChapterNeedsRegenerationAction(
  chapterId: string,
  nextValue: boolean,
): Promise<void> {
  const guard = await requireAdminRole('content_editor');
  if (!guard.ok) throw new Error('Forbidden: content_editor role required');

  await setChapterNeedsRegeneration(chapterId, nextValue);
  revalidatePath(`/admin/content/${chapterId}`);
  revalidatePath('/admin/content');
}
