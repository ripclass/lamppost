'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layers, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/hooks/use-i18n';

interface Subject {
  id: string;
  name: string;
  nameBn?: string;
  code?: string;
  grade?: string;
  totalChapters?: number;
}

export function SubjectList({ curriculumId }: { curriculumId: string }) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { t, locale } = useI18n();

  useEffect(() => {
    fetch(`/api/curriculum/subjects?curriculumId=${curriculumId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setSubjects(data.subjects ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [curriculumId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  if (subjects.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {t('curriculum.noSubjects')}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {subjects.map((subject) => (
        <button
          key={subject.id}
          onClick={() => router.push(`/curriculum/${subject.id}`)}
          className={cn(
            'flex items-center justify-between w-full rounded-lg border bg-card p-4',
            'hover:bg-accent transition-colors text-left cursor-pointer',
          )}
        >
          <div className="flex items-center gap-3">
            <Layers className="size-5 text-primary shrink-0" />
            <div>
              <h4 className="font-medium">
                {locale === 'bn-BD' && subject.nameBn ? subject.nameBn : subject.name}
              </h4>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {subject.code && <span>{subject.code}</span>}
                {subject.grade && <span>· {subject.grade}</span>}
                {subject.totalChapters != null && (
                  <span>· {subject.totalChapters} {t('curriculum.chapters')}</span>
                )}
              </div>
            </div>
          </div>
          <ArrowRight className="size-4 text-muted-foreground" />
        </button>
      ))}
    </div>
  );
}
