# Dual-Purpose App: Health + Study/Productivity Tracker for a Catholic Couple

Research findings for a Firebase app that serves both a young man tracking his study/career prep and his girlfriend tracking health and food, with shared accountability and Catholic relationship framing.

---

## 1. Dual-Purpose App Architecture

### The core problem

Two users with completely different tracking needs, one app. He logs Pomodoros and LeetCode problems. She logs meals and macros. Both need to see each other's progress. Neither should feel like they're using "the other person's app."

### How existing apps solve this

**DuoGoals** (App Store, 2025) takes a partner-pair approach: each person creates their own goals, invites 1-5 accountability partners per goal, and everyone sees who showed up each day. The key insight is that goals are per-user, not per-couple. You share specific goals with specific people.

**HabitShare** (4.6 stars, free) does the narrowest version: two or more people see the same habit and comment on each other's progress. No extra features, no clutter. Just shared streaks.

**Habitat** (4.6 stars) scales to groups. You create "habitats" (group habits), invite friends, and see everyone's individual streaks plus a group streak that only advances if everyone completes their goal.

**Tetherly** (2026) takes a proof-based approach: tasks can require photo proof, have approval workflows, and include points/rewards/consequences. Built for "trusted circles" rather than public leaderboards. The key phrase from their site: "accountability that feels personal, visible, and worth coming back to."

### Recommended architecture for this app

```
┌─────────────────────────────────────────────┐
│                  FIREBASE                    │
│                                              │
│  /users/{uid}                               │
│    - displayName, role ("studier"|"health")  │
│    - partnerId                              │
│    - totalPoints, level                      │
│    - visibilityPrefs (what partner sees)     │
│                                              │
│  /users/{uid}/healthLogs/{date}             │
│    - meals: [{name, calories, protein, ...}] │
│    - water, weight, mood                     │
│    - pointsEarned                           │
│                                              │
│  /users/{uid}/studyLogs/{date}              │
│    - pomodoros: [{task, duration, category}] │
│    - leetcodeProblems: number                │
│    - skillProgress: [{skill, level}]        │
│    - pointsEarned                           │
│                                              │
│  /couples/{coupleId}                        │
│    - members: [uid1, uid2]                   │
│    - jointGoals: [{desc, target, current}]  │
│    - weeklyChallenge                        │
│    - sharedStreak                           │
│    - createdAt                              │
│                                              │
│  /couples/{coupleId}/sharedTimeline/{id}    │
│    - type: "encouragement"|"milestone"|...   │
│    - fromUid, message, timestamp            │
│                                              │
│  /global/leaderboards/{weekId}              │
│    - anonymous rankings by points            │
└─────────────────────────────────────────────┘
```

The separate subcollections for health and study logs keep each person's tracking domain clean. The couple document ties them together. The shared timeline is where mutual encouragement lives.

### Tab structure

Three tabs, each one feels like "mine":

- **Health tab** (her primary) - food log, water tracker, weight trend, nutrition charts
- **Study tab** (his primary) - Pomodoro timer, skill tree, LeetCode tracker, career milestones
- **Together tab** (shared) - joint goals, shared streak, encouragement feed, weekly summary

The "Together" tab shows a combined weekly view: "You ate clean 5 days this week. He studied 12 hours. Together you hit 78% of your joint goal." This is the "we're building something together" screen.

---

## 2. Study/Productivity Tracking Best Practices

### Pomodoro technique

Created by Francesco Cirillo in the 1980s using a tomato-shaped kitchen timer. The structure: 25 minutes of focused work, 5-minute break, repeat 4 times, then a 20-30 minute longer break.

Why it works, per research:
- A 1948 Mackworth study showed performance diminishes on a "gradual slope" the longer you spend on a task (Brown Daily Herald, citing Prof. Apoorva Bhandari, Brown University)
- Timer-enforced breaks are more effective than self-regulated ones because "switches cued by external cues are more efficient than those by internal cues"
- The Zeigarnik effect means interrupted tasks are actually easier to resume than completed ones, so breaking work into chunks improves recall
- Matt Nassar (neuroscience, Brown) explains that interleaved breaks clear short-term memory and force "the plasticity" of long-term learning systems

