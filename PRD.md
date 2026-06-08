# PRD — Powerlifting Tracker Web App

> Companion to `PROGRAM.md`. That file defines the training methodology; this file defines a
> web app to track and run it. Read `PROGRAM.md` first — the data model and progression
> engine below are direct encodings of its logic.

Status: Draft v0.1 · Owner: athlete (renate@formas.ai) · Date: 2026-06-07

---

## 1. Problem & vision

Returning powerlifter following a high-frequency, AMRAP-autoregulated program (see
`PROGRAM.md`). Today the program lives in markdown + memory. He needs an app that:
- Stores his **Training Maxes** and recent best efforts.
- Generates each session's **prescribed weights** from TM × the program's percentages.
- Lets him **log actual sets/reps/RPE** in the gym, fast, on a phone.
- **Auto-progresses the Training Max** based on logged AMRAP performance (the §7 rule).
- Shows **progress over time** on the core lifts (bench, deadlift, squat).

**Vision:** a personal, opinionated tracker that *knows this specific program* — not a generic
logger. The progression engine is the product.

**MVP scope (v1):** track the **3 core lifts only** (bench, deadlift, squat). Accessories are
display-only checklists, not analyzed.

---

## 2. Target user
Single user to start (the athlete). Mobile-first (logged at the gym between sets). Possible
later: multi-user so a coach/AI can review and adjust.

---

## 3. Goals & non-goals

**Goals**
- Set & store TMs per lift; edit history retained.
- Auto-generate a session from the weekly template (Day 1–4) using current TMs.
- One-tap-fast set logging (weight, reps, RPE) optimized for rest-period entry.
- AMRAP-driven TM auto-progression with manual override.
- Charts: estimated 1RM trend, TM history, volume (tonnage) per lift per week.
- Export data (CSV/JSON) — never trap the data.

**Non-goals (v1)**
- Social features, marketplace, generic program builder.
- Nutrition tracking.
- Wearable/HR integration.
- Analyzing accessory lifts.

---

## 4. Core concepts → data model

```
Athlete
  id, name, bodyweightKg, units (kg default)

Lift            // the three core lifts
  id, name ("bench"|"deadlift"|"squat"), trainingMaxKg, tmUpdatedAt

TrainingMaxEvent          // append-only history of TM changes
  id, liftId, oldTM, newTM, reason ("amrap_beat"|"manual"|"phase0_linear"), at

ProgramConfig
  phase ("reintro_linear" | "wave"), weekIndex (1..4), cycleIndex
  // percentages & rep schemes are encoded in code per PROGRAM.md §6–7

WeeklyTemplateDay         // static definition, see PROGRAM.md §5
  dayNumber (1..4), slots: [ { liftId, role: "heavy"|"medium"|"light", scheme } ]

Session                   // one workout instance generated from a template day
  id, athleteId, dayNumber, datePlanned, dateCompleted, phase, weekIndex, status

PrescribedSet             // what the app told him to do
  id, sessionId, liftId, role, orderIndex,
  targetWeightKg, targetReps, isAmrap, targetRpe, isBackoff

LoggedSet                 // what he actually did
  id, prescribedSetId, sessionId, liftId,
  actualWeightKg, actualReps, actualRpe, notes, loggedAt

AccessoryItem             // display-only checklist (v1)
  id, sessionId, name, scheme, done (bool)
```

### Progression engine (encodes PROGRAM.md §7)
- **Percentages by role:** heavy = top set 80–85% TM (+ back-offs at −12%); medium = 70–75%
  TM × 4–5×5–6; light = 65–70% TM × 6–8×2–3.
- **Wave by week:** W1 80%/5+ AMRAP, W2 82.5%/4+, W3 85%/3+, W4 deload 65%.
- **TM auto-update on heavy-day AMRAP:** beat target reps by ≥2 → +2.5 kg (bench) / +5 kg
  (squat/DL); exactly hit → small bump (+1.25 / +2.5); miss → hold. Always writes a
  `TrainingMaxEvent`; always user-overridable.
- **Rounding:** to nearest available plate increment (config: default 2.5 kg, allow 1.25 kg).

---

## 5. Key screens / flows

1. **Home / Today** — shows the next scheduled day (1–4), its lifts, prescribed weights.
   Big "Start Session" button.
2. **Session (in-gym)** — list of prescribed sets grouped by lift. Each set: target shown,
   tap to log actual (weight/reps/RPE pre-filled with target, ± steppers). AMRAP set
   visually flagged. Rest timer optional. Accessory checklist at the bottom.
3. **Session complete** — summary; if a heavy AMRAP was logged, show proposed TM change with
   Accept/Edit/Decline.
4. **Lifts / TMs** — current TM per lift, edit, view TM history chart.
5. **Progress** — per lift: estimated 1RM trend (Epley/Brzycki from best logged set),
   tonnage/week, AMRAP rep history.
6. **Settings** — bodyweight, plate increments, phase toggle (reintro↔wave), export.

---

## 6. Estimated-1RM formulas
Display est. 1RM from any logged set for trend charts (not for TM logic):
`Epley: w*(1+reps/30)` · `Brzycki: w/(1.0278−0.0278*reps)`. Show the higher-confidence
(lower-rep) estimates more prominently.

---

## 7. Suggested tech (keep it light)
- **Frontend:** mobile-first PWA. React/Svelte; installable, works offline in the gym.
- **State/local-first:** IndexedDB (offline log) syncing to a backend.
- **Backend/DB:** the athlete already runs a Node/Express + Firebase/Firestore stack
  (Formas.ai). Easiest path: a small Firestore project reusing that competence —
  collections map 1:1 to §4. Auth via Firebase Auth (single user fine to start).
- **Charts:** any lightweight lib (Chart.js / uPlot).
- **No premature scale.** One user, a few writes per session — Firestore free tier is ample.

---

## 8. MVP cut line (v1 — ship this first)
1. Set the 3 TMs. 2. Generate Day 1–4 sessions with prescribed weights. 3. Log sets fast on
mobile. 4. AMRAP → TM auto-progression with override. 5. Est-1RM + TM-history charts.
6. CSV export. Accessories = static checklist.

**v2+ ideas:** coach/AI review mode (read-only share of logs + ability to push TM/program
edits), deload auto-scheduling, fatigue/RPE-trend warnings, running-load awareness to
auto-lighten a leg day, plate-math visualizer, Apple Health import for bodyweight.

---

## 9. Open questions
- Strict 4-day cadence, or flexible "do the next day whenever"? (Recommend flexible —
  sessions are a queue, not calendar-locked, given running schedule.)
- Should the app track running load to modulate squat/DL volume? (v2.)
- Single-user forever, or build auth/multi-tenant from day 1? (Recommend single-user MVP.)
