# 06: Streak protection and milestones

**What to build:** Streaks become the honest machinery: they advance once per day, survive a skipped day by burning one banked freeze, restart at 1 when the freeze bank runs out, and bank a freeze plus a bonus at the 7, 14, and 30 day milestones (25/35/50 points). The prayer milestone pays both profiles; health and study milestones pay the acting profile. Freeze cap is two in reserve. This lifts the prototype's verified `bumpStreak` math out of the demo and into the real engine, applied to all three streak call sites.

**Blocked by:** 02 (Meal logging), 03 (Study logging), 04 (Prayer and examen)

**Status:** ready-for-agent

- [ ] A skipped day with a freeze banked preserves the streak count and burns one freeze
- [ ] A skipped day with an empty bank restarts the streak at 1
- [ ] Banking the 7th, 14th, and 30th consecutive day adds a freeze when bank is under 2 (max 2 in reserve)
- [ ] Milestone bonuses of 25/35/50 points credit on the milestone day
- [ ] Prayer milestone bonus credits both profiles; health and study credit the acting profile
- [ ] Banked freezes and their burn are visible in the streak table
- [ ] The engine rules here match the milestone table and freeze gap logic verified in the prototype