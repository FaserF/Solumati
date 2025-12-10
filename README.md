# Solumati - Find Your Match ❤️

[![GitHub release (latest by date)](https://img.shields.io/github/v/release/FaserF/Solumati?color=pink&label=Latest%20Release)](https://github.com/FaserF/Solumati/releases/latest)
[![GitHub License](https://img.shields.io/github/license/FaserF/Solumati?color=blue)](LICENSE.md)
[![Docker Build](https://img.shields.io/github/actions/workflow/status/FaserF/Solumati/docker-publish.yml?label=Docker%20Build)](https://github.com/FaserF/Solumati/actions/workflows/docker-publish.yml)
[![Android Build](https://img.shields.io/github/actions/workflow/status/FaserF/Solumati/android-release.yml?label=Android%20Build)](https://github.com/FaserF/Solumati/actions/workflows/android-release.yml)

**Solumati** is a modern, open-source dating platform designed to bring people together. Whether you're looking for true love, a casual fling, or just new friends, Solumati helps you connect with people nearby in a transparent and secure environment.

<img src="https://github.com/FaserF/Solumati/raw/main/frontend/public/logo/Solumati.png" alt="Solumati Preview" width="200" />

---

## ✨ Features

*   **❤️ Smart Matching:** Algorithms that connect you with people who truly fit your vibe.
*   **🔭 Discover Mode:** Swipe through profiles to find your next match.
*   **📱 Native Android App:** Enhanced mobile experience with a dedicated TWA (Trusted Web Activity) Android app.
*   **🛡️ Security First:** Two-Factor Authentication (2FA) and Passkey support.
*   **🎨 Modern UI:** Sleek, responsive design with Dark Mode support.
*   **👀 Guest Access:** Try out limited features without creating an account.

---

## 📱 Android App

Solumati is available as a native Android application!
You can download the latest APK from our **[Releases Page](https://github.com/FaserF/Solumati/releases/latest)**.

The app provides a full-screen immersive experience and is built using Bubblewrap (TWA).

---

## 🛠️ For Developers

Welcome to the technical side of Solumati! This project is a full-stack web application built with modern technologies.

### Technology Stack
*   **Frontend:** React (Vite), TailwindCSS, Lucide Icons
*   **Backend:** Python (FastAPI), SQLAlchemy (SQLite/PostgreSQL)
*   **Mobile:** Android TWA (Bubblewrap)
*   **Containerization:** Docker & Docker Compose

### Getting Started

#### Option A: Running with Docker (Recommended)
The easiest way to run the entire stack is using Docker Compose.

```bash
docker-compose up --build -d
```

This will start:
*   **Frontend:** http://localhost:3000
*   **Backend:** http://localhost:7777

#### Option B: Local Development (Manual)

If you prefer to run services individually without Docker:

**1. Backend Setup**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 7777
```

**2. Frontend Setup**
```bash
cd frontend
npm install
npm run dev
```

#### Option C: Home Assistant Addon
Solumati is also available as a Home Assistant Addon!
Check out the repository here: **[Solumati Addon](https://github.com/FaserF/hassio-addons/tree/master/solumati)**

---

### ⚙️ Configuration

#### OAuth (Social Login)
To enable login via GitHub, Google, or Microsoft, set the following environment variables in the Admin Console:
*   `GITHUB_CLIENT_ID` & `GITHUB_CLIENT_SECRET`
*   `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`
*   `MICROSOFT_CLIENT_ID` & `MICROSOFT_CLIENT_SECRET`

#### Android Release Signing & Configuration
To enable secure and persistent signing for Android releases, you can set the following secrets in your GitHub repository (**Settings** -> **Secrets and variables** -> **Actions**).

| Secret Name | Description | Default (if not set) |
| :--- | :--- | :--- |
| `ANDROID_KEYSTORE_BASE64` | Base64 encoded content of your `.jks` or `.keystore` file. | A new keystore is generated |
| `ANDROID_KEYSTORE_PASSWORD` | Password for the keystore. | `RepoName` + 15 random chars (Cached) |
| `ANDROID_KEY_ALIAS` | Alias of the signing key. | `android` |
| `ANDROID_KEY_PASSWORD` | Password for the signing key. | Same as `ANDROID_KEYSTORE_PASSWORD` |

**Note on Defaults:**
If you do not provide these secrets, the workflow will automatically generate a secure random password and a new keystore for you. These are **cached** (`android-keystore.jks` and `keystore.pwd`) by GitHub Actions so that future builds use the same signing key, allowing app updates to work. However, if the cache is cleared, you will lose the ability to update existing installations of your app. For production apps, setting the secrets manually is highly recommended.

#### Testing
*   **Test Mode:** Set `TEST_MODE=true` in backend environment variables to enable debug features.

---

### 📄 License
Solumati is open-source software licensed under the [GNU Affero General Public License v3.0](LICENSE.md).