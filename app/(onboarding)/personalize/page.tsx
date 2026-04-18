// Phase A Step 5 collects: study goal, daily minutes, exam date.
// Each question skippable; writes to students extension + study_plans.

export default function PersonalizePage() {
  return (
    <section className="mx-auto max-w-md px-4 pt-24 pb-16">
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-center">
        Three quick questions
      </h1>
      <p className="mt-3 text-center text-sm text-muted-foreground">
        Goal, study time, exam date. Each step is skippable.
      </p>
      <div className="mt-10 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground/70">
        Personalization form wires up in Phase A Step 5.
      </div>
    </section>
  );
}
