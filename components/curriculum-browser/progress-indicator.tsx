'use client';

import { useI18n } from '@/lib/hooks/use-i18n';
import { cn } from '@/lib/utils';

export function ProgressIndicator({
  status,
}: {
  status: 'pending' | 'generating' | 'complete' | 'failed';
}) {
  const { t } = useI18n();

  const statusConfig = {
    pending: { label: t('curriculum.status.pending'), color: 'text-muted-foreground' },
    generating: { label: t('curriculum.status.generating'), color: 'text-blue-500' },
    complete: { label: t('curriculum.status.complete'), color: 'text-green-600' },
    failed: { label: t('curriculum.status.failed'), color: 'text-destructive' },
  };

  const config = statusConfig[status];

  return (
    <span className={cn('text-xs', config.color)}>
      {config.label}
    </span>
  );
}
