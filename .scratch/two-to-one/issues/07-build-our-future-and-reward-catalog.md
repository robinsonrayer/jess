# 07: Build Our Future and reward catalog

**What to build:** Every point from either domain feeds the shared Build Our Future pool, shown as a running total with a progress bar. The pool backs a reward catalog seeded with the default, "Marriage" at 1,000,000 points, that the couple edits at any time: add a reward, set its point cost, rename it, delete it. Each reward renders a progress bar toward its cost, and flips to "reached" once the pool passes it. Reaching a cost is a milestone to celebrate, never a purchase or claim. Add and delete post neutral feed lines.

**Blocked by:** 02 (Meal logging)

**Status:** done

- [x] Shared pool shows the sum of both profiles' points (the prototype's `totalPoints`)
- [x] Catalog ships seeded with Marriage at 1,000,000 points (ADR-0008)
- [x] Reward can be added with a name and a point cost; add posts a feed line
- [x] Reward can be renamed at any time
- [x] Reward can be deleted; delete posts a feed line
- [x] Each reward renders a progress bar and the percentage toward its cost from the shared pool
- [x] A reward whose cost the pool has reached reads as "reached", with no claiming or purchase flow