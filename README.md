# Welcome to my project BloodLink

**Author:** Hasna Elbahraoui

BloodLink is a full-stack blood donation coordination platform for Morocco. It connects **verified hospitals** with **registered donors** when a hospital publishes an urgent or planned blood need, ranks compatible donors by blood type and geography, and supports invitation → acceptance → hospital contact → scheduling → completion through a secure JWT-backed API and a multilingual Angular client.

> **Setup:** see [REQUIREMENTS.md](./REQUIREMENTS.md) for exact versions, environment variables, database steps, and startup commands.

---

## 1. Problem BloodLink solves

Hospitals often need compatible donors quickly, while donors want a trustworthy channel to respond without exposing personal data publicly. BloodLink provides:

- Role-separated portals (donor, hospital, admin).
- Server-side **ABO/Rh compatibility** and **eligibility** checks before invitations.
- Geographic layering (city → region → national search expansion on requests).
- In-app **notifications** and **per-request messaging** after a match relationship exists.
- Audit trail and admin oversight for hospitals, users, requests, matches, and donations.

---

## 2. Main features

| Area | Features |
|------|----------|
| **Public site** | Landing (hero, network flow, emergency story, impact, how-it works), live public feed of anonymized active requests, multilingual UI (Darija / French / English). |
| **Hospital** | Registration & verification workflow, dashboard, create/edit blood requests, matching board, donor profiles, messaging, notifications, settings, logo upload. |
| **Donor** | Registration, profile & eligibility questionnaire, availability toggle, invitations, history, messaging, notifications, institution view. |
| **Admin** | Overview KPIs, hospital verification (approve/reject/suspend), users, donors, requests, matches, donations, audit log. |
| **Security** | Stateless JWT (OAuth2 resource server), role-based route and API protection, password reset tokens (hashed server-side). |

---

## 3. User roles

### Donor (`DONOR` → `ROLE_DONOR`)

- Registers via `/api/v1/auth/register/donor`.
- Maintains profile (blood type, city/region, health flags, consent for distance).
- Receives **invitations** for open requests they can donate to.
- Accepts/declines matches; chats with hospital once match is in an active relationship state.
- Cannot access hospital or admin APIs.

### Hospital (`HOSPITAL` → `ROLE_HOSPITAL`)

- Registers via `/api/v1/auth/register/hospital` (starts as pending verification).
- Creates **blood requests** (blood type, units, urgency, needed-by date, geographic expansion).
- Reviews **matches**, contacts donors, schedules, completes or cancels engagements.
- Messaging and notifications scoped to its requests.
- Cannot access donor-only or admin-only APIs.

### Admin (`ADMIN` → `ROLE_ADMIN`)

- Bootstrapped on startup when `bloodlink.admin.bootstrap=true` (see REQUIREMENTS.md).
- Signs in at `/admin/sign-in` (not advertised on public nav).
- Full read/manage on `/api/v1/admin/**`: hospitals, users, donors, requests, matches, donations, audit.
- No public self-registration for admin.

---

## 4. Main business workflows

### 4.1 Hospital onboarding

1. Hospital registers → `Hospital.verificationStatus = PENDING`.
2. Admin reviews in admin portal → `VERIFIED` (operational) or `REJECTED` / `SUSPENDED`.
3. Only operational hospitals create requests and run matching (`CurrentAccess.requireOperationalHospital`).

### 4.2 Blood request lifecycle

1. Hospital creates request → status **`SEARCHING`** (or **`PAUSED`** if saved inactive).
2. `MatchingService.inviteCompatibleDonors` finds donors: compatible blood type, eligible, available, within request **expansion layer** (`CITY` / `REGION` / `NATIONAL` via `CityCatalog`).
3. Matches created as **`PENDING`**; donors notified.
4. As donors accept, request may move to **`PARTIAL`**; when fulfilled → **`FULFILLED`**; can **`CANCEL`** or **`EXPIRE`**.

### 4.3 Donor invitation → donation

1. Donor receives invitation notification.
2. Donor **accepts** or **declines** → match `ACCEPTED` / `DECLINED`.
3. Hospital **contacts** → `CONTACTED`; **schedules** → `SCHEDULED`.
4. Hospital **completes** → match `COMPLETED`, **`Donation`** record `COMPLETED` (1 unit).
5. Hospital **cancel engagement** → match `CANCELLED`, donation `CANCELLED` or `NO_SHOW`.

### 4.4 Eligibility

