import { SignupForm } from './signup-form';

export default function SignupPage() {
  return (
    <section className="mx-auto max-w-sm px-4 pt-24 pb-16">
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-center">
        Save your progress
      </h1>
      <p className="mt-3 text-center text-sm text-muted-foreground">
        Phone or email — we&apos;ll send a one-time code. No password to remember.
      </p>
      <div className="mt-10">
        <SignupForm />
      </div>
    </section>
  );
}
