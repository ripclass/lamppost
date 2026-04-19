import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/server';
import { getServiceClient } from '@/lib/db/supabase';
import { PersonalizeForm } from './personalize-form';

/**
 * Three-question personalization. Page-level guard: must have a session;
 * returning students (with study_goal already set) skip straight to /app
 * so we don't re-prompt on every login.
 */
export default async function PersonalizePage() {
  const session = await getSession();
  if (!session) {
    redirect('/signup?next=/personalize');
  }

  const supabase = getServiceClient();
  const { data: student } = await supabase
    .from('students')
    .select('study_goal')
    .eq('id', session.id)
    .maybeSingle();

  if (student?.study_goal) {
    redirect('/app');
  }

  return (
    <section className="mx-auto max-w-xl px-4 pt-20 pb-16">
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
        Three quick questions.
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Each one is skippable. Your answers help Lamppost pace the work for you.
      </p>
      <div className="mt-10">
        <PersonalizeForm defaultExamDate={sixMonthsOutISO()} />
      </div>
    </section>
  );
}

function sixMonthsOutISO(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 6);
  return d.toISOString().slice(0, 10);
}
