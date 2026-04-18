import { requireSession } from '@/lib/auth/server';

export default async function ProfilePage() {
  const session = await requireSession();
  return (
    <section className="mx-auto max-w-2xl px-4 md:px-8 py-8 md:py-12">
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Profile</h1>
      <dl className="mt-6 grid grid-cols-[120px_1fr] gap-y-3 text-sm">
        <dt className="text-muted-foreground">Name</dt>
        <dd>{session.displayName ?? '—'}</dd>
        <dt className="text-muted-foreground">Phone</dt>
        <dd>{session.phone ?? '—'}</dd>
        <dt className="text-muted-foreground">Email</dt>
        <dd>{session.email ?? '—'}</dd>
        <dt className="text-muted-foreground">Role</dt>
        <dd>{session.role}</dd>
      </dl>
      <div className="mt-10 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground/70">
        Editable profile (exam date, daily goal, language, parent link, notifications,
        logout) ships in Phase A Step 4.
      </div>
    </section>
  );
}
