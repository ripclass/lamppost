'use client';

import { useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useI18n } from '@/lib/hooks/use-i18n';
import { CurriculumGrid } from '@/components/curriculum-browser/curriculum-grid';
import { SubjectList } from '@/components/curriculum-browser/subject-list';

export default function CurriculumPage() {
  const searchParams = useSearchParams();
  const curriculumId = searchParams.get('curriculumId');
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          {curriculumId && (
            <Link
              href="/curriculum"
              className="flex items-center justify-center size-8 rounded-md hover:bg-muted transition-colors"
            >
              <ArrowLeft className="size-4" />
            </Link>
          )}
          <div>
            <h1 className="text-2xl font-bold">{t('curriculum.title')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('curriculum.browse')}
            </p>
          </div>
        </div>

        {curriculumId ? (
          <SubjectList curriculumId={curriculumId} />
        ) : (
          <CurriculumGrid />
        )}
      </div>
    </div>
  );
}