The technique has room for variation. Duke's Academic Resource Center notes that 52 minutes of work and 17 minutes of break is also effective. The key is structure and consistency, not specific intervals.

### Apps that gamify studying

**Forest** (60M+ users, Google Play Best App of the Year):
- Gamified Pomodoro: plant a seed, it grows as you focus. Leave the app, the tree dies.
- 100+ tree species unlocked through milestones
- "Plant Together" feature: sync sessions with friends, one person gives up and everyone's tree withers
- Over 2M real trees planted through Trees for the Future partnership
- Custom tags to categorize focus time (Study, Work, Exercise)
- Visual history as a growing forest map

**Flora** (Dartmouth review, popular among students):
- Similar plant-growing mechanic but adds social accountability
- If you leave the app, your "story" publicly says "Killed a tree"
- Friends can co-grow plants during focus sessions
- Positive reinforcement plus visible consequences for failure

**Focus Plant** (gamified learning):
- Turn focus time into raindrops that grow plants
- Collect 200+ plants, turn them into a forest
- Social feature: help each other collect raindrops, but watch out for "raindrop thieves"
- Syncs with Google Fit to combine meditation and focus data

**SkillForge** (Google Play, 2025):
- Practice tracker for "ambitious people who want to master skills"
- Log focused sessions, plan your day
- Built specifically for skill progression tracking

### Study streak mechanics that work

From research on gamification and habit formation:

1. **Loss aversion is the engine.** A user who built a 14-day streak has invested 14 days of identity into a counter. Breaking it has an emotional cost that outweighs the inconvenience of completing the daily action (Digia Tech, 2026).

2. **Daily action must be easy.** The streak action needs to be completable in under 2 minutes. "Open the app and log 1 pomodoro" works. "Complete a full study session" doesn't because it's too vague and too hard.

3. **Grace days prevent quit spirals.** DuoGoals gives 1 grace day per week. Habitat resets the group streak if anyone fails. The sweet spot for a couple's app: allow 1 miss per week before the shared streak resets.

4. **Visible progress beats abstract goals.** Forest's visual forest, not a number counter, is what keeps people coming back. For studying, this means showing a skill tree or progress visualization, not just "hours studied: 12."

### Making studying feel rewarding (operant conditioning)

The gamification research is clear on this:

- **Points for desired behavior, deduction for omission** works in the short term but can backfire. A 2019 study of Habitica found counterproductive effects: users relabeled tasks as "habits with no due date" to avoid punishment, or felt punished during their most productive times because they couldn't check off tasks fast enough (Diefenbach & Müssig, International Journal of Human-Computer Studies).

- **Intrinsic motivation matters more than extrinsic rewards long-term.** A 2018 BMC Psychology study found that pleasure and intrinsic motivation act as rewards that accelerate habit formation. Behaviors that feel good become habitual after fewer repetitions than behaviors that don't.

- **The optimal structure**: use points and streaks as a short-term onboarding mechanism (first 2-4 weeks), then gradually shift toward progress visualization, mastery indicators, and social recognition as the primary motivators.

- **Context stability helps.** Performing a behavior in a stable context (same time, same place) strengthens the effect of each repetition on habit formation.

---

## 3. Career Goal Tracking

### Breaking down job preparation into milestones

For a CS student targeting a software job, the milestones look like this:

```
MILESTONE 1: Foundation (Weeks 1-4)
  [x] Set up portfolio website
  [x] Create GitHub profile with contribution graph
  [x] Write first draft of resume
  [ ] Complete first 10 LeetCode Easy problems
  [ ] Set up LinkedIn with professional photo

MILESTONE 2: Technical Skills (Weeks 5-12)
  [ ] Complete Spring Boot roadmap (Baeldung, 12 weeks)
  [ ] Finish 50 LeetCode problems (Easy + Medium)
  [ ] Build 1 portfolio project (Spring Boot + React)
  [ ] Learn Docker basics + deploy project

MILESTONE 3: Job-Ready (Weeks 13-16)
  [ ] Polish resume with project descriptions
  [ ] Complete 20 LeetCode Medium problems
  [ ] Practice 5 mock interviews
  [ ] Apply to 20 companies
  [ ] Prepare 3 "tell me about yourself" variants

MILESTONE 4: Interview Phase (Ongoing)
  [ ] Weekly mock interviews
  [ ] Track applications: company, role, status, date
  [ ] Post-interview reflection log
```

