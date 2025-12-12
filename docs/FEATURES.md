# Solumati - Feature Overview
**Version:** v2025.12.2-b6
**Date:** 2025-12-12

Welcome to the detailed feature documentation for **Solumati**. This document provides an in-depth look at the functionalities available in the current version of the platform, ranging from user experience features to administrative controls.

---

## 👤 User Experience & Accounts

### Registration & Login
*   **Sign Up:** Users can register with a unique username and email address. Standard email verification (if enabled) ensures valid accounts.
*   **OAuth Integration:** Seamless login supported for **GitHub**, **Google**, and **Microsoft** accounts.
*   **Guest Mode:** Allows users to explore the platform without creating an account.
    *   **Showcase Data:** Guests see a consistent set of "dummy" users to understand the matching interface.
    *   **Limited Access:** Guest data is transient and not saved to the database.

### Profile Management
*   **Profile Customization:** Users can upload profile pictures, set nicknames, and write an "About Me" bio.
*   **Ghost Mode:** Users can toggle visibility in the match pool. When "Ghost Mode" is active, the profile is hidden from other users.
*   **Language Settings:** Manual language selection (English/German) is available in Account Settings, persisting across sessions and devices.
*   **GDPR & Data Privacy:**
    *   **Data Export:** Users can request a full export of their data via email or direct download (ZIP archive).
    *   **Account Deletion:** Users can permanently delete their account and all associated data.

### 🛡️ Security
*   **Two-Factor Authentication (2FA):**
    *   **TOTP:** Support for authenticator apps (Google/Microsoft Authenticator, Authy).
    *   **Passkeys:** Modern, passwordless authentication using WebAuthn (FaceID, TouchID, Windows Hello).
    *   **Email 2FA:** Verification codes sent via email as a fallback or primary method.
*   **Login Alerts:** Security notifications sent via email when a new device logs in.

---

## ❤️ Matching & Social

### Interaction
*   **Compatibility Algorithm:** Solumati uses a weighted question system to calculate compatibility percentages between users.
*   **Questionnaire:** Users answer a set of personality and preference questions to improve match accuracy.
*   **Swipe/Explore UI:** Modern card-based interface for browsing potential matches.

### Communication
*   **Encrypted Chat:** Real-time messaging with end-to-end encryption for privacy.
*   **Persistent vs. Transient:**
    *   Registered user chats are persistent and synced across devices.
    *   Guest chats are local-only and disappear after the session.
*   **Support Chat:** Direct integration to message support staff/admins.

---

## 🔧 Admin Console
The Admin Panel provides complete control over the Solumati instance.

### User Management
*   **User Overview:** Search, filter, and view all registered users.
*   **Actions:**
    *   **Ban/Unban:** Suspend suspicious or malicious accounts.
    *   **Verify:** Manually verify user emails.
    *   **Edit Roles:** Promote users to Moderators or Admins.

### System Configuration
*   **General Settings:** Configure the instance name, server domain, and base settings.
*   **Registration:**
    *   Enable/Disable new registrations.
    *   Toggle Email Verification requirements.
    *   Set Invitations-Only mode.
*   **Mail Settings:** Configure SMTP server details (Host, Port, User, Password, TLS/SSL) for transactional emails.
*   **Maintenance Mode:** Lock the platform for non-admin users during updates or repairs. A custom message is displayed to users.

### Legal & Support
*   **Content Management:** Edit the content for Imprint (Impressum) and Privacy Policy directly from the admin panel.
*   **Support Settings:** Enable/Disable the support page and configure the support contact email.

---

## 📱 Technical Features
*   **PWA (Progressive Web App):** Solumati can be installed on devices directly from the browser for a native-app-like experience.
*   **Native Wrappers:**
    *   **Android:** Trusted Web Activity (TWA) support.
    *   **Windows:** MSIX/UWP package support.
*   **Internationalization (i18n):** Full multi-language support (currently EN/DE) with dynamic switching.
