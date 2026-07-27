# Tasks

## Task — Admin-configurable "event manager" email: target for invitation requests and reply-to for sent invitations ✅

**Done:**

Previously `GET /api/config` returned a hardcoded-default `admin_email` (`'admin@example.com'`) that nothing in the admin UI could ever change — it was only used as the `mailto:` target on the login page's "request an invitation" link. This makes that address admin-editable (renamed to `event_manager_email` to avoid confusion with the actual admin login account) and adds a second use: it's now set as the `Reply-To` header on every speaker-invitation email, so a speaker replying to their invitation reaches the event's organizer, not a no-reply address.

**Backend:**

| Change | Details |
|---|---|
| `backend/app/Http/Controllers/AdminEventDetailsController.php` | `update()` gains `event_manager_email` (`nullable\|email\|max:255`), stored via the existing `AppSetting::set()` mechanism alongside `event_datetime`/`event_location` (same form, same endpoint) |
| `backend/app/Http/Controllers/AppConfigController.php` | `admin_email` key renamed to `event_manager_email` (same default fallback, `'admin@example.com'`, for when the setting was never touched) |
| `backend/app/Mail/SpeakerInvitation.php` | New constructor param `?string $replyToEmail`; `envelope()` sets `replyTo: [$this->replyToEmail]` when present (named `replyToEmail`, not `replyTo`, since `Mailable` already declares a non-readonly `$replyTo` property for its own fluent builder — reusing that name broke the `readonly` promoted-property declaration) |
| `backend/app/Http/Controllers/AdminInviteController.php` | `createAndInviteSpeaker()` now reads `AppSetting::get('event_manager_email', 'admin@example.com')` and passes it through to `SpeakerInvitation` |
| `backend/tests/Feature/AdminEventDetailsControllerTest.php` | Existing tests extended to also cover `event_manager_email`; new test for rejecting an invalid email |
| `backend/tests/Feature/AdminInviteControllerTest.php` | Two new tests: the invitation's `Reply-To` follows the configured `event_manager_email`, and falls back to `admin@example.com` when nothing was configured |

**Frontend:**

| Change | Details |
|---|---|
| `frontend/src/api/config.ts` | `AppConfig.admin_email` → `event_manager_email: string \| null`; `setEventDetails()` payload gains the same field |
| `frontend/src/pages/admin/EventPage.tsx` | `EventDetailsForm` gained a third field (email input + hint text), submitted together with datetime/location |
| `frontend/src/pages/LoginPage.tsx` | The "request an invitation" footer link now only renders when `config.event_manager_email` is set (previously always rendered against the old hardcoded default) — avoids a dead `mailto:` link if an admin ever clears the field |
| `frontend/src/i18n/de.ts`, `fr.ts` | New `admin.eventDetails.fieldManagerEmail`/`managerEmailHint` |

Verified with `php artisan test` (122/122 passing) and `tsc --noEmit`/`oxlint` (clean, no new warnings). Verified live against the running dev stack: set `event_manager_email` to `organizer@example.com` via `POST /api/admin/event-details`, confirmed `GET /api/config` reflected it, sent a real invitation and confirmed via Mailcatcher's raw source that the email carries `Reply-To: organizer@example.com`. Removed the test invitee and the setting row afterward (rather than setting it back to `null`, which would have permanently overridden the hardcoded default for this dev DB) so `GET /api/config` again falls back to `admin@example.com`, matching the pre-existing state.

---

## Task — "Raum: tbd" placeholder shown before a room has been assigned ✅

**Done:**

The conference-phase room badge on a speaker's read-only talk view (added in an earlier task) only rendered when at least one of the speaker's `TimeSlot`s had a `room` set — before a room was assigned, the badge was simply absent rather than saying anything. It's now always shown, falling back to a "Raum: tbd" / "Salle : à définir" placeholder when no room has been assigned yet.

**Frontend:**

| Change | Details |
|---|---|
| `frontend/src/pages/ConsultantSessionPage.tsx` | `SessionReadOnly`'s room badge is no longer conditionally rendered on `rooms.length > 0` — it always renders, using a new `roomText` (the joined room list, or `t('session.roomTbd')` when empty) |
| `frontend/src/i18n/de.ts`, `fr.ts` | New `session.roomTbd`: `'tbd'` (DE) / `'à définir'` (FR), interpolated into the existing `session.roomLabel` template |

No backend change — this only concerns how already-available `time_slots[].room` data is displayed. Verified with `tsc --noEmit` (clean, no new warnings). No browser available in this environment to visually confirm rendering, and the one real consultant account seeded in the current dev DB belongs to the actual developer, so the conference-phase view wasn't live-toggled for this account to avoid disrupting their session.

---

## Task — Single speaker invitation now has one invitation-text field, not two ✅

**Done:**

The single-speaker invitation form (`InviteSpeakerPage.tsx`) previously showed two full invitation-text textareas (German and French) even though a single invitation always targets one known speaker with one selected language — only one of the two bodies was ever actually used, chosen by the `language` dropdown. This collapses it to one textarea whose content is sent for whichever language was selected. The bulk-invite CSV flow (`BulkInviteSpeakersPage.tsx`) is unchanged and still needs both DE/FR templates, since a single CSV batch can contain rows of either language.

**Backend:**

| Change | Details |
|---|---|
| `backend/app/Http/Controllers/AdminInviteController.php` | `invite()`'s validation replaces `invitation_body_de`/`invitation_body_fr` (both previously required) with a single required `invitation_body`; the language-based branch selecting between them is gone — the submitted body is used as-is, whatever language it was written for. `bulkInvite()`/`parseCsv()` are untouched. |
| `backend/tests/Feature/AdminInviteControllerTest.php` | `invitePayload()` helper updated to the single field; the two template-selection tests renamed/rewritten to assert `$NAME`-placeholder substitution and language-correct subject line for a body submitted directly in German/French (no more "template not used" assertions, since there's only one body now) |

**Frontend:**

| Change | Details |
|---|---|
| `frontend/src/api/invite.ts` | `InvitePayload.invitation_body_de`/`invitation_body_fr` replaced with a single `invitation_body` |
| `frontend/src/pages/admin/InviteSpeakerPage.tsx` | Two textareas + state vars collapsed into one (`invitationBody`) |
| `frontend/src/i18n/de.ts`, `fr.ts` | New `admin.invite.fieldBody` ("Einladungsnachricht"/"Message d'invitation") for the single field; `fieldBodyDe`/`fieldBodyFr` kept as-is since `BulkInviteSpeakersPage.tsx` still uses them |

Verified with `php artisan test` (119/119 passing) and `tsc --noEmit`/`oxlint` (clean, no new warnings). Verified live against the running dev stack: sent a single French invitation with only `invitation_body` set, confirmed via Mailcatcher that `$NAME` was correctly replaced ("Cher Frau Livecheck, merci.") and the French chrome rendered; confirmed the old two-field payload (`invitation_body_de`/`invitation_body_fr`) is now rejected with a 422. Removed the test invitee afterward.

---

## Task — Dashboard subtitle: sentences on their own line instead of semicolon-joined ✅

**Done:**

Of all the dashboard `.subtitle` texts, only `dashboard.consultantIntro` (added earlier this session) combined multiple sentences with a semicolon rather than as separate sentences/lines.

| Change | Details |
|---|---|
| `frontend/src/i18n/de.ts`, `fr.ts` | `dashboard.consultantIntro` rewritten as three separate sentences joined by `\n` instead of a semicolon-joined run-on sentence |
| `frontend/src/pages/DashboardPage.module.css` | `.subtitle` gained `white-space: pre-line` so the embedded `\n`s actually render as line breaks rather than collapsing to a single line |

The other dashboard subtitle strings (`phasePreparation`, `phaseSelection`, `phaseConference`, `adminSubtitle`, `consultantPhaseConference`) were already single short sentences with no semicolons — nothing to change there.

Verified with `tsc --noEmit`/`oxlint` (clean, no new warnings); frontend-only text/CSS change, no backend impact.

---

## Task — Speaker-facing emails now match the speaker's own language ✅

**Done:**

Swept every email sent to a speaker for hardcoded English text and made each one follow the speaker's chosen language (`de`/`fr`) instead:

| Email | Before | After |
|---|---|---|
| Invitation (`SpeakerInvitation`) | English subject/chrome, only the admin-authored body text was already language-aware | Subject and all surrounding chrome (greeting, button, note) now switch on the invited speaker's `language` |
| Forgot-password (`SpeakerPasswordReset`) | English throughout | Subject and chrome now follow the requesting speaker's `ConsultantProfile->language` (defaults to `de` if no profile exists yet) |
| Self-registration verification email | Laravel's built-in English `VerifyEmail` notification | New `App\Notifications\VerifyEmailNotification` (extends Laravel's, overrides `toMail()`) sends German text — this one has no language to key off since it fires *before* a `ConsultantProfile` exists, so it falls back to the app's German default like every other "no preference known yet" case elsewhere in the app |

