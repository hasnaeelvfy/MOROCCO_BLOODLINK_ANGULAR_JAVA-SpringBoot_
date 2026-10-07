# BloodLink — setup & requirements

**Author:** Hasna Elbahraoui

This document lists what you need to install and configure to run BloodLink locally. Values below match the **current repository** (`bloodlink-frontend` + `bloodlink_backend/bloodlink_backend`).

---

## 1. Required software

| Tool | Version used in development | Notes |
|------|----------------------------|--------|
| **Java JDK** | **17+** (17.0.8 verified in Surefire reports) | Required for Spring Boot backend. Use `JAVA_HOME` pointing to JDK 17 or newer. |
| **Maven** | **3.9+** (wrapper included) | Prefer `./mvnw` / `mvnw.cmd` in `bloodlink_backend/bloodlink_backend/`. |
| **Node.js** | **18 LTS or 20 LTS** recommended | Angular 19 CLI; no `engines` field in `package.json`. |
| **npm** | **9+** (ships with Node) | Used in `bloodlink-frontend/`. |
| **MySQL Server** | **8.x** | Schema `bloodlink_db`; default JDBC port in config is **3309** (not 3306). |

**Not required for local demo**

- External SMTP (password reset uses `LoggingEmailGateway` — tokens logged on the server console).
- Redis, message brokers, or third-party API keys.
- Docker (optional; only if you run MySQL in a container).

**Optional**

- **Playwright** (`devDependency` in frontend) — not wired to npm scripts; manual use only.
- **Angular Karma** — `npm test` exists but there are no `*.spec.ts` files under `src/`.

---

## 2. Repository layout

```
BloodLink App/
├── README.md                 # Product & architecture overview
├── REQUIREMENTS.md           # This file
├── .gitignore
├── bloodlink-frontend/       # Angular 19 SPA
└── bloodlink_backend/
    └── bloodlink_backend/    # Spring Boot 4.1.1 API (Maven module)
        ├── mvnw, mvnw.cmd
        ├── pom.xml
        └── src/main/resources/application.properties
```

---

## 3. MySQL database

### 3.1 Create schema

The application **does not create the database name** for you. Create it once:

```sql
CREATE DATABASE IF NOT EXISTS bloodlink_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

### 3.2 Connection defaults

From `application.properties`:

| Setting | Default | Override env var |
|---------|---------|------------------|
| JDBC URL | `jdbc:mysql://localhost:3309/bloodlink_db?...` | `DB_URL` |
| Username | `root` | `DB_USERNAME` |
| Password | *(empty)* | `DB_PASSWORD` |

Example if MySQL listens on **3306**:

```powershell
$env:DB_URL = "jdbc:mysql://localhost:3306/bloodlink_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC&useUnicode=true&characterEncoding=UTF-8"
$env:DB_USERNAME = "root"
$env:DB_PASSWORD = "your_password"
```

### 3.3 Schema evolution

- **Primary mechanism:** `spring.jpa.hibernate.ddl-auto=update` (tables/columns created/updated on startup).
- **Manual migration (existing MySQL with old ENUM definitions):**  
  Run once on production-like databases:

  `bloodlink_backend/bloodlink_backend/src/main/resources/db/migration/V1__widen_persisted_mysql_enums.sql`

  There is **no Flyway/Liquibase** dependency; this SQL file is **not** executed automatically.

---

## 4. Backend environment variables

All placeholders from `application.properties`:

| Variable | Purpose | Default |
|----------|---------|---------|
| `SERVER_PORT` | HTTP port | `8080` |
| `DB_URL` | MySQL JDBC URL | `localhost:3309/bloodlink_db` |
| `DB_USERNAME` | DB user | `root` |
| `DB_PASSWORD` | DB password | empty |
| `JWT_SECRET` | HS256 signing key (**min 32 chars**) | dev placeholder in properties |
| `JWT_EXPIRATION_MS` | Access token TTL | `3600000` (1 hour) |
| `JWT_ISSUER` | JWT issuer claim | `bloodlink` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated origins | `http://localhost:4200,http://127.0.0.1:4200` |
| `UPLOADS_DIR` | Hospital logos & donor avatars | `uploads` (relative to backend working directory) |
| `ADMIN_EMAIL` | Bootstrap admin account | `admin@bloodlink.ma` |
| `ADMIN_PASSWORD` | Bootstrap admin password | `AdminBloodLink1` |
| `ADMIN_BOOTSTRAP` | Create admin on startup if missing | `true` |

