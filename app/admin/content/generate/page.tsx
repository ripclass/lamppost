export default function AdminContentGeneratePage() {
  return (
    <div className="p-6 md:p-8 max-w-6xl">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Batch Generation</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Select curriculum + subjects + chapters (pending only) → submit to Opus Batch API.
          Live progress, ETA, cost estimate. Historical jobs.
        </p>
      </header>
      <section className="rounded-xl border border-dashed border-border p-8 text-sm text-muted-foreground/70">
        Batch control ships in Phase A Step 6. The existing one-off creator flow moved
        to <code>/admin/creator</code> (hidden, not in sidebar).
      </section>
    </div>
  );
}