**Backend:**

| Change | Details |
|---|---|
| `backend/app/Mail/SpeakerInvitation.php`, `SpeakerPasswordReset.php` | New `public readonly string $language = 'de'` constructor param; `envelope()` picks the subject by language |
| `backend/resources/views/emails/speaker-invitation.blade.php`, `password-reset.blade.php` | `<html lang="{{ $language }}">`; the previously English greeting/intro/button/note text now branches on `@if ($language === 'fr') ... @else ... @endif` (the admin-authored `$body` itself was already localized and is unchanged) |
| `backend/app/Http/Controllers/AdminInviteController.php` | `createAndInviteSpeaker()` now passes the invite's `$language` into `SpeakerInvitation` |
| `backend/app/Http/Controllers/Auth/ForgotPasswordController.php` | Eager-loads `consultantProfile`, passes `$user->consultantProfile?->language ?? 'de'` into `SpeakerPasswordReset` |
| `backend/app/Notifications/VerifyEmailNotification.php` (new) | Extends `Illuminate\Auth\Notifications\VerifyEmail`, overrides `toMail()` with German subject/greeting/body/button/note |
| `backend/app/Models/User.php` | `sendEmailVerificationNotification()` overridden to send the new notification instead of Laravel's default |
| `backend/tests/Feature/ForgotPasswordControllerTest.php` | Two new tests: the reset email is sent in French when the speaker's profile says `fr`, and defaults to German when there's no profile at all |
| `backend/tests/Feature/AdminInviteControllerTest.php` | The existing DE/FR body tests now also assert `$mail->language` and the localized subject line |
| `backend/tests/Feature/RegisterControllerTest.php` (new) | Registering a consultant sends the new German-language verification notification |

Verified with `php artisan test` (119/119 passing). Verified live against the running dev stack via Mailcatcher: sent a French invitation and confirmed `lang="fr"`, the French subject, and French chrome text ("Bonjour Marie," "Cliquez sur le bouton…") in the rendered email source; registered a test consultant and confirmed the verification email's subject reads "E-Mail-Adresse bestätigen — Forum der Berufe". Removed both test accounts afterward.

---

## Task — i18n for slot-group labels, conference-phase room number, dashboard subtitle polish ✅

**Done:**

Three small follow-ups from earlier in this session:

1. The three slot-group labels (`buildSlotGroups()` in `frontend/src/api/session.ts`) were hardcoded bilingual strings (e.g. `'Vor Ort im DFG/LFA / sur place um / à'`, mashing both languages into one string regardless of the active locale) rather than real i18n keys.
2. During the conference phase, the read-only talk view had no way to show which room a speaker was assigned to.
3. The dashboard subtitle's `line-height` wasn't set explicitly (inconsistent spacing between short one-line phase texts and longer wrapped ones), and `dashboard.consultantIntro` (added earlier this session) incorrectly implied students pick their topics "once the conference phase begins" — that actually happens during the *selection* phase; the conference phase is when the talk locks and a room gets assigned.

**Backend:**

| Change | Details |
|---|---|
| `backend/app/Http/Controllers/ConsultantSessionController.php` | `show()` and `update()`'s `fresh()` call now eager-load the `timeSlots` relation (already existed on `Topic`, used elsewhere for the conference-phase schedule) alongside `tag`, so the room assignment is available to the frontend |
| `backend/tests/Feature/ConsultantSessionControllerTest.php` | New test: `GET /consultant/session` includes the assigned `TimeSlot`'s `room` in the response |

**Frontend:**

| Change | Details |
|---|---|
| `frontend/src/api/session.ts` | `buildSlotGroups()` now takes a `t` translation function and uses `session.slotGroupInPerson`/`slotGroupVideo`/`slotGroupReception` instead of hardcoded strings; `ConsultantSession` gained `time_slots: { id, room }[]` |
| `frontend/src/pages/ConsultantSessionPage.tsx`, `frontend/src/pages/admin/ConsultantDetailPage.tsx`, `frontend/src/pages/DashboardPage.tsx` | All three `buildSlotGroups()` call sites updated to pass `t` (the `DashboardPage.tsx` one didn't call `useTranslation()` yet, so that hook was added) |
| `frontend/src/pages/ConsultantSessionPage.tsx` | `SessionReadOnly` now shows a prominent `session.roomLabel` badge ("Raum: R101") at the top of the "Vortragsdetails" section, built from the unique, non-null rooms across `session.time_slots` (only appears once a room has actually been assigned) |
| `frontend/src/pages/ConsultantSessionPage.module.css` | New `.roomBadge` (bold, tinted pill, larger than body text) |
| `frontend/src/i18n/de.ts`, `fr.ts` | New `session.slotGroupInPerson`/`slotGroupVideo`/`slotGroupReception`, `session.roomLabel`; `dashboard.consultantIntro` reworded to correctly attribute topic selection to the selection phase and describe the conference-phase room instead |
| `frontend/src/pages/DashboardPage.module.css` | `.subtitle` gained an explicit `line-height: 1.5` |

Verified with `php artisan test` (116/116 passing) and `tsc --noEmit`/`oxlint` (clean, no new warnings). Verified live against the running dev stack: assigned a `TimeSlot` with `room: 'R101'` to the demo consultant's topic, confirmed `GET /api/consultant/session` returns it under `time_slots`, then removed the test time slot afterward. No browser available in this environment to visually confirm the room badge or line-spacing rendering.

---

## Task — Relabeled "Bevorzugte Sprache" to "Muttersprache" ✅

**Done:**

| Change | Details |
|---|---|
| `frontend/src/i18n/de.ts` | `profile.fieldLanguage` and `admin.invite.fieldLanguage`: `'Bevorzugte Sprache'` → `'Muttersprache'` |
| `frontend/src/i18n/fr.ts` | Same two keys: `'Langue préférée'` → `'Langue maternelle'`, for consistency with the German change (the request only named the German string, but this app labels every field bilingually, so the French side was updated to match rather than left saying something different) |

`admin.columns.language` (the short "Sprache"/"Langue" column header elsewhere) was left untouched — it never said "Bevorzugte Sprache" to begin with.

Frontend-only text change, no backend/tests affected. Verified with `tsc --noEmit`/`oxlint` (clean, no new warnings).

---

## Task — During the conference phase, a speaker's talk becomes read-only (profile stays editable); lighter phase-duration hints ✅

**Done:**

Two related small requests bundled together, both refining work from earlier in this session:

1. During the conference phase, editing a speaker's session/talk is now blocked — but profile editing, which was previously blocked too (implicitly, by the dashboard's conference-phase branch having no edit UI at all), stays available.
2. The `(until …)`/`(from …)` duration hints added to the admin's phase-switcher radio items now render in a lighter font weight than the phase name they're attached to, rather than inheriting the same bold weight.

