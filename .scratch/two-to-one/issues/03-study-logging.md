# 03: Study logging

**What to build:** Robi logs a pomodoro with one tap, or a problem tagged Easy, Medium, or Hard with a difficulty-ordered point bonus. The log advances the study streak once per day and rolls the same 8-15 base band with a 10% doubling chance. Jess sees his streak, his points, and a difficulty mix bar of Easy/Medium/Hard counts, plus generic feed lines, but never the task label or problem name. Robi can opt to surface a private log detail as a highlight line that Jess can see.

**Blocked by:** 01 (App skeleton and persistence)

**Status:** done

- [x] One-tap pomodoro logging advances the study streak once per day
- [x] Problem logging captures a difficulty of Easy, Medium, or Hard and awards a higher bonus for harder problems
- [x] The difficulty mix bar (E/M/H counts) renders in the shared view
- [x] Task labels and problem names never appear in the shared surface (ADR-0007)
- [x] Feed line for a study action is neutral ("Robi finished a Hard problem"), never judgment-bearing
- [x] Highlight line opt-in surfaces a chosen private detail to Jess; nothing private leaks without it