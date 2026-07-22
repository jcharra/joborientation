# Tasks

## Task 1 — Basic Laravel structure + entities + authentication ✅

**Done:**

- Created Laravel 13 project in `backend/` (PHP 8.4, PostgreSQL configured via `.env`).
- Installed `directorytree/ldaprecord-laravel` (LDAP auth) and `laravel/sanctum` (token-based API auth).
- Extended the `users` table with `role` (enum: admin/consultant/student), `ldap_username` (nullable, for LDAP students), and made `password`/`email` nullable to support both auth flows.

**Entities / migrations created:**

| Migration | Table | Purpose |
|---|---|---|
| 0001_…_create_users_table | users | All roles in one table; role discriminates behaviour |
| 2026_06_30_100000 | tags | Job/study topic categories |
| 2026_06_30_100001 | consultant_profiles | Bio, CV path, profile picture per consultant |
| 2026_06_30_100002 | topics | Consultant's offered topic (title, description, tag) |
| 2026_06_30_100003 | time_slots | Scheduled session (topic, consultant, time, room, capacity) |
| 2026_06_30_100004 | student_tag_preferences | Student's ordered tag wishlist (up to 6, 4 get assigned) |
| 2026_06_30_100005 | student_schedules | Final assigned time slots per student |
| 2026_06_30_100006 | app_settings | Key-value config (current_phase: selection/conference) |

**Models:** `User`, `ConsultantProfile`, `Tag`, `Topic`, `TimeSlot`, `StudentTagPreference`, `StudentSchedule`, `AppSetting`

**Authentication:**

- `POST /api/auth/consultant/login` — email+password, issues Sanctum token.
- `POST /api/auth/student/login` — LDAP username+password; creates/syncs local user record on first login, issues Sanctum token.
- `GET /api/auth/{role}/me`, `POST /api/auth/{role}/logout` — token-authenticated endpoints.

**Seeder:** `AdminUserSeeder` creates `admin@example.com` / `password` with role=admin.

**To run migrations:**
```bash
cd backend
php artisan migrate --seed
```

**LDAP env vars to fill in `.env`:**
```
LDAP_HOST, LDAP_USERNAME (bind DN), LDAP_PASSWORD, LDAP_BASE_DN, LDAP_PORT
```

---

## Task 2 — Login page + role-aware dashboard ✅

**Done:**

- Created React + Vite + TypeScript frontend in `frontend/`.
- Added `frontend` service to `docker-compose.yml` (node:22-alpine, port 5173, hot-reload via volume mount).
- Vite dev server proxies `/api` requests to the `nginx` service — no CORS config needed.

**Key files:**

| File | Purpose |
|---|---|
| `src/api/client.ts` | Axios instance; attaches Bearer token from localStorage automatically |
| `src/api/auth.ts` | `loginConsultant`, `loginStudent`, `logout`, `getMe` |
| `src/contexts/AuthContext.tsx` | Global auth state; restores session from localStorage on page load |
| `src/components/RequireAuth.tsx` | Redirects unauthenticated users to `/login` |
| `src/pages/LoginPage.tsx` | Two-tab form: Student (username/password via LDAP) / Consultant (email/password) |
| `src/pages/DashboardPage.tsx` | Role-specific greeting for student / consultant / admin |

**Routing:** `/login` → `/dashboard` (protected); unknown paths redirect to `/login`.

