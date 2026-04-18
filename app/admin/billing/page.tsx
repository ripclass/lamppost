export default function AdminBillingPage() {
  return (
    <div className="p-6 md:p-8 max-w-6xl">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground mt-1">
          MRR, subscriptions, failed payments, refunds. bKash + Nagad + Stripe.
        </p>
      </header>
      <section className="rounded-xl border border-dashed border-border p-8 text-sm text-muted-foreground/70">
        Full billing pages ship in Phase A.2 (deferred — not blocking Phase A
        milestones).
      </section>
    </div>
  );
}
