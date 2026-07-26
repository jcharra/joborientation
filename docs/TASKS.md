# Tasks

## Task — Teacher accounts removed from the dev LDAP server ✅

**Done:**

The dev LDAP directory (added in an earlier task) seeded 5 "teacher" and 5 "student" accounts; the teacher accounts are no longer part of it. The app has no "teacher" role or concept at all — they were only ever illustrative directory entries — so removing them just shrinks the seed data to what's actually useful for testing (the student LDAP login flow).

| File | Purpose |
|---|---|
| `docker/ldap/bootstrap/03-teachers.ldif` | Deleted |

Verified: recreated the `ldap_data`/`ldap_config` volumes (so the bootstrap LDIFs re-apply from scratch, since OpenLDAP only seeds on first init) and confirmed via `ldapsearch` that only the 5 `uid=student1..5` entries remain under `ou=people,dc=joborientation,dc=local`.

---

## Task — Students can only log in via LDAP when it's mandated, or via confirmed email otherwise ✅

**Done:**

The admin-bypass added in the previous task (routing any request with an `email` field straight to the password path, so the admin is never forced through LDAP) was too broad: it also let a *student* or *consultant* who happened to have a real password (e.g. self-registered, or created before LDAP was turned on for their role) bypass a `ldap_students`/`ldap_consultants` flag that was meant to make LDAP the only way in. The carve-out is now scoped to admin accounts specifically — looked up by role, not just "an email field was present" — so it still protects the admin without reopening a bypass for everyone else. When the relevant flag is on, a student/consultant's own password is no longer honored at all; when it's off, the existing confirmed-email-required password path is unchanged.

**Backend:**

| File | Purpose |
|---|---|
| `app/Http/Controllers/Auth/StudentLoginController.php`, `.../ConsultantLoginController.php` | `login()`'s email-first bypass now calls a new private `isAdminEmail($email)` (`User::where('email', $email)->where('role', User::ROLE_ADMIN)->exists()`) instead of just checking `$request->filled('email')` — a non-admin submitting `email` while the LDAP flag is on now falls through to `loginViaLdap()`, which rejects it (422) for missing `username` rather than silently accepting the password |
| `tests/Feature/LdapLoginControllerTest.php` | Two new tests: a student with a real password+verified email, and a consultant likewise, both get 422 when submitting `email`/`password` while `ldap_students`/`ldap_consultants` is enabled — confirmed both fail against the previous (too-broad) admin bypass before confirming the fix |

Verified: full backend suite (74 tests) passes; confirmed the two new tests fail when the `isAdminEmail()` check is temporarily reverted to the plain `$request->filled('email')` check, then pass again with the fix restored.

---

## Task — App renamed to "Forum der Berufe" / "Forum des métiers" ✅

**Done:**

The admin-configurable event title's seeded default (previously "Berufsorientierung" / "Orientation Professionnelle", carried over from the app's original English name "Job Orientation") is now "Forum der Berufe" / "Forum des métiers". This is the value shown in the header/tab title before an admin ever customizes it via the Event page, and now also the fallback shown before `/api/config` has loaded.

**Backend:**

| File | Purpose |
|---|---|
| `database/migrations/2026_07_26_110000_rename_event_title_to_forum_der_berufe.php` | New — updates the existing `event_title_de`/`event_title_fr` rows in `app_settings` (the historical seeding migration is left untouched, per migration convention) |
| `app/Http/Controllers/AppConfigController.php` | `event_title` fallback defaults (used only if the settings row is ever missing) updated to match |

**Frontend:**

| File | Purpose |
|---|---|
| `src/i18n/de.ts`, `src/i18n/fr.ts` | `login.title` and `dashboard.appName` (the static fallback shown before `/api/config` resolves) updated to the new name |

This also fixes `tests/Feature/AdminEventTitleControllerTest.php`, whose expectations had already been updated to the new name — it was failing against the still-unchanged seeded default until this migration/fallback update landed.

Verified: ran the new migration against the dev DB, full backend suite (72 tests) passes, `tsc --noEmit` clean.

---

## Task — Admin login can never be routed through LDAP ✅

**Done:**

Both `StudentLoginController` and `ConsultantLoginController` picked their auth path (password vs. LDAP) purely from the global `ldap_students`/`ldap_consultants` flags — so once an admin enabled LDAP for real consultants, the admin's own login (which shares the "Consultant" tab, since the admin only ever has a local email+password account) would be forced through the LDAP form and could never authenticate again. Login now routes on which field the request actually submitted (`email` → password path, always, regardless of the flag), and a hard invariant was added at the end of both LDAP paths that rejects the login outright if the resolved/matched user turns out to have the admin role — a defense-in-depth backstop in case a row ever ends up with an admin's `ldap_username` set through some other path.

**Backend:**

| File | Purpose |
|---|---|
| `app/Http/Controllers/Auth/ConsultantLoginController.php`, `.../StudentLoginController.php` | `login()`: if the request has an `email` field, always go through `loginViaPassword()` — the `ldap_*` flag only decides the path when `username` was sent instead. `loginViaLdap()`: after resolving/creating the user, `if ($user->isAdmin())` throws a validation error before any consultant/student role check or profile update, so an admin can never complete authentication via LDAP even if matched |
| `tests/Feature/LdapLoginControllerTest.php` | Four new tests: admin logs in with email+password while `ldap_consultants`/`ldap_students` is enabled (with zero LDAP expectations set up — an accidental LDAP call would fail the test), and LDAP login is rejected when the resolved user has the admin role, for both controllers. Confirmed these fail against the pre-fix code (reproduced both issues) before confirming the fix. |

**Frontend:**

| File | Purpose |
|---|---|
| `src/pages/LoginPage.tsx` | New `forcePasswordLogin` state — a "Log in with email and password instead" / "Log in with username instead" toggle link appears under the form whenever LDAP is enabled for the active tab, letting the admin (or any consultant with a real password) opt out of the LDAP-styled form even while it's the default; `handleSubmit` now passes the effective `useLdap` value (previously it re-read the raw config flag, silently ignoring the toggle) |
| `src/pages/LoginPage.module.css` | `.switchModeLink` added |
| `src/i18n/{de,fr}.ts` | `login.useEmailInstead` / `login.useLdapInstead` added |

Verified against the running dev environment: enabled both `ldap_students` and `ldap_consultants`, seeded the admin (`AdminUserSeeder`), and confirmed `POST /api/auth/consultant/login` with `{ email, password }` still logs the admin in normally; a `{ username, password }` attempt for a non-existent LDAP entry named "admin" correctly fails instead of ever reaching a privileged account. Reset both flags and removed the test admin row afterward. Full backend suite passes for every test this change touches (2 pre-existing, unrelated failures remain in `AdminEventTitleControllerTest` — its expected default event title text no longer matches the migration's seeded default; not something this change touched).

---

## Task — CSV student import on the "Benutzer" admin page ✅

**Done:**

The "Benutzer" admin page gained a third section (after Series and the graduation-year range): a CSV upload that bulk-creates student accounts from `lastname,firstname,class,username` rows. Students get a new `class` (school class, e.g. "8a") column, which the app had no equivalent of before. This is explicitly a student-only import — imported rows get `role: student`, `ldap_username` set from the CSV's `username` column, and no password/email, since the intended flow is that the student later logs in via LDAP (or the login gets enriched from the directory) — the import just pre-provisions the roster (name + class) ahead of that first login.

**Backend:**

| File | Purpose |
|---|---|
| `database/migrations/2026_07_26_100000_add_class_to_users_table.php` | Adds nullable `class` (`varchar(50)`) to `users` |
| `app/Models/User.php` | `class` added to the `#[Fillable(...)]` list |
| `app/Http/Controllers/AdminStudentImportController.php` | New — `POST /api/admin/students/import`, validates an uploaded `csv` file (`mimes:csv,txt`); parses rows (header row skipped, columns positional: lastname, firstname, class, username; blank lines skipped) mirroring `AdminInviteController::bulkInvite()`'s existing CSV pattern; per-row validates via `Validator::make` (all four fields required, `username` unique against `users.ldap_username` — duplicates *within* the same file are caught too, since rows are processed sequentially, same as the speaker bulk-invite); creates a `User` per valid row (`role: student`, `ldap_username`, `name`, `class`, `password: null`); returns `{ imported_count, imported[], skipped[] }` |
| `routes/api.php` | `POST admin/students/import` added to the existing admin-only group |
| `tests/Feature/AdminStudentImportControllerTest.php` | Covers: happy path (2 rows imported, correct `name`/`ldap_username`/`class`/`role` persisted), row-level skipping (duplicate username against an existing student, missing username, duplicate within the file — 3 skipped / 1 imported), blank-line handling, non-admin forbidden, and — using the same `LdapRecord\Testing\DirectoryFake` approach as the new LDAP login tests — that a student's imported `class` survives a subsequent LDAP login (the login controller never touches that column, so it isn't overwritten even though name/email get refreshed from the directory) |

