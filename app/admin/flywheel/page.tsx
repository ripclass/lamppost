'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { FlywheelDashboard } from '@/components/admin/flywheel-dashboard';

export default function FlywheelPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="size-4" />
          Admin
        </Link>

        <h1 className="text-2xl font-bold mb-2">Flywheel</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Process unmatched student questions into new Q&A bank entries via Opus.
          The flywheel makes the Q&A bank smarter with every student interaction.
        </p>

        <div className="rounded-xl border bg-card p-6">
          <FlywheelDashboard />
        </div>
      </div>
    </div>
  );
}
