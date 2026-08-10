# Jordan Census 2026 — Support Operations Center
## Master Specification & Cursor Build Prompt

> This document replaces all previous scattered prompts. Give this to Cursor as ONE reference file (paste the whole thing, or attach it as a project doc it can read), then build module by module using the phased plan at the bottom — not all at once.

---

## 1. Philosophy (do not deviate from this)

- Field supervisors are **non-technical users**. They never see words like Backend, API, Database, DevOps.
- What a supervisor submits is called a **Report** — an observation, not a ticket.
- A Report only becomes an **Issue** (technical bug/task) after the Support Operations Manager reviews and converts it.
- The system's core measurable goal: reduce the number of things that need a human decision. Every feature must answer yes to: "Does this reduce the manager's workload or the number of reports reaching them?"
- Remove anything not related to support operations (no live enumerator map, no "online now" counters) — those belong to the separate field-operations system, not here.

---

## 2. Core lifecycle

```
Supervisor submits Report
        ↓
Support Manager reviews (ALWAYS — every report lands here first)
        ↓
Manager decision:
  - Not a bug (question / training / user error / complaint) → resolved & closed here
  - Feature request → logged separately, no SLA pressure
  - Bug → Convert to Issue
        ↓
Issue created → assigned to a Team + a specific person
        ↓
   ── EXCEPTION: if the Manager personally assigns the issue directly to a person
      while converting it, it skips any extra approval step and goes straight
      to that person's queue. ──
        ↓
Developer/assignee works on it
        ↓
Developer marks one of:
  - Resolved (no deployment needed) → notifies Manager → Manager confirms → Closed
  - Waiting Deployment (code fixed, needs release to reach the client) → Manager notified
        ↓ (after deploy)
  Ready for Testing → Manager (or QA) verifies
        ↓
  Confirmed → Closed
  OR
  Not actually fixed → Returned to assignee with a comment (loop back to "Developer works on it")
```

Key rule stated explicitly by the Support Manager: **nothing closes itself.** Every resolution requires the Manager's confirmation, except the "reject as not-a-bug" path which the Manager also controls.

---

## 3. Data model (entities Cursor must build)

### Users
- name, email, phone, role, team, specialty tags (e.g. "Authentication", "Sync", "GIS"), governorate, direct manager, shift, current workload (auto-counted open issues), notification preferences (per channel: in-app / email / SMS — with an override that Critical issues always reach every enabled channel regardless of preference)

### Reports (pre-approval)
- reporter (supervisor), governorate/district/center, free-text description, attachments (image / video / voice note / log / PDF), number of enumerators affected (a required field the supervisor fills in, e.g. "how many enumerators does this affect?" as a simple stepper — this is what lets the dashboard say "5 enumerators stopped working today"), timestamp, status: New → Under Review → Classified → Converted / Rejected
- AI-suggested category + confidence score, shown to the Manager as a hint, never auto-decided unless confidence is above a configurable threshold (default 90%+) AND the issue type is on a pre-approved auto-convert list (e.g. "forgot password" is safe to auto-route; anything with high estimated impact is never auto-routed)

### Issues (post-conversion)
- linked to originating Report(s) — supports many-to-one (merging duplicate reports into one Issue)
- category, team, assignee, priority (derived from: number of enumerators affected + spread across governorates + SLA class), status (Received → Assigned → In Progress → Need Info → Waiting Deployment → Ready for Testing → Returned → Closed), SLA target, checklist (per category, e.g. Sync issues get a standard checklist), internal comment thread, activity timeline (every status change timestamped and attributed), resolution note, root cause, close reason.

### Teams / Queues
- Backend, Frontend, Database, DevOps, GIS, Call Center, L1 Support — each team only sees its own queue.

### Routing rules
- Keyword → suggested team table (starter list): login/password/runtime → Backend; crash/UI → Frontend; SQL/timeout → Database; server → DevOps; map/GPS → GIS; SMS/notification → Integration. This is a suggestion only — the Manager always makes the final call, and the table should be editable from an admin screen, not hardcoded.

### Permissions
- A full permission matrix, not just role names: per screen, per action (view / create / edit / delete / assign / close / approve). Manageable from an admin UI — the administrator can restrict or grant these per user or per role.

### Knowledge Base
- Auto-suggested "Create Knowledge Article" button appears once an Issue is closed. Articles are searchable and suggested back to the Manager when a similar new Report comes in.