**Frontend:**

| File | Purpose |
|---|---|
| `src/api/admin.ts` | New `importStudents(csv)` (multipart POST) and `StudentImportResult`/`StudentImportSkippedRow` types |
| `src/api/auth.ts` | `User` type gains `class: string \| null` |
| `src/pages/admin/UsersPage.tsx` | New `StudentImportForm` component — CSV file input + submit, same result/skipped-rows display pattern as `BulkInviteSpeakersPage`; added as a third section on the page (Series → graduation-year range → student import), each separated by the existing `phaseDivider`/`phaseLabel` styling |
| `src/pages/admin/UsersPage.module.css` | `.hint`, `.resultBox`, `.skippedTitle`, `.skippedList` added (carried over from `BulkInviteSpeakersPage.module.css`'s existing styles, since each page keeps its own copy of this shared visual pattern — same approach used for `EventPage.module.css` earlier) |
| `src/pages/admin/StudentsListPage.tsx` | New sortable "Class" column, showing "—" when unset |
| `src/i18n/{de,fr}.ts` | `admin.columns.class`; `admin.studentImport.*` (title, fieldCsv, csvHint, submit, submitting, resultSummary, skippedTitle, errorGeneric) added |

**CSV format expected:** a header row followed by `lastname,firstname,class,username` per line, e.g.:
```csv
lastname,firstname,class,username
Doe,Jane,8a,jdoe
Smith,John,8b,jsmith
```

Verified against the running dev environment: `POST /api/admin/students/import` with a 2-row CSV created both student records with the correct `class`/`ldap_username`, reflected immediately in `GET /api/admin/students`; cleaned up the test rows afterward. Full backend suite (68 tests, up from 63) passes. `tsc --noEmit` is clean.

---

## Task — LDAP dev server added to docker-compose, seeded with 5 test students + 5 test teachers ✅

**Done:**

The app already supported LDAP login (toggle via `AppSetting::set('ldap_students'|'ldap_consultants', 'true')`), but there was never an actual LDAP server in the local dev stack to test it against — `LDAP_HOST` in `.env` pointed at `127.0.0.1` with no username/password/base DN filled in. There's now a real `ldap` service in `docker-compose.yml`, seeded on first boot with 10 accounts (5 "student", 5 "teacher" — the LDAP directory itself doesn't know about the app's roles, it's just realistic seed data devs can log in with once they flip the LDAP flag for students/consultants).

**Docker:**

