// Authed student classroom. The anonymous sample lesson already mounts the
// classroom player at /try/lesson/[sampleId] (Step 4). This authed route
// will reuse the same `ClassroomPlayer` with `identity.type === 'authed'`.
// Deferred to Phase B — needs slide playback + lesson-scene rendering on
// top of the preserved slide-renderer / whiteboard primitives.

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
        Authed classroom coming soon. For now, try the anonymous sample at{' '}
        <code>/try/lesson/&lt;chapterId&gt;</code>.
      </div>
    </section>
  );
}