**Backend:**

| Change | Details |
|---|---|
| `backend/app/Http/Controllers/ConsultantSessionController.php` | `update()` now returns 403 (`AppSetting::isConferencePhase()`) before validation — the session can no longer be changed once the conference phase starts. `ConsultantProfileController` was already phase-agnostic, so no change was needed there for profile edits to keep working. |
| `backend/tests/Feature/ConsultantSessionControllerTest.php` | Two new tests: a session update is rejected with 403 during the conference phase (and nothing is persisted), and the same request still succeeds during the selection phase |

**Frontend:**

| Change | Details |
|---|---|
| `frontend/src/pages/ConsultantSessionPage.tsx` | New exported `SessionReadOnly` component (title, tag, description, and only the *active* slot groups, all as plain read-only text/badges — no form controls) |
| `frontend/src/pages/ConsultantSessionPage.module.css` | New `.slotBadgeReadOnly` (non-interactive version of the "checked" slot chip) and `.readOnlyValue` |
| `frontend/src/pages/DashboardPage.tsx` | `ConsultantDashboard`'s two phase branches merged into one: the tabs (added earlier this session) now render in both phases, with a new `sessionReadOnly` flag threaded through `ConsultantTabs` → `SessionTabContent`, which renders `SessionReadOnly` instead of `SessionForm` when true (`sessionReadOnly = phase === 'conference'`); the existing conference-phase action list is kept, shown above the tabs |
| `frontend/src/pages/ConsultantSessionPage.tsx` | The standalone `/session` route (still directly reachable) now also fetches `/config` and switches to `SessionReadOnly` during the conference phase, so it can't show an editable form that the backend would then reject on submit |
| `frontend/src/i18n/de.ts`, `fr.ts` | New `session.noSessionConfigured`; `admin.phase.conferenceDesc` reworded to state that profile editing stays available while the talk no longer can |
| `frontend/src/pages/admin/EventPage.tsx` | The phase-duration text is now wrapped in its own `<span>` (`dashboardStyles.phaseOptionDuration`) instead of being inline text in the bold `phaseOptionName` div |
| `frontend/src/pages/DashboardPage.module.css` | New `.phaseOptionDuration` (`font-weight: 400`, muted gray) |

Verified with `php artisan test` (115/115 passing) and `tsc --noEmit`/`oxlint` (clean, no new warnings). Verified live against the running dev stack: switched to the conference phase as admin, confirmed a consultant's session-update request now returns 403 while a profile-update request on the same account still succeeds, then switched back to selection and reset the test mutations. No browser available in this environment to visually confirm the read-only tab or the lighter duration-hint styling.

---

## Task — Admin-editable list of session time slots (start/end pairs) replacing the hardcoded ones ✅

**Done:**

The four "13h30/14h30/15h30/16h30" presentation slots and the single "17h45" reception slot a speaker picks from when defining their session were previously a compile-time constant (`SLOT_GROUPS`/`SlotId` in the frontend, `ConsultantSessionController::VALID_SLOTS` in the backend) — completely fixed, not editable anywhere. This introduces a new admin-manageable `slot_options` table (each row: a `kind` — `presentation` or `reception` — plus a `start_time`/`end_time` pair) that both drive the selectable slot list. The previously-hardcoded times were seeded as the starting list (same durations already used by `TestDataSeeder`), which the admin can now freely add to, edit, or delete.

**Data model:** each `presentation` slot option is offered to consultants twice — once "in person" (`in_person_{id}`) and once "via video" (`video_{id}`), mirroring the old duplicated in-person/video lists exactly — while each `reception` option is offered once (`reception_{id}`). This keeps the UI's three-group layout (in-person / video / reception) while making only the underlying times editable, rather than also exposing group management (not requested, and the two "delivery mode" groups aren't really independent lists — they always shared identical times).

**Backend:**

| Change | Details |
|---|---|
| `backend/database/migrations/2026_07_27_100000_create_slot_options_table.php` | New `slot_options` table (`kind`, `start_time`, `end_time`, both `H:i` strings); seeds the 5 previously-hardcoded slots as the starting list, in the migration itself (same pattern as `create_series_table`) |
| `backend/app/Models/SlotOption.php` | New — `KIND_PRESENTATION`/`KIND_RECEPTION` constants; `validSlotIds()` generates the full set of consultant-selectable IDs from the current rows (the `in_person_`/`video_`/`reception_` scheme above) |
| `backend/app/Http/Controllers/SlotOptionController.php` | New — public `GET /slot-options`, ordered by kind then start time |
| `backend/app/Http/Controllers/AdminSlotOptionController.php` | New — admin-only `store`/`update`/`destroy`, `kind` validated via `Rule::in`, `start_time`/`end_time` validated as `date_format:H:i` with `end_time` required `after:start_time` |
| `backend/app/Http/Controllers/ConsultantSessionController.php` | The hardcoded `VALID_SLOTS` const removed; `selected_slots.*` now validated against `SlotOption::validSlotIds()` |
| `backend/routes/api.php` | Public `slot-options`; admin `POST`/`PUT`/`DELETE slot-options[/{slotOption}]` |
| `backend/database/seeders/TestDataSeeder.php` | The hardcoded `SLOT_TIMES` const replaced with a `slotTimes()` helper that derives the same `{id → [start, end]}` map from the live `SlotOption` rows, so demo consultants' `selected_slots` stay consistent with whatever the admin-editable list currently contains |
| `backend/tests/Feature/AdminSlotOptionControllerTest.php` | New — public list is seeded with the 5 defaults, admin can create/update/delete, invalid `kind`/end-before-start are rejected, non-admins are forbidden, and `validSlotIds()` generates presentation IDs twice / reception IDs once |
| `backend/tests/Feature/ConsultantSessionControllerTest.php` | Updated to build its payload's `selected_slots` from a live `SlotOption` row instead of a hardcoded string |

**Frontend:**

