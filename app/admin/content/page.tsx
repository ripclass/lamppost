import Link from 'next/link';
import { ChevronRight, FileText, Flag } from 'lucide-react';
import { getContentTree, type ChapterNode } from '@/lib/db/queries/admin/content';

export const dynamic = 'force-dynamic';

export default async function AdminContentPage() {
  const tree = await getContentTree();

  return (
    <div className="p-6 md:p-8 max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Content</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Curricula → subjects → chapters. Click a chapter to view its three-panel
          detail.
        </p>
      </header>

      {tree.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-8 text-sm text-muted-foreground/70">
          No content yet. Run <code>pnpm tsx scripts/seed-sample-chapter.ts</code> to
          bootstrap the sample chapter.
        </div>
      )}

      <div className="space-y-6">
        {tree.map((curriculum) => (
          <section key={curriculum.id} className="space-y-3">
            <div className="flex items-baseline gap-2">
              <h2 className="text-base font-medium">{curriculum.name}</h2>
              {curriculum.board && (
                <span className="text-xs text-muted-foreground">· {curriculum.board}</span>
              )}
              <span className="text-xs text-muted-foreground/60">· {curriculum.language}</span>
            </div>
            {curriculum.subjects.length === 0 && (
              <p className="text-xs text-muted-foreground/70 italic">
                No subjects under this curriculum.
              </p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {curriculum.subjects.map((subject) => (
                <div
                  key={subject.id}
                  className="rounded-xl border border-border/60 bg-card/40"
                >
                  <div className="border-b border-border/40 px-4 py-2.5">
                    <div className="text-sm font-medium">{subject.name}</div>
                    {(subject.nameBn || subject.grade) && (
                      <div className="text-xs text-muted-foreground">
                        {[subject.grade, subject.nameBn].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </div>
                  <ul className="divide-y divide-border/30">
                    {subject.chapters.length === 0 && (
                      <li className="px-4 py-3 text-xs text-muted-foreground/70 italic">
                        No chapters
                      </li>
                    )}
                    {subject.chapters.map((chapter) => (
                      <ChapterRow key={chapter.id} chapter={chapter} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function ChapterRow({ chapter }: { readonly chapter: ChapterNode }) {
  return (
    <li>
      <Link
        href={`/admin/content/${chapter.id}`}
        className="group flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors"
      >
        <div className="shrink-0 text-xs text-muted-foreground w-8 text-right">
          {chapter.chapterNumber}.
        </div>
        <FileText className="size-3.5 shrink-0 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <div className="text-sm truncate">{chapter.title}</div>
          <div className="flex items-center gap-2 mt-0.5">
            <StatusBadge status={chapter.generationStatus} />
            <span className="text-[10px] text-muted-foreground">
              {chapter.qaEntryCount} Q&A
            </span>
            {chapter.needsRegeneration && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600">
                <Flag className="size-2.5" />
                Flagged
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="size-4 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
      </Link>
    </li>
  );
}

function StatusBadge({ status }: { readonly status: string }) {
  const palette: Record<string, string> = {
    pending: 'bg-muted text-muted-foreground',
    generating: 'bg-amber-500/10 text-amber-700',
    complete: 'bg-emerald-500/10 text-emerald-700',
    failed: 'bg-red-500/10 text-red-700',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
        palette[status] ?? palette.pending
      }`}
    >
      {status}
    </span>
  );
}
