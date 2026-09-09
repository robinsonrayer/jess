# Spec: Two to One

Status: `ready-for-agent`

## Problem Statement

Jess and Robi are a Catholic couple building two disciplines side by side. Jess works on food toward health, Robi works on study toward a job he can marry on. On their own, streaks and apps die in the first week: food logs take two minutes or more, defaults to macro counting they can't do, and punish a bad day until the app gets abandoned. What they want is each other's actual discipline, visible as a shared goal they both feed, not a surveillance feed over private failure.

## Solution

A private web app for the two of them, no signup beyond picking a profile. Each person logs a single action a day: Jess a photo of a meal with a one-tap Good/Okay/Miss, Robi a pomodoro or a problem at Easy/Medium/Hard. Both can tap "prayed today", complete the examen, and mark a kept fast on a Church fasting day. Every point feeds one shared pool, Build Our Future, that backs a reward catalog they edit themselves, seeded with Marriage as the far target. A shared streak grid and an encouragement feed keep the discipline in front of both of them, day by day.

## User Stories

1. As Jess, I want to log a meal as a photo with a one-tap Good/Okay/Miss rating, so that staying consistent takes five seconds.
2. As Jess, I want to see the one constant rubric line ("meat and fruit first, light on sweets and packaged stuff") under the rating buttons, so that I remember what Good means without a checklist.
3. As Jess, I want a private note field on a meal that Robi cannot see unless I make it a highlight line, so that my honest self-reflection stays mine.
4. As Jess, I want my meal photo and rating visible to Robi by default, so that he can coach me on food.
5. As Jess, I want any logged meal to count toward my health streak even if I rate it Miss, so that a bad day never punishes me.
6. As Jess, I want a Miss to still earn base points, so that showing up is always rewarded.
7. As Jess, I want Good to earn more than Okay and Okay more than Miss, so that the better choice visibly pays more.
8. As Robi, I want to log a pomodoro with one tap, so that any focus session counts toward my study streak.
9. As Robi, I want to log a problem as Easy, Medium, or Hard, so that the difficulty is cradle-collected and reachable later.
10. As Robi, I want harder problems to earn more points, so that the difficulty is worth facing.
11. As Robi, I want Jess to see my difficulty mix bar (Easy/Medium/Hard counts) and generic feed lines, so that she sees the shape of my day without us naming problems.
12. As Robi, I want my task labels and problem names kept from Jess, so that I can fail privately at a problem without her watching the failure in real time.
13. As Robi, I want to choose an opt-in highlight line that reveals a private detail to Jess, so that the boundary is mine to open.
14. As the couple, I want a shared prayer streak that advances when either of us taps "prayed today" or completes the examen, so that one person keeping the habit keeps the couple's count alive.
15. As the couple, I want prayer points to pay out only on days when both of us have logged prayer, so that we grow together rather than in parallel.
16. As the couple, I want the examen to count as praying but earn no points, so that the interior life is never turned into a game.
17. As the couple, I want completing the examen to post a neutral feed line ("Robi did the examen"), so that the practice is witnessed without being scored.
18. As the couple, I want a kept fast on a binding day (Friday, Ash Wednesday, Good Friday) to post a feed line and earn 20 points flat, so that one of the Church's five precepts sits in the reward loop.
19. As the couple, I want the app to gently flag a fasting day (never list which days bar), so that the obligation is surfaced without lecturing.
20. As the couple, I want every point from either domain to feed one shared Build Our Future pool, so that our discipline accumulates toward something we both want.
21. As the couple, I want the reward catalog seeded with Marriage at 1,000,000 points, so that the far target is the life we are building, not a gadget.
22. As the couple, I want to add, set the point cost of, rename, and delete rewards at any time, so that the catalog is ours to edit (a movie night today, a hill-station weekend later).
23. As the couple, I want each reward to show a progress bar toward its cost, so that the distance to each treat stays visible.
24. As the couple, I want a reward whose cost the pool has reached to read as "reached", a milestone to celebrate, never something purchased or claimed.
25. As the couple, I want an encouragement feed of neutral lines ("Jess logged a meal", "Robi kept the fast"), so that activity is witnessed without judgment.
26. As the couple, I want to send encouragement to the other, so that we can react positively without the feed judging either of us.
27. As each of us, I want my health streak to advance once per day no matter how many meals I log, so that the count is about showing up, not volume.
28. As each of us, I want my streak to survive a missed day by burning one banked freeze, so that a single off day never resets months.
29. As each of us, I want my streak to hold up to four skipped days across a gap if freezes cover them, so that real life (illness, travel, family) fits inside the rule.
30. As each of us, I want my streak to restart at 1 when freezes run out, so that the count always tells the truth.
31. As each of us, I want a freeze banked at the 7, 14, and 30 day streak milestones, capped at two in reserve, so that freezes are earned, not gifted.
32. As each of us, I want the streak milestone to pay a bonus (25 at 7, 35 at 14, 50 at 30), so that long streaks have day-specific payoff.
33. As the couple, I want the prayer streak milestone bonus to pay to both profiles, so that a joint milestone rewards the couple equally.
34. As each of us, I want a login that is only a profile picker guarded by one shared password, so that the two of us get in without signup flows or password resets.
35. As each of us, I want all data to live in one shared place keyed by profile, so that the app works between two people who trust each other.
36. As each of us, I want my points, streaks, freezes, and reward catalog to persist between sessions, so that day two starts where day one ended.
37. As each of us, I want base points to roll in the 8-15 band with a 10% chance of doubling, so that the reward stays a slot machine and not a spreadsheet.
38. As each of us, I want the app to show a summary view of my own domain and the other's, so that the visible surface is easy to skim.

