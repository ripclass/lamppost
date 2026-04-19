export default function AdminCostsPage() {
  return (
    <div className="p-6 md:p-8 max-w-6xl">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Costs</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Daily spend by model, task, user tier. Batch vs sync. Caching savings.
          Calculator at <code>/admin/costs/calculator</code>.
        </p>
      </header>
      <section className="rounded-xl border border-dashed border-border p-8 text-sm text-muted-foreground/70">
        Full spend breakdown and scenario calculator ship in a later step. The
        overview page already surfaces 30-day API spend and per-chapter cost data.
      </section>
    </div>
  );
}
