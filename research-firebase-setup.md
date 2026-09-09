# Firebase Health/Food Tracking Web App - Research

Building a simple app so your girlfriend can track what she eats, stay accountable, and see her progress. Firebase handles the backend so you don't have to write server code.

---

## 1. Firebase Setup - Simplest Way to Start

**Official docs:** https://firebase.google.com/docs/web/setup

Steps:
1. Go to https://console.firebase.google.com and create a new project
2. Click the Web icon (</>) to register a web app
3. Copy the config object it gives you
4. Install the SDK: `npm install firebase`
5. Create `firebase.js` and initialize:

```js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

**Quick start codelab:** https://firebase.google.com/learn/pathways/firebase-web

Firebase also has a CLI approach for creating projects from the terminal:
```bash
npx -y firebase-tools@latest projects:create
npx -y firebase-tools@latest apps:create web my-app
```

---

## 2. Authentication Options

**Official docs:** https://firebase.google.com/docs/auth/web/start

### Email/Password (Recommended for this use case)
Simplest for two people. She signs up with email + password, logs in on any device.

```js
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";

// Sign up
createUserWithEmailAndPassword(auth, email, password);

// Sign in
signInWithEmailAndPassword(auth, email, password);
```

### Google Sign-In
One-tap sign-in if she has a Google account. Requires a bit more OAuth setup.

```js
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
const provider = new GoogleAuthProvider();
signInWithPopup(auth, provider);
```

**Docs:** https://firebase.google.com/docs/auth/web/google-signin

### Anonymous Auth
Good for letting her try the app before committing to an account. Can later link to a real account.

```js
import { signInAnonymously } from "firebase/auth";
signInAnonymously(auth);
```

**Docs:** https://firebase.google.com/docs/auth/web/anonymous-auth

**Recommendation:** Start with email/password. Add Google sign-in if she finds passwords annoying. Anonymous auth is nice but adds complexity for account migration.

### FirebaseUI (drop-in auth UI)
If you don't want to build auth screens from scratch, Firebase provides a pre-built UI component:
https://firebase.google.com/docs/auth/web/firebaseui

---

## 3. Firestore Data Modeling for Food/Daily Tracking

**Official docs:** https://firebase.google.com/docs/firestore/data-model

Firestore is a NoSQL document database. Data lives in collections of documents (think: folders of JSON files).

### Recommended Schema

```
users (collection)
  {userId} (document)
    displayName: "Jess"
    email: "jess@email.com"
    dailyGoal: { calories: 1800, protein: 120 }
    createdAt: timestamp

  dailyLogs (subcollection under each user)
    {YYYY-MM-DD} (document - date as ID for easy lookups)
      date: "2026-09-09"
      totalCalories: 1650
      totalProtein: 95
      totalCarbs: 200
      totalFat: 55
      meals (array of objects):
        - { name: "Oatmeal with berries", calories: 350, protein: 12, mealType: "breakfast", time: "08:30" }
        - { name: "Chicken salad", calories: 520, protein: 35, mealType: "lunch", time: "13:00" }
        - { name: "Apple", calories: 95, protein: 0, mealType: "snack", time: "15:30" }
      notes: "Felt good today"
      mood: 4  // 1-5 scale

  foodLibrary (subcollection under each user - custom foods)
    {foodId} (document)
      name: "Homemade curry"
      calories: 450
      protein: 25
      carbs: 40
      fat: 18
```

### Why this structure?
- **Date as document ID** means you can grab a specific day with one read, no queries needed
- **Meals as an array** inside the day doc keeps it simple. For a personal app with 3-5 meals per day, arrays work fine and cost fewer reads
- **User-scoped subcollections** keep her data isolated and make security rules straightforward
- **Food library** lets her save commonly eaten foods for quick-add later

### Alternative: flat collection approach
If you want to query across days (e.g., "show me all entries where I ate chicken"), use a flat `entries` collection:

```
entries (collection)
  {autoId} (document)
    userId: "abc123"
    date: "2026-09-09"
    name: "Oatmeal with berries"
    calories: 350
    protein: 12
    mealType: "breakfast"
