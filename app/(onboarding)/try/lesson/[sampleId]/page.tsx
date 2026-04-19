import { notFound } from 'next/navigation';
import { getOrCreateOnboardingSession } from '@/lib/auth/anonymous';
import { getServiceClient } from '@/lib/db/supabase';
import { ClassroomPlayer } from '@/components/classroom/classroom-player';

/**
 * Anonymous sample lesson. First hit lazily creates the onboarding session
 * row and binds it to this chapter, so the Step 5 funnel can pick up from
 * here with curriculum/subject already recorded upstream.
 *
 * The player is identity-aware: it posts the Identity discriminated union
 * to /api/qa-bank/search so the rate limiter and interaction logger know
 * how to key the request. For anon, `sessionId` is the onboarding_sessions
 * UUID (matches student_interactions.session_id) and `sessionToken` is the
 * nanoid cookie (matches user_usage_daily.anonymous_session_token).
 */
export default async function SampleLessonPage({
  params,
}: {
  params: Promise<{ sampleId: string }>;
}) {
  const { sampleId } = await params;

  const supabase = getServiceClient();
  const { data: chapter } = await supabase
    .from('chapters')
    .select('id, title')
    .eq('id', sampleId)
    .maybeSingle();

  if (!chapter) notFound();

  const session = await getOrCreateOnboardingSession();

  if (session.sampleChapterId !== chapter.id) {
    await supabase
      .from('onboarding_sessions')
      .update({ sample_chapter_id: chapter.id })
      .eq('id', session.id);
  }

  return (
    <ClassroomPlayer
      chapterId={chapter.id}
      chapterTitle={chapter.title}
      headerBadge="Sample preview"
      identity={{
        type: 'anon',
        sessionToken: session.sessionToken,
        sessionId: session.id,
      }}
    />
  );
}
