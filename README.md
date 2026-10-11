# WasteLink — Smart Recyclable Waste Collection and Matching System

WasteLink is a web platform that connects people and organizations that **produce recyclable
waste** with **collectors** and **recycling organizations**.

Waste producers post recyclable waste (plastic, paper, cardboard, glass, metal, electronic
waste). The system matches those listings with suitable collectors using a simple **rule-based
matching** algorithm (material type + service area + availability), and both sides then manage the
pickup from request to completed collection.

---

## Table of contents

1. [Project description](#1-project-description)
2. [Technologies](#2-technologies)
3. [Requirements](#3-requirements)
4. [Installation](#4-installation)
5. [MySQL setup](#5-mysql-setup)
6. [MongoDB setup](#6-mongodb-setup)
7. [RabbitMQ setup](#7-rabbitmq-setup)
8. [Environment variables](#8-environment-variables)
9. [Backend setup](#9-backend-setup)
10. [Frontend setup](#10-frontend-setup)
11. [How to run the application](#11-how-to-run-the-application)
12. [Default development accounts](#12-default-development-accounts)
13. [Main features](#13-main-features)
14. [User roles and permissions (RBAC)](#14-user-roles-and-permissions-rbac)
15. [Smart matching rules](#15-smart-matching-rules)
16. [Main workflow](#16-main-workflow)
17. [Project structure](#17-project-structure)
18. [API overview](#18-api-overview)
19. [Testing](#19-testing)
20. [Troubleshooting](#20-troubleshooting)

---

## 1. Project description

The problem: waste producers do not easily know which collectors can collect their materials, and
collectors struggle to find available recyclable waste.

WasteLink solves this with:

- Waste listings created by producers (category, quantity, location, description, status).
- A **rule-based matching engine** that finds collectors by material, service area and availability.
- A complete pickup workflow: request → accept/reject → schedule → collect → complete → feedback.
- **Role-based access control** across four roles.
- **Asynchronous notifications** delivered through RabbitMQ and stored in MongoDB.

### Main objectives

- Let waste producers post recyclable waste and immediately see which collectors can take it.
- Automate collector–waste matching using transparent, rule-based scoring (material, service area, availability).
- Guide every pickup from request through scheduling and collection to completion and feedback.
- Enforce role-based access control so each of the four roles can only perform its own actions.
- Deliver asynchronous notifications and keep an auditable system activity log.

---

## 2. Technologies

| Layer | Technology |
| --- | --- |
| Frontend | React 18, TypeScript, Tailwind CSS, React Router, Axios, Vite |
| Backend | Node.js, Express.js, TypeScript, REST API |
| Main database | MySQL 8 (relational business data) |
| Non-relational database | MongoDB (notifications + system activity logs) |
| Messaging | RabbitMQ (asynchronous domain events) |
| Authentication | Email/password (bcrypt), JWT, Google OAuth2 |
| Authorization | Role-Based Access Control (RBAC) |
| Validation | Zod (backend) + HTML/React validation (frontend) |
| Version control | Git |

---

## 3. Requirements

- **Node.js** 18 or newer (tested on Node 25)
- **npm** 9 or newer
- **MySQL** 8.x (server + client)
- **MongoDB** 6.x or newer
- **RabbitMQ** 3.x (with Erlang)
- Optional: **Docker** + Docker Compose to run the three services in containers

---

## 4. Installation

```bash
# 1. Clone / open the project
cd wastelink

# 2. Install backend and frontend dependencies
npm run install:all
# (equivalent to: npm install --prefix backend && npm install --prefix frontend)

# 3. Copy the environment files and fill them in
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 4. Create the database schema
mysql -u root -p < database/schema.sql

# 5. Seed development data
npm run db:seed
```

---

## 5. MySQL setup

MySQL stores all relational business data: users, categories, listings, collector profiles,
pickup requests, pickups and feedback.

**Create the database and tables:**

```bash
mysql -u root -p < database/schema.sql
```

The script creates the `wastelink` database, all 8 tables, primary keys, foreign keys,
check constraints, indexes and the six default waste categories.

**Tables:**

| Table | Purpose |
| --- | --- |
| `users` | All accounts, with role, password hash, Google id |
| `waste_categories` | Plastic, Paper, Cardboard, Glass, Metal, Electronic Waste |
| `waste_listings` | Recyclable waste posted by producers |
| `collector_profiles` | Service area, availability, accepted materials, verification |
| `organization_profiles` | Recycling organization details and accepted materials |
| `pickup_requests` | A collector's request to collect a listing |
| `pickups` | Scheduling + collection status for an accepted request |
| `feedback` | Rating and comment left after a completed collection |

The schema is safe to re-run: it drops and recreates the tables.

> **Note:** the schema file contains only *categories* as seed data. All demo users and listings
> come from the seed script (step 4 above), so the application never depends on sample data.

---

## 6. MongoDB setup

MongoDB stores **non-relational** data only:

- `notifications` — per-user notifications (`userId`, `message`, `type`, `read`, `createdAt`)
- `activity_logs` — system event log (`actorId`, `action`, `entityType`, `description`, `createdAt`)

**Local install:** start `mongod` (installed as a Windows service by the installer) and make sure
`MONGODB_URI` in `backend/.env` points at it:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/wastelink
```

**MongoDB Atlas (cloud):**

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/wastelink
```

Collections are created automatically on first write. No manual setup is required.

> If MongoDB is unavailable the application still runs: notifications and activity logs are skipped
> and a warning is printed at startup.

---

## 7. RabbitMQ setup

RabbitMQ carries asynchronous domain events. The backend:

1. Publishes events to a **topic exchange** (`wastelink.events`).
2. A durable queue (`wastelink.notifications`) is bound to it.
3. A single **notification consumer** turns each event into a MongoDB notification and an
   (optional) email.

Events published:

| Event | Triggered when |
| --- | --- |
| `user.registered` | A new account is created |
| `pickup.requested` | A collector requests a pickup |
| `pickup.accepted` | A producer accepts a request |
| `pickup.rejected` | A producer rejects a request |
| `pickup.scheduled` | A producer schedules an accepted pickup |
| `collection.completed` | A collector marks the collection complete |
| `collector.verified` | An admin verifies/rejects a collector |
| `feedback.received` | A producer submits feedback |

**Example flow:**

```
Collector creates pickup request
        ↓
Backend (POST /api/pickups/requests)
        ↓
RabbitMQ exchange wastelink.events
        ↓
wastelink.notifications queue
        ↓
notification.consumer  →  MongoDB notification  (+ email hook)
        ↓
Producer sees the notification in the top bar
```

**Local install:** the RabbitMQ Windows service runs on `amqp://127.0.0.1:5672`.
The management UI is at <http://localhost:15672> (default guest/guest).

**Cloud (CloudAMQP):**

```env
RABBITMQ_URL=amqps://<user>:<password>@<host>/<vhost>
```

> If RabbitMQ is unreachable the backend falls back to an **in-process event bus** so the whole
> workflow keeps working. The health endpoint reports which transport is active.

---

## 8. Environment variables

Never hard-code secrets. Copy `backend/.env.example` to `backend/.env` and fill it in.

| Variable | Description |
| --- | --- |
| `NODE_ENV` | `development` or `production` |
| `PORT` | Backend port (default `4000`) |
| `CORS_ORIGIN` | Allowed frontend origin(s), comma separated |
| `MYSQL_HOST` | MySQL host |
| `MYSQL_PORT` | MySQL port (default `3306`) |
| `MYSQL_DATABASE` | Database name (`wastelink`) |
| `MYSQL_USER` | MySQL user |
| `MYSQL_PASSWORD` | MySQL password |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Long random string used to sign JWTs |
| `JWT_EXPIRES_IN` | Token lifetime (default `7d`) |
| `GOOGLE_CLIENT_ID` | Google OAuth2 client id |
| `GOOGLE_CLIENT_SECRET` | Google OAuth2 client secret |
| `RABBITMQ_URL` | RabbitMQ connection string |
| `RABBITMQ_EXCHANGE` | Topic exchange name |
| `RABBITMQ_QUEUE` | Notification queue name |
| `RABBITMQ_ENABLED` | Set `false` to force the in-memory bus |
| `EMAIL_ENABLED` | `true` to enable email sending |
| `EMAIL_HOST` / `EMAIL_PORT` / `EMAIL_USER` / `EMAIL_PASSWORD` / `EMAIL_FROM` | SMTP settings |

Frontend (`frontend/.env`):

| Variable | Description |
| --- | --- |
| `VITE_API_URL` | API base URL. Leave empty to use the Vite proxy (`/api`) |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth2 client id (same as backend) |

`.env` files are git-ignored. Only `.env.example` files are committed.

### Google OAuth2 configuration (optional)

Google Sign-In is optional — the app fully works with email/password without it. To enable it:

1. Open the [Google Cloud Console](https://console.cloud.google.com/) and create (or select) a project.
2. Configure the **OAuth consent screen** (External is fine for testing) and add the test users.
3. Go to **Credentials → Create credentials → OAuth client ID** and choose **Web application**.
4. Under **Authorized JavaScript origins**, add your frontend origin. For local development:
   - `http://localhost:5173`
5. Copy the generated **Client ID** and **Client secret**.
6. Put the same values in your environment files (never commit them):
   - `frontend/.env`: `VITE_GOOGLE_CLIENT_ID=<your-client-id>`
   - `backend/.env`: `GOOGLE_CLIENT_ID=<your-client-id>` and `GOOGLE_CLIENT_SECRET=<your-client-secret>`

The frontend renders the official Google button (Google Identity Services), receives an ID token, and
posts it to `POST /api/auth/google`. The backend verifies that token against `GOOGLE_CLIENT_ID` before
creating a session. Only placeholder values live in the committed `.env.example` files.

---

## 9. Backend setup

```bash
cd backend
npm install
npm run typecheck     # optional: type-check without emitting
npm run dev           # development server with hot reload (tsx watch)
npm run build && npm start   # production build
```

On startup the backend:

1. Connects to MySQL (fatal if it fails).
2. Connects to MongoDB (warns and continues if it fails).
3. Registers the notification consumer and connects to RabbitMQ (falls back to in-memory).
4. Listens on `http://localhost:4000`.

Health check: <http://localhost:4000/api/health>

---

## 10. Frontend setup

```bash
cd frontend
npm install
npm run dev       # http://localhost:5173
npm run build     # production build
```

The Vite dev server proxies `/api` to `http://localhost:4000`, so the browser only talks to one
origin during development.

---

## 11. How to run the application

**Quickest path (three terminals):**

```bash
# Terminal 1 — MySQL, MongoDB, RabbitMQ must be running
# (Windows: they run as services. Or: docker compose up -d)

# Terminal 2 — backend
cd backend && npm run dev

# Terminal 3 — frontend
cd frontend && npm run dev
```

Then open <http://localhost:5173>.

**With Docker for the services:**

```bash
docker compose up -d
mysql -h 127.0.0.1 -P 3306 -u root -proot < database/schema.sql
npm run db:seed
```

---

## 12. Default development accounts

Created by `npm run db:seed`. **Password for all accounts: `Password123!`**

| Role | Email |
| --- | --- |
| ADMIN | `admin@wastelink.rw` |
| WASTE_PRODUCER | `alice@wastelink.rw` |
| WASTE_PRODUCER | `bob@wastelink.rw` |
| COLLECTOR (verified) | `chris@wastelink.rw` |
| COLLECTOR (pending) | `diana@wastelink.rw` |
| RECYCLING_ORGANIZATION | `ecorwanda@wastelink.rw` |

The seed also creates six sample waste listings. These are only for convenience — the application
works without them.

---

## 13. Main features

**Waste producer**

- Register, log in (email/password or Google), manage profile
- Create, view, edit and cancel recyclable waste listings
- See smart-match results for a new listing
- View, accept or reject pickup requests
- Schedule accepted pickups
- Track collection status and view collection history
- Give 1–5 star feedback after a completed collection

**Collector**

- Register, log in, manage collector profile
- Set service area, availability and accepted materials
- Browse and search/filter available waste
- See recommended (matched) waste with a match score
- Request pickups (requires admin verification)
- View requests and accepted pickups
- Update collection status: `SCHEDULED → IN_PROGRESS → COMPLETED`
- View collection history and received ratings

**Recycling organization**

- Register, log in, manage organization profile
- Specify the recyclable materials it accepts
- View recyclable waste relevant to those materials

**Administrator**

- Dashboard with system statistics
- View and manage users (activate/deactivate)
- Verify or reject collectors
- Manage waste categories (create, edit, delete)
- View all listings, pickup activities and the system activity log

**Common**

- Notifications (top-bar dropdown + dedicated page, unread badge)
- Profile page (adapts to the logged-in role)
- 404 page
- Responsive layout: collapsible sidebar, stacked cards, scrollable tables on mobile

---

## 14. User roles and permissions (RBAC)

Enforced on the **backend** (`authenticate` + `authorize` middleware) and mirrored on the
**frontend** (route guards).

| Action | PRODUCER | COLLECTOR | ORG | ADMIN |
| --- | :-: | :-: | :-: | :-: |
| Create/edit own listings | ✅ | ❌ | ❌ | ✅ |
| Browse available waste | ❌ | ✅ | ✅ | ✅ |
| Request pickup | ❌ | ✅ (verified only) | ❌ | ❌ |
| Accept/reject request | ✅ (own) | ❌ | ❌ | ❌ |
| Schedule pickup | ✅ (own) | ❌ | ❌ | ❌ |
| Update collection status | ❌ | ✅ (assigned) | ❌ | ✅ |
| Give feedback | ✅ (own) | ❌ | ❌ | ❌ |
| Verify collectors | ❌ | ❌ | ❌ | ✅ |
| Manage users / categories | ❌ | ❌ | ❌ | ✅ |

Examples that are explicitly blocked:

- A **COLLECTOR** cannot open the Admin Dashboard (`403 Forbidden`).
- A **WASTE_PRODUCER** cannot verify collectors.
- An **unverified collector** cannot request pickups until an admin verifies them.
- A producer cannot edit another producer's listing.

---

## 15. Smart matching rules

Simple **rule-based** matching — no AI or machine learning.

A collector is matched to a listing when:

1. **Material** — the collector accepts the listing's category (required)
2. **Availability** — the collector is currently `AVAILABLE` (required)
3. **Area** — the collector's service area matches the listing location (preferred)

Scoring:

| Rule | Points |
| --- | --- |
| Material type matches | 50 |
| Service area matches | 30 |
| Available | 20 |
| Verified collector | 10 (bonus) |

Example: *Waste: Plastic, Location: Kicukiro* + *Collector: accepts Plastic, service area
Kicukiro, available* → **suitable match** with score 100 (110 if verified).

Producers see matched collectors immediately after creating a listing; collectors see matched
listings (with score and reasons) on the **Recommended** page.

---

## 16. Main workflow

```
Waste Producer registers / logs in
        ↓
Producer creates a waste listing
        ↓
Listing becomes AVAILABLE
        ↓
System finds suitable collectors (material + area + availability)
        ↓
Collector views the listing
        ↓
Collector requests pickup            →  RabbitMQ: pickup.requested
        ↓
Producer receives a notification
        ↓
Producer accepts the request         →  RabbitMQ: pickup.accepted
        ↓
Pickup is scheduled                  →  RabbitMQ: pickup.scheduled
        ↓
Collector updates collection status  (IN_PROGRESS)
        ↓
Collection completed                 →  RabbitMQ: collection.completed
        ↓
Collection appears in history
        ↓
Producer gives feedback              →  RabbitMQ: feedback.received
```

This flow is verified end-to-end by `backend/scripts/smoke-test.sh`.

---

## 17. Project structure

```
wastelink/
├── backend/
│   ├── src/
│   │   ├── config/          # env, MySQL pool, MongoDB, RabbitMQ event bus
│   │   ├── controllers/     # request handlers + zod schemas
│   │   ├── middleware/      # JWT auth, RBAC authorize(), error handling
│   │   ├── models/mongo/    # Mongoose Notification + ActivityLog
│   │   ├── rabbitmq/
│   │   │   └── consumers/   # notification consumer
│   │   ├── repositories/    # SQL data access
│   │   ├── routes/          # Express routers
│   │   ├── seed/            # development seed script
│   │   ├── services/        # business logic (auth, matching, pickup, ...)
│   │   ├── types/           # shared types + Role enum
│   │   ├── utils/           # ApiError, validation helpers
│   │   ├── app.ts           # Express app
│   │   └── server.ts        # bootstrap (connects MySQL/Mongo/RabbitMQ)
│   ├── scripts/smoke-test.sh
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/             # axios client + typed endpoints
│   │   ├── components/      # Layout, ProtectedRoute, GoogleButton, ui
│   │   ├── context/         # AuthContext, NotificationContext
│   │   ├── pages/
│   │   │   ├── public/      # landing, login, register
│   │   │   ├── producer/    # producer pages
│   │   │   ├── collector/   # collector pages
│   │   │   ├── organization/# organization pages
│   │   │   ├── admin/       # admin pages
│   │   │   └── common/      # profile, notifications, 404
│   │   ├── types/
│   │   ├── App.tsx          # all routes
│   │   └── main.tsx
│   ├── .env.example
│   └── package.json
├── database/
│   └── schema.sql           # full MySQL schema + default categories
├── docker-compose.yml       # optional MySQL/MongoDB/RabbitMQ containers
├── package.json             # root convenience scripts
├── .gitignore
└── README.md
```

---

## 18. API overview

Base URL: `http://localhost:4000/api`

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/health` | public | Service health |
| POST | `/auth/register` | public | Register (producer/collector/org) |
| POST | `/auth/login` | public | Email/password login |
| POST | `/auth/google` | public | Google OAuth2 login |
| GET | `/auth/me` | any | Current user |
| PUT | `/auth/profile` | any | Update profile |
| GET | `/categories` | public | List waste categories |
| POST | `/listings` | producer | Create listing (+ matches) |
| GET | `/listings/mine` | producer | Own listings |
| GET | `/listings/available` | collector/org/admin | Browse available waste |
| GET | `/listings/:id` | any | Listing details |
| PUT | `/listings/:id` | producer/admin | Update listing |
| PATCH | `/listings/:id/cancel` | producer/admin | Cancel listing |
| DELETE | `/listings/:id` | producer/admin | Delete listing |
| GET/PUT | `/collectors/me` | collector | Collector profile |
| GET | `/collectors/recommendations` | collector | Matched listings |
| POST | `/pickups/requests` | collector | Request pickup |
| GET | `/pickups/requests/producer` | producer | Requests for own listings |
| GET | `/pickups/requests/collector` | collector | Own requests |
| PATCH | `/pickups/requests/:id/accept` | producer | Accept request |
| PATCH | `/pickups/requests/:id/reject` | producer | Reject request |
| POST | `/pickups/requests/:id/schedule` | producer | Schedule pickup |
| PATCH | `/pickups/requests/:id/status` | collector/admin | Update collection status |
| GET | `/pickups/history` | any | Collection history |
| POST | `/pickups/feedback` | producer | Submit feedback |
| GET/PUT | `/organizations/me` | org | Organization profile |
| GET | `/organizations/listings` | org | Relevant listings |
| GET | `/admin/stats` | admin | System statistics |
| GET | `/admin/users` | admin | List users |
| PATCH | `/admin/users/:id/active` | admin | Activate/deactivate user |
| GET | `/admin/collectors` | admin | List collectors |
| PATCH | `/admin/collectors/:id/verify` | admin | Verify/reject collector |
| GET | `/admin/listings` | admin | All listings |
| GET/POST/PUT/DELETE | `/admin/categories` | admin | Manage categories |
| GET | `/admin/pickups` | admin | Pickup activities |
| GET | `/admin/activities` | admin | System activity log |
| GET | `/notifications` | any | Notifications + unread count |
| PATCH | `/notifications/:id/read` | any | Mark notification read |

---

## 19. Testing

There are **three automated test suites** covering the API, the real browser UI and console
health. Together they run **104 checks**.

### 1. API smoke test (53 checks)

```bash
# with the backend running on :4000
npm run test:api
# or: bash backend/scripts/smoke-test.sh
```

It verifies **53 checks** across 14 groups:

1. Health endpoint
2. Valid login, invalid login, validation errors
3. RBAC / unauthorized access (no token, wrong role, unverified collector)
4. Create listing + smart matching
5. Edit listing (and ownership protection)
6. Browse available waste + recommendations
7. Collector pickup request (and duplicate protection)
8. Producer accepts request
9. Pickup scheduling (and invalid transitions)
10. Collection status updates to completion
11. Feedback (and duplicate protection)
12. Admin verification, stats, categories
13. Notifications + profile updates
14. Registration (and duplicate/admin-block rules)

### 2. Browser UI smoke test (29 checks)

Drives **real headless Chrome** through the Chrome DevTools Protocol: it signs each
role in with a real JWT, visits every page and asserts the live data from the API rendered.

```bash
# 1. Start the backend (:4000) and frontend (:5173)
# 2. Start Chrome with remote debugging:
chrome --headless=new --remote-debugging-port=9222 --user-data-dir=%TEMP%\wastelink-chrome
# 3. Run:
npm run test:ui
# or: node backend/scripts/ui-smoke-test.mjs
```

It verifies **29 checks** across 8 groups:

1. Landing page (public)
2. Producer pages (dashboard, listings, create form, requests, history)
3. Collector pages (dashboard, available waste, recommendations, requests, collections)
4. Recycling organization pages (dashboard, accepted materials, listings)
5. Admin pages (dashboard, users, verification, categories, listings, pickups, activities)
6. Common pages (profile, notifications)
7. RBAC redirects in the browser (producer/collector/admin opening each other's URLs)
8. Session handling (invalid token returns the user to login)

### 3. Console health check (0 errors expected)

Walks the same 29 pages while capturing `console.error`, `console.warning`, uncaught
exceptions, failed requests and any HTTP response ≥ 400.

```bash
# requires the same Chrome instance as test:ui
npm run test:console
# or: node backend/scripts/console-check.mjs
```

### 4. MongoDB verification

Confirms notifications and activity logs were really written to MongoDB:

```bash
npm run verify:mongo
```

**Verified results (this project):** `test:api` 53/53, `test:ui` 29/29,
`test:console` 0 issues across 29 pages.

**Manual UI test checklist**

| # | Step |
| --- | --- |
| 1 | Register a new producer and log in |
| 2 | Try logging in with a wrong password → error shown |
| 3 | Log in with Google (needs `VITE_GOOGLE_CLIENT_ID`) |
| 4 | Create a waste listing → matching results shown |
| 5 | Edit the listing |
| 6 | Log in as a verified collector → browse available waste |
| 7 | Request a pickup |
| 8 | Log in as the producer → accept the request |
| 9 | Schedule the pickup |
| 10 | Log in as the collector → start and complete the collection |
| 11 | Producer leaves feedback in Collection History |
| 12 | Admin verifies the pending collector |
| 13 | Try opening `/admin` as a collector → redirected (RBAC) |
| 14 | Check the notification bell for async events |

---

## 20. Troubleshooting

| Symptom | Fix |
| --- | --- |
| `[mysql] FATAL: could not connect` | Check MySQL is running and `MYSQL_*` in `backend/.env` are correct |
| `[mongo] could not connect` | Start MongoDB, or fix `MONGODB_URI`. The app still runs without it |
| `[rabbitmq] could not connect ... in-memory` | Start RabbitMQ, or fix `RABBITMQ_URL`. The app still works via the fallback bus |
| Login fails for seeded users | Run `npm run db:seed` and use password `Password123!` |
| Google button shows "not configured" | Set `VITE_GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_ID` |
| CORS error in the browser | Add your frontend origin to `CORS_ORIGIN` |
| Tables missing | Re-run `mysql -u root -p < database/schema.sql` |
| Collector cannot request pickups | An admin must verify the collector first |

---

## License

Educational project — free to use and modify for learning purposes.