**Access:**
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000/api`

---

## Task 3 — i18n (EN / FR / DE) ✅

- Installed `i18next`, `react-i18next`, `i18next-browser-languagedetector`.
- Translation files in `src/i18n/en.ts`, `fr.ts`, `de.ts` — cover all UI strings in login page and dashboard.
- Language auto-detected from browser preference (stored in localStorage on manual change).
- `LanguageSwitcher` component (EN / FR / DE buttons) added to the login card and dashboard header.
- `LoginPage` and `DashboardPage` fully translated via `useTranslation()`.
- Array translations (`studentActions`, `consultantActions`) use `returnObjects: true`.

---

## Task 4 — LDAP as optional plug-in config ✅

**Done:**

- `ldap_students` and `ldap_consultants` flags added to `app_settings` (default: `false` → email/password).
- Migration `2026_06_30_120000_add_ldap_settings` seeds both flags.
- `AppSetting::getBool()` helper added for boolean config reads.
- New public endpoint `GET /api/config` (via `AppConfigController`) exposes all runtime flags to the frontend.
- `StudentLoginController` branches on `ldap_students`: LDAP path is unchanged; new email+password path uses `Auth::attempt`.
- `ConsultantLoginController` branches on `ldap_consultants`: existing email+password path is unchanged; new LDAP path mirrors the student implementation.
- Frontend `src/api/config.ts` — `fetchConfig()` + `AppConfig` type.
- `auth.ts` — `loginStudent` / `loginConsultant` accept a `useLdap` boolean; send `{ username }` or `{ email }` accordingly.
- `LoginPage.tsx` — fetches config at module load via `use(configPromise)`; the identifier field label, input type, and autocomplete switch per-tab based on the LDAP flags.

**To toggle LDAP on for a role at runtime:**
```php
AppSetting::set('ldap_students', 'true');     // enable LDAP for students
AppSetting::set('ldap_consultants', 'true');  // enable LDAP for consultants
```

**LDAP env vars** (only required when a flag is enabled):
```
LDAP_HOST, LDAP_USERNAME, LDAP_PASSWORD, LDAP_BASE_DN, LDAP_PORT
```

---

## Task 5 — Admin dashboard with students, consultants, and topics overviews ✅

**Done:**

**Backend:**

| File | Purpose |
|---|---|
| `app/Http/Controllers/AdminController.php` | `students()`, `consultants()`, `topics()` list endpoints |
| `app/Http/Middleware/RequireAdmin.php` | Returns 403 if authenticated user is not an admin |
| `routes/api.php` | `GET /api/admin/{students,consultants,topics}` — guarded by `auth:sanctum` + `RequireAdmin` |

**Frontend:**

| File | Purpose |
|---|---|
| `src/api/admin.ts` | `fetchAdminStudents`, `fetchAdminConsultants`, `fetchAdminTopics` — typed API helpers |
| `src/components/RequireAdmin.tsx` | Route guard — redirects non-admins to `/dashboard` |
| `src/pages/admin/StudentsListPage.tsx` | Table: name, email, LDAP username |
| `src/pages/admin/ConsultantsListPage.tsx` | Table: name, email, LDAP username |
| `src/pages/admin/TopicsListPage.tsx` | Table: title, tag, consultant, description |
| `src/pages/admin/AdminListPage.module.css` | Shared styles for all three list pages |
| `src/pages/DashboardPage.tsx` | `AdminDashboard` updated with three nav card links |
| `src/pages/DashboardPage.module.css` | `.adminNav` / `.adminNavCard` styles for nav cards |
| `src/App.tsx` | Routes `/admin/students`, `/admin/consultants`, `/admin/topics` added, each wrapped in `RequireAdmin` |
| `src/i18n/{en,de,fr}.ts` | `admin.*` translation keys added |

Data is fetched with `use()` + `Suspense` (no `useEffect`), consistent with the existing code style.

---

## Task 6 — Consultant profile editor ✅

**Done:**

**Backend:**

| File | Purpose |
|---|---|
| `database/migrations/2026_07_21_100000_add_profile_fields_to_consultant_profiles.php` | Adds `first_name`, `last_name`, `phone`, `graduation_year`, `serie`, `linkedin_url`, `career_path`, `current_situation`, `why_this_career` to `consultant_profiles` |
| `app/Models/ConsultantProfile.php` | `$fillable` updated; `profilePictureUrl` accessor appended to JSON |
| `app/Http/Controllers/ConsultantProfileController.php` | `show()` returns profile; `update()` upserts fields + stores uploaded photo on `public` disk |
| `routes/api.php` | `GET /api/consultant/profile`, `POST /api/consultant/profile` — guarded by `auth:sanctum` |

**Frontend:**

| File | Purpose |
|---|---|
| `vite.config.ts` | Added `/storage` proxy so profile picture URLs resolve in dev |
| `src/api/profile.ts` | `fetchConsultantProfile`, `updateConsultantProfile` (sends multipart/form-data for photo) |
| `src/pages/ConsultantProfilePage.tsx` | Form with photo preview, personal info section (name, phone, graduation year, series, LinkedIn), and career section (three long-text areas) |
| `src/pages/ConsultantProfilePage.module.css` | Page styles |
| `src/pages/DashboardPage.tsx` | `ConsultantDashboard` now has an "Edit my profile" nav card |
| `src/App.tsx` | `/profile` route added, wrapped in `RequireAuth` |
| `src/i18n/{en,de,fr}.ts` | `profile.*` translation keys added |

**Run migration to apply new columns:**
```bash
cd backend && php artisan migrate
```

Photo uploads are stored in `storage/app/public/profile-pictures/`. Run `php artisan storage:link` once to make them publicly accessible.

---

## Task 7 — Consultant session editor + consent checkboxes ✅

**Done:**

**Backend:**

| File | Purpose |
|---|---|
| `database/migrations/2026_07_21_110000_update_topics_for_consultant_session.php` | Makes `tag_id` nullable (admins assign tags later); adds `selected_slots` JSON column to `topics` |
| `database/migrations/2026_07_21_110001_add_consent_fields_to_consultant_profiles.php` | Adds `consent_poster` and `consent_alumni_data` booleans to `consultant_profiles` |
| `app/Models/Topic.php` | Added `selected_slots` to `$fillable`; cast as `array` |
| `app/Models/ConsultantProfile.php` | Added `consent_poster`, `consent_alumni_data` to `$fillable`; fixed `profile_picture_url` accessor to use `asset()` instead of `Storage::disk()->url()` |
| `app/Http/Controllers/ConsultantSessionController.php` | `show()` returns consultant's topic; `update()` upserts title, description, selected_slots with validation against a fixed slot list |
| `app/Http/Controllers/ConsultantProfileController.php` | Validation extended with `consent_poster` and `consent_alumni_data` |
| `routes/api.php` | `GET/POST /api/consultant/session` added |

**Predefined slots:** `in_person_{1330,1430,1530,1630}`, `video_{1330,1430,1530,1630}`, `reception_1745` — at least one required.

**Frontend:**

| File | Purpose |
|---|---|
| `src/api/session.ts` | `SLOT_GROUPS` constant, types, `fetchConsultantSession`, `updateConsultantSession` |
| `src/api/profile.ts` | Added `consent_poster`, `consent_alumni_data` to type; fixed boolean serialization in `updateConsultantProfile` (`true` → `'1'`, `false` → `'0'` for Laravel) |
| `src/pages/ConsultantSessionPage.tsx` | Form: title, description, grouped time-slot checkboxes (pill style) |
| `src/pages/ConsultantSessionPage.module.css` | Page styles |
| `src/pages/ConsultantProfilePage.tsx` | Consent section with two bilingual checkboxes appended before save button |
| `src/pages/ConsultantProfilePage.module.css` | `.consentRow` style |
| `src/pages/DashboardPage.tsx` | "Edit my session" nav card added to consultant dashboard |
| `src/App.tsx` | `/session` route added |
| `src/i18n/{en,de,fr}.ts` | `session.*` keys + `profile.sectionConsent`, `profile.consentPoster`, `profile.consentAlumniData` added |

---

## Task 8 — Registration with double opt-in email verification ✅

**Done:**

**Backend:**

| File | Purpose |
|---|---|
| `app/Models/User.php` | Implements `MustVerifyEmail`; LDAP login controllers set `email_verified_at = now()` on first user creation |
| `app/Http/Controllers/Auth/RegisterController.php` | Creates user, sends verification email, returns `{ message }` — no token until email is confirmed |
| `app/Http/Controllers/Auth/VerifyEmailController.php` | Validates signed URL, marks email verified, issues Sanctum token, redirects to frontend `/email/verified?token=…&role=…` |
| `app/Http/Controllers/Auth/ResendVerificationController.php` | Resends the verification email; always returns success to prevent email enumeration |
| `app/Http/Controllers/Auth/ConsultantLoginController.php` | Password path blocks login if `email_verified_at` is null |
| `app/Http/Controllers/Auth/StudentLoginController.php` | Same check; LDAP path also sets `email_verified_at = now()` for new users |
| `routes/api.php` | `GET /api/auth/email/verify/{id}/{hash}` (named `verification.verify`) + `POST /api/auth/email/resend` |

**Frontend:**

| File | Purpose |
|---|---|
| `src/api/auth.ts` | `register()` no longer returns a token; new `resendVerification(email)` function |
| `src/pages/RegisterPage.tsx` | After submission switches to a "Check your email" screen with a resend button |
| `src/pages/EmailVerifiedPage.tsx` | New page at `/email/verified` — reads `token` + `role` from URL params, fetches user via `getMe`, calls `setAuth`, navigates to dashboard |
| `src/pages/LoginPage.tsx` | "No account?" link added at the bottom pointing to `/register` |
| `src/pages/LoginPage.module.css` | `.cardFooter` styles for the registration link |
| `src/App.tsx` | `/register` and `/email/verified` routes added (both public) |
| `src/i18n/{en,de,fr}.ts` | `register.*` keys, `login.noAccount/register/errorUnverified`, `verify.*` keys added |

---

## Task 12 — Test data seeder ✅

**Done:**

| File | Purpose |
|---|---|
| `database/seeders/TestDataSeeder.php` | Creates 10 tags, 20 consultants (each with profile, topic, and 1–3 time slots), and 30 students |

**What is generated:**

- **10 tags** covering realistic career domains: Computer Science, Medicine, Law, Business, Engineering, Architecture, Education, Finance, Arts & Media, Environment
- **20 consultants** — each with a verified account (`email_verified_at` set), a filled `ConsultantProfile` (name, graduation year, series, career text), a `Topic` with title and description mapped to a tag, and 1–3 `TimeSlot` records placed on **2026-10-15** in rooms R101–Amphi B
- **30 students** — verified accounts with random names and emails; password for all generated accounts is `password`

All accounts are pre-activated (`email_verified_at` is non-null). No email verification flow is required to log in.

**To run:**
```bash
docker compose exec app php artisan db:seed --class=TestDataSeeder
```

The seeder is additive (no truncation), so it is safe to run on a database that already has an admin account. Re-running it creates additional records.

---

## Task 11 — Preparation phase + admin phase switcher ✅

**Done:**

**Backend:**

| File | Purpose |
|---|---|
| `app/Http/Controllers/AdminPhaseController.php` | `POST /api/admin/phase` — validates and persists the new phase (`preparation`, `selection`, `conference`) |
| `app/Models/AppSetting.php` | Added `isPreparationPhase()`; default phase changed from `selection` to `preparation` |
| `routes/api.php` | `POST /api/admin/phase` added to the admin-only group |

**Frontend:**

| File | Purpose |
|---|---|
| `src/api/config.ts` | `Phase` union type added; new `setPhase(phase)` API call |
| `src/pages/DashboardPage.tsx` | Fetches config via `use(configPromise)` in each sub-dashboard; `StudentDashboard` shows "soon to come" during preparation and a conference message during conference; `ConsultantDashboard` hides edit links during conference; `AdminDashboard` has a 3-button phase switcher |
| `src/pages/DashboardPage.module.css` | `.phaseControl`, `.phaseButtons`, `.phaseBtn`, `.soonToCome` styles |
| `src/i18n/{en,de,fr}.ts` | `dashboard.phasePreparation`, `dashboard.soonToCome`, `dashboard.studentConferenceActions`, `dashboard.consultantPhaseConference`, `dashboard.consultantConferenceActions`, `admin.phase.*` keys |

**Phase behaviour summary:**

| Phase | Students | Consultants |
|---|---|---|
| `preparation` | Login only — "soon to come" message | Can edit profile and session |
| `selection` | Can pick and rank up to 6 tags | Can edit profile and session |
| `conference` | View schedule (read-only message) | View time slots / participants (read-only message) |

Admin can switch phases at any time from the dashboard via the segmented phase control.

---

## Task 10 — GitHub Actions: build and push Docker images to GHCR ✅

**Done:**

| Change | Details |
|---|---|
| `.github/workflows/docker-publish.yml` | On every push to `master`, builds the `backend/` and `frontend/` Dockerfiles and pushes them to GHCR |

**Images published:**

| Image | GHCR path |
|---|---|
| Backend (PHP-FPM) | `ghcr.io/jcharra/joborientation-backend` |
| Frontend (Node/Vite) | `ghcr.io/jcharra/joborientation-frontend` |

Each push produces two tags: `latest` and the short Git SHA (e.g. `a1b2c3d`).

**Authentication:** the workflow uses the built-in `GITHUB_TOKEN` — no additional secrets required. The `packages: write` permission is declared in the job so GHCR accepts the push.

---

## Task 9 — Mailcatcher for local email development ✅

**Done:**

| Change | Details |
|---|---|
| `docker-compose.yml` | Added `mailcatcher` service (`sj26/mailcatcher`); SMTP on port 1025, web UI on port 1080 |
| `backend/.env` | `MAIL_MAILER=smtp`, `MAIL_HOST=mailcatcher`, `MAIL_PORT=1025` |
| `backend/.env.example` | Updated with the same defaults + comments explaining how to swap in a real SMTP server for production |

**Local dev usage:**
- Open `http://localhost:1080` to see all outgoing emails captured by Mailcatcher.
- No emails are actually delivered — they are intercepted and displayed in the web UI.

**Switching to a real SMTP server (production):**
Set these env vars on the server (values depend on your provider, e.g. Mailgun, SES, Postmark):
```
MAIL_MAILER=smtp
MAIL_HOST=smtp.yourprovider.com
MAIL_PORT=587
MAIL_USERNAME=your_username
MAIL_PASSWORD=your_password
MAIL_SCHEME=tls
MAIL_FROM_ADDRESS=noreply@yourdomain.com
MAIL_FROM_NAME="Job Orientation"
```
