import { test } from "node:test";
import assert from "node:assert/strict";
import { createEngine } from "../src/engine.js";
import { loadState, saveState, STATE_KEY } from "../src/storage.js";
import { isBindingFastDay, easterDate } from "../src/fasting.js";

function memoryStorage(){
  var mem = {};
  return {
    getItem: function(k){ return k in mem ? mem[k] : null; },
    setItem: function(k, v){ mem[k] = String(v); }
  };
}

function advance(s, n){
  const e = createEngine();
  const from = new Date(s.startedAt + "T00:00:00");
  from.setDate(from.getDate() + (s.day - 1) + n);
  const m = from.getMonth() + 1;
  const day = from.getDate();
  e.setToday(from.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (day < 10 ? "0" : "") + day);
  return e.autoAdvance(s);
}

test("fresh() seeds the full state shape", () => {
  const e = createEngine();
  const s = e.fresh();
  assert.equal(s.day, 1);
  assert.equal(s.fasting, false);
  assert.deepEqual(Object.keys(s.profiles).sort(), ["jess", "robi"]);
  for (const k of ["points", "meals", "studies", "prayer", "fast", "chastity", "difficultyMix"]) {
    assert.ok(k in s.profiles.jess, "jess has " + k);
    assert.ok(k in s.profiles.robi, "robi has " + k);
  }
  assert.deepEqual(s.profiles.jess.difficultyMix, [0, 0, 0]);
  assert.deepEqual(Object.keys(s.streaks).sort(), ["health", "prayer", "study"]);
  for (const k of Object.keys(s.streaks)) assert.deepEqual(s.streaks[k], { count:0, bank:0, last:null });
  assert.deepEqual(s.feed, []);
  assert.equal(s.rewards.length, 1);
});

test("fresh() seeds the reward catalog with Marriage at 1,000,000", () => {
  const s = createEngine().fresh();
  assert.equal(s.rewards[0].name, "Marriage");
  assert.equal(s.rewards[0].cost, 1000000);
  assert.ok(s.rewards[0].id);
});

test("fresh() returns a new object per call", () => {
  const e = createEngine();
  const a = e.fresh();
  a.profiles.jess.points = 50;
  assert.equal(e.fresh().profiles.jess.points, 0);
});

test("fresh() state totals zero", () => {
  assert.equal(createEngine().totalPoints(createEngine().fresh()), 0);
});

test("normalize() backfills new fields onto a legacy state shape", () => {
  const e = createEngine();
  const legacy = { day: 3, fasting: false,
    profiles: {
      jess: { points: 7, meal: 2 },
      robi: { points: 9, study: 1 }
    },
    streaks: { health: { count: 2, last: 2 } },
    rewards: [], feed: [] };
  const s = e.normalize(legacy);
  for (const k of ["jess", "robi"]) {
    assert.equal(s.profiles[k].difficultyMix.length, 3);
    assert.equal(s.profiles[k].prayer, null);
    assert.equal(s.profiles[k].fast, null);
    assert.deepEqual(s.profiles[k].chastity, []);
  }
  assert.equal(s.profiles.jess.points, 7);
  assert.equal(s.profiles.jess.meals.length, 1);
  assert.deepEqual(s.profiles.jess.meals[0], { day: 2, rating: null, note: "", photo: "" });
  assert.equal(s.profiles.robi.studies.length, 1);
  assert.equal(s.profiles.robi.studies[0].day, 1);
  assert.equal(s.profiles.robi.studies[0].type, "pomodoro");
  assert.deepEqual(s.streaks.study, { count:0, bank:0, last:null });
  assert.equal(s.streaks.health.last, 2);
  assert.deepEqual(s.rewards, []);
});

test("normalize() tolerates a null or malformed state", () => {
  const e = createEngine();
  assert.equal(e.normalize(null).day, 1);
  const s = e.normalize({});
  assert.ok(s.profiles && s.rewards && s.streaks);
});

test("storage round-trips the full state", () => {
  const store = memoryStorage();
  const s = createEngine().fresh();
  s.day = 4;
  s.profiles.jess.points = 42;
  s.rewards.push({ id: "r1", name: "movie night", cost: 500 });
  saveState(s, store);
  assert.deepEqual(loadState(store), s);
  assert.ok(store.getItem(STATE_KEY).length > 0);
});

test("storage returns null when empty", () => {
  assert.equal(loadState(memoryStorage()), null);
});

