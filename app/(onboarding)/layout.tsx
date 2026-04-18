import Link from 'next/link';

/**
 * Onboarding layout — pre-signup flow (/try, /signup, /personalize).
 * Minimal chrome: just a small logo in the corner; no nav that would let
 * the student wander off the funnel.
 */
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="absolute top-4 left-4 z-10">
        <Link href="/">
          <img src="/logo-horizontal.svg" alt="Lamppost" className="h-8 opacity-70" />
        </Link>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
