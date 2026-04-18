import Link from 'next/link';

/**
 * Marketing layout — public pages (landing, pricing, about).
 * Minimal chrome: thin top bar with logo and two CTAs.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="w-full border-b border-border/40">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo-horizontal.svg" alt="Lamppost" className="h-8" />
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/pricing" className="text-muted-foreground hover:text-foreground">
              Pricing
            </Link>
            <Link href="/about" className="text-muted-foreground hover:text-foreground">
              About
            </Link>
            <Link
              href="/signup"
              className="rounded-md border border-border px-3 py-1.5 text-foreground hover:bg-muted"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border/40 py-6 text-center text-xs text-muted-foreground/60">
        Lamppost — লেম্পোস্ট · Built on the OpenMAIC open-source project
      </footer>
    </div>
  );
}
