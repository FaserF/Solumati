export const API_URL = "http://localhost:7777";
// Use the version injected by Vite from package.json
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';

export const FALLBACK = {
    // App & General
    'app.title': 'Solumati',
    'btn.back': 'Back',
    'btn.cancel': 'Cancel',
    'btn.save': 'Save',
    'btn.logout': 'Logout',

    // Landing
    'landing.tagline': 'Stop Swiping. Start Connecting.',
    'landing.btn_login': 'Log in',
    'landing.btn_register': 'Register',
    'landing.btn_guest': 'Browse as guest',
    'landing.opensource': 'Free & Open Source',
    'landing.admin': 'Admin',

    // Login
    'login.title': 'Welcome back',
    'label.email': 'Email',
    'label.password': 'Password',
    'btn.login': 'Log in',

    // Register
    'register.title': 'Create profile',
    'label.realname': 'First name',
    'header.personality': 'Personality Check',
    'scale.no': 'No',
    'scale.yes': 'Yes',
    'btn.register_now': 'Register for free',
    'register.disabled_title': 'Registration disabled',
    'register.disabled_msg': 'The administrator has currently disabled new registrations. Please try again later.',
    'register.btn_back_home': 'Back to home',

    // Dashboard
    'dashboard.guest_warning': 'Guest mode: Images are blurred & chat is disabled.',
    'dashboard.no_matches': 'No matches found...',
    'dashboard.title': 'Your Matches',
    'dashboard.match_score': 'Match Score',
    'match.pairing_text': 'Fits your values & goals',

    // Admin Common
    'admin.title': 'Admin Console',
    'admin.access_title': 'Admin Panel Access',
    'admin.btn.unlock': 'Unlock',
    'admin.tab.users': 'Users',
    'admin.tab.reports': 'Reports',
    'admin.tab.settings': 'Settings',
    'admin.btn.refresh': 'Refresh',

    // Admin Users
    'admin.table.id': 'ID',
    'admin.table.user': 'User',
    'admin.table.status': 'Status',
    'admin.table.registered': 'Registered',
    'admin.table.last_login': 'Last Login',
    'admin.table.actions': 'Actions',
    'admin.status.active': 'Active',
    'admin.status.inactive': 'Inactive',
    'admin.status.pending': 'Pending',
    'admin.status.guest': 'Guest',
    'admin.btn.deactivate': 'Block',
    'admin.btn.activate': 'Unblock',
    'admin.btn.delete': 'Delete',
    'admin.no_users': 'No users found.',

    // Admin Reports
    'admin.reports.reporter': 'Reporter',
    'admin.reports.reported': 'Reported User',
    'admin.reports.reason': 'Reason',
    'admin.reports.decision': 'Decision',
    'admin.btn.no_violation': 'No Violation',
    'admin.btn.punish': 'Ban User',
    'admin.no_reports': 'No open reports. Everything clean!',

    // Admin Settings
    'admin.settings.registration_title': 'Registration & Access',
    'admin.settings.allow_reg': 'Allow Registration',
    'admin.settings.require_verify': 'Force Email Verification',
    'admin.settings.allow_guest': 'Allow Guest Mode',
    'admin.settings.domains': 'Allowed Domains (empty = all)',
    'admin.settings.domains_hint': 'Comma separated list.',
    'admin.settings.mail_title': 'SMTP Mail Server',
    'admin.settings.mail_active': 'Enable Mail Sending',
    'admin.settings.host': 'Host',
    'admin.settings.port': 'Port',
    'admin.settings.user': 'User',
    'admin.settings.pass': 'Password',
    'admin.settings.from': 'Sender Address',
    'admin.settings.saved': 'Settings saved!',
    'admin.settings.save_error': 'Error saving settings.',

    // Admin Modal
    'admin.modal.punish_title': 'Block User',
    'admin.modal.reason': 'Reason for blocking',
    'admin.reason.reported': 'Reported (Violation)',
    'admin.reason.manual': 'Manual Deactivation',
    'admin.reason.tempban': 'Temporary Ban',
    'admin.reason.unknown': 'Other / Unknown',
    'admin.modal.duration': 'Duration (Hours)',
    'admin.modal.duration_hint': 'Account will be reactivated automatically after this time.',
    'admin.btn.execute_ban': 'Execute Ban'
};