Donors pass through `DonorEligibilityService` (age, weight, height, interval since last donation — **56 days**, health flags, questionnaire answers). Results: **`eligible`**, **`review`**, **`ineligible`** — gating invitation and acceptance.

### 4.5 Messaging

`MessageService` exposes threads per `blood_request_id` when at least one match is in an allowed relationship state. Donors see messages tied to their match; hospitals see the full request thread. Sending creates an in-app notification for the other party.

---

## 5. Technology stack

| Layer | Technology |
|-------|------------|
| Frontend | **Angular 19**, TypeScript 5.6, RxJS 7.8, standalone components, signals |
| UI extras | **Three.js** 0.160 (landing visuals), global CSS design system |
| Backend | **Spring Boot 4.1.1**, Java **17+** |
| Security | Spring Security + **OAuth2 Resource Server** (JWT) |
| Persistence | **Spring Data JPA**, **MySQL 8** (runtime), **H2** (tests) |
| Validation | Jakarta Bean Validation on DTOs |
| Build | Maven Wrapper (backend), Angular CLI (frontend) |

---

## 6. Project architecture

```
┌─────────────────────┐     HTTPS/JSON      ┌──────────────────────────────┐
│  Angular SPA        │  Bearer JWT         │  Spring Boot REST API        │
│  localhost:4200     │ ──────────────────► │  localhost:8080 /api/v1/*    │
│  bloodlink-frontend │                     │  bloodlink_backend (module)  │
└─────────────────────┘                     └──────────────┬───────────────┘
                                                           │
                                                           ▼
                                                  ┌─────────────────┐
                                                  │  MySQL          │
                                                  │  bloodlink_db   │
                                                  └─────────────────┘
```

- **No BFF:** the browser calls the API directly (CORS configured on backend).
- **Stateless auth:** JWT in `Authorization: Bearer`; logout is client-side token discard.

---

## 7. Backend structure (`com.bloodlink`)

Module path: `bloodlink_backend/bloodlink_backend/src/main/java/com/bloodlink/`

| Package | Responsibility |
|---------|----------------|
| `BloodlinkBackendApplication` | Spring Boot entry point |
| `config/` | `SecurityConfig`, `CorsConfig`, `JwtConfig`, `AdminBootstrap` |
| `controller/` | REST: `Health`, `Public`, `Auth`, `File`, `Hospital`, `Donor`, `Admin` |
| `service/` | Business logic: auth, matching, requests, donor/hospital portals, notifications, messages, files, audit |
| `repository/` | Spring Data JPA repositories |
| `entity/` | JPA entities (User, Hospital, Donor, BloodRequest, BloodMatch, Donation, AppNotification, RequestMessage, AuditLog, PasswordResetToken) |
| `dto/request`, `dto/response`, `dto/auth` | API contracts |
| `domain/` | Pure helpers: `BloodCompatibility`, `BloodTypes`, `MatchRanking`, `CityCatalog`, `Distances`, `DateRules`, `InputRules` |
| `security/` | `JwtService`, `JwtProperties`, `AuthUser`, `SecurityUtils`, `CurrentAccess` |
| `common/enums/` | Shared enums (Role, MatchStatus, BloodRequestStatus, EligibilityResult, …) |
| `exception/` | `GlobalExceptionHandler`, domain exceptions |
| `resources/db/migration/` | Manual SQL (`V1__widen_persisted_mysql_enums.sql`) |

**Startup repair:** `OpenRequestMatchingRepair` re-normalizes types and re-invites for open requests on application start.

---

## 8. Frontend structure (`bloodlink-frontend/src/app`)

| Area | Purpose |
|------|---------|
| `app.routes.ts` | All routes; guards `guestGuard`, `signedInGuard`, `roleGuard` |
| `app.component.*` | Shell: ambient background, landing on `/`, `<router-outlet>` for other paths |
| `pages/` | Feature pages grouped by **hospital-portal**, **donor-portal**, **admin-portal**, auth, legal |
| `components/` | Marketing sections (hero, network, emergency, …) |
| `core/api/` | `HospitalApiService`, `DonorApiService`, `AdminApiService`, `PublicApiService`, `api.models.ts` |
| `core/auth/` | `AuthService`, `auth.interceptor.ts`, session restore |
| `core/api.config.ts` | API base URL |
| `guards/auth.guard.ts` | Route protection by role |
| `i18n/` | `I18nService`, JSON catalogs in `src/assets/i18n/`, `TranslatePipe` (`t`) |
| `data/morocco-geo.ts` | Morocco regions/cities + localized city names |
| `mock/models.ts` | **Shared** frontend enums/constants (blood types, urgency, re-exports geo) — not a mock API |
| `three/` | WebGL scenes for landing (hero, intro, ambient, final CTA) |
| `ui/` | Toasts, dialogs, route transition, profile photo |

