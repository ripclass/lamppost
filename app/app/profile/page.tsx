import { requireSession } from '@/lib/auth/server';
import { getServiceClient } from '@/lib/db/supabase';
import { ParentLinkForm, type LinkedParent } from './parent-link-form';

export default async function ProfilePage() {
  const session = await requireSession();
  const linked = await getLinkedParents(session.id);

  return (
    <section className="mx-auto max-w-2xl px-4 md:px-8 py-8 md:py-12 space-y-10">
      <div>
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
      </div>

      <div>
        <h2 className="text-base font-medium">Parent updates</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Add a parent or guardian&apos;s email. Every Sunday we&apos;ll send them a
          short summary of what you studied — questions asked, chapters touched,
          study streak. They can unsubscribe any time from the email itself.
        </p>
        <div className="mt-5">
          <ParentLinkForm linked={linked} />
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground/70">
        Editable profile (exam date, daily goal, language, notifications, logout)
        ships in a later step.
      </div>
    </section>
  );
}

async function getLinkedParents(studentId: string): Promise<LinkedParent[]> {
  const supabase = getServiceClient();
  const { data: links } = await supabase
    .from('parent_student_links')
    .select('parent_id, parents!inner(id, unsubscribed_at, users!inner(email))')
    .eq('student_id', studentId);

  if (!links) return [];

  const out: LinkedParent[] = [];
  for (const row of links) {
    const parent = row.parents as unknown as {
      id: string;
      unsubscribed_at: string | null;
      users: { email: string | null };
    } | null;
    if (!parent?.users?.email) continue;
    out.push({
      parentId: parent.id,
      email: parent.users.email,
      unsubscribed: parent.unsubscribed_at !== null,
    });
  }
  return out;
}
