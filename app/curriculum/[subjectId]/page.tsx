'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useI18n } from '@/lib/hooks/use-i18n';
import { ChapterCard } from '@/components/curriculum-browser/chapter-card';

interface Chapter {
  id: string;
  chapterNumber: number;
  title: string;
  titleBn?: string;
  generationStatus: 'pending' | 'generating' | 'complete' | 'failed';
}

export default function SubjectChaptersPage() {
  const params = useParams();
  const subjectId = params.subjectId as string;
  const { t } = useI18n();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/curriculum/chapters?subjectId=${subjectId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setChapters(data.chapters ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [subjectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/curriculum"
            className="flex items-center justify-center size-8 rounded-md hover:bg-muted transition-colors"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{t('curriculum.chapters')}</h1>
          </div>
        </div>

        {chapters.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {t('curriculum.noChapters')}
          </div>
        ) : (
          <div className="space-y-2">
            {chapters.map((chapter) => (
              <ChapterCard
                key={chapter.id}
                chapter={chapter}
                subjectId={subjectId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
