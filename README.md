# Personal Loan Application Portal

A full-stack loan application portal built with React, NestJS, TypeScript, MySQL, Prisma, and Nx. Customers can submit and track personal loan applications, while administrators can review applications and filter results by status.

## Features

### Customer
- Register and sign in with email and password.
- Submit a personal loan application with Malaysian applicant details.
- Load loan purposes from the backend.
- View previously submitted applications and their status.
- Receive credit-check status updates without refreshing the page through Server-Sent Events (SSE).

### Administrator
- Sign in using the seeded administrator account.
- View all loan applications.
- Filter by Pending, Approved, and Rejected status.
- Browse paginated results.
- Open an application to inspect applicant and loan details.

### Backend
- JWT-based authentication and role-based access control.
- Request validation using DTOs and `class-validator`.
- Password hashing with bcrypt.
- Prisma ORM with MySQL.
- Simulated external loan-purpose service with a delay and server-side caching.
- Asynchronous simulated credit checks with SSE status notifications.
- Seed script for 250 demo customers and 10,000 demo applications.

## Technology stack

| Area | Technology |
|---|---|
| Monorepo | Nx |
| Frontend | React, TypeScript, Vite |
| Backend | NestJS, TypeScript |
| Database | MySQL |
| ORM | Prisma |
| Authentication | JWT, Passport, bcrypt |
| Validation | class-validator, class-transformer |
| Live updates | Server-Sent Events (SSE) |
| Local infrastructure | Docker |

## Prerequisites

- Node.js 20 or a compatible supported Node.js version
- npm
- Docker Desktop
- A local MySQL database, or the MySQL service defined by the project's Docker Compose configuration

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example environment file:

```bash
cp .env.example .env
```

Set the required variables in `.env`:

```dotenv
MYSQL_DATABASE=loan_portal
MYSQL_USER=loan_app
MYSQL_PASSWORD=replace-with-a-local-password
MYSQL_ROOT_PASSWORD=replace-with-a-local-root-password

DATABASE_URL="mysql://loan_app:replace-with-a-local-password@127.0.0.1:3306/loan_portal"

JWT_SECRET=replace-with-a-long-random-secret
ADMIN_NAME=Portal Administrator
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=replace-with-a-strong-local-password

SEED_CUSTOMER_PASSWORD=CustomerDemo123!
```

Ensure the credentials in `DATABASE_URL` match the MySQL configuration. Do not commit `.env` or production secrets.

### 3. Start MySQL

Start the project's configured database service:

```bash
docker compose up -d
```

Wait until MySQL is healthy before continuing. If the Compose file does not manage MySQL, start your local MySQL instance separately.

### 4. Apply database migrations and seed data

Apply the checked-in migrations:

```bash
npx prisma migrate deploy --config prisma7.config.ts
```

Seed the administrator, loan purposes, demo customers, and demo applications:

```bash
npx prisma db seed --config prisma7.config.ts
```

The seed creates 10,000 demo applications across 250 dedicated demo customers. Re-running it replaces the demo customers' applications while preserving applications belonging to other users.

### 5. Start the API

In a terminal:

```bash
npx nx serve api
```

The API is expected at `http://localhost:3000/api`.

Check the database connection:

```bash
curl http://localhost:3000/api/health/database
```

### 6. Start the frontend

In another terminal:

```bash
npx nx serve web
```

Open the URL printed by Nx in the terminal. If the frontend runs on a port other than the configured CORS origins, update the API CORS configuration accordingly and restart the API.

## Demo accounts

### Administrator

Use the `ADMIN_EMAIL` and `ADMIN_PASSWORD` values configured in your local `.env`.

### Customer

- Email: `seed.customer.001@example.com`
- Password: `SEED_CUSTOMER_PASSWORD`, or `CustomerDemo123!` if the variable is not set.

All seeded customers share the configured demo password. These accounts and passwords are intended for local assessment use only.

## API overview

All routes below are prefixed with `/api`.

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/auth/register` | Public | Register a customer |
| POST | `/auth/login` | Public | Sign in and receive a JWT |
| GET | `/loan-purposes` | Public | Retrieve loan purposes |
| POST | `/loan-applications` | Customer | Submit an application |
| GET | `/loan-applications/mine` | Customer | List own applications |
| GET | `/loan-applications/mine/:id` | Customer | View own application |
| GET | `/loan-applications/events` | Authenticated | Receive status updates via SSE |
| GET | `/loan-applications` | Admin | List and filter applications |
| GET | `/loan-applications/:id` | Admin | View application details |

The admin list endpoint supports pagination and status filtering:

```text
GET /api/loan-applications?page=1&pageSize=25
GET /api/loan-applications?status=PENDING&page=1&pageSize=25
GET /api/loan-applications?status=APPROVED&page=2&pageSize=25
```

Authenticated endpoints require:

```text
Authorization: Bearer <JWT>
```

## Design decisions and trade-offs

### Monorepo
Nx keeps the frontend and backend in one repository, making the assessment easier to run and maintain. It also provides consistent project commands and a path toward shared types or utilities.

### Authentication and authorization
Passwords are hashed with bcrypt and never returned in API responses. JWTs identify the authenticated user, and backend guards enforce customer/admin access. The backend derives the customer identity from the authenticated session rather than trusting a client-supplied user ID.

### Loan purposes
The external core-banking integration is simulated by a fixed list, a two-second delay, and a cache. The cache avoids repeatedly paying the simulated latency for reference data that rarely changes. A production integration should add explicit timeouts, retries where appropriate, monitoring, and a fallback policy.

### Asynchronous credit checks
Applications are initially saved as `PENDING`. A background timer simulates a credit check, and the API emits a status event over SSE. This is suitable for demonstrating asynchronous updates within one running process. It is not a durable job-processing design: a process restart can lose scheduled timers. A production system should use a durable queue or workflow engine and persist job state.

### Database access and pagination
The admin listing uses server-side pagination and status filtering, avoiding the need to load the entire dataset into the browser. Indexes support common lookups by applicant, status, purpose, and creation time.

### Scope and production limitations
The credit decision is simulated and must not be used for actual lending decisions. The demo does not integrate with a real identity verification or credit bureau service. Before production use, add rate limiting, stronger audit trails, privacy controls, robust session/token lifecycle management, durable background processing, operational monitoring, and appropriate security and compliance reviews.

## Verification

Build both projects:

```bash
npx nx build api
npx nx build web
```

Useful manual checks:

1. Register a customer and sign in.
2. Submit a loan application and confirm it starts as `PENDING`.
3. Observe the status update through SSE without refreshing.
4. Sign in as the administrator.
5. Check the status filters and application detail panel.
6. Navigate between pages of the seeded dataset.
7. Confirm a customer cannot access admin-only endpoints or another customer's application.

## Additional documentation

See [AI_USAGE.md](AI_USAGE.md) for a summary of AI-assisted development, changes made during implementation, and suggestions that were adapted or not adopted.