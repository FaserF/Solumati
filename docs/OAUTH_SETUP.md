# OAuth 2.0 Setup

Solumati supports Single Sign-On (SSO) via **GitHub**, **Google**, and **Microsoft**.
Setup involves two steps:
1.  Creating an OAuth App with the respective provider.
2.  Entering the `Client ID` and `Client Secret` in the Solumati **Admin Panel** (under *System Settings -> OAuth*).

## Important: Callback URL
The **Callback URL** (also called "Redirect URI") follows a consistent pattern for all providers.
Replace `https://your-domain.com` with the actual URL of your Solumati installation.

**Pattern:** `https://your-domain.com/api/auth/oauth/{provider}/callback`

| Provider | Callback URL Example |
| :--- | :--- |
| **GitHub** | `https://solumati.example.com/api/auth/oauth/github/callback` |
| **Google** | `https://solumati.example.com/api/auth/oauth/google/callback` |
| **Microsoft** | `https://solumati.example.com/api/auth/oauth/microsoft/callback` |

> [!NOTE]
> **Device Flow** does NOT need to be enabled. We use the standard "Authorization Code Flow" for web applications.
>
> **Free Accounts:** You can use free personal accounts (e.g. Gmail, Outlook.com) to create these applications. You do **not** need a paid business subscription or an enterprise tenant.

---

## 1. GitHub Setup

1.  Go to your **Developer Settings** on GitHub: [https://github.com/settings/developers](https://github.com/settings/developers)
2.  Click on **"New OAuth App"**.
3.  Fill out the form:
    *   **Application Request:** `Solumati` (or your chosen name)
    *   **Homepage URL:** `https://your-domain.com`
    *   **Authorization callback URL:** `https://your-domain.com/api/auth/oauth/github/callback`
4.  Click **"Register application"**.
5.  Copy the **Client ID**.
6.  Click **"Generate a new client secret"** and copy the **Client Secret**.

---

## 2. Google Setup

1.  Go to the **Google Cloud Console**: [https://console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
2.  Create a new project or select an existing one.
3.  **OAuth Consent Screen**:
    *   Select **User Type**: **External** (This is required to allow personal Google accounts to sign in).
    *   Fill in the required application details.
4.  Navigate to **APIs & Services -> Credentials**.
5.  Click **"+ CREATE CREDENTIALS"** -> **OAuth client ID**.
6.  Application type: **Web application**.
7.  Name: `Solumati`.
8.  Under **Authorized redirect URIs**, add your URL:
    *   `https://your-domain.com/api/auth/oauth/google/callback`
9.  Click **Create**.
10. Copy the **Client ID** and **Client Secret**.

---

## 3. Microsoft Entra ID (formerly Azure AD)

1.  Go to the **Azure Portal**: [https://portal.azure.com/#view/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/~/Overview](https://portal.azure.com/#view/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/~/Overview)
2.  Select **App registrations**.
3.  Click **"+ New registration"**.
4.  Name: `Solumati`.
5.  **Supported account types**:
    *   **CRITICAL**: Select **"Accounts in any organizational directory (Any Azure AD directory - Multitenant) and personal Microsoft accounts (e.g. Skype, Xbox)"**.
    *   *If you select "Single Tenant", personal Outlook/Live accounts will NOT work.*
6.  **Redirect URI**:
    *   Platform: **Web**.
    *   URL: `https://your-domain.com/api/auth/oauth/microsoft/callback`
7.  Click **Register**.
8.  Copy the **Application (client) ID** -> This is your **Client ID**.
9.  In the left menu, go to **Certificates & secrets**.
10. Click **"+ New client secret"**.
11. Add a description/expiration and click "Add".
12. **IMPORTANT:** Immediately copy the **Value** of the secret (not the ID!). This is your **Client Secret**.