test("storage survives a corrupt payload", () => {
  const store = memoryStorage();
  store.setItem(STATE_KEY, "{not json");
  assert.equal(loadState(store), null);
});

/* ----- Meal logging (ticket 02) ----- */

test("meal: a Miss still counts toward the streak and earns base", () => {
  const e = createEngine();
  let s = e.fresh();
  s = e.logMeal(s, "jess", "Miss");
  assert.equal(s.streaks.health.count, 1);
  assert.ok(s.profiles.jess.points >= 8, "Miss pays the 8-15 base");
});

test("meal: streak advances once per day no matter how many meals", () => {
  const e = createEngine();
  let s = e.fresh();
  s = e.logMeal(s, "jess", "Good");
  s = e.logMeal(s, "jess", "Okay");
  assert.equal(s.streaks.health.count, 1);
  assert.equal(s.streaks.health.last, 1);
});

test("meal: Good out-earns Okay out-earns Miss on the same base", () => {
  const e = createEngine();
  const run = (r) => { e.setSeed(3); return e.logMeal(e.fresh(), "jess", r).profiles.jess.points; };
  const good = run("Good"), okay = run("Okay"), miss = run("Miss");
  assert.ok(good > okay, "Good > Okay");
  assert.ok(okay > miss, "Okay > Miss");
});

test("meal: base rolls 8-15 and doubling exists under some seed", () => {
  const e = createEngine();
  let sawBase = null;
  let doubled = null;
  for (let seed = 1; seed < 200 && (!sawBase || !doubled); seed++) {
    e.setSeed(seed);
    const s = e.logMeal(e.fresh(), "jess", "Miss");
    if (s.feed[0].includes("(doubled)")) {
      doubled = doubled || s;
    } else if (!sawBase && s.profiles.jess.points >= 8 && s.profiles.jess.points <= 15) {
      sawBase = s.profiles.jess.points;
    }
  }
  assert.ok(sawBase !== null, "a non-doubled base inside 8-15 exists");
  assert.ok(doubled, "a doubled roll exists");
  assert.ok(doubled.feed[0].includes("(doubled)"));
});

test("meal: note and photo stay on the entry, note is published to the feed", () => {
  const e = createEngine();
  const s = e.logMeal(e.fresh(), "jess", "Good", "had a rough lunch", "data:img");
  assert.equal(s.profiles.jess.meals.length, 1);
  assert.equal(s.profiles.jess.meals[0].day, 1);
  assert.equal(s.profiles.jess.meals[0].note, "had a rough lunch");
  assert.equal(s.profiles.jess.meals[0].photo, "data:img");
  assert.ok(s.feed.some(l => l.includes("rough lunch")), "note reaches the feed");
});

test("meal: each meal is its own entry, all logged the same day", () => {
  const e = createEngine();
  let s = e.fresh();
  s = e.logMeal(s, "jess", "Good", "breakfast", "data:1");
  s = e.logMeal(s, "jess", "Okay", "lunch", "data:2");
  s = e.logMeal(s, "jess", "Miss", "", "data:3");
  assert.equal(s.profiles.jess.meals.length, 3);
  assert.equal(s.streaks.health.count, 1, "streak still advances once");
  assert.equal(s.profiles.jess.meals[2].note, "");
  assert.ok(s.profiles.jess.meals.every(m => m.day === 1));
  assert.equal(s.feed.filter(l => l.includes("logged a meal")).length, 3);
});

test("meal: photos are pruned after 3 days, notes are kept forever", () => {
  const e = createEngine();
  let s = e.fresh();
  s = e.logMeal(s, "jess", "Good", "breakfast", "data:1");
  s = advance(s, 1);
  s = e.logMeal(s, "jess", "Good", "dinner", "data:2");
  s = advance(s, 1);
  s = e.logMeal(s, "jess", "Good", "lunch", "data:3");
  s = advance(s, 1);
  s = e.logMeal(s, "jess", "Good", "snack", "data:4");
  assert.equal(s.profiles.jess.meals.length, 4);
  assert.equal(s.profiles.jess.meals[0].photo, "", "day-1 photo dropped at day 4");
  assert.equal(s.profiles.jess.meals[0].note, "breakfast", "note kept");
  assert.equal(s.profiles.jess.meals[1].photo, "data:2", "day-2 photo kept");
  assert.equal(s.profiles.jess.meals[2].photo, "data:3");
  assert.equal(s.profiles.jess.meals[3].photo, "data:4");
});

