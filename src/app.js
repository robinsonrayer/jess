import { createEngine } from "./engine.js";
import { loadState, saveState, makeStorage } from "./storage.js";
import { SHARED_PASSWORD } from "./password.js";

const storage = makeStorage();
const engine = createEngine();
let state;
let actor = null;

const SESSION_KEY = "two-to-one.session.v1";

function show(id){
  document.querySelectorAll(".screen").forEach(function(el){ el.classList.remove("active"); });
  document.getElementById(id).classList.add("active");
}

function persist(){
  saveState(state, storage);
}

function fmtPoints(n){ return n.toLocaleString("en-IN"); }

function renderRewards(){
  const t = engine.totalPoints(state);
  const rw = document.getElementById("rewards");
  rw.innerHTML = state.rewards.map(function(r){
    const pct = Math.min(100, Math.round(t / r.cost * 100));
    const unlocked = t >= r.cost;
    return "<div style='padding:8px 0;border-bottom:1px dashed var(--line)'>" +
      "<div style='display:flex;justify-content:space-between;align-items:center'>" +
      "<span><b>" + r.name + "</b> <span class='mut'>" + (unlocked ? "reached ✓" : "at " + fmtPoints(r.cost) + " pts") + "</span></span>" +
      "</div>" +
      "<div class='bar'><div style='width:" + pct + "%'></div></div>" +
      "<div class='mut' style='font-size:12px;margin-top:4px'>" + pct + "% of the way</div></div>";
  }).join("") || "<div class='mut'>No rewards yet — add one to dream about.</div>";
  document.getElementById("bof-total").textContent = fmtPoints(t) + " points banked";
  document.getElementById("bof-bar").style.width = Math.min(100, t / 1000000 * 100) + "%";
}

function renderStreaks(){
  const set = function(id, st){
    document.getElementById(id).textContent = st.count;
    document.getElementById(id + "-b").textContent = st.bank;
    document.getElementById(id + "-l").textContent = st.last ?? "—";
  };
  set("s-health", state.streaks.health);
  set("s-study", state.streaks.study);
  set("s-pray", state.streaks.prayer);
}

function renderFeed(){
  const feedEl = document.getElementById("feed");
  feedEl.innerHTML = state.feed.slice(-12).reverse().map(function(l){
    return "<div class='feedline'>" + l + "</div>";
  }).join("") || "<div class='mut'>No activity yet today.</div>";
}

function render(){
  document.getElementById("day-label").textContent = "— Day " + state.day;
  document.getElementById("pts-jess").textContent = fmtPoints(state.profiles.jess.points);
  document.getElementById("pts-robi").textContent = fmtPoints(state.profiles.robi.points);
  renderStreaks();
  renderRewards();
  renderFeed();
  document.getElementById("actor-jess").classList.toggle("active", actor === "jess");
  document.getElementById("actor-robi").classList.toggle("active", actor === "robi");
  saveState(state, storage);
}

function boot(){
  const session = storage.getItem(SESSION_KEY);
  if (session === "unlocked") {
    show("screen-picker");
  } else {
    show("screen-password");
  }
}

function unlock(){
  const val = document.getElementById("password-input").value;
  if (val === SHARED_PASSWORD) {
    storage.setItem(SESSION_KEY, "unlocked");
    show("screen-picker");
    document.getElementById("password-error").textContent = "";
  } else {
    document.getElementById("password-error").textContent = "That's not the password we share.";
  }
}

function choose(profile){
  actor = profile;
  state = loadState(storage) || engine.fresh();
  show("screen-app");
  render();
}

function bind(){
  document.getElementById("password-submit").onclick = unlock;
  document.getElementById("password-input").addEventListener("keydown", function(e){
    if (e.key === "Enter") unlock();
  });
  document.getElementById("pick-jess").onclick = function(){ choose("jess"); };
  document.getElementById("pick-robi").onclick = function(){ choose("robi"); };
  document.getElementById("actor-jess").onclick = function(){ actor = "jess"; render(); };
  document.getElementById("actor-robi").onclick = function(){ actor = "robi"; render(); };
  document.getElementById("app-advance").onclick = function(){
    state = engine.advanceDay(state);
    render();
  };
}

bind();
boot();