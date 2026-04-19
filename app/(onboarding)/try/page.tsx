import { CURRICULA } from './curricula';
import { pickCurriculumAction } from './actions';

export default function CurriculumPickerPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 pt-24 pb-16">
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-center">
        Which curriculum are you studying?
      </h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        Pick one to preview a sample lesson. No account needed yet.
      </p>
      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {CURRICULA.map((c) => (
          <form
            key={c.id}
            action={async () => {
              'use server';
              await pickCurriculumAction(c.id);
            }}
          >
            <button
              type="submit"
              className="w-full text-left rounded-xl border border-border bg-card p-6 hover:border-primary transition-colors focus:outline-none focus:ring-2 focus:ring-ring/40"
            >
              <div className="text-lg font-semibold">{c.label}</div>
              <div className="text-sm text-muted-foreground mt-1">{c.sub}</div>
              {c.subBn && (
                <div className="text-xs text-muted-foreground/70 mt-0.5">{c.subBn}</div>
              )}
            </button>
          </form>
        ))}
      </div>
    </section>
  );
}
