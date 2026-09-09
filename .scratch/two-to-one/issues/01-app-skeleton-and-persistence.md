# 01: App skeleton and persistence

**What to build:** Open the app, enter the shared password, pick a profile (Jess or Robi), and land on a day view showing zeroed points, zeroed streaks, the seeded reward catalog, and an empty feed. The choice of profile, the day counter, and everything the engine produces survive a reload via localStorage. This makes the whole shape of the app real end to end: engine state in, persisted state out.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] Profile picker guarded by one shared password (per ADR-0001); wrong password blocks entry
- [x] Selecting Jess or Robi sets the acting profile and shows it clearly
- [x] Day view renders the four state tables: per-profile points, streaks and freezes, Build Our Future pool, feed
- [x] Engine `fresh()` seeds the full state shape including the reward catalog with the Marriage default at 1,000,000
- [x] Storage wrapper round-trips full state to localStorage and back; reload restores points, streaks, day counter, and catalog intact
- [x] Reward catalog empty-state renders (no rewards yet message shows when the list is cleared)