test("meal: within the 3-day window photos survive several advances", () => {
  const e = createEngine();
  let s = e.logMeal(e.fresh(), "jess", "Good", "", "data:1");
  for (let d = 0; d < 2; d++) s = advance(s, 1);
  assert.equal(s.profiles.jess.meals[0].photo, "data:1");
});

test("meal: rating and photo are shared fields by default", () => {
  const e = createEngine();
  const s = e.logMeal(e.fresh(), "jess", "Okay", undefined, "data:img");
  assert.equal(s.profiles.jess.meals[0].rating, "Okay");
  assert.equal(s.profiles.jess.meals[0].photo, "data:img");
});

test("meal: daily advance logs build a growing streak", () => {
  const e = createEngine();
  let s = e.fresh();
  for (let d = 1; d <= 3; d++) {
    s = e.logMeal(s, "jess", "Good");
    if (d < 3) s = advance(s, 1);
  }
  assert.equal(s.streaks.health.count, 3);
});

/* ----- Study logging (ticket 03) ----- */

test("study: pomodoro advances the study streak once per day", () => {
  const e = createEngine();
  let s = e.fresh();
  s = e.studyAction(s, "robi", "pomodoro");
  s = e.studyAction(s, "robi", "pomodoro");
  assert.equal(s.streaks.study.count, 1);
  assert.equal(s.profiles.robi.studies.length, 2);
});

test("study: harder problems pay more on the same base", () => {
  const e = createEngine();
  const run = (d) => { e.setSeed(9); return e.studyAction(e.fresh(), "robi", "problem", d).profiles.robi.points; };
  assert.ok(run("Hard") > run("Medium"), "Hard > Medium");
  assert.ok(run("Medium") > run("Easy"), "Medium > Easy");
});

test("study: difficulty mix counts E/M/H", () => {
  const e = createEngine();
  let s = e.fresh();
  s = e.studyAction(s, "robi", "problem", "Easy", "sliding window warmup");
  s = e.studyAction(s, "robi", "problem", "Medium", "two pointers with a twist");
  s = e.studyAction(s, "robi", "problem", "Hard", "kadane on steroids");
  s = e.studyAction(s, "robi", "pomodoro");
  assert.deepEqual(s.profiles.robi.difficultyMix, [1, 1, 1]);
  assert.equal(s.profiles.robi.studies.length, 4);
  assert.equal(s.profiles.robi.studies[3].type, "pomodoro");
  assert.equal(s.profiles.robi.studies[3].difficulty, null);
});

test("study: each entry carries its own label by default", () => {
  const e = createEngine();
  const s = e.studyAction(e.fresh(), "robi", "problem", "Medium", "two pointers with a twist");
  assert.equal(s.profiles.robi.studies[0].label, "two pointers with a twist");
  assert.equal(s.profiles.robi.studies[0].difficulty, "Medium");
});

test("study: feed line is neutral, never judgment-bearing", () => {
  const e = createEngine();
  const s = e.studyAction(e.fresh(), "robi", "problem", "Hard");
  assert.ok(/Robi finished a Hard problem · \+[0-9]+ pts/.test(s.feed[0]));
});

/* ----- Prayer and examen (ticket 04) ----- */

test("prayer: alone grows the shared streak but pays nothing", () => {
  const e = createEngine();
  const s = e.pray(e.fresh(), "jess", "button");
  assert.equal(s.streaks.prayer.count, 1);
  assert.equal(s.profiles.jess.points, 0);
});

test("prayer: second partner same day pays both", () => {
  const e = createEngine();
  let s = e.pray(e.fresh(), "jess", "button");
  s = e.pray(s, "robi", "button");
  assert.ok(s.profiles.jess.points > 0);
  assert.equal(s.profiles.jess.points, s.profiles.robi.points);
  assert.ok(s.feed.some(l => l.includes("Both prayed together")));
});

test("prayer: second partner next day pays nothing (no rollover)", () => {
  const e = createEngine();
  let s = e.pray(e.fresh(), "jess", "button");
  s = advance(s, 1);
  s = e.pray(s, "robi", "button");
  assert.equal(s.profiles.jess.points, 0);
  assert.equal(s.profiles.robi.points, 0);
});

