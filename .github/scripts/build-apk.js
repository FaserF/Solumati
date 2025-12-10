const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const { execSync } = require('child_process');

// Import Bubblewrap Core
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
const FRONTEND_DIR = path.join(__dirname, '../../frontend');
const PUBLIC_DIR = path.join(FRONTEND_DIR, 'public');
const PWA_MANIFEST_PATH = path.join(FRONTEND_DIR, 'manifest.json');
const PACKAGE_JSON_PATH = path.join(FRONTEND_DIR, 'package.json');
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
    console.error(`Error: Manifest not found at ${ PWA_MANIFEST_PATH } `);
    process.exit(1);
}
const pwaManifest = JSON.parse(fs.readFileSync(PWA_MANIFEST_PATH, 'utf8'));
const pkgJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));

// Determine Version Code
const versionCode = parseInt(process.env.GITHUB_RUN_NUMBER) || 1;

// Start Local Server to serve assets (Icon, Manifest) locally
// This avoids fetching from the live site which might result in 502s or consistency issues.
const server = http.createServer((req, res) => {
    // We serve files primarily from public dir
    // But manifest.json is in frontend root in this repo structure?
    // Let's check where the request is pointing.

    let filePath;
    if (req.url === '/manifest.json') {
        // Try manifest in frontend dir first, then public
        filePath = PWA_MANIFEST_PATH;
        if (!fs.existsSync(filePath)) {
            filePath = path.join(PUBLIC_DIR, 'manifest.json');
        }
    } else {
        // All other assets (icons) should be in public
        filePath = path.join(PUBLIC_DIR, req.url);
    }

    if (fs.existsSync(filePath) && fs.lstatSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        let contentType = 'application/octet-stream';
        if (ext === '.json') contentType = 'application/json';
        if (ext === '.png') contentType = 'image/png';
        if (ext === '.jpg') contentType = 'image/jpeg';

        res.writeHead(200, { 'Content-Type': contentType });
        fs.createReadStream(filePath).pipe(res);
    } else {
        console.warn(`[LocalServer] 404 Not Found: ${ req.url } (Mapped to: ${ filePath })`);
        res.writeHead(404);
        res.end('Not found');
    }
});

function build() {
    server.listen(0, async () => { // Listen on random port
        const port = server.address().port;
        const localBaseUrl = `http://localhost:${port}`;
console.log(`Local asset server started on port ${port}`);

try {
    // Helper to resolve icon URL to LOCAL server
    const resolveLocalIcon = (size) => {
        const icon = pwaManifest.icons.find(i => i.sizes === size);
        if (!icon) return null;
        // If icon.src is absolute (http...), we might have a problem if it's external.
        // Assuming relative paths as per typical manifest.
        let src = icon.src;
        if (src.startsWith('http')) {
            console.warn(`Warning: Icon src is absolute (${src}). Using as is, but might fail if external.`);
            return src;
        }
        // Determine path relative to server root (which maps to PUBLIC_DIR)
        // If src starts with /, it's fine. If not, we assume it's relative to root.
        return src.startsWith('/') ? `${localBaseUrl}${src}` : `${localBaseUrl}/${src}`;
    };

    const icon512Local = resolveLocalIcon('512x512');
    if (!icon512Local) {
        throw new Error('Could not find 512x512 icon in manifest');
    }

    // Prepare TWA Manifest
    // We use the REAL host/startUrl for the app configuration
    // But we use LOCAL URLs for build-time asset fetching (icons, webManifestUrl)
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
        iconUrl: icon512Local, // Use local server URL
        maskableIconUrl: icon512Local, // Use local server URL
        splashScreenFadeOutDuration: 300,
        signingKey: {
            path: KEYSTORE_PATH,
            alias: 'android',
        },
        appVersion: pkgJson.version,
        appVersionCode: versionCode,
        shortcuts: [],
        generatorApp: 'bubblewrap-script',
        webManifestUrl: `${localBaseUrl}/manifest.json`, // Use local server URL
        fallbackType: 'customtabs',
        features: {
            locationDelegation: { enabled: false },
            playBilling: { enabled: false }
        },
        alphaDependencies: { enabled: false },
        enableSiteSettingsShortcut: true,
        isChromeOSOnly: false,
        isMetaQuest: false,
        fullScopeUrl: baseUrl
    };

    // Generate Keystore if missing
    if (!fs.existsSync(KEYSTORE_PATH)) {
        console.log('Generating temporary keystore for signing...');
        execSync(
            `keytool -genkeypair -dname "cn=Solumati, ou=Tech, o=Solumati, c=DE" -alias android -keypass password -keystore ${KEYSTORE_PATH} -storepass password -keyalg RSA -keysize 2048 -validity 10000`,
            { stdio: 'inherit' }
        );
    }

    console.log('Initializing TWA Manifest...');
    const manifest = new TwaManifest(twaManifestConfig);

    console.log('Generating Android Project...');
    const log = new ConsoleLog('BuildAPK');
    const generator = new TwaGenerator();

    await generator.createTwaProject(ANDROID_OUTPUT_DIR, manifest, log);
    console.log('Android Project Generated successfully.');

    console.log('Building APK with Gradle...');
    const env = { ...process.env };
    // Pass keystore info to Gradle
    const gradleArgs = [
        'assembleRelease',
        `-PstoreFile=${KEYSTORE_PATH}`,
        `-PstorePassword=password`,
        `-PkeyAlias=android`,
        `-PkeyPassword=password`
    ];

    const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
    const gradlewPath = path.join(ANDROID_OUTPUT_DIR, gradlew);

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
} finally {
    console.log('Stopping local asset server...');
    server.close();
}
    });
}

build();
