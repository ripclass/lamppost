// Phase A Step 5 will wire this to Supabase Auth phone/email OTP via Twilio.

export default function SignupPage() {
  return (
    <section className="mx-auto max-w-md px-4 pt-24 pb-16">
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-center">
        Save your progress
      </h1>
      <p className="mt-3 text-center text-sm text-muted-foreground">
        Enter your phone number or email to get a one-time code.
      </p>
      <div className="mt-10 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground/70">
        OTP signup wires up in Phase A Step 5.
      </div>
    </section>
  );
}