```

This costs more reads when viewing a single day but allows more flexible queries. For a simple two-person app, the subcollection approach is better.

**Example project with similar schema:** https://github.com/ashishworkacc/life-tracker (uses Next.js + Firestore with 25+ collections for a full life OS)

---

## 4. Firebase Hosting - Deployment

**Official docs:** https://firebase.google.com/docs/hosting/quickstart

Deployment is a single command once configured:

```bash
npm install -g firebase-tools
firebase login
firebase init hosting    # select your project, set public directory
npm run build            # build your app
firebase deploy --only hosting
```

Your app goes live at:
- `your-project.web.app`
- `your-project.firebaseapp.com`

Both domains work, both serve the same content, both get free SSL.

**Key details:**
- Free tier: 10 GB storage, 360 MB/day transfer
- Global CDN with automatic SSL
- One-click rollback from the console
- Supports SPA rewrites (all routes to `index.html`)

**firebase.json example for a React SPA:**
```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  }
}
```

**App Hosting (newer option):** If you're using Next.js or Angular, Firebase App Hosting handles SSR and automatic builds from GitHub. It's more involved but eliminates the manual `npm run build` step. Docs: https://firebase.google.com/docs/app-hosting

---

## 5. Real-Time Sync Across Devices

**Official docs:** https://firebase.google.com/docs/firestore/query-data/listen

Firestore has built-in real-time listeners. When data changes on one device, all other connected devices see the update instantly:

```js
import { doc, onSnapshot } from "firebase/firestore";

// Listen for changes to today's log
const unsubscribe = onSnapshot(doc(db, "users", userId, "dailyLogs", today), (doc) => {
  if (doc.exists()) {
    updateUI(doc.data());
  }
});

// Stop listening when component unmounts
// unsubscribe();
```

**Offline persistence is on by default** on web. Firestore caches data locally and syncs when the device comes back online. No extra setup needed.

For this app, real-time sync means if she logs breakfast on her phone, it shows up immediately on her laptop too. No refresh needed.

---

## 6. Existing Firebase Health/Food Tracking Templates

**Most relevant open-source projects:**

### LifeTracker
https://github.com/ashishworkacc/life-tracker
- Full "life OS" with food logging, habits, time tracking, weight tracking
- Built with Next.js 16 + Firebase + Tailwind CSS
- Telegram bots for quick food logging ("2 eggs and coffee" -> AI estimates macros)
- Uses Recharts for visualization
- Firebase Auth (email/password + Google) + Firestore
- Most complete reference, but overkill if you just want food tracking

### GetFIT Meal Tracker
https://github.com/rbhogal/get-fit-app
- React + Redux + Firebase Realtime Database + Chart.js
- Guest sign-in or Google auth
- Calorie/macro calculator, meal planner, edit/delete entries
- Material-UI v5
- Good reference for the core food logging flow

### Smart Routine Tracker
https://github.com/aryansinghsisodia3/smart-routine-tracker
- React (Vite) + Firebase + Netlify
- Daily habit tracking with streaks and completion progress
- Per-habit completion stored in Firestore
- Lightweight reference for the streaks/completion mechanic

### Firebase Habit Tracker (Vanilla JS)
https://github.com/fazal305/firebase-habit-tracker
- Firebase Auth + Firestore + Bootstrap 5 + jQuery + Vanilla JS
- Create habits, track daily completions, monitor streaks
- Closest to what a "simple" version looks like

### FoodYouToo (Android)
https://github.com/bloff/FoodYouToo
- Open-source, privacy-focused food diary
- Material Design, uses Open Food Facts + USDA databases
- Not web-based, but good reference for food database integration

### Daily Calorie Tracker (React + Tailwind)
https://github.com/biswabose1992/my-calorie-tracker
- React + TypeScript + Vite + Tailwind CSS
- Daily food logging (breakfast/lunch/snacks/dinner)
- Food database search, custom foods, weight logging
- localStorage only (no Firebase yet), but good UI reference

---

## 7. Tech Stack Recommendation

**For simplicity: React + Vite + Tailwind CSS + Firebase**

| Layer | Choice | Why |
|---|---|---|
| Framework | React (via Vite) | Component-based, huge ecosystem, easy to find help |
| Build tool | Vite | Fast, simple, modern default |
| Styling | Tailwind CSS | Utility-first, no CSS files to manage, works great on mobile |
| Auth | Firebase Auth | Built-in, no server needed |
| Database | Cloud Firestore | Real-time, offline support, generous free tier |
| Charts | Chart.js (via react-chartjs-2) | Lightweight, well-documented, good for simple progress charts |
| Hosting | Firebase Hosting | One-command deploy, free SSL, CDN |

**Why not vanilla JS?** For a food tracking app, you need state management (what meals are logged today, which day are we viewing, auth state). React handles this cleanly. Vanilla JS works but gets messy fast with DOM manipulation for dynamic lists.

**Why not Next.js?** Overkill for a static SPA deployed to Firebase Hosting. React + Vite gives you everything you need without server-side rendering complexity.

**Why not Vue/Svelte?** They'd work fine too. React is just the most documented path with Firebase examples.

### Quick setup command:
```bash
npm create vite@latest jess-health -- --template react
cd jess-health
npm install firebase react-chartjs-2 chart.js
npm install -D tailwindcss @tailwindcss/vite
```

---

## 8. Firebase Free Tier Limits (Spark Plan)

**Official docs:** https://firebase.google.com/docs/firestore/quotas

| Resource | Free Limit | Enough for this app? |
|---|---|---|
| Firestore stored data | 1 GiB | Yes. Years of food logs will be < 100 MB |
| Firestore reads/day | 50,000 | Yes. Even reading 10 days of logs costs ~10 reads |
| Firestore writes/day | 20,000 | Yes. Logging 10 meals/day = 10 writes |
| Firestore deletes/day | 20,000 | Yes |
| Firestore bandwidth | 10 GiB/month | Yes |
| Hosting storage | 10 GB | Yes |
| Hosting transfer | 360 MB/day | Yes, for a simple SPA |
| Authentication | 10,000/month (free on Blaze) | Yes, 2 users is nothing |
| Realtime Database | 1 GB storage, 10 GB/month download | Not needed (use Firestore) |

**Bottom line:** The Spark (free) plan is more than enough for a personal app used by two people. You won't hit any limits. You don't even need to add a credit card.

**If you stay on Spark and exceed a quota:** your app's access to that product shuts off for the rest of the day. No surprise charges.

**Monitoring:** Check your usage in the Firebase console under Usage tab.

---

## 9. Privacy Considerations

### For a personal food tracker (non-medical):
- This is **not medical data** in the legal sense. Food logs and calorie tracking don't fall under HIPAA unless you're operating as a healthcare provider
- Firebase encrypts data at rest and in transit by default
- Your data is stored on Google's infrastructure (same as Gmail, Google Drive)
- Google can't read your Firestore data (it's your project's data, not Google's)

### What you should do:
1. **Use Firebase Security Rules** so only authenticated users can read/write their own data:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

2. **Don't store sensitive info in user profile** (like full names, addresses). An email is fine.
3. **The app should only be shared between the two of you.** Don't make it public or add user registration for strangers.
4. **Firebase is NOT HIPAA compliant by default.** If this were a medical app, you'd need a BAA with Google Cloud and only use HIPAA-covered services (Firestore is covered, but Analytics and Hosting are not). For a food tracker, this doesn't apply.

### Relevant links:
- Firebase Privacy: https://firebase.google.com/support/privacy
- Firebase Security Rules: https://firebase.google.com/docs/firestore/security
- Data Processing Terms: https://firebase.google.com/terms/data-processing-terms

---

## 10. Daily Check-ins, Streaks, and Progress Tracking

### Daily check-in pattern:
When she opens the app, check if a `dailyLogs` document exists for today. If not, create an empty one:

```js
import { doc, getDoc, setDoc } from "firebase/firestore";

