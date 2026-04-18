// Student-portal classroom wrapper. The OpenMAIC playback engine lives at
// /classroom/[id] already and continues to function. Phase A Step 4 wraps
// it here with the student chrome (dark bg, hand-raise button, "from chapter"
// source badge) and loads lesson content from Supabase by chapterId.

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
        Wraps the OpenMAIC playback engine with student chrome — ships in Phase A Step 4.
      </div>
    </section>
  );
}
