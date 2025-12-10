const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

// Import Bubblewrap Core
// Note: We need to handle potential CommonJS/ESM issues if @bubblewrap/core is ESM-only.
// However, in Node 20 environment in CI, we can likely require it or import().
// Given the repo source uses `import ...`, it might be compiled to CJS or ESM.
// Standard usage in scripts usually supports require if it's main entry is CJS.
// If it fails, we might need a dynamic import. But let's try standard require first.
let TwaGenerator, TwaManifest, ConsoleLog;
try {
    const bubblewrap = require('@bubblewrap/core');
    TwaGenerator = bubblewrap.TwaGenerator;
    TwaManifest = bubblewrap.TwaManifest;
    ConsoleLog = bubblewrap.ConsoleLog;
} catch (e) {
    console.error('Failed to load @bubblewrap/core. Ensure it is installed.', e);
    process.exit(1);
}

// Configuration
const PWA_MANIFEST_PATH = path.join(__dirname, '../../frontend/manifest.json');
const PACKAGE_JSON_PATH = path.join(__dirname, '../../frontend/package.json');
// Use temp dir for TWA manifest not needed anymore since we pass object directly,
// but we might want to save it for debugging.
const ANDROID_OUTPUT_DIR = path.join(process.cwd(), 'android');
const KEYSTORE_PATH = path.join(process.cwd(), 'android-keystore.jks');

// Clean up previous build
if (fs.existsSync(ANDROID_OUTPUT_DIR)) {
    console.log('Cleaning existing android output directory...');
    fs.rmSync(ANDROID_OUTPUT_DIR, { recursive: true, force: true });
}

// Validate Environment
const pwaUrl = process.env.PWA_URL;
if (!pwaUrl) {
    console.error('Error: PWA_URL environment variable is required');
    process.exit(1);
}

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
const versionCode = parseInt(process.env.GITHUB_RUN_NUMBER) || 1;

// Prepare TWA Manifest Configuration Object
// This must match TwaManifestJson interface
const twaManifestConfig = {
    packageId: `com.solumati.twa`,
    host: host,
    name: pwaManifest.name || 'Solumati',
    launcherName: pwaManifest.short_name || pwaManifest.name || 'Solumati',
    display: pwaManifest.display || 'standalone',
    themeColor: pwaManifest.theme_color || '#000000',
    themeColorDark: pwaManifest.theme_color || '#000000',
    navigationColor: pwaManifest.theme_color || '#000000',
    navigationColorDark: pwaManifest.theme_color || '#000000',
    navigationDividerColor: pwaManifest.theme_color || '#000000',
    navigationDividerColorDark: pwaManifest.theme_color || '#000000',
    backgroundColor: pwaManifest.background_color || '#ffffff',
    enableNotifications: true,
    startUrl: '/',
    iconUrl: icon512,
    maskableIconUrl: icon512,
    splashScreenFadeOutDuration: 300,
    signingKey: {
        path: KEYSTORE_PATH,
        alias: 'android',
    },
    appVersion: pkgJson.version, // versionName
    appVersionCode: versionCode,
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

// Generate Keystore if missing
if (!fs.existsSync(KEYSTORE_PATH)) {
    console.log('Generating temporary keystore for signing...');
    try {
        execSync(
            `keytool -genkeypair -dname "cn=Solumati, ou=Tech, o=Solumati, c=DE" -alias android -keypass password -keystore ${KEYSTORE_PATH} -storepass password -keyalg RSA -keysize 2048 -validity 10000`,
            { stdio: 'inherit' }
        );
    } catch (e) {
        console.error('Error generating keystore:', e);
        process.exit(1);
    }
}

async function build() {
    try {
        console.log('Initializing TWA Manifest...');
        const manifest = new TwaManifest(twaManifestConfig);

        console.log('Generating Android Project...');
        const log = new ConsoleLog('BuildAPK'); // Simple logger
        const generator = new TwaGenerator();

        await generator.createTwaProject(ANDROID_OUTPUT_DIR, manifest, log);
        console.log('Android Project Generated successfully.');

        console.log('Building APK with Gradle...');
        // Set up environment variables for Gradle if needed
        const env = { ...process.env };
        // Ensure signing config uses the keystore we generated
        // Bubblewrap generates build.gradle that reads key info from gradle.properties or similar
        // BUT standard bubblewrap/template build.gradle usually expects a signing config or manual properties.
        // TwaGenerator *should* have set up the signing config based on 'signingKey' in manifest.

        // Pass passwords via env vars as Bubblewrap's gradle template usually reads them or we pass them as params
        // Checking bubblewrap template: it often uses `storeFile`, `storePassword`, `keyAlias`, `keyPassword` props.

        const gradleArgs = [
            'assembleRelease',
            `-PstoreFile=${KEYSTORE_PATH}`,
            `-PstorePassword=password`,
            `-PkeyAlias=android`,
            `-PkeyPassword=password`
        ];

        // On Windows we need gradlew.bat, on Linux ./gradlew
        const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
        const gradlewPath = path.join(ANDROID_OUTPUT_DIR, gradlew);

        // Ensure executable
        if (process.platform !== 'win32') {
            fs.chmodSync(gradlewPath, '755');
        }

        execSync(`${gradlewPath} ${gradleArgs.join(' ')}`, {
            cwd: ANDROID_OUTPUT_DIR,
            stdio: 'inherit',
            env: env
        });

        console.log('APK Build completed successfully!');

    } catch (e) {
        console.error('Build failed:', e);
        process.exit(1);
    }
}

build();
