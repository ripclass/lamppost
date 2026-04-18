export default function AboutPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-24">
      <h1 className="text-3xl font-semibold tracking-tight mb-6">About Lamppost</h1>
      <div className="prose prose-slate max-w-none text-muted-foreground space-y-4">
        <p>
          Lamppost is an interactive AI classroom for Bangladeshi and global English-medium
          students. Every subject, every chapter, a complete lesson — and a teacher who
          answers your questions the moment you raise your hand.
        </p>
        <p>
          The project is a fork of{' '}
          <a href="https://github.com/THU-MAIC/OpenMAIC" className="text-primary underline">
            OpenMAIC
          </a>{' '}
          (Tsinghua University), licensed under AGPL-3.0 and extended for NCTB, Cambridge,
          and Pearson Edexcel curricula with a pre-computed Q&amp;A bank and Bangla
          pedagogy.
        </p>
      </div>
    </section>
  );
}
