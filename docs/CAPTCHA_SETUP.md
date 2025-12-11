# Captcha Setup Guide

Solumati supports multiple CAPTCHA providers to protect your instance significantly against bot attacks, spam registrations, and brute-force login attempts.

We support the following providers:
1.  **Cloudflare Turnstile** (Recommended: Privacy-focused, user-friendly)
2.  **Google reCAPTCHA** (v2 Checkbox or Invisible)
3.  **hCaptcha** (Privacy-focused alternative)

---

## ⚙️ Configuration

You can configure CAPTCHA directly from the Solumati **Admin Console**:

1.  Log in as an **Administrator**.
2.  Navigate to **Settings** > **System Settings**.
3.  Scroll down to the **Security & Captcha** section.
4.  Toggle **Enable Captcha** to ON.
5.  Select your desired **Provider**.
6.  Enter the **Site Key** and **Secret Key** obtained from the provider (see below).
7.  Click **Save Changes**.

> [!IMPORTANT]
> Ensure you select the correct provider that matches your keys. Using Cloudflare keys with the Google provider setting will fail.

---

## 1. Cloudflare Turnstile (Recommended)
Cloudflare Turnstile provides a frictionless, privacy-preserving alternative to traditional CAPTCHAs.

1.  Go to the **[Cloudflare Dashboard](https://dash.cloudflare.com/)**.
2.  Navigate to **Turnstile** in the sidebar.
3.  Click **Add Site**.
4.  **Site Name:** Enter a name (e.g., "Solumati").
5.  **Domain:** Enter your domain(s) (e.g., `solumati.com` or `localhost` for testing).
6.  **Widget Mode:** Select "Managed" (Recommended) or "Invisible".
7.  Click **Create**.
8.  Copy the **Site Key** and **Secret Key**.
9.  Paste them into the Solumati Admin Console.

---

## 2. Google reCAPTCHA
Solumati supports Google reCAPTCHA v2 (Checkbox) and likely v3 (Invisible), though "I'm not a robot" checkbox is standard.

1.  Go to the **[Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)**.
2.  Click **+ (Create)**.
3.  **Label:** Enter a label (e.g., "Solumati").
4.  **reCAPTCHA type:** Select **Score based (v3)** or **Challenge (v2)** > **"I'm not a robot" Checkbox**.
    *   *Note: If you experience issues with v3, try v2 Checkbox.*
5.  **Domains:** Add your domain(s).
6.  Accept terms and click **Submit**.
7.  Copy the **Site Key** and **Secret Key**.
8.  Paste them into the Solumati Admin Console.

---

## 3. hCaptcha
A privacy-focused alternative often used as a direct replacement for reCAPTCHA.

1.  Go to the **[hCaptcha Dashboard](https://dashboard.hcaptcha.com/)**.
2.  Register or Login.
3.  Click **New Site**.
4.  **Add New Site Name:** e.g., "Solumati".
5.  **Hostnames:** Add your domain(s).
6.  Click **Save**.
7.  Go to **Settings** for the site to find your **Site Key**.
8.  Go to your **Account Settings** (avatar top right) to find your **Secret Key**.
9.  Paste them into the Solumati Admin Console.

---

## 🔒 Security Settings

In the Admin Console, you can also configure:
*   **Lockout Duration:** How long an account is locked after too many failed attempts (default: 10 minutes).
*   **Failed Attempts Threshold:** How many failures trigger a lockout (default: 5).
