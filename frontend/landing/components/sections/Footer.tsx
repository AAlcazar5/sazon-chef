import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-surface-ink text-surface-cream/80">
      <div className="mx-auto max-w-7xl px-6 py-14 md:px-10 md:py-20">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2 text-surface-cream">
              <span
                aria-hidden
                className="grid h-9 w-9 place-items-center rounded-pill bg-brand-gradient text-lg shadow-soft"
              >
                🌶️
              </span>
              <span className="font-display text-2xl tracking-tight">Sazon</span>
            </div>
            <p className="mt-4 max-w-xs text-sm text-surface-cream/60">
              Eat the world. Live well. Past the spreadsheet.
            </p>
          </div>

          <nav className="grid grid-cols-2 gap-3 text-sm md:gap-4">
            <Link href="/privacy" className="hover:text-surface-cream">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-surface-cream">
              Terms
            </Link>
            <a href="mailto:hello@sazonchef.com" className="hover:text-surface-cream">
              Contact
            </a>
            <a href="#waitlist" className="hover:text-surface-cream">
              Waitlist
            </a>
          </nav>

          <div className="flex flex-col gap-3 text-sm md:items-end">
            <a
              href="https://www.tiktok.com/@sazonchef"
              target="_blank"
              rel="noreferrer"
              className="hover:text-surface-cream"
            >
              TikTok
            </a>
            <a
              href="https://www.instagram.com/sazonchef"
              target="_blank"
              rel="noreferrer"
              className="hover:text-surface-cream"
            >
              Instagram
            </a>
            <a
              href="https://www.youtube.com/@sazonchef"
              target="_blank"
              rel="noreferrer"
              className="hover:text-surface-cream"
            >
              YouTube
            </a>
          </div>
        </div>

        <div className="mt-14 border-t border-surface-cream/10 pt-6 text-xs text-surface-cream/50">
          © {new Date().getFullYear()} Sazon Chef. Made with real ingredients.
        </div>
      </div>
    </footer>
  );
}
