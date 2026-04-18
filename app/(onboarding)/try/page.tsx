// Step 1 of onboarding — curriculum picker.
// Real UI lands in Phase A Step 5.

type CurriculumChoice = {
  id: string;
  label: string;
  sub: string;
  subBn?: string;
};

const CURRICULA: CurriculumChoice[] = [
  { id: 'ssc', label: 'SSC', sub: 'Bangladesh, Class 9–10', subBn: 'এসএসসি' },
  { id: 'hsc', label: 'HSC', sub: 'Bangladesh, Class 11–12', subBn: 'এইচএসসি' },
  { id: 'cambridge_olevel', label: 'Cambridge O-Level', sub: 'Years 9–10 • CAIE' },
  { id: 'cambridge_alevel', label: 'Cambridge A-Level', sub: 'Years 11–12 • CAIE' },
];

export default function CurriculumPickerPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 pt-24 pb-16">
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-center">
        Which curriculum are you studying?
      </h1>
      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {CURRICULA.map((c) => (
          <a
            key={c.id}
            href={`/try/${c.id}`}
            className="rounded-xl border border-border bg-card p-6 hover:border-primary transition-colors"
          >
            <div className="text-lg font-semibold">{c.label}</div>
            <div className="text-sm text-muted-foreground mt-1">{c.sub}</div>
            {c.subBn && (
              <div className="text-xs text-muted-foreground/70 mt-0.5">{c.subBn}</div>
            )}
          </a>
        ))}
      </div>
    </section>
  );
}
