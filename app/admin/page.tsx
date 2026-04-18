/**
 * Admin Overview — alerts-first layout per Phase A Step 6 spec.
 * Step 2 is a skeleton; Step 6 wires real data (alerts, trend strip,
 * quick actions) and absorbs the logic from the old /admin/analytics page.
 */
export default function AdminOverviewPage() {
  return (
    <div className="p-6 md:p-8 max-w-6xl">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Alerts first. Then trends. Then quick actions.
        </p>
      </header>

      <section className="rounded-xl border border-dashed border-border p-8 text-sm text-muted-foreground/70">
        <div className="font-medium text-foreground mb-1">Coming in Phase A Step 6</div>
        Active-alerts strip (failed payments, low match-rate chapters, stuck batches,
        open tickets, system errors), six-metric trend strip (MRR, DAU, WAU, API spend,
        Q&amp;A match rate, churn), and quick-actions row.
      </section>
    </div>
  );
}
