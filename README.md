# Solumati - The Anti-Swipe Revolution

Solumati (derived from "Soulmate") is an open source dating platform focused on meaningful matches, privacy, and data sovereignty. The app emphasizes personality and long-term compatibility instead of surface-level swiping.

Kurze Zusammenfassung für Endnutzer (Deutsch):
- Solumati ist eine Open-Source-Datingplattform, die auf Persönlichkeit statt Swipes setzt. Die Plattform ist datenschutzfreundlich und kann selbst gehostet werden.

## For End Users (Quick, non-technical)
- Purpose: Matches are calculated using a multi-question compatibility algorithm rather than simple swipes.
- Core principles: privacy-first, self-hostable, minimal gamification, and respectful intent-based matching.
- What to expect in the PWA: onboarding questions, profile matching, messaging limited to encourage real connection, and clear privacy controls.

Modern dating apps have commodified human connection. Solumati aims to fix this:

- No Swiping: Matches are based on a 20+ question compatibility algorithm.
- Intent-Based: Strict separation between "Long-term" and "Casual" searches.
- Decelerated Dating: Max 3 active chats.
- The "7000 Rule": After 7000 messages, you MUST exchange contact info or part ways.
- Privacy First: Self-hostable. Your data belongs to you.

## Quick Demo / Try It Locally (non-technical)
1. Clone the repo:
   git clone https://github.com/FaserF/Solumati.git
   cd Solumati
2. (Optional) Rename .env.example to .env and review settings.
3. Build and start with Docker Compose:
   docker-compose up -d --build
4. Open the frontend: http://localhost:3000
   API docs (interactive): http://localhost:7777/docs

Note: If you do not want to run Docker, see the Development section below.

---

## Technical / Self-Hosting Guide
This section is intended for operators and contributors who need to deploy or develop Solumati.

### Prerequisites
- Docker and Docker Compose (v1.27+/v2+)
- Git

### Important design note
All persistent application data is stored in PostgreSQL. The webapp itself does not keep user data on the container filesystem. Use the provided Docker volume (postgres_data) or an external database to ensure data durability. The backend will wait for the database to be reachable before completing startup.

### Environment variables
The project uses environment variables to configure the services. Key variables include:
- POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB (for DB container)
- DATABASE_URL (backend connection string, e.g. postgresql://user:pass@db:5432/solumatidb)
- TEST_MODE (true/false) — when true, backend enables additional test data and verbose logging
- LOG_FILE (optional) — file path for backend logs (default: app.log in container)
- LANG (optional) — forwarded into containers to allow automatic UI language detection

Do not store secrets in Git. Use .env or your container orchestrator's secret mechanisms for production.

### Run (Docker Compose)
- Build and start: docker-compose up -d --build
- Follow logs: docker-compose logs -f backend
- Stop: docker-compose down

The docker-compose configuration forwards the host LANG environment variable into the containers when available to help automatic language selection.

### Health and readiness
- API health endpoint: GET /health (http://localhost:7777/health)
  This checks TCP connectivity to the configured DATABASE_URL and returns 200 when the DB is reachable.
- The backend includes a small wait-for-db helper used at container start to avoid starting the app before the DB is reachable.

### API endpoints for the frontend
- GET /api/i18n — list available UI languages
- GET /api/i18n/{lang} — fetch the translations JSON for the PWA to use

The frontend should fetch translations on startup and not hardcode language strings in the application code.

### Test Mode
Set TEST_MODE=true in the backend environment to:
- Populate sample/dummy data for development (e.g. 20 dummy users)
- Enable additional console logging for debugging
Only use TEST_MODE in development or test environments.

### Logging behavior
- The backend writes logs to console and to a file.
- Terminal-only progress output (e.g. progress bars from external installers or tools) is kept on the console but filtered out from log files. The logger records concise download start and finish messages in the log file so the logs remain readable and useful.

### Internationalization (i18n)
- UI translations are stored in backend/i18n/*.json (for example en.json and de.json).
- The backend exposes these translations via the /api/i18n endpoints so the PWA can load translations dynamically.
- To add a language: create a new JSON file (e.g. fr.json) in backend/i18n, commit, and it becomes available to the application.

### Security & Privacy
- Solumati is intended to be self-hosted: you control user data when you run your own instance.
- For production deployments, secure your instance with HTTPS, use strong database credentials, limit public access to administrative endpoints, and follow best practices for container security.

### Development notes
- The backend runs with uvicorn in development mode and will auto-reload when code changes are mounted.
- Frontend development uses Vite; mount the frontend into the container for hot-reload during local development.

### Contributing
- Translations: add or improve JSON files under backend/i18n.
- Code: open pull requests, add tests where applicable, and follow standard git practices.

---

## License
Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)
You are free to copy and redistribute the material in any medium or format, adapt, remix, transform, and build upon the material.
Conditions:

- Attribution: You must give appropriate credit to the original creator (FaserF).
- NonCommercial: You may not use the material for commercial purposes.
- ShareAlike: If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

Built with ❤️ by FaserF to fix dating.