import Link from 'next/link';
import { Home, BarChart3, Calendar, User } from 'lucide-react';
import { requireSession } from '@/lib/auth/server';

/**
 * Student portal layout. Sidebar on desktop, bottom tab bar on mobile.
 * Auth is already enforced by proxy.ts — this layout also calls
 * `requireSession` to give child Server Components a guaranteed session.
 */
export default async function StudentPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();

  const nav = [
    { href: '/app', icon: Home, label: 'Home' },
    { href: '/app/progress', icon: BarChart3, label: 'Progress' },
    { href: '/app/history', icon: Calendar, label: 'History' },
    { href: '/app/profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:flex w-56 flex-col border-r border-border/40 p-4">
        <Link href="/app" className="mb-8">
          <img src="/logo-horizontal.svg" alt="Lamppost" className="h-7" />
        </Link>
        <nav className="flex flex-col gap-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto text-xs text-muted-foreground/60">
          Signed in as {session.displayName ?? session.phone ?? session.email ?? 'student'}
        </div>
      </aside>

      <main className="flex-1 pb-20 md:pb-0">{children}</main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 border-t border-border/40 bg-background/95 backdrop-blur-md">
        <div className="flex items-center justify-around py-2">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 px-4 py-1 text-muted-foreground hover:text-foreground"
            >
              <item.icon className="size-5" />
              <span className="text-[10px]">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
