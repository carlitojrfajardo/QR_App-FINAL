# QR_App — Live Demo Script

> Based on the panel outline: **Introduction → Original app → Your improvements → Challenges and learnings → Closing → Q&A**
>
> Target duration: **7–8 minutes** + Q&A  
> Fill in: **[Your Name]**, **[Section]**, **[Instructor/Panel]**, **[Date]**

---

## 0. Before the demo (5-minute checklist)

### Demo accounts

| Role | Email | Password | Used for |
|---|---|---|---|
| Student | `[student email]` | `[password]` | Role gate, scanning, history, duplicate scan |
| Teacher | `[teacher email]` | `[password]` | Create event, Smart QR, close/reopen |
| Admin | `[admin email]` | `[password]` | Dashboard, user management, no Scan tab |

> The admin account must already exist in Supabase and must be the only admin. See `ADMIN_SETUP.md`.

### Setup

- [ ] Internet is working; Supabase project is reachable.
- [ ] The latest `schema.sql` has been run in Supabase (tables, RLS policies, single-admin trigger/index).
- [ ] Expo app is running: `npx expo start -c`.
- [ ] Two devices ready: **laptop/tablet for teacher/admin**, **phone for student scanner**.
- [ ] Camera permission is already granted on the student phone.
- [ ] Log in once with each account to confirm the roles are correct.
- [ ] Student account role = `student`; teacher account role = `teacher`; admin role = `admin`.
- [ ] Prepare a unique event code for the live demo, e.g. **`DEMO-2026-001`**.
- [ ] Keep a backup screenshot/video of each demo step in case Wi-Fi or camera fails.
- [ ] Hide bookmarks bar, notifications, and `.env` / Supabase keys.
- [ ] Browser/app zoom at 100%; bottom navigation visible.

### Test event details (create live during the demo)

| Field | Value |
|---|---|
| Event Title | `Demo Assembly` |
| Event Code | `DEMO-2026-001` |
| Venue | `Gymnasium` |
| Description | `Live demo event` |
| Start Time | current time |
| End Time | tap **+1 hour** |

> Creating the event automatically generates a **Smart QR** valid for **1 hour**.  
> If you need more time, use **Rotate (2 hours)** or **Rotate (3 hours)**.

### If something fails

- Camera fails → use the **manual event code** field on the Scan screen as a last resort, or show the backup video.
- Wi-Fi/Supabase fails → switch to backup screenshots and explain the flow.
- Wrong account/role → log out from **Profile → Sign Out**, then log in with the correct demo account.
- Event expired/closed → teacher taps **Reopen** or **Rotate**, then scan again.

---

## 1. Introduction (0:00–0:30)

**Say:**

> "Maayong buntag, panel. Ako si **[Your Name]**, gikan sa **[Section]**. Ang akong app kay **QR_App** — usa ka cloud-based QR attendance system para sa school events.  
> Ang goal ani kay paspason ang attendance, prevent duplicate scans, ug make sure nga verified student ug valid event ang gi-scan."

**Do:** Show the Home screen with the QR_App background and bottom navigation.

---

## 2. Original app (0:30–1:15)

**Say:**

> "Before nako giusab, ang base app kay **local-first Expo/React Native prototype**."

**What the base code could do:**

- Create an event (title, code, start time, end time).
- Generate a QR code for the event.
- Scan the QR using the phone camera.
- Validate the start/end time window.
- Prevent duplicate attendance locally using SQLite `UNIQUE`.
- Show the student's attendance history.

**What it lacked:**

- **Hardcoded user** — every scan was saved as `STUDENT-2026-001`.
- **No login, registration, or session management**.
- **No student/teacher/admin roles** — anyone could open the Teacher tab.
- **SQLite only** — data was local to one device; no cloud sync.
- **No Row Level Security** — no database-level access control.
- **No admin dashboard or user management**.
- **Profile was only a placeholder**.
- **Static QR** — a screenshot could be reused; no rotation or expiry.
- **No teacher attendance view** — only the single student's history.

**Say:**

> "Functioning prototype siya, pero dili pa multi-user, dili pa cloud-ready, ug dili pa secure."

---

## 3. Your improvements — live demo (1:15–5:45)

**Say:**

> "Tulo ka main features ang i-demo nako live:  
> **1)** secure accounts ug role-based access,  
> **2)** Smart QR attendance, ug  
> **3)** admin control center.  
> Underneath ana kay **Supabase Auth, PostgreSQL, ug Row Level Security**."

---

### Feature 1 — Secure accounts and role-based access (1:15–2:15)

**Do:** Log in as the **student** account.

**Say:**