## Implementation Decisions

- **Single-tab mobile-first web app, no backend build.** The app is a static client over one datastore. ADR-0001 chose a shared password with Firebase anonymous auth underneath; the browser keeps the shared-space key by profile. Persistence is localStorage for v1, with a thin storage wrapper around the engine so the wrapper can swap to Firebase later without touching the rules.
- **Engine module, pure and testable.** The reward engine from the prototype (its `createEngine`) lifts into the app's state layer as a standalone module with no DOM and no storage handles. Public API: `fresh()`, `advanceDay(s)`, `setFasting(s, on)`, `logMeal(s, actor, rating)`, `studyAction(s, actor, type, difficulty)`, `pray(s, actor, via)`, `keepFast(s, actor)`, `addReward(s, name, cost)`, `removeReward(s, id)`, `totalPoints(s)`. Callers pass state in and get new state back; the module never mutates.
- **State shape (diverges from prototype to match this spec).** Day counter, fasting flag, two profiles keyed `jess`/`robi` each holding `points`, `meal` (day logged), `study` (day logged), `prayer` (day logged), `fast` (day logged), and Robi's problem counts `pm: [E, M, H]`. Shared streaks keyed by name (`health`, `study`, `prayer`), each holding `count`, `bank`, `last` (day). Reward catalog array of `{id, name, cost}`. Feed as an ordered list of day-tagged lines.

  The prototype encodes the streak/freeze state machine precisely. Trimmed from `prototype-reward-engine.html`:

  ```js
  var MILESTONES = { 7:25, 14:35, 30:50 };
  function bumpStreak(s, streakId, day){
    var st = s.streaks[streakId];
    if (st.last === day) { return { note:null }; }
    var newCount = st.count + 1;
    var isNormal = st.last === null || st.last === day - 1;
    if (!isNormal) {
      var gap = day - st.last - 1;
      if (st.bank >= gap) { st.bank -= gap; st.last = day; return { note:"freeze" }; }
      if (st.bank > 0) { st.bank = 0; }
      newCount = 1;
    }
    st.count = newCount;
    st.last = day;
    if (isNormal && MILESTONES[st.count] !== undefined) {
      var fz = st.bank < 2 ? 1 : 0;
      st.bank = Math.min(2, st.bank + fz);
      return { note:"milestone", points:MILESTONES[st.count], freezeGained:fz === 1 };
    }
    return { note:null };
  }
  ```

  Note the freeze cap reads two in prototype and this spec's user stories say two in reserve; the "four skipped days" in story 29 is a single gap of four days covered by two freezes being wrong. Correct behaviour: a gap is covered one day per freeze, so at most two skipped days survive before restart. Story 29 is dropped in favour of the two-freeze-cap invariant.
