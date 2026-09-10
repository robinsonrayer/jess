import { createEngine } from "./engine.js";
import { loadState, saveState, makeStorage } from "./storage.js";
import { SHARED_PASSWORD } from "./password.js";
import { startSync, pushState } from "./firebase.js";
import { isBindingFastDay } from "./fasting.js";

const storage = makeStorage();
const engine = createEngine();
let state;
let actor = null;
let first = true;
let mealPhoto = null;

const SESSION_KEY = "two-to-one.session.v1";

function show(id){
  document.querySelectorAll(".screen").forEach(function(el){ el.classList.remove("active"); });
  document.getElementById(id).classList.add("active");
}

function switchView(name){
  document.querySelectorAll(".view").forEach(function(el){ el.classList.remove("active"); });
  document.getElementById("view-" + name).classList.add("active");
  document.querySelectorAll(".tab").forEach(function(el){
    el.classList.toggle("active", el.dataset.view === name);
  });
  if (name === "feed") flirtToastFor();
}

const FLIRT_SEEN_KEY = "two-to-one.flirt.seen.v1";
let toastTimer = null;

function showToast(html){
  const t = document.getElementById("toast");
  t.innerHTML = html;
  t.classList.add("show");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(function(){ t.classList.remove("show"); }, 4500);
}

function flirtToastFor(){
  const meName = actor === "jess" ? "Jess" : "Robi";
  const themName = actor === "jess" ? "Robi" : "Jess";
  const pre = new RegExp("^Day \\d+ — " + themName + " sent " + meName + " ");
  let last = null;
  state.feed.forEach(function(l){ if (pre.test(l)) last = l; });
  if (!last) return;
  const seen = JSON.parse(storage.getItem(FLIRT_SEEN_KEY) || "[]");
  if (seen.indexOf(last) !== -1) return;
  seen.push(last);
  storage.setItem(FLIRT_SEEN_KEY, JSON.stringify(seen));
  showToast("<strong>" + themName + " sent you:</strong> " + esc(last.replace(pre, "")));
}

function persist(){
  saveState(state, storage);
  pushState(state);
}

function adoptCloudState(cloud){
  state = engine.normalize(cloud);
  syncFastingFlag();
  render();
}

function fmtPoints(n){ return n.toLocaleString("en-IN"); }

