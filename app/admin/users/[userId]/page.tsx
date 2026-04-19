import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import {
  getUserDetail,
  getUserRecentInteractions,
  type UserInteractionRow,
} from '@/lib/db/queries/admin/users';

export const dynamic = 'force-dynamic';

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const [user, interactions] = await Promise.all([
    getUserDetail(userId),
    getUserRecentInteractions(userId, 50),
  ]);
  if (!user) notFound();

  return (
    <div className="p-6 md:p-8 max-w-5xl space-y-6">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Users
      </Link>

      <header>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{user.role}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {user.displayName ?? '— no name —'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {user.email ?? user.phone ?? 'no contact'}{' '}
          <span className="text-muted-foreground/60">·</span>{' '}
          <span className="font-mono text-xs">{user.id}</span>
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
        <ProfilePanel user={user} />
        <InteractionsTable interactions={interactions} />
      </div>
    </div>
  );
}

function ProfilePanel({ user }: { readonly user: Awaited<ReturnType<typeof getUserDetail>> }) {
  if (!user) return null;
  const rows: Array<[string, string]> = [
    ['Signup', new Date(user.createdAt).toLocaleDateString()],
    ['Language', user.languagePreference ?? '—'],
    ['Theme', user.themePreference ?? '—'],
    ['Goal', humanGoal(user.studyGoal)],
    ['Daily minutes', user.dailyMinutesCommitment ? String(user.dailyMinutesCommitment) : '—'],
    ['Target exam', user.targetExamDate ?? '—'],
  ];
  return (
    <aside className="rounded-xl border border-border/60 bg-card/40 p-4">
      <h2 className="text-xs uppercase tracking-wide text-muted-foreground mb-3">Profile</h2>
      <dl className="space-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="text-right font-medium truncate">{value}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}

function InteractionsTable({
  interactions,
}: {
  readonly interactions: readonly UserInteractionRow[];
}) {
  return (
    <section className="rounded-xl border border-border/60 bg-card/40 overflow-hidden">
      <div className="px-4 py-3 border-b border-border/40">
        <h2 className="text-sm font-medium">Recent interactions</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Last {interactions.length}. &ldquo;Resolution&rdquo; tells you at a glance whether
          the bank handled the question, the fallback did, or the rate limit blocked it.
        </p>
      </div>
      {interactions.length === 0 ? (
        <div className="px-4 py-10 text-sm text-muted-foreground/70 text-center">
          No interactions yet.
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-xs text-muted-foreground">
            <tr>
              <th className="text-left font-medium px-4 py-2">When</th>
              <th className="text-left font-medium px-4 py-2">Chapter</th>
              <th className="text-left font-medium px-4 py-2">Question</th>
              <th className="text-left font-medium px-4 py-2">Resolution</th>
              <th className="text-right font-medium px-4 py-2">Cost</th>
              <th className="text-right font-medium px-4 py-2">Latency</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {interactions.map((row) => (
              <tr key={row.id} className="hover:bg-muted/30">
                <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(row.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-2 text-xs">
                  {row.chapterId ? (
                    <Link
                      href={`/admin/content/${row.chapterId}`}
                      className="text-primary hover:underline"
                    >
                      {row.chapterTitle ?? row.chapterId.slice(0, 8)}
                    </Link>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-2 text-xs max-w-sm truncate">
                  {row.studentInput ?? '—'}
                </td>
                <td className="px-4 py-2">
                  <ResolutionBadge resolution={row.resolutionType} />
                </td>
                <td className="px-4 py-2 text-right text-xs font-mono">
                  {row.costUsd > 0 ? `$${row.costUsd.toFixed(4)}` : '—'}
                </td>
                <td className="px-4 py-2 text-right text-xs font-mono text-muted-foreground">
                  {row.latencyMs !== null ? `${row.latencyMs}ms` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function ResolutionBadge({ resolution }: { readonly resolution: string }) {
  const palette: Record<string, string> = {
    qa_bank_match: 'bg-emerald-500/10 text-emerald-700',
    fallback_llm: 'bg-amber-500/10 text-amber-700',
    rate_limit_block: 'bg-red-500/10 text-red-700',
    pre_baked_playback: 'bg-blue-500/10 text-blue-700',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
        palette[resolution] ?? 'bg-muted text-muted-foreground'
      }`}
    >
      {resolution.replace(/_/g, ' ')}
    </span>
  );
}

function humanGoal(goal: string | null): string {
  if (!goal) return '—';
  const map: Record<string, string> = {
    ssc_this_year: 'SSC this year',
    ssc_next_year: 'SSC next year',
    curious: 'Curious',
    tutor_assigned: 'Tutor assigned',
  };
  return map[goal] ?? goal;
}
