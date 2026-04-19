import Link from 'next/link';
import { ArrowRight, Search } from 'lucide-react';
import { searchUsers, type UserSearchRow } from '@/lib/db/queries/admin/users';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = '' } = await searchParams;
  const users = await searchUsers(q);

  return (
    <div className="p-6 md:p-8 max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Search by name, email, phone, or exact UUID.
        </p>
      </header>

      <form method="get" className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search users…"
            className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90"
        >
          Search
        </button>
      </form>

      <UsersTable users={users} q={q} />
    </div>
  );
}

function UsersTable({
  users,
  q,
}: {
  readonly users: readonly UserSearchRow[];
  readonly q: string;
}) {
  if (users.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-sm text-muted-foreground/70 text-center">
        {q ? `No users match "${q}".` : 'No users yet.'}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card/40 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs text-muted-foreground">
          <tr>
            <th className="text-left font-medium px-4 py-2">Name</th>
            <th className="text-left font-medium px-4 py-2">Contact</th>
            <th className="text-left font-medium px-4 py-2">Role</th>
            <th className="text-left font-medium px-4 py-2">Signed up</th>
            <th className="text-right font-medium px-4 py-2">Interactions</th>
            <th className="text-left font-medium px-4 py-2">Last seen</th>
            <th></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/30">
          {users.map((u) => (
            <tr key={u.id} className="hover:bg-muted/30">
              <td className="px-4 py-2.5">
                <div className="font-medium">{u.displayName ?? '—'}</div>
                <div className="text-[10px] text-muted-foreground/70 font-mono">
                  {u.id.slice(0, 8)}…
                </div>
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">
                {u.email ?? u.phone ?? '—'}
              </td>
              <td className="px-4 py-2.5">
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">{u.role}</span>
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">
                {new Date(u.createdAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-2.5 text-right">{u.totalInteractions}</td>
              <td className="px-4 py-2.5 text-muted-foreground">
                {u.lastInteractionAt
                  ? new Date(u.lastInteractionAt).toLocaleDateString()
                  : '—'}
              </td>
              <td className="px-4 py-2.5 text-right">
                <Link
                  href={`/admin/users/${u.id}`}
                  className="text-primary hover:underline inline-flex items-center gap-0.5"
                >
                  View <ArrowRight className="size-3" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
