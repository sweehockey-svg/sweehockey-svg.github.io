# Player storage boundary

Permanent cohort: SE/NO/DK nationality, plus any nationality with actual SEC/SCL playing history. Match participation or skater/goalie games qualify; a roster registration or graphics request alone does not.

The source export is read-only. `private.sportsgamer_storage_scope` records eligibility and verification time. The central nationality resolver and locked manual decisions remain unchanged. Statistics jobs select all resolved SE/NO/DK players (including existing profiles absent from the latest source export), or verified SEC/SCL participants. Verified playing history is retained across subsequent source snapshots. Other existing records are retained, not deleted.

## Transition status

Read-only consumer/writer audit completed on 18 October 2026: see [player-storage-migration-audit.md](player-storage-migration-audit.md). It documents the shared Broadcast/OBS, roster and merit dependencies and includes a non-destructive verification script. No compatibility imports were disabled by the audit.

Graphics Studio now has an on-demand provider: the admin-only `graphics-fetch` Edge Function dispatches `fetch-graphics-data.yml`. That workflow uses read-only source exports and uploads only an allowlisted JSON result, never calling a Supabase importer. Results expire after one hour; GitHub artifacts have one-day retention (the minimum), and browser reuse is memory-only for fifteen minutes. The result contains public graphics fields, not account/contact fields or source credentials. Supported leagues are explicitly allowlisted and periods are bounded to 366 inclusive days.

The refresh button and weekly-team autofill use this provider. Initial loading keeps the compatibility views available. Switching leagues or changing the selected period while a request is pending cannot apply the old request to the new selection. Missing or incomplete match data does not replace the current weekly selections. Signed-in production UI tests on 17 October 2026 passed for SCL (148 players, 52 period matches, six selected positions) and FCL (586 players, 170 period matches, six selected positions), using 11–15 October inclusive. Non-Swedish participants and their period statistics were included. The initial WV source-only test also passed: 96 players and complete period coverage.

The current WV/FCL/Broadcast imports are still compatibility paths for initial loading and other consumers. Do not stop them until those consumers have been migrated and tested separately. They currently write broader league data and therefore are not yet compliant with the final boundary. The new graphics job does not invoke them.

The SQL/SSH credentials are currently available inside GitHub Actions, not a proven live SQL service. The existing `graphics-schedule` Edge Function reads public SportsGamer HTML, not their database. A replacement for league players, standings and weekly match statistics must be read-only, server-side and bounded to approved query types; browser clients must never receive database credentials or submit SQL. Cache results temporarily, with explicit expiry and no permanent player upserts. Preserve manual choices and last-known usable results on source failure.

No existing player, recordbook, Fantasy or match history should be removed as part of this transition. Any later cleanup requires a separate reviewed list and explicit approval.