> "Una, student. Makita ninyo ang Home with **Scan QR Code**."

**Do:** Tap the **Teacher** tab.

**Expected result:** `Teachers Only` / "Only teacher accounts can create events."

**Say:**

> "As a student, dili ko makabuhat og events. Role-gated ang Teacher tab."

**Do:** Tap the **Dashboard** tab.

**Expected result:** "The dashboard is for Teachers and Admins. As a Student, please check your History tab."

**Say:**

> "Same sa Dashboard — student cannot see campus-wide data."

**Do:** Log out via **Profile → Sign Out**, then log in as the **teacher** account.

**Say:**

> "Karon teacher account. Makita ninyo nga naa na ang event creation form.  
> So ang role nag-control sa access — pero importante: naa sad ni sa database policies, dili lang sa UI."

**Point to:** The Teacher form and the role badge on Profile if needed.

---

### Feature 2 — Smart QR attendance (2:15–4:15)

**Do:** On the teacher device, fill in the test event:

- Title: `Demo Assembly`
- Code: `DEMO-2026-001`
- Venue: `Gymnasium`
- Description: `Live demo event`
- Start Time: current time
- End Time: tap **+1 hour**

**Say:**

> "Mo-create ko og event: **Demo Assembly**, code **DEMO-2026-001**, venue Gymnasium, start karon, end +1 hour."

**Do:** Tap **Create Event**.

**Expected result:** The Smart QR appears with:
- `Expires: [time]`
- `Rotate (1 hour)`
- `Rotate (2 hours)`
- `Rotate (3 hours)`

**Say:**

> "After saving, mugawas ang **Smart QR**. Naa'y expiry ug tulo ka rotation options: 1 hour, 2 hours, 3 hours."

**Point to:** The QR, the expiry text, and the rotate buttons.

**Say:**

> "Ang QR naay **token** ug **expiry**. Kung mo-rotate ko, mausab ang token, so ang old screenshot dili na modawat.  
> Kani ang anti-screenshot and time-limited feature."

**Do:** On the student phone, open **Scan** and point at the QR.

**Expected result:** `Attendance recorded!` and the event title.

**Say:**

> "Karon, student phone. Open Scan, point at the QR.  
> **Attendance recorded!** Makita ang event title."

**Do:** Open **History** on the student phone.

**Expected result:** `Demo Assembly` with status **PRESENT** and the scan timestamp.

**Say:**

> "Naa dayon sa History — status **PRESENT** and timestamp."

**Do:** Tap **Scan Again**, then scan the same QR again.

**Expected result:** `Already registered for this event.`

**Say:**

> "Kung i-scan nako balik — **Already registered for this event.**  
> Ang database unique constraint ang nag-block, dili lang app-side check."

**Optional — show late detection:**

> If you prepared an event that started more than 15 minutes ago, scan it and show the **LATE** badge.  
> "Late ang status kung lapas 15 minutes sa start time."

**Optional — show closed event:**

- Teacher: **My Events → Close**.
- Student: scan again → `Event is closed.`
- Teacher: **Reopen** to continue.

**Optional — show old QR rejection (needs two phones/screenshots):**

- Screenshot the current QR on a second phone.
- Teacher taps **Rotate (1 hour)**.
- Student scans the old screenshot → `Old QR code. Please scan the latest QR on screen.`

---

### Feature 3 — Admin control center (4:15–5:45)

**Do:** Log out, then log in as the **admin** account.

**Say:**

> "Karon admin. Ang admin kay manually created sa Supabase — **only one admin is allowed**."

**Do:** Show the Home screen and bottom navigation.

**Expected result:**
- No **Scan** tab in the bottom navigation.
- Home CTA is **Open Dashboard**, not **Scan QR Code**.

**Say:**

> "Makita ninyo: wala nay **Scan** tab. Ang Home CTA kay **Open Dashboard** instead of **Scan QR Code**.  
> Admin monitors attendance; admin does not check in."

**Do:** Tap **Open Dashboard**.

**Expected result:** Admin Dashboard with:
- `CONTROL CENTER`
- Total events, scans, present, late
- Campus pulse
- Event attendance trends
- User management

**Say:**

> "Naa ang campus-wide KPIs: total events, scans, present, late, campus pulse, event trends, ug user management."

**Do:** Scroll to **User management**.

**Point to:**
- The single **admin** row with **read-only** text.
- Role chips for other users: only **Student** and **Teacher**.

**Say:**

> "Ang admin row kay read-only. Ang role chips kay **Student** ug **Teacher** ra — walay Admin option.  
> So dili ko makabuhat og second admin from the UI."

**Do:** Promote one student to **Teacher**.

**Expected result:** Message like `student@email → teacher`.