### Apps that track career milestones

**Strides** (most versatile): Four tracking types - target, habit, average, milestone. Dashboard shows progress at a glance. Good for complex career goals with multiple sub-goals.

**Milestones - Goal Tracker** (Google Play): Create projects with a target goal, break into well-defined tasks, visualize progress. Simple but focused.

**Career Bit** (Territorium): Shows how skills align with employer requirements using an "Opportunity Fit" score. Tracks competencies as evidence-based records.

### Skill progression visualization

The pattern that works: a skill tree (like a video game) where each skill has levels. For example:

```
Spring Boot: ████████░░ Level 8/10
  - REST Controllers: ██████████ Mastered
  - JPA + MySQL: ████████░░ Level 8
  - Security + JWT: ████░░░░░░ Level 4
  - Testing: ██░░░░░░░░ Level 2
  
DSA: ██████░░░░ Level 6/10
  - Arrays/Strings: ██████████ Mastered
  - Trees/Graphs: ████████░░ Level 8
  - Dynamic Programming: ████░░░░░░ Level 4
  - System Design: ██░░░░░░░░ Level 2
```

This is more motivating than "hours studied: 42" because it shows capability growth, not just time investment.

### Interview prep checklists

Structure them as repeatable templates:

```
INTERVIEW PREP CHECKLIST
Before the interview:
  [ ] Research company: product, tech stack, recent news
  [ ] Review job description, match skills to requirements
  [ ] Prepare 3 STAR stories (Situation, Task, Action, Result)
  [ ] Prepare "Why this company?" answer
  [ ] Prepare "Tell me about yourself" (90 seconds)
  [ ] Test setup (video call, whiteboard, IDE)
  
During the interview:
  [ ] Ask clarifying questions before coding
  [ ] Think out loud
  [ ] Test your solution with examples
  [ ] Discuss time/space complexity

After the interview:
  [ ] Log questions asked and your answers
  [ ] Note what went well
  [ ] Note what to improve
  [ ] Send thank-you email within 24 hours
```

---

## 4. Shared Accountability Features

### How couples see each other's progress

The research on couple accountability apps shows a spectrum:

1. **Full visibility** (HabitShare model): Both people see everything. Simple but no privacy control.

2. **Selective sharing** (Tetherly model): Each person controls what their partner sees. "I'll share my study hours but not my specific struggles."

