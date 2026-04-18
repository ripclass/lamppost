export default function ProgressIndex() {
  return (
    <section className="mx-auto max-w-3xl px-4 md:px-8 py-8 md:py-12">
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Progress</h1>
      <p className="mt-2 text-muted-foreground">
        Pick a subject to see your journey map. Per-subject detail at
        <code className="mx-1 text-xs">/app/progress/[subjectId]</code>.
      </p>
      <div className="mt-8 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground/70">
        Journey-map progress view ships in Phase A Step 4.
      </div>
    </section>
  );
}
