# Permanent player storage boundary

Policy: retain players with verified SE/NO/DK nationality, or actual SEC/SCL playing
history. FI, IS, CA, US and unknown nationality do not qualify on nationality alone.
Registration, a portrait, Fantasy pricing history, or a graphics request is not
playing evidence.

## Import enforcement

- `permanent-player-scope.psql` builds a temporary eligible-ID set from verified
  nationality and positive SEC/SCL match counts. It also resolves central identity
  aliases, merged records and legacy SEC identities.
- Roster and Fantasy-pool imports filter their temporary staging tables before
  persistent writes. Team/fixture metadata is not a player-admission rule.
- Both statistics imports use `filter-permanent-player-statistics.psql`.
  Incoming positive SEC/SCL games may establish new eligibility, without assigning
  Scandinavian nationality.
- Fantasy match imports allow verified IDs and actual SCL 26/27 participants.
- Temporary Graphics/Broadcast/OBS fetching is separate and is not filtered by
  this permanent-storage admission rule.
- The SportsGamer source remains read-only.

The shared scope does not depend on a cleanup manifest or on portrait records.
Locally verified historical SEC/SCL links were retained in the private scope flags
so older participants remain eligible for future source refreshes.

Tests: `test_player_storage_scope.py`, `test_permanent_import_gates.py`, plus
transaction-rolled-back database checks for the SQL evidence/eligibility rules.

## Cleanup record: 18 October 2026

The reviewed global cleanup removed 16,609 central register rows and their
out-of-scope statistics/history links: 230,870 rows across 26 tables.
It retained 1,647 register rows (1,605 active), 17,286 SportsGamer statistics rows,
and all 628 published portrait rows. All 608 existing portrait-ID links and
protected SEC/SCL statistics were checked unchanged.

The 78 image-profile rows matched 57 gamertags with 21 older duplicate rows.
Their optional bio/contact/social/status fields were already empty; no content
was lost when those fields were normalized to NULL. Image URLs, publication
approval, image-ID links and ownership were retained.

## Private recovery archive

Recovery copies are in `private.player_cohort_cleanup_archive`, run
`20261018-global-cohort-v3`. Its contents are not accessible to anonymous or
authenticated app users. The plan/checkpoints are under the same run ID with
`-plan` appended.

The global run uses **pgp-zlib-rows-v1**, not the earlier single-row archive format.
`payload_base64` contains the compressed original JSON object
`{format: rows-v1, operation: delete|update_before, rows: [...]}`.
Decode with:
`extensions.pgp_sym_decrypt(decode(row_data->>'payload_base64','base64'),run_id)::jsonb`.

The run ID is a non-secret format key, not a confidentiality boundary. Access is
protected by private-schema/table privileges and RLS. Every chunk was read back,
and its original row-array digest checked, before deletion. The primary-key
`row_digest` is `md5((decoded->'rows')::text)`; `rows_count` stores the count.

Do not run the older single-row restore scripts on this global run. A restore
needs explicit approval and a reviewed transaction:
1. Restore central players first, initially without merge references; restore the
   merge references only after all referenced players exist.
2. Restore ITHL/LGEL/SM parent rows, then identities/nationalities, statistics,
   pools and dependent history/cache rows in foreign-key-safe order.
3. Use `jsonb_populate_recordset(null::<allowlisted table>,decoded->'rows')`.
   Fail on conflicting newer rows; never overwrite newer data blindly.
4. Portrait rows were not deleted and their optional fields had no nonempty
   content, so they need no image restore.
5. Recheck protected rows and portraits before an explicit COMMIT.
