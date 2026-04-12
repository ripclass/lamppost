'use client';

import Link from 'next/link';
import {
  BarChart3,
  RefreshCw,
  Sparkles,
  Database,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const sections = [
  {
    title: 'Flywheel',
    description: 'Unmatched questions & Opus batch processing',
    href: '/admin/flywheel',
    icon: RefreshCw,
  },
  {
    title: 'Analytics',
    description: 'Student interactions, hit rates, and costs',
    href: '/admin/analytics',
    icon: BarChart3,
  },
  {
    title: 'Generate',
    description: 'Trigger lesson & Q&A bank generation',
    href: '/admin/generate',
    icon: Sparkles,
  },
];

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Database className="size-5 text-primary" />
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage Q&A bank, monitor the flywheel, and track costs
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {sections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className={cn(
                'flex flex-col gap-3 rounded-xl border bg-card p-5',
                'hover:bg-accent hover:border-accent-foreground/20 transition-colors',
              )}
            >
              <section.icon className="size-6 text-primary" />
              <div>
                <h3 className="font-semibold">{section.title}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {section.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
