import Link from 'next/link';
import {
  AlertTriangle,
  Activity,
  Users as UsersIcon,
  Percent,
  DollarSign,
  MessagesSquare,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import {
  getOverviewMetrics,
  getOverviewAlerts,
  getFlywheelHealth,
  type OverviewAlert,
} from '@/lib/db/queries/admin/overview';

export const dynamic = 'force-dynamic';

export default async function AdminOverviewPage() {
  const [metrics, alerts, flywheel] = await Promise.all([
    getOverviewMetrics(),
    getOverviewAlerts(),
    getFlywheelHealth(),
  ]);

  return (
    <div className="p-6 md:p-8 max-w-6xl space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Alerts first, then trends, then the flywheel health signal.
        </p>
      </header>

      <AlertsSection alerts={alerts} />
      <TrendsSection metrics={metrics} />
      <FlywheelSection flywheel={flywheel} />
      <QuickActionsSection />
    </div>
  );
}

function AlertsSection({ alerts }: { readonly alerts: readonly OverviewAlert[] }) {
  if (alerts.length === 0) {
    return (
      <section className="rounded-xl border border-border/60 bg-card/30 p-5 text-sm text-muted-foreground">
        No active alerts. Content ops are quiet.
      </section>
    );
  }
  return (
    <section className="space-y-2">
      <h2 className="text-xs uppercase tracking-wide text-muted-foreground">Alerts</h2>
      <div className="space-y-2">
        {alerts.map((alert) => (
          <div
            key={`${alert.kind}:${alert.chapterId}`}
            className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{kindLabel(alert.kind)}: {alert.chapterTitle}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{alert.detail}</p>
            </div>
            <Link
              href={`/admin/content/${alert.chapterId}`}
              className="text-xs text-primary hover:underline shrink-0"
            >
              View
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

function TrendsSection({ metrics }: { readonly metrics: Awaited<ReturnType<typeof getOverviewMetrics>> }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs uppercase tracking-wide text-muted-foreground">Last 30 days</h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Metric icon={<UsersIcon className="size-4" />} label="DAU" value={String(metrics.dau)} />
        <Metric icon={<UsersIcon className="size-4" />} label="WAU" value={String(metrics.wau)} />
        <Metric
          icon={<Percent className="size-4" />}
          label="Q&A hit rate"
          value={`${(metrics.qaBankHitRate * 100).toFixed(1)}%`}
        />
        <Metric
          icon={<MessagesSquare className="size-4" />}
          label="Interactions"
          value={String(metrics.totalInteractions30d)}
        />
        <SpendMetric metrics={metrics} />
      </div>
    </section>
  );
}

function SpendMetric({ metrics }: { readonly metrics: Awaited<ReturnType<typeof getOverviewMetrics>> }) {
  const max = Math.max(...metrics.apiSpendDailySeries.map((d) => d.spend), 0.0001);
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <DollarSign className="size-4" />
        API spend
      </div>
      <div className="mt-1 text-lg font-semibold">
        ${metrics.apiSpendLast30d.toFixed(2)}
      </div>
      <div className="mt-2 flex items-end gap-[1px] h-6">
        {metrics.apiSpendDailySeries.map((d) => (
          <div
            key={d.date}
            title={`${d.date}: $${d.spend.toFixed(4)}`}
            className="flex-1 bg-primary/40 rounded-sm"
            style={{ height: `${(d.spend / max) * 100}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function FlywheelSection({ flywheel }: { readonly flywheel: Awaited<ReturnType<typeof getFlywheelHealth>> }) {
  return (
    <section className="rounded-xl border border-border/60 bg-card/30 p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground mb-3">
        <RefreshCw className="size-3.5" />
        Flywheel health
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <div className="text-muted-foreground text-xs">Last run</div>
          <div className="font-medium mt-0.5">
            {flywheel.lastRunAt
              ? new Date(flywheel.lastRunAt).toLocaleString()
              : '—'}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Pending</div>
          <div className="font-medium mt-0.5">{flywheel.unmatchedPending}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Processed (24h)</div>
          <div className="font-medium mt-0.5">{flywheel.unmatchedProcessedLast24h}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">New Q&amp;A (24h)</div>
          <div className="font-medium mt-0.5">{flywheel.newQaEntriesLast24h}</div>
        </div>
      </div>
    </section>
  );
}

function QuickActionsSection() {
  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <QuickAction
        href="/admin/content/generate"
        icon={<Activity className="size-4" />}
        title="Batch generate"
        subtitle="Queue Opus generation for pending chapters"
      />
      <QuickAction
        href="/admin/content"
        icon={<MessagesSquare className="size-4" />}
        title="Browse content"
        subtitle="Curricula, subjects, chapters"
      />
      <QuickAction
        href="/admin/users"
        icon={<UsersIcon className="size-4" />}
        title="Look up a user"
        subtitle="Search by name, email, phone, or ID"
      />
    </section>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  title,
  subtitle,
}: {
  readonly href: string;
  readonly icon: React.ReactNode;
  readonly title: string;
  readonly subtitle: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card/40 p-4 hover:border-primary/60 transition-colors"
    >
      <div className="shrink-0 size-8 rounded-lg bg-muted flex items-center justify-center">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>
      </div>
      <ArrowRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
    </Link>
  );
}

function kindLabel(kind: OverviewAlert['kind']): string {
  switch (kind) {
    case 'low_match_rate':
      return 'Low Q&A match rate';
    case 'stuck_generation':
      return 'Stuck generation';
    case 'failed_generation':
      return 'Failed generation';
  }
}
