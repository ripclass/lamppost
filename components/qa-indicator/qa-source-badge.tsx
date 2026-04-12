'use client';

import { Database, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/hooks/use-i18n';

/**
 * Shows students where their answer came from:
 * - Q&A Bank (green, instant, free)
 * - AI / Fallback LLM (blue, generated live)
 *
 * This transparency builds trust and helps students understand
 * the system's capabilities.
 */
export function QASourceBadge({
  source,
  confidence,
  className,
}: {
  source: 'qa_bank' | 'fallback_llm';
  confidence?: number;
  className?: string;
}) {
  const { t } = useI18n();

  const isBank = source === 'qa_bank';

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
        isBank
          ? 'bg-green-500/10 text-green-700 dark:text-green-400'
          : 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
        className,
      )}
      title={
        confidence != null
          ? t('qaSource.confidence', { score: (confidence * 100).toFixed(0) + '%' })
          : undefined
      }
    >
      {isBank ? (
        <>
          <Database className="size-3" />
          {t('qaSource.fromBank')}
        </>
      ) : (
        <>
          <Sparkles className="size-3" />
          {t('qaSource.fromAI')}
        </>
      )}
    </div>
  );
}
