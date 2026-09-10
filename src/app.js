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
      "<input type='text' id='meal-note' placeholder='a private note, just for you' autocomplete='off'>";
    if (!todays.length) {
      block += "<p class='feed-empty'>No meal logged today yet.</p>";
    }
    todays.forEach(m => {
      block += "<div class='logged-line'>" + photoTag(m.photo, "meal") +
        "<span>Meal — " + esc(m.rating) + (m.note ? " <em>" + esc(m.note) + "</em>" : "") + "</span></div>";
    });
    block += "</div>";
    if (past.length) {
      block += "<div class='panel'><div class='panel-head'><h3>Past meals</h3></div>";
      const days = [...new Set(past.map(m => m.day))].sort((a, b) => b - a);
      days.forEach(d => {
        block += "<p class='rubric'>Day " + d + "</p>";
        past.filter(m => m.day === d).forEach(m => {
          block += "<div class='logged-line'>" + photoTag(m.photo, "meal") +
            "<span>" + esc(m.rating || "meal") + (m.note ? " — " + esc(m.note) : "") + "</span></div>";
        });
      });
      block += "<p class='feed-empty'>Photos are kept for the last 3 days; ratings and notes stay forever.</p>";
      block += "</div>";
    }
  } else {
    const logged = todayDone(p, "study");
    block += "<div class='panel'><div class='panel-head'><h3>Today's study</h3></div>";
    if (logged) {
      block += "<div class='logged-line'><span>Logged — " +
        (p.difficultyMix[0] + p.difficultyMix[1] + p.difficultyMix[2] > 0 ? "a problem" : "a pomodoro") + "</span></div>";
    } else {
      block += "<div class='study-row'><span class='act-btn' id='study-pomodoro'>Pomodoro</span></div>" +
        "<p class='rubric'>or a problem, by difficulty</p>" +
        "<div class='rating-row'><span class='act-btn difficulty easy' data-difficulty='Easy'>Easy</span>" +
        "<span class='act-btn difficulty medium' data-difficulty='Medium'>Medium</span>" +
        "<span class='act-btn difficulty hard' data-difficulty='Hard'>Hard</span></div>" +
        "<input type='text' id='study-label' placeholder='a label only you see' autocomplete='off'>";
    }
    block += "</div>";
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
      inner = inView.slice().reverse().map(m =>
        "<div class='cross-card'>" + photoTag(m.photo, "Jess's meal") +
        "<div class='cross-meta'><strong>Meal · " + esc(m.rating || "") + "</strong>" +
        "<span>" + (m.day === state.day ? "today" : "Day " + m.day) + "</span></div></div>"
      ).join("");
    }
  } else {
    const [E, M, H] = tp.difficultyMix;
    const total = E + M + H || 1;
    inner = "<div class='cross-card study-mix'><div class='cross-meta'><strong>Robi's difficulty mix</strong>" +
      "<span>" + (E + M + H) + " problems this run</span></div>" +
      "<div class='mixbar'><div class='mix easy' style='width:" + Math.round(E / total * 100) + "%'></div>" +
      "<div class='mix medium' style='width:" + Math.round(M / total * 100) + "%'></div>" +
      "<div class='mix hard' style='width:" + Math.round(H / total * 100) + "%'></div></div>" +
      "<div class='mix-legend'><span class='easy'>E " + E + "</span><span class='medium'>M " + M + "</span><span class='hard'>H " + H + "</span></div></div>";
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
  state = engine.pray(state, actor, "examen");
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

function drawFeedActs(){
  const flirts = [
    "Send a little love 💌",
    "Send a kiss 💋",
    "Send a wink 😉",
    "Send a hug 🤗",
    "Send a love note 💘",
    "Send a smile 😊",
    "Send a heart ❤️",
    "Send a prayer for us 🙏"
  ];
  document.getElementById("encourage-btn").textContent =
    flirts[Math.floor(Math.random() * flirts.length)];
  const jessNote = (state.profiles.jess.meals.length &&
    state.profiles.jess.meals[state.profiles.jess.meals.length - 1].note) || "";
  const canHighlight = actor && (
    (actor === "jess" && jessNote) ||
    (actor === "robi" && state.profiles.robi.studyLabel)
  );
  document.getElementById("highlight-btn").classList.toggle("hidden", !canHighlight);
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
    state = engine.encourage(state, actor);
    render();
  });

  document.getElementById("highlight-btn").addEventListener("click", function(){
    state = engine.highlight(state, actor);
    render();
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