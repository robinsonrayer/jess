// Firebase config. Paste your web app config from the Firebase console here.
// The app keeps running on localStorage only while this is null.
export const firebaseConfig = {
  apiKey: "AIzaSyCSxfKwleCSZBO90AuGQV8m0nT6mKUTm4c",
  authDomain: "two-to-one.firebaseapp.com",
  projectId: "two-to-one",
  storageBucket: "two-to-one.firebasestorage.app",
  messagingSenderId: "330214406622",
  appId: "1:330214406622:web:1e27c565b10a9eadda854f"
};

const isLocal = location.hostname === "localhost" || location.hostname === "127.0.0.1";
const STATE_DOC_PATH = isLocal ? "couple/state-dev" : "couple/state";

let app = null;
let db = null;
let docRef = null;
let setDocFn = null;
let lastWritten = null;
let onCloudState = null;
let onSyncStatus = null;
let syncSub = null;
let retryTimer = null;
let attempts = 0;
let getAuth = null;
let signInAnonymously = null;
let onSnapshot = null;

export function isConfigured(){
  return !!(firebaseConfig && firebaseConfig.projectId);
}

function normalize(data){
  if (!data || typeof data !== "object" || !data.profiles) return null;
  return data;
}

function report(status){
  if (onSyncStatus) onSyncStatus(status);
}

function scheduleRetry(){
  if (syncSub) { syncSub(); syncSub = null; }
  attempts++;
  const delay = Math.min(30000, 1000 * Math.pow(2, attempts - 1));
  retryTimer = setTimeout(connect, delay);
}

async function connect(){
  if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
  report("connecting");
  try {
    if (!app) {
      const { initializeApp } = await import("https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js");
      const authModule = await import("https://www.gstatic.com/firebasejs/11.3.0/firebase-auth.js");
      const firestoreModule = await import("https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js");
      getAuth = authModule.getAuth;
      signInAnonymously = authModule.signInAnonymously;
      onSnapshot = firestoreModule.onSnapshot;
      const { initializeFirestore, persistentLocalCache, doc, setDoc } = firestoreModule;
      app = initializeApp(firebaseConfig);
      db = initializeFirestore(app, { localCache: persistentLocalCache() });
      const [collName, docName] = STATE_DOC_PATH.split("/");
      docRef = doc(db, collName, docName);
      setDocFn = setDoc;
    }
    await signInAnonymously(getAuth(app));
    if (!syncSub) {
      syncSub = onSnapshot(docRef, function(snap){
        report("online");
        if (!snap.exists()) {
          if (onCloudState) onCloudState(null);
          return;
        }
        const cloudState = normalize(snap.data());
        if (!cloudState) return;
        const key = JSON.stringify(cloudState);
        if (key === lastWritten) return;
        if (onCloudState) onCloudState(cloudState);
      }, function(){
        report("offline");
        scheduleRetry();
      });
    } else {
      report("online");
    }
    attempts = 0;
  } catch (e) {
    report("offline");
    scheduleRetry();
  }
}

export async function startSync(handler, statusHandler){
  onCloudState = handler;
  onSyncStatus = statusHandler;
  if (!isConfigured()) return null;
  connect();
  return function(){
    if (syncSub) syncSub();
    if (retryTimer) clearTimeout(retryTimer);
    syncSub = null;
    retryTimer = null;
  };
}

export function pushState(state){
  if (!db) return;
  lastWritten = JSON.stringify(state);
  setDocFn(docRef, state);
}