**Note:** `/coverage`, `/find-blood`, and `/register` routes **redirect** elsewhere; legacy page components were removed from the repo.

---

## 9. Database — main entities & relationships

| Entity | Table | Key relationships |
|--------|-------|-------------------|
| `User` | `users` | Optional `ManyToOne` → `Hospital` (staff accounts); locale & notification prefs |
| `Hospital` | `hospitals` | Verification status; `OneToMany` users |
| `Donor` | `donors` | `OneToOne` → `User`; profile, eligibility, geo, availability |
| `BloodRequest` | `blood_requests` | `ManyToOne` → `Hospital`; urgency, units, expansion layer, status |
| `BloodMatch` | `blood_matches` | `ManyToOne` request + donor; unique (request, donor); status timeline |
| `Donation` | `donations` | Links donor, hospital, optional request/match |
| `AppNotification` | `notifications` | `ManyToOne` → `User` |
| `RequestMessage` | `request_messages` | Request thread; optional `blood_match_id` |
| `PasswordResetToken` | `password_reset_tokens` | Hashed token, expiry |
| `AuditLog` | `audit_logs` | Admin actions (scalar actor fields) |

Schema is primarily maintained by Hibernate `ddl-auto=update`. See REQUIREMENTS.md for the manual ENUM migration script.

---

## 10. Authentication & authorization

### Registration & login

- `POST /api/v1/auth/register/hospital|donor`
- `POST /api/v1/auth/login` → `{ accessToken, tokenType: "Bearer", ... }`
- `GET /api/v1/auth/me`, password change, forgot/reset password
- Forgot-password uses **server-stored** hashed tokens (`PasswordResetToken`), not JWT

### JWT contents (access token)

Claims include `userId`, `email`, `role` (`DONOR`|`HOSPITAL`|`ADMIN`), and optional `hospitalId` for hospital staff.

### Spring Security rules (`SecurityConfig`)

| Pattern | Access |
|---------|--------|
| `GET /api/v1/health`, `/api/v1/public/**` | Public |
| `POST /api/v1/auth/register/*`, `login`, forgot/reset password | Public |
| `/api/v1/admin/**` | `ROLE_ADMIN` |
| `/api/v1/hospital/**` | `ROLE_HOSPITAL` |
| `/api/v1/donor/**` | `ROLE_DONOR` |
| Other authenticated routes | Any valid JWT (e.g. file downloads with extra checks) |

Method-level `@PreAuthorize` duplicates role checks on controllers.

### Frontend

- Token: `localStorage['bloodlink.accessToken']`
- `authInterceptor` attaches `Authorization: Bearer` except for login/register/health/public paths
- `roleGuard(['hospital'|'donor'|'admin'])` on portal route trees

---

## 11. JWT / Spring Security implementation

- **Encoder/decoder:** `JwtConfig` — **HS256**, secret from `bloodlink.jwt.secret` (minimum 32 characters).
- **Resource server:** `oauth2ResourceServer().jwt()` with custom `JwtAuthenticationConverter` mapping claim `role` → `ROLE_*`.
- **Stateless:** no server-side session store for API tokens; CSRF disabled for REST JWT usage.

---

## 12. Blood matching logic

Implemented in `MatchingService` with:

1. **`BloodCompatibility.canDonateTo(donor, request)`** — standard ABO/Rh compatibility matrix in `BloodCompatibility.java`.
2. **`DonorEligibilityService`** — must be invitable (`canBeInvited`).
3. **`CityCatalog` + request expansion** — donor must fall within the request’s current search layer.
4. **`MatchRanking.score`** — orders candidates (blood fit, eligibility, availability, urgency, distance when location consent exists via `Distances` haversine).
5. Creates `BloodMatch` rows and notifies via `NotificationService`.

When a donor toggles availability or eligibility improves, `inviteDonorToOpenRequests` can attach them to open requests.

---

## 13. Donation lifecycle

| Stage | Match status | Donation status (when recorded) |
|-------|--------------|----------------------------------|
| Invited | `PENDING` | — |
| Accepted | `ACCEPTED` | — |
| Hospital contact | `CONTACTED` | — |
| Scheduled | `SCHEDULED` | — |
| Completed | `COMPLETED` | `COMPLETED` |
| Cancelled / no-show | `CANCELLED` | `CANCELLED` or `NO_SHOW` |

