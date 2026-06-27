# SafeCommunityAI

SafeCommunityAI is a role-based emergency reporting and response platform with a React/Vite frontend and Spring Boot/PostgreSQL backend.

## Project Structure

- `backend/src/main/java/com/SafeCommunityAI/backend/config` - Spring configuration and seed data
- `backend/src/main/java/com/SafeCommunityAI/backend/controller` - REST controllers
- `backend/src/main/java/com/SafeCommunityAI/backend/dto` - API request/response DTOs
- `backend/src/main/java/com/SafeCommunityAI/backend/entity` - JPA entities
- `backend/src/main/java/com/SafeCommunityAI/backend/enums` - role/status/type enums
- `backend/src/main/java/com/SafeCommunityAI/backend/exception` - global API errors
- `backend/src/main/java/com/SafeCommunityAI/backend/mapper` - DTO mappers
- `backend/src/main/java/com/SafeCommunityAI/backend/repository` - Spring Data repositories
- `backend/src/main/java/com/SafeCommunityAI/backend/security` - JWT filter/service/user details
- `backend/src/main/java/com/SafeCommunityAI/backend/service` - service contracts
- `backend/src/main/java/com/SafeCommunityAI/backend/service/impl` - service implementations
- `frontend/client/pages` - route pages by role
- `frontend/client/components` - shared components and UI primitives
- `frontend/client/layouts` - layout exports
- `frontend/client/services/api` - typed backend API clients
- `frontend/client/hooks` - React hooks
- `frontend/client/types` - shared TypeScript API types
- `frontend/client/utils` - browser helpers
- `frontend/client/routes` - route constants
- `frontend/client/context` - auth context

## Local Setup

### Backend

Create a PostgreSQL database named `safecommunityai_db`, then run:

```powershell
cd backend
$env:DATABASE_URL='jdbc:postgresql://localhost:5432/safecommunityai_db'
$env:DATABASE_USERNAME='postgres'
$env:DATABASE_PASSWORD='postgres'
.\mvnw.cmd spring-boot:run
```

Backend defaults to `http://localhost:8082` and uses PostgreSQL for runtime and tests. The default database URL is `jdbc:postgresql://localhost:5432/safecommunityai_db`.

### Frontend

```powershell
cd frontend
$env:VITE_API_BASE_URL='http://localhost:8082/api'
npm run dev
```

Frontend defaults to `http://localhost:8080`.

## Seeded Test Accounts

All seeded users use password `demo123`.

- Citizen: `citizen@demo.com`
- Responder: `responder@demo.com`
- Dispatcher: `dispatcher@demo.com`
- Admin: `admin@demo.com`

## Main API Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/incidents`
- `POST /api/incidents/panic`
- `GET /api/incidents/mine`
- `GET /api/incidents/queue`
- `PATCH /api/incidents/{id}/status`
- `POST /api/dispatch/assignments`
- `GET /api/dispatch/assignments/mine`
- `PATCH /api/dispatch/assignments/{id}`
- `POST /api/locations/me`
- `GET /api/locations/markers`
- `GET /api/notifications`
- `GET /api/dashboard/me`
- `GET /api/resources`
- `POST /api/resources`
- `GET /api/hospitals`
- `POST /api/hospitals`
- `GET /api/admin/users`
- `GET /api/admin/audit-logs`
- `GET /api/admin/analytics`

JWT-protected endpoints require `Authorization: Bearer <token>`.


## Phone GPS Testing With Cloudflare Tunnel

Browser GPS works reliably on phones only from HTTPS origins. For local field testing, run the backend and frontend, then expose the frontend through Cloudflare Tunnel and let Vite proxy `/api` to Spring Boot.

```powershell
# Terminal 1: backend
cd backend
.\mvnw.cmd spring-boot:run

# Terminal 2: frontend, same-origin API through Vite proxy
cd frontend
$env:VITE_API_BASE_URL='/api'
$env:VITE_API_PROXY_TARGET='http://localhost:8082'
npm run dev -- --host 0.0.0.0

# Terminal 3: public HTTPS URL for phone testing
cloudflared tunnel --url http://localhost:8080
```

Open the generated `https://...trycloudflare.com` URL on the phone, log in as `citizen@demo.com` with `demo123`, allow location permission, then use **Send live GPS emergency alert**. The app stores the phone GPS point in PostgreSQL and dispatchers can see it on the Live Dispatch Map through `GET /api/locations/markers`.
## Verification

```powershell
cd backend
.\mvnw.cmd test

cd ..\frontend
npm run typecheck
npm run build:client
```
