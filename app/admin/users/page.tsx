export default function AdminUsersPage() {
  return (
    <div className="p-6 md:p-8 max-w-6xl">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Search-first: name, email, phone, or ID. Saved filters and user detail view.
        </p>
      </header>
      <section className="rounded-xl border border-dashed border-border p-8 text-sm text-muted-foreground/70">
        Search bar, filters, table, and <code>/admin/users/[userId]</code> detail view
        ship in Phase A Step 6.
      </section>
    </div>
  );
}
