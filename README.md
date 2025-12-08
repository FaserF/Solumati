# Solumati - Find Your Match ❤️

**Solumati** is a modern dating platform designed to bring people together. Whether you're looking for true love, a casual fling, or just new friends, Solumati helps you connect with people nearby.

## What is Solumati?

Solumati isn't just another dating app; it's a community. We believe in transparency and real connections.
With our intuitive interface, you can manage your profile, define what you are looking for, and start discovering interesting people immediately.

### Key Features
*   **Smart Matching:** Our algorithm helps you find people who truly fit you based on your answers and interests.
*   **Discover Mode:** Swipe through profiles to find your next match.
*   **Detailed Profiles:** Share more about yourself with a customizable "About Me" and Intent section.
*   **Guest Access:** Just curious? Try out our limited Guest Mode without an account!
*   **Security First:** We prioritize your data with optional features like Two-Factor Authentication.

---

## 🛠️ For Developers

Welcome to the technical side of Solumati! This project is a full-stack web application built with modern technologies.

### Technology Stack
*   **Frontend:** React (Vite), TailwindCSS, Lucide Icons
*   **Backend:** Python (FastAPI), SQLAlchemy (SQLite/PostgreSQL)
*   **Containerization:** Docker & Docker Compose

### Getting Started

#### Prerequisites
*   [Docker](https://www.docker.com/) & Docker Compose
*   *Alternatively just Python 3.9+ and Node.js 18+ for local non-docker dev.*

#### Running with Docker (Recommended)
The easiest way to run the entire stack is using Docker Compose.

```bash
docker-compose up --build
```

This will start:
*   **Backend:** http://localhost:8000
*   **Frontend:** http://localhost:3000

#### Local Development (Manual)

**Backend:**
1.  Navigate to `backend/`.
2.  Install dependencies: `pip install -r requirements.txt`
3.  Run the server:
    ```bash
    uvicorn main:app --reload
    ```

**Frontend:**
1.  Navigate to `frontend/`.
2.  Install dependencies: `npm install`
3.  Start the dev server:
```
# Solumati - Find Your Match ❤️

**Solumati** is a modern dating platform designed to bring people together. Whether you're looking for true love, a casual fling, or just new friends, Solumati helps you connect with people nearby.

## What is Solumati?

Solumati isn't just another dating app; it's a community. We believe in transparency and real connections.
With our intuitive interface, you can manage your profile, define what you are looking for, and start discovering interesting people immediately.

### Key Features
*   **Smart Matching:** Our algorithm helps you find people who truly fit you based on your answers and interests.
*   **Discover Mode:** Swipe through profiles to find your next match.
*   **Detailed Profiles:** Share more about yourself with a customizable "About Me" and Intent section.
*   **Guest Access:** Just curious? Try out our limited Guest Mode without an account!
*   **Security First:** We prioritize your data with optional features like Two-Factor Authentication.

---

## 🛠️ For Developers

Welcome to the technical side of Solumati! This project is a full-stack web application built with modern technologies.

### Technology Stack
*   **Frontend:** React (Vite), TailwindCSS, Lucide Icons
*   **Backend:** Python (FastAPI), SQLAlchemy (SQLite/PostgreSQL)
*   **Containerization:** Docker & Docker Compose

### Getting Started

#### Prerequisites
*   [Docker](https://www.docker.com/) & Docker Compose
*   *Alternatively just Python 3.9+ and Node.js 18+ for local non-docker dev.*

#### Running with Docker (Recommended)
The easiest way to run the entire stack is using Docker Compose.

```bash
docker-compose up --build
```

This will start:
*   **Backend:** http://localhost:8000
*   **Frontend:** http://localhost:3000

#### Local Development (Manual)

**Backend:**
1.  Navigate to `backend/`.
2.  Install dependencies: `pip install -r requirements.txt`
3.  Run the server:
    ```bash
    uvicorn main:app --reload
    ```

**Frontend:**
1.  Navigate to `frontend/`.
2.  Install dependencies: `npm install`
3.  Start the dev server:
    ```bash
    npm run dev
    ```

### Testing
*   **Guest Mode:** You can log in as a Guest to test basic UI features without registering.
*   **Test Mode:** Set `TEST_MODE=true` in backend environment to enable debug banners.

### OAuth Configuration
To enable login via GitHub, Google, or Microsoft, set the following environment variables (e.g., in `docker-compose.yml`):

*   `GITHUB_CLIENT_ID` & `GITHUB_CLIENT_SECRET`
*   `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`
*   `MICROSOFT_CLIENT_ID` & `MICROSOFT_CLIENT_SECRET`

If configured, these options will appear on the login and register pages. Registration via password can be disabled in the Admin Panel.

### License
Solumati is open-source software.
```