**Say:**

> "Kung i-promote nako ni nga student to Teacher — `email → teacher`.  
> Then kung mo-log in siya, naa na siya'y Teacher access."

**Optional — prove `/scan` is blocked:**

> On web, open `http://localhost:8081/scan` while logged in as admin.  
> It redirects back to Home. "Direct URL gihapon, gi-redirect ko sa Home."

**Say:**

> "Under the hood, the single-admin rule is enforced in PostgreSQL:  
> a **`guard_profile_role` trigger**, a **partial unique index** (`profiles_one_admin_idx`), and a **signup policy** that forces `student`.  
> So bisan mo-call directly sa Supabase API, dili maka-escalate."

---

### Bonus — Cloud and RLS (5:45–6:00)

**Say:**

> "Ang tanan nga data kay naa sa Supabase PostgreSQL: `profiles`, `events`, ug `attendance`.  
> Naa'y Row Level Security: students see their own attendance, teachers see their own events, admin sees campus-wide data."

**Optional:** Show the Supabase Table Editor with the new `attendance` row, or skip to save time.

---

## 4. Challenges and learnings (6:00–7:00)

**Say:**

> "Isa ka problema nga na-encounter nako kay ang **role security**.  
> Sa una, abi nako okay na nga gitago ang admin option sa UI. Pero ang signed-in user pwede gihapon mo-call directly sa Supabase ug i-update ang ilang role kay allowed sa profile update policy.  
> Nakat-on ko nga **ang pagtago sa UI dili security boundary**."

**Say:**

> "So gi-fix nako sa PostgreSQL:  
> naay **trigger** nga nag-guard sa role changes,  
> **partial unique index** nga only one admin,  
> ug **signup insert policy** nga `student` ra.  
> Gi-test nako ang tulo ka attack paths: self-promotion, second-admin creation, ug last-admin demotion.  
> Gitago gihapon sa app ang admin controls, pero ang database ang tinuod nga gatekeeper."

**Optional second learning:**

> "Isa pa ka challenge ang auth state sa Expo Go — unreliable ang `getSession()` ug `onAuthStateChange()`, mao naghimo ko og lightweight pub/sub auth store ug explicit `router.replace()` after sign-in/sign-out."

---

## 5. Closing (7:00–7:30)

**Say:**

> "Sa summary, gi-convert nako ang local SQLite prototype into a **cloud-based, multi-user QR attendance system** with Supabase Auth, PostgreSQL, RLS, role-based access, rotating Smart QR codes, and an admin control center.  
> Karon naa na ang app og real student, teacher, and admin accounts; prevents duplicate and stale scans; ug naa na'y campus-wide visibility ang admin without a scanner."

**Say:**

> "Salamat kaayo, panel. Ready ko sa inyong questions."

---

## 6. Questions and answers — code explanation

### 30-second code flow

> "Login goes through `lib/auth.ts` → Supabase Auth → profile lookup in `lib/profiles.ts` → role-based tabs and screens.  
> Teacher creates an event through `lib/events.ts` → `rotateQrToken` generates a token and expiry → `lib/qr.ts` builds the Smart QR payload.  
> Student scans → `lib/attendance.ts` parses the payload, checks token/expiry/closed status/time window, inserts attendance, and the PostgreSQL unique constraint blocks duplicates.  
> Admin dashboard reads aggregates from `lib/attendance.ts` and manages roles through `lib/profiles.ts`."

### Code map

| Layer | File | Key functions |
|---|---|---|
| Auth | `lib/auth.ts` | `signIn`, `signUp`, `signOut`, `useAuth` |
| Profiles / roles | `lib/profiles.ts` | `getProfile`, `updateProfile`, `updateUserRole` |
| Events | `lib/events.ts` | `createEvent`, `getEventsByTeacher`, `getEventByCode`, `closeEvent`, `reopenEvent`, `rotateQrToken` |
| QR format | `lib/qr.ts` | `buildSmartQRPayload`, `parseQRPayload` |
| Attendance | `lib/attendance.ts` | `registerAttendance`, `computeStatus`, `getAttendanceHistory`, `getTeacherEventAttendance`, `getTeacherEventSummary` |
| Scanner UI | `app/(tabs)/scan.tsx` | Camera, manual fallback, `registerAttendance` |
| Teacher UI | `app/(tabs)/teacher.tsx` | Event form, Smart QR display, rotate/close/reopen |
| Admin UI | `app/(tabs)/dashboard.tsx` | Campus KPIs, trends, user management |
| Database rules | `schema.sql` | Tables, RLS policies, `guard_profile_role` trigger, `profiles_one_admin_idx` |

