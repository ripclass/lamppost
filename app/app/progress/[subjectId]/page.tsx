export default async function SubjectProgressPage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const { subjectId } = await params;
  return (
    <section className="mx-auto max-w-3xl px-4 md:px-8 py-8 md:py-12">
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
        Your journey
      </h1>
      <p className="mt-2 text-muted-foreground">
        Subject: <span className="font-medium">{subjectId}</span>
      </p>
      <div className="mt-8 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground/70">
        Vertical chapter path with completed/current/locked states ships in Phase A Step 4.
      </div>
    </section>
  );
}