| Change | Details |
|---|---|
| `frontend/src/api/slotOptions.ts` (new) | `SlotOption`/`SlotKind` types, `fetchSlotOptions()`, `createSlotOption()`, `updateSlotOption()`, `deleteSlotOption()` |
| `frontend/src/api/session.ts` | Hardcoded `SLOT_GROUPS`/literal `SlotId` union removed; new `buildSlotGroups(options)` builds the three UI groups from live `SlotOption[]` (times now shown as `13:30–14:20` ranges rather than a single start time); `SlotId` is now a plain `string` |
| `frontend/src/pages/ConsultantSessionPage.tsx`, `frontend/src/pages/admin/ConsultantDetailPage.tsx`, `frontend/src/pages/DashboardPage.tsx` | All three places that rendered the slot picker/viewer (the speaker's own session page, the admin's read-only view of a speaker's session, and the new speaker-dashboard "Mein Vortrag" tab) now fetch `slot-options` and call `buildSlotGroups()` instead of importing the removed constant |
| `frontend/src/pages/admin/UsersPage.tsx` | New `SlotOptionsManager`/`SlotOptionRow` section on "Einstellungen" (kind dropdown + two `time` inputs to add; inline pencil-icon edit, matching the existing `SeriesManager` pattern), placed after "Züge" |
| `frontend/src/pages/admin/UsersPage.module.css` | New `.slotAddForm` (multi-field add row, vs. the single-input `.addForm` used by Series/Tags) |
| `frontend/src/i18n/de.ts`, `fr.ts` | New `admin.slotOptions.*` block |

Verified with `php artisan test` (113/113 passing) and `tsc --noEmit`/`oxlint` (clean, no new warnings). Verified live against the running dev stack: ran the new migration, confirmed the 5 defaults come back from `GET /api/slot-options`, created a 6th option as admin, saved a consultant session using its dynamically-generated ID, confirmed an old hardcoded ID like `in_person_1330` is now correctly rejected with a 422, then removed the test option and restored the one pre-existing demo topic's data (title/description/slot) that the live test had overwritten. No browser available in this environment to visually confirm the new admin management table.

---

## Task — Editable phase start dates shown as durations on the phase switcher ✅

**Done:**

The three event phases (preparation, selection, conference) previously had no notion of *when* they start or end — only the currently-active phase was stored, switched manually by the admin. This adds two admin-editable timestamps (selection phase start, conference phase start — the prep phase is implicitly "from the beginning") that describe the intended phase boundaries, purely as informational duration labels on the existing manual phase switcher. Switching the active phase itself stays 100% manual, as explicitly requested — no automatic transition logic was added.

**Backend:**

| Change | Details |
|---|---|
| `backend/app/Http/Controllers/AdminPhaseDatesController.php` | New — `POST /admin/phase-dates`, validates `selection_phase_start`/`conference_phase_start` as `nullable\|date`, stores both via the existing `AppSetting::set()` key/value mechanism (same pattern as `AdminEventDetailsController`) |
| `backend/routes/api.php` | New admin-only route `admin/phase-dates` |
| `backend/app/Http/Controllers/AppConfigController.php` | Public `/config` response now includes `selection_phase_start`/`conference_phase_start` |
| `backend/tests/Feature/AdminPhaseDatesControllerTest.php` | New test file: defaults are `null`, admin can set both, both can be cleared back to `null`, an invalid date is rejected with 422, non-admins are forbidden and leave the settings untouched |

**Frontend:**

| Change | Details |
|---|---|
| `frontend/src/api/config.ts` | `AppConfig.selection_phase_start`/`conference_phase_start`, plus `setPhaseDates()` |
| `frontend/src/pages/admin/EventPage.tsx` | New `PhaseDatesForm` section (two `datetime-local` inputs), placed directly underneath the event title section, above the logo section — matches the requested placement. `PhaseSwitcher` gained a `formatPhaseDate()` helper (`d.M.yyyy H:mm`, e.g. `4.9.2026 9:00`) and a `durationLabel()` function appending `(until …)` / `(start - end)` / `(from …)` after each phase's name, computed from the two new config dates (falls back to nothing when a date isn't set) |
| `frontend/src/i18n/de.ts`, `fr.ts` | New `admin.phaseDates.*` block (labels/success/error) and `admin.phase.durationUntil`/`durationRange`/`durationFrom` |

Verified with `php artisan test` (104/104 passing) and `tsc --noEmit`/`oxlint` (clean, no new warnings). Verified live against the running dev stack: logged in as the seeded admin, `POST /api/admin/phase-dates` persisted both dates and `GET /api/config` reflected them immediately; reset both back to `null` afterward so the dev DB stays clean. No browser available in this environment to visually confirm the duration-label rendering.

---

## Task — Speaker dashboard: introductory text + "Mein Vortrag"/"Mein Profil" tabs replacing the old link cards ✅

**Done:**