### Notifications
- Event-driven: on assignment, on status change, on SLA breach, on reassignment.
- Debounced: identical notification type to the same person within a short window (e.g. 2 minutes) collapses into one, to avoid flooding people during spikes.
- Escalation: if unopened after a set time → escalate to team lead; if still unresolved past SLA → escalate to the Manager/admin.

---

## 4. Things explicitly called out as "must fix" gaps (address these directly)

1. **Single point of failure**: since every report must pass through the Manager, add an auto-convert allowlist for very high-confidence, low-impact, previously-seen issue types, so the Manager isn't the bottleneck during report spikes — while keeping every "not resolved" response and every low-confidence classification routed to the Manager without delay.
2. **Connectivity fallback**: the reporting channel itself may be affected by the outage being reported (e.g. "no internet"). Design the Report submission to degrade gracefully — a lightweight low-bandwidth path (short text over SMS/WhatsApp) should be possible in addition to the full app, at least as a manual fallback the Manager can log on the supervisor's behalf.
3. **Impact linkage**: "number of enumerators affected" is captured as a manual field entered by the supervisor at report time (not auto-derived — there is no live roster integration yet). Do not build a feature that assumes automatic enumerator-status tracking; that needs a separate data integration and should be flagged as future work, not built speculatively.
4. **Notification fatigue**: implement debouncing/digest logic from day one, not as a later patch.
5. **Audit log**: every view, edit, assignment, and status change is logged with who + when, from the first version — this is a government project and traceability may be requested later.
6. **Staging environment**: since the system will keep evolving while the census is live, maintain a separate staging/test environment; changes are validated there before touching production during active operations.

---

## 5. Dashboard (Manager's home screen) — decision-focused, not vanity metrics

Show only:
- Needs your review (count)
- Waiting classification (count)
- Waiting assignment (count)
- Waiting deployment (count)
- Waiting your confirmation/testing (count)
- SLA breached (count)
- Today's most-affecting issue (e.g. "17 enumerators currently blocked by X")
- Most frequent issue type this week
- Most loaded team

Explicitly excluded: live enumerator map, "online now" counts, decorative charts that don't drive a decision.

---

## 6. Phased build plan for Cursor (build in this order — do not ask for "a whole platform" in one prompt)

1. **Data model & auth**: Users, Roles, Permission matrix, basic login.
2. **Report intake**: submission form (text + attachments + affected-count field), Report list with statuses.
3. **Manager review screen**: the single most important screen — review a report, see AI suggestion + confidence, choose: reject / classify as non-bug type / convert to Issue (with team + priority + assignee).
4. **Issue lifecycle & team queues**: statuses, checklist, comments, timeline, per-team queue views.
5. **Notification engine**: event triggers, per-user channel preferences, debouncing, escalation rules.
6. **Knowledge Base**: article creation from closed issues, search, and "similar report" suggestion at intake time.
7. **AI assistant**: classification suggestion + confidence score first; auto-resolution suggestions for the supervisor (gatekeeper) as a later phase, only after the classification accuracy is validated with real data.
8. **Dashboard & reports**: build last, once real data exists to decide what's actually useful.

**Instruction to Cursor**: after each phase, stop and confirm the result matches this spec before moving to the next phase. Do not generate unrelated pages, marketing copy, or visual branding not described here. If a requirement is ambiguous, ask rather than inventing a new concept.

---

## 7. Acceptance checklist per phase (verify before telling Cursor "go to the next phase")

Use this to actually test each phase yourself — a few minutes each, not a formal audit.

**Phase 1 — Data model & auth**
- [ ] Can you log in as at least 2 different roles (e.g. Manager, Developer) and see different things?
- [ ] Does creating a user require: name, email, role, team — and does it reject a duplicate email?
- [ ] Open the permissions screen — can you actually toggle a permission for one role and see it take effect (e.g. remove "delete" from Developer and confirm the delete button disappears for that role)?

**Phase 2 — Report intake**
- [ ] Submit a report as a supervisor with only text — does it save with status "New"?
- [ ] Submit one with an attached image — does the image actually open/download afterward, not just show a filename?
- [ ] Is the "number of enumerators affected" field required — does it block submission if empty?
- [ ] Does the Report list show governorate/district and let you filter by it?