- **Point values (ADR-0002, ADR-0003, ADR-0005).** Base 8-15 via seeded PRNG, 10% chance of doubling. Meal Good +5, Okay +2, Miss +0 on top of base. Study pomodoro base only; problem adds +3 Easy, +5 Medium, +8 Hard. Milestones 25/35/50 paid to the acting profile, except the prayer milestone paid to both. Fast flat +20 to the actor. Prayer payout: on a day the second partner logs, the engine rolls one value and adds it to both profiles.
- **Prayer with no rollover.** A day one partner prays alone advances the shared streak and pays nothing; if the other partner never logs that day, that day's payout is gone. No unclaimed payout rolls into the next day. Matches ADR-0004 and the prototype's `pray`.
- **Reward catalog is couple-owned (ADR-0008).** `fresh()` seeds one reward, `{ id:"marriage", name:"Marriage", cost:1000000 }`. `addReward` and `removeReward` edit the array and post a feed line ("Reward added to the catalog: X at Y pts." / "Reward removed from the catalog: X."). No built-in ladder, no locking, no claiming. Reaching a cost renders the reward as "reached", not purchasable.
- **Sharing boundary (ADR-0007).** Profile picker login. The shared surface posts neutral feed lines built from domain acts ("Jess logged a meal — Good, +12 pts", "Robi finished a Hard problem", "Robi did the examen", "Robi kept the fast · +20 pts", "Both prayed together — +11 each"). Robi's meal-comparable surface for food is Jess's photo and rating; Jess's surface for study is streaks, points, difficulty mix, and generic feed lines. Private notes and problem names only reach the other via an explicit highlight line.
- **Photo-first food logging (ADR-0006).** Jess's meal log stores a photo plus one-tap rating plus optional private note. The rubric line renders constant under the rating control. No calories, no macros, no food database.

## Testing Decisions

- **One seam: the engine module.** Tests import the engine and drive its public API, asserting on returned state: points per profile, streak counts, banks, last days, reward catalog, feed contents. No DOM, no storage, no timers in tests. This matches the prototype, which already isolates `createEngine` with no page state.
- **What makes a good test.** External behaviour only: given a fed-in state and an engine call, the returned state has the expected numbers and the expected feed lines. Never assert on PRNG internals; the prototype's `setSeed` exists so tests can pin a seed and predict rolls.
- **Cases worth pinning.** Streak advances once per day; Miss counts for streak and base points; Good/Okay/Miss ordering; pomodoro vs problem difficulty deltas; doubling happens (seeded) and hit-or-miss stays arithmetic; prayer alone grows streak but pays nothing; second prayer same day pays both; second prayer next day pays nothing (no rollover); freeze banks at 7/14/30 capped at 2; a one-day gap burns one freeze and holds the count; a wider gap than the bank restarts at 1; gap with partial bank drains bank then restarts; milestone bonus credited once and with freeze gain; prayer milestone pays both; fast pays 20 on a fasting day and nothing meaningful off it; add/remove reward mutates catalog and posts feed lines; reward render flips to "reached" at cost.
- **Prior art.** The seam and state shape come from `prototype-reward-engine.html`, which uses the same pure-engine-plus-feed shape and the same milestone table; verified manually via Playwright before this spec.

## Out of Scope

- Real signup, multiple couples, invitation flows (ADR-0001 fixes the two-profile design)
- A food database, calories, macros, weight trends (ADR-0006 defers to v1.5 only if Jess asks)
- Gamifying the examen or per-person prayer points (ADR-0004, ADR-0005)
- A fixed reward ladder or purchasable against a catalog (ADR-0008)
- Notifications, reminders, push, or anything time-based
- Profile avatars, patron icons beyond static identity (patrons are shown as identity only, never gamified)
- The conversion table of base points, any jokers, or "rarity of large surprises" mentioned in ADR-0002 as later
- Desktop chrome or PWA install tooling

## Further Notes

- Three product questions the couple has not settled and this spec pins to defaults they can flip later by editing the engine:
  1. Freeze earnings default to bank-on-milestone (7/14/30, cap 2). The alternative is a flat one-per-week.
  2. Milestone bonus defaults to credited on the day the milestone runs, to the acting profile (both for prayer). The alternative is no bonus, streak only.
  3. A missed prayer payout does not roll over (ADR-0004 as written). The alternative is rolling the unclaimed payout into the next couple-day.
- The "four skipped days" wording in early drafts was a bug and is not the intent; the freeze cap of two makes two the honest max.
- Seeding happens once per fresh day file; the prototype's seeded PRNG (`setSeed`) is test-only and does not ship.
- Research files in the repo root record why each ADR is shaped the way it is; the two relevant to this spec are `research-dual-purpose-app.md` and `research-operant-conditioning.md`.