The consultant (speaker) dashboard previously showed a bullet-point action list plus two plain link cards ("Mein Profil bearbeiten" / "Meinen Vortrag bearbeiten") that navigated to separate `/profile` and `/session` pages. This replaces that with an introductory paragraph explaining the forum's workflow, followed by an inline tabbed view — mirroring the tab mechanism already used on the admin's per-speaker detail page (`ConsultantDetailPage.tsx`) — with "Mein Vortrag" on the left and "Mein Profil" on the right, showing the actual editable forms inline rather than linking away. This only applies during the preparation/selection phases (unchanged during the conference phase, which still shows the read-only conference action list — tabs don't make sense there since editing is locked).

| Change | Details |
|---|---|
| `frontend/src/pages/ConsultantSessionPage.tsx` | `SessionForm` exported (previously module-private) so it can be reused |
| `frontend/src/pages/ConsultantProfilePage.tsx` | `ProfileForm` exported (previously module-private) so it can be reused |
| `frontend/src/pages/DashboardPage.tsx` | `ConsultantDashboard`'s prep/selection branch now renders an intro paragraph (`dashboard.consultantIntro`) plus a new `ConsultantTabs` component: a tab bar (`session.title`/`profile.title` — reusing already-existing keys, "Mein Vortrag"/"Mein Profil") switching between `SessionTabContent`/`ProfileTabContent`, which `use()` freshly-fetched session/profile/series promises and render the imported `SessionForm`/`ProfileForm` directly, inline |
| `frontend/src/pages/DashboardPage.module.css` | New `.cardWide` (720px, `composes: card`, used only for the consultant's now-heavier tabbed content instead of the default 480px card) and `.tabs`/`.tab`/`.tabActive` (copied from the same pattern in `ConsultantDetailPage.module.css`) |
| `frontend/src/i18n/de.ts`, `fr.ts` | New `dashboard.consultantIntro`; removed the now-unused `dashboard.consultantActions`, `profile.editProfile`, `session.editSession` (nothing else referenced them after the link cards were removed) |

The standalone `/profile` and `/session` routes/pages were intentionally left in place (still directly reachable by URL) — only the dashboard's own entry point changed, per the request.

Verified with `tsc --noEmit`/`oxlint` (clean, no new warnings) and the full backend suite (104/104, unaffected by this frontend-only change). Verified live: fetched all changed files through the Vite dev server without error, logged in as a real seeded consultant and confirmed `GET /api/consultant/session` and `GET /api/consultant/profile` (the two endpoints the new tabs depend on) both return real data. No browser available in this environment to visually confirm the tab-switching interaction itself.

---

## Task — Self-service "forgot password" for speakers ✅

**Done:**

Speakers who log in with email/password (rather than LDAP) had no way to recover a forgotten password — only the admin-initiated invitation flow generated a `Password::createToken()` link. This reuses that exact same mechanism from the speaker's side.

**Backend:**

| Change | Details |
|---|---|
| `backend/app/Http/Controllers/Auth/ForgotPasswordController.php` | New `sendResetLink()`: looks up a **consultant** (speaker) by email; if found, generates a token via the standard `Password::createToken()` broker (same one `AdminInviteController` already uses) and emails a `/set-password?token=...&email=...` link. Always returns a generic success response — whether or not the email exists — following the same anti-enumeration pattern already used by `ResendVerificationController` |
| `backend/app/Mail/SpeakerPasswordReset.php` + `backend/resources/views/emails/password-reset.blade.php` | New Mailable/view, styled like the existing `SpeakerInvitation` mail |
| `backend/routes/api.php` | `POST /auth/consultant/forgot-password` (public, no auth) |
| `backend/config/auth.php` | Clarified the existing `expire` comment — the 7-day window is now explicitly shared by both the invitation and forgot-password flows (a separate short-lived broker was considered but rejected: the token is *consumed* via the existing `AcceptInvitationController`/`Password::reset()`, which always uses the default `users` broker regardless of which broker minted the token, so a second broker's shorter `expire` would silently not be enforced) |
| `backend/tests/Feature/ForgotPasswordControllerTest.php` | New test file: sends mail for an existing speaker, stays silent (no mail, still 200) for an unknown email or a non-speaker (student) account, validates the email format, and an end-to-end test confirming the emailed link's token actually works against the existing `/auth/invitation/accept` endpoint to set a new password |

**Frontend:**

| Change | Details |
|---|---|
| `frontend/src/api/auth.ts` | `forgotPassword(email)` → `POST /auth/consultant/forgot-password` |
| `frontend/src/pages/ForgotPasswordPage.tsx` (new) + reuses `SetPasswordPage.module.css` | Simple email-entry form; shows a generic "check your email" success message; "back to login" link |
| `frontend/src/pages/SetPasswordPage.module.css` | New `.backLink` class (shared styling for the new back-to-login link) |
| `frontend/src/App.tsx` | New route `/forgot-password` |
| `frontend/src/pages/LoginPage.tsx` | New "Passwort vergessen?"/"Mot de passe oublié ?" link, shown only on the consultant tab and only when NOT using LDAP (`!useLdap`) — matches the fact that LDAP-managed passwords aren't something this app can reset |
| `frontend/src/i18n/de.ts`, `fr.ts` | New `login.forgotPassword` link label and a full `forgotPassword.*` block (title/subtitle/success/submit/submitting/errorGeneric/backToLogin) |

Verified with `php artisan test` (99/99 passing) and `tsc --noEmit`/`oxlint` (clean, no new warnings).

---

## Task — Reordered "Einstellungen" sections: "Züge" moved to last, under "Abschlussjahr" ✅

**Done:**

| Change | Details |
|---|---|
| `frontend/src/pages/admin/UsersPage.tsx` | `UsersPageContent` section order changed from Züge → Tags → Abschlussjahr to Tags → Abschlussjahr → Züge |

Purely a render-order change (no new state/props); verified with `tsc --noEmit` (clean).

---

## Task — Speaker preferred language: invite-time selection, per-language invitation templates, CSV column, and display/edit everywhere ✅

**Done:**

Three related TODOs, implemented together as one coherent feature since they share the same DB column and UI surface:
1. Per-language invitation text templates + a CSV "language" column for bulk invite.
2. A "preferred language" selector on the single-speaker invitation form, saved to the DB.
3. That language shown in the admin speakers list and editable on the speaker's own profile page.

**Backend:**

| Change | Details |
|---|---|
| `backend/database/migrations/2026_07_27_090000_add_language_to_consultant_profiles.php` | New `language` column on `consultant_profiles`, `string(5)`, default `'de'` |
| `backend/app/Models/ConsultantProfile.php` | `language` added to `$fillable` |
| `backend/app/Http/Controllers/AdminInviteController.php` | New `LANGUAGES = ['de', 'fr']` const. `invite()` now validates `language` (`Rule::in`) plus **two** invitation-body fields, `invitation_body_de`/`invitation_body_fr`, and sends whichever one matches the selected language. `bulkInvite()` takes the same two template fields; `parseCsv()` reads a 5th CSV column (`language`), lower-cased and defaulted to `'de'` when missing, blank, or not `de`/`fr` — each row picks its own template accordingly. `createAndInviteSpeaker()` now takes/stores `language` on the new `ConsultantProfile` row. |
| `backend/app/Http/Controllers/ConsultantProfileController.php` | `language` added to the speaker's self-service profile validation (`Rule::in(AdminInviteController::LANGUAGES)`), nullable so it doesn't break the existing "partial update" semantics |
| `backend/tests/Feature/AdminInviteControllerTest.php` | Rewritten around the new payload shape: template selection by language (DE default, FR when chosen), CSV column parsing incl. missing/blank → `de` default, per-row template selection, existing salutation/duplicate-email/skip tests updated to the new CSV/body fields |
| `backend/tests/Feature/ConsultantProfileControllerTest.php` | Two new tests: speaker can set `language` to `fr`, invalid language (`en`) fails validation |

**Frontend:**

| Change | Details |
|---|---|
| `frontend/src/api/invite.ts` | `LANGUAGE_OPTIONS`, `InvitePayload.language`, `invitation_body_de`/`invitation_body_fr` (replacing the single `invitation_body`); `bulkInviteSpeakers()` now takes both template strings |
| `frontend/src/pages/admin/InviteSpeakerPage.tsx` | New language `<select>` (DE/FR) next to email; the single "invitation message" textarea replaced by two — DE and FR |
| `frontend/src/pages/admin/BulkInviteSpeakersPage.tsx` | Same DE/FR textarea split; CSV hint text updated to document the new `language` column and its default |
| `frontend/src/api/admin.ts`, `frontend/src/api/auth.ts`, `frontend/src/api/profile.ts` | `language: string \| null` added to `AdminConsultantProfile`, `User.consultant_profile`, and `ConsultantProfileData` |
| `frontend/src/pages/admin/ConsultantsListPage.tsx` | New sortable "Sprache"/"Langue" column |
| `frontend/src/pages/admin/ConsultantDetailPage.tsx` | New read-only language row in the admin's per-speaker profile tab |
| `frontend/src/pages/ConsultantProfilePage.tsx` | New DE/FR `<select>` in the speaker's own editable profile (personal-info section) |
| `frontend/src/i18n/de.ts`, `fr.ts` | New keys: `admin.invite.fieldLanguage`/`fieldBodyDe`/`fieldBodyFr`, `admin.columns.language`, `profile.fieldLanguage`; `admin.bulkInvite.csvHint` updated to mention the new column |

Verified with `php artisan test` (94/94 passing) and `tsc --noEmit`/`oxlint` (clean, no new warnings). The surrounding English mail chrome (`speaker-invitation.blade.php`) was left as-is — only the admin-supplied body text is language-aware, matching the existing invitation-text mechanism.

---

## Task — "Anmeldung"/"Connexion" subtitle under the login page title ✅

**Done:**

| Change | Details |
|---|---|
| `frontend/src/pages/LoginPage.tsx` | New `<p className={styles.subtitle}>{t('login.subtitle')}</p>` directly under the `<h1>` title |
| `frontend/src/pages/LoginPage.module.css` | New `.subtitle` class (muted, centered); `.title`'s bottom margin tightened since the subtitle now carries the spacing before the tabs |
| `frontend/src/i18n/de.ts` / `fr.ts` | `login.subtitle`: `'Anmeldung'` (DE) / `'Connexion'` (FR) |

Frontend-only change; verified with `tsc --noEmit` (clean).

---

## Task — Moved tags administration from "Veranstaltung" to "Einstellungen" ✅

**Done:**

The tags manager (add/delete tags) lived on the "Veranstaltung" (event) admin page alongside event title/logo/details/phase. It's purely a taxonomy used to categorize speaker topics, so it fits better next to "Züge" (series) on the "Einstellungen" (settings) page — no backend changes were needed, this was a frontend-only relocation.

| Change | Details |
|---|---|
| `frontend/src/pages/admin/EventPage.tsx` | Removed the `TagsManager` component, its `tagsPromise` state/prop plumbing, the `admin.tagsOverview` section, and the now-unused `fetchAdminTags`/`createTag`/`deleteTag`/`Tag` imports |
| `frontend/src/pages/admin/UsersPage.tsx` | `TagsManager` moved here verbatim (uses the same `.addForm`/`.error`/`.nameCol`/`.deleteBtn` classes already present in `UsersPage.module.css`, identical to the ones it used in `EventPage.module.css`); rendered between the existing "Züge" (series) section and the graduation-year-range form, both driven by a new `tagsPromise` fetched via `fetchAdminTags()` |

Verified with `tsc --noEmit` (clean) and `oxlint` (no new warnings introduced).

---

## Task — Admin-uploadable event logo, shown on login page and top bar ✅

**Done:**

Event settings were already stored as generic key/value rows via `AppSetting` (event title, datetime, location, etc.), so the logo follows the same pattern rather than introducing a new model.

| Change | Details |
|---|---|
| `backend/app/Http/Controllers/AdminEventLogoController.php` | New controller: `update()` validates `logo` as `image\|max:2048`, stores it via `Storage::disk('public')` under `event-logo/`, and persists the path as the `event_logo_path` app setting; `destroy()` clears it |
| `backend/routes/api.php` | `POST /admin/event-logo` and `DELETE /admin/event-logo`, both admin-only (`auth:sanctum` + `RequireAdmin`) |
| `backend/app/Http/Controllers/AppConfigController.php` | Public `/config` response now includes `event_logo_url` (`/storage/{path}` or `null`) |
| `backend/tests/Feature/AdminEventLogoControllerTest.php` | New test file: default is `null`, admin can upload (file actually lands on the fake public disk) and remove, non-image uploads get a 422, non-admins are forbidden and leave the setting untouched |
| `frontend/src/api/config.ts` | `AppConfig.event_logo_url`, plus `setEventLogo(file)` (multipart) and `removeEventLogo()` |
| `frontend/src/contexts/EventTitleContext.tsx` | Extended with `eventLogoUrl`/`setEventLogoUrl` (fetched alongside the title on mount) so the logo updates live everywhere without a reload, same as the title already did |
| `frontend/src/components/AppTitle.tsx` | Renders the logo (if set) inline before the title text — this is the single shared header component used on every authenticated page, so the logo now shows up in every top bar automatically |
| `frontend/src/pages/LoginPage.tsx` / `LoginPage.module.css` | Shows the logo above the login card's title when one is configured (this page doesn't use `AppTitle` — it has its own static heading) |
| `frontend/src/pages/admin/EventPage.tsx` / `EventPage.module.css` | New `EventLogoForm` section (file picker + preview + upload/remove), placed next to the existing event-title form |
| `frontend/src/i18n/de.ts`, `fr.ts` | New `admin.eventLogoOverview` and `admin.eventLogo.*` strings |

Verified with `php artisan test` (88/88 passing) and `tsc --noEmit` (clean); no browser available in this environment to visually confirm rendering.

---

## Task — Admin speakers overview: profile picture column + "Status" column rename ✅

**Done:**

Two small admin-list tweaks to `frontend/src/pages/admin/ConsultantsListPage.tsx`:

| Change | Details |
|---|---|
| Profile picture column | New leading column, header-less (`<th>` with no label), showing the speaker's `consultant_profile.profile_picture_url` as a small circular avatar, or a 👤 placeholder if none is set. The backend already returned `profile_picture_url` via `ConsultantProfile`'s `$appends` — only the frontend `User` type (`frontend/src/api/auth.ts`) was missing the field, so it was added there. |
| "Aktiviert"/"Activé" column renamed to "Status" | The column header now reads `admin.columns.status` ("Status"/"Statut") instead of `admin.columns.activated` ("Aktiviert"/"Activé"). The cell content (Aktiviert/Ausstehend badge, driven by `email_verified_at`) is unchanged — only the header label changed. `admin.columns.activated` was removed from `de.ts`/`fr.ts` since nothing else referenced it; `activatedYes`/`activatedNo` (used for the badge text) were kept. |
| `frontend/src/pages/admin/AdminListPage.module.css` | New `.avatarCell`, `.avatar`, `.avatarPlaceholder` classes (table-sized circular avatar, mirroring the larger ones already used on `ConsultantDetailPage`) |

No backend changes were needed — purely additive on data already being sent by the API.

---

## Task — Limited topic description to 200 characters ✅

**Done:**

The speaker's topic/session `description` had no length limit anywhere — a `TEXT` column in Postgres and a plain `<textarea>` with no `maxLength` on the frontend.

| Change | Details |
|---|---|
| `backend/database/migrations/2026_07_26_140000_limit_topic_description_length.php` | New migration: `description` column changed from `text` to `string(200)` (nullable) |
| `backend/app/Http/Controllers/ConsultantSessionController.php` | Validation rule for `description` changed from `['nullable', 'string']` to `['nullable', 'string', 'max:200']` |
| `frontend/src/pages/ConsultantSessionPage.tsx` | Textarea gained `maxLength={200}` plus a `{description.length}/200` counter below it |
| `backend/tests/Feature/ConsultantSessionControllerTest.php` | New test file: asserts a 200-char description saves successfully and a 201-char description fails validation with a 422 |

Existing seeded topic descriptions are all well under 200 characters, so the column-type migration applies cleanly to existing data.

---

## Task — Language switcher now shows flag symbols instead of DE/FR text ✅

**Done:**

The shared `LanguageSwitcher` (used on login, register, set-password, email-verified, and dashboard pages) rendered its two buttons as plain "DE"/"FR" text. They're now flag emoji (🇩🇪/🇫🇷) instead. Accessibility is preserved — each button keeps its existing `aria-label` (the language name, e.g. "Deutsch"/"Français") and gained a matching `title` tooltip, with the flag glyph itself marked `aria-hidden` so screen readers announce the label, not the emoji.

| File | Purpose |
|---|---|
| `src/components/LanguageSwitcher.tsx` | New `FLAGS` map (`de: '🇩🇪'`, `fr: '🇫🇷'`); button content replaced with the flag inside an `aria-hidden` span; `title` attribute added |
| `src/components/LanguageSwitcher.module.css` | Rebuilt the button styling around emoji rather than text: larger `font-size` (flags render poorly small), inactive buttons dimmed via `opacity` instead of gray text, active button now a light-blue tinted background/border instead of a solid blue fill (a filled blue chip behind a flag emoji looked heavy-handed) |

Single shared component, so the change applies everywhere it's rendered. Verified via `tsc --noEmit` (clean) and fetching the component through the Vite dev server; no browser available in this environment to visually confirm rendering.

---

## Task — Reworded the speaker login page's invitation prompt ✅

**Done:**

The consultant tab's footer read "Registrierung nur auf Einladung. Einladung anfragen" ("Registration by invitation only. Request an invitation") — two adjacent, slightly redundant sentences. Reworded to a question + link: "Noch keine Zugangsdaten? Einladung anfragen" ("No login credentials yet? Request an invitation").

| File | Purpose |
|---|---|
| `src/i18n/de.ts` | `login.invitationOnly`: `'Registrierung nur auf Einladung.'` → `'Noch keine Zugangsdaten?'` |
| `src/i18n/fr.ts` | `login.invitationOnly`: `'Inscription sur invitation uniquement.'` → `"Pas encore d'identifiants ?"` |

`login.requestInvitation` (the mailto link text itself, "Einladung anfragen"/"Demander une invitation") was already correct and unchanged.

Verified: `tsc --noEmit` clean; both changed files fetch through the Vite dev server without error.

---

## Task — Confirmed: no email registration option for students on the login page ✅

**Done:** Already fully satisfied by the "students always log in via LDAP" task — the student tab's "Register" link and email-mode toggle were removed there, and `RegisterController` no longer accepts `role: student`. No further change needed; verified the current `LoginPage.tsx` shows only a username field and an informational message for the student tab, never an email/registration option.

---

## Task — Admin login moved off the front page to its own URL ✅

**Done:**

Admin previously logged in through the shared "Consultant" tab on `/login` (there was no dedicated admin auth path — `ConsultantLoginController` special-cased admin emails to bypass LDAP). Admin now has a fully separate login: its own backend controller/endpoints and its own frontend page at `/admin/login`, not linked from anywhere on the main `/login` page. The consultant and student login endpoints now reject admin credentials outright rather than special-casing them.

**Backend:**

| File | Purpose |
|---|---|
| `app/Http/Controllers/Auth/AdminLoginController.php` | New — `login()` (email+password, `Auth::attempt` + `isAdmin()` check), `logout()`, `me()`; structurally mirrors the existing per-role login controllers but is admin-only and never touches LDAP |
| `routes/api.php` | New `auth/admin/{login,logout,me}` route group, same shape as the consultant/student ones |
| `app/Http/Controllers/Auth/ConsultantLoginController.php` | Removed the `isAdminEmail()` bypass in `login()` (no longer needed — admin has its own endpoint now); `loginViaPassword()`'s role check tightened from `! isConsultant() && ! isAdmin()` to `! isConsultant()`, so an admin's credentials are now rejected here even though they'd pass `Auth::attempt` |
| `app/Http/Controllers/Auth/StudentLoginController.php` | Removed the same now-unnecessary `isAdminEmail()` bypass; since `login()` already unconditionally called `loginViaLdap()` (previous task), removing the bypass left `loginViaPassword()` completely unreachable — deleted it entirely, along with the now-unused `Auth` import |
| `tests/Feature/AdminLoginControllerTest.php` | New — admin login success/wrong-password, a consultant/student's real credentials rejected via this endpoint, and `me()`/`logout()` work (using `Sanctum::actingAs()` rather than the generic `actingAs()`, since only the former attaches a real token object that `currentAccessToken()` can resolve) |
| `tests/Feature/LdapLoginControllerTest.php` | The two admin-bypass tests rewritten: `test_admin_cannot_log_in_via_the_consultant_endpoint` and `test_admin_email_login_via_student_endpoint_fails_without_attempting_ldap` now assert admin credentials are *rejected* by the consultant/student endpoints (previously asserted the opposite) |

**Frontend:**

| File | Purpose |
|---|---|
| `src/pages/AdminLoginPage.tsx` | New — plain email+password form, no tabs/LDAP toggle, posts to the new `loginAdmin()` API call |
| `src/App.tsx` | `/admin/login` route added (public, not wrapped in `RequireAuth`/`RequireAdmin` — it's the login page itself), not linked from anywhere else in the UI |
| `src/api/auth.ts` | New `loginAdmin(email, password)`; `logout()`/`getMe()` now route `'admin'` to the new `/auth/admin/*` endpoints instead of falling through to the consultant ones |
| `src/contexts/AuthContext.tsx` | `initUserPromise()`/`logout()` now pass the actual role straight through to `getMe()`/`apiLogout()` instead of collapsing anything non-student to `'consultant'` |
| `src/pages/LoginPage.tsx` | Updated the `forcePasswordLogin` comment — it no longer has anything to do with admin, since admin login lives at a separate URL entirely |

Verified live: `POST /api/auth/admin/login` with the seeded admin's credentials succeeds; the same credentials against `POST /api/auth/consultant/login` now return 422; the new `/admin/login` page fetches cleanly through the Vite dev server. Full backend suite (81 tests, up from 76) passes; `tsc --noEmit` clean.

---

## Task — Students admin overview: split name into last/first name columns, dropped the email column, CSV import gained an (ignored) password column ✅

**Done:**

Three related requests bundled together since they all touch the same "students have no real profile record" gap: the admin's Students overview showed a single combined "Name" column and an "Email" column that's rarely meaningful for LDAP-only students; splitting name into separate columns required actually storing first/last name separately, since `users.name` was always just a single concatenated string.

**Backend:**

| File | Purpose |
|---|---|
| `database/migrations/2026_07_26_130000_add_first_last_name_to_users_table.php` | Adds nullable `first_name`/`last_name` to `users` (kept alongside the existing combined `name`, which other parts of the app — dashboard greetings, etc. — still read unchanged) |
| `app/Models/User.php` | `first_name`/`last_name` added to `#[Fillable(...)]` |
| `app/Http/Controllers/Auth/StudentLoginController.php` | `loginViaLdap()` now also populates `first_name`/`last_name` from the LDAP directory's `givenName`/`sn` attributes (read via the same lowercase raw-attribute keys as `cn`/`mail`) on both creation and every subsequent login |
| `app/Http/Controllers/AdminStudentImportController.php` | CSV rows now populate `first_name`/`last_name` directly from their own columns (previously only the concatenated `name` was stored); CSV format extended with a 5th column, `password` — parsed but intentionally discarded, since students always authenticate via LDAP and a local password is never checked; kept 4-column CSVs (from before this column existed) working unchanged |
| `tests/Feature/AdminStudentImportControllerTest.php` | Existing happy-path test now also asserts `first_name`/`last_name`; new test confirms a 5-column CSV with a password value imports fine and the password is never persisted (`user->password` stays `null`) |

**Frontend:**

| File | Purpose |
|---|---|
| `src/pages/admin/StudentsListPage.tsx` | "Name" + "Email" columns replaced with sortable "Last name"/"First name" columns (both showing "—" when unset, e.g. for rows imported/logged-in before this change) |
| `src/api/auth.ts` | `User` type gains `first_name`/`last_name` |
| `src/i18n/{de,fr}.ts` | `admin.columns.lastName`/`firstName` added; `studentImport.csvHint` updated to mention the new `password` column and that it's ignored |
| `docker/ldap/students-import-sample.csv` | Header/rows updated to the 5-column format (empty `password` values, since it's unused) |

Verified live: reset and re-logged-in as the real dev-LDAP `student1`, confirming `first_name`/`last_name` come back populated from the directory (`"first_name":"Anna","last_name":"Weber"`); imported a CSV with a `password` column and confirmed the resulting user's `password` stays `null`. Full backend suite (76 tests) passes, `tsc --noEmit` clean.

---

## Task — Students always log in via LDAP username/password, no email fallback ✅

**Done:**

Students previously had two login mechanisms: LDAP username/password (when the `ldap_students` flag was on) or email/password with a confirmed email (when it was off). That fallback is gone — students now always authenticate via LDAP username/password, unconditionally. The `ldap_students` toggle itself is removed since nothing reads it anymore (consultants keep their separate, still-toggleable `ldap_consultants` flag, untouched by this change). Student self-registration (which created password-based accounts) no longer makes sense either, since students can't use a password to log in — the shared `/auth/register` endpoint is now consultant-only.

**Backend:**

| File | Purpose |
|---|---|
| `app/Http/Controllers/Auth/StudentLoginController.php` | `login()` no longer branches on `AppSetting::getBool('ldap_students')` — always calls `loginViaLdap()` (except the existing admin-email carve-out, unchanged); `AppSetting` import removed (no longer used) |
| `app/Http/Controllers/AppConfigController.php` | `ldap_students` removed from the `GET /api/config` response |
| `app/Http/Controllers/Auth/RegisterController.php` | `role` validation narrowed from `Rule::in([ROLE_STUDENT, ROLE_CONSULTANT])` to `Rule::in([ROLE_CONSULTANT])` |
| `database/migrations/2026_07_26_120000_remove_ldap_students_setting.php` | New — deletes the `ldap_students` row from `app_settings` (the historical seeding migration `2026_06_30_120000_add_ldap_settings.php` is left untouched) |
| `routes/api.php` | Comment above the student auth route group updated to reflect the unconditional LDAP behavior |
| `tests/Feature/LdapLoginControllerTest.php` | Removed now-meaningless `AppSetting::set('ldap_students', 'true')` calls (LDAP is unconditional, nothing to toggle); renamed/reworded the two tests whose premise was "a flag mandates LDAP" to reflect "LDAP is always required" instead |
| `tests/Feature/LoginRecordsLastLoginTest.php` | Student cases rewritten from email/password to LDAP (via `DirectoryFake`/`LdapFake`, same pattern as `LdapLoginControllerTest`) — `test_student_ldap_login_records_last_login_at`, `test_failed_student_ldap_login_does_not_record_last_login_at`; added a matching failed-password case for consultants (`test_failed_consultant_password_login_does_not_record_last_login_at`), which wasn't covered before either |
| `tests/Feature/AdminStudentImportControllerTest.php` | Dropped the now-unnecessary `AppSetting::set('ldap_students', 'true')` call and its unused import |

**Frontend:**

| File | Purpose |
|---|---|
| `src/pages/LoginPage.tsx` | Student tab's `useLdap` is now hardcoded `true` (no longer derived from `config.ldap_students`); the "use email instead" toggle link now only ever renders for the consultant tab (there's nothing to toggle to on the student side anymore); student tab's "Register" link replaced with an informational message (`login.studentAccountInfo`) since students no longer self-register |
| `src/api/config.ts` | `ldap_students` removed from `AppConfig` |
| `src/api/auth.ts` | `loginStudent()` no longer takes a `useLdap` parameter — always posts `{ username, password }`; `register()`'s `role` parameter narrowed to the literal `'consultant'` |
| `src/pages/RegisterPage.tsx` | Removed the student/consultant role tab switcher (dead code once student registration was removed) — the form is consultant-only now, `role` is passed as the literal `'consultant'` |
| `src/i18n/{de,fr}.ts` | `login.noAccount`/`login.register` removed (unused); `login.studentAccountInfo` added |

Verified live against the running dev stack: `POST /api/auth/student/login` with `{username, password}` for a real dev-LDAP student (`student1`/`student123`) still succeeds with no flag set anywhere; the same endpoint with `{email, password}` now returns 422 unconditionally; `POST /api/auth/register` with `role: student` returns 422; the admin's `POST /api/auth/consultant/login` with `{email, password}` is unaffected. Full backend suite (75 tests) passes; `tsc --noEmit` clean.

---

## Task — Sample CSV of the 5 dev-LDAP students, ready for the student import feature ✅

**Done:**

A ready-to-use CSV matching the student-import feature's expected format (`lastname,firstname,class,username`), containing the 5 students already seeded in the dev LDAP server (`docker/ldap/bootstrap/02-students.ldif`) — same names and `uid`s, so importing it links each row up with that student's real LDAP account on their first login. LDAP itself has no notion of a school class, so class values (`8a`/`8b`/`9a`/`9b`/`10a`) were invented for the sample.

| File | Purpose |
|---|---|
| `docker/ldap/students-import-sample.csv` | New — 5 rows: `Weber,Anna,8a,student1` / `Frei,Lukas,8b,student2` / `Fischer,Elena,9a,student3` / `Keller,Noah,9b,student4` / `Baumann,Mia,10a,student5` |

Verified live: uploaded the file to `POST /api/admin/students/import` as the seeded admin — all 5 rows imported (`imported_count: 5`, none skipped), and `GET /api/admin/students` confirmed the correct name/`ldap_username`/`class` for each. Removed the resulting test rows afterward so the dev DB stays clean — the CSV file itself is the deliverable, meant to be uploaded through the Students → "Import Students" page whenever needed.

---

## Task — Removed the "choose your favorite topics" subtitle from the consultant dashboard ✅

**Done:**

During the preparation/selection phase, `ConsultantDashboard` reused the same `dashboard.phaseSelection` subtitle ("Auswahlphase — wähle deine Lieblingsthemen" / "choose your favorite topics") shown on the student dashboard — which doesn't make sense for a consultant, since topic selection is a student action. Removed that subtitle line from the consultant view (their card now goes straight from the greeting to their action list).

The admin dashboard was checked too, since the request called out both roles — it already has its own dedicated subtitle (`dashboard.adminSubtitle`, "Verwaltungspanel") and never showed the selection-phase text, so nothing needed to change there.

**Frontend:**

| File | Purpose |
|---|---|
| `src/pages/DashboardPage.tsx` | `ConsultantDashboard`'s preparation/selection-phase branch no longer renders the `dashboard.phaseSelection` subtitle |

Verified: `tsc --noEmit` clean, file fetched through the Vite dev server without error.

---

## Task — "Benutzer" admin area renamed to "Einstellungen" ✅

**Done:**

Now that the student CSV import has moved off this page (previous task), it only contains Series and the graduation-year range — genuine app settings, not user management — so "Benutzer" ("Users") was a misleading label for what's left. Renamed to "Einstellungen" ("Settings") / "Paramètres" in French. The route (`/admin/users`) and page component (`UsersPage.tsx`) were left as-is — internal identifiers, not user-visible — only the displayed label changed.

**Frontend:**

| File | Purpose |
|---|---|
| `src/i18n/de.ts`, `src/i18n/fr.ts` | `admin.usersOverview` renamed to `admin.settingsOverview`; value changed from `'Benutzer'`/`'Utilisateurs'` to `'Einstellungen'`/`'Paramètres'` |
| `src/pages/DashboardPage.tsx` | Nav card now reads `t('admin.settingsOverview')` |
| `src/pages/admin/UsersPage.tsx` | Page `<h1>` now reads `t('admin.settingsOverview')` |

Verified: `tsc --noEmit` clean, both changed files fetched through the Vite dev server without error, full backend suite (74 tests, unaffected) still passes.

---

## Task — Student CSV import moved from "Benutzer" to the Students admin area ✅

**Done:**

The CSV student-import form (added in an earlier task, embedded inline on the "Benutzer" page) now lives on its own page, `/admin/students/import`, reached via an "Import Students" button on the Students list — mirroring the existing "Bulk-invite Speakers" pattern already used for the equivalent consultant-side CSV import (a button on the list page, opening a dedicated import page with a back-link to the list). The "Benutzer" page no longer has anything student-related on it.

**Frontend:**

| File | Purpose |
|---|---|
| `src/pages/admin/StudentImportPage.tsx` | New page — the CSV form + result/skipped-rows display, moved here wholesale from `UsersPage.tsx`'s `StudentImportForm`; page chrome (header, `<h1>`, back link to `/admin/students`) matches `BulkInviteSpeakersPage` |
| `src/pages/admin/StudentImportPage.module.css` | New — `.hint`/`.resultBox`/`.skippedTitle`/`.skippedList`, carried over from `UsersPage.module.css`'s copy (each page keeps its own, same approach used throughout this codebase) |
| `src/pages/admin/UsersPage.tsx` | `StudentImportForm` and its section (divider + label) removed; now only has Series and the graduation-year range |
| `src/pages/admin/UsersPage.module.css` | `.hint`/`.resultBox`/`.skippedTitle`/`.skippedList` removed (no longer used on this page) |
| `src/pages/admin/StudentsListPage.tsx` | Title row restructured to match `ConsultantsListPage`'s pattern — an "Import Students" button (`admin.studentImport.title`, reused from the button/page-title pair, same as `admin.bulkInviteSpeakers`) links to `/admin/students/import` |
| `src/App.tsx` | `/admin/students/import` route added, wrapped in `RequireAdmin` |
| `src/i18n/{de,fr}.ts` | `admin.backToStudents` added (the back-link on the new page couldn't reuse `admin.consultantDetail.backToList`, which is hardcoded to "Referenten"/"Intervenants") |

No backend change — reuses the existing `POST /api/admin/students/import` endpoint unchanged.

Verified: fetched all three changed/new `.tsx` files directly through the Vite dev server to confirm they transform without error; `tsc --noEmit` clean; full backend suite (74 tests, unaffected by this frontend-only move) still passes.

---

## Task — Remaining "Berufsorientierung"/"Job Orientation" leftovers replaced ✅

**Done:**

The previous app-rename task only touched the admin-configurable event title (the DB-backed setting and its i18n fallbacks). A few other places still carried the old name — none of them user-visible in the main UI, but all real: the speaker-invitation email's subject line, the `APP_NAME` env var (used for the mail "From" name), and the dev LDAP server's organisation label.

**Backend:**

| File | Purpose |
|---|---|
| `app/Mail/SpeakerInvitation.php` | Subject line no longer hardcodes "Job Orientation" — now interpolates `config('app.name')`, so it can never drift out of sync with `APP_NAME` again |
| `.env`, `.env.example` | `APP_NAME` changed from `JobOrientation` / `Laravel` (the latter was never updated from the Laravel skeleton default) to `"Forum der Berufe"` |

**Infra:**

| File | Purpose |
|---|---|
| `docker-compose.yml` | Dev LDAP service's `LDAP_ORGANISATION` changed from `"Job Orientation Dev"` to `"Forum der Berufe Dev"` |

Swept the whole repo for `Berufsorientierung`/`Orientation Professionnelle`/`Job Orientation` afterward — the only remaining hits are the historical event-title migrations (left untouched, per migration convention: they record what was true at the time) and the unrelated `joborientation` technical project/DB/Docker-image slug, which isn't the display brand name and is out of scope for this rename.

Verified: full backend suite (74 tests) still passes; `config('app.name')` resolves to `"Forum der Berufe"` live in the dev container after a `config:clear` + restart.

---

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
