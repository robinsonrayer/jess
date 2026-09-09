export const STATE_KEY = "two-to-one.state.v1";

export function loadState(storage){
  try {
    var raw = storage.getItem(STATE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export function saveState(state, storage){
  storage.setItem(STATE_KEY, JSON.stringify(state));
}

export function makeStorage(){
  if (typeof localStorage !== "undefined") return localStorage;
  var mem = {};
  return {
    getItem: function(k){ return k in mem ? mem[k] : null; },
    setItem: function(k, v){ mem[k] = String(v); }
  };
}