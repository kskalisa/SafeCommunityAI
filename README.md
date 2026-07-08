# SafeCommunityAI

SafeCommunityAI is an emergency reporting and response platform for communities, dispatch teams, responders, and administrators. It helps people report emergencies with location details, lets dispatchers review and assign help, allows responders to share their real GPS position, and gives admins clear reports about what is happening in the system.

The project has two main parts:

- `backend`: Spring Boot API with PostgreSQL, JWT security, OTP login, role permissions, reporting, location tracking, and local emergency triage.
- `frontend`: React/Vite dashboard app with role-based screens for citizens, responders, dispatchers, and admins.

## What The System Does

SafeCommunityAI supports the full emergency response flow:

1. A citizen reports an emergency or sends a quick SOS alert.
2. The backend stores the report, location, attachments, and urgency details.
3. The local triage engine suggests urgency and support needs for human review.
4. Dispatchers see incoming reports, responder availability, support options, hospitals, and map markers.
5. Dispatchers assign a responder and track the response progress.
6. Responders view their assigned work, update their status, open directions, and share their real GPS location.
7. Admins manage users, review activity history, and download reports for today, weekly, monthly, yearly, or custom views.

## User Roles

### Citizen

Citizens can:

- Create emergency reports with type, description, location, witness count, and attachments.
- Send panic/SOS reports using browser GPS when permission is granted.
- View their own reports and progress.
- Save emergency contacts.
- View safety guidance and nearby report/map information.

### Responder

Responders can:

- See assigned emergency work.
- Update response progress, such as on the way or arrived.
- Share their current GPS location so dispatchers can see them on the live map.
- Open directions to an assigned report.
- Review assignment history and performance screens.

### Dispatcher

Dispatchers can:

- View the emergency queue.
- Review suggested responders and support options.
- Assign responders to reports.
- Track live report markers, responders with shared GPS, hospitals, and resources on the map.
- Send notifications and coordinate response messages.
- Download report documents and spreadsheets.

### Admin

Admins can:

- Manage users and create admin accounts.
- Review all emergency reports.
- View system activity history.
- Manage facilities and support resources.
- Use the report page to filter by today, weekly, monthly, yearly, or all time.
- Export selected reports or full report views as documents/spreadsheets.

## Main Features

- Role-based dashboards for citizen, responder, dispatcher, and admin users.
- JWT-protected API with email one-time-password login.
- PostgreSQL persistence through Spring Data JPA.
- Emergency reports with attachments and GPS coordinates.
- Responder GPS sharing with consent.
- Live dispatch map using real report and responder location data.
- Dispatcher assignment workflow and responder status updates.
- Hospital and support resource management.
- Admin reports and dispatcher reports with time-period filters.
- PDF-style document download and spreadsheet export.
- Audit history for important account and system actions.
- Local emergency triage engine that runs inside the backend without an external AI API.

## Tech Stack

### Backend

- Java 17
- Spring Boot
- Spring Security
- Spring Data JPA
- PostgreSQL
- Maven wrapper
- JWT authentication

### Frontend

- React 18
- Vite
- TypeScript
- Tailwind CSS
- TanStack Query
- Recharts
- Lucide icons

## Project Structure

```text
backend/
  src/main/java/com/SafeCommunityAI/backend/
    config/        Spring configuration and seed data
    controller/    REST API controllers
    dto/           API request and response records
    entity/        JPA database entities
    enums/         Roles, statuses, and report types
    exception/     API error handling
    mapper/        Entity-to-response mapping
    repository/    Spring Data repositories
    security/      JWT and security configuration
    service/       Service contracts and implementations
  src/main/resources/application.properties

frontend/
  client/components/    Shared UI and map components
  client/context/       Authentication context
  client/hooks/         React hooks
  client/lib/           Export helpers and shared utilities
  client/pages/         App pages grouped by role
  client/routes/        Route constants
  client/services/api/  Typed API clients
  client/types/         Shared TypeScript API types
  client/utils/         Browser helpers
```

## Requirements

Install these before running locally:

- Java 17 or newer
- Node.js 18 or newer
- npm
- PostgreSQL

## Backend Setup

Create a PostgreSQL database named `safecommunityai_db`.

From PowerShell:

```powershell
cd backend
$env:DATABASE_URL='jdbc:postgresql://localhost:5432/safecommunityai_db'
$env:DATABASE_USERNAME='postgres'
$env:DATABASE_PASSWORD='postgres'
.\mvnw.cmd spring-boot:run
```

The backend runs at:

```text
http://localhost:8082
```

The API base URL is:

```text
http://localhost:8082/api
```

### Backend Environment Variables

The backend reads `.env` values automatically through `application.properties`.

Common settings:

```text
SERVER_PORT=8082
DATABASE_URL=jdbc:postgresql://localhost:5432/safecommunityai_db
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
JPA_DDL_AUTO=update
JWT_SECRET=change-this-secret-for-real-use
JWT_EXPIRATION_MS=86400000
CORS_ALLOWED_ORIGINS=http://localhost:8080,http://localhost:8081,http://localhost:5173
OTP_EMAIL_ENABLED=false
OTP_EMAIL_FROM=no-reply@safecommunityai.local
MAIL_HOST=localhost
MAIL_PORT=587
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_SMTP_AUTH=false
MAIL_SMTP_STARTTLS=true
MAX_UPLOAD_FILE_SIZE=50MB
MAX_UPLOAD_REQUEST_SIZE=120MB
```

When `OTP_EMAIL_ENABLED=false`, the backend can still generate login OTP codes without sending real email. Enable email settings when connecting to a real SMTP provider.

## Frontend Setup

From PowerShell:

