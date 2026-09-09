import { test } from "node:test";
import assert from "node:assert/strict";
import { createEngine } from "../src/engine.js";
import { loadState, saveState, STATE_KEY } from "../src/storage.js";

function memoryStorage(){
  var mem = {};
  return {
    getItem: function(k){ return k in mem ? mem[k] : null; },
    setItem: function(k, v){ mem[k] = String(v); }
  };
}

test("fresh() seeds the full state shape", () => {
  const e = createEngine();
  const s = e.fresh();
  assert.equal(s.day, 1);
  assert.equal(s.fasting, false);
  assert.deepEqual(Object.keys(s.profiles).sort(), ["jess", "robi"]);
  for (const k of ["points", "meal", "study", "prayer", "fast", "difficultyMix"]) {
    assert.ok(k in s.profiles.jess, "jess has " + k);
    assert.ok(k in s.profiles.robi, "robi has " + k);
  }
  assert.deepEqual(s.profiles.jess.difficultyMix, [0, 0, 0]);
  assert.deepEqual(s.profiles.robi.difficultyMix, [0, 0, 0]);
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
  assert.notEqual(e.fresh(), e.fresh());
  const a = e.fresh();
  a.profiles.jess.points = 50;
  const b = e.fresh();
  assert.equal(b.profiles.jess.points, 0);
});

test("fresh() state totals zero", () => {
  const s = createEngine().fresh();
  assert.equal(createEngine().totalPoints(s), 0);
});

test("storage round-trips the full state", () => {
  const store = memoryStorage();
  const e = createEngine();
  const s = e.fresh();
  s.day = 4;
  s.profiles.jess.points = 42;
  s.rewards.push({ id: "r1", name: "movie night", cost: 500 });
  saveState(s, store);
  const restored = loadState(store);
  assert.deepEqual(restored, s);
  assert.equal(store.getItem(STATE_KEY).length > 0, true);
});

test("storage returns null when empty", () => {
  assert.equal(loadState(memoryStorage()), null);
});

test("storage survives a corrupt payload", () => {
  const store = memoryStorage();
  store.setItem(STATE_KEY, "{not json");
  assert.equal(loadState(store), null);
});

test("actions do not mutate the input state", () => {
  const e = createEngine();
  const before = e.fresh();
  e.logMeal(before, "jess", "Good");
  assert.equal(before.profiles.jess.points, 0);
  assert.equal(before.profiles.jess.meal, null);
  assert.equal(before.streaks.health.count, 0);
  assert.deepEqual(before.feed, []);

  e.studyAction(before, "robi", "problem", "Hard");
  assert.equal(before.profiles.robi.points, 0);
  assert.equal(before.profiles.robi.difficultyMix[2], 0);

  e.pray(before, "jess", "button");
  assert.equal(before.profiles.jess.prayer, null);

  e.keepFast(before, "robi");
  assert.deepEqual(before, e.fresh());

  const withFast = e.fresh();
  e.setFasting(withFast, true);
  const notFasting = e.fresh();
  e.keepFast(notFasting, "robi");
  assert.equal(notFasting.profiles.robi.points, 0);
  assert.deepEqual(notFasting.feed, []);
});

test("actions produce a new state, not a reused reference", () => {
  const e = createEngine();
  const before = e.fresh();
  const after = e.logMeal(before, "jess", "Good");
  assert.notEqual(after, before);
  assert.notEqual(after.profiles, before.profiles);
  assert.notEqual(after.profiles.jess, before.profiles.jess);
  assert.notEqual(after.streaks, before.streaks);
  assert.notEqual(after.rewards, before.rewards);
  assert.notEqual(after.feed, before.feed);
});