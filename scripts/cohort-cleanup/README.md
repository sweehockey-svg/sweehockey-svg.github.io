# Cleanup of broad graphics imports — 18 October 2026

Executed in production after a transactionally rolled-back rehearsal. User approved WECL (523), GCL (524/525/526), FCL (529), WV (532). SEC/SCL and SE/NO/DK remain protected.

## Completed
- Removed 973 current tournament player-stat rows, 972 roster rows and 3,403 WV/FCL match-player rows for 744 reviewed IDs.
- Candidate rule requires known automatic non-SE/NO/DK nationality, no locked decision, no source-confirmed Scandinavian/SEC/SCL eligibility and no local SEC/SCL playing evidence.
- Unknown nationality and unverified identities were NOT deleted.
- Exact SEC/SCL statistics checksums and every published nonempty SportsGamer-ID/image-URL pair were checked inside the deleting transaction; any difference would have rolled back.
- No images, Storage files, self-profiles, identities, central registry rows, team rows, match headers or historical recordbook/ECL data were deleted.
- A private, RLS-enabled archive contains removed rows for admin recovery. No app/browser access is granted. This is a recovery copy, not an active graphics source.
- Recovery rehearsal restored all 5,348 rows inside a transaction, verified counts, then ROLLED BACK. The active cleanup remains in place.
- Broad Broadcast workflow now accepts only SCL 527 and keeps its existing shared Fantasy workflow. Foreign-league manual dispatch fails explicitly; new Graphics/Broadcast fetch remains the supported full-tournament source. Published commit: 2899802ca8be9c8b69a48c1f38fc2cee88960c54. Its push workflow succeeded.

## Boundaries / not claimed complete
- This is NOT a purge of all foreign people or their older tournament history. Most affected IDs still have older statistics outside these league IDs. Those sources and dependent registry identities were deliberately retained.
- Unknown players remain pending verification; absence from the permanent scope is not proof of foreign nationality.
- Graphics/Broadcast full foreign-league lists now require the temporary fetch; legacy initial/fallback lists can be partial.
- The older Broadcast launcher's permanent foreign-league refresh now fails rather than importing. Its UI migration is still separate work.
- New broad imports through this workflow are stopped. Existing scoped Scandinavian/SEC/SCL statistics imports remain allowed and unchanged.
- Archive deletion is not scheduled or implied; removal needs a separate deliberate decision after the recovery window.

## Files
- cleanup-dry-run.sql: rehearsal, always rollback.
- cleanup-apply.sql: one-time exact reviewed set; refuses count drift or reused archive run.
- restore-review.sql: admin recovery, defaults to rollback and does not overwrite newer rows.
- broadcast-workflow.yml: reviewed remote workflow snapshot with SCL-only gate.

No actual player rows or image URLs are included in these repository files.
