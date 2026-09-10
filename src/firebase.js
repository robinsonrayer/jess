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

const STATE_DOC_PATH = "couple/state";

let db = null;
let docRef = null;
let setDocFn = null;
let lastWritten = null;
let onCloudState = null;

export function isConfigured(){
  return !!(firebaseConfig && firebaseConfig.projectId);
}

function normalize(data){
  if (!data || typeof data !== "object" || !data.profiles) return null;
  return data;
}

export async function startSync(handler){
  onCloudState = handler;
  if (!isConfigured()) return null;

  const { initializeApp } = await import("https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js");
  const { getAuth, signInAnonymously } = await import("https://www.gstatic.com/firebasejs/11.3.0/firebase-auth.js");
  const { initializeFirestore, persistentLocalCache, doc, onSnapshot, setDoc } =
    await import("https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js");

  const app = initializeApp(firebaseConfig);
  await signInAnonymously(getAuth(app));
  db = initializeFirestore(app, { localCache: persistentLocalCache() });

  docRef = doc(db, "couple", "state");
  setDocFn = setDoc;
  const unsubscribe = onSnapshot(docRef, function(snap){
    if (!snap.exists()) {
      if (onCloudState) onCloudState(null);
      return;
    }
    const cloudState = normalize(snap.data());
    if (!cloudState) return;
    const key = JSON.stringify(cloudState);
    if (key === lastWritten) return;
    if (onCloudState) onCloudState(cloudState);
  });

  return unsubscribe;
}

export function pushState(state){
  if (!db) return;
  lastWritten = JSON.stringify(state);
  setDocFn(docRef, state);
}