**Production:** always set a strong `JWT_SECRET`, `ADMIN_PASSWORD`, and real `DB_*` values. Never commit secrets.

---

## 5. Frontend configuration

There are **no** `src/environments/environment.ts` files.

API base URL is resolved at runtime in `src/app/core/api.config.ts`:

- On `localhost` / `127.0.0.1`: `{protocol}//{hostname}:8080`
- On any other hostname: falls back to `http://localhost:8080` (adjust this file or serve API on the same host for non-local demos).

**JWT storage (browser):** `localStorage` key `bloodlink.accessToken`.

**Locale storage:** `localStorage` key `bloodlink.locale` (`ar-MA`, `fr`, `en`).

**No Angular dev proxy** — the browser calls port **8080** directly; CORS must allow the frontend origin (see `CORS_ALLOWED_ORIGINS`).

---

## 6. Installation commands

### 6.1 Backend

```powershell
cd "bloodlink_backend\bloodlink_backend"
# Optional: set DB_* and JWT_* env vars first
.\mvnw.cmd -DskipTests package
```

### 6.2 Frontend

```powershell
cd bloodlink-frontend
npm install
npm run build
```

---

## 7. Startup commands (local demo)

Use **two terminals**.

**Terminal 1 — API**

```powershell
cd "bloodlink_backend\bloodlink_backend"
# Set DB_URL / DB_PASSWORD if needed
.\mvnw.cmd spring-boot:run
```

Verify: `GET http://localhost:8080/api/v1/health` → `{"status":"UP",...}`

**Terminal 2 — Angular**

```powershell
cd bloodlink-frontend
npm start
# or: npx ng serve --host 127.0.0.1 --port 4200
```

Open: **http://localhost:4200/**

### Default admin (when `ADMIN_BOOTSTRAP=true`)

| Field | Default |
|-------|---------|
| Email | `admin@bloodlink.ma` |
| Password | `AdminBloodLink1` |

Sign in at **`/admin/sign-in`**. Admin routes are not linked from the public marketing nav.

---

## 8. Test & build commands

### Backend tests (H2 in-memory, no MySQL required)

```powershell
cd "bloodlink_backend\bloodlink_backend"
.\mvnw.cmd test
```

Test profile: `src/test/resources/application.properties` (`ddl-auto=create-drop`, `ADMIN_BOOTSTRAP=false`).

### Frontend production build

```powershell
cd bloodlink-frontend
npm run build
```

Output: `bloodlink-frontend/dist/bloodlink/`

### Frontend unit tests

```powershell
cd bloodlink-frontend
npm test
```

Karma is configured but **no unit spec files** are present under `src/` (Angular schematics default `skipTests: true`).

---

## 9. External services / API keys

| Service | Required? | Implementation |
|---------|-----------|----------------|
| MySQL | **Yes** (runtime) | JDBC |
| SMTP / email | No | `LoggingEmailGateway` logs reset links |
| Maps / geo APIs | No | Static Morocco city catalog in backend `CityCatalog` + frontend `morocco-geo.ts` |
| Payment / SMS | No | — |

---

## 10. Troubleshooting

| Symptom | Likely cause | Action |
|---------|--------------|--------|
| Backend fails on startup | MySQL not running or wrong port | Check `DB_URL`; default port **3309** |
| `Data truncated for column 'status'` | Old MySQL ENUM values | Run `V1__widen_persisted_mysql_enums.sql` |
| Frontend 401 on API | Missing/expired JWT | Sign in again; check `bloodlink.accessToken` |
| CORS errors | Origin not allowed | Add frontend URL to `CORS_ALLOWED_ORIGINS` |
| Admin 403 | Wrong role token | Use `/admin/sign-in`, not donor/hospital account |
| Uploaded images 404 | Wrong working directory | Run backend from module root so `uploads/` resolves |

---

## 11. Quick checklist for a new developer

1. Install JDK 17+, Node 18+, MySQL 8.
2. Create database `bloodlink_db`.
3. Set `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` if defaults do not match your machine.
4. Set `JWT_SECRET` (≥ 32 characters) for anything beyond local play.
5. `mvnw spring-boot:run` in backend module.
6. `npm install && npm start` in frontend.
7. Open http://localhost:4200 and test hospital/donor registration or admin sign-in.
