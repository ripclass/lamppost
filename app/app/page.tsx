import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { requireSession } from '@/lib/auth/server';
import { getServiceClient } from '@/lib/db/supabase';
import { Button } from '@/components/ui/button';

export default async function StudentLobby() {
  const session = await requireSession();
  const name = session.displayName ?? 'there';
  const sampleChapterId = await findSampleChapterId();

  return (
    <section className="mx-auto max-w-3xl px-4 md:px-8 py-8 md:py-12">
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
        Good to see you, {name}.
      </h1>
      <p className="mt-2 text-muted-foreground">Continue where you left off.</p>

      <div className="mt-8 rounded-2xl border border-dashed border-border p-8 text-center">
        <p className="text-sm text-muted-foreground/70">
          Lobby with &ldquo;Continue&rdquo; hero, weekly plan strip, and recent activity
          coming soon.
        </p>
      </div>

      {sampleChapterId && (
        <div className="mt-6 rounded-2xl border border-border/60 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Preview the student experience</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                The anonymous sample classroom — for dev and design review.
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href={`/try/lesson/${sampleChapterId}`}>
                Open sample
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

async function findSampleChapterId(): Promise<string | null> {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from('chapters')
    .select('id')
    .eq('metadata->>sample', 'true')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}
