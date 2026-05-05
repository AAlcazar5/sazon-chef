import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Sazon handles your data.',
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20 md:px-10">
      <Link href="/" className="text-sm text-brand-700 hover:underline">
        ← Back
      </Link>
      <h1 className="mt-6 font-display text-5xl tracking-tight text-surface-ink">
        Privacy Policy
      </h1>
      <p className="mt-4 text-surface-ink/70">
        Placeholder — replace with the full policy generated via Termly/iubenda and
        customized for our actual data flows (Spoonacular, OpenAI/Anthropic/Google,
        RevenueCat, Resend) before launch. See{' '}
        <code className="text-sm">plans/launch-checklist.md</code>.
      </p>
    </main>
  );
}
