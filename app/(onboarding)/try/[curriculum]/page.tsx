import { notFound } from 'next/navigation';
import { findCurriculum, hasLiveSample } from '../curricula';
import { pickSubjectAction } from '../actions';

export default async function SubjectPickerPage({
  params,
}: {
  params: Promise<{ curriculum: string }>;
}) {
  const { curriculum: curriculumSlug } = await params;
  const curriculum = findCurriculum(curriculumSlug);
  if (!curriculum) notFound();

  return (
    <section className="mx-auto max-w-3xl px-4 pt-24 pb-16">
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-center">
        Pick a subject to try.
      </h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        {curriculum.label}
        {curriculum.subBn && (
          <span className="text-muted-foreground/70"> · {curriculum.subBn}</span>
        )}
      </p>
      <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {curriculum.subjects.map((s) => {
          const live = hasLiveSample(curriculum.id, s.id);
          return (
            <form
              key={s.id}
              action={async () => {
                'use server';
                await pickSubjectAction(curriculum.id, s.id);
              }}
            >
              <button
                type="submit"
                className="w-full rounded-xl border border-border bg-card p-4 text-left hover:border-primary transition-colors focus:outline-none focus:ring-2 focus:ring-ring/40"
              >
                <div className="text-sm font-semibold">{s.label}</div>
                {s.labelBn && (
                  <div className="text-xs text-muted-foreground/70 mt-0.5">
                    {s.labelBn}
                  </div>
                )}
                {!live && (
                  <div className="mt-2 text-[10px] uppercase tracking-wide text-muted-foreground/60">
                    Coming soon
                  </div>
                )}
              </button>
            </form>
          );
        })}
      </div>
    </section>
  );
}
