# Tasks

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
