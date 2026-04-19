import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { BatchGenerateForm } from './batch-form';

export default function AdminContentGeneratePage() {
  return (
    <div className="p-6 md:p-8 max-w-3xl space-y-6">
      <Link
        href="/admin/content"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Content
      </Link>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Batch generation</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Trigger Opus Q&amp;A generation for a chapter or a subject&apos;s pending
          chapters. Each chapter runs ~$1-5 via the Batch API. Output lands in
          the Q&amp;A bank; progress surfaces on the chapter detail page.
        </p>
      </header>
      <BatchGenerateForm />
    </div>
  );
}
