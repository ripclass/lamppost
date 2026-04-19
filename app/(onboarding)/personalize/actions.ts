'use server';

import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/server';
import { getServiceClient } from '@/lib/db/supabase';

export type StudyGoal =
  | 'ssc_this_year'
  | 'ssc_next_year'
  | 'curious'
  | 'tutor_assigned';

export interface PersonalizeInput {
  studyGoal: StudyGoal | null;
  dailyMinutes: number | null;
  targetExamDate: string | null; // YYYY-MM-DD
}

/**
 * Save whichever fields the student answered (each is skippable). Runs an
 * UPDATE on students; nulls leave the existing value alone so a partial
 * answer today doesn't wipe a previous answer.
 */
export async function savePersonalizeAction(input: PersonalizeInput): Promise<void> {
  const session = await getSession();
  if (!session) {
    redirect('/signup?next=/personalize');
  }

  const patch: Record<string, unknown> = {};
  if (input.studyGoal !== null) patch.study_goal = input.studyGoal;
  if (input.dailyMinutes !== null) patch.daily_minutes_commitment = input.dailyMinutes;
  if (input.targetExamDate !== null) patch.target_exam_date = input.targetExamDate;

  if (Object.keys(patch).length > 0) {
    const supabase = getServiceClient();
    const { error } = await supabase.from('students').update(patch).eq('id', session.id);
    if (error) {
      throw new Error(`Failed to save personalize: ${error.message}`);
    }
  }

  redirect('/app');
}
