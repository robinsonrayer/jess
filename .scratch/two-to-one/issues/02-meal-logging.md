# 02: Meal logging

**What to build:** Jess logs a meal as a photo plus a one-tap Good/Okay/Miss rating under the constant rubric line "meat and fruit first, light on sweets and packaged stuff", with an optional private note she can keep to herself. The log advances the health streak once per day, rolls 8-15 base points with a 10% doubling chance, and Good/Okay/Miss rank by bonus. A Miss still counts toward the streak and still earns base points. Robi sees the photo and rating by default; Jess's private note stays hers unless made a highlight line.

**Blocked by:** 01 (App skeleton and persistence)

**Status:** ready-for-agent

- [ ] Photo entry (capture or upload) plus one-tap Good/Okay/Miss rating render for Jess
- [ ] The rubric line renders constant under the rating control with no checklist or macros (ADR-0006)
- [ ] Optional private note field on a meal; it never renders in Robi's view unless shared as a highlight line
- [ ] Any meal logged advances the health streak once per day, never more than once per day
- [ ] A Miss earns base points and counts toward the streak (ADR-0003)
- [ ] Good earns a larger total than Okay, which earns more than Miss
- [ ] Base points fall in the 8-15 band with a 10% doubling chance; the delta is visible in the feed line
- [ ] Robi's cross view shows Jess's meal photo and rating by default (ADR-0007)