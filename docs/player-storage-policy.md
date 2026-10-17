# Player storage boundary

Permanent cohort: SE/NO/DK nationality, plus any nationality with actual SEC/SCL playing history. Match participation or skater/goalie games qualify; a roster registration or graphics request alone does not.

The source export is read-only. `private.sportsgamer_storage_scope` records eligibility and verification time. The central nationality resolver and locked manual decisions remain unchanged. Statistics jobs select all resolved SE/NO/DK players (including existing profiles absent from the latest source export), or verified SEC/SCL participants. Verified playing history is retained across subsequent source snapshots. Other existing records are retained, not deleted.

## Transition status

The current WV/FCL/Broadcast imports are still compatibility paths. Do not stop them until a non-persistent graphics data provider has been connected and tested. They currently write broader league data and therefore are not yet compliant with the final boundary.

The SQL/SSH credentials are currently available inside GitHub Actions, not a proven live SQL service. The existing `graphics-schedule` Edge Function reads public SportsGamer HTML, not their database. A replacement for league players, standings and weekly match statistics must be read-only, server-side and bounded to approved query types; browser clients must never receive database credentials or submit SQL. Cache results temporarily, with explicit expiry and no permanent player upserts. Preserve manual choices and last-known usable results on source failure.

No existing player, recordbook, Fantasy or match history should be removed as part of this transition. Any later cleanup requires a separate reviewed list and explicit approval.
