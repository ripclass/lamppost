import { providerStatus } from '@/lib/config/server';

export default function AdminSystemPage() {
  const rows: { key: keyof typeof providerStatus; label: string }[] = [
    { key: 'anthropic', label: 'Anthropic (Claude)' },
    { key: 'google', label: 'Google (Gemini)' },
    { key: 'openai', label: 'OpenAI' },
    { key: 'ollama', label: 'Ollama (local)' },
    { key: 'azureTts', label: 'Azure TTS' },
    { key: 'elevenlabs', label: 'ElevenLabs' },
    { key: 'minimax', label: 'Minimax' },
    { key: 'tavily', label: 'Tavily' },
    { key: 'mineru', label: 'MinerU' },
    { key: 'twilio', label: 'Twilio (SMS OTP)' },
    { key: 'postmark', label: 'Postmark (email)' },
  ];

  return (
    <div className="p-6 md:p-8 max-w-6xl">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">System</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Health, audit log, provider status. Keys themselves are server-side only.
        </p>
      </header>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-medium mb-3">Provider status</h2>
        <ul className="divide-y divide-border/60 text-sm">
          {rows.map((r) => (
            <li key={r.key} className="flex items-center justify-between py-2">
              <span className="text-foreground">{r.label}</span>
              <span
                className={
                  providerStatus[r.key]
                    ? 'text-xs rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5'
                    : 'text-xs rounded-full bg-muted text-muted-foreground px-2 py-0.5'
                }
              >
                {providerStatus[r.key] ? 'configured' : 'not configured'}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-xl border border-dashed border-border p-8 text-sm text-muted-foreground/70">
        Full health dashboard (Supabase query perf, Ollama uptime, error rates, slow
        queries, recent deployments) and audit log view coming soon.
      </section>
    </div>
  );
}
