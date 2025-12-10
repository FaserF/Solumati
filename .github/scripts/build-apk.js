const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const REQUIRED_ENV_VARS = ['PWA_URL'];
const PWA_MANIFEST_PATH = path.join(__dirname, '../../frontend/manifest.json');
const PACKAGE_JSON_PATH = path.join(__dirname, '../../frontend/package.json');
const TWA_MANIFEST_PATH = path.join(process.cwd(), 'twa-manifest.json');
const TWA_CHECKSUM_PATH = path.join(process.cwd(), '.twa-manifest.json.checksum');
const ANDROID_OUTPUT_DIR = path.join(process.cwd(), 'android'); // Default output is usually root, but let's be careful.
const KEYSTORE_PATH = path.join(process.cwd(), 'android-keystore.jks');

// Clean up stale artifacts to prevent "Missing Checksum" prompts if possible
if (fs.existsSync(TWA_CHECKSUM_PATH)) fs.unlinkSync(TWA_CHECKSUM_PATH);
// We don't delete the project files (gradle, app, etc) aggressively to avoid breaking
// if 'build' expects them, but removing checksum forces a sync check.
// The input 'y' below handles the regeneration prompt.

// Validate Environment
const pwaUrl = process.env.PWA_URL;
if (!pwaUrl) {
    console.error('Error: PWA_URL environment variable is required (e.g., https://solumati.de)');
    process.exit(1);
}

// Clean URL (remove trailing slash)
const baseUrl = pwaUrl.replace(/\/$/, '');
const host = new URL(baseUrl).hostname;

// Read Source Files
console.log('Reading frontend/manifest.json...');
if (!fs.existsSync(PWA_MANIFEST_PATH)) {
    console.error(`Error: Manifest not found at ${PWA_MANIFEST_PATH}`);
    process.exit(1);
}
const pwaManifest = JSON.parse(fs.readFileSync(PWA_MANIFEST_PATH, 'utf8'));
const pkgJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));

// Helper to resolve icon URL
const resolveIcon = (size) => {
    const icon = pwaManifest.icons.find(i => i.sizes === size);
    if (!icon) return null;
    return icon.src.startsWith('http') ? icon.src : `${baseUrl}${icon.src}`;
};

const icon512 = resolveIcon('512x512');
if (!icon512) {
    console.error('Error: Could not find 512x512 icon in manifest');
    process.exit(1);
}

// Determine Version Code
// Use GitHub Run Number if available, otherwise default to 1
const versionCode = parseInt(process.env.GITHUB_RUN_NUMBER) || 1;

// Construct TWA Manifest (Bubblewrap Config)
const twaManifest = {
    packageId: `com.solumati.twa`, // Fixed package ID to ensure updates work
    host: host,
    name: pwaManifest.name || 'Solumati',
    launcherName: pwaManifest.short_name || pwaManifest.name || 'Solumati',
    display: pwaManifest.display || 'standalone',
    themeColor: pwaManifest.theme_color || '#000000',
    navigationColor: pwaManifest.theme_color || '#000000',
    navigationColorDark: pwaManifest.theme_color || '#000000',
    navigationDividerColor: pwaManifest.theme_color || '#000000',
    navigationDividerColorDark: pwaManifest.theme_color || '#000000',
    backgroundColor: pwaManifest.background_color || '#ffffff',
    enableNotifications: true,
    startUrl: '/', // Relative to host
    iconUrl: icon512,
    maskableIconUrl: icon512, // Assuming the connection is safe given "purpose": "any maskable"
    splashScreenFadeOutDuration: 300,
    signingKey: {
        path: KEYSTORE_PATH,
        alias: 'android',
    },
    appVersion: pkgJson.version,
    appVersionCode: versionCode,
    serviceAccountJsonFile: null, // Not used for now
    shortcuts: [],
    generatorApp: 'bubblewrap-script',
    webManifestUrl: `${baseUrl}/manifest.json`,
    fallbackType: 'customtabs',
    features: {
        locationDelegation: { enabled: false },
        playBilling: { enabled: false }
    },
    alphaDependencies: {
        enabled: false
    },
    enableSiteSettingsShortcut: true,
    isChromeOSOnly: false,
    isMetaQuest: false,
    fullScopeUrl: baseUrl
};

console.log('Generating twa-manifest.json...');
fs.writeFileSync(TWA_MANIFEST_PATH, JSON.stringify(twaManifest, null, 2));

// Generate Keystore if missing
if (!fs.existsSync(KEYSTORE_PATH)) {
    console.log('Generating temporary keystore for signing...');
    try {
        // keytool is usually in PATH in CI environments with Java installed
        execSync(
            `keytool -genkeypair -dname "cn=Solumati, ou=Tech, o=Solumati, c=DE" -alias android -keypass password -keystore ${KEYSTORE_PATH} -storepass password -keyalg RSA -keysize 2048 -validity 10000`,
            { stdio: 'inherit' }
        );
    } catch (e) {
        console.error('Error generating keystore:', e);
        process.exit(1);
    }
}

// Configure Bubblewrap
console.log('Configuring Bubblewrap...');
const os = require('os');
const configDir = path.join(os.homedir(), '.bubblewrap');
if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
}
// In GitHub Actions:
// JAVA_HOME is set by actions/setup-java
// ANDROID_SDK_ROOT is set by android-actions/setup-android (or ANDROID_HOME)
const jdkPath = process.env.JAVA_HOME;
const androidSdkPath = process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME;

if (!jdkPath || !androidSdkPath) {
    console.error('Error: JAVA_HOME or ANDROID_SDK_ROOT/ANDROID_HOME not set.');
    console.error('JAVA_HOME:', jdkPath);
    console.error('ANDROID_SDK:', androidSdkPath);
    process.exit(1);
}

const bubblewrapConfig = {
    jdkPath: jdkPath,
    androidSdkPath: androidSdkPath
};
fs.writeFileSync(path.join(configDir, 'config.json'), JSON.stringify(bubblewrapConfig, null, 2));

// Run Bubblewrap Build
console.log('Running Bubblewrap Build...');
try {
    // We expect @bubblewrap/cli to be available in the environment/path
    // using '--skipPwaValidation' to avoid failures if the specific icon sizes/manifest fields aren't perfect per Lighthouse
    // using '--manifest' pointing to our generated config
    execSync(
        `bubblewrap build --manifest=${TWA_MANIFEST_PATH} --signingKeyPath=${KEYSTORE_PATH} --signingKeyAlias=android --signingKeyPassword=password --signingStorePassword=password --skipPwaValidation`,
        { input: `y\npassword\npassword\n${pkgJson.version}\n${versionCode}\n`, stdio: ['pipe', 'inherit', 'inherit'] }
    );
    console.log('Build completed successfully!');
} catch (e) {
    console.error('Bubblewrap build failed:', e);
    process.exit(1);
}
