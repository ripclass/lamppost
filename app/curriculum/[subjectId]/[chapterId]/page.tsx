'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Play, BookOpen, Database } from 'lucide-react';
import Link from 'next/link';
import { useI18n } from '@/lib/hooks/use-i18n';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ChapterDetail {
  id: string;
  chapterNumber: number;
  title: string;
  titleBn?: string;
  description?: string;
  generationStatus: string;
}

interface QAStats {
  qaBank: {
    totalEntries: number;
    byDifficulty: Record<string, number>;
    byType: Record<string, number>;
  };
  interactions: {
    totalInteractions: number;
    qaBankHitRate: number;
  };
}

export default function ChapterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t, locale } = useI18n();
  const subjectId = params.subjectId as string;
  const chapterId = params.chapterId as string;

  const [chapter, setChapter] = useState<ChapterDetail | null>(null);
  const [stats, setStats] = useState<QAStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/curriculum/chapters?chapterId=${chapterId}`).then((r) => r.json()),
      fetch(`/api/qa-bank/stats?chapterId=${chapterId}`).then((r) => r.json()),
    ])
      .then(([chapterData, statsData]) => {
        if (chapterData.success) setChapter(chapterData.chapter);
        if (statsData.success) {
          setStats({ qaBank: statsData.qaBank, interactions: statsData.interactions });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [chapterId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  if (!chapter) return null;

  const title =
    locale === 'bn-BD' && chapter.titleBn ? chapter.titleBn : chapter.title;
  const isReady = chapter.generationStatus === 'complete';

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link
          href={`/curriculum/${subjectId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="size-4" />
          {t('curriculum.chapters')}
        </Link>

        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <BookOpen className="size-4" />
              {t('curriculum.chapters')} {chapter.chapterNumber}
            </div>
            <h1 className="text-2xl font-bold leading-relaxed">{title}</h1>
            {chapter.description && (
              <p className="mt-2 text-muted-foreground leading-relaxed">
                {chapter.description}
              </p>
            )}
          </div>

          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <StatCard
                label={t('curriculum.qaBank')}
                value={String(stats.qaBank.totalEntries)}
                icon={<Database className="size-4" />}
              />
              <StatCard
                label={t('admin.hitRate')}
                value={`${(stats.interactions.qaBankHitRate * 100).toFixed(0)}%`}
              />
              <StatCard
                label={t('admin.interactionStats')}
                value={String(stats.interactions.totalInteractions)}
              />
            </div>
          )}

          <Button
            size="lg"
            disabled={!isReady}
            onClick={() => router.push(`/classroom/${chapterId}`)}
            className="w-full gap-2"
          >
            <Play className="size-4" />
            {t('curriculum.enterClassroom')}
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        {icon}
        {label}
      </div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
