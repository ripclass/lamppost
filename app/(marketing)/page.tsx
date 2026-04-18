import Link from 'next/link';

export default function MarketingLanding() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-24 text-center">
      <img src="/logo-horizontal.svg" alt="Lamppost" className="mx-auto h-16 mb-6" />
      <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-foreground">
        An AI classroom that teaches like a Bangladeshi tutor.
      </h1>
      <p className="mt-5 text-base md:text-lg text-muted-foreground">
        Complete SSC, HSC, O-Level and A-Level lessons. Raise your hand any time —
        answers come straight from the chapter, in English or বাংলা.
      </p>
      <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          href="/try"
          className="rounded-lg bg-primary px-6 py-3 text-primary-foreground font-medium shadow-sm hover:opacity-90"
        >
          Try a free lesson
        </Link>
        <Link
          href="/signup"
          className="rounded-lg border border-border px-6 py-3 text-foreground hover:bg-muted"
        >
          I already have an account
        </Link>
      </div>
    </section>
  );
}
