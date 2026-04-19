// Authed student classroom. Lamppost's anonymous sample lesson ships the
// classroom player at /try/lesson/[sampleId] in Step 4; this authed route
// will mount the same `ClassroomPlayer` with `identity.type === 'authed'`
// once onboarding + auth land in Step 5. Keeping this a skeleton until then.

export default async function StudentClassroomPage({
  params,
}: {
  params: Promise<{ chapterId: string }>;
}) {
  const { chapterId } = await params;
  return (
    <section className="mx-auto max-w-3xl px-4 md:px-8 py-8 md:py-12">
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Classroom</h1>
      <p className="mt-2 text-muted-foreground">
        Chapter: <span className="font-medium">{chapterId}</span>
      </p>
      <div className="mt-8 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground/70">
        Authed student classroom ships with onboarding in Phase A Step 5. Try
        the anonymous sample at <code>/try/lesson/&lt;chapterId&gt;</code>.
      </div>
    </section>
  );
}