function esc(s){
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function other(i){ return i === "jess" ? "robi" : "jess"; }

function todayDone(p, field){ return p[field] === state.day; }

/* ----- Reward catalog (ticket 07) ----- */

function rewardRow(r, t){
  const raw = t / r.cost * 100;
  const pctText = raw >= 1 ? Math.round(raw) + "%" : (raw > 0 ? raw.toFixed(1) + "%" : "0%");
  const barW = t > 0 ? Math.max(raw, 4) : 0;
  const reached = t >= r.cost;
  return "<div class='reward" + (reached ? " reached" : "") + "'>" +
    "<div class='reward-top'><span class='reward-name'>" + esc(r.name) + "</span>" +
    "<span class='reward-cost'>" + (reached ? "reached ✓" : "at " + fmtPoints(r.cost) + " pts") + "</span></div>" +
    "<div class='bar'><div style='width:" + barW + "%'></div></div>" +
    "<div class='reward-pct'>" + pctText + " of the way</div>" +
    "<div class='reward-edit'><button data-action='rename' data-id='" + r.id + "'>Rename</button>" +
    "<button data-action='remove' data-id='" + r.id + "'>Remove</button></div></div>";
}

function renderRewards(){
  const t = engine.totalPoints(state);
  const rw = document.getElementById("rewards");
  rw.innerHTML = state.rewards.map(function(r){ return rewardRow(r, t); }).join("") ||
    "<div class='feed-empty'>No rewards yet — add one to dream about.</div>";
  document.getElementById("bof-total").textContent = fmtPoints(t);
}

/* ----- Streak table ----- */

function renderStreaks(){
  const set = function(id, st){
    document.getElementById("s-" + id).textContent = st.count;
    document.getElementById("s-" + id + "-b").textContent = st.bank;
    document.getElementById("s-" + id + "-l").textContent = st.last ?? "—";
  };
  set("health", state.streaks.health);
  set("study", state.streaks.study);
  set("pray", state.streaks.prayer);
}

/* ----- Feed (ticket 08) ----- */

function renderFeed(){
  const feedEl = document.getElementById("feed");
  feedEl.innerHTML = state.feed.slice().reverse().map(function(l){
    return "<div class='feedline'>" + esc(l) + "</div>";
  }).join("") || "<div class='feed-empty'>No activity yet. The first step writes the first line.</div>";
}

/* ----- Today: acting profile's log zone (tickets 02, 03, 04, 05) ----- */

function photoTag(src, label){
  return src ? "<img class='meal-photo' src='" + src + "' alt='" + label + "'>" : "";
}

function mealThumb(m, mi, owner, showNote){
  return "<span class='meal-thumb' data-owner='" + owner + "' data-mi='" + mi + "' data-note='" + (showNote ? "1" : "0") + "'>" +
    (m.photo
      ? "<img class='thumb-img' src='" + m.photo + "' alt='meal'>" +
        "<span class='thumb-rating'>" + esc(m.rating) + "</span>"
      : "<span class='thumb-none'>" + esc(m.rating || "meal") + "</span>") +
    "</span>";
}

function studyLine(st){
  const kind = st.type === "problem" ? (st.difficulty || "Problem") : "Pomodoro";
  return "<div class='study-line'><span class='study-tag " + (st.type === "problem" ? "diff-" + kind.toLowerCase() : "pomodoro") + "'>" +
    esc(kind) + "</span>" + (st.label ? "<em>" + esc(st.label) + "</em>" : "") + "</div>";
}

function studyDays(entries){
  const recent = entries.filter(st => st.day >= state.day - 2);
  if (!recent.length) return "";
  const days = [...new Set(recent.map(st => st.day))].sort((a, b) => b - a);
  let out = "";
  days.forEach(d => {
    out += "<p class='rubric'>Day " + d + "</p><div class='study-list'>";
    recent.forEach(st => { if (st.day === d) out += studyLine(st); });
    out += "</div>";
  });
  return out;
}

function openLightbox(owner, mi, showNote){
  const m = state.profiles[owner].meals[mi];
  if (!m) return;
  const img = document.getElementById("lb-img");
  img.src = m.photo || "";
  img.style.display = m.photo ? "block" : "none";
  const caption = document.getElementById("lb-caption");
  caption.innerHTML = "<strong>" + esc(m.rating || "meal") + "</strong> · Day " + m.day +
    (showNote && m.note ? "<em>" + esc(m.note) + "</em>" : "");
  document.getElementById("lightbox").classList.remove("hidden");
}

function closeLightbox(){
  document.getElementById("lightbox").classList.add("hidden");
}

function renderLogZone(){
  const zone = document.getElementById("log-zone");
  const p = state.profiles[actor];

  let block = "";

  if (actor === "jess") {
    const meals = p.meals || [];
    const todays = meals.filter(m => m.day === state.day);
    const past = meals.filter(m => m.day !== state.day);
    block += "<div class='panel'><div class='panel-head'><h3>Today's meals</h3></div>" +
      "<p class='rubric'>meat and fruit first, light on sweets and packaged stuff</p>" +
      "<div class='meal-photo-row'><button class='act-btn' id='meal-photo-btn'>Add a photo</button>" +
      "<input type='file' id='meal-photo-input' accept='image/*' hidden></div>" +
      "<div id='meal-photo-preview'></div>" +
      "<div class='rating-row'><span class='act-btn rating good' data-rating='Good'>Good</span>" +
      "<span class='act-btn rating okay' data-rating='Okay'>Okay</span>" +
      "<span class='act-btn rating miss' data-rating='Miss'>Miss</span></div>" +
      "<input type='text' id='meal-note' placeholder='a note for the encouragement feed' autocomplete='off'>";
    if (!todays.length) {
      block += "<p class='feed-empty'>No meal logged today yet.</p>";
    } else {
      let grid = "";
      meals.forEach(function(m, i){
        if (m.day === state.day) grid += mealThumb(m, i, actor, true);
      });
      block += "<div class='thumb-grid'>" + grid + "</div>";
    }
    block += "</div>";
    if (past.length) {
      block += "<details class='past-days'><summary>Past meals</summary>";
      const days = [...new Set(past.map(m => m.day))].sort((a, b) => b - a);
      days.forEach(d => {
        block += "<p class='rubric'>Day " + d + "</p><div class='thumb-grid'>";
        meals.forEach(function(m, i){
          if (m.day === d) block += mealThumb(m, i, actor, true);
        });
        block += "</div>";
      });
      block += "<p class='feed-empty'>Photos are kept for the last 3 days; ratings and notes stay forever.</p>";
      block += "</details>";
    }
  } else {
    const studies = p.studies || [];
    const todaysS = studies.filter(m => m.day === state.day);
    const pastS = studies.filter(m => m.day !== state.day);
    block += "<div class='panel'><div class='panel-head'><h3>Today's study</h3></div>" +
      "<div class='study-row'><span class='act-btn' id='study-pomodoro'>Pomodoro</span></div>" +
      "<p class='rubric'>or a problem, by difficulty</p>" +
      "<div class='rating-row'><span class='act-btn difficulty easy' data-difficulty='Easy'>Easy</span>" +
      "<span class='act-btn difficulty medium' data-difficulty='Medium'>Medium</span>" +
      "<span class='act-btn difficulty hard' data-difficulty='Hard'>Hard</span></div>" +
      "<input type='text' id='study-label' placeholder='a label — visible to Jess' autocomplete='off'>";
    if (todaysS.length) {
      block += "<div class='study-list'>" + todaysS.map(studyLine).join("") + "</div>";
    }
    block += "</div>";
    if (pastS.length) {
      block += "<details class='past-days'><summary>Past study</summary>";
      const sdays = [...new Set(pastS.map(m => m.day))].sort((a, b) => b - a);
      sdays.forEach(d => {
        block += "<p class='rubric'>Day " + d + "</p><div class='study-list'>";
        pastS.forEach(function(st){
          if (st.day === d) block += studyLine(st);
        });
        block += "</div>";
      });
      block += "</details>";
    }
  }

  block += "<div class='panel prayer'><div class='panel-head'><h3>Prayer</h3></div>" +
    "<div class='prayer-row'><span class='act-btn' id='pray-btn'>Have we prayed together</span>" +
    "<span class='act-btn ghost-act' id='examen-btn'>Do examen</span></div>";
  if (todayDone(p, "prayer")) {
    block += "<span class='prayed-chip'>prayed today ✓</span>";
  }
  block += "</div>";

  if (state.fasting) {
    block += "<div class='panel fasting'><div class='panel-head'><h3>Fasting</h3></div>";
    if (todayDone(p, "fast")) {
      block += "<div class='logged-line'><span>Kept the fast</span></div>";
    } else {
      block += "<p class='rubric'>Today is a day of fasting.</p>" +
        "<span class='act-btn' id='fast-btn'>I kept the fast</span>";
    }
    block += "</div>";
  }

  zone.innerHTML = block;
}

/* ----- Today: partner's cross view (ADR-0007) ----- */

function renderCrossZone(){
  const zone = document.getElementById("cross-zone");
  const them = other(actor);
  const tp = state.profiles[them];
  const theirName = them === "jess" ? "Jess" : "Robi";

  let inner = "";
  if (them === "jess") {
    const inView = tp.meals.filter(m => m.day >= state.day - 2);
    if (!inView.length) {
      inner = "<div class='cross-card empty'>Jess hasn't logged a meal yet.</div>";
    } else {
      let grid = "";
      let notes = "";
      tp.meals.forEach(function(m, i){
        if (m.day >= state.day - 2) {
          grid += mealThumb(m, i, them, true);
          if (m.note) notes += "<div class='study-line'><span>Day " + m.day + "</span> <em>" + esc(m.note) + "</em></div>";
        }
      });
      inner = "<div class='cross-card'><div class='cross-meta'><strong>Jess's meals</strong>" +
        "<span>last 3 days</span></div><div class='thumb-grid'>" + grid + "</div>" + notes + "</div>";
    }
  } else {
    const studyHtml = studyDays(tp.studies);
    inner = studyHtml
      ? "<div class='cross-card'><div class='cross-meta'><strong>Robi's study</strong>" +
        "<span>last 3 days</span></div>" + studyHtml + "</div>"
      : "<div class='cross-card empty'>Robi hasn't logged any study yet.</div>";
  }
  const caption = theirName + " sees this about you.";
  zone.innerHTML = "<p class='cross-kicker'>" + esc(caption) + "</p>" + inner;
}

/* ----- Examen (ticket 04) ----- */

const EXAMS = [
  ["I know you are with me.", "Thank God for today. Notice one good thing, however small, and be grateful for it."],
  ["Where did I fall short?", "Walk the day back from morning. Catch the moment you stopped loving well."],
  ["Where was grace?", "Notice where you received more than you gave, and who carried you through today."],
  ["I ask forgiveness.", "Name what needs mercy. Let the day go, small and forgiven."],
  ["Tomorrow, I will...", "One honest intention for tomorrow, and a one-line note of gratitude to close."]
];
let examenStep = 0;

function openExamen(){
  examenStep = 0;
  showExamenStep();
  document.getElementById("examen-modal").classList.add("open");
}

function showExamenStep(){
  const [t, b] = EXAMS[examenStep];
  document.getElementById("examen-title").textContent = t;
  document.getElementById("examen-body").textContent = b;
  const last = examenStep === EXAMS.length - 1;
  document.getElementById("examen-back").style.visibility = examenStep === 0 ? "hidden" : "visible";
  document.getElementById("examen-next").textContent = last ? "Finish" : "next";
  document.getElementById("examen-note").style.display = last ? "block" : "none";
}

function doExamen(){
  const note = document.getElementById("examen-note").value.trim();
  state = engine.pray(state, actor, "examen", note || undefined);
  document.getElementById("examen-modal").classList.remove("open");
  render();
}

/* ----- Boot / render / bind ----- */

function render(){
  document.getElementById("day-label").textContent = state.day;
  const who = document.getElementById("whoami");
  who.textContent = actor === "jess" ? "Jess" : "Robi";
  who.className = "whoami " + actor;
  document.getElementById("pts-jess").textContent = fmtPoints(state.profiles.jess.points);
  document.getElementById("pts-robi").textContent = fmtPoints(state.profiles.robi.points);
  renderStreaks();
  renderRewards();
  renderFeed();
  renderLogZone();
  renderCrossZone();
  drawFeedActs();
  persist();
}

function syncFastingFlag(){
  const binding = isBindingFastDay(new Date());
  if (binding !== state.fasting) {
    state = engine.setFasting(state, binding);
  }
}

function dayScore(recipient){
  const p = state.profiles[recipient];
  const day = state.day;
  let score = 0;
  if (recipient === "jess") {
    p.meals.forEach(m => {
      if (m.day === day) score += m.rating === "Good" ? 2 : m.rating === "Okay" ? 1 : 0;
    });
  } else {
    p.studies.forEach(st => {
      if (st.day === day) score += st.type === "problem"
        ? (st.difficulty === "Hard" ? 2 : st.difficulty === "Medium" ? 1 : 0)
        : 1;
    });
  }
  const streakKey = recipient === "jess" ? "health" : "study";
  score += Math.floor(state.streaks[streakKey].count / 7);
  return score;
}

const FLIRT_TIERS = [
  [ "a smile 😊", "a hug 🤗", "a wink 😉", "a warm prayer 🙏" ],
  [ "a squeeze 🤭", "a little blush 🙈", "a note that means a bit more 💌", "a tight hand-squeeze 🤞" ],
  [ "a kiss — muah 💋", "a lot of love, since you worked hard today 🔥", "a promise for later 😏", "my whole heart to your streak tonight 💘" ]
];
const FLIRT_HINTS = [
  "— a quiet day; stay tender",
  "— a good day; don't hold back",
  "— they crushed today; swing big"
];
let pendingFlirt = "encouragement.";

function drawFeedActs(){
  const score = dayScore(other(actor));
  const tier = score >= 5 ? 2 : score >= 2 ? 1 : 0;
  pendingFlirt = FLIRT_TIERS[tier][Math.floor(Math.random() * FLIRT_TIERS[tier].length)];
  document.getElementById("encourage-btn").textContent = "Send " + pendingFlirt;
  document.getElementById("flirt-hint").textContent = FLIRT_HINTS[tier];
}

function boot(){
  const session = storage.getItem(SESSION_KEY);
  if (session === "jess" || session === "robi") {
    choose(session);
  } else {
    show("screen-login");
  }
}

function unlock(){
  const val = document.getElementById("password-input").value;
  if (val === SHARED_PASSWORD) {
    document.getElementById("password-error").textContent = "";
    document.getElementById("login-profiles").classList.add("shown");
    document.getElementById("login-profiles").scrollIntoView({ block: "center", behavior: "smooth" });
  } else {
    document.getElementById("password-error").textContent = "That's not the password we share.";
  }
}

function choose(profile){
  actor = profile;
  storage.setItem(SESSION_KEY, actor);
  if (first) {
    state = engine.normalize(loadState(storage));
    first = false;
  }
  syncFastingFlag();
  show("screen-app");
  switchView("today");
  render();
  startSync(adoptCloudState);
}

function readPhoto(file){
  if (!file || !file.type.startsWith("image/")) return;
  const reader = new FileReader();
  reader.onload = function(e){
    const img = new Image();
    img.onload = function(){
      const max = 720;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      mealPhoto = c.toDataURL("image/jpeg", 0.75);
      const prev = document.getElementById("meal-photo-preview");
      if (prev) prev.innerHTML = photoTag(mealPhoto, "meal photo");
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function bind(){
  document.getElementById("password-form").addEventListener("submit", function(e){
    e.preventDefault();
    unlock();
  });
  document.querySelectorAll(".login-profile").forEach(function(el){
    el.addEventListener("click", function(){
      choose(el.dataset.profile);
    });
  });
  document.querySelectorAll(".tab").forEach(function(el){
    el.addEventListener("click", function(){
      switchView(el.dataset.view);
    });
  });
  document.getElementById("app-advance").addEventListener("click", function(){
    state = engine.advanceDay(state);
    syncFastingFlag();
    mealPhoto = null;
    render();
  });

  document.getElementById("log-zone").addEventListener("click", function(e){
    const t = e.target;
    if (t.id === "meal-photo-btn") document.getElementById("meal-photo-input").click();
    if (t.id === "examen-btn") openExamen();
    if (t.id === "pray-btn") { state = engine.pray(state, actor, "button"); render(); }
    if (t.id === "fast-btn") { state = engine.keepFast(state, actor); render(); }
    if (t.id === "study-pomodoro") { state = engine.studyAction(state, actor, "pomodoro", null, labelVal()); render(); }
    if (t.dataset.rating) {
      state = engine.logMeal(state, actor, t.dataset.rating, noteVal(), mealPhoto || undefined);
      mealPhoto = null;
      render();
    }
    if (t.dataset.difficulty) {
      state = engine.studyAction(state, actor, "problem", t.dataset.difficulty, labelVal());
      render();
    }
  });

  document.getElementById("log-zone").addEventListener("change", function(e){
    if (e.target.id === "meal-photo-input") readPhoto(e.target.files[0]);
  });

  document.getElementById("encourage-btn").addEventListener("click", function(){
    state = engine.encourage(state, actor, pendingFlirt);
    render();
  });

  document.addEventListener("click", function(e){
    const th = e.target.closest ? e.target.closest(".meal-thumb") : null;
    if (th) {
      openLightbox(th.dataset.owner, +th.dataset.mi, th.dataset.note === "1");
      return;
    }
    if (e.target.id === "lightbox" || e.target.id === "lb-close") closeLightbox();
  });

  document.getElementById("examen-next").addEventListener("click", function(){
    if (examenStep < EXAMS.length - 1) {
      examenStep++;
      showExamenStep();
    } else {
      doExamen();
    }
  });
  document.getElementById("examen-back").addEventListener("click", function(){
    if (examenStep > 0) {
      examenStep--;
      showExamenStep();
    }
  });
  document.getElementById("examen-modal").addEventListener("click", function(e){
    if (e.target === this) document.getElementById("examen-modal").classList.remove("open");
  });

  document.getElementById("reward-form").addEventListener("submit", function(e){
    e.preventDefault();
    const name = document.getElementById("reward-name").value.trim();
    const cost = parseInt(document.getElementById("reward-cost").value, 10);
    if (name && cost > 0) {
      state = engine.addReward(state, name, cost);
      document.getElementById("reward-name").value = "";
      document.getElementById("reward-cost").value = "";
      render();
    }
  });

  document.getElementById("rewards").addEventListener("click", function(e){
    const btn = e.target.closest("button");
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.dataset.action === "remove") {
      state = engine.removeReward(state, id);
      render();
    }
    if (btn.dataset.action === "rename") {
      const r = state.rewards.find(function(x){ return x.id === id; });
      const fresh = prompt("Rename reward", r ? r.name : "");
      if (fresh && fresh.trim()) {
        state = engine.renameReward(state, id, fresh.trim());
        render();
      }
    }
  });
}

function labelVal(){
  const el = document.getElementById("study-label");
  const v = el ? el.value.trim() : "";
  return v || undefined;
}

function noteVal(){
  const el = document.getElementById("meal-note");
  const v = el ? el.value.trim() : "";
  return v || undefined;
}

bind();
boot();