# 08: Encouragement and highlight lines

**What to build:** The shared encouragement feed renders the day-tagged neutral lines produced by every action ("Jess logged a meal — Good, +12 pts", "Robi did the examen", "Robi kept the fast · +20 pts", "Both prayed together — +11 each"). Each profile can send explicit encouragement to the other, and can opt in a highlight line that surfaces one private detail (Jess's meal note, Robi's problem) onto the shared surface. The boundary stays default-closed: nothing private reaches the other without an active highlight choice.

**Blocked by:** 02 (Meal logging), 03 (Study logging)

**Status:** ready-for-agent

- [ ] Feed renders full, day-tagged, most-recent-first lines from every action
- [ ] Feed lines are neutral: they witness the act, never judge the person (ADR-0003)
- [ ] Sending explicit encouragement to the other partner is one tap and lands on the shared feed
- [ ] Jess can opt a meal note into a highlight line visible to Robi
- [ ] Robi can opt a problem or label into a highlight line visible to Jess
- [ ] Nothing private appears on the shared surface without an explicit highlight-line opt-in (ADR-0007)