**Phase 3 — Manager review screen**
- [ ] Open a new report — do you see the AI-suggested category and a confidence percentage (even if AI isn't fully built yet, is there a placeholder field)?
- [ ] Can you reject a report as "not a bug" and does it disappear from your queue but stay searchable/closed?
- [ ] Can you convert a report to an Issue and directly assign it to a specific person, and does it skip any extra approval step?
- [ ] Does the "affected enumerators" number carry over visibly onto the created Issue?

**Phase 4 — Issue lifecycle & team queues**
- [ ] Log in as a Developer — do you see ONLY your team's issues, not everyone's?
- [ ] Can the developer mark "Waiting Deployment" as a distinct status from "Resolved"?
- [ ] Does closing an issue require the Manager's confirmation — i.e. can the developer NOT close it directly?
- [ ] Is there a visible timeline showing every status change with a timestamp and who made it?

**Phase 5 — Notification engine**
- [ ] Assign an issue — does the assignee actually get a notification (in-app at minimum)?
- [ ] Trigger 3 similar notifications quickly — do they collapse into one, or do you get spammed 3 times?
- [ ] Does an overdue (past SLA) issue visibly flag itself or escalate?

**Phase 6 — Knowledge Base**
- [ ] Close an issue — does a "Create Knowledge Article" option appear?
- [ ] Search the Knowledge Base for a keyword from a past issue — does it return that article?
- [ ] Submit a new report similar to a past one — does the system suggest the existing article or similar report?

**Phase 7 — AI assistant**
- [ ] Submit a clearly simple report ("forgot password") — does AI suggest the right category with high confidence?
- [ ] Submit a vague/unclear report — does it get a LOW confidence score and land in your queue instead of auto-routing?
- [ ] Does the AI never auto-close anything — does every "not resolved" response from a supervisor always reach you?

**Phase 8 — Dashboard**
- [ ] Does the homepage show only decision-relevant counts (needs review, waiting classification, SLA breached, etc.), not vanity charts?
- [ ] Does the "most affecting issue today" number match what you'd expect from the data you entered during testing?
- [ ] Is there NO live enumerator map or "online now" counter?

If any box stays unchecked, tell Cursor exactly which one before moving forward — don't say "continue," describe the specific gap.

---

## 8. Ready-to-paste prompts — one per phase

Paste ONLY the current phase's prompt into Cursor. Wait until you've checked every box in that phase's checklist (Section 7) before sending the next one. Each prompt assumes Cursor already has the full spec above as context (paste this whole file into the project once, e.g. as `SPEC.md`, so Cursor can refer back to it).

### Phase 1 prompt — Data model & auth
```
Using SPEC.md as the reference, build ONLY Phase 1: Data model & authentication.

Build:
- Database schema for Users (name, email, phone, role, team, specialty tags, governorate, direct manager, shift) and Roles.
- A Permission entity that maps: role (or individual user override) × screen × action (view/create/edit/delete/assign/close/approve) → allowed true/false.
- Login screen and session handling.
- A basic admin screen where an admin can create users and toggle permissions per role, and see the effect immediately (e.g. removing "delete" from a role hides the delete button for that role elsewhere in the app).

Do NOT build Reports, Issues, notifications, dashboard, or AI features yet — those are later phases. Stop when this phase is done and tell me what to test.
```

### Phase 2 prompt — Report intake
```
Using SPEC.md as the reference, build ONLY Phase 2: Report intake.

Build:
- A Report submission screen for supervisors: free-text description, attachments (image/video/voice note/log/PDF), governorate/district/center selector, and a REQUIRED field "number of enumerators affected" (simple stepper input) that blocks submission if left empty.
- A Report list/table view showing status (New / Under Review / Classified / Converted / Rejected), governorate, and filterable by governorate and status.
- Attachments must be actually openable/downloadable after submission, not just show a filename.

Do NOT build the Manager review/classification logic yet, Issues, or AI suggestions — those are later phases. Stop when this phase is done and tell me what to test.
```

### Phase 3 prompt — Manager review screen
```
Using SPEC.md as the reference, build ONLY Phase 3: the Manager review screen.

Build:
- A queue of New/Under Review reports visible only to the Support Manager role.
- For each report, the Manager can: (a) reject it as "not a bug" with a reason category (question/training/user error/complaint/feature request) — this closes the report but keeps it searchable; or (b) convert it to an Issue.
- The conversion dialog lets the Manager set: category, priority, responsible team, and OPTIONALLY assign directly to a specific person. If the Manager assigns directly to a person, the resulting Issue goes straight to that person's queue with no extra approval step.
- The "number of enumerators affected" value from the report must carry over and display on the created Issue.
- Add a placeholder field for "AI suggested category" and "confidence %" on each report — leave it manually empty/null for now, we'll wire up real AI in Phase 7.

Do NOT build the Issue lifecycle (statuses beyond creation), team queues, or notifications yet. Stop when this phase is done and tell me what to test.
```

### Phase 4 prompt — Issue lifecycle & team queues
```
Using SPEC.md as the reference, build ONLY Phase 4: Issue lifecycle and team queues.

Build:
- Issue statuses: Received → Assigned → In Progress → Need Info → Waiting Deployment → Ready for Testing → Returned → Closed.
- Team-scoped queues: Backend, Frontend, Database, DevOps, GIS, Call Center, L1 Support — each team member sees ONLY their team's issues.
- A category-based checklist attached to each issue (e.g. Sync issues get a standard checklist of steps).
- An internal comment thread per issue.
- A full activity timeline per issue: every status change, comment, and assignment logged with timestamp and who did it.
- CRITICAL RULE: a developer/assignee can mark an issue "Resolved" or "Waiting Deployment", but CANNOT close it themselves. Only the Support Manager can move an issue to Closed (confirming the fix actually worked). If the Manager rejects the fix, the issue returns to the assignee with a required comment explaining why.

Do NOT build notifications or the dashboard yet. Stop when this phase is done and tell me what to test.
```

### Phase 5 prompt — Notification engine
```
Using SPEC.md as the reference, build ONLY Phase 5: the notification engine.

Build:
- Event-driven notifications triggered by: new assignment, status change, SLA breach, reassignment.
- Per-user notification channel preferences (in-app / email / SMS), stored on the User entity, EXCEPT: Critical-priority issues always notify through every enabled channel regardless of preference.
- Debouncing: if the same person would receive more than one notification of the same type within a short window (e.g. 2 minutes), collapse them into a single combined notification instead of sending multiples.
- Escalation: if a notification isn't acknowledged/opened within a configurable time, escalate to the team lead; if the issue then passes its SLA, escalate further to the Support Manager/admin.

Stop when this phase is done and tell me what to test.
```

### Phase 6 prompt — Knowledge Base
```
Using SPEC.md as the reference, build ONLY Phase 6: the Knowledge Base.

Build:
- A "Create Knowledge Article" action that appears once an Issue is set to Closed, pre-filled from the issue's description/resolution/root cause (editable before saving).
- A searchable Knowledge Base list/screen.
- When a new Report is submitted (or reviewed by the Manager), search existing closed reports/issues and knowledge articles for similar text and surface up to 3 likely matches as suggestions.

Stop when this phase is done and tell me what to test.
```

### Phase 7 prompt — AI assistant
```
Using SPEC.md as the reference, build ONLY Phase 7: the AI classification assistant.

Build:
- On report submission, analyze the free-text description (Arabic, including colloquial/dialect phrasing) and output: a suggested category, suggested responsible team (using the routing-rules keyword table from SPEC.md as a starting point, but allow it to be smarter than pure keyword matching), and a confidence score (0-100%).
- Display this suggestion + confidence to the Support Manager on the review screen (replacing the placeholder field from Phase 3) — the Manager can always override it.
- Only reports with confidence at or above a configurable threshold (default 90%) AND on a pre-approved low-risk category list (e.g. "forgot password") may be auto-converted to Issues without waiting for Manager review. Every other report — including anything low-confidence or high-estimated-impact — always waits for the Manager.
- If a supervisor later reports that a suggested/auto-applied fix did NOT work, that report must immediately reach the Support Manager's queue with no further AI filtering.

Do not build a "gatekeeper that resolves things before they become reports" yet — that only comes after this classification step is validated with real data. Stop when this phase is done and tell me what to test.
```

### Phase 8 prompt — Dashboard
```
Using SPEC.md as the reference, build ONLY Phase 8: the Support Manager dashboard.

Build a homepage showing ONLY:
- Needs your review (count)
- Waiting classification (count)
- Waiting assignment (count)
- Waiting deployment (count)
- Waiting your confirmation/testing (count)
- SLA breached (count)
- Today's most-affecting issue (highest "enumerators affected" number among open issues today)
- Most frequent issue category this week
- Most loaded team (by open issue count)

Do NOT add a live enumerator map, an "online now" counter, or decorative charts that don't map to one of the counts above. Every element must help the Manager decide what to do next, not just display statistics.
```