### Likely questions and answers

1. **How does login work?**  
   Supabase Auth via `lib/auth.ts`. `signIn` sets the session, then `router.replace('/(tabs)')`. The root layout redirects unauthenticated users to `/login`.

2. **How do you know the user's role?**  
   The `profiles` table is linked to `auth.users`. `getProfile(user.id)` returns `role`, and screens/tabs use it to allow or block access.

3. **How does QR validation work?**  
   `parseQRPayload` accepts the `v:1` JSON format or a bare event code. `registerAttendance` checks the event, closed status, Smart QR token, expiry, and start/end time before inserting.

4. **How do you prevent duplicate attendance?**  
   PostgreSQL has a unique constraint on `(student_id, event_id)`. A duplicate insert returns error code `23505`, which the app maps to `Already registered for this event.`

5. **How does Smart QR prevent screenshots?**  
   The QR contains a token and expiry. The event row stores the current `qr_token` and `qr_expires_at`. Rotating changes the token; old screenshots fail the token match or expiry check.

6. **How is "late" computed?**  
   `computeStatus` compares the scan time to the event start time. `LATE_GRACE_MINUTES = 15`; after 15 minutes, the status is `late`; otherwise `present`.

7. **How is the single admin enforced?**  
   A trigger (`guard_profile_role`) guards role changes, a partial unique index (`profiles_one_admin_idx`) allows at most one admin, and the signup policy forces `student`.

8. **What is RLS?**  
   Row Level Security in `schema.sql`. Students can read their own attendance, teachers can read attendance/profiles for their own events, and admins can read campus-wide data.

9. **How does the admin dashboard get data?**  
   `getAdminOverview`, `getAttendanceTrends`, and `getAllProfiles` in `lib/attendance.ts` / `lib/profiles.ts`. Teachers use `getTeacherEventSummary`.

10. **Why does the admin have no Scan tab?**  
    Admins monitor attendance; they do not check in. The tab is hidden with `href: null`, the Home CTA becomes **Open Dashboard**, and `/scan` redirects admins to Home.

11. **What happens if the app is offline?**  
    The app needs Supabase for auth and data. Offline queuing/retry is a future improvement; currently the app shows an error if the network fails.

12. **How does the background logo work?**  
    `components/BrandBackground.tsx` uses the transparent `assets/images/qr-app-logo.png` with `resizeMode="contain"`, `opacity: 0.3`, and a blur. It is applied to Home, History, Teacher, Dashboard, and Profile; Scan and the Teacher QR card stay clean.

13. **What would you improve next?**  
    Offline mode with a retry queue, push notifications for events, CSV export, geofencing, analytics, automated tests, and stronger admin audit logs.

14. **What did you learn?**  
    Security must be enforced at the database layer, not just the UI; RLS and constraints are part of the feature, not an afterthought. I also learned how to structure a React Native app into auth, profiles, events, QR, and attendance modules.

---

## Quick timing guide

| Section | Time |
|---|---|
| Introduction | 0:00–0:30 |
| Original app | 0:30–1:15 |
| Feature 1 — Roles | 1:15–2:15 |
| Feature 2 — Smart QR | 2:15–4:15 |
| Feature 3 — Admin | 4:15–5:45 |
| Bonus — Cloud/RLS | 5:45–6:00 |
| Challenges & learnings | 6:00–7:00 |
| Closing | 7:00–7:30 |
| Q&A | after |

---

## Demo click path — cheat sheet

1. **Student login** → Home shows `Scan QR Code`.
2. Student taps **Teacher** → `Teachers Only`.
3. Student taps **Dashboard** → student access message.
4. **Log out** → **Teacher login**.
5. Teacher fills `Demo Assembly` / `DEMO-2026-001` / `Gymnasium` / `+1 hour`.
6. Tap **Create Event** → Smart QR appears with expiry and 1h/2h/3h rotate buttons.
7. **Student phone**: Scan → `Attendance recorded!` → History shows `PRESENT`.
8. Student taps **Scan Again** → scans same QR → `Already registered for this event.`
9. **Log out** → **Admin login**.
10. Show **no Scan tab** and **Open Dashboard** CTA.
11. Open Dashboard → KPIs/trends → User management.
12. Show admin row is read-only; only Student/Teacher chips.
13. Promote one student → `email → teacher`.
14. Optional: open `/scan` as admin → redirects Home.

---

## One-line backup summary

> "QR_App started as a local SQLite prototype with a hardcoded student. I migrated it to Supabase with real authentication, PostgreSQL, RLS, student/teacher/admin roles, rotating time-limited Smart QR codes, and an admin dashboard that manages users but has no scanner."
