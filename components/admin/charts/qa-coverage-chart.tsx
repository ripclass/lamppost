'use client';

import { cn } from '@/lib/utils';

interface QACoverageData {
  totalEntries: number;
  byDifficulty: Record<string, number>;
  byType: Record<string, number>;
  bySource: Record<string, number>;
}

export function QACoverageChart({ data }: { data: QACoverageData | null }) {
  if (!data) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        Select a chapter to view Q&A coverage
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-3xl font-bold">{data.totalEntries}</div>
        <div className="text-sm text-muted-foreground">Total Q&A entries</div>
      </div>

      <BarBreakdown title="By Difficulty" data={data.byDifficulty} colors={difficultyColors} />
      <BarBreakdown title="By Type" data={data.byType} colors={typeColors} />
      <BarBreakdown title="By Source" data={data.bySource} colors={sourceColors} />
    </div>
  );
}

function BarBreakdown({
  title,
  data,
  colors,
}: {
  title: string;
  data: Record<string, number>;
  colors: Record<string, string>;
}) {
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  return (
    <div>
      <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">{title}</h4>
      <div className="flex h-3 rounded-full overflow-hidden bg-muted">
        {Object.entries(data).map(([key, value]) => (
          <div
            key={key}
            className={cn('h-full transition-all', colors[key] ?? 'bg-primary/50')}
            style={{ width: `${(value / total) * 100}%` }}
            title={`${key}: ${value}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-3 mt-2">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="flex items-center gap-1.5 text-xs">
            <div className={cn('size-2 rounded-full', colors[key] ?? 'bg-primary/50')} />
            <span className="text-muted-foreground">
              {key}: {value} ({((value / total) * 100).toFixed(0)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const difficultyColors: Record<string, string> = {
  easy: 'bg-green-500',
  medium: 'bg-amber-500',
  hard: 'bg-red-500',
};

const typeColors: Record<string, string> = {
  definitional: 'bg-blue-400',
  conceptual: 'bg-blue-600',
  procedural: 'bg-purple-500',
  misconception: 'bg-red-400',
  application: 'bg-green-500',
  edge_case: 'bg-orange-500',
  comparison: 'bg-cyan-500',
  visual: 'bg-pink-500',
};

const sourceColors: Record<string, string> = {
  opus_generated: 'bg-primary',
  student_derived: 'bg-amber-500',
  teacher_added: 'bg-green-500',
};
