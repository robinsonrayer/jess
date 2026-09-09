import { createEngine } from "./engine.js";
import { loadState, saveState, makeStorage } from "./storage.js";
import { SHARED_PASSWORD } from "./password.js";

const storage = makeStorage();
const engine = createEngine();
let state;
let actor = null;
let first = true;

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
}

function fmtPoints(n){ return n.toLocaleString("en-IN"); }

function pctOf(n, of){ return Math.min(100, Math.round(n / of * 100)); }

function renderRewards(){
  const t = engine.totalPoints(state);
  const rw = document.getElementById("rewards");
  rw.innerHTML = state.rewards.map(function(r){
    const pct = pctOf(t, r.cost);
    const reached = t >= r.cost;
    return "<div class='reward" + (reached ? " reached" : "") + "'>" +
      "<div class='reward-top'><span class='reward-name'>" + r.name + "</span>" +
      "<span class='reward-cost'>" + (reached ? "reached ✓" : "at " + fmtPoints(r.cost) + " pts") + "</span></div>" +
      "<div class='bar'><div style='width:" + pct + "%'></div></div>" +
      "<div class='reward-pct'>" + pct + "% of the way</div></div>";
  }).join("") || "<div class='feed-empty'>No rewards yet — add one to dream about.</div>";
  document.getElementById("bof-total").textContent = fmtPoints(t);
}

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

function renderFeed(){
  const feedEl = document.getElementById("feed");
  feedEl.innerHTML = state.feed.slice(-12).reverse().map(function(l){
    return "<div class='feedline'>" + l + "</div>";
  }).join("") || "<div class='feed-empty'>No activity yet. The first step writes the first line.</div>";
}

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
  persist();
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
    state = loadState(storage) || engine.fresh();
    first = false;
  }
  show("screen-app");
  switchView("today");
  render();
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
      render();
    });
  });
  document.getElementById("app-advance").addEventListener("click", function(){
    state = engine.advanceDay(state);
    render();
  });
}

bind();
boot();