test("prayer: examen counts as praying, neutral line, zero points", () => {
  const e = createEngine();
  const s = e.pray(e.fresh(), "robi", "examen");
  assert.equal(s.profiles.robi.prayer, 1);
  assert.equal(s.streaks.prayer.count, 1);
  assert.equal(s.profiles.robi.points, 0);
  assert.ok(s.feed.some(l => l.includes("Robi did the examen")));
});

test("feed: the typed examen note is published to the encouragement", () => {
  const e = createEngine();
  const s = e.pray(e.fresh(), "jess", "examen", "I was kinder than I meant to be");
  assert.ok(s.feed.some(l => l.includes("did the examen") && l.includes("I was kinder than I meant to be")));
});

test("feed: a meal note is published to the encouragement", () => {
  const e = createEngine();
  const s = e.logMeal(e.fresh(), "jess", "Good", "chicken and dal, felt light");
  assert.ok(s.feed.some(l => l.includes("logged a meal") && l.includes("chicken and dal, felt light")));
});

test("prayer: logging twice same day does not double the streak", () => {
  const e = createEngine();
  let s = e.pray(e.fresh(), "jess", "button");
  s = e.pray(s, "jess", "examen");
  assert.equal(s.streaks.prayer.count, 1);
});

test("prayer: a second tap the same day is a no-op unless it is the examen", () => {
  const e = createEngine();
  let s = e.pray(e.fresh(), "robi", "button");
  const lines = s.feed.length;
  const same = e.pray(s, "robi", "button");
  assert.equal(same.feed.length, lines);
  assert.equal(JSON.stringify(same), JSON.stringify(s));
  const examen = e.pray(s, "robi", "examen");
  assert.equal(examen.feed[examen.feed.length - 1], "Day 1 — Robi did the examen.");
  assert.equal(examen.streaks.prayer.count, 1);
  assert.equal(examen.profiles.robi.points, s.profiles.robi.points);
  assert.equal(JSON.stringify(examen.profiles), JSON.stringify(s.profiles));
});

/* ----- Fasting (ticket 05) ----- */

test("fast: keeps the fast once per person per day for flat 20", () => {
  const e = createEngine();
  let s = e.setFasting(e.fresh(), true);
  s = e.keepFast(s, "jess");
  s = e.keepFast(s, "jess");
  assert.equal(s.profiles.jess.points, 20);
  assert.equal(s.profiles.jess.fast, 1);
  s = e.keepFast(s, "robi");
  assert.equal(s.profiles.robi.points, 20);
});

test("fast: a kept fast posts a neutral feed line", () => {
  const e = createEngine();
  const s = e.keepFast(e.setFasting(e.fresh(), true), "robi");
  assert.ok(s.feed.some(l => l.includes("Robi kept the fast · +20 pts")));
});

test("fast: dead button on a non-binding day", () => {
  const e = createEngine();
  const s = e.keepFast(e.fresh(), "jess");
  assert.equal(s.profiles.jess.points, 0);
  assert.deepEqual(s, e.fresh());
});

test("fast: binding days are Fridays, Ash Wednesday, Good Friday", () => {
  assert.equal(isBindingFastDay(new Date(2026, 0, 2)), true, "Friday");
  assert.equal(isBindingFastDay(new Date(2026, 0, 5)), false, "Monday");
  assert.equal(isBindingFastDay(new Date(2026, 1, 18)), true, "Ash Wednesday 2026-02-18");
  assert.equal(isBindingFastDay(new Date(2026, 3, 3)), true, "Good Friday 2026-04-03");
  assert.equal(easterDate(2026).getDay(), 0, " Studied Easter is a Sunday");
  assert.equal(isBindingFastDay(easterDate(2026)), false, "Easter itself is not binding");
});

/* ----- Chastity ----- */

test("chastity: logs once per person per day, zero points", () => {
  const e = createEngine();
  let s = e.fresh();
  s = e.keepChastity(s, "jess");
  assert.equal(s.profiles.jess.chastity.length, 1);
  assert.equal(s.profiles.jess.chastity[0].day, 1);
  assert.equal(s.profiles.jess.points, 0);
  s = e.keepChastity(s, "jess");
  assert.equal(s.profiles.jess.chastity.length, 1, "no duplicate");
});

test("chastity: each partner logs independently", () => {
  const e = createEngine();
  let s = e.fresh();
  s = e.keepChastity(s, "jess");
  s = e.keepChastity(s, "robi");
  assert.equal(s.profiles.jess.chastity.length, 1);
  assert.equal(s.profiles.robi.chastity.length, 1);
});

