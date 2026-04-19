'use client';

import { DollarSign, Zap, Clock } from 'lucide-react';

interface CostData {
  totalInteractions: number;
  totalCostUsd: number;
  avgLatencyMs: number;
  qaBankHitRate: number;
  byResolution: Record<string, number>;
}

export function CostTracker({ data }: { data: CostData | null }) {
  if (!data) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        No interaction data yet
      </div>
    );
  }

  const bankHits = data.byResolution['qa_bank_match'] ?? 0;
  const llmHits = data.byResolution['fallback_llm'] ?? 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          icon={<DollarSign className="size-4 text-green-500" />}
          label="Total Cost"
          value={`$${data.totalCostUsd.toFixed(4)}`}
        />
        <MetricCard
          icon={<Zap className="size-4 text-amber-500" />}
          label="Hit Rate"
          value={`${(data.qaBankHitRate * 100).toFixed(1)}%`}
        />
        <MetricCard
          icon={<Clock className="size-4 text-blue-500" />}
          label="Avg Latency"
          value={`${data.avgLatencyMs}ms`}
        />
        <MetricCard
          label="Interactions"
          value={String(data.totalInteractions)}
        />
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground uppercase">
          Resolution breakdown
        </h4>
        <div className="flex items-center gap-2 text-sm">
          <div className="flex-1">
            <div className="flex justify-between mb-1">
              <span className="text-green-600">Q&A Bank (free)</span>
              <span className="font-medium">{bankHits}</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full"
                style={{
                  width: `${data.totalInteractions > 0 ? (bankHits / data.totalInteractions) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="flex-1">
            <div className="flex justify-between mb-1">
              <span className="text-amber-600">Fallback LLM</span>
              <span className="font-medium">{llmHits}</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full"
                style={{
                  width: `${data.totalInteractions > 0 ? (llmHits / data.totalInteractions) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
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
