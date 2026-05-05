# Sazon E2E specs

ROADMAP 4.0 E6 — three launch-blocker journeys covered by Playwright:

1. **`specs/cold-start-onboarding.spec.ts`** — fresh install → registration →
   physical profile → lifestyle preferences → first plate → Today shows
   generated recipe within 8s on 4G; no console errors.
2. **`specs/free-to-paywall-purchase.spec.ts`** — free user hits the
   Build-a-Plate daily limit → paywall opens → Stripe Checkout (web)
   sandbox → premium unlocks within 5s; Restore Purchases works.
3. **`specs/cooking-celebration.spec.ts`** — saved recipe → Cook now →
   Kitchen mode → final step → chef-kiss + nutrition reveal; persists to
   meal history; 5★ rating shifts Sazon (Coach) hint context.

## Running locally

```sh
cd e2e
npm install
npx playwright install chromium
npm test
```

`E2E_BASE_URL` (default `http://localhost:8081`) targets the Expo web
build. Set `E2E_FREE_USER_EMAIL`, `E2E_FREE_USER_PASSWORD`,
`E2E_TEST_USER_EMAIL`, `E2E_TEST_USER_PASSWORD` to override the seeded
test credentials.

## Native coverage

Playwright targets the web build. iOS simulator + Android emulator
coverage of the same journeys is tracked separately (Maestro flow files
in `e2e/maestro/` — to be added once the seeded test users exist on
TestFlight / internal-track builds).

## Artifacts

On failure: screenshot, video, and trace are written under
`reports/test-results/` and the HTML report under `reports/html/`. The
JUnit XML at `reports/junit.xml` is what CI consumes for the merge gate.

## Merge gate

PRs cannot merge to `main` if any spec is red. Branch protection is set
via `scripts/setup-branch-protection.sh` (E3); the test status check is
named `e2e` in the repo settings.
