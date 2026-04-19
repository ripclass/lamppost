import Link from 'next/link';
import { notFound } from 'next/navigation';
import { findCurriculum, hasLiveSample } from '../../../curricula';

export default async function SubjectComingSoonPage({
  params,
}: {
  params: Promise<{ curriculum: string; subject: string }>;
}) {
  const { curriculum: curriculumSlug, subject: subjectSlug } = await params;
  const curriculum = findCurriculum(curriculumSlug);
  if (!curriculum) notFound();
  const subject = curriculum.subjects.find((s) => s.id === subjectSlug);
  if (!subject) notFound();
  if (hasLiveSample(curriculum.id, subject.id)) {
    // If the live sample exists, the server action would have redirected — but
    // a direct hit to this URL should bounce back to the real entry.
    notFound();
  }

  return (
    <section className="mx-auto max-w-md px-4 pt-24 pb-16 text-center">
      <p className="text-xs uppercase tracking-wide text-muted-foreground/60">
        {curriculum.label} · {subject.label}
      </p>
      <h1 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight">
        This subject is on the way.
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        We&apos;re prioritising content that real students ask for. Your pick just
        told us to move this one up. Try the SSC Physics sample in the meantime
        to see how Lamppost feels.
      </p>
      <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          href="/try/ssc"
          className="rounded-lg bg-primary px-5 py-2.5 text-sm text-primary-foreground font-medium hover:opacity-90"
        >
          Try the SSC sample
        </Link>
        <Link
          href="/try"
          className="rounded-lg border border-border px-5 py-2.5 text-sm hover:bg-muted"
        >
          Pick a different curriculum
        </Link>
      </div>
    </section>
  );
}
