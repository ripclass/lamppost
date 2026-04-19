interface Props {
  readonly chapterTitle: string;
  readonly badge?: string;
}

export function ChapterHeader({ chapterTitle, badge }: Props) {
  return (
    <header className="border-b border-border/40 pb-6">
      {badge && (
        <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2.5 py-0.5 text-xs text-muted-foreground">
          {badge}
        </div>
      )}
      <h1 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight">
        {chapterTitle}
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Ask anything. Lamppost answers from the bank — or thinks it through live.
      </p>
    </header>
  );
}
