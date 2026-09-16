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

Push is not implemented in this release. Existing FCM Android topics cannot be
used by Safari without a web subscription registration and delivery backend.
The UI explicitly states this and does not ask for unusable notification permission.
Next: Web Push subscription management, sending and opt-out, then physical iPhone
delivery testing (iOS 16.4+ Home Screen app), before enabling the toggle.
