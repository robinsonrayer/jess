# 05: Fasting

**What to build:** On a binding day (Friday, Ash Wednesday, Good Friday) the app flags the day gently, never listing which days bar, and offers a one-tap "kept the fast" button that posts a neutral feed line and earns a flat 20 points once per person per day. The fast is an external act with a concrete yes/no, so it sits in the reward loop while prayer stays outside it.

**Blocked by:** 01 (App skeleton and persistence)

**Status:** ready-for-agent

- [ ] Binding fast days can be flagged as such (default days per ADR-0005: all Fridays, Ash Wednesday, Good Friday)
- [ ] Flag surfaces gently with no list of "blackout" days
- [ ] "Kept the fast" earns a flat 20 points, once per person per day
- [ ] A kept fast posts a neutral feed line (ADR-0005)
- [ ] Keeping the fast on a non-binding day is a dead button, not a punishment