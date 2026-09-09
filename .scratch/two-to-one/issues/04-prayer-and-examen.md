# 04: Prayer and examen

**What to build:** Either partner can tap a dedicated "prayed today" button, or complete the examen (the nightly five-step reflection ending in a one-line gratitude note). Either action counts toward the shared prayer streak, and the streak advances when either of them logs. Points for prayer pay out only on days when both partners have logged, to both profiles equally, with no rollover of an unclaimed day. The examen counts as praying but earns no points. Both actions land neutral feed lines.

**Blocked by:** 01 (App skeleton and persistence)

**Status:** done

- [x] Dedicated "prayed today" button for each profile
- [x] Examen completion also counts as praying ("one tap" plus the five-step reflection UI ending in a gratitude note)
- [x] Shared prayer streak advances when either partner logs (ADR-0004)
- [x] One-sided logging pays nothing; the payout lands only when the second partner logs the same day
- [x] A day where only one partner logs never pays, and the unclaimed payout does not roll into a later day
- [x] The completion of the examen posts a neutral feed line and earns zero points (ADR-0005)
- [x] Both-action payout is credited to both profiles in equal amount