test("chastity: posts a feed line", () => {
  const e = createEngine();
  const s = e.keepChastity(e.fresh(), "jess");
  assert.ok(s.feed.some(l => l.includes("Jess kept chastity today")));
});

test("chastity: survives normalize", () => {
  const e = createEngine();
  let s = e.fresh();
  s = e.keepChastity(s, "jess");
  const n = e.normalize(s);
  assert.equal(n.profiles.jess.chastity.length, 1);
  assert.equal(n.profiles.jess.chastity[0].day, 1);
});

test("chastity: input state not mutated", () => {
  const e = createEngine();
  const before = e.fresh();
  e.keepChastity(before, "jess");
  assert.deepEqual(before, e.fresh());
});

/* ----- Streak protection and milestones (ticket 06) ----- */

test("streak: a one-day gap burns one freeze and holds the count", () => {
  const e = createEngine();
  let s = e.fresh();
  for (let d = 1; d <= 7; d++) {
    s = e.logMeal(s, "jess", "Good");
    if (d < 7) s = advance(s, 1);
  }
  assert.equal(s.streaks.health.count, 7);
  assert.equal(s.streaks.health.bank, 1, "milestone banks a freeze");
  s = advance(s, 2);
  s = e.logMeal(s, "jess", "Good");
  assert.equal(s.streaks.health.count, 7, "count held, no restart");
  assert.equal(s.streaks.health.bank, 0, "freeze burned");
});

test("streak: a wider gap than the bank restarts at 1", () => {
  const e = createEngine();
  let s = e.fresh();
  for (let d = 1; d <= 7; d++) {
    s = e.logMeal(s, "jess", "Good");
    if (d < 7) s = advance(s, 1);
  }
  assert.equal(s.streaks.health.bank, 1);
  s = advance(s, 5);
  s = e.logMeal(s, "jess", "Good");
  assert.equal(s.streaks.health.count, 1);
  assert.equal(s.streaks.health.bank, 0, "bank drained then restart");
});

test("streak: one-day gap with no freeze restarts at 1", () => {
  const e = createEngine();
  let s = e.fresh();
  s = e.logMeal(s, "jess", "Good");
  s = advance(s, 2);
  s = e.logMeal(s, "jess", "Good");
  assert.equal(s.streaks.health.count, 1);
});

test("streak: milestone banks a freeze (cap 2) with bonus to acting profile", () => {
  const e = createEngine();
  let s = e.fresh();
  for (let d = 1; d <= 14; d++) {
    s = e.logMeal(s, "jess", "Good");
    if (d < 14) s = advance(s, 1);
  }
  assert.equal(s.streaks.health.count, 14);
  assert.equal(s.streaks.health.bank, 2);
  assert.ok(s.profiles.jess.points >= 35, "day-14 milestone paid");
  assert.equal(s.profiles.robi.points, 0, "health milestone is acting-profile only");
  assert.equal(s.streaks.health.bank, 2, "cap holds");
});

test("streak: 30-day bonus is 50", () => {
  const e = createEngine();
  let s = e.fresh();
  for (let d = 1; d <= 30; d++) {
    s = e.studyAction(s, "robi", "pomodoro");
    if (d < 30) s = advance(s, 1);
  }
  assert.equal(s.streaks.study.count, 30);
  assert.equal(s.streaks.study.bank, 2);
  assert.ok(s.feed.some(l => l.includes("study streak 50 pts")), "day-30 milestone line");
  assert.ok(s.profiles.robi.points >= 50, "day-30 bonus paid to Robi");
  assert.equal(s.profiles.jess.points, 0);
});

test("streak: prayer milestone pays both profiles", () => {
  const e = createEngine();
  let s = e.fresh();
  for (let d = 1; d <= 7; d++) {
    s = e.pray(s, "jess", "button");
    if (d < 7) s = advance(s, 1);
  }
  assert.equal(s.streaks.prayer.count, 7);
  assert.equal(s.profiles.jess.points, 25);
  assert.equal(s.profiles.robi.points, 25);
});

/* ----- Reward catalog (ticket 07) ----- */

