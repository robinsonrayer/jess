export function createEngine(){
  var seed = 20260909;
  function rnd(){ seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
  function roll(){ return 8 + Math.floor(rnd() * 8); }
  function doubling(){ return rnd() < 0.10; }

  var MILESTONES = { 7:25, 14:35, 30:50 };
  function name(actor){ return actor === "jess" ? "Jess" : "Robi"; }

  function fresh(){
    return {
      day: 1,
      fasting: false,
      profiles: {
        jess: { points:0, meal:null, mealRating:null, mealNote:null, mealPhoto:null,
                study:0, studyLabel:null, prayer:null, fast:null,
                encouraged:null, highlighted:null, difficultyMix:[0,0,0] },
        robi: { points:0, meal:null, mealRating:null, mealNote:null, mealPhoto:null,
                study:0, studyLabel:null, prayer:null, fast:null,
                encouraged:null, highlighted:null, difficultyMix:[0,0,0] }
      },
      streaks: {
        health: { count:0, bank:0, last:null },
        study:  { count:0, bank:0, last:null },
        prayer: { count:0, bank:0, last:null }
      },
      rewards: [
        { id:"marriage", name:"Marriage", cost:1000000 }
      ],
      feed: []
    };
  }

  function feed(s, text){ s.feed.push("Day " + s.day + " — " + text); }

  function clone(s){
    return {
      ...s,
      profiles: {
        jess: { ...s.profiles.jess, difficultyMix: s.profiles.jess.difficultyMix.slice() },
        robi: { ...s.profiles.robi, difficultyMix: s.profiles.robi.difficultyMix.slice() }
      },
      streaks: {
        health:  { ...s.streaks.health },
        study:   { ...s.streaks.study },
        prayer:  { ...s.streaks.prayer }
      },
      rewards: s.rewards.map(function(r){ return { ...r }; }),
      feed: s.feed.slice()
    };
  }

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

  function totalPoints(s){ return s.profiles.jess.points + s.profiles.robi.points; }

  function normalize(s){
    if (!s || !s.profiles) { return fresh(); }
    var f = fresh();
    ["jess", "robi"].forEach(function(k){
      var p = s.profiles[k] || {};
      s.profiles[k] = {
        ...f.profiles[k],
        ...p,
        difficultyMix: (p.difficultyMix && p.difficultyMix.length === 3) ? p.difficultyMix : [0,0,0]
      };
    });
    ["health", "study", "prayer"].forEach(function(k){
      s.streaks[k] = { ...f.streaks[k], ...(s.streaks && s.streaks[k]) };
    });
    if (!s.rewards) { s.rewards = f.rewards; }
    if (!s.feed) { s.feed = []; }
    return s;
  }

  return {
    setSeed: function(n){ seed = n; },
    fresh: fresh,
    normalize: normalize,
    totalPoints: totalPoints,

    advanceDay: function(s){
      return { ...s, day: s.day + 1 };
    },
    setFasting: function(s, on){ return { ...s, fasting: on }; },

    logMeal: function(s, actor, rating, note, photo){
      s = clone(s);
      var p = s.profiles[actor];
      var extra = rating === "Good" ? 5 : rating === "Okay" ? 2 : 0;
      var base = roll();
      var total = base + extra;
      var dbl = doubling();
      if (dbl) total *= 2;
      p.points += total;
      p.meal = s.day;
      p.mealRating = rating;
      if (note !== undefined) p.mealNote = note;
      if (photo !== undefined) p.mealPhoto = photo;
      var bs = bumpStreak(s, "health", s.day);
      var msg = name(actor) + " logged a meal — " + rating + ", +" + total + " pts" + (dbl ? " (doubled)" : "");
      if (bs.note === "milestone") {
        p.points += bs.points;
        msg += " · 🎈 health streak " + bs.points + " pts" + (bs.freezeGained ? " · +1 freeze" : "");
      }
      feed(s, msg);
      return s;
    },

    studyAction: function(s, actor, type, difficulty, label){
      s = clone(s);
      var p = s.profiles[actor];
      var extra = type === "problem" ? (difficulty === "Easy" ? 3 : difficulty === "Medium" ? 5 : 8) : 0;
      var total = roll() + extra;
      var dbl = doubling();
      if (dbl) total *= 2;
      p.points += total;
      p.study = s.day;
      if (type === "problem") {
        p.difficultyMix[difficulty === "Easy" ? 0 : difficulty === "Medium" ? 1 : 2]++;
      }
      if (label !== undefined) p.studyLabel = label;
      var bs = bumpStreak(s, "study", s.day);
      var what = type === "problem" ? difficulty + " problem" : "pomodoro";
      var msg = name(actor) + " finished a " + what + " · +" + total + " pts" + (dbl ? " (doubled)" : "");
      if (bs.note === "milestone") {
        p.points += bs.points;
        msg += " · 🎈 study streak " + bs.points + " pts" + (bs.freezeGained ? " · +1 freeze" : "");
      }
      feed(s, msg);
      return s;
    },

    pray: function(s, actor, via){
      s = clone(s);
      var p = s.profiles[actor];
      p.prayer = s.day;
      var bs = bumpStreak(s, "prayer", s.day);
      var msg = name(actor) + " " + (via === "examen" ? "did the examen" : "logged prayer");
      if (bs.note === "milestone") {
        s.profiles.jess.points += bs.points;
        s.profiles.robi.points += bs.points;
        msg += " · 🎈 prayer streak " + bs.points + " pts to each" + (bs.freezeGained ? " · +1 freeze" : "");
      }
      feed(s, msg + ".");

      var other = actor === "jess" ? "robi" : "jess";
      if (s.profiles[other].prayer === s.day) {
        var both = roll();
        var bd = doubling();
        if (bd) both *= 2;
        s.profiles.jess.points += both;
        s.profiles.robi.points += both;
        feed(s, "Both prayed together — +" + both + " each" + (bd ? " (doubled)" : "") + ".");
      }
      return s;
    },

    keepFast: function(s, actor){
      s = clone(s);
      if (!s.fasting) { return s; }
      var p = s.profiles[actor];
      if (p.fast === s.day) { return s; }
      p.fast = s.day;
      p.points += 20;
      feed(s, name(actor) + " kept the fast · +20 pts.");
      return s;
    },

    encourage: function(s, actor){
      s = clone(s);
      var p = s.profiles[actor];
      if (p.encouraged === s.day) { return s; }
      p.encouraged = s.day;
      var other = actor === "jess" ? "Robi" : "Jess";
      feed(s, name(actor) + " sent " + other + " encouragement.");
      return s;
    },

    highlight: function(s, actor){
      s = clone(s);
      var p = s.profiles[actor];
      var detail = actor === "jess" ? p.mealNote : p.studyLabel;
      if (!detail) { return s; }
      if (p.highlighted === s.day) { return s; }
      p.highlighted = s.day;
      feed(s, name(actor) + " shared a highlight: " + detail);
      return s;
    },

    addReward: function(s, name, cost){
      s = clone(s);
      var id = "r" + Date.now();
      s.rewards = s.rewards.concat([{ id:id, name:name, cost:cost }]);
      feed(s, "Reward added to the catalog: " + name + " at " + cost + " pts.");
      return s;
    },

    renameReward: function(s, id, name){
      s = clone(s);
      var r = s.rewards.filter(function(x){ return x.id === id; })[0];
      if (r) {
        r.name = name;
        feed(s, "Reward renamed to: " + name + ".");
      }
      return s;
    },

    removeReward: function(s, id){
      s = clone(s);
      var gone = s.rewards.filter(function(r){ return r.id === id; })[0];
      if (gone) {
        s.rewards = s.rewards.filter(function(r){ return r.id !== id; });
        feed(s, "Reward removed from the catalog: " + gone.name + ".");
      }
      return s;
    }
  };
}