Enum values `DonationStatus.SCHEDULED` and `RECORDED` exist for schema compatibility; completion path in `MatchingService` sets **`COMPLETED`**, **`CANCELLED`**, or **`NO_SHOW`**.

---

## 14. Notifications & chat

### Notifications (`AppNotification`, `NotificationService`)

- Kinds: `INVITATION`, `ACCEPTED`, `DECLINED`, `CANCELLED`, `ELIGIBILITY`, `STATUS`, `VERIFICATION`, (`REMINDER` defined but not emitted by services today).
- Respects user preferences (`notifyInvitations`, `notifyStatus`, `notifyReminders`).
- **In-app only** (no push/email channel for notifications).

### Chat (`RequestMessage`, `MessageService`)

- Hospital: `GET/POST /api/v1/hospital/requests/{id}/messages`
- Donor: `GET/POST /api/v1/donor/requests/{id}/messages` (scoped to their match)
- Access requires an established match relationship in allowed statuses.

---

## 15. Multilingual support

| Locale code | UI label | Catalog file |
|-------------|----------|--------------|
| `ar-MA` | Moroccan Darija (default) | `src/assets/i18n/ar-MA.json` |
| `fr` | French | `src/assets/i18n/fr.json` |
| `en` | English | `src/assets/i18n/en.json` |

- `I18nService` loads JSON at build time; `LanguageSwitcherComponent` in nav/portals.
- **RTL:** `ar-MA` sets `dir=rtl` on `<html>`.
- City names localized via `localizedCityName()` in `morocco-geo.ts`.
- Logged-in users can persist locale through auth settings API.

---

## 16. Admin dashboard

Angular **admin portal** (`AdminPortalComponent`) routes:

- `/admin` — overview KPIs (`AdminApiService.overview()`)
- `/admin/hospitals` — verification queue
- `/admin/users`, `/admin/donors`, `/admin/requests`, `/admin/matches`, `/admin/donations`
- `/admin/audit-log`

Uses the same `hp-page` visual system as hospital/donor dashboards (sidebar + stats + tables).

---

## 17. Validation & security rules (high level)

- **DTO validation:** Jakarta validation on request bodies (required fields, sizes, email format).
- **Business rules:** `BusinessRuleException` + coded messages (eligibility, hospital not verified, wrong match state).
- **Hospital verification gate** before operational actions.
- **File uploads:** max **2 MB** (`spring.servlet.multipart.*`); stored under `bloodlink.uploads-dir`.
- **CORS:** explicit allowlist (`bloodlink.cors.allowed-origins`).
- **Public feed:** anonymized active requests only via `/api/v1/public/active-requests`.
- **Admin bootstrap:** configurable; disable in production after creating real admin (`ADMIN_BOOTSTRAP=false`).

---

## 18. Frontend ↔ backend communication

1. `API_BASE_URL` from `api.config.ts` + path `/api/v1/...`.
2. `HttpClient` services in `core/api/*` map to REST resources.
3. `authInterceptor` adds JWT except public auth/health/public endpoints.
4. Errors mapped via `httpErrorMessage()` → `I18nService.httpError()` for localized API error codes.

Example hospital dashboard: `HospitalApiService.dashboard()` → `GET /api/v1/hospital/dashboard`.

---

## 19–22. Run locally, config, database, tests

See **[REQUIREMENTS.md](./REQUIREMENTS.md)** for:

- Exact install & startup commands
- All environment variables
- MySQL setup and ENUM migration script
- `mvnw test` and `npm run build`

---

## 23. Development notes & known limitations

| Topic | Detail |
|-------|--------|
| **Schema tool** | Hibernate `ddl-auto=update`; manual SQL for ENUM widening only |
| **Email** | Password reset links logged, not emailed (`LoggingEmailGateway`) |
| **API URL in production** | Non-localhost frontends still default API to `localhost:8080` unless `api.config.ts` is extended |
| **Tests** | Backend: 7 JUnit/MockMvc test classes; Frontend: no `*.spec.ts` files |
| **Playwright** | Installed as devDependency, no npm e2e script in repo |
| **3D map** | Morocco 3D map removed; network section uses static flow + coverage copy |
| **Dead backend method** | `MessageService.canCommunicate(Long)` unused (safe to remove in a future refactor) |
| **JWT logout** | Server endpoint is no-op; client clears token |
| **Reminder notifications** | Enum exists; no producer calls yet |

---

## License & attribution

BloodLink — **Hasna Elbahraoui**.

For questions about setup, start with [REQUIREMENTS.md](./REQUIREMENTS.md).