test("rewards: add, rename, remove mutate catalog and post lines", () => {
  const e = createEngine();
  let s = e.fresh();
  s = e.addReward(s, "movie night", 500);
  assert.equal(s.rewards[1].name, "movie night");
  assert.equal(s.rewards[1].cost, 500);
  const id = s.rewards[1].id;
  s = e.renameReward(s, id, "marathon night");
  assert.equal(s.rewards[1].name, "marathon night");
  s = e.removeReward(s, id);
  assert.equal(s.rewards.length, 1);
  assert.ok(s.feed.some(l => l.includes("Reward added to the catalog: movie night at 500 pts")));
  assert.ok(s.feed.some(l => l.includes("Reward removed from the catalog: marathon night")));
  assert.ok(s.feed.some(l => l.includes("Reward renamed to: marathon night")));
});

test("rewards: remove of an unknown id is a no-op", () => {
  const e = createEngine();
  const s = e.removeReward(e.fresh(), "nope");
  assert.deepEqual(s, e.fresh());
});

test("pool: totalPoints sums both profiles", () => {
  const e = createEngine();
  let s = e.fresh();
  s = e.logMeal(s, "jess", "Good");
  s = e.studyAction(s, "robi", "problem", "Hard");
  assert.equal(e.totalPoints(s), s.profiles.jess.points + s.profiles.robi.points);
});

/* ----- Encouragement and highlight lines (ticket 08) ----- */

test("feed: every encourage tap posts its own line (no daily cap)", () => {
  const e = createEngine();
  let s = e.fresh();
  s = e.encourage(s, "robi");
  s = e.encourage(s, "robi");
  assert.equal(s.feed.filter(l => l.includes("sent Jess encouragement")).length, 2);
});

test("feed: an explicit flirt message is delivered in the line", () => {
  const e = createEngine();
  const s = e.encourage(e.fresh(), "jess", "a kiss 💋");
  assert.ok(s.feed.some(l => l.includes("Jess sent Robi a kiss 💋")));
});

test("feed: lines are day-tagged", () => {
  const e = createEngine();
  let s = e.logMeal(e.fresh(), "jess", "Good");
  s = advance(s, 1);
  s = e.studyAction(s, "robi", "problem", "Hard");
  assert.ok(s.feed[0].startsWith("Day 1 — "), s.feed[0]);
  assert.ok(s.feed[1].startsWith("Day 2 — "), s.feed[1]);
});

/* ----- Auto-advance ----- */

test("day is derived from startedAt, not stored", () => {
  const e = createEngine();
  e.setToday("2026-09-10");
  let s = e.fresh();
  assert.equal(s.day, 1);
  s = e.logMeal(s, "jess", "Good");
  e.setToday("2026-09-13");
  s = e.autoAdvance(s);
  assert.equal(s.day, 4, "3 calendar days later is day 4");
  assert.equal(s.profiles.jess.meals[0].day, 1, "logged on day 1 stays day 1");
});

test("autoAdvance uses the injected clock", () => {
  const e = createEngine();
  e.setToday("2026-09-10");
  const s = e.fresh();
  e.setToday("2026-09-11");
  assert.equal(e.autoAdvance(s).day, 2);
  e.setToday("2026-09-10");
  assert.equal(e.autoAdvance(s).day, 1, "same calendar day does not advance");
});

test("normalize backfills startedAt and derives day for legacy states", () => {
  const e = createEngine();
  e.setToday("2026-09-10");
  const legacy = { day: 99, fasting: false, profiles: { jess: {}, robi: {} },
    streaks: {}, rewards: [], feed: [] };
  const s = e.normalize(legacy);
  assert.equal(s.startedAt, "2026-09-10");
  assert.equal(s.day, 1, "no startedAt means day 1");
});

test("startedAt survives clone and is untouched by actions", () => {
  const e = createEngine();
  e.setToday("2026-09-10");
  let s = e.fresh();
  s = e.keepChastity(s, "jess");
  assert.equal(s.startedAt, "2026-09-10");
});

/* ----- Immutability ----- */

test("actions never mutate the input state", () => {
  const e = createEngine();
  const cases = [
    s => e.logMeal(s, "jess", "Good", "n", "img"),
    s => e.studyAction(s, "robi", "problem", "Hard", "lbl"),
    s => e.pray(s, "jess", "examen"),
    s => e.keepFast(e.setFasting(s, true), "jess"),
    s => e.keepChastity(s, "jess"),
    s => e.encourage(s, "jess"),
    s => e.addReward(s, "x", 1),
    s => e.renameReward(s, "r1", "y"),
    s => e.removeReward(s, "r1")
  ];
  for (const fn of cases) {
    const before = e.fresh();
    fn(before);
    assert.deepEqual(before, e.fresh());
  }
});