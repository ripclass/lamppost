'use server';

import { redirect } from 'next/navigation';
import { updateOnboardingSession } from '@/lib/auth/anonymous';
import { getServiceClient } from '@/lib/db/supabase';
import { findCurriculum, hasLiveSample } from './curricula';

/**
 * Curriculum picked on /try. Persists the choice and routes to the subject
 * picker. Anonymous session row is created lazily inside updateOnboardingSession.
 */
export async function pickCurriculumAction(curriculumId: string): Promise<void> {
  const curriculum = findCurriculum(curriculumId);
  if (!curriculum) throw new Error(`Unknown curriculum: ${curriculumId}`);

  await updateOnboardingSession({
    curriculumChoice: curriculum.id,
    // Clear stale subject choice when curriculum changes
    subjectChoice: null,
    sampleChapterId: null,
  });

  redirect(`/try/${curriculum.id}`);
}

/**
 * Subject picked on /try/[curriculum]. Persists the choice. If the pairing
 * has a live fixture chapter, we look it up and route to /try/lesson/[chapterId].
 * Otherwise we still persist for funnel analytics and route to a "coming soon"
 * landing so the student knows what's in flight.
 */
export async function pickSubjectAction(curriculumId: string, subjectId: string): Promise<void> {
  const curriculum = findCurriculum(curriculumId);
  if (!curriculum) throw new Error(`Unknown curriculum: ${curriculumId}`);
  const subject = curriculum.subjects.find((s) => s.id === subjectId);
  if (!subject) throw new Error(`Unknown subject for ${curriculumId}: ${subjectId}`);

  let sampleChapterId: string | null = null;

  if (hasLiveSample(curriculum.id, subject.id)) {
    const supabase = getServiceClient();
    const { data } = await supabase
      .from('chapters')
      .select('id')
      .eq('metadata->>sample', 'true')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    sampleChapterId = data?.id ?? null;
  }

  await updateOnboardingSession({
    curriculumChoice: curriculum.id,
    subjectChoice: subject.id,
    sampleChapterId,
  });

  if (sampleChapterId) {
    redirect(`/try/lesson/${sampleChapterId}`);
  }

  redirect(`/try/${curriculum.id}/${subject.id}/coming-soon`);
}
