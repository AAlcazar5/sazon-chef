import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The rules of the road for Sazon.',
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20 md:px-10">
      <Link href="/" className="text-sm text-brand-700 hover:underline">
        ← Back
      </Link>
      <h1 className="mt-6 font-display text-5xl tracking-tight text-surface-ink">
        Terms of Service
      </h1>
      <p className="mt-4 text-surface-ink/70">
        Placeholder — replace before launch. Must cover subscription terms (cancellation,
        refunds per platform policy), content ownership (user-generated recipes),
        acceptable use, and a health disclaimer. See{' '}
        <code className="text-sm">plans/launch-checklist.md</code>.
      </p>
    </main>
  );
}
