# iPhone web app — 2026-09-16

Entry: `/iphone.html`, then `/?webapp=1#/`. The existing manifest ID is retained.
Installed standalone mode activates the shell automatically; browser preview stays
in this tab via sessionStorage. `?webapp=0` leaves preview mode.

`webapp-shell.js` is a snapshot of Android 5.30's native/app-shell.js with web OAuth
redirect, disabled Android-only push controls and skipped push onboarding.
Do not replace it blindly with the Android file: preserve these web differences.
The native Android app does not load this web shell (SehNative/Capacitor guard).

No offline account or statistics cache. The service worker provides an offline
navigation message only. Updates are network-first (no service-worker cache).

Validated in isolated Chrome mobile view at 390px and 320px: guest onboarding,
navigation, competitions, account UI, overflow, and OAuth target URL. Actual Safari
standalone installation and completed Discord login still need an iPhone test.

Web Push added 2026-09-16: webapp-push.js, webapp-sw.js and the web-push Edge Function.
Anonymous device capabilities protect registration/preferences/deletion; only hashes
are stored. Tables deny anon/authenticated access; service-role only (intentional
RLS-without-policies). VAPID keys are generated once server-side, never in Git.
The independent news trigger uses the existing webhook secret and category mapping;
Android's trigger and function are untouched. Delivery claims are separate and
per-device to avoid duplicates on retry. No global test broadcast was sent.
Run node scripts/test-web-push.cjs for mocked regression tests. Physical iPhone
delivery, opening the article from a notification and opt-out still need testing.
On iPhone use iOS 16.4+ and launch from Home Screen. Enable under Hem → Pushnotiser.
The important category is reserved; like Android, current automatic sends are
published news mapped to news/sec/ecl. This does not add personal case notifications.