```powershell
cd frontend
npm install
$env:VITE_API_BASE_URL='http://localhost:8082/api'
npm run dev
```

The frontend normally runs at:

```text
http://localhost:8080
```

If Vite chooses another port, use the URL shown in the terminal.

## Seeded Demo Accounts

On the first backend run, the database is seeded when there are no users yet.

All demo accounts use this password:

```text
demo123
```

| Role | Email |
| --- | --- |
| Admin | `admin@demo.com` |
| Citizen | `citizen@demo.com` |
| Responder | `responder@demo.com` |
| Dispatcher | `dispatcher@demo.com` |

The first admin is created directly by the seed process so the system can start cleanly. Normal public registration still cannot create admin accounts; admin users must be created from an existing admin account.

## Login Flow

1. Enter email and password.
2. The backend verifies the password.
3. A one-time password is generated.
4. The user enters the one-time password.
5. The frontend stores the returned session token in browser session storage.
6. Protected API calls use `Authorization: Bearer <token>`.

## Location And Map Behavior

Location sharing is consent-based.

- Citizens can send GPS coordinates with emergency reports.
- Responders can use **Share GPS now** to send their real current position.
- Dispatchers can see report markers, responder positions, hospitals, and resources on the live map.
- The map uses real backend data. It should not depend on mocked responder locations when responders have not shared GPS.

Browser GPS works best on HTTPS origins. Localhost is allowed by most browsers, but phones usually need HTTPS.

## Phone GPS Testing With Cloudflare Tunnel

For phone testing, run the backend and frontend locally, then expose the frontend through HTTPS.

```powershell
# Terminal 1: backend
cd backend
.\mvnw.cmd spring-boot:run

# Terminal 2: frontend with same-origin API proxy
cd frontend
$env:VITE_API_BASE_URL='/api'
$env:VITE_API_PROXY_TARGET='http://localhost:8082'
npm run dev -- --host 0.0.0.0

# Terminal 3: public HTTPS tunnel
cloudflared tunnel --url http://localhost:8080
```

Open the generated `https://...trycloudflare.com` URL on the phone, log in, allow location permission, and send a GPS report or responder location update.

## Reports And Exports

The admin and dispatcher report pages support time-based views:

- Today
- Weekly
- Monthly
- Yearly
- Custom or all-time views where available

Reports can be downloaded as:

- Spreadsheet files for tabular data
- Document files for readable summaries and report lists

Report pages use simple user-facing wording such as report, progress, urgency, support options, and system certainty.

## Local Emergency Triage

The backend includes a local triage engine. It does not require OpenAI, a paid API key, or network access.

When a report is created or updated, the backend reviews details such as:

- Report type
- Severity text
- Description keywords
- GPS availability
- Witness information
- Attachments

It stores a suggested urgency, confidence score, explanation, and support suggestion. Dispatchers and admins can review this information, but humans remain responsible for operational decisions.

## Useful API Areas

All protected endpoints require a JWT bearer token.

### Authentication

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/login/verify-otp`

### Emergency Reports

- `POST /api/incidents`
- `POST /api/incidents/panic`
- `GET /api/incidents/mine`
- `GET /api/incidents/queue`
- `PUT /api/incidents/{id}`
- `DELETE /api/incidents/{id}`
- `PATCH /api/incidents/{id}/status`
- `POST /api/incidents/{id}/attachments`
- `GET /api/incidents/attachments/{id}/download`

### Dispatch

- `POST /api/dispatch/assignments`
- `GET /api/dispatch/assignments/mine`
- `GET /api/dispatch/recommendations/{incidentId}`
- `GET /api/dispatch/assignments/{id}/route`
- `PATCH /api/dispatch/assignments/{id}`
- `GET /api/dispatch/assignments/{id}/messages`
- `POST /api/dispatch/assignments/{id}/messages`

### Locations

- `POST /api/locations/me`
- `GET /api/locations/markers`
- `GET /api/locations/history/me`

### Admin

- `GET /api/admin/users`
- `POST /api/admin/users`
- `PUT /api/admin/users/{id}`
- `PATCH /api/admin/users/{id}/status`
- `GET /api/admin/audit-logs`
- `GET /api/admin/incidents`
- `GET /api/admin/analytics`

### Reports, Resources, Hospitals, Notifications

- `GET /api/reports/analytics`
- `GET /api/resources`
- `POST /api/resources`
- `PUT /api/resources/{id}`
- `DELETE /api/resources/{id}`
- `GET /api/hospitals`
- `POST /api/hospitals`
- `PUT /api/hospitals/{id}`
- `POST /api/hospitals/{id}/notify`
- `GET /api/notifications`
- `POST /api/notifications`
- `GET /api/dashboard/me`
- `GET /api/users/responders`
- `GET /api/users/responders/details`
- `GET /api/emergency-contacts`
- `POST /api/emergency-contacts`
- `PUT /api/emergency-contacts/{id}`
- `DELETE /api/emergency-contacts/{id}`

## Verification Commands

Backend compile:

```powershell
cd backend
.\mvnw.cmd -DskipTests compile
```

Backend tests:

```powershell
cd backend
.\mvnw.cmd test
```

Frontend typecheck and production build:

```powershell
cd frontend
npm run typecheck
npm run build
```

## Notes For Real Deployment

Before using this system outside local development:

- Change `JWT_SECRET` to a strong private value.
- Use a secure PostgreSQL database and real credentials.
- Configure HTTPS for the frontend and backend.
- Configure a real mail provider for OTP email delivery.
- Review CORS origins and allow only trusted frontend URLs.
- Review data privacy requirements for storing GPS locations and emergency information.
- Replace demo accounts and demo seed data with production onboarding.
