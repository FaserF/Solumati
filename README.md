# Solumati - Find Your Match ❤️

[![GitHub release (latest by date)](https://img.shields.io/github/v/release/FaserF/Solumati?color=pink&label=Latest%20Release)](https://github.com/FaserF/Solumati/releases/latest)
[![GitHub License](https://img.shields.io/github/license/FaserF/Solumati?color=blue)](LICENSE.md)
[![Docker Build](https://img.shields.io/github/actions/workflow/status/FaserF/Solumati/docker-publish.yml?label=Docker%20Build)](https://github.com/FaserF/Solumati/actions/workflows/docker-publish.yml)
[![Release Pipeline](https://img.shields.io/github/actions/workflow/status/FaserF/Solumati/release.yml?label=Release%20Pipeline)](https://github.com/FaserF/Solumati/actions/workflows/release.yml)

**Solumati** is a modern, open-source dating platform designed to bring people together. Whether you're looking for true love, a casual fling, or just new friends, Solumati helps you connect with people nearby in a transparent and secure environment.

<img src="https://github.com/FaserF/Solumati/raw/main/frontend/public/logo/Solumati.png" alt="Solumati Preview" width="200" />

> [!WARNING]
> **Active Development / Beta**
>
> This project is currently in **heavy development** and is considered **BETA/NIGHTLY** software.
> While many features are functional, it may contain bugs, incomplete features, or breaking changes.
> **It is NOT recommended for production use until a stable release is available.**

---

## ✨ Features

*   🤖 **Unique Matching Algorithm:** Connects users based on deep compatibility calculations using weighted questions.
*   💬 **Encrypted Chat:** End-to-end encrypted messaging with support for transient (guest) and persistent conversations.
*   🎫 **Support Integration:** Direct chat with support staff, including **email forwarding** for offline notifications.
*   🛡️ **Comprehensive Admin Panel:** Modern, responsive interface (Dark Mode supported!) for user management, reports, and system configuration.
*   📲 **Native App Support:** Optimized for Android (TWA) with PWA capabilities and other platforms.
*   **🛡️ Security First:** Two-Factor Authentication (2FA) and Passkey support.
*   **🎨 Modern UI:** Sleek, responsive design with Dark Mode support.
*   **👀 Guest Access:** Try out limited features without creating an account.

---

## 📱 Native Apps

Solumati is available as a native application for Android, iOS, and Windows!
You can download the latest releases from our **[Releases Page](https://github.com/FaserF/Solumati/releases/latest)**.

### Android (APK)
The Android app is built using Bubblewrap (TWA) and provides a full-screen immersive experience.
**Installation:**
1. Download the `solumati-release.apk` file.
2. Open the file on your smartphone.
3. If prompted, allow installation from "Unknown Sources" in your settings.
4. Follow the installation prompts.

### iOS (IPA)
The iOS app allows you to run Solumati as a native app on your iPhone or iPad.
**Installation (via AltStore):**
1. Download the `solumati-release.ipa` file.
2. Ensure you have **[AltStore](https://altstore.io/)** (or SideStore/Sideloadly) installed on your device.
3. Open AltStore on your device.
4. Tap the "+" button in the "My Apps" tab.
5. Select the downloaded `.ipa` file.
6. AltStore will sign and install the app for you (requires refreshing every 7 days).

### Windows (UWP)
The Windows app provides a native desktop experience.
**Installation:**
1. Download the `solumati-release.msixbundle` file.
2. **Important:** Since the app is self-signed, you may need to enable **Developer Mode** in Windows Settings > Update & Security > For developers.
3. Double-click the `.msixbundle` file.
4. Click "Install".

---

## 🛠️ For Developers

Welcome to the technical side of Solumati! This project is a full-stack web application built with modern technologies.

### Technology Stack
*   **Frontend:** React (Vite), TailwindCSS, Lucide Icons
*   **Backend:** Python (FastAPI), SQLAlchemy (SQLite/PostgreSQL)
*   **Apps:** Android (TWA), iOS (WebView), Windows (UWP)
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
uvicorn app.main:app --reload --port 7777
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
Enable login via GitHub, Google, or Microsoft by configuring the client IDs and secrets in the Admin Console.

➡️ **[Detailed OAuth Setup Guide](docs/OAUTH_SETUP.md)**

*   `GITHUB_CLIENT_ID` & `GITHUB_CLIENT_SECRET`
*   `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`
*   `MICROSOFT_CLIENT_ID` & `MICROSOFT_CLIENT_SECRET`

#### 🤖 CAPTCHA
Protect your instance from bots and brute-force attacks by enabling CAPTCHA (Cloudflare Turnstile, reCAPTCHA, or hCaptcha).

➡️ **[Detailed Captcha Setup Guide](docs/CAPTCHA_SETUP.md)**

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

#### Marketing Page
*   **Enable Marketing Page:** Set `ENABLE_MARKETING_PAGE=true` to enable the public-facing promotional page and "More Info" link.

#### Testing
*   **Test Mode:** Set `TEST_MODE=true` in backend environment variables to enable debug features.

#### Logging & Secrets
*   **Log Level:** You can configure the logging verbosity by setting the `LOG_LEVEL` environment variable (e.g., in `docker-compose.yml`).
    *   **Allowed Values:** `DEBUG`, `INFO` (Default), `WARNING`, `ERROR`, `CRITICAL`.
*   **Password Visibility:**
    *   Critical secrets, such as the **Initial Admin Password** and **Emergency Reset Tokens**, are **always printed** to the standard output (terminal/Docker logs) for visibility, regardless of the configured `LOG_LEVEL`.
    *   This ensures that you can always retrieve access credentials during initial setup or emergency recovery, even if logging is set to `ERROR`.

### 🧪 Manual CI Test Execution

To ensure your code meets the quality standards before pushing, you can run the Continuous Integration (CI) checks manually on your local machine.

#### Prerequisites
Ensure you have the following installed on your PC:
*   **Python 3.10+**: [Download Python](https://www.python.org/downloads/)
*   **Node.js 18+ & npm**: [Download Node.js](https://nodejs.org/)
*   **Git**: [Download Git](https://git-scm.com/)

#### 1. Backend Tests
The backend uses `pytest` for testing.

```bash
# Navigate to root directory
pip install -r backend/requirements.txt
python -m pytest backend/tests
```

#### 2. Frontend Linting
The frontend uses `ESLint` (v9) to enforce code quality.

```bash
cd frontend
npm install
npm run lint
```

#### 3. Translation Synchronization
Ensure that the German (`de.json`) and English (`en.json`) translation files are synchronized.

```bash
# From root directory
python backend/tests/check_i18n.py
```


---

### 📄 License
Solumati is open-source software licensed under the [GNU Affero General Public License v3.0](LICENSE.md).