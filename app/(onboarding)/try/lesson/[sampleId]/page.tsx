// Step 3 of onboarding — the sample chapter. This is the "magic moment" —
// a complete lesson experience BEFORE account creation.
// Real implementation wraps the OpenMAIC classroom engine anonymously in Phase A Step 5.

export default async function SampleLessonPage({
  params,
}: {
  params: Promise<{ sampleId: string }>;
}) {
  const { sampleId } = await params;
  return (
    <section className="mx-auto max-w-3xl px-4 pt-24 pb-16">
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-center">
        Your sample lesson
      </h1>
      <p className="mt-3 text-center text-sm text-muted-foreground">
        Chapter: <span className="font-medium">{sampleId}</span>
      </p>
      <p className="mt-10 text-center text-muted-foreground/70">
        Classroom wrapper with anonymous session, hand-raise, and Q&amp;A bank lookup
        ships in Phase A Step 5.
      </p>
    </section>
  );
}
