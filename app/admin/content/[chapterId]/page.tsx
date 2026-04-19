import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Flag } from 'lucide-react';
import {
  getChapterDetail,
  getChapterQaEntries,
} from '@/lib/db/queries/admin/content';
import { getChapterQAStats } from '@/lib/db/queries/qa-bank';
import { getInteractionStats } from '@/lib/db/queries/interactions';
import { QACoverageChart } from '@/components/admin/charts/qa-coverage-chart';
import { CostTracker } from '@/components/admin/charts/cost-tracker';
import { Button } from '@/components/ui/button';
import { toggleChapterNeedsRegenerationAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function AdminChapterDetailPage({
  params,
}: {
  params: Promise<{ chapterId: string }>;
}) {
  const { chapterId } = await params;

  const [detail, qaEntries, qaStats, interactionStats] = await Promise.all([
    getChapterDetail(chapterId),
    getChapterQaEntries(chapterId, 100),
    getChapterQAStats(chapterId).catch(() => null),
    getInteractionStats(chapterId).catch(() => null),
  ]);

  if (!detail) notFound();

  return (
    <div className="p-6 md:p-8 max-w-7xl space-y-6">
      <Link
        href="/admin/content"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Content
      </Link>

      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {detail.curriculumName} · {detail.subjectName}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {detail.chapterNumber}. {detail.title}
          </h1>
          {detail.titleBn && (
            <p className="text-sm text-muted-foreground mt-0.5">{detail.titleBn}</p>
          )}
        </div>
        <FlagButton
          chapterId={detail.id}
          currentlyFlagged={detail.needsRegeneration}
        />
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_360px] gap-6">
        <MetadataPanel detail={detail} />
        <ChartsPanel qaStats={qaStats} interactionStats={interactionStats} />
        <QaEntriesPanel entries={qaEntries} />
      </div>
    </div>
  );
}

function MetadataPanel({
  detail,
}: {
  readonly detail: Awaited<ReturnType<typeof getChapterDetail>>;
}) {
  if (!detail) return null;
  const rows: Array<[string, string]> = [
    ['Status', detail.generationStatus],
    ['Scene count', String(detail.sceneCount)],
    ['Model', detail.generationModel ?? '—'],
    [
      'Generation cost',
      detail.generationCostUsd !== null ? `$${detail.generationCostUsd.toFixed(4)}` : '—',
    ],
    ['Needs regen', detail.needsRegeneration ? 'Flagged' : 'No'],
    ['Created', new Date(detail.createdAt).toLocaleDateString()],
    ['Updated', new Date(detail.updatedAt).toLocaleDateString()],
  ];
  return (
    <aside className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-card/40 p-4">
        <h2 className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
          Metadata
        </h2>
        <dl className="space-y-2 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="text-right font-medium truncate">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
      {detail.description && (
        <div className="rounded-xl border border-border/60 bg-card/40 p-4">
          <h2 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
            Description
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {detail.description}
          </p>
        </div>
      )}
    </aside>
  );
}

function ChartsPanel({
  qaStats,
  interactionStats,
}: {
  readonly qaStats: Awaited<ReturnType<typeof getChapterQAStats>> | null;
  readonly interactionStats: Awaited<ReturnType<typeof getInteractionStats>> | null;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border/60 bg-card/40 p-5">
        <h2 className="text-sm font-semibold mb-3">Q&A Bank Coverage</h2>
        <QACoverageChart data={qaStats} />
      </div>
      <div className="rounded-xl border border-border/60 bg-card/40 p-5">
        <h2 className="text-sm font-semibold mb-3">Interactions &amp; Cost</h2>
        <CostTracker data={interactionStats} />
      </div>
    </div>
  );
}

function QaEntriesPanel({
  entries,
}: {
  readonly entries: Awaited<ReturnType<typeof getChapterQaEntries>>;
}) {
  return (
    <aside className="rounded-xl border border-border/60 bg-card/40 flex flex-col min-h-[400px]">
      <div className="px-4 py-3 border-b border-border/40">
        <h2 className="text-xs uppercase tracking-wide text-muted-foreground">
          Q&A bank
        </h2>
        <p className="text-sm mt-0.5">{entries.length} entries (top by match count)</p>
      </div>
      <ol className="flex-1 overflow-y-auto divide-y divide-border/30">
        {entries.length === 0 && (
          <li className="px-4 py-6 text-xs text-muted-foreground/70 text-center italic">
            No Q&A entries yet.
          </li>
        )}
        {entries.map((entry) => (
          <li key={entry.id} className="px-4 py-3 space-y-1">
            <div className="text-sm font-medium truncate">{entry.question}</div>
            <div className="text-xs text-muted-foreground line-clamp-2">
              {entry.answer}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground/80">
              <span className="uppercase">{entry.difficulty}</span>
              <span>·</span>
              <span>{entry.questionType}</span>
              {entry.timesMatched > 0 && (
                <>
                  <span>·</span>
                  <span>{entry.timesMatched} matches</span>
                </>
              )}
              {entry.hasWhiteboard && (
                <>
                  <span>·</span>
                  <span>whiteboard</span>
                </>
              )}
            </div>
          </li>
        ))}
      </ol>
    </aside>
  );
}

function FlagButton({
  chapterId,
  currentlyFlagged,
}: {
  readonly chapterId: string;
  readonly currentlyFlagged: boolean;
}) {
  return (
    <form
      action={async () => {
        'use server';
        await toggleChapterNeedsRegenerationAction(chapterId, !currentlyFlagged);
      }}
    >
      <Button
        type="submit"
        variant={currentlyFlagged ? 'secondary' : 'outline'}
        size="sm"
        className="gap-1.5"
      >
        <Flag className="size-3.5" />
        {currentlyFlagged ? 'Clear regen flag' : 'Flag for regeneration'}
      </Button>
    </form>
  );
}
