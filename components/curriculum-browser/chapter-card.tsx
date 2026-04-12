'use client';

import { useRouter } from 'next/navigation';
import { FileText, CheckCircle2, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/hooks/use-i18n';
import { ProgressIndicator } from './progress-indicator';

interface Chapter {
  id: string;
  chapterNumber: number;
  title: string;
  titleBn?: string;
  generationStatus: 'pending' | 'generating' | 'complete' | 'failed';
}

export function ChapterCard({
  chapter,
  subjectId,
}: {
  chapter: Chapter;
  subjectId: string;
}) {
  const router = useRouter();
  const { t, locale } = useI18n();

  const isReady = chapter.generationStatus === 'complete';
  const title =
    locale === 'bn-BD' && chapter.titleBn ? chapter.titleBn : chapter.title;

  return (
    <button
      onClick={() => {
        if (isReady) {
          router.push(`/curriculum/${subjectId}/${chapter.id}`);
        }
      }}
      disabled={!isReady}
      className={cn(
        'flex items-start gap-3 w-full rounded-lg border bg-card p-4 text-left transition-colors',
        isReady && 'hover:bg-accent cursor-pointer',
        !isReady && 'opacity-70 cursor-not-allowed',
      )}
    >
      <div className="flex items-center justify-center size-8 rounded-md bg-primary/10 text-primary font-semibold text-sm shrink-0">
        {chapter.chapterNumber}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium truncate">{title}</h4>
        <ProgressIndicator status={chapter.generationStatus} />
      </div>
      <StatusIcon status={chapter.generationStatus} />
    </button>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'complete':
      return <CheckCircle2 className="size-5 text-green-500 shrink-0" />;
    case 'generating':
      return <Loader2 className="size-5 text-blue-500 animate-spin shrink-0" />;
    case 'failed':
      return <AlertCircle className="size-5 text-destructive shrink-0" />;
    default:
      return <Clock className="size-5 text-muted-foreground shrink-0" />;
  }
}
