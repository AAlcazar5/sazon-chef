# Sazon Landing (sazonchef.com)

Marketing landing page for Sazon Chef. Self-contained Next.js 15 app — does **not** share dependencies with the Expo app at `frontend/`.

## Run locally

```bash
cd frontend/landing
npm install
npm run dev          # http://localhost:3002
```

The Expo Metro bundler is configured to ignore this directory (`frontend/metro.config.js` blockList), so you can run both apps side-by-side.

## Deploy

Hosted on Vercel. Point the Vercel project root to `frontend/landing`. Build command and output dir are auto-detected.

## Assets to drop in before launch

| Path | What | Source |
| --- | --- | --- |
| `public/hero-loop.mp4` | 8–12s seamless food-prep loop, 1080p H.264, ~6MB | Pexels "chef plating" / Coverr / Sora |
| `public/hero-poster.jpg` | First frame of the hero loop | Same |
| `public/dishes/{fesenjan,sicilian-pasta,glazed-bites,bibimbap,saffron-rice}.jpg` | 1200×1200 dish hero shots | Pexels / Unsplash / Midjourney |
| `public/mascot/sazon-logo.svg` ✅ | Habanero mascot (orange variant) — wired into Hero, Footer, Waitlist success | already copied from `frontend/components/mascot/` |
| `public/mascot/sazon-logo-red.svg` ✅ | Mascot red variant (alt) | already copied |
| `public/lottie/{chef-kiss,sparkle-trail,confetti}.json` ✅ | Lottie celebrations (staged for future use) | already copied; needs `lottie-react` to play |
| `public/badges/{app-store,google-play}.svg` | Store badges (gray pre-launch) | Apple / Google asset kits |

Until those land, the page renders gracefully with poster-only fallbacks and tinted gradient placeholders.

## Form backend

`app/api/waitlist/route.ts` is a stub that validates with Zod and returns 200. Wire it to the Sazon backend (`backend/src/`) when the `WaitlistSignup` Prisma model lands — see `plans/launch-marketing.md`.
