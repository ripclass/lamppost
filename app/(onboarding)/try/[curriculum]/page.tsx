// Step 2 of onboarding — subject picker for the chosen curriculum.
// Real curriculum-driven subject list lands in Phase A Step 5.

export default async function SubjectPickerPage({
  params,
}: {
  params: Promise<{ curriculum: string }>;
}) {
  const { curriculum } = await params;
  return (
    <section className="mx-auto max-w-3xl px-4 pt-24 pb-16">
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-center">
        Pick a subject to try.
      </h1>
      <p className="mt-3 text-center text-sm text-muted-foreground">
        Curriculum: <span className="font-medium">{curriculum}</span>
      </p>
      <p className="mt-10 text-center text-muted-foreground/70">
        Subject grid ships in Phase A Step 5.
      </p>
    </section>
  );
}
