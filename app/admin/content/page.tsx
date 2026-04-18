export default function AdminContentPage() {
  return (
    <div className="p-6 md:p-8 max-w-6xl">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Content — Curriculum Studio</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Curricula → Subjects → Chapters tree with status badges. Three-panel editor
          per chapter at <code>/admin/content/[chapterId]</code>.
        </p>
      </header>
      <section className="rounded-xl border border-dashed border-border p-8 text-sm text-muted-foreground/70">
        Tree/queue/status views and three-panel chapter editor ship in Phase A Step 6.
      </section>
    </div>
  );
}