const today = new Date().toISOString().split("T")[0]; // "2026-09-09"

async function getTodayLog(userId) {
  const docRef = doc(db, "users", userId, "dailyLogs", today);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    // First visit today - create empty log
    const emptyLog = {
      date: today,
      meals: [],
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
      mood: null,
      notes: "",
    };
    await setDoc(docRef, emptyLog);
    return emptyLog;
  }
  return docSnap.data();
}
```

### Streak calculation:
Track streaks by querying consecutive days with logged meals:

```js
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";

async function getStreak(userId) {
  const logsRef = collection(db, "users", userId, "dailyLogs");
  const q = query(logsRef, orderBy("date", "desc"), limit(365));
  const snapshot = await getDocs(q);

  let streak = 0;
  let expectedDate = new Date();

  for (const doc of snapshot.docs) {
    const logDate = doc.data().date;
    const expected = expectedDate.toISOString().split("T")[0];

    if (logDate === expected && doc.data().meals.length > 0) {
      streak++;
      expectedDate.setDate(expectedDate.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}
```

### Progress visualization with Chart.js:

```jsx
import { Line } from "react-chartjs-2";

function WeeklyCaloriesChart({ weekData }) {
  return (
    <Line
      data={{
        labels: weekData.map(d => d.date),
        datasets: [
          {
            label: "Calories",
            data: weekData.map(d => d.totalCalories),
            borderColor: "#f87171",
            fill: false,
          },
          {
            label: "Goal",
            data: weekData.map(() => 1800),
            borderColor: "#60a5fa",
            borderDash: [5, 5],
            fill: false,
          },
        ],
      }}
      options={{
        scales: {
          y: { beginAtZero: true, max: 2500 },
        },
      }}
    />
  );
}
```

### Useful streak/motivation features to add:
- **Calendar heatmap** (green/red dots for days with/without logging)
- **Daily calorie goal** with progress bar
- **Weekly summary** showing average calories, total protein, etc.
- **Streak counter** prominently displayed on the dashboard
- **"Don't break the chain"** visual motivation

---

## 11. UI Frameworks

### Tailwind CSS (Recommended)
- Utility-first CSS. Write styles directly in HTML/JSX: `className="bg-white rounded-lg p-4 shadow-md"`
- No separate CSS files to manage
- Excellent mobile responsiveness
- Works perfectly with React + Vite
- Docs: https://tailwindcss.com

Setup with Vite:
```bash
npm install -D tailwindcss @tailwindcss/vite
```

### Bootstrap 5
- Pre-built components (cards, navbars, modals)
- Heavier file size than Tailwind
- Quick to prototype with
- Docs: https://getbootstrap.com

### daisyUI (Tailwind plugin)
- Adds named component classes on top of Tailwind: `className="btn btn-primary"`
- Good middle ground between Tailwind's flexibility and Bootstrap's convenience
- Lightweight

### Recommendation: Tailwind CSS
For a modern, mobile-friendly food tracker, Tailwind gives you the most control with the least bloat. You can make it look exactly how you want without fighting a component library's opinions.

---

## 12. Chart.js for Progress Visualization

**Docs:** https://www.chartjs.org/docs/latest/getting-started/usage.html

Install: `npm install chart.js react-chartjs-2`

Useful chart types for a food tracker:
- **Line chart** - calorie/protein trends over time
- **Bar chart** - daily macro breakdown (protein vs carbs vs fat)
- **Doughnut chart** - macro ratio pie
- **Progress bar** - daily goal completion

**react-chartjs-2** wrapper makes it easy in React:
```bash
npm install react-chartjs-2
```

**Alternative: Recharts**
Used by the LifeTracker project. React-native charting, simpler API, good for dashboards.
```bash
npm install recharts
```

Both work well. Chart.js is more established, Recharts has a cleaner React API.

---

## 13. PWA (Progressive Web App) for Mobile-Friendly Experience

**Firebase docs on PWAs:** https://firebase.google.com/docs/web/pwa

A PWA lets her "install" the app on her phone's home screen like a native app, with offline support.

### What you need:
1. **manifest.json** - tells the browser how to display the app:
```json
{
  "name": "Jess Health Tracker",
  "short_name": "Health",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#f87171",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

2. **Service Worker** - caches assets for offline use:
```bash
npm install vite-plugin-pwa -D
```
This auto-generates the service worker and manifest for you.

3. **Link in index.html:**
```html
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#f87171">
```

Firebase also provides offline Firestore support automatically. Once data is cached, she can view past logs even without internet.

**With Vite + PWA plugin, it takes about 10 minutes to set up.**

---

## 14. Getting Started Checklist

1. Create Firebase project at https://console.firebase.google.com
2. Enable Authentication (email/password)
3. Create Firestore database (start in test mode, add security rules before sharing)
4. Scaffold the app: `npm create vite@latest jess-health -- --template react`
5. Install dependencies: `npm install firebase react-chartjs-2 chart.js`
6. Install Tailwind: `npm install -D tailwindcss @tailwindcss/vite`
7. Initialize Firebase in `src/firebase.js`
8. Build auth flow (login/signup screens)
9. Build food logging UI (meal name, calories, macros, meal type)
10. Build today's dashboard (meals list, totals, goal progress)
11. Build weekly/monthly view with charts
12. Add streak tracking
13. Deploy to Firebase Hosting: `firebase deploy`

---

## Key Links

| Resource | URL |
|---|---|
| Firebase Console | https://console.firebase.google.com |
| Firebase Web Setup | https://firebase.google.com/docs/web/setup |
| Firestore Docs | https://firebase.google.com/docs/firestore |
| Firebase Auth | https://firebase.google.com/docs/auth/web/start |
| Firebase Hosting | https://firebase.google.com/docs/hosting/quickstart |
| Firebase Free Tier | https://firebase.google.com/docs/firestore/quotas |
| Firebase Security Rules | https://firebase.google.com/docs/firestore/security |
| Firestore Data Modeling | https://firebase.google.com/docs/firestore/data-model |
| Firebase PWA Guide | https://firebase.google.com/docs/web/pwa |
| Chart.js Docs | https://www.chartjs.org/docs/latest/ |
| react-chartjs-2 | https://react-chartjs-2.js.org/ |
| Tailwind CSS | https://tailwindcss.com |
| LifeTracker (reference project) | https://github.com/ashishworkacc/life-tracker |
| GetFIT (reference project) | https://github.com/rbhogal/get-fit-app |
| Firebase Quickstart Samples | https://github.com/firebase/quickstart-js |
| Firebase Open Source | https://firebaseopensource.com |