3. **Proof-based** (Tetherly's core feature): Submit photo proof of completed tasks. Partner approves or requests redo. This works for physical tasks (meal prep, workout completion) but feels weird for studying.

4. **Encouragement-first** (mLife model): The newsfeed shows when someone logs activity. Partners can give "thumbs up" or send encouragement messages. The social support comes before accountability.

**For this app**: Use selective sharing with encouragement-first design. Each person sees:
- Partner's daily streak status (green check or red X)
- Points earned today
- A newsfeed of partner's activities (meal logged, Pomodoro completed, problem solved)
- An encouragement button ("Send a word")

They don't see:
- Specific food choices (unless partner shares)
- Specific study materials or struggles
- Detailed metrics (unless partner chooses to show them)

### Mutual encouragement mechanics

The mLife study (DuBois et al., 2024, University of South Carolina) is the most relevant research here. Key design elements:

1. **Newsfeed of activities**: Automatically posts when someone logs a meal, completes 30 minutes of activity, weighs in, or reads a tip. Partners can "like" these posts.

2. **Support requests**: Anyone can post a question or request for help. Peers respond with advice or encouragement.

3. **Inactive user outreach**: When someone hasn't logged in 24+ hours, the app prompts their partner to send an encouraging message. Pre-written messages are grounded in Social Cognitive Theory:
   - Self-efficacy messages: "Come back! We can come back after a slip by starting with one meal at a time."
   - Social support messages: "I haven't seen you on the app lately. Having support from others makes things easier."
   - Outcome expectation messages: "You're not the only one who's skipped a day! Slips are common and they don't have to ruin progress."

4. **Thank-you system**: After receiving support, you rate how supported you felt. This closes the feedback loop.

The mLIFE trial found that the points group (who earned points for social support activities) showed significantly higher retention than the non-points group. The key: points were awarded for providing support to others, not just for personal behavior.

### "We're building toward something together"

This is the frame that makes a couple's app different from two individual apps side by side.

**Joint goals** in the couple document:
```json
{
  "jointGoals": [
    {
      "id": "goal1",
      "description": "Study 20 hours and eat clean 5 days this week",
      "hisTarget": 20,
      "hisCurrent": 14,
      "herTarget": 5,
      "herCurrent": 3,
      "reward": "Date night at that Italian place"
    }
  ]
}
```

**Weekly summary** (the "Together" tab):
- Combined points for the week
- Both partners' streaks side by side
- Joint goal progress bar
- "This week you both earned 847 points. Your joint goal is 80% complete."
- Encouragement messages exchanged

**The "Build Our Future" meta-goal**: A long-running point accumulator toward a shared reward. At 10,000 points, you both get something you've been wanting. The points come from both health and study activities. This frames discipline in any area as contributing to the relationship.

### The mLIFE trial and social support points

From DuBois et al. (2024), the mLife study at the University of South Carolina:

- 240 participants in a 12-month weight loss RCT
- Both groups got the same diet/PA tracking app
- The intervention group earned points for social support activities: liking a peer's logged activity, sending encouragement messages, responding to support requests, thanking peers
- Maximum 8 points per day for social support
- Leaderboard reset monthly to maintain motivation
- Pilot data showed the points group used the app 50.7 +/- 25 days vs 34.4 +/- 25.8 days for the non-points group
- The hypothesis: gamifying social support (not just personal behavior) improves retention

The finding that matters for this app: **points for supporting your partner reduce the chance you both quit.** The social support mechanics, not the personal tracking, are what keep people engaged long-term.

---

## 5. Catholic Couple Motivation

### Courtship with purpose

The Catholic tradition distinguishes dating from courtship. Courtship is "the chaste preparation for holy matrimony" (Catholicism.org). Its purpose: "to allow a man and a woman to get acquainted with one another and to enable them to learn how they are adapted to one another mentally and temperamentally, so that they can decide whether they should marry one another or not."

Vatican II itself refers to courtship as "the proper preparation for marriage" (Gaudium et Spes).

Key principles relevant to the app:
- **Intentionality**: Every interaction serves the relationship's growth. The app's joint goals and shared progress embody this.
- **Virtue building together**: "The virtues are habits or firm dispositions that help us to be a good person" (Archdiocese of Seattle marriage prep). Prudence, justice, fortitude, temperance. The app tracks the concrete practices of these virtues: discipline in eating, discipline in studying, discipline in prayer.
- **Mutual support as preparation for marriage**: "The very preparation for Christian marriage is itself a journey of faith" (Familiaris Consortio, John Paul II). Building habits together is building the muscle of mutual support that marriage requires.

### Shared spiritual goals

The Archdiocese of Seattle's marriage prep emphasizes: "A shared spiritual life can help strengthen a couple's relationship." They recommend:
- Praying together
- Attending Mass together
- Sharing faith experiences
- Growing in virtue together

For the app, this means a third tracking category in the "Together" tab:

```
SPIRITUAL GOALS
[ ] Prayed together today
[ ] Read Scripture together  
[ ] Said Rosary (individual or together)
[ ] Examined conscience before bed
[ ] Attended Mass today
```

These aren't gamified with points. They're tracked as a shared practice, like a couple's prayer journal. The absence of points here is intentional: spiritual life isn't a game, it's a discipline. But seeing the streak ("We've prayed together 14 days in a row") has its own motivational weight.

### How mutual self-improvement strengthens relationships

From America Magazine's research on Catholic marriage prep (Simcha Fisher, 2022):
- Couples need role models: "real-life examples of Catholic marriage, so they understand what they are getting into"
- Strong communities, not workbooks, teach what marriage should look like
- "Many couples don't realize all the ways in which they will need to support each other"
- Prayer is emphasized as "a necessary and intimate act for married couples"

The app serves as a daily practice of the support skills marriage requires: noticing when your partner is struggling, encouraging them, celebrating their wins, building something together that neither could build alone.

### The theology of marriage preparation as building virtue together

The Catechism (CCC 1601-1666) frames marriage as a "partnership of the whole of life" ordered toward the good of the spouses and the procreation/education of children. The spiritual life of marriage is "a lifelong process of conversion and growth" (Catholic Catechism for Adults).

For a young Catholic man preparing for marriage through career building: the discipline of studying, the temperance of eating well, the fortitude of sticking with hard problems, the prudence of planning a career path, these are all virtues. When his girlfriend sees him building these virtues, and he sees her building her own, they're practicing the exact skills that make marriage work.

The app's framing: "We're not just tracking habits. We're building the people we need to become for each other."

---

## 6. Firebase Data Model for Dual Users

### Complete Firestore structure

```
/firestore.rules

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    function isPartner(userId) {
      return isAuthenticated() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.partnerId == userId;
    }
    function isInCouple(coupleId) {
      return isAuthenticated() && 
        request.auth.uid in get(/databases/$(database)/documents/couples/$(coupleId)).data.members;
    }

    // User profiles
    match /users/{userId} {
      allow read: if isOwner(userId) || isPartner(userId);
      allow create: if isOwner(userId);
      allow update: if isOwner(userId) && request.resource.data.diff(resource.data).affectedKeys()
        .hasOnly(['displayName', 'partnerId', 'totalPoints', 'level', 'visibilityPrefs']);
    }

    // Health logs (her domain)
    match /users/{userId}/healthLogs/{date} {
      allow read: if isOwner(userId) || 
        (isPartner(userId) && get(/databases/$(database)/documents/users/$(userId)).data.visibilityPrefs.showHealthToPartner);
      allow write: if isOwner(userId);
    }

    // Study logs (his domain)
    match /users/{userId}/studyLogs/{date} {
      allow read: if isOwner(userId) || 
        (isPartner(userId) && get(/databases/$(database)/documents/users/$(userId)).data.visibilityPrefs.showStudyToPartner);
      allow write: if isOwner(userId);
    }

    // Career milestones (his domain, private by default)
    match /users/{userId}/careerMilestones/{milestoneId} {
      allow read: if isOwner(userId);
      allow write: if isOwner(userId);
    }

    // Couple document (shared)
    match /couples/{coupleId} {
      allow read: if isInCouple(coupleId);
      allow update: if isInCouple(coupleId) && 
        request.resource.data.diff(resource.data).affectedKeys()
        .hasOnly(['jointGoals', 'weeklyChallenge', 'sharedStreak', 'lastUpdated']);
      // Only Cloud Functions can create couple documents
      allow create: if false;
    }

    // Shared timeline (encouragement feed)
    match /couples/{coupleId}/sharedTimeline/{entryId} {
      allow read: if isInCouple(coupleId);
      allow create: if isInCouple(coupleId);
      // Only the author can delete their own entries
      allow delete: if isInCouple(coupleId) && 
        resource.data.fromUid == request.auth.uid;
    }

    // Spiritual goals (shared, private to couple)
    match /couples/{coupleId}/spiritualGoals/{date} {
      allow read, write: if isInCouple(coupleId);
    }

    // Global leaderboard (read-only for all authenticated users)
    match /global/leaderboards/{weekId} {
      allow read: if isAuthenticated();
      // Only Cloud Functions write
      allow write: if false;
    }
  }
}
```

### Privacy model

Each user controls what their partner sees:

```json
// /users/{uid}
{
  "visibilityPrefs": {
    "showHealthToPartner": true,
    "showStudyToPartner": true,
    "showCareerToPartner": false,
    "showSpiritualToPartner": true,
    "showPointsToPartner": true,
    "showStreakToPartner": true
  }
}
```

Default: everything shared. The user can toggle off any category. The career milestones are private by default because they contain job search details (company names, application statuses) that might feel premature to share.

### Real-time sync

Firestore's onSnapshot listener handles real-time updates without polling:

```javascript
// Listen to partner's daily status
const unsub = onSnapshot(
  doc(db, 'users', partnerUid, 'studyLogs', today),
  (snap) => {
    if (snap.exists()) {
      updatePartnerStudyStatus(snap.data());
    }
  }
);

// Listen to couple's shared timeline
const unsub2 = onSnapshot(
  query(
    collection(db, 'couples', coupleId, 'sharedTimeline'),
    orderBy('timestamp', 'desc'),
    limit(20)
  ),
  (snap) => {
    updateTimeline(snap.docs.map(d => d.data()));
  }
);
```

### Couple creation flow

1. User A creates account, gets UID
2. User A generates a 6-digit invite code (stored in /invites/{code} with their UID)
3. User B enters the code
4. Cloud Function creates the /couples/{coupleId} document with both UIDs
5. Both users' partnerId fields are updated
6. Invite code is deleted

Only Cloud Functions create couple documents, preventing unauthorized pairings.

---

## 7. Gamification That Serves Both Goals

### Single point system

Both health and study activities feed into the same point pool. This is deliberate: it frames discipline in one area as contributing to the same "currency" as discipline in the other.

Point structure:

```
HEALTH ACTIVITIES                    POINTS
Log a meal                           +5
Log all 3 meals in a day             +10 bonus
Drink 8 glasses of water             +5
Weigh in                             +3
Complete a workout                   +15
7-day health streak                  +25

STUDY ACTIVITIES                     POINTS
Complete 1 Pomodoro session          +10
Solve a LeetCode problem             +15 (Easy), +25 (Medium), +40 (Hard)
Complete a career milestone          +30
7-day study streak                   +25

SHARED ACTIVITIES                    POINTS
Encourage your partner               +10
Complete a joint goal daily          +15
Pray together                        +5
Attend Mass                          +10
Weekly review together               +20
```

### "Build Our Future" meta-goal

A long-running accumulator visible on the Together tab:

```
BUILD OUR FUTURE
Current balance: 4,230 / 10,000 points
Progress: ████████████████░░░░ 42%

Next reward: Weekend trip to [place]
Final reward: [something they both want]
```

Both partners contribute. Neither can see who contributed what percentage (this prevents scorekeeping). The frame: every point you earn, whether from eating well or solving algorithms, builds toward something you share.

### Weekly summaries

Every Sunday evening, a combined summary:

```
THIS WEEK TOGETHER
You earned 420 points. She earned 385 points.
Combined: 805 points

HEALTH (her)
  Meals logged: 18/21
  Workouts completed: 4
  Streak: 12 days

STUDY (him)
  Pomodoros completed: 34
  LeetCode problems: 8
  Hours studied: 14.2
  Streak: 7 days

JOINT GOALS
  Pray together: 5/7 days
  Eat clean 5 days: 4/5 (so close!)
  
ENCOURAGEMENT
  You sent 6 encouraging messages
  She sent 4 encouraging messages
  
BUILD OUR FUTURE: +805 this week
```

### The discipline connection

The psychological principle: self-control is a single resource that transfers across domains. A 2012 meta-analysis (Baumeister et al.) found that people who exercised self-control in one area (like diet) showed improved self-control in other areas (like studying). The app's single point system embodies this: the discipline that makes you eat a salad instead of chips is the same discipline that makes you solve a hard LeetCode problem instead of scrolling Instagram.

Framing this to users: "Every time you choose the hard thing, you get stronger. It doesn't matter if it's food or code. It's the same muscle."

---

## 8. Technical Implementation

### React component structure

```
src/
  components/
    health/
      FoodLogger.tsx          // Daily meal input
      WaterTracker.tsx         // Glass counter
      WeightChart.tsx          // Trend over time
      NutritionSummary.tsx     // Macros pie chart
      HealthStreakBadge.tsx    // Current streak display
      
    study/
      PomodoroTimer.tsx        // Start/pause/reset timer
      SkillTree.tsx            // Visual skill progression
      LeetCodeTracker.tsx      // Problem count + difficulty mix
      CareerMilestones.tsx     // Milestone checklist
      StudyStreakBadge.tsx     // Current streak display
      
    together/
      JointGoals.tsx           // Shared goal progress bars
      WeeklySummary.tsx        // Combined weekly report
      EncouragementFeed.tsx    // Shared timeline
      SpiritualGoals.tsx       // Shared spiritual practices
      BuildOurFuture.tsx       // Meta-goal accumulator
      
    shared/
      PointsDisplay.tsx        // Current points + level
      StreakCounter.tsx        // Reusable streak component
      ChartWrapper.tsx         // Unified chart component
      TabNavigation.tsx        // Health / Study / Together tabs
```

### Tab-based navigation

```tsx
// App.tsx
const App = () => {
  const [activeTab, setActiveTab] = useState('together');
  const { user } = useAuth();
  
  // Show the user's primary tab first
  const defaultTab = user.role === 'health' ? 'health' : 'study';
  
  return (
    <AuthProvider>
      <TabBar 
        tabs={['health', 'study', 'together']} 
        active={activeTab} 
        onChange={setActiveTab} 
      />
      {activeTab === 'health' && <HealthDashboard />}
      {activeTab === 'study' && <StudyDashboard />}
      {activeTab === 'together' && <TogetherDashboard />}
    </AuthProvider>
  );
};
```

The user's own tab shows first when they open the app. But the Together tab is always accessible and prominent.

### Shared chart library

Recharts (already used in shadcn/ui) handles all chart types needed:

```tsx
// Weight trend
<LineChart data={weightData}>
  <Line type="monotone" dataKey="weight" stroke="#8884d8" />
</LineChart>

// LeetCode progress over time
<BarChart data={leetcodeData}>
  <Bar dataKey="easy" fill="#4ade80" />
  <Bar dataKey="medium" fill="#fbbf24" />
  <Bar dataKey="hard" fill="#ef4444" />
</BarChart>

// Skill tree as horizontal progress bars
{skills.map(skill => (
  <ProgressBar 
    key={skill.name} 
    label={skill.name} 
    value={skill.level} 
    max={10} 
  />
))}

// Joint goal donut
<PieChart>
  <Pie data={goalProgress} dataKey="value" nameKey="name" />
</PieChart>
```

The same chart library works for calories, study hours, point distributions, and goal progress. The components differ, but the chart primitives are shared.

### Firebase Cloud Functions for combined analytics

```typescript
// functions/src/index.ts

// Weekly summary generator (runs every Sunday at 9 PM)
export const generateWeeklySummary = functions.pubsub
  .schedule('0 21 * * 0')
  .timeZone('Asia/Kolkata')
  .onRun(async (context) => {
    const couples = await admin.firestore().collection('couples').get();
    
    for (const couple of couples.docs) {
      const [uid1, uid2] = couple.data().members;
      const weekStart = getWeekStart();
      
      // Fetch both users' logs for the week
      const [health1, study1, health2, study2] = await Promise.all([
        getWeekLogs(uid1, 'healthLogs', weekStart),
        getWeekLogs(uid1, 'studyLogs', weekStart),
        getWeekLogs(uid2, 'healthLogs', weekStart),
        getWeekLogs(uid2, 'studyLogs', weekStart),
      ]);
      
      // Calculate combined stats
      const summary = {
        weekOf: weekStart,
        partner1: { health: health1, study: study1 },
        partner2: { health: health2, study: study2 },
        combinedPoints: calculateTotal(health1, study1, health2, study2),
        jointGoalProgress: calculateJointProgress(couple.data().jointGoals),
        encouragementCount: await getEncouragementCount(couple.id, weekStart),
      };
      
      // Store summary
      await couple.ref.collection('weeklySummaries').add(summary);
      
      // Update Build Our Future accumulator
      await couple.ref.update({
        totalPoints: admin.firestore.FieldValue.increment(summary.combinedPoints)
      });
    }
  });

// Leaderboard updater (runs daily)
export const updateLeaderboard = functions.pubsub
  .schedule('0 0 * * *')
  .timeZone('Asia/Kolkata')
  .onRun(async () => {
    const users = await admin.firestore().collection('users').get();
    const weekId = getCurrentWeekId();
    
    const rankings = users.docs
      .map(doc => ({
        uid: doc.id,
        displayName: doc.data().displayName,
        weeklyPoints: doc.data().weeklyPoints || 0,
      }))
      .sort((a, b) => b.weeklyPoints - a.weeklyPoints)
      .slice(0, 50);
    
    await admin.firestore()
      .doc(`global/leaderboards/${weekId}`)
      .set({ rankings, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  });

// Points calculator (HTTPS callable)
export const calculateAndAwardPoints = functions.https.onCall(async (data, context) => {
  // Validate the activity type and compute points
  // Write to user's points total
  // Update couple's combined total
  // Check if joint goal thresholds are met
});
```

### Key technical decisions

1. **Firestore over Realtime Database**: Better querying, security rules, and offline support. The data model has complex queries (partner visibility, couple membership) that Firestore handles natively.

2. **Progressive Web App (PWA)**: Both users access from their phones. PWA avoids app store approval while still offering offline support, push notifications, and home screen installation.

3. **Firebase Auth with email/password**: Simplest for a two-user app. No need for social login complexity. Couple linking happens through invite codes.

4. **Cloud Functions for all writes to shared data**: The couple document, leaderboard, and weekly summaries should never be written from the client. Only Cloud Functions update shared state, preventing cheating or accidental data corruption.

5. **Firestore offline persistence**: Enabled by default in the web SDK. Both users can log meals/study sessions offline, and data syncs when they reconnect.

---

## Sources

- DuoGoals app: https://apps.apple.com/us/app/duogoals-accountability-win/id6757510079
- Habitat app: https://apps.apple.com/us/app/habitat-group-accountability/id1506466019
- Tetherly: https://tetherlyapp.com/about
- HabitShare: Referenced in Routinery blog (2026): https://www.routinery.app/blog/best-habit-routine-apps-couples-families
- Forest app: https://forestapp.cc/ and Google Play listing
- Flora app: Dartmouth Academic Skills Center Blog (2021)
- Focus Plant: Google Play listing
- SkillForge: Google Play listing
- mLife study: DuBois et al. (2024), "The Mobile Lifestyle Intervention for Food and Exercise (mLife) Study," Contemp Clin Trials, PMC11700768
- Pomodoro technique: Brown Daily Herald (2026), Duke ARC, Oregon State Academic Success Center
- Gamification and habit formation: Lieder et al. (2024), "Gamification of Behavior Change," PMC10998180
- Counterproductive gamification: Diefenbach & Müssig (2019), Int J Human-Computer Studies
- Habit formation rewards: BMC Psychology (2018), "Exploratory study of the impact of perceived reward on habit formation"
- Streak mechanics: Digia Tech (2026), "Gamification in Mobile Apps: Streaks, Rewards & Retention"
- Catholic courtship: Catholicism.org, "Courtship: The Chaste Preparation for Holy Matrimony"
- Catholic marriage prep: Archdiocese of Seattle, National Catholic Register, America Magazine, Diocese of Columbus
- Firebase security rules: https://firebase.google.com/docs/rules/rules-behavior, https://firebase.google.com/docs/firestore/security/rules-structure
- Couple accountability apps: BossAsAService blog (2026), Flamme blog
- Paired app / Open University study: https://university.open.ac.uk/research-projects/enduring-love/paired
- Firebase SQL Connect (Cloud Next 2026): https://firebase.blog/posts/2026/04/cloud-next-2026-announcements
