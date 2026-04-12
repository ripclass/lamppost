'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/hooks/use-i18n';

interface Curriculum {
  id: string;
  name: string;
  board?: string;
  language: string;
  country: string;
}

export function CurriculumGrid() {
  const [curricula, setCurricula] = useState<Curriculum[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { t } = useI18n();

  useEffect(() => {
    fetch('/api/curriculum/subjects')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setCurricula(data.curricula ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  if (curricula.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <BookOpen className="size-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">{t('curriculum.noSubjects')}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {curricula.map((curriculum) => (
        <button
          key={curriculum.id}
          onClick={() => router.push(`/curriculum?curriculumId=${curriculum.id}`)}
          className={cn(
            'flex flex-col items-start gap-2 rounded-xl border bg-card p-5',
            'hover:bg-accent hover:border-accent-foreground/20 transition-colors',
            'text-left cursor-pointer',
          )}
        >
          <div className="flex items-center gap-2">
            <BookOpen className="size-5 text-primary" />
            <h3 className="font-semibold text-base">{curriculum.name}</h3>
          </div>
          {curriculum.board && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {curriculum.board}
            </span>
          )}
          <p className="text-sm text-muted-foreground">
            {curriculum.language === 'bn' ? 'বাংলা' : 'English'} · {curriculum.country}
          </p>
        </button>
      ))}
    </div>
  );
}
