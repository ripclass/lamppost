import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  BookOpen,
  RefreshCw,
  Coins,
  Activity,
  Bell,
  UserCog,
} from 'lucide-react';
import { requireSession } from '@/lib/auth/server';
import {
  canAccessAdminSection,
  isAdminRole,
  type AdminSection,
} from '@/lib/auth/roles';

type SectionNav = { href: string; section: AdminSection; label: string; icon: typeof LayoutDashboard };

const NAV: readonly SectionNav[] = [
  { href: '/admin', section: 'overview', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/users', section: 'users', label: 'Users', icon: Users },
  { href: '/admin/billing', section: 'billing', label: 'Billing', icon: CreditCard },
  { href: '/admin/content', section: 'content', label: 'Content', icon: BookOpen },
  { href: '/admin/flywheel', section: 'flywheel', label: 'Flywheel', icon: RefreshCw },
  { href: '/admin/costs', section: 'costs', label: 'Costs', icon: Coins },
  { href: '/admin/system', section: 'system', label: 'System', icon: Activity },
  { href: '/admin/notifications', section: 'notifications', label: 'Notifications', icon: Bell },
  { href: '/admin/team', section: 'team', label: 'Team', icon: UserCog },
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  if (!isAdminRole(session.role)) redirect('/app');

  const allowed = NAV.filter((item) => canAccessAdminSection(session.role, item.section));

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-60 shrink-0 border-r border-border/60 bg-card/30 flex flex-col">
        <div className="px-5 py-5 border-b border-border/40">
          <Link href="/admin" className="flex items-center gap-2">
            <img src="/logo-horizontal.svg" alt="Lamppost" className="h-6" />
            <span className="text-xs tracking-wide text-muted-foreground uppercase">
              Admin
            </span>
          </Link>
        </div>
        <nav className="flex-1 p-2 flex flex-col gap-0.5">
          {allowed.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-border/40 text-xs text-muted-foreground">
          <div className="font-medium text-foreground">
            {session.displayName ?? session.email ?? session.phone ?? 'admin'}
          </div>
          <div className="opacity-70">{session.role}</div>
        </div>
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