| File | Purpose |
|---|---|
| `docker-compose.yml` | New `ldap` service (`osixia/openldap:1.5.0`), org `dc=joborientation,dc=local`, admin password `admin`, port `389` exposed; two new named volumes (`ldap_data`, `ldap_config`) so the directory survives container restarts; `LDAP_REMOVE_CONFIG_AFTER_SETUP: "false"` — without this the image deletes the bootstrap-ldif bind mount after first boot, which (since it's a bind mount, not a copy) deletes the source files on the host too |
| `docker/ldap/bootstrap/01-people-ou.ldif` | Creates `ou=people,dc=joborientation,dc=local` |
| `docker/ldap/bootstrap/02-students.ldif` | 5 students (`uid=student1`…`student5`), `inetOrgPerson`, password `student123`, `employeeType: student` |
| `docker/ldap/bootstrap/03-teachers.ldif` | 5 teachers (`uid=teacher1`…`teacher5`), same shape, password `teacher123`, `employeeType: teacher` |

All accounts sit flat under `ou=people,...` (not further nested) because `StudentLoginController`/`ConsultantLoginController` build the bind DN as `uid={username},{base_dn}` directly — so `LDAP_BASE_DN` must point at the OU that directly contains the user entries.

**Backend config:**

| File | Purpose |
|---|---|
| `.env` | `LDAP_HOST=ldap`, `LDAP_USERNAME="cn=admin,dc=joborientation,dc=local"`, `LDAP_PASSWORD=admin`, `LDAP_BASE_DN="ou=people,dc=joborientation,dc=local"` (previously all blank/placeholder) |
| `.env.example` | Same LDAP block added (previously had none at all) with a comment pointing at the seeded test accounts and how to flip the flags |

**Two pre-existing bugs found and fixed while verifying the LDAP server actually works end-to-end** (both were silent — nothing in the test suite exercised the LDAP login path before):

1. **Auth bypass** — `authenticateViaLdap()` in both `StudentLoginController` and `ConsultantLoginController` called `$connection->auth()->attempt($userDn, $password, true)` but ignored its boolean return value, unconditionally `return true`-ing unless an exception was thrown. Since a failed bind returns `false` rather than throwing, **any password was accepted for a valid username** once LDAP was enabled. Fixed by returning the `attempt()` result directly.
2. **Wrong `$stayBound` argument** — the `true` third argument told the connection to stay bound *as the just-authenticated user* after the credential check, instead of rebinding as the configured admin user. The subsequent `findLdapUser()` search then ran under the unprivileged user's bind and silently failed (caught by its own generic `catch`), so every LDAP login showed the raw username as the name and no email, instead of the directory's `cn`/`mail`. Fixed by dropping the third argument (default `false`), so the connection rebinds as the admin user before the profile lookup.

| File | Purpose |
|---|---|
| `app/Http/Controllers/Auth/StudentLoginController.php`, `.../ConsultantLoginController.php` | `authenticateViaLdap()`: `return $connection->auth()->attempt($userDn, $password);` instead of always `return true;` after a `, true` stay-bound call |
| `tests/Feature/LdapLoginControllerTest.php` | New — uses `LdapRecord\Testing\DirectoryFake`/`LdapFake` to fake the LDAP bind without a real server: student/consultant login succeeds with a bind expectation that matches the DN+password, and is rejected (422) when the fake bind returns an "invalid credentials" error response. Confirmed these tests fail against the pre-fix code (reproduced the exact bypass) before confirming they pass against the fix. |
| `phpunit.xml` | Added `LDAP_LOGGING=false` for the test environment — with it left on, the first LDAP operation in a full test run tripped an unrelated Laravel Pail (log viewer) container-resolution error inside the LDAP event listener, which the controller's generic exception handler swallowed as an auth failure, making the new tests order-dependent/flaky. Disabling LDAP's own event logging during tests (consistent with `MAIL_MAILER=array`, `BROADCAST_CONNECTION=null`, etc. already in that file) sidesteps it entirely. |

Verified against the running dev stack: brought up the `ldap` service, confirmed all 10 seeded entries via `ldapsearch`, enabled `ldap_students`/`ldap_consultants` via `AppSetting::set()`, and logged in live as `student1`/`student123` and `teacher1`/`teacher123` through the real HTTP endpoints — correct name/email came back from the directory, a wrong password was rejected (422), and a nonexistent username was rejected (422). Full backend suite (63 tests, up from 59) passes, run three times in a row with no flakiness.

---

## Task — English removed as an app language; only French and German remain ✅

**Done:**

The app previously offered EN/FR/DE throughout — language switcher, i18next resources, and the per-language event title. English is now removed entirely: the switcher only offers DE/FR, i18next only loads the German and French bundles, and the admin's event-title form only has German/French fields.

**Backend:**

| File | Purpose |
|---|---|
| `app/Http/Controllers/AdminEventTitleController.php` | `update()` no longer validates/persists an `en` field — only `de`/`fr` (`required\|string\|max:150`) |
| `app/Http/Controllers/AppConfigController.php` | `GET /api/config`'s `event_title` object no longer includes `en` |
| `database/migrations/2026_07_26_090000_remove_event_title_en_setting.php` | New — deletes the `event_title_en` row from `app_settings` (the historical seeding migration `2026_07_22_110000_add_event_title_settings.php` is left untouched, per migration convention) |
| `tests/Feature/AdminEventTitleControllerTest.php` | All four tests updated to drop `en` from payloads/assertions; the "requires all three languages" test renamed to `test_updating_the_event_title_requires_both_languages` and now omits `fr` instead of `en` |

**Frontend:**

| File | Purpose |
|---|---|
| `src/i18n/index.ts` | Removed the `en` resource import/registration; `fallbackLng`/`supportedLngs` now `'de'` / `['fr', 'de']` |
| `src/i18n/en.ts` | Deleted — no longer loaded |
| `src/i18n/de.ts`, `src/i18n/fr.ts` | Removed their own `lang.en` entry and the `admin.eventTitle.fieldEn` key (both unused now that no locale needs an "English" label or field) |
| `src/components/LanguageSwitcher.tsx` | `LANGS` now `['de', 'fr']`; resolved-language fallback changed from `'en'` to `'de'` |
| `src/components/AppTitle.tsx`, `src/App.tsx` (`DocumentTitle`) | The `'en' \| 'de' \| 'fr'` language union narrowed to `'de' \| 'fr'`; the `?? eventTitle.en` fallback changed to `?? eventTitle.de` |
| `src/api/config.ts` | `EventTitle` interface no longer has an `en` field |
| `src/pages/admin/EventPage.tsx` | `EventTitleForm` no longer has English state/input/payload — only German/French |

Verified via `tsc --noEmit` (clean, no stray `en` references left in `frontend/src`) and a live round trip: `GET /api/config` no longer returns `event_title.en`, and `POST /api/admin/event-title` with just `{ de, fr }` persists correctly.

---

## Task — Event title and Tags are now editable directly on the "Veranstaltung" page ✅

**Done:**

The "Veranstaltung" (Event) admin page previously had nav-card links out to separate `/admin/tags` and `/admin/event-title` pages. Both are now embedded directly on the Event page itself, alongside the existing date/time+location form and phase switcher — following the same "move the whole manager inline" approach used for Series on the Benutzer page. The two standalone pages are gone since they'd otherwise duplicate the same UI.

**Frontend:**

| File | Purpose |
|---|---|
| `src/pages/admin/EventPage.tsx` | `EventTitleForm` (3-language title form) and `TagsManager` (add/delete tags list) moved here wholesale from the deleted `EventTitlePage.tsx`/`TagsListPage.tsx`; both render inline between the event-details form and the phase switcher, each under its own section label |
| `src/pages/admin/EventPage.module.css` | New — add-form/table/error styles carried over from the deleted `TagsListPage.module.css` |
| `src/pages/admin/EventTitlePage.tsx`, `src/pages/admin/TagsListPage.tsx`, `.module.css` | Deleted — fully superseded by the inline versions on `EventPage` |
| `src/App.tsx` | `/admin/event-title` and `/admin/tags` routes and their imports removed |

No backend change — reuses the existing `POST /api/admin/event-title`, `GET/POST/DELETE /api/admin/tags` endpoints unchanged. Tag renaming was not added (only "editable directly on that page" was requested, i.e. inline placement — not a new capability); the existing add/delete behavior is unchanged, just relocated.

Verified live: `GET /api/admin/tags` (the endpoint `TagsManager` now calls from its new home) still returns the full tag list as an authenticated admin. Did not visually verify in a browser (none available here) — `tsc --noEmit` is clean and every changed/new file was confirmed to transform through the Vite dev server without error.

---

## Task — Latest possible graduation year is always "last year", relative to today ✅

**Done:**

Speakers were previously able to select a graduation year up to whatever the admin configured (or 2050 by default) — including the current year or future years, which doesn't make sense for a graduation date. The latest selectable/configurable graduation year is now always `today's year − 1`, computed dynamically rather than a fixed number, so the constraint keeps moving forward with each passing year.

**Backend:**

| File | Purpose |
|---|---|
| `app/Models/AppSetting.php` | New `graduationYearMax()` helper — returns `min(stored graduation_year_max, now()->year - 1)`, so even a stale/pre-existing stored value (e.g. the old `2050` default) can never violate the rule once read back |
| `app/Http/Controllers/AppConfigController.php` | `graduation_year_range.max` now comes from `AppSetting::graduationYearMax()` instead of the raw stored value |
| `app/Http/Controllers/ConsultantProfileController.php` | `graduation_year` validation's upper bound now comes from `AppSetting::graduationYearMax()` |
| `app/Http/Controllers/AdminGraduationYearRangeController.php` | `min`/`max` validation's ceiling changed from a fixed `2100` to `now()->year - 1`, so the admin gets a proper validation error (not a silent clamp) if they try to set the range's max to this year or later |
| `tests/Feature/AdminGraduationYearRangeControllerTest.php` | Rewrote the year-based assertions to be relative to `now()->year` instead of hardcoded (previously asserted a fixed `2050`/`2030`, which would break every year); added: rejecting a `max` of the current year, and a stored `2050` being clamped to `now()->year - 1` on read |
| `tests/Feature/ConsultantProfileControllerTest.php` | New test: `graduation_year` equal to the current year is rejected (422) |

**Frontend:**

| File | Purpose |
|---|---|
| `src/pages/admin/UsersPage.tsx` | Graduation-year-range form's `max` input attribute now uses `new Date().getFullYear() - 1` instead of a fixed `2100` |

The speaker-facing profile form (`ConsultantProfilePage.tsx`) needed no change — it already reads its `min`/`max` from `fetchConfig().graduation_year_range`, so it picks up the new dynamic ceiling automatically.

Verified live: `GET /api/config` returns `graduation_year_range.max: 2025` (today being 2026-07-23) even though the underlying stored setting is still `2050` from an earlier migration — confirming the clamp works without needing a data fix.

---

## Task — Pencil-icon tag editing on Topics, and inline-editable "Züge" on the Benutzer page ✅

**Done:**

### Topics overview: tag editing trigger is now a pencil icon inside the tag itself

Previously clicking a separate "Change tag"/"Tag ändern" button next to the tag name opened the editor. Now the tag pill itself (or a "—" placeholder when unset) is the clickable trigger, with a small pencil icon inside it.

| File | Purpose |
|---|---|
| `src/pages/admin/TopicsListPage.tsx` | `TagCell`'s non-editing state is now a single `<button>` containing the tag name (or "—") plus a ✏️ icon, replacing the separate "Edit tag" button |
| `src/pages/admin/AdminListPage.module.css` | `.tagEditBtn` (no longer used) replaced with `.tagPencilBtn` / `.tagPencilIcon` — the pill itself is now the clickable button |

### "Benutzer" page: Series ("Züge") is now a fully inline-editable list

The Series list previously lived on its own page (`/admin/series`, linked via a nav card from "Benutzer") and only supported add/delete. It's now embedded directly in the "Benutzer" page, and gained rename support — the standalone page is gone since it would otherwise duplicate the same UI.

**Backend:**

| File | Purpose |
|---|---|
| `app/Http/Controllers/AdminSeriesController.php` | New `update()` — validates a unique `name` (`Rule::unique(...)->ignore($series->id)`, so renaming to its own current name is allowed), updates the record |
| `routes/api.php` | `PUT admin/series/{series}` added next to the existing `POST`/`DELETE` |
| `tests/Feature/AdminSeriesControllerTest.php` | New: admin renames a series, renaming to another series' existing name is rejected (422), renaming to its own current name is allowed, non-admin forbidden |

**Frontend:**

| File | Purpose |
|---|---|
| `src/api/series.ts` | New `updateSeries(id, name)` |
| `src/pages/admin/UsersPage.tsx` | Series manager (add form + table) moved here wholesale from the deleted `SeriesListPage.tsx`, with a new `SeriesRow` component adding pencil-icon rename (same interaction pattern as the Topics tag editor: click pencil → inline text input + Save/Cancel) |
| `src/pages/admin/UsersPage.module.css` | New — add-form/table/pencil/edit-row styles (carried over from the deleted `SeriesListPage.module.css`, plus new `.nameRow`/`.pencilBtn`/`.editRow`/`.saveBtn`/`.cancelBtn`) |
| `src/pages/admin/SeriesListPage.tsx`, `.module.css` | Deleted — fully superseded by the inline version on `UsersPage` |
| `src/App.tsx` | `/admin/series` route and its import removed |
| `src/i18n/{en,de,fr}.ts` | `admin.series.save` added; `admin.series.errorGeneric` reworded from "Could not add…" to "Could not save…" since it now covers both create and rename failures |

Verified against the running dev environment: `PUT /api/admin/graduation-year-range`-style round trip confirmed for the new series rename endpoint (renamed a live series, verified via `GET /api/series`, renamed back). Did not visually verify in a browser (none available here) — `tsc --noEmit` is clean and every changed/new file was confirmed to transform through the Vite dev server without error.

---

## Task — Admin list views: sortable columns, extra columns, editable tag, tag visible to speaker, linked title ✅

**Done:** A batch of small admin/speaker UX improvements, listed individually below.

### Assigned tag visible on the speaker's own session page

The speaker's "My Session"/"Mein Vortrag" page now shows their topic's currently assigned tag as a read-only badge directly beneath the title field ("Not yet assigned" if the admin hasn't set one yet). No backend change — `GET /api/consultant/session` already returned the tag.

| File | Purpose |
|---|---|
| `src/pages/ConsultantSessionPage.tsx` | Read-only tag badge added beneath the title field |
| `src/pages/ConsultantSessionPage.module.css` | `.tagBadgeRow`, `.tagBadge`, `.tagBadgeNone` added |
| `src/i18n/{en,de,fr}.ts` | `session.fieldTag`, `session.tagNotAssigned` added |

### Event title in the top bar links to the dashboard

`AppTitle` now renders a `<Link to="/dashboard">` instead of a plain `<span>`, so clicking the event title in the header returns any role to their dashboard.

| File | Purpose |
|---|---|
| `src/components/AppTitle.tsx` | Renders `Link` instead of `span` |
| `src/pages/{ConsultantSessionPage,DashboardPage,ConsultantProfilePage}.module.css`, `src/pages/admin/{AdminListPage,ConsultantDetailPage}.module.css` | `.appName` gains `text-decoration: none` (all 5 identical `.appName` blocks across the app, since a `<Link>` renders an `<a>` with a default underline) |

### "Last login" column for students

| File | Purpose |
|---|---|
| `database/migrations/2026_07_23_090000_add_last_login_at_to_users_table.php` | Adds nullable `last_login_at` timestamp to `users` |
| `app/Models/User.php` | `last_login_at` added to `$fillable`/casts; new `recordLogin()` helper (`update(['last_login_at' => now()])`) |
| `app/Http/Controllers/Auth/StudentLoginController.php`, `.../ConsultantLoginController.php` | `recordLogin()` called on successful login in all four paths (student/consultant × password/LDAP) |
| `tests/Feature/LoginRecordsLastLoginTest.php` | New — password login (student + consultant) records `last_login_at`; a failed login does not |
| `src/api/auth.ts` | `User.last_login_at: string \| null` added |
| `src/pages/admin/StudentsListPage.tsx` | New "Last login" column — formatted local date/time, or "Never" |
| `src/i18n/{en,de,fr}.ts` | `admin.columns.lastLogin` / `.neverLoggedIn` added |

Login tracking was added uniformly to both student and consultant logins (all four auth paths run through the same `User` model), even though only the students view surfaces it right now — simpler than special-casing one role, and the column is trivial to add to the speakers view later if needed.

### Speakers admin view: swapped "LDAP username" for "Tag"

Speakers never have an LDAP account (LDAP is student-only in this app), so that column was always empty; replaced with the speaker's presentation tag, which is actually useful here.

| File | Purpose |
|---|---|
| `app/Http/Controllers/AdminController.php` | `consultants()` now eager-loads `topics.tag` (previously only `consultantProfile`) |
| `tests/Feature/AdminControllerTest.php` | New test: consultants list includes each speaker's topic tag |
| `src/api/admin.ts` | New `AdminConsultantListItem` type (`User & { topics: AdminConsultantTopic[] }`); `fetchAdminConsultants()` return type updated |
| `src/pages/admin/ConsultantsListPage.tsx` | "LDAP Username" column removed, "Tag" column added (`topics[0]?.tag?.name`) |

### Topics admin view: tag column is now editable inline

Reuses the same edit-in-place pattern already built for the consultant detail page's session tab (`POST /api/admin/topics/{topic}/tag`, unchanged).

| File | Purpose |
|---|---|
| `src/pages/admin/TopicsListPage.tsx` | New `TagCell` component — click "Edit tag" to reveal a `<select>` + Save/Cancel, same UX as `ConsultantDetailPage`'s `TagEditor`; state updates locally on save, no full reload |
| `src/pages/admin/AdminListPage.module.css` | `.tagEditRow`, `.tagEditBtn`, `.tagSaveBtn`, `.tagCancelBtn`, `.tagError` added (copied from `ConsultantDetailPage.module.css`'s existing styles so this shared list-page stylesheet can support the same inline editor) |

### All three admin list views are now sortable by column header

Client-side sort (all data is already fetched in one page load, no pagination) — click a header to sort ascending, click again to reverse, click a different header to sort by that column ascending. Applied to Students, Speakers, and Topics (the three record-list views); the Series/Tags pages are simple add/delete lists, not really "views" in the same sense, so left unchanged.

| File | Purpose |
|---|---|
| `src/hooks/useSortableData.ts` | New generic hook — takes the row array plus a `{ columnKey: (row) => string \| number \| null }` accessor map; returns the sorted array, current sort key/direction, and a `requestSort(key)` toggler. Nulls always sort last regardless of direction |
| `src/components/SortableHeader.tsx` | New generic `<th>` component — shows a ▲/▼ indicator on the active column, clickable to sort |
| `src/pages/admin/AdminListPage.module.css` | `.sortableTh` (cursor + hover) added |
| `src/pages/admin/{StudentsListPage,ConsultantsListPage,TopicsListPage}.tsx` | Wired up `useSortableData` + `SortableHeader` for every column |

Verified via `tsc --noEmit` (clean) and by fetching every new/changed file through the Vite dev server to confirm it transforms without error; did not visually verify in a browser (none available in this environment).

---

## Task — Language switcher order: DE / FR / EN ✅

**Done:**

The language switcher buttons (shared `LanguageSwitcher` component, used on the login, register, set-password, email-verified, and dashboard pages) were ordered EN/FR/DE. Reordered to DE/FR/EN.

**Frontend:**

| File | Purpose |
|---|---|
| `src/components/LanguageSwitcher.tsx` | `LANGS` array reordered from `['en', 'fr', 'de']` to `['de', 'fr', 'en']` |

Single shared component, so the new order applies everywhere it's rendered with no other changes needed.

---

## Task — "Veranstaltung" and "Benutzer" as separate top-level admin pages, with event date/time/location and a graduation-year range ✅

**Done:**

The "Veranstaltung" section that was previously embedded in the admin dashboard (from the prior task) is now its own page at `/admin/event`, reached via a top-level "Veranstaltung" nav item. It gained two new fields: event date/time and a free-text location. Separately, "Züge" (Series) moved off the dashboard entirely into a new "Benutzer" page at `/admin/users`, which also gained a new setting: the admin-configurable range of years in which a speaker can have finished school — previously hardcoded (1990–2050) in both the backend validation and the profile form.

**Backend:**

| File | Purpose |
|---|---|
| `database/migrations/2026_07_22_120000_add_event_details_and_graduation_year_range_settings.php` | Seeds four new `app_settings` rows: `event_datetime` (null), `event_location` (null), `graduation_year_min` ('1990'), `graduation_year_max` ('2050') |
| `app/Http/Controllers/AppConfigController.php` | `GET /api/config` gains `event_datetime`, `event_location`, and `graduation_year_range: { min, max }` |
| `app/Http/Controllers/AdminEventDetailsController.php` | New — `POST /api/admin/event-details`, validates `event_datetime` (`nullable\|date`) and `event_location` (`nullable\|string\|max:255`), persists both (either can be cleared to `null`) |
| `app/Http/Controllers/AdminGraduationYearRangeController.php` | New — `POST /api/admin/graduation-year-range`, validates `min`/`max` (`integer`, `1900`–`2100`, `max >= min` via `gte:min`), persists both as strings |
| `app/Http/Controllers/ConsultantProfileController.php` | `graduation_year` validation no longer hardcodes `min:1990\|max:2050` — now reads `graduation_year_min`/`graduation_year_max` from `AppSetting` at request time and builds the rule dynamically |
| `routes/api.php` | `POST admin/event-details` and `POST admin/graduation-year-range` added to the existing admin-only group |
| `tests/Feature/AdminEventDetailsControllerTest.php` | New — public config defaults, admin sets both fields (reflected back in `/api/config`), location/datetime can be cleared to null, invalid datetime rejected (422), non-admin forbidden |
| `tests/Feature/AdminGraduationYearRangeControllerTest.php` | New — public config defaults, admin update (reflected back in `/api/config`), `min > max` rejected (422), non-admin forbidden |
| `tests/Feature/ConsultantProfileControllerTest.php` | New — graduation year validated against the default range, and against an admin-configured range (rejects outside it, accepts and persists inside it) |

**Frontend:**

| File | Purpose |
|---|---|
| `src/api/config.ts` | New `GraduationYearRange` type; `AppConfig` gains `event_datetime`, `event_location`, `graduation_year_range`; new `setEventDetails()` and `setGraduationYearRange()` calls |
| `src/pages/admin/EventPage.tsx` | New page at `/admin/event` — inline date/time (`<input type="datetime-local">`) + location form, nav cards to the existing Tags and Event Title pages, and the phase switcher (moved here wholesale from the dashboard, same UI/behavior) |
| `src/pages/admin/UsersPage.tsx` | New page at `/admin/users` — nav card to the existing Series page, plus an inline graduation-year-range form (min/max number inputs) |
| `src/pages/DashboardPage.tsx` | `AdminDashboard` simplified back to a flat nav: Students, Speakers, Topics, **Veranstaltung** (→ `/admin/event`), **Benutzer** (→ `/admin/users`); the phase switcher and the previous "Veranstaltung" sub-grouping (Series/Tags/EventTitle) were removed from this page since they now live on the two new pages |
| `src/pages/ConsultantProfilePage.tsx` | `graduation_year` input's `min`/`max` now come from `fetchConfig().graduation_year_range` instead of hardcoded `1990`/`2050` (fetched alongside the existing profile + series promises, all under the same `Suspense` boundary) |
| `src/App.tsx` | `/admin/event` and `/admin/users` routes added, both wrapped in `RequireAdmin` |
| `src/i18n/{en,de,fr}.ts` | `admin.usersOverview` label added; `admin.eventDetails.*` and `admin.graduationYearRange.*` key groups added (the existing `admin.eventSection` key is now reused as both the dashboard nav label and the new page's `<h1>`) |

Verified against the running dev environment: `POST /api/admin/event-details` and `POST /api/admin/graduation-year-range` persist correctly and are reflected in `GET /api/config` (checked live, then reverted to defaults). Did not visually verify the new pages in a browser (none available in this environment) — verified instead via `tsc --noEmit` (clean) and fetching each changed/new `.tsx` file directly through the Vite dev server to confirm it transforms without error.

---

## Task — Group "Züge", "Tags", "Veranstaltungstitel" and "Phase" into a "Veranstaltung" section on the admin dashboard ✅

**Done:**

The admin dashboard's nav grid previously listed all six admin destinations (Students, Speakers, Topics, Series, Tags, Event Title) as one flat list, with the phase switcher below as its own separately-labeled block. Series/Tags/Event Title and the phase switcher are event-specific settings, so they're now grouped under one "Veranstaltung"/"Event" section, visually separated (via the existing divider + label pattern already used for the phase switcher) from the general admin nav (Students, Speakers, Topics).

**Frontend:**

| File | Purpose |
|---|---|
| `src/pages/DashboardPage.tsx` | `AdminDashboard`'s single `navItems` array split into `navItems` (Students/Speakers/Topics) and `eventNavItems` (Series/Tags/Event Title); a new `admin.eventSection` divider+label heading (reusing the existing `.phaseDivider`/`.phaseLabel` styles) now sits between the two nav-card grids, with the "Current phase" switcher renders directly below the event nav cards, under the same section |
| `src/i18n/{en,de,fr}.ts` | `admin.eventSection` key added: "Event" / "Veranstaltung" / "Événement" |

No new routes or components — purely a rearrangement of existing nav cards and the existing phase-switcher UI on one page.

---

## Task — Admin-chosen event title shown in the top-left header bar ✅

**Done:**

The static "Job Orientation" app name that appeared top-left in every page header is now the admin-configured event title for the current UI language (the same value already used for the browser tab title), and updates live across the app the moment an admin saves a new one.

**Frontend:**

| File | Purpose |
|---|---|
| `src/contexts/EventTitleContext.tsx` | New — `EventTitleProvider` fetches `/api/config` once at app root and holds `{ en, de, fr }` in React state; `useEventTitle()` exposes `{ eventTitle, setEventTitle }` (the setter lets a save elsewhere push a live update without a refetch) |
| `src/components/AppTitle.tsx` | New — renders the event title for the current `i18n.language` (falling back to the static `dashboard.appName` string while the config hasn't loaded yet, and to English if the current language has no title set) |
| `src/App.tsx` | Wraps the app in `EventTitleProvider`; `DocumentTitle` now reads from the shared context instead of fetching config itself (avoids a duplicate `/api/config` call) |
| `src/pages/{ConsultantProfilePage,ConsultantSessionPage,DashboardPage}.tsx`, `src/pages/admin/{ConsultantsListPage,ConsultantDetailPage,StudentsListPage,SeriesListPage,InviteSpeakerPage,TagsListPage,BulkInviteSpeakersPage,TopicsListPage,EventTitlePage}.tsx` | The header's `<span>{t('dashboard.appName')}</span>` replaced with `<AppTitle className={...} />` (12 files, same pattern everywhere) |
| `src/pages/admin/EventTitlePage.tsx` | After a successful save, also calls the context's `setEventTitle()` so the header/tab title update immediately for the admin, without waiting for a page reload |

The static `dashboard.appName` i18n key is kept as the fallback shown before the config loads (and if the API call ever fails).

---

## Task — Sort the speakers admin list: pending first, then by creation date ✅

**Done:**

The "Referenten"/Speakers admin list previously had no defined ordering (whatever the DB returned). It now surfaces speakers who haven't yet accepted their invitation first (so the admin can chase them down), and within each group, oldest-invited first.

**Backend:**

| File | Purpose |
|---|---|
| `app/Http/Controllers/AdminController.php` | `consultants()` now does `orderByRaw('email_verified_at IS NOT NULL')->orderBy('created_at')` — pending (`email_verified_at` null) speakers sort before activated ones, then ascending by `created_at` within each group |
| `tests/Feature/AdminControllerTest.php` | New test file — asserts the exact sort order across a mix of old/new, pending/activated speakers; non-admin forbidden |

No frontend change needed — `ConsultantsListPage.tsx` already renders the list in whatever order the API returns.

---

## Task — Stale "Invitation sent" feedback clears when the form is edited ✅

**Done:**

After a successful single-speaker invitation, the "Invitation sent to {{email}}." banner stayed visible while the admin started filling in a new invitation, so it looked attached to whatever was currently in the (now-different) form. Two fixes: the success banner now clears as soon as any field is edited, and it displays the email that was actually invited rather than the live (and immediately-cleared) `email` field state.

**Frontend:**

| File | Purpose |
|---|---|
| `src/pages/admin/InviteSpeakerPage.tsx` | New `invitedEmail` state captures the submitted address before the form resets, used in the success message instead of the (now-empty) `email` field; new `withFeedbackCleared()` wrapper clears the `success` flag on every field's `onChange`, applied to all five inputs |

---

## Task — `$NAME` placeholder also works in the single-speaker invitation ✅

**Done:**

The `$NAME` substitution (salutation + last name, or just last name for `(ohne)`) previously only applied to the CSV bulk-invite flow. It's now shared logic in `createAndInviteSpeaker()`, so it also applies to the single-invite form.

**Backend:**

| File | Purpose |
|---|---|
| `app/Http/Controllers/AdminInviteController.php` | Moved the `str_replace('$NAME', ...)` call from `bulkInvite()`'s per-row loop into `createAndInviteSpeaker()` itself (the one place both `invite()` and `bulkInvite()` funnel through), so both paths get the substitution for free with no duplicated logic |
| `tests/Feature/AdminInviteControllerTest.php` | New test: single invite with `$NAME` in the body sends a mail with it replaced |

**Frontend:**

| File | Purpose |
|---|---|
| `src/pages/admin/InviteSpeakerPage.tsx` | Hint text added below the invitation-message textarea, same as the bulk-invite page |
| `src/pages/admin/InviteSpeakerPage.module.css` | `.hint` style added (previously only existed in `BulkInviteSpeakersPage.module.css`) |
| `src/i18n/{en,de,fr}.ts` | `admin.invite.bodyHint` key added |

---

## Task — Admin-configurable event title (per language), shown in the browser tab title ✅

**Done:**

The admin can now set the event's display title separately for English, German, and French from a new "Event Title" admin page. The value is shown as the browser tab title (`document.title`), switching live with the current UI language.

**Backend:**

| File | Purpose |
|---|---|
| `database/migrations/2026_07_22_110000_add_event_title_settings.php` | Seeds three new `app_settings` rows: `event_title_en` ("Job Orientation"), `event_title_de` ("Berufsorientierung"), `event_title_fr` ("Orientation Professionnelle") — same defaults as the existing static `dashboard.appName` i18n strings |
| `app/Http/Controllers/AppConfigController.php` | Public `GET /api/config` response gains a nested `event_title: { en, de, fr }` object |
| `app/Http/Controllers/AdminEventTitleController.php` | New — `POST /api/admin/event-title`, validates `en`/`de`/`fr` (`required\|string\|max:150`), persists each via `AppSetting::set()` |
| `routes/api.php` | `POST admin/event-title` added to the existing admin-only group |
| `tests/Feature/AdminEventTitleControllerTest.php` | Covers: public config returns seeded defaults, admin update persists and is reflected back in `/api/config`, missing a language fails validation (422), non-admin forbidden |

There's no existing pattern in this codebase for per-language admin-editable content (all i18n so far is static client-side strings) — this introduces the first one, using three flat `app_settings` keys rather than a JSON blob, since `AppSetting::get`/`set` only handle scalar values.

**Frontend:**

| File | Purpose |
|---|---|
| `src/api/config.ts` | New `EventTitle` type; `AppConfig.event_title` field added; `setEventTitle(eventTitle)` API call |
| `src/pages/admin/EventTitlePage.tsx` | New admin page at `/admin/event-title`: three text inputs (EN/DE/FR), pre-filled from `fetchConfig()`, saved via `setEventTitle()`; reuses `InviteSpeakerPage.module.css` form chrome |
| `src/App.tsx` | `/admin/event-title` route added, wrapped in `RequireAdmin`; new top-level `DocumentTitle` component fetches config once and sets `document.title` to `event_title[currentLanguage]` (falling back to English), re-running whenever the i18n language changes |
| `src/pages/DashboardPage.tsx` | "Event Title" nav card added to the admin dashboard |
| `src/i18n/{en,de,fr}.ts` | `admin.eventTitleOverview` label + `admin.eventTitle.*` (fieldEn/De/Fr, submit, submitting, success, errorGeneric) keys added |

Verified against the running dev environment: `GET /api/config` returns the seeded `event_title` object, and a live `POST /api/admin/event-title` call as the seeded admin persisted new values that were immediately reflected back by `/api/config` (then reverted to the seeded defaults). Did not verify the live `document.title` browser-tab update in an actual browser (no browser available in this environment) — `tsc --noEmit` passes and the Vite dev server hot-reloaded all changed files without errors.

---

## Task — Activation status column on the speakers admin list ✅

**Done:**

The admin "Referenten"/Speakers list now shows whether each invited speaker has accepted their invitation and set a password (`email_verified_at` is only set in `AcceptInvitationController::accept()`) or is still pending.

**Backend:**

No backend change — `AdminController::consultants()` already returns full `User` records, and `email_verified_at` was never hidden, so it was already present in the JSON response; only the frontend needed to read and display it.

**Frontend:**

| File | Purpose |
|---|---|
| `src/api/auth.ts` | `User` type gains `email_verified_at: string \| null` |
| `src/pages/admin/ConsultantsListPage.tsx` | New "Activated" column: green "Activated" badge when `email_verified_at` is set, amber "Pending" badge otherwise |
| `src/pages/admin/AdminListPage.module.css` | `.badgeActive` / `.badgePending` styles added |
| `src/i18n/{en,de,fr}.ts` | `admin.columns.activated` / `.activatedYes` / `.activatedNo` keys added |

---

## Task — `$NAME` placeholder in CSV bulk-invite messages ✅

**Done:**

The single shared invitation message used in the CSV bulk-invite flow can now contain the literal placeholder `$NAME`, which is replaced per-row before sending with that speaker's salutation + last name (e.g. `"Frau Doe"`), or just the last name when the salutation is `(ohne)`.

**Backend:**

| File | Purpose |
|---|---|
| `app/Http/Controllers/AdminInviteController.php` | New private `nameForPlaceholder()` helper; `bulkInvite()` now does `str_replace('$NAME', ..., $invitation_body)` per row before calling `createAndInviteSpeaker()`, so each speaker gets a personalized copy of the shared message |
| `tests/Feature/AdminInviteControllerTest.php` | New test: two CSV rows (one with a salutation, one `(ohne)`) each receive a mail body with `$NAME` correctly substituted |

**Frontend:**

| File | Purpose |
|---|---|
| `src/pages/admin/BulkInviteSpeakersPage.tsx` | Hint text added below the invitation-message textarea explaining the `$NAME` placeholder |
| `src/i18n/{en,de,fr}.ts` | `admin.bulkInvite.bodyHint` key added |

Note: the single-invite flow (`/admin/invite`) is unaffected — `$NAME` substitution only applies to the CSV bulk-invite path, per the original request.

---

## Task — Salutation is now a fixed dropdown list ✅

**Done:**

The free-text salutation input (single invite) is now a `<select>` restricted to a fixed list: `Herr, Frau, (ohne), Herr Dr., Frau Dr., Dr., Herr Prof. Dr., Frau Prof. Dr., Prof. Dr.`. The same list is enforced server-side for both the single-invite and CSV bulk-invite paths, so a CSV row with an out-of-list value is now skipped rather than silently accepted as a stray free-text string — this also makes the values predictable enough for the upcoming `$NAME` placeholder task.

**Backend:**

| File | Purpose |
|---|---|
| `app/Http/Controllers/AdminInviteController.php` | New `public const SALUTATIONS` list; both the single-invite `Request::validate()` and the per-row bulk-invite `Validator::make()` now use `Rule::in(self::SALUTATIONS)` instead of a bare `string\|max:30` |
| `tests/Feature/AdminInviteControllerTest.php` | Added: single invite rejects a salutation outside the list (422), bulk invite skips a CSV row with an out-of-list salutation |

**Frontend:**

| File | Purpose |
|---|---|
| `src/api/invite.ts` | New exported `SALUTATION_OPTIONS` constant — the same 9 values as the backend list |
| `src/pages/admin/InviteSpeakerPage.tsx` | Salutation field changed from a free-text `<input>` to a `<select>` populated from `SALUTATION_OPTIONS`, with a disabled placeholder option |
| `src/pages/admin/InviteSpeakerPage.module.css` | `.field select` added alongside the existing `.field input` styling |
| `src/i18n/{en,de,fr}.ts` | `admin.invite.fieldSalutationPlaceholder` reworded from an example ("e.g. Mr, Ms, Dr.") to a "please select" prompt (it's now the disabled default `<option>`, not an input placeholder); `admin.bulkInvite.csvHint` extended to list the allowed salutation values, since the CSV path has no dropdown to guide the admin |

Note: the CSV bulk-invite flow still accepts salutation as a plain text column (no dropdown, since it's a file upload) — but the same fixed list is now enforced server-side, and the hint text spells out the allowed values.

---

## Task — Widen the "Invite a Speaker" panel ✅

**Done:**

The single-invite form's card was capped at `max-width: 600px`, too narrow for the salutation/first name/last name row added in the previous task — the last field overflowed the card border. Widened the card to `760px`.

**Frontend:**

| File | Purpose |
|---|---|
| `src/pages/admin/InviteSpeakerPage.module.css` | `.formCard` `max-width` increased from `600px` to `760px` |

---

## Task — Add a salutation/title field to speaker invitations ✅

**Done:**

Both the single-speaker and CSV bulk-invite forms now capture a "salutation/title" (e.g. "Herr"/"Frau"/"Dr.") alongside first and last name, stored on the speaker's `ConsultantProfile`. This lays the groundwork for the upcoming `$NAME` placeholder in bulk-invite messages (a separate, still-open TODO item).

**Backend:**

| File | Purpose |
|---|---|
| `database/migrations/2026_07_22_100000_add_salutation_to_consultant_profiles.php` | Adds nullable `salutation` (`varchar(30)`) to `consultant_profiles` |
| `app/Models/ConsultantProfile.php` | `salutation` added to `$fillable` |
| `app/Http/Controllers/AdminInviteController.php` | `invite()` now requires `salutation` (`required\|string\|max:30`); `createAndInviteSpeaker()` takes and stores it. `bulkInvite()`'s CSV format changed from `firstname,lastname,email` to `salutation,firstname,lastname,email` — `parseCsv()` returns a 4-tuple, and each row is validated for a present salutation same as first/last name |
| `tests/Feature/AdminInviteControllerTest.php` | Updated existing tests for the new field/CSV shape; added: single invite fails validation without a salutation, bulk invite persists `salutation` per created profile, bulk invite skips CSV rows missing a salutation |

**Frontend:**

| File | Purpose |
|---|---|
| `src/api/invite.ts` | `InvitePayload` gains `salutation: string` |
| `src/pages/admin/InviteSpeakerPage.tsx` | New "Salutation / Title" input added to the name row (before first/last name), required, sent as part of the invite payload |
| `src/pages/admin/BulkInviteSpeakersPage.tsx` | No code change — the CSV column hint text now reflects the new 4-column format |
| `src/i18n/{en,de,fr}.ts` | `admin.invite.fieldSalutation` / `.fieldSalutationPlaceholder` added; `admin.bulkInvite.csvHint` updated to list `salutation, firstname, lastname, email` |

**CSV format now expected:**
```csv
salutation,firstname,lastname,email
Frau,Jane,Doe,jane.doe@example.com
Herr,John,Smith,john.smith@example.com
```

Verified against the running dev environment: migration applied cleanly to Postgres, and a live `POST /api/admin/invite` call with a `salutation` field succeeded end-to-end.

---

## Task — Move speaker invitation into the "Referenten" admin area + CSV bulk invite ✅

**Done:**

"Invite a Speaker" was previously a standalone card on the admin dashboard. It now lives inside the Speakers ("Referenten") admin area — `/admin/consultants` has two buttons above the table: "Invite a Speaker" (single, unchanged flow) and a new "Bulk-invite Speakers" flow that accepts a CSV of `firstname,lastname,email`.

**Backend:**

| File | Purpose |
|---|---|
| `app/Http/Controllers/AdminInviteController.php` | Single-invite creation logic extracted into a private `createAndInviteSpeaker()` helper, now shared by both actions. New `bulkInvite()` — `POST /api/admin/invite/bulk`, validates an uploaded `csv` file (`mimes:csv,txt`) + one shared `invitation_body`; parses rows (header row skipped, columns positional: firstname, lastname, email; blank lines skipped); per-row validates via `Validator::make` (required fields, valid + unique email — duplicates *within* the same file are caught too, since rows are processed sequentially); invites each valid row, collects skipped rows with a reason; returns `{ invited_count, invited[], skipped[] }` |
| `routes/api.php` | `POST admin/invite/bulk` added next to the existing `admin/invite` route, same `auth:sanctum` + `RequireAdmin` group |
| `tests/Feature/AdminInviteControllerTest.php` | New test file — single invite (creates user + profile, sends mail), non-admin forbidden; bulk invite happy path (2 rows invited), row-level skipping (invalid email, pre-existing email, duplicate within the file — 3 skipped / 1 invited), blank-line handling, non-admin forbidden |

**Frontend:**

| File | Purpose |
|---|---|
| `src/api/invite.ts` | `bulkInviteSpeakers(csv, invitationBody)` — multipart POST; `BulkInviteResult`/`BulkInviteSkippedRow` types |
| `src/pages/admin/BulkInviteSpeakersPage.tsx` | New page at `/admin/invite/bulk`: CSV file input + shared invitation-message textarea + submit; on success shows an "N invitation(s) sent" summary and a list of skipped rows with reasons; reuses `InviteSpeakerPage.module.css` for the form/card chrome |
| `src/pages/admin/BulkInviteSpeakersPage.module.css` | Page-specific styles (CSV hint text, skipped-rows result box) |
| `src/pages/admin/ConsultantsListPage.tsx` | Title row now has two action buttons: "Invite a Speaker" (`/admin/invite`) and "Bulk-invite Speakers" (`/admin/invite/bulk`) |
| `src/pages/admin/AdminListPage.module.css` | `.titleRow`, `.actions`, `.primaryBtn`, `.secondaryBtn` added (shared by any admin list page needing header actions) |
| `src/pages/admin/InviteSpeakerPage.tsx` | Back link now points to `/admin/consultants` (Speakers list) instead of `/dashboard`, matching its new home |
| `src/pages/DashboardPage.tsx` | Removed the standalone "Invite a Speaker" nav card from the admin dashboard (now reached via the Speakers list) |
| `src/App.tsx` | `/admin/invite/bulk` route added, wrapped in `RequireAdmin` |
| `src/i18n/{en,de,fr}.ts` | `admin.bulkInviteSpeakers` label + `admin.bulkInvite.*` (fieldCsv, csvHint, submit, submitting, resultSummary, skippedTitle, errorGeneric) keys added |

**CSV format expected:** a header row followed by `firstname,lastname,email` per line, e.g.:
```csv
firstname,lastname,email
Jane,Doe,jane.doe@example.com
John,Smith,john.smith@example.com
```

---

## Task — Admin can set/change the tag of a speaker's unit ✅

**Done:**

Speakers' topics can be created without a tag (tag assignment is deferred to the admin, per the original `2026_07_21_110000` migration comment). This adds the ability for the admin to actually assign or change that tag, from the consultant detail page's "Session"/"Vortrag" tab.

**Backend:**

| File | Purpose |
|---|---|
| `app/Http/Controllers/AdminTopicController.php` | `updateTag()` — `POST /api/admin/topics/{topic}/tag`, validates `tag_id` (`required\|integer\|exists:tags,id`), updates the topic, returns it with `tag` freshly loaded |
| `routes/api.php` | Route added to the existing `auth:sanctum` + `RequireAdmin` admin group |
| `tests/Feature/AdminTopicControllerTest.php` | Covers: setting a tag on a topic that had none, changing an already-set tag, rejecting a non-existent `tag_id` (422), non-admin forbidden |

**Frontend:**

| File | Purpose |
|---|---|
| `src/api/admin.ts` | `updateTopicTag(topicId, tagId)` added |
| `src/pages/admin/ConsultantDetailPage.tsx` | New `TagEditor` component in the Session tab: shows the current tag as a badge with a "Change tag" button; clicking it reveals a `<select>` (populated from `fetchAdminTags()`) plus Save/Cancel; on save, the topic's tag is updated locally without a full page reload |
| `src/pages/admin/ConsultantDetailPage.module.css` | `.tagEditRow`, `.tagEditBtn`, `.tagSaveBtn`, `.tagCancelBtn`, `.tagError` styles added |
| `src/i18n/{en,de,fr}.ts` | `admin.consultantDetail.editTag`, `.saveTag`, `.errorTagSave` keys added |

---

## Task — Admin add/remove tags ✅

**Done:**

Tags previously could only be created via `TestDataSeeder` — there was no admin UI to manage them. This adds an admin page to add and remove tags, mirroring the "series" admin CRUD page built earlier.

**Backend:**

| File | Purpose |
|---|---|
| `app/Http/Controllers/AdminController.php` | New `tags()` — `GET /api/admin/tags`, list ordered by name (admin-only, alongside the existing students/consultants/topics lists) |
| `app/Http/Controllers/AdminTagController.php` | `store()` — validates a unique `name`, auto-generates a unique `slug` via `Str::slug()` (appending `-2`, `-3`, … on collision); `destroy()` — deletes the tag, but returns `422` if the tag is still assigned to any `Topic` (checked via `$tag->topics()->exists()`) instead of relying on the DB's `restrictOnDelete()` constraint to surface a raw SQL error |
| `routes/api.php` | `GET admin/tags` added to `AdminController`; `POST admin/tags` / `DELETE admin/tags/{tag}` added to `AdminTagController`, all inside the existing `auth:sanctum` + `RequireAdmin` group |
| `tests/Feature/AdminTagControllerTest.php` | Covers: admin list, create with slug generation, duplicate name rejected (422), delete an unused tag, delete blocked for a tag assigned to a topic (422), non-admin forbidden on create and delete |

Note: `student_tag_preferences.tag_id` cascades on delete (pre-existing FK behaviour, unchanged) — deleting a tag no student has picked yet is safe; a tag already in use by a topic cannot be deleted at all, by design.

**Frontend:**

| File | Purpose |
|---|---|
| `src/api/admin.ts` | `fetchAdminTags()`, `createTag(name)`, `deleteTag(id)` added alongside the existing `Tag` interface and admin fetchers |
| `src/pages/admin/TagsListPage.tsx` | New admin page: table of existing tags with a delete button per row, plus an add form; optimistic add/delete with rollback and an inline error message (surfaces the backend's "tag is in use" message on failed deletes) |
| `src/pages/admin/TagsListPage.module.css` | Page-specific styles (add form, delete button) |
| `src/App.tsx` | `/admin/tags` route added, wrapped in `RequireAdmin` |
| `src/pages/DashboardPage.tsx` | "Tags" nav card added to the admin dashboard |
| `src/i18n/{en,de,fr}.ts` | `admin.tagsOverview` label + `admin.tags.*` (fieldName, add, delete, errorGeneric, errorDelete) keys added |

---

## Task — German wording: "Serie" → "Zug" ✅

**Done:**

Replaced all German-locale occurrences of "Serie" (in the sense of a school track / Schwerpunkt) with "Zug" in `frontend/src/i18n/de.ts`: `profile.fieldSerie` ("Serie" → "Zug"), `admin.seriesOverview` ("Serien" → "Züge"), `admin.series.fieldName` ("Serienname" → "Zugname"), `admin.series.errorGeneric` ("Serie konnte nicht hinzugefügt werden." → "Zug konnte nicht hinzugefügt werden."). English and French translations, i18n key names, and backend code (which use the neutral `serie` identifier, not user-facing German text) were unaffected.

---

## Task — Admin-managed "series" list for speaker profiles ✅

**Done:**

Previously the "série" (school track, e.g. L / ES / …) offered on the speaker profile form was a hardcoded list (`SERIE_OPTIONS` in the frontend, `Rule::in([...])` in the backend). This task replaces that static list with a DB-backed, admin-manageable list, seeded initially with only `autre` ("other" / "sonstige").

**Backend:**

| File | Purpose |
|---|---|
| `database/migrations/2026_07_22_090000_create_series_table.php` | Creates `series` table (`id`, `name` unique, timestamps); seeds a single initial row `autre` |
| `app/Models/Series.php` | New model, `$fillable = ['name']` |
| `app/Http/Controllers/SeriesController.php` | `GET /api/series` — public list, ordered by name (used by the speaker profile picker and the admin management page) |
| `app/Http/Controllers/AdminSeriesController.php` | `POST /api/admin/series` (create, validated unique name) and `DELETE /api/admin/series/{series}` (delete) — both admin-only |
| `routes/api.php` | Public `series` route added; `admin/series` POST/DELETE added to the existing admin-only group |
| `app/Http/Controllers/ConsultantProfileController.php` | `serie` validation changed from a static `Rule::in([...])` to `Rule::exists('series', 'name')`, so only admin-defined series validate |
| `database/seeders/TestDataSeeder.php` | New `createSeries()` step seeds `S, ES, L, STI2D, STMG, autre` via `Series::firstOrCreate`; consultant profiles now pick their `serie` from these seeded rows instead of a disconnected hardcoded array |
| `tests/Feature/AdminSeriesControllerTest.php` | Covers: public list readable, admin create, duplicate name rejected (422), admin delete, non-admin forbidden on create and delete |

**Frontend:**

| File | Purpose |
|---|---|
| `src/api/series.ts` | `fetchSeries()`, `createSeries(name)`, `deleteSeries(id)` |
| `src/api/profile.ts` | Removed hardcoded `SERIE_OPTIONS`/`Serie` type; `serie` is now a plain `string \| null` |
| `src/pages/ConsultantProfilePage.tsx` | Fetches series options via `fetchSeries()` (`Suspense` + `use()`, alongside the existing profile promise) and renders the `<select>` from the fetched list instead of the hardcoded array |
| `src/pages/admin/SeriesListPage.tsx` | New admin page: table of existing series with a delete button per row, plus an add form; optimistic delete with rollback on failure |
| `src/pages/admin/SeriesListPage.module.css` | Page-specific styles (add form, delete button) |
| `src/App.tsx` | `/admin/series` route added, wrapped in `RequireAdmin` |
| `src/pages/DashboardPage.tsx` | "Series" nav card added to the admin dashboard |
| `src/i18n/{en,de,fr}.ts` | `admin.seriesOverview` label + `admin.series.*` (fieldName, add, delete, errorGeneric) keys added |

**To apply the migration:**
```bash
docker compose exec app php artisan migrate
```

---

## Task — German wording: "Einheit" → "Vortrag" ✅

**Done:**

Replaced all German-locale occurrences of "Einheit" (unit) with "Vortrag" (talk/presentation) in `frontend/src/i18n/de.ts`, adjusting grammar for the masculine noun (e.g. "Meine Einheit" → "Mein Vortrag", "Meine Einheit bearbeiten" → "Meinen Vortrag bearbeiten", "Einheit Details" → "Vortragsdetails", "Noch keine Einheit konfiguriert." → "Noch kein Vortrag konfiguriert."). Affects the session page title/labels, phase descriptions, and the admin consultant-detail tab. English and French translations were unaffected as the task only concerned the German term.

---

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

## Task 14 — Speaker display name from profile first + last name ✅

**Done:**

| File | Purpose |
|---|---|
| `app/Models/User.php` | Added `name` accessor: for consultant users with a loaded `consultantProfile`, returns `first_name . ' ' . last_name`; falls back to the raw DB `name` column for students/admins or speakers without a profile |
| `app/Http/Controllers/ConsultantProfileController.php` | `show()` now calls `->load('consultantProfile')` before returning `name`, so the accessor has the relationship available |
| `app/Http/Controllers/AdminController.php` | `topics()` query updated to eager-load `consultant.consultantProfile` so the `name` accessor fires correctly in the topics list |

The `users.name` column is kept as a fallback (used for students, admins, and speakers who have not yet filled in their profile). All places that already eager-load `consultantProfile` — the admin consultant list, the `me` endpoint — automatically benefit from the accessor with no further changes.

---

## Task 13 — Invitation-only speaker registration ✅

**Done:**

**Backend:**

| File | Purpose |
|---|---|
| `app/Http/Controllers/AdminInviteController.php` | `POST /api/admin/invite` — creates speaker user + profile, generates a 7-day password-reset token, sends a custom invitation email |
| `app/Http/Controllers/Auth/AcceptInvitationController.php` | `POST /api/auth/invitation/accept` — validates token via Laravel's `Password::reset()`, sets password, marks email verified, issues Sanctum token |
| `app/Mail/SpeakerInvitation.php` | Mailable that wraps the admin's custom message and the set-password link |
| `resources/views/emails/speaker-invitation.blade.php` | HTML email template |
| `config/auth.php` | Password reset token expiry raised from 60 min to 7 days (10 080 min) |
| `app/Http/Controllers/AppConfigController.php` | `admin_email` added to the public `/api/config` response |
| `routes/api.php` | `POST /api/admin/invite` and `POST /api/auth/invitation/accept` added |

**Frontend:**

| File | Purpose |
|---|---|
| `src/api/config.ts` | `admin_email` added to `AppConfig` type |
| `src/api/invite.ts` | `inviteSpeaker()` and `acceptInvitation()` API helpers |
| `src/pages/LoginPage.tsx` | Speaker tab footer replaced: "Registration is by invitation only. [Request an invitation]" (mailto link to `admin_email`) |
| `src/pages/admin/InviteSpeakerPage.tsx` | Admin form: first name, last name, email, invitation message textarea → calls `POST /api/admin/invite` |
| `src/pages/admin/InviteSpeakerPage.module.css` | Form card styles |
| `src/pages/SetPasswordPage.tsx` | Public page at `/set-password?token=…&email=…` — speaker sets their password and is logged in on success |
| `src/pages/SetPasswordPage.module.css` | Page styles |
| `src/pages/DashboardPage.tsx` | "Invite a Speaker" card added to admin nav |
| `src/App.tsx` | `/set-password` (public) and `/admin/invite` (admin-only) routes added |
| `src/i18n/{en,de,fr}.ts` | `login.invitationOnly`, `login.requestInvitation`, `setPassword.*`, `admin.inviteSpeaker`, `admin.invite.*` keys added |

**Flow:**
1. Admin opens `/admin/invite`, fills in name, email, and a personal message, clicks "Send invitation"
2. Backend creates a speaker account (no password yet) and emails the speaker with the custom message + a "Set my password" button (valid 7 days)
3. Speaker clicks the link → `/set-password?token=…&email=…` → sets password → immediately logged in and redirected to dashboard
4. On the login page, the speaker tab footer now reads "Registration is by invitation only. [Request an invitation →]" (opens mailto: to the admin)

**Configuration:** set `admin_email` in `app_settings` to the real admin address:
```sql
INSERT INTO app_settings (key, value) VALUES ('admin_email', 'real-admin@school.de')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

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
