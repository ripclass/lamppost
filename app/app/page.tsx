import { requireSession } from '@/lib/auth/server';

export default async function StudentLobby() {
  const session = await requireSession();
  const name = session.displayName ?? 'there';

  return (
    <section className="mx-auto max-w-3xl px-4 md:px-8 py-8 md:py-12">
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
        Good to see you, {name}.
      </h1>
      <p className="mt-2 text-muted-foreground">Continue where you left off.</p>

      <div className="mt-8 rounded-2xl border border-dashed border-border p-8 text-center">
        <p className="text-sm text-muted-foreground/70">
          Lobby with "Continue" hero, weekly plan strip, and recent activity ships in
          Phase A Step 4.
        </p>
      </div>
